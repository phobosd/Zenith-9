import { System } from '../ecs/System';
import { IEngine } from '../ecs/IEngine';
import { Entity } from '../ecs/Entity';
import { Heat } from '../components/Heat';
import { MessageService } from '../services/MessageService';
import { Logger } from '../utils/Logger';

export class HeatSystem extends System {
    private messageService: MessageService;
    private lastDecayTime: number = Date.now();
    private DECAY_INTERVAL = 60000; // Decay every minute
    private engine: IEngine | null = null;

    constructor(messageService: MessageService) {
        super();
        this.messageService = messageService;
    }

    update(engine: IEngine, deltaTime: number): void {
        this.engine = engine;
        const now = Date.now();
        if (now - this.lastDecayTime >= this.DECAY_INTERVAL) {
            this.lastDecayTime = now;
            this.decayHeat(engine);
        }
    }

    private decayHeat(engine: IEngine) {
        const entities = engine.getEntitiesWithComponent(Heat);
        for (const entity of entities) {
            const heat = entity.getComponent(Heat);
            if (heat && heat.value > 0) {
                heat.decrease(heat.decayRate);
                if (heat.value === 0) {
                    this.messageService.info(entity.id, "The heat has died down. You feel less watched.");
                }
            }
        }
    }

    // Public method to increase heat
    public increaseHeat(entityId: string, amount: number) {
        if (!this.engine) return;

        const entity = this.engine.getEntity(entityId);
        if (entity) {
            const heat = entity.getComponent(Heat);
            if (heat) {
                const oldLevel = Math.floor(heat.value / 25);
                heat.increase(amount);
                const newLevel = Math.floor(heat.value / 25);

                this.messageService.error(entity.id, `Heat increased by ${amount}! Current Level: ${heat.value}`);

                if (newLevel > oldLevel) {
                    this.triggerHeatResponse(entity, newLevel);
                }
            }
        }
    }

    private triggerHeatResponse(entity: Entity, level: number) {
        let message = "";
        switch (level) {
            case 1: message = "Local security is on alert."; break;
            case 2: message = "Police drones have been dispatched to your sector."; break;
            case 3: message = "Corporate hit-squads are hunting you."; break;
            case 4: message = "MAX-TAC HAS BEEN AUTHORIZED. RUN."; break;
        }
        this.messageService.error(entity.id, `<error>[HEAT LEVEL ${level}] ${message}</error>`);
    }
}
