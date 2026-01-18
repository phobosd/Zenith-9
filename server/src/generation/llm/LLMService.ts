import { LLMProfile, LLMRole } from '../../services/GuardrailService';
import { Logger } from '../../utils/Logger';

export interface LLMResponse {
    text: string;
    usage?: {
        promptTokens: number;
        completionTokens: number;
    };
}

export class LLMService {
    private profiles: Record<string, LLMProfile> = {};

    constructor(profiles: Record<string, LLMProfile>) {
        this.profiles = profiles;
    }

    public updateConfig(profiles: Record<string, LLMProfile>) {
        this.profiles = profiles;
        Logger.info('LLMService', `Updated with ${Object.keys(profiles).length} profiles.`);
    }

    /**
     * Chat with a model assigned to a specific role.
     */
    public async chat(prompt: string, systemPrompt: string = "You are a helpful assistant.", role: LLMRole = LLMRole.DEFAULT): Promise<LLMResponse> {
        const profile = this.getProfileForRole(role);

        if (!profile) {
            throw new Error(`No LLM profile found for role: ${role}`);
        }

        Logger.info('LLMService', `Routing [${role}] request to: ${profile.name} | Model: ${profile.model} | Provider: ${profile.provider}`);

        if (profile.provider === 'gemini') {
            return this.callGemini(profile, prompt, systemPrompt);
        } else if (profile.provider === 'pollinations') {
            // Pollinations text uses the new gen.pollinations.ai gateway
            const textProfile = { ...profile, baseUrl: 'https://gen.pollinations.ai/v1' };
            return this.callOpenAICompatible(textProfile, prompt, systemPrompt);
        } else {
            // OpenAI and Local (LM Studio/Ollama) use the same OpenAI-compatible format
            return this.callOpenAICompatible(profile, prompt, systemPrompt);
        }
    }

    /**
     * Generate an image using a model assigned to the IMAGE role.
     */
    public async generateImage(prompt: string, role: LLMRole = LLMRole.IMAGE): Promise<string> {
        const profile = this.getProfileForRole(role);

        if (!profile) {
            Logger.warn('LLMService', `No IMAGE profile found. Falling back to placeholder.`);
            return "";
        }

        Logger.info('LLMService', `Generating image via: ${profile.name} | Model: ${profile.model}`);

        if (profile.provider === 'openai') {
            return this.generateOpenAIImage(profile, prompt);
        } else if (profile.provider === 'gemini') {
            return this.generateGeminiImage(profile, prompt);
        } else if (profile.provider === 'pollinations') {
            return this.generatePollinationsImage(profile, prompt);
        } else {
            // Local providers usually don't support image gen via the same API
            // But we'll try the OpenAI-compatible image endpoint just in case
            return this.generateOpenAIImage(profile, prompt);
        }
    }

    private getProfileForRole(role: LLMRole): LLMProfile | undefined {
        const profiles = Object.values(this.profiles);

        // 1. Try to find a profile explicitly assigned to this role
        // For IMAGE role, prioritize providers that are NOT 'local'
        if (role === LLMRole.IMAGE) {
            const imageProfiles = profiles.filter(p => p.roles.includes(role));
            const nonLocal = imageProfiles.find(p => p.provider !== 'local');
            if (nonLocal) return nonLocal;
            if (imageProfiles.length > 0) return imageProfiles[0];
        } else {
            const specific = profiles.find(p => p.roles.includes(role));
            if (specific) return specific;
        }

        // 2. Fallback to DEFAULT role
        const fallback = profiles.find(p => p.roles.includes(LLMRole.DEFAULT));
        if (fallback) return fallback;

        // 3. Fallback to the first available profile
        return profiles[0];
    }

