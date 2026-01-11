import { System } from '../ecs/System';
import { Entity } from '../ecs/Entity';
import { Position } from '../components/Position';
import { Stance, StanceType } from '../components/Stance';
import { Server } from 'socket.io';
import { InteractionSystem } from './InteractionSystem';
import { WorldQuery } from '../utils/WorldQuery';

export class MovementSystem extends System {
    private pendingMoves: Map<string, { x: number, y: number }>;
    private io: Server;
    private interactionSystem?: InteractionSystem;

    constructor(io: Server) {
        super();
        this.pendingMoves = new Map();
        this.io = io;
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

    update(entities: Set<Entity>, deltaTime: number): void {
        // Process all pending moves
        for (const [entityId, move] of this.pendingMoves.entries()) {
            const entity = WorldQuery.getEntityById(entities, entityId);
            if (!entity) continue;

            const pos = entity.getComponent(Position);
            const stance = entity.getComponent(Stance);
            if (!pos) continue;

            if (stance && stance.current !== StanceType.Standing) {
                this.io.to(entityId).emit('message', `You can't move while ${stance.current}!`);
                continue;
            }

            const targetX = pos.x + move.x;
            const targetY = pos.y + move.y;

            // Check if target room exists
            const targetRoom = WorldQuery.findRoomAt(entities, targetX, targetY);

            if (targetRoom) {
                pos.x = targetX;
                pos.y = targetY;
                // Trigger look
                if (this.interactionSystem) {
                    this.interactionSystem.handleLook(entityId, entities);
                }
            } else {
                this.io.to(entityId).emit('message', "You can't go that way.");
            }
        }

        // Clear processed moves
        this.pendingMoves.clear();
    }
}
