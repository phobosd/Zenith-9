
import { System } from '../ecs/System';
import { Engine } from '../ecs/Engine';
import { IEngine } from '../ecs/IEngine';
import { Entity } from '../ecs/Entity';
import { CommandRegistry } from '../commands/CommandRegistry';
import { MessageService } from '../services/MessageService';
import { QuestGiver, QuestDefinition } from '../components/QuestGiver';
import { PlayerQuests, ActiveQuest } from '../components/PlayerQuests';
import { Position } from '../components/Position';
import { Inventory } from '../components/Inventory';
import { Item } from '../components/Item';
import { Credits } from '../components/Credits';
import { Stats } from '../components/Stats';
import { IsRoom } from '../components/IsRoom';
import { Logger } from '../utils/Logger';
import { Container } from '../components/Container';

export class QuestSystem extends System {
    private messageService: MessageService;

    constructor(messageService: MessageService) {
        super();
        this.messageService = messageService;
    }

    public update(engine: IEngine, deltaTime: number): void {
        // No periodic updates needed for now
    }

    public registerCommands(commandRegistry: CommandRegistry) {
        commandRegistry.register({
            name: 'quests',
            aliases: ['journal', 'missions'],
            description: 'View your active quests.',
            execute: (ctx) => this.handleListQuests(ctx.socketId, ctx.engine)
        });

        commandRegistry.register({
            name: 'accept',
            aliases: ['job'],
            description: 'Accept a quest from an NPC.',
            execute: (ctx) => this.handleAcceptQuest(ctx.socketId, ctx.engine, ctx.args)
        });

        commandRegistry.register({
            name: 'deliver',
            aliases: ['complete'],
            description: 'Complete a delivery quest.',
            execute: (ctx) => this.handleDeliverQuest(ctx.socketId, ctx.engine)
        });
    }

    private handleListQuests(socketId: string, engine: IEngine) {
        const player = engine.getEntity(socketId);
        if (!player) return;

        const playerQuests = player.getComponent(PlayerQuests);
        if (!playerQuests || playerQuests.active.length === 0) {
            this.messageService.info(socketId, "You have no active quests.");
            return;
        }

        let output = "\n<cyan>--- Active Quests ---</cyan>\n";
        playerQuests.active.forEach(q => {
            output += `\n<yellow>${q.title}</yellow>\n`;
            output += `<white>${q.description}</white>\n`;
            if (q.targetRoomId) {
                // Try to find room name for hint
                const room = engine.getEntity(q.targetRoomId);
                const roomName = room ? (room as any).name : 'Unknown Location';
                output += `<gray>Target: ${roomName} (${q.targetRoomId})</gray>\n`;
            }
        });
        output += "\n<cyan>-----------------------</cyan>\n";
        this.messageService.info(socketId, output);
    }

