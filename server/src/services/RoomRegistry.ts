import * as fs from 'fs';
import * as path from 'path';
import { Logger } from '../utils/Logger';

export interface RoomDefinition {
    id: string;
    name: string;
    description: string;
    type: 'street' | 'shop' | 'dungeon' | 'indoor';
    coordinates: { x: number, y: number, z: number };
    exits: Record<string, string>; // direction -> targetRoomId
    features?: string[];
    spawns?: string[];
}

export class RoomRegistry {
    private static instance: RoomRegistry;
    private rooms: Map<string, RoomDefinition> = new Map();
    private coordMap: Map<string, RoomDefinition> = new Map();

    private constructor() {
        this.loadRooms();
    }

    public static getInstance(): RoomRegistry {
        if (!RoomRegistry.instance) {
            RoomRegistry.instance = new RoomRegistry();
        }
        return RoomRegistry.instance;
    }

    private loadRooms() {
        try {
            // 1. Load static rooms (if any)
            // For now we only have generated rooms and the initial world generator

            // 2. Load generated rooms
            this.loadGeneratedRooms();
        } catch (error) {
            Logger.error('RoomRegistry', "Failed to load rooms:", error);
        }
    }

    public reloadGeneratedRooms() {
        this.loadGeneratedRooms();
    }

    private loadGeneratedRooms() {
        try {
            const generatedDir = path.join(process.cwd(), 'data', 'generated', 'world_expansions');
            if (!fs.existsSync(generatedDir)) return;

            const files = fs.readdirSync(generatedDir).filter(f => f.endsWith('.json'));
            Logger.info('RoomRegistry', `Loading ${files.length} generated rooms...`);

            for (const file of files) {
                try {
                    const content = fs.readFileSync(path.join(generatedDir, file), 'utf-8');
                    const room = JSON.parse(content);

                    const def: RoomDefinition = {
                        id: room.id,
                        name: room.name,
                        description: room.description,
                        type: room.type,
                        coordinates: room.coordinates,
                        exits: room.exits || {},
                        features: room.features || [],
                        spawns: room.spawns || []
                    };

                    this.rooms.set(def.id, def);
                    this.coordMap.set(`${def.coordinates.x},${def.coordinates.y},${def.coordinates.z}`, def);
                } catch (err) {
                    Logger.error('RoomRegistry', `Failed to load generated room ${file}:`, err);
                }
            }
        } catch (err) {
            Logger.error('RoomRegistry', "Failed to load generated rooms:", err);
        }
    }

    public getRoom(id: string): RoomDefinition | undefined {
        return this.rooms.get(id);
    }

    public getRoomAt(x: number, y: number, z: number = 0): RoomDefinition | undefined {
        return this.coordMap.get(`${x},${y},${z}`);
    }

    public getAllRooms(): RoomDefinition[] {
        return Array.from(this.rooms.values());
    }
}
