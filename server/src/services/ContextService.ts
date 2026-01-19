import { GameEventBus, GameEventType } from '../utils/GameEventBus';
import { AtmosphereSystem } from '../systems/AtmosphereSystem';
import { TimeSystem } from '../systems/TimeSystem';

export interface WorldEvent {
    description: string;
    timestamp: number;
}

export class ContextService {
    private static instance: ContextService;
    private recentEvents: WorldEvent[] = [];
    private atmosphereSystem?: AtmosphereSystem;
    private timeSystem?: TimeSystem;

    private constructor() {
        this.setupEventListeners();
    }

    public static getInstance(): ContextService {
        if (!ContextService.instance) {
            ContextService.instance = new ContextService();
        }
        return ContextService.instance;
    }

    public setAtmosphereSystem(atmosphere: AtmosphereSystem) {
        this.atmosphereSystem = atmosphere;
    }

    public setTimeSystem(time: TimeSystem) {
        this.timeSystem = time;
    }

    private setupEventListeners() {
        const bus = GameEventBus.getInstance();

        bus.subscribe(GameEventType.COMBAT_START, (payload) => {
            this.addEvent(`Combat started between ${payload.attackerId} and ${payload.targetId}`);
        });

        bus.subscribe(GameEventType.COMBAT_END, (payload) => {
            this.addEvent(`Combat ended between ${payload.attackerId} and ${payload.targetId}. Winner: ${payload.winnerId || 'None'}`);
        });

        bus.subscribe(GameEventType.ITEM_PICKED_UP, (payload) => {
            this.addEvent(`Item ${payload.itemId} was picked up by ${payload.entityId}`);
        });
    }

    private addEvent(description: string) {
        this.recentEvents.push({
            description,
            timestamp: Date.now()
        });
        if (this.recentEvents.length > 10) {
            this.recentEvents.shift();
        }
    }

    public getRecentEvents(): string {
        if (this.recentEvents.length === 0) return "No recent significant events.";
        return this.recentEvents.map(e => `- ${e.description}`).join('\n');
    }

    public getContext(): string {
        let context = "";

        // Time & Weather
        if (this.timeSystem) {
            context += `Current Time: ${this.timeSystem.getTimeString()}. Day: ${this.timeSystem.getDays()}.\n`;
        }

        if (this.atmosphereSystem) {
            const weather = this.atmosphereSystem.getCurrentWeather();
            context += `Current Weather: ${weather.sky}. Lighting: ${weather.lighting}.\n`;
        }

        // Recent World Events
        context += `Recent World Events:\n${this.getRecentEvents()}\n`;

        return context;
    }
}