    private handleAcceptQuest(socketId: string, engine: IEngine, args: string[]) {
        try {
            Logger.info('QuestSystem', `Player ${socketId} attempting to accept quest.`);
            const player = engine.getEntity(socketId);
            if (!player) return;

            const pos = player.getComponent(Position);
            if (!pos) return;

            // Find NPCs in room with QuestGiver
            const npcs = (engine as any).getEntitiesWithComponent(QuestGiver).filter((n: Entity) => {
                const nPos = n.getComponent(Position);
                return nPos && nPos.x === pos.x && nPos.y === pos.y;
            });

            if (npcs.length === 0) {
                this.messageService.info(socketId, "There is no one here offering work.");
                return;
            }

            const npc = npcs[0];
            const giver = npc.getComponent(QuestGiver);

            if (!giver || giver.availableQuests.length === 0) {
                this.messageService.info(socketId, `${(npc as any).typeName || 'The NPC'} has no more work for you.`);
                return;
            }

            const quest = giver.availableQuests[0];
            Logger.info('QuestSystem', `Found quest: ${quest.id} - ${quest.title}`);

            // Handle Item Handoff (Package)
            if (quest.type === 'delivery' && quest.requiredItemId) {
                const npcInv = npc.getComponent(Inventory);
                const playerInv = player.getComponent(Inventory);

                // Get item name
                const itemEntity = engine.getEntity(quest.requiredItemId);
                const itemName = (itemEntity as any)?.name || 'package';

                if (npcInv && playerInv) {
                    // Check if NPC has item in hands or equipment
                    let hasItem = npcInv.hasItem(quest.requiredItemId);
                    let slotToRemove: string | null = null;

                    if (!hasItem) {
                        // Check equipment
                        for (const [slot, itemId] of npcInv.equipment) {
                            if (itemId === quest.requiredItemId) {
                                hasItem = true;
                                slotToRemove = slot;
                                break;
                            }
                        }
                    }

                    if (hasItem) {
                        // Remove from NPC
                        if (slotToRemove) {
                            npcInv.equipment.delete(slotToRemove);
                        } else {
                            npcInv.removeItem(quest.requiredItemId);
                        }

                        // Try Hands
                        if (playerInv.addItem(quest.requiredItemId)) {
                            this.messageService.success(socketId, `You accepted the job. ${(npc as any).typeName || 'The courier'} hands you the <item id="${quest.requiredItemId}">${itemName}</item>.`);
                        } else {
                            // Try Backpack/Containers
                            let addedToBackpack = false;
                            for (const [slot, itemId] of playerInv.equipment) {
                                const containerEntity = engine.getEntity(itemId);
                                if (containerEntity) {
                                    const container = containerEntity.getComponent(Container);
                                    if (container) {
                                        container.items.push(quest.requiredItemId);
                                        addedToBackpack = true;
                                        this.messageService.success(socketId, `You accepted the job. You stow the <item id="${quest.requiredItemId}">${itemName}</item> in your ${slot}.`);
                                        break;
                                    }
                                }
                            }

                            if (!addedToBackpack) {
                                // Drop to ground
                                if (itemEntity) {
                                    let itemPos = itemEntity.getComponent(Position);
                                    if (!itemPos) {
                                        itemPos = new Position(pos.x, pos.y);
                                        itemEntity.addComponent(itemPos);
                                    } else {
                                        itemPos.x = pos.x;
                                        itemPos.y = pos.y;
                                    }
                                    this.messageService.success(socketId, `You accepted the job. Your hands are full, so you placed the <item id="${quest.requiredItemId}">${itemName}</item> on the ground.`);
                                } else {
                                    // Critical failure fallback
                                    // Give back to NPC
                                    if (slotToRemove) {
                                        npcInv.equipment.set(slotToRemove, quest.requiredItemId);
                                    } else {
                                        npcInv.addItem(quest.requiredItemId);
                                    }
                                    this.messageService.error(socketId, "You don't have free hands to take the package.");
                                    return;
                                }
                            }
                        }
                    } else {
                        Logger.error('QuestSystem', `NPC ${npc.id} missing required item ${quest.requiredItemId}`);
                        this.messageService.error(socketId, "Error: The courier seems to have lost the package.");
                        return;
                    }
                }
            } else {
                this.messageService.success(socketId, `You accepted the job: ${quest.title}`);
            }

            // Add to player
            let pQuests = player.getComponent(PlayerQuests);
            if (!pQuests) {
                pQuests = new PlayerQuests();
                player.addComponent(pQuests);
            }

            const activeQuest: ActiveQuest = {
                ...quest,
                acceptedAt: Date.now(),
                status: 'active'
            };
            pQuests.active.push(activeQuest);

            // Remove from NPC
            giver.availableQuests.shift();
        } catch (err) {
            Logger.error('QuestSystem', `Error handling accept quest: ${err}`);
            this.messageService.error(socketId, "An internal error occurred while accepting the quest.");
        }
    }

