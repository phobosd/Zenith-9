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
        } else {
            // OpenAI and Local (LM Studio/Ollama) use the same OpenAI-compatible format
            return this.callOpenAICompatible(profile, prompt, systemPrompt);
        }
    }

    private getProfileForRole(role: LLMRole): LLMProfile | undefined {
        // 1. Try to find a profile explicitly assigned to this role
        const profiles = Object.values(this.profiles);
        const specific = profiles.find(p => p.roles.includes(role));
        if (specific) return specific;

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
                        maxOutputTokens: 2048
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
                    promptTokens: 0, // Gemini usage is in a different field, skipping for now
                    completionTokens: 0
                }
            };
        } catch (err) {
            Logger.error('LLMService', `Gemini call failed: ${err}`);
            throw err;
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
}
