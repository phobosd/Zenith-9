import { BaseGenerator } from './BaseGenerator';
import { Proposal, ProposalType, NPCPayload } from '../proposals/schemas';
import { GuardrailConfig, LLMRole } from '../../services/GuardrailService';
import { LLMService } from '../llm/LLMService';

const FIRST_NAMES = ['Jax', 'Kira', 'Vex', 'Zero', 'Nyx', 'Cipher', 'Echo', 'Raze', 'Sloane', 'Mako'];
const LAST_NAMES = ['Vance', 'Korp', 'Steel', 'Neon', 'Shadow', 'Flux', 'Void', 'Chrome', 'Glitch', 'Matrix'];

const ARCHETYPES = [
    { name: 'Thug', behavior: 'aggressive', healthMult: 0.8, attackMult: 1.2, defenseMult: 0.5 },
    { name: 'Merchant', behavior: 'neutral', healthMult: 1.0, attackMult: 0.5, defenseMult: 1.0 },
    { name: 'Corporate Agent', behavior: 'cautious', healthMult: 1.2, attackMult: 1.0, defenseMult: 1.2 },
    { name: 'Street Doc', behavior: 'friendly', healthMult: 0.9, attackMult: 0.3, defenseMult: 0.8 },
    { name: 'Hacker', behavior: 'elusive', healthMult: 0.7, attackMult: 1.5, defenseMult: 0.4 }
];

export class NPCGenerator extends BaseGenerator<NPCPayload> {
    type = ProposalType.NPC;