    private async callOpenAICompatible(profile: LLMProfile, prompt: string, systemPrompt: string): Promise<LLMResponse> {
        try {
            const response = await fetch(`${profile.baseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${profile.apiKey || 'not-needed'}`
                },
                body: JSON.stringify({
                    model: profile.model,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: prompt }
                    ],
                    temperature: 0.7
                })
            });

            if (!response.ok) {
                const error = await response.text();
                throw new Error(`OpenAI API Error (${response.status}): ${error}`);
            }

            const data = await response.json();
            return {
                text: data.choices[0].message.content,
                usage: {
                    promptTokens: data.usage?.prompt_tokens || 0,
                    completionTokens: data.usage?.completion_tokens || 0
                }
            };
        } catch (err) {
            Logger.error('LLMService', `OpenAI call failed: ${err}`);
            throw err;
        }
    }

    private async callGemini(profile: LLMProfile, prompt: string, systemPrompt: string): Promise<LLMResponse> {
        try {
            // Gemini API uses a different structure
            const url = `${profile.baseUrl}/models/${profile.model}:generateContent?key=${profile.apiKey}`;

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contents: [
                        {
                            role: 'user',
                            parts: [{ text: `${systemPrompt}\n\nUser Request: ${prompt}` }]
                        }
                    ],
                    generationConfig: {
                        temperature: 0.7,
                        maxOutputTokens: 2048,
                    }
                })
            });

            if (!response.ok) {
                const error = await response.text();
                throw new Error(`Gemini API Error (${response.status}): ${error}`);
            }

            const data = await response.json();
            return {
                text: data.candidates[0].content.parts[0].text,
                usage: {
                    promptTokens: data.usageMetadata?.promptTokenCount || 0,
                    completionTokens: data.usageMetadata?.candidatesTokenCount || 0
                }
            };
        } catch (err) {
            Logger.error('LLMService', `Gemini call failed: ${err}`);
            throw err;
        }
    }

    private async generateOpenAIImage(profile: LLMProfile, prompt: string): Promise<string> {
        try {
            const response = await fetch(`${profile.baseUrl}/images/generations`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${profile.apiKey || 'not-needed'}`
                },
                body: JSON.stringify({
                    model: profile.model,
                    prompt: prompt,
                    n: 1,
                    size: "1024x1024"
                })
            });

            if (!response.ok) {
                const error = await response.text();
                Logger.error('LLMService', `OpenAI Image Error (${response.status}): ${error}`);
                return "";
            }

            const data = await response.json();
            if (data.data && data.data[0] && data.data[0].url) {
                return data.data[0].url;
            } else {
                Logger.error('LLMService', `OpenAI Image response missing data.data[0].url. Response: ${JSON.stringify(data)}`);
                return "";
            }
        } catch (err) {
            Logger.error('LLMService', `OpenAI image generation failed: ${err}`);
            return "";
        }
    }

    private async generatePollinationsImage(profile: LLMProfile, prompt: string): Promise<string> {
        try {
            // Clean up prompt: remove trailing punctuation, internal question marks, and limit length
            let cleanPrompt = prompt.trim()
                .replace(/\?/g, "") // Remove all question marks
                .replace(/[.,!?;:]+$/, ""); // Remove trailing punctuation

            if (cleanPrompt.length > 800) {
                cleanPrompt = cleanPrompt.substring(0, 800);
            }

            const encodedPrompt = encodeURIComponent(cleanPrompt);
            const width = 1024;
            const height = 1024;
            const model = profile.model || 'flux';

            // Use the reliable image.pollinations.ai endpoint for direct image fetching
            const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&model=${model}&nologo=true`;

            Logger.info('LLMService', `Generated Pollinations URL: ${imageUrl}`);
            return imageUrl;
        } catch (err) {
            Logger.error('LLMService', `Pollinations image generation failed: ${err}`);
            return "";
        }
    }

    private async generateGeminiImage(profile: LLMProfile, prompt: string): Promise<string> {
        try {
            const modelId = profile.model.includes('imagen') ? profile.model : 'imagen-3.0-generate-001';

            // Try the preferred method first based on model name
            const isImagen4 = modelId.includes('imagen-4');
            const methods = isImagen4 ? ['predict', 'generateImages'] : ['generateImages', 'predict'];

            for (const method of methods) {
                const url = `${profile.baseUrl}/models/${modelId}:${method}?key=${profile.apiKey}`;
                Logger.info('LLMService', `Attempting Gemini Image Gen [${method}]: ${modelId}`);

                const body = method === 'predict' ? {
                    instances: [{ prompt }],
                    parameters: { sampleCount: 1 }
                } : {
                    prompt: prompt,
                    number_of_images: 1,
                    safety_filter_level: "BLOCK_MEDIUM_AND_ABOVE",
                    person_generation: "ALLOW_ADULT"
                };

                try {
                    const response = await fetch(url, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(body)
                    });

                    if (!response.ok) {
                        const error = await response.text();
                        Logger.warn('LLMService', `Gemini Image [${method}] failed (${response.status}): ${error.substring(0, 200)}`);
                        continue; // Try next method
                    }

                    const data = await response.json();

                    // Handle :generateImages response (Imagen 3 style)
                    if (data.images && data.images[0] && data.images[0].imageRawBase64) {
                        Logger.info('LLMService', `Successfully generated image via ${method} (imageRawBase64)`);
                        return `data:image/png;base64,${data.images[0].imageRawBase64}`;
                    }

                    // Handle :predict response (Imagen 4 / Vertex style)
                    if (data.predictions && data.predictions[0]) {
                        const pred = data.predictions[0];
                        const base64 = pred.bytesBase64Encoded || pred.imageRawBase64 || (typeof pred === 'string' ? pred : null);
                        if (base64) {
                            Logger.info('LLMService', `Successfully generated image via ${method} (predictions)`);
                            return `data:image/png;base64,${base64}`;
                        }
                    }

                    Logger.warn('LLMService', `Gemini Image [${method}] returned no recognizable image data. Keys: ${Object.keys(data)}`);
                } catch (err) {
                    Logger.error('LLMService', `Error during Gemini Image [${method}]: ${err}`);
                }
            }

            return "";
        } catch (err) {
            Logger.error('LLMService', `Gemini image generation failed: ${err}`);
            return "";
        }
    }

    /**
     * Robustly parse JSON from an LLM response, stripping markdown and reasoning blocks.
     */
    public static parseJson(text: string): any {
        try {
            // 1. Strip reasoning blocks (e.g., <think>...</think>)
            let clean = text.replace(/<think>[\s\S]*?<\/think>/gi, '');

            // 2. Strip markdown code blocks
            clean = clean.replace(/```json|```/g, '');

            // 3. Find the first '{' and last '}' to extract the JSON object
            const start = clean.indexOf('{');
            const end = clean.lastIndexOf('}');

            if (start === -1 || end === -1) {
                throw new Error('No JSON object found in response');
            }

            clean = clean.substring(start, end + 1);

            return JSON.parse(clean);
        } catch (err) {
            Logger.error('LLMService', `Failed to parse JSON: ${err}\nRaw text: ${text}`);
            throw err;
        }
    }

    public async getProviderBalance(profile: LLMProfile): Promise<any> {
        if (profile.provider === 'pollinations') {
            try {
                if (!profile.apiKey) {
                    return { error: 'API Key is required for Pollinations.ai balance check' };
                }

                const headers = {
                    'Authorization': `Bearer ${profile.apiKey}`,
                    'Content-Type': 'application/json'
                };

                const response = await fetch('https://enter.pollinations.ai/api/account/balance', { headers });

                if (response.ok) {
                    const data = await response.json();
                    return { pollen: data }; // Wrap it to be clear
                } else {
                    const text = await response.text();
                    return { error: `Failed to fetch balance (${response.status})`, details: text };
                }
            } catch (err) {
                return { error: `Failed to fetch pollination stats: ${err}` };
            }
        }

        return { message: 'Balance check not supported for this provider' };
    }
}
