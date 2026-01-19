import { System } from '../ecs/System';
import { Description } from '../components/Description';
import { Terminal } from '../components/Terminal';
import { Server } from 'socket.io';
import * as fs from 'fs';
import * as path from 'path';
import { WorldQuery } from '../utils/WorldQuery';
import { Logger } from '../utils/Logger';
import { IEngine } from '../ecs/IEngine';
import { PuzzleManager } from '../services/PuzzleManager';
import { CommerceSystem } from '../services/CommerceSystem';
import { MessageService } from '../services/MessageService';
import { Position } from '../components/Position';
import { MessageType } from '../types/MessageTypes';
import { NPC } from '../components/NPC';
import { LLMService } from '../generation/llm/LLMService';
import { Personality } from '../components/Personality';
import { Memory } from '../components/Memory';
import { Relationship } from '../components/Relationship';
import { QuestSystem } from './QuestSystem';
import { ContextService } from '../services/ContextService';
import { WorldDirector } from '../worldDirector/Director';
import { QuestGiver } from '../components/QuestGiver';
import { GameEventBus, GameEventType } from '../utils/GameEventBus';

export class InteractionSystem extends System {
    private io: Server;
    private messageService: MessageService;
    private puzzleManager: PuzzleManager;
    private commerceSystem: CommerceSystem;
    private director: WorldDirector;
    private questSystem?: QuestSystem;
    private playerFocus: Map<string, { npcId: string, lastInteraction: number }> = new Map();

    constructor(io: Server, director: WorldDirector) {
        super();
        this.io = io;
        this.director = director;
        this.messageService = new MessageService(io);
        this.puzzleManager = new PuzzleManager(io, this.messageService);
        this.commerceSystem = new CommerceSystem(io, this.messageService);

        // Clear focus when player moves
        GameEventBus.getInstance().subscribe(GameEventType.PLAYER_MOVED, (payload: any) => {
            this.playerFocus.delete(payload.playerId);
        });
    }

    public setQuestSystem(questSystem: QuestSystem) {
        this.questSystem = questSystem;
    }

    update(engine: IEngine, deltaTime: number): void {
        // Interacting with objects
    }

    handleRead(entityId: string, engine: IEngine, targetName: string) {
        if (targetName.toLowerCase() === 'guide') {
            try {
                const guidePath = path.join(process.cwd(), '../docs/USERS_GUIDE.md');
                const guideContent = fs.readFileSync(guidePath, 'utf-8');
                this.io.to(entityId).emit('open-guide', { content: guideContent });
                this.messageService.system(entityId, "Opening User's Guide...");
            } catch (err) {
                console.error("Error reading guide:", err);
                this.messageService.error(entityId, "Failed to load User's Guide.");
            }
            return;
        }

        if (targetName.toLowerCase() === 'compendium') {
            try {
                const compendiumPath = path.join(process.cwd(), '../docs/COMPENDIUM.md');
                const content = fs.readFileSync(compendiumPath, 'utf-8');
                this.io.to(entityId).emit('open-guide', { content: content });
                this.messageService.system(entityId, "Opening Compendium...");
            } catch (err) {
                console.error("Error reading compendium:", err);
                this.messageService.error(entityId, "Failed to load Compendium.");
            }
            return;
        }

        if (targetName.toLowerCase() === 'areas' || targetName.toLowerCase() === 'map_guide') {
            try {
                const areasPath = path.join(process.cwd(), '../AREAS.md');
                const content = fs.readFileSync(areasPath, 'utf-8');
                this.io.to(entityId).emit('open-guide', { content: content });
                this.messageService.system(entityId, "Opening Area Guide...");
            } catch (err) {
                console.error("Error reading areas:", err);
                this.messageService.error(entityId, "Failed to load Area Guide.");
            }
            return;
        }

        const player = WorldQuery.getEntityById(engine, entityId);
        if (!player) return;

        const playerPos = player.getComponent(Position);
        if (!playerPos) return;

        // Find items/objects at player position
        const targetEntity = engine.getEntitiesAt(playerPos.x, playerPos.y).find(e => {
            const desc = e.getComponent(Description);
            return desc && desc.title.toLowerCase().includes(targetName.toLowerCase());
        });

        if (!targetEntity) {
            this.messageService.info(entityId, `You don't see '${targetName}' here.`);
            return;
        }

        const terminal = targetEntity.getComponent(Terminal);
        if (terminal) {
            this.commerceSystem.handleTerminalRead(entityId, engine, targetEntity);
        } else {
            const desc = targetEntity.getComponent(Description);
            if (desc) {
                this.messageService.info(entityId, desc.description);
            } else {
                this.messageService.info(entityId, "There's nothing to read on that.");
            }
        }
    }