    async generate(config: GuardrailConfig, llm?: LLMService, context?: any): Promise<Proposal> {
        const isMob = context?.subtype === 'MOB';
        const isBoss = context?.subtype === 'BOSS';

        const MOB_ARCHETYPES = [
            { name: 'Vermin', behavior: 'aggressive', healthMult: 0.4, attackMult: 0.8, defenseMult: 0.2 },
            { name: 'Glitch Construct', behavior: 'aggressive', healthMult: 0.6, attackMult: 1.2, defenseMult: 0.4 },
            { name: 'Rogue Drone', behavior: 'aggressive', healthMult: 0.5, attackMult: 1.0, defenseMult: 0.8 },
            { name: 'Feral Mutant', behavior: 'aggressive', healthMult: 1.2, attackMult: 1.1, defenseMult: 0.6 }
        ];

        const BOSS_ARCHETYPES = [
            { name: 'Cyber-Monstrosity', behavior: 'aggressive', healthMult: 5.0, attackMult: 2.0, defenseMult: 2.0 },
            { name: 'Rogue AI Avatar', behavior: 'aggressive', healthMult: 4.0, attackMult: 3.0, defenseMult: 1.5 },
            { name: 'Corporate Hit-Squad Leader', behavior: 'aggressive', healthMult: 3.0, attackMult: 2.5, defenseMult: 2.5 },
            { name: 'Mutated Alpha', behavior: 'aggressive', healthMult: 6.0, attackMult: 1.8, defenseMult: 1.2 }
        ];

        let archetype = isBoss
            ? BOSS_ARCHETYPES[Math.floor(Math.random() * BOSS_ARCHETYPES.length)]
            : isMob
                ? MOB_ARCHETYPES[Math.floor(Math.random() * MOB_ARCHETYPES.length)]
                : ARCHETYPES[Math.floor(Math.random() * ARCHETYPES.length)];

        // If restricted to glitch area, force aggressive behavior
        if (config.features.restrictedToGlitchArea) {
            archetype = isBoss
                ? BOSS_ARCHETYPES.find(a => a.behavior === 'aggressive') || archetype
                : isMob
                    ? MOB_ARCHETYPES.find(a => a.behavior === 'aggressive') || archetype
                    : ARCHETYPES.find(a => a.behavior === 'aggressive') || archetype;
        }

        let name = isBoss
            ? `[BOSS] ${['Omega', 'Titan', 'Apex', 'Void', 'Prime'][Math.floor(Math.random() * 5)]} ${['Stalker', 'Reaper', 'Colossus', 'Executioner', 'Entity'][Math.floor(Math.random() * 5)]}`
            : isMob
                ? `${['Giant', 'Mutated', 'Cyber', 'Neon', 'Toxic'][Math.floor(Math.random() * 5)]} ${['Rat', 'Roach', 'Sludge', 'Hound', 'Spider'][Math.floor(Math.random() * 5)]}`
                : `${FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)]} ${LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)]}`;

        let description = isBoss
            ? `A towering, nightmare-inducing ${archetype.name.toLowerCase()} that radiates pure malice.`
            : isMob
                ? `A repulsive ${archetype.name.toLowerCase()} lurking in the shadows.`
                : `A ${archetype.name.toLowerCase()} seen wandering the neon-lit streets.`;

        let dialogue = isBoss
            ? ["YOU ARE BUT A GLITCH IN MY SYSTEM.", "OBSOLETE.", "PREPARE FOR DELETION.", "I AM THE END.", "YOUR DATA WILL BE CONSUMED."]
            : isMob
                ? ["*hisses*", "*screeches*", "*growls*", "*chitters*", "*beeps menacingly*"]
                : [
                    "Watch your back, choomba.",
                    "Got any credits?",
                    "The Matrix is watching."
                ];

        let rationale = `Generated a ${archetype.name} to populate the area.`;
        let behavior = archetype.behavior;

        // 1. Creative Pass: Narrative & Flavor
        if (llm) {
            try {
                const mutation = ['Toxic', 'Radioactive', 'Crystalline', 'Shadow', 'Neon', 'Rust', 'Fungal', 'Digital', 'Volatile', 'Armored'][Math.floor(Math.random() * 10)];
                const bodyPart = ['Claws', 'Fangs', 'Spines', 'Tentacles', 'Wires', 'Optics', 'Limbs', 'Maw'][Math.floor(Math.random() * 8)];

                const creativePrompt = isBoss
                    ? `Generate a TERRIFYING cyberpunk BOSS.
                Archetype: ${archetype.name}
                Mutation Trait: ${mutation}
                Prominent Feature: ${bodyPart}
                Current World Context: A massive anomaly has appeared in the city, birthing a legendary horror.
                
                Requirements:
                - Name: A POWERFUL, INTIMIDATING name (e.g., 'The ${mutation} ${bodyPart}', 'System-Breaker', 'Apex-${mutation}').
                - Description: 3-4 sentences describing its overwhelming presence, its ${mutation} aura, and its lethal ${bodyPart}.
                - Behavior: MUST be 'aggressive'.
                - Dialogue: 15 distinct, chilling lines or sounds.
                - Rationale: Why is this boss here? What is its purpose?
                
                Return ONLY a JSON object with fields: name, description, behavior, dialogue, rationale.`
                    : isMob
                        ? `Generate a UNIQUE cyberpunk creature/mob.
                Archetype: ${archetype.name}
                Mutation Trait: ${mutation}
                Prominent Feature: ${bodyPart}
                Current World Context: The city sewers and dark alleys are infested with diverse techno-organic horrors.
                
                Requirements:
                - Name: A CREATIVE, UNIQUE creature name based on the Mutation Trait (e.g., '${mutation} Stalker', '${mutation} Leech', 'Razor-${bodyPart}'). DO NOT USE GENERIC NAMES.
                - Description: 2-3 sentences describing its physical appearance, focusing on its ${mutation} nature and ${bodyPart}.
                - Behavior: MUST be 'aggressive'.
                - Dialogue: 10 distinct sounds or noises it makes.
                - Rationale: Why is this specific creature here?
                
                Return ONLY a JSON object with fields: name, description, behavior, dialogue, rationale.`

                        : `Generate a unique cyberpunk NPC. 
                Archetype: ${archetype.name}
                Current World Context: The city is under heavy corporate surveillance. The Matrix is leaking into reality.
                ${config.features.restrictedToGlitchArea ? "IMPORTANT: This NPC is in a highly unstable 'Glitch Area' and MUST be hostile/aggressive." : ""}
                
                Requirements:
                - Name: A gritty cyberpunk name (e.g., 'Rat-Byte', 'Sloane Vane').
                - Description: 2-3 sentences. Focus on their 'chrome' (cybernetics), their worn clothing, and their vibe.
                - Behavior: Choose from [aggressive, neutral, cautious, friendly, elusive]. ${config.features.restrictedToGlitchArea ? "MUST be 'aggressive'." : ""}
                - Dialogue: EXACTLY 50 distinct barks (short lines of dialogue). Use street slang, technical jargon, and flavor that fits their archetype.
                - Rationale: Why does this NPC exist in this specific district?
                
                Return ONLY a JSON object with fields: name, description, behavior, dialogue (array of 50 strings), and rationale.`;

                const creativeRes = await llm.chat(creativePrompt, "You are the lead narrative designer for Ouroboro.", LLMRole.CREATIVE);
                const creativeData = LLMService.parseJson(creativeRes.text);

                if (creativeData.name) name = creativeData.name;
                if (creativeData.description) description = creativeData.description;
                if (creativeData.behavior) behavior = creativeData.behavior;
                if (creativeData.dialogue && Array.isArray(creativeData.dialogue)) {
                    dialogue = creativeData.dialogue.slice(0, isBoss ? 15 : isMob ? 10 : 50);
                }
                if (creativeData.rationale) rationale = creativeData.rationale;

                // Final override if restricted
                if (config.features.restrictedToGlitchArea || isMob || isBoss) {
                    behavior = 'aggressive';
                }
            } catch (err) {
                console.error('NPC Creative Pass failed:', err);
            }
        }

        // 2. Logic Pass: Stat Balancing
        const budgets = config.budgets;
        let stats = {
            health: Math.floor(budgets.maxNPCHealth * archetype.healthMult * (0.8 + Math.random() * 0.4)),
            attack: Math.floor(budgets.maxNPCAttack * archetype.attackMult * (0.8 + Math.random() * 0.4) * 0.2),
            defense: Math.floor(budgets.maxNPCDefense * archetype.defenseMult * (0.8 + Math.random() * 0.4) * 0.2)
        };

        if (llm) {
            try {
                const logicPrompt = `Balance the stats for this NPC:
                Name: ${name}
                Description: ${description}
                Archetype: ${archetype.name}
                Behavior: ${behavior}
                
                System Constraints (MAX LIMITS):
                - Max Health: ${budgets.maxNPCHealth}
                - Max Attack: ${budgets.maxNPCAttack}
                - Max Defense: ${budgets.maxNPCDefense}
                
                Return ONLY a JSON object with fields: health, attack, defense.
                Ensure the stats reflect the NPC's description and archetype. An 'aggressive' NPC should generally have higher attack.`;

                const logicRes = await llm.chat(logicPrompt, "You are a game balance engineer for Ouroboro. You ensure NPCs are challenging but fair.", LLMRole.LOGIC);
                const logicData = LLMService.parseJson(logicRes.text);

                if (logicData.health) stats.health = Math.max(1, Math.min(budgets.maxNPCHealth, logicData.health));
                if (logicData.attack) stats.attack = Math.max(1, Math.min(budgets.maxNPCAttack, logicData.attack));
                if (logicData.defense) stats.defense = Math.max(1, Math.min(budgets.maxNPCDefense, logicData.defense));
            } catch (err) {
                console.error('NPC Logic Pass failed:', err);
            }
        }

        const payload: NPCPayload = {
            id: `npc_${Math.random().toString(36).substring(7)}`,
            name,
            description,
            stats,
            behavior: behavior as any,
            faction: Math.random() > 0.5 ? 'Street' : 'Corporate',
            tags: [archetype.name.toLowerCase()],
            dialogue,
            canMove: true
        };

        const proposal = this.generateBaseProposal(payload);
        proposal.flavor = { rationale };

        return proposal;
    }
}
