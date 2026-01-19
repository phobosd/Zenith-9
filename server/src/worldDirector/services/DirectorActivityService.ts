import { GameEventBus, GameEventType } from '../../utils/GameEventBus';
import { WorldDirector } from '../Director';

import { Position } from '../../components/Position';

export interface ZoneActivity {
    interactions: number;
    lastInteraction: number;
}

export class DirectorActivityService {
    private director: WorldDirector;
    private zoneActivity: Map<string, ZoneActivity> = new Map();

    constructor(director: WorldDirector) {
        this.director = director;
        this.setupEventListeners();
    }

    private setupEventListeners() {
        const bus = GameEventBus.getInstance();

        // Track player movement to see where people are
        bus.subscribe(GameEventType.PLAYER_MOVED, (payload) => {
            const zoneKey = `${Math.floor(payload.toX / 10)},${Math.floor(payload.toY / 10)}`;
            this.recordActivity(zoneKey);
        });

        // Track combat
        bus.subscribe(GameEventType.COMBAT_START, (payload) => {
            const entity = this.director.engine.getEntity(payload.attackerId);
            const pos = entity?.getComponent(Position);
            if (pos) {
                const zoneKey = `${Math.floor(pos.x / 10)},${Math.floor(pos.y / 10)}`;
                this.recordActivity(zoneKey, 5); // Combat is high activity
            }
        });
    }

    private recordActivity(zoneKey: string, weight: number = 1) {
        const activity = this.zoneActivity.get(zoneKey) || { interactions: 0, lastInteraction: Date.now() };
        activity.interactions += weight;
        activity.lastInteraction = Date.now();
        this.zoneActivity.set(zoneKey, activity);
    }

    public getQuietZones(): string[] {
        const quietZones: string[] = [];
        const now = Date.now();

        this.zoneActivity.forEach((activity, zoneKey) => {
            // If no activity in 5 minutes and interaction count is low
            if (now - activity.lastInteraction > 300000 && activity.interactions < 10) {
                quietZones.push(zoneKey);
            }
        });

        return quietZones;
    }

    public update() {
        // Periodically decay activity
        this.zoneActivity.forEach((activity, zoneKey) => {
            activity.interactions *= 0.95; // 5% decay
        });
    }
}
