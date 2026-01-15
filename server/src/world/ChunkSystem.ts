import { Engine } from '../ecs/Engine';
import { Position } from '../components/Position';
import { IsRoom } from '../components/IsRoom';
import { NPC } from '../components/NPC';
import { Item } from '../components/Item';
import { WorldQuery } from '../utils/WorldQuery';
import { Logger } from '../utils/Logger';

export interface ChunkCoords {
    x: number;
    y: number;
}

export class ChunkSystem {
    public static readonly CHUNK_SIZE = 20;
    private generatedChunks: Set<string> = new Set();

    constructor(private engine: Engine) {
        // Mark the initial chunk (0,0) as generated
        this.generatedChunks.add("0,0");
        this.loadGeneratedChunks();
    }

    private loadGeneratedChunks() {
        try {
            const fs = require('fs');
            const path = require('path');
            const dir = path.join(process.cwd(), 'data', 'generated', 'world_expansions');

            if (!fs.existsSync(dir)) return;

            const files = fs.readdirSync(dir);
            for (const file of files) {
                if (!file.endsWith('.json')) continue;
                try {
                    const content = fs.readFileSync(path.join(dir, file), 'utf-8');
                    const room = JSON.parse(content);
                    if (room.coordinates) {
                        const { x, y } = room.coordinates;
                        const chunk = this.getChunkCoords(x, y);
                        this.generatedChunks.add(`${chunk.x},${chunk.y}`);
                    }
                } catch (err) {
                    Logger.warn('ChunkSystem', `Failed to load room file ${file}: ${err}`);
                }
            }
            Logger.info('ChunkSystem', `Loaded generated chunks from disk: ${this.generatedChunks.size}`);
        } catch (err) {
            Logger.error('ChunkSystem', `Failed to load generated chunks: ${err}`);
        }
    }

    /**
     * Converts world coordinates to chunk coordinates.
     */
    public getChunkCoords(worldX: number, worldY: number): ChunkCoords {
        return {
            x: Math.floor(worldX / ChunkSystem.CHUNK_SIZE),
            y: Math.floor(worldY / ChunkSystem.CHUNK_SIZE)
        };
    }

    /**
     * Checks if a chunk has been generated.
     */
    public isChunkGenerated(cx: number, cy: number): boolean {
        return this.generatedChunks.has(`${cx},${cy}`);
    }

    /**
     * Marks a chunk as generated.
     */
    public markChunkGenerated(cx: number, cy: number) {
        this.generatedChunks.add(`${cx},${cy}`);
        Logger.info('ChunkSystem', `Chunk (${cx}, ${cy}) marked as generated.`);
    }

    public getGeneratedChunks(): string[] {
        return Array.from(this.generatedChunks);
    }

    /**
     * Finds which chunks need to be generated based on player positions.
     */
    public getChunksToGenerate(): ChunkCoords[] {
        const players = this.engine.getEntitiesWithComponent(Position).filter((e: any) => !e.hasComponent(IsRoom));
        const neededChunks: Set<string> = new Set();

        for (const player of players) {
            const pos = player.getComponent(Position);
            if (!pos) continue;

            const currentChunk = this.getChunkCoords(pos.x, pos.y);

            // Check adjacent chunks (including diagonals)
            for (let dx = -1; dx <= 1; dx++) {
                for (let dy = -1; dy <= 1; dy++) {
                    const cx = currentChunk.x + dx;
                    const cy = currentChunk.y + dy;

                    if (!this.isChunkGenerated(cx, cy)) {
                        neededChunks.add(`${cx},${cy}`);
                    }
                }
            }
        }

        return Array.from(neededChunks).map(s => {
            const [x, y] = s.split(',').map(Number);
            return { x, y };
        });
    }

    /**
     * Returns the bounds of a chunk in world coordinates.
     */
    public getChunkBounds(cx: number, cy: number) {
        return {
            minX: cx * ChunkSystem.CHUNK_SIZE,
            minY: cy * ChunkSystem.CHUNK_SIZE,
            maxX: (cx + 1) * ChunkSystem.CHUNK_SIZE - 1,
            maxY: (cy + 1) * ChunkSystem.CHUNK_SIZE - 1
        };
    }

    /**
     * Deletes a generated chunk and its files.
     */
    public deleteChunk(cx: number, cy: number): boolean {
        const key = `${cx},${cy}`;
        if (!this.generatedChunks.has(key)) return false;

        this.generatedChunks.delete(key);

        // 1. Remove entities from the engine
        const bounds = this.getChunkBounds(cx, cy);
        const entities = this.engine.getEntitiesWithComponent(Position);
        let removedCount = 0;

        for (const entity of entities) {
            const pos = entity.getComponent(Position);
            if (!pos) continue;

            if (pos.x >= bounds.minX && pos.x <= bounds.maxX &&
                pos.y >= bounds.minY && pos.y <= bounds.maxY) {

                // Don't remove players! 
                // Players are entities that are NOT rooms and NOT NPCs, and NOT items (usually).
                // A safer check: if it has a socket ID as an ID, it's a player.
                // But we can also check for NPC component.
                const isRoom = entity.hasComponent(IsRoom);
                const isNPC = entity.hasComponent(NPC);
                const isItem = entity.hasComponent(Item);

                if (isRoom || isNPC || isItem) {
                    this.engine.removeEntity(entity.id);
                    removedCount++;
                }
            }
        }
        Logger.info('ChunkSystem', `Removed ${removedCount} entities from memory for chunk (${cx}, ${cy}).`);

        // 2. Delete files from disk
        try {
            const fs = require('fs');
            const path = require('path');
            const dir = path.join(process.cwd(), 'data', 'generated', 'world_expansions');

            if (fs.existsSync(dir)) {
                const files = fs.readdirSync(dir);
                for (const file of files) {
                    if (!file.endsWith('.json')) continue;
                    try {
                        const content = fs.readFileSync(path.join(dir, file), 'utf-8');
                        const room = JSON.parse(content);
                        if (room.coordinates) {
                            const { x, y } = room.coordinates;
                            const chunk = this.getChunkCoords(x, y);
                            if (chunk.x === cx && chunk.y === cy) {
                                fs.unlinkSync(path.join(dir, file));
                                Logger.info('ChunkSystem', `Deleted room file: ${file}`);
                            }
                        }
                    } catch (err) {
                        // Ignore read errors
                    }
                }
            }
            Logger.info('ChunkSystem', `Chunk (${cx}, ${cy}) deleted.`);
            return true;
        } catch (err) {
            Logger.error('ChunkSystem', `Failed to delete chunk (${cx}, ${cy}): ${err}`);
            return false;
        }
    }
}
