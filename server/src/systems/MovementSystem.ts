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
                if ([EngagementTier.MELEE, EngagementTier.CLOSE_QUARTERS, EngagementTier.POLEARM].includes(combatStats.engagementTier)) {
                    // Check if there are actually any hostile entities in the room
                    const roomEntities = engine.getEntitiesWithComponent(Position);
                    const hostilePresent = roomEntities.some(e => {
                        if (e.id === entityId) return false;
                        const ePos = e.getComponent(Position);
                        const eStats = e.getComponent(CombatStats);
                        return ePos?.x === pos.x && ePos?.y === pos.y && eStats?.isHostile;
                    });

                    if (hostilePresent) {
                        this.messageService.info(entityId, "You are too closely engaged to move away! Retreat first.");
                        continue;
                    } else {
                        // Auto-disengage if no hostiles
                        combatStats.engagementTier = EngagementTier.DISENGAGED;
                        this.messageService.info(entityId, "You are no longer engaged.");
                    }
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
