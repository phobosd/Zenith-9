import { System } from '../ecs/System';
import { Entity } from '../ecs/Entity';
import { Position } from '../components/Position';
import { Stance, StanceType } from '../components/Stance';
import { CombatStats } from '../components/CombatStats';
import { EngagementTier } from '../types/CombatTypes';
import { Server } from 'socket.io';
import { InteractionSystem } from './InteractionSystem';
import { WorldQuery } from '../utils/WorldQuery';
import { IEngine } from '../commands/CommandRegistry';
import { NPC } from '../components/NPC';

import { MessageService } from '../services/MessageService';

export class MovementSystem extends System {
    private pendingMoves: Map<string, { x: number, y: number }>;
    private io: Server;
    private messageService: MessageService;
    private interactionSystem?: InteractionSystem;

    constructor(io: Server, messageService: MessageService) {
        super();
        this.pendingMoves = new Map();
        this.io = io;
        this.messageService = messageService;
    }

    setInteractionSystem(system: InteractionSystem) {
        this.interactionSystem = system;
    }

    // Method to queue a move command from a player
    queueMove(entityId: string, direction: 'n' | 's' | 'e' | 'w') {
        let dx = 0;
        let dy = 0;

        switch (direction) {
            case 'n': dy = -1; break;
            case 's': dy = 1; break;
            case 'e': dx = 1; break;
            case 'w': dx = -1; break;
        }

        this.pendingMoves.set(entityId, { x: dx, y: dy });
    }

    update(engine: IEngine, deltaTime: number): void {
        // Process all pending moves
        for (const [entityId, move] of this.pendingMoves.entries()) {
            const entity = engine.getEntity(entityId);
            if (!entity) continue;

            const pos = entity.getComponent(Position);
            const stance = entity.getComponent(Stance);
            if (!pos) continue;

            if (stance && stance.current !== StanceType.Standing) {
                this.messageService.info(entityId, `You can't move while ${stance.current}!`);
                continue;
            }

            const combatStats = entity.getComponent(CombatStats);
            if (combatStats) {
                const roomEntities = engine.getEntitiesWithComponent(Position);

                // Check if any hostile entity in the room is engaged with us at close range
                const hostileEngaged = roomEntities.some(e => {
                    if (e.id === entityId) return false;
                    const ePos = e.getComponent(Position);
                    const eStats = e.getComponent(CombatStats);
                    if (ePos?.x === pos.x && ePos?.y === pos.y && eStats?.isHostile) {
                        // If they are at polearm or closer, they are pinning us
                        return [EngagementTier.MELEE, EngagementTier.CLOSE_QUARTERS, EngagementTier.POLEARM].includes(eStats.engagementTier);
                    }
                    return false;
                });

                const playerIsEngaged = [EngagementTier.MELEE, EngagementTier.CLOSE_QUARTERS, EngagementTier.POLEARM].includes(combatStats.engagementTier);

                if (hostileEngaged) {
                    this.messageService.info(entityId, "You are too closely engaged to move away! Retreat first.");
                    continue;
                } else if (playerIsEngaged) {
                    // Auto-disengage if no hostiles are pinning us
                    combatStats.engagementTier = EngagementTier.DISENGAGED;
                }
            }

            const targetX = pos.x + move.x;
            const targetY = pos.y + move.y;

            // Check if target room exists
            const targetRoom = WorldQuery.findRoomAt(engine, targetX, targetY);

            if (targetRoom) {
                pos.x = targetX;
                pos.y = targetY;

                // Reset engagement tier on room change
                if (combatStats) {
                    combatStats.engagementTier = EngagementTier.DISENGAGED;
                }

                // Check for aggressive NPCs in the new room
                const npcsInRoom = WorldQuery.findNPCsAt(engine, targetX, targetY);
                for (const npc of npcsInRoom) {
                    const npcComp = npc.getComponent(NPC);
                    const npcCombat = npc.getComponent(CombatStats);

                    if (!npcComp || !npcCombat) continue;

                    // Reset engagement tier for ALL NPCs when player enters (ensures fresh encounters)
                    if (npcCombat.targetId === entityId) {
                        console.log(`[Movement] Resetting ${npcComp.typeName} (${npc.id}) engagement tier for returning player`);
                        npcCombat.engagementTier = EngagementTier.DISENGAGED;
                    }

                    // If NPC is aggressive and doesn't have a target, make it detect the player
                    if (npcComp.isAggressive && !npcCombat.targetId) {
                        npcCombat.isHostile = true;
                        npcCombat.targetId = entityId;
                        npcCombat.engagementTier = EngagementTier.DISENGAGED; // Start at disengaged
                        console.log(`[Movement] ${npcComp.typeName} (${npc.id}) detected player ${entityId} entering room`);
                        this.messageService.combat(entityId, `<enemy>${npcComp.typeName} notices you and prepares to attack!</enemy>`);
                    }
                }

                // Trigger look
                if (this.interactionSystem) {
                    this.interactionSystem.handleLook(entityId, engine);
                }
            } else {
                this.messageService.info(entityId, "You can't go that way.");
            }
        }

        // Clear processed moves
        this.pendingMoves.clear();
    }
}