    private handleDeliverQuest(socketId: string, engine: IEngine) {
        const player = engine.getEntity(socketId);
        if (!player) return;

        const pQuests = player.getComponent(PlayerQuests);
        if (!pQuests || pQuests.active.length === 0) {
            this.messageService.info(socketId, "You have no deliveries to make.");
            return;
        }

        const pos = player.getComponent(Position);
        if (!pos) return;

        // Find a completable delivery quest
        let wrongLocation = false;
        let missingItem = false;
        let targetRoomName = "Unknown";

        const questIndex = pQuests.active.findIndex(q => {
            if (q.type !== 'delivery' && q.type !== 'collection') return false;

            // Check Location
            let atLocation = false;
            if (q.targetRoomId) {
                const targetRoom = engine.getEntity(q.targetRoomId);
                if (targetRoom) {
                    targetRoomName = (targetRoom as any).name;
                    const roomPos = targetRoom.getComponent(Position);
                    if (roomPos && pos.x === roomPos.x && pos.y === roomPos.y) {
                        atLocation = true;
                    } else {
                        // Debug log
                        Logger.info('QuestSystem', `Player at ${pos.x},${pos.y}. Target ${targetRoomName} at ${roomPos?.x},${roomPos?.y}`);
                    }
                }
            } else {
                // Fallback
                const roomAtPos = (engine as any).getEntitiesWithComponent(Position).find((e: Entity) => {
                    const p = e.getComponent(Position);
                    return p && p.x === pos.x && p.y === pos.y && e.hasComponent(IsRoom);
                });
                if (roomAtPos) atLocation = true;
            }

            if (!atLocation) {
                wrongLocation = true;
                return false;
            }

            // Check Item (Hands OR Backpack)
            if (q.requiredItemId) {
                Logger.info('QuestSystem', `Checking delivery for item: ${q.requiredItemId}`);
                const inv = player.getComponent(Inventory);
                if (!inv) {
                    missingItem = true;
                    return false;
                }

                if (inv.hasItem(q.requiredItemId)) return true;

                // Check backpacks
                let foundInBackpack = false;
                for (const [slot, itemId] of inv.equipment) {
                    const itemEntity = engine.getEntity(itemId);
                    if (itemEntity) {
                        const container = itemEntity.getComponent(Container);
                        if (container && container.items.includes(q.requiredItemId)) {
                            foundInBackpack = true;
                            break;
                        }
                    }
                }

                if (!foundInBackpack) {
                    missingItem = true;
                    // Debug log
                    const reqItemEntity = engine.getEntity(q.requiredItemId);
                    const reqItemName = reqItemEntity?.getComponent(Item)?.name || 'Unknown';
                    Logger.info('QuestSystem', `Missing required item: ${q.requiredItemId} (${reqItemName})`);

                    // Debug: List all items in backpack to see if there's a mismatch
                    for (const [slot, itemId] of inv.equipment) {
                        const itemEntity = engine.getEntity(itemId);
                        if (itemEntity) {
                            const container = itemEntity.getComponent(Container);
                            if (container) {
                                for (const contentId of container.items) {
                                    const contentEntity = engine.getEntity(contentId);
                                    const name = contentEntity?.getComponent(Item)?.name || 'Unknown';
                                    Logger.info('QuestSystem', `Backpack contains: ${contentId} (${name})`);
                                }
                            }
                        }
                    }
                    return false;
                }
            }

            return true;
        });

        if (questIndex === -1) {
            if (wrongLocation) {
                this.messageService.info(socketId, `You are not at the correct delivery location.`);
            } else if (missingItem) {
                this.messageService.info(socketId, `You don't have the required package.`);
            } else {
                this.messageService.info(socketId, "You have no deliveries to make here.");
            }
            return;
        }

        const quest = pQuests.active[questIndex];

        // Complete it
        // Remove item
        if (quest.requiredItemId) {
            const inv = player.getComponent(Inventory);
            if (inv) {
                if (inv.hasItem(quest.requiredItemId)) {
                    inv.removeItem(quest.requiredItemId);
                } else {
                    // Remove from backpack
                    for (const [slot, itemId] of inv.equipment) {
                        const itemEntity = engine.getEntity(itemId);
                        if (itemEntity) {
                            const container = itemEntity.getComponent(Container);
                            if (container) {
                                const idx = container.items.indexOf(quest.requiredItemId);
                                if (idx !== -1) {
                                    container.items.splice(idx, 1);
                                    break;
                                }
                            }
                        }
                    }
                }
                engine.removeEntity(quest.requiredItemId);
            }
        }

        // Rewards
        if (quest.rewards.credits) {
            let credits = player.getComponent(Credits);
            if (!credits) {
                credits = new Credits(0);
                player.addComponent(credits);
            }
            credits.amount += quest.rewards.credits;
            this.messageService.success(socketId, `Delivery complete! You earned ${quest.rewards.credits} credits.`);
        }

        if (quest.rewards.xp) {
            const stats = player.getComponent(Stats);
            if (stats) {
                stats.addXP(quest.rewards.xp);
                this.messageService.info(socketId, `You gained ${quest.rewards.xp} XP.`);
            }
        }

        // Update Quest State
        pQuests.active.splice(questIndex, 1);
        pQuests.completedIds.push(quest.id);
    }
}
