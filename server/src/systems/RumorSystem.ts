import { System } from '../ecs/System';
import { IEngine } from '../ecs/IEngine';
import { GameEventBus, GameEventType } from '../utils/GameEventBus';
import { Memory } from '../components/Memory';
import { Position } from '../components/Position';
import { WorldQuery } from '../utils/WorldQuery';
import { Description } from '../components/Description';
import { TimeSystem } from './TimeSystem';

interface PendingEvent {
    sourceId: string;
    description: string;
    action: string;
    targetId?: string;
}

export class RumorSystem extends System {
    private pendingEvents: PendingEvent[] = [];
    private timeSystem: TimeSystem;

    constructor(timeSystem: TimeSystem) {
        super();
        this.timeSystem = timeSystem;
        this.setupEventListeners();
    }

    private setupEventListeners() {
        const bus = GameEventBus.getInstance();

        bus.subscribe(GameEventType.COMBAT_START, (payload) => {
            this.pendingEvents.push({
                sourceId: payload.attackerId,
                description: `I saw combat start between ${payload.attackerId} and ${payload.targetId}`,
                action: 'started combat with',
                targetId: payload.targetId
            });
        });

        bus.subscribe(GameEventType.COMBAT_END, (payload) => {
            this.pendingEvents.push({
                sourceId: payload.attackerId,
                description: `I saw combat end. Winner: ${payload.winnerId || 'None'}`,
                action: 'ended combat with',
                targetId: payload.targetId
            });
        });

        bus.subscribe(GameEventType.ITEM_PICKED_UP, (payload) => {
            this.pendingEvents.push({
                sourceId: payload.entityId,
                description: `I saw ${payload.entityId} pick up item ${payload.itemId}`,
                action: 'picked up',
                targetId: payload.itemId
            });
        });
    }

    update(engine: IEngine, deltaTime: number): void {
        while (this.pendingEvents.length > 0) {
            const event = this.pendingEvents.shift()!;
            const sourceEntity = engine.getEntity(event.sourceId);
            if (!sourceEntity) continue;

            const pos = sourceEntity.getComponent(Position);
            if (!pos) continue;

            // Get room name for location
            const room = WorldQuery.findRoomAt(engine, pos.x, pos.y);
            const locationName = room?.getComponent(Description)?.title || `Room at ${pos.x},${pos.y}`;

            // Find all NPCs in the same room
            const witnesses = WorldQuery.findNPCsAt(engine, pos.x, pos.y);
            witnesses.forEach(witness => {
                if (witness.id === event.sourceId) return; // Don't witness yourself

                const memory = witness.getComponent(Memory);
                if (memory) {
                    memory.addLongTerm(event.description, [event.sourceId]);

                    // Add structured rumor
                    const lastEntry = memory.longTerm[memory.longTerm.length - 1];
                    lastEntry.rumor = {
                        subject: event.sourceId,
                        action: event.action,
                        target: event.targetId,
                        location: locationName,
                        time: this.timeSystem.getTimeString(),
                        reliability: 1.0
                    };
                }
            });
        }
    }
}