    handleTerminalBuy(entityId: string, engine: IEngine, itemName: string, cost: number) {
        return this.commerceSystem.handleTerminalBuy(entityId, engine, itemName, cost);
    }

    handleTurn(entityId: string, engine: IEngine, targetName: string, direction: string) {
        this.puzzleManager.handleTurn(entityId, engine, targetName, direction);
    }

    async handleSay(entityId: string, engine: IEngine, message: string) {
        const player = engine.getEntity(entityId);
        if (!player) {
            Logger.warn('InteractionSystem', `handleSay: Player entity not found for ID ${entityId}`);
            return;
        }

        const pos = player.getComponent(Position);
        if (!pos) {
            Logger.warn('InteractionSystem', `handleSay: Player ${entityId} has no Position component`);
            return;
        }

        const entitiesInRoom = engine.getEntitiesAt(pos.x, pos.y);
        Logger.info('InteractionSystem', `handleSay: Found ${entitiesInRoom.length} entities in room at (${pos.x}, ${pos.y})`);

        // 1. Check if anyone is explicitly addressed by name
        let explicitlyAddressedNPCId: string | null = null;
        for (const entity of entitiesInRoom) {
            const npc = entity.getComponent(NPC);
            if (!npc) continue;
            const typeNameLower = npc.typeName.toLowerCase();
            const shortName = typeNameLower.replace(/^the\s+/i, '');
            if (message.toLowerCase().includes(typeNameLower) || message.toLowerCase().includes(shortName)) {
                explicitlyAddressedNPCId = entity.id;
                break;
            }
        }

        // 2. Process NPC responses
        const playerDesc = player.getComponent(Description);
        const playerName = playerDesc ? playerDesc.title : entityId;

        for (const entity of entitiesInRoom) {
            if (entity.id === entityId) continue; // Skip self

            const npc = entity.getComponent(NPC);
            let personality = entity.getComponent(Personality);

            if (!npc) continue;

            if (!personality) {
                Logger.warn('InteractionSystem', `handleSay: NPC ${npc.typeName} (ID: ${entity.id}) missing Personality. Repairing...`);

                let traits = ["Neutral"];
                let voice = "Average";
                let agenda = "Survive";

                if (npc.typeName.toLowerCase().includes('fixer')) {
                    traits = ["Calculating", "Secretive", "Ambitious"];
                    voice = "Smooth, low-volume";
                    agenda = "Collect all the secrets";
                } else if (npc.typeName.toLowerCase().includes('ripperdoc')) {
                    traits = ["Cynical", "Precise", "Tired"];
                    voice = "Raspy, clinical";
                    agenda = "Keep the city's chrome running (for a price)";
                } else if (npc.typeName.toLowerCase().includes('vendor')) {
                    traits = ["Persistent", "Haggling", "Street-smart"];
                    voice = "Loud, rhythmic";
                    agenda = "Sell every last bit of inventory";
                } else if (npc.typeName.toLowerCase().includes('samurai')) {
                    traits = ["Disciplined", "Cold", "Honorable"];
                    voice = "Monotone, sharp";
                    agenda = "Perfect their combat technique";
                } else if (npc.typeName.toLowerCase().includes('dancer')) {
                    traits = ["Graceful", "Observant", "Bored"];
                    voice = "Breathy, melodic";
                    agenda = "Find a way out of the club life";
                } else if (npc.typeName.toLowerCase().includes('hacker')) {
                    traits = ["Paranoid", "Brilliant", "Anti-social"];
                    voice = "Fast, whispered";
                    agenda = "Expose the corporate lies";
                }

                personality = new Personality(traits, voice, agenda);
                entity.addComponent(personality);

                if (!entity.hasComponent(Memory)) entity.addComponent(new Memory());
                if (!entity.hasComponent(Relationship)) entity.addComponent(new Relationship());
            }

            // Determine if this NPC should respond
            let addressed = (entity.id === explicitlyAddressedNPCId);

            const focus = this.playerFocus.get(entityId);
            const isFocused = focus && focus.npcId === entity.id && (Date.now() - focus.lastInteraction < 60000);

            // If no one was explicitly addressed, use focus
            if (!explicitlyAddressedNPCId && isFocused) {
                addressed = true;
            }

            // If player says "goodbye" or "bye", clear focus
            if (isFocused && (message.toLowerCase().includes('goodbye') || message.toLowerCase().includes('bye'))) {
                this.playerFocus.delete(entityId);
                Logger.info('InteractionSystem', `handleSay: Player ${entityId} said goodbye. Clearing focus on ${npc.typeName}`);
            }

            // If not addressed/focused, maybe they eavesdrop? (10% chance if no one else is addressed)
            if (!addressed && !explicitlyAddressedNPCId && Math.random() > 0.9) {
                Logger.info('InteractionSystem', `handleSay: NPC ${npc.typeName} is eavesdropping...`);
                addressed = true;
            }

            if (addressed) {
                // Update focus if addressed or already focused
                this.playerFocus.set(entityId, { npcId: entity.id, lastInteraction: Date.now() });
                if (entity.id === explicitlyAddressedNPCId) {
                    Logger.info('InteractionSystem', `handleSay: Player ${entityId} focused on ${npc.typeName} (explicit)`);
                }

                const memory = entity.getComponent(Memory);
                const relationship = entity.getComponent(Relationship);

                const systemPrompt = `You are ${npc.typeName}, an NPC in the gritty cyberpunk world of Zenith-9.
${npc.description}
Personality: ${personality.traits.join(', ')}. 
Voice: ${personality.voice}. 
Agenda: ${personality.agenda}.

RULES:
1. Respond ONLY with DIRECT DIALOGUE.
2. NO third-person narration, stage directions, or descriptions of your actions.
3. DO NOT prefix your response with your name or "NPC says:".
4. DO NOT summarize the world state (time, weather, events) unless the player specifically asks.
5. Keep responses concise, gritty, and in-character.
6. You can perform actions by including them in brackets at the end: [OFFER_DISCOUNT], [ATTACK], [LEAVE], [GIVE_QUEST].
7. Only use [GIVE_QUEST] if the player asks for work or if it naturally fits the conversation.`;

                let context = ContextService.getInstance().getContext();

                if (memory) {
                    if (memory.shortTerm.length > 0) {
                        context += `Recent Memory:\n${memory.shortTerm.map((m: any) => `- ${m.description}`).join('\n')}\n`;
                    }

                    const rumors = memory.longTerm.filter((m: any) => m.rumor).map((m: any) => m.description);
                    if (rumors.length > 0) {
                        context += `Known Rumors:\n${rumors.join('\n')}\n`;
                    }
                }

                if (relationship) {
                    const rel = relationship.getRelationship(playerName);
                    context += `Relationship with speaker (${playerName}): Trust ${rel.trust}, Status ${rel.status}.\n`;
                }

                context += `\n--- DIALOGUE ---\n`;
                context += `The player (${playerName}) just said to you: "${message}"\n`;
                context += `Provide your response as ${npc.typeName} below. Remember: Direct dialogue only, no narration, no name prefixes.`;

                Logger.info('InteractionSystem', `handleSay: Sending request to LLM for NPC ${npc.typeName}`);
                try {
                    const llmResponse = await this.director.llm.chat(context, systemPrompt);
                    const responseText = llmResponse.text;
                    Logger.info('InteractionSystem', `handleSay: Received LLM response for NPC ${npc.typeName}: ${responseText.substring(0, 50)}...`);

                    // Parse response for actions
                    let cleanResponse = responseText;

                    // Strip <think> tags (common in DeepSeek models)
                    cleanResponse = cleanResponse.replace(/<think>[\s\S]*?<\/think>/g, '').trim();

                    // Strip NPC name prefix (e.g., "The Fixer: " or "Fixer: ")
                    const namePrefixRegex = new RegExp(`^(${npc.typeName}|${npc.typeName.replace(/^The\s+/i, '')}):\\s*`, 'i');
                    cleanResponse = cleanResponse.replace(namePrefixRegex, '');

                    // Strip common narrative prefixes (e.g., "Ripperdoc checks the time and says: ")
                    cleanResponse = cleanResponse.replace(/^(The\s+)?(${npc.typeName}|NPC|He|She)\s+(says|replies|checks|looks|nods|grins|shrugs|gives|provides|summarizes).*?:\s*/i, '');

                    // If the model echoed the user's message exactly (minus quotes), it's a failure
                    if (cleanResponse.toLowerCase().includes(message.toLowerCase()) && cleanResponse.length < message.length + 20) {
                        const echoIndex = cleanResponse.toLowerCase().indexOf(message.toLowerCase());
                        if (echoIndex !== -1) {
                            const before = cleanResponse.substring(0, echoIndex).trim();
                            const after = cleanResponse.substring(echoIndex + message.length).trim();
                            cleanResponse = (before + " " + after).trim();
                        }
                    }

                    const actions: string[] = [];
                    const allBracketsRegex = /\[([^\]]+)\]/g;
                    const bracketMatches = Array.from(cleanResponse.matchAll(allBracketsRegex));

                    for (const match of bracketMatches) {
                        const fullMatch = match[0];
                        const content = match[1];
                        if (/^[A-Z_]+$/.test(content)) {
                            actions.push(content);
                        }
                        cleanResponse = cleanResponse.replace(fullMatch, '').trim();
                    }

                    // Send dialogue
                    if (cleanResponse) {
                        this.messageService.sendToRoom(pos.x, pos.y, MessageType.INFO, `${npc.typeName} says, "${cleanResponse}"`);
                        if (memory) {
                            memory.addShortTerm(`${playerName} said: "${message}". I replied: "${cleanResponse}"`, [playerName]);
                        }
                    }

                    // Execute Actions
                    for (const action of actions) {
                        switch (action) {
                            case 'OFFER_DISCOUNT':
                                this.messageService.send(entityId, MessageType.SUCCESS, `${npc.typeName} looks favorably upon you.`);
                                if (relationship) relationship.modifyTrust(playerName, 5);
                                break;
                            case 'ATTACK':
                                this.messageService.sendToRoom(pos.x, pos.y, MessageType.DANGER, `${npc.typeName} turns hostile!`);
                                break;
                            case 'GIVE_QUEST':
                                try {
                                    const proposal = await this.director.questGen.generate(
                                        this.director.guardrails.getConfig(),
                                        this.director.llm,
                                        {
                                            npcId: entity.id,
                                            npcName: npc.typeName,
                                            npcDescription: npc.description,
                                            worldContext: ContextService.getInstance().getContext(),
                                            generatedBy: 'NPC_Interaction'
                                        }
                                    );

                                    const questPayload = proposal.payload as any;
                                    let giver = entity.getComponent(QuestGiver);
                                    if (!giver) {
                                        giver = new QuestGiver();
                                        entity.addComponent(giver);
                                    }

                                    giver.availableQuests.push({
                                        id: questPayload.id,
                                        title: questPayload.title,
                                        description: questPayload.description,
                                        type: questPayload.steps[0].type,
                                        rewards: {
                                            credits: questPayload.rewards.gold,
                                            xp: questPayload.rewards.xp
                                        },
                                        targetRoomId: questPayload.steps[0].target === 'any' ? undefined : questPayload.steps[0].target
                                    });

                                    this.messageService.send(entityId, MessageType.QUEST, `${npc.typeName} has a job for you. Use 'accept' to take it.`);
                                } catch (questErr) {
                                    console.error('Failed to generate quest from NPC interaction:', questErr);
                                }
                                break;
                        }
                    }
                } catch (err) {
                    console.error(`LLM Chat error for NPC ${entity.id}:`, err);
                }
            }
        }
    }
}
