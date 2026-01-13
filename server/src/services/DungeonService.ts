import { IEngine } from '../ecs/IEngine';
import { Entity } from '../ecs/Entity';
import { Position } from '../components/Position';
import { Description } from '../components/Description';
import { IsRoom } from '../components/IsRoom';
import { Portal } from '../components/Portal';
import { Atmosphere } from '../components/Atmosphere';
import { NPC } from '../components/NPC';
import { CombatStats } from '../components/CombatStats';
import { Stats } from '../components/Stats';
import { Visuals } from '../components/Visuals';
import { MessageService } from './MessageService';
import { WorldQuery } from '../utils/WorldQuery';
import * as fs from 'fs';
import * as path from 'path';

interface EnemyDef {
    id: string;
    name: string;
    tier: number;
    stats: { atk: number, def: number, spd: number, hp: number };
    visuals: { char: string, color: string, glitch_rate: number };
    special: { id: string, trigger: string, effect: string };
    description: string;
}

export class DungeonService {
    private static instance: DungeonService;
    private engine: IEngine;
    private messageService: MessageService;
    private enemies: EnemyDef[] = [];

    // Track visited rooms per player for Fog of War
    // Key: playerId, Value: Set of "x,y" strings
    private visitedRooms: Map<string, Set<string>> = new Map();

    // Track active dungeon instances (simplified: just one shared dungeon area for now, 
    // but regenerated when empty? Or per player? 
    // User said: "when they re-enter, there is a new map generated."
    // This implies per-session or per-entry. 
    // To keep it simple but functional: We'll generate a unique dungeon layout 
    // in the 2000+ coordinate space. We'll clear it when the last player leaves?
    // Or just regenerate it when a player enters via the door.
    // Let's assume single player focus for now or shared dungeon that resets.
    // We'll clear the 2000+ area before generating.

    private readonly DUNGEON_OFFSET_X = 2000;
    private readonly DUNGEON_OFFSET_Y = 2000;
    private readonly DUNGEON_SIZE = 60; // Max bounds

    constructor(engine: IEngine, messageService: MessageService) {
        this.engine = engine;
        this.messageService = messageService;
        this.loadEnemies();
    }

    static getInstance(engine?: IEngine, messageService?: MessageService): DungeonService {
        if (!DungeonService.instance && engine && messageService) {
            DungeonService.instance = new DungeonService(engine, messageService);
        }
        return DungeonService.instance;
    }

    private loadEnemies() {
        try {
            const filePath = path.join(process.cwd(), 'data/enemies.json');
            const data = fs.readFileSync(filePath, 'utf-8');
            const json = JSON.parse(data);
            this.enemies = json.enemies;
            console.log(`[DungeonService] Loaded ${this.enemies.length} enemies.`);
        } catch (err) {
            console.error("[DungeonService] Failed to load enemies:", err);
        }
    }

    public enterDungeon(playerId: string) {
        // 1. Clear existing dungeon (for this prototype, we treat it as a fresh instance)
        this.clearDungeon();

        // 2. Generate new layout
        this.generateDungeon();

        // 3. Teleport player
        const player = WorldQuery.getEntityById(this.engine, playerId);
        if (player) {
            const pos = player.getComponent(Position);
            if (pos) {
                // Save previous position? For now, just hardcode exit to Plaza
                pos.x = this.DUNGEON_OFFSET_X;
                pos.y = this.DUNGEON_OFFSET_Y;
                console.log(`[DungeonService] Teleported player ${playerId} to ${pos.x}, ${pos.y}`);
            }

            // Reset visited for this player
            this.visitedRooms.set(playerId, new Set([`${this.DUNGEON_OFFSET_X},${this.DUNGEON_OFFSET_Y}`]));

            this.messageService.system(playerId, "\n[SYSTEM] WARNING: UNSTABLE REALITY DETECTED.");
            this.messageService.system(playerId, "[SYSTEM] CONNECTING TO GLITCH ZONE...");
            this.messageService.info(playerId, "\nThe world dissolves into static. You step through the threshold and find yourself in a shifting, neon-lit void.");
        } else {
            console.error(`[DungeonService] Failed to find player ${playerId} or position component.`);
        }
    }

    public leaveDungeon(playerId: string) {
        const player = WorldQuery.getEntityById(this.engine, playerId);
        if (player) {
            const pos = player.getComponent(Position);
            if (pos) {
                // Teleport back to Plaza (10, 10)
                pos.x = 10;
                pos.y = 10;
            }
            this.messageService.system(playerId, "[SYSTEM] DISCONNECTING...");
            this.messageService.info(playerId, "The glitch zone fades. You are back in the stability of the Sprawl.");
            console.log(`[DungeonService] Player ${playerId} left dungeon.`);
        }
    }

    private clearDungeon() {
        // Remove all entities in dungeon range
        const entities = this.engine.getEntities();
        const toRemove: string[] = [];

        for (const [id, entity] of entities) {
            const pos = entity.getComponent(Position);
            if (pos && pos.x >= this.DUNGEON_OFFSET_X) {
                // Don't remove players!
                if (!entity.getComponent(Stats)) {
                    if (entity.hasComponent(NPC) || entity.hasComponent(IsRoom) || entity.hasComponent(Description)) {
                        toRemove.push(id);
                    }
                }
            }
        }

        toRemove.forEach(id => this.engine.removeEntity(id));
    }

    private generateDungeon() {
        const targetRooms = 60 + Math.floor(Math.random() * 30); // 60-90 rooms (Tripled size)
        const visited = new Set<string>();
        const nodes: { x: number, y: number }[] = [{ x: this.DUNGEON_OFFSET_X, y: this.DUNGEON_OFFSET_Y }];

        // Create Entry Room
        this.createRoom(this.DUNGEON_OFFSET_X, this.DUNGEON_OFFSET_Y, true);
        visited.add(`${this.DUNGEON_OFFSET_X},${this.DUNGEON_OFFSET_Y}`);

        let created = 1;
        let attempts = 0;
        const maxAttempts = 1000;

        while (created < targetRooms && attempts < maxAttempts) {
            attempts++;

            // Pick a random node to branch from
            // Bias towards the end of the list to create longer paths (DFS-ish), but occasionally pick random for branching
            const useRecent = Math.random() > 0.3;
            const idx = useRecent ? nodes.length - 1 - Math.floor(Math.random() * Math.min(5, nodes.length)) : Math.floor(Math.random() * nodes.length);
            const curr = nodes[idx];

            // Pick a random direction
            const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
            const dir = dirs[Math.floor(Math.random() * dirs.length)];

            // Determine segment length (Corridor/Alleyway)
            // 2-6 rooms long
            const segmentLen = 2 + Math.floor(Math.random() * 5);

            let cx = curr.x;
            let cy = curr.y;

            for (let i = 0; i < segmentLen; i++) {
                if (created >= targetRooms) break;

                const nx = cx + dir[0];
                const ny = cy + dir[1];
                const key = `${nx},${ny}`;

                // Check bounds (relative to offset)
                // Ensure we stay within the 2000+ range and don't accidentally wrap or go negative relative to offset
                if (nx < this.DUNGEON_OFFSET_X || nx > this.DUNGEON_OFFSET_X + this.DUNGEON_SIZE ||
                    ny < this.DUNGEON_OFFSET_Y || ny > this.DUNGEON_OFFSET_Y + this.DUNGEON_SIZE) {
                    break;
                }

                if (!visited.has(key)) {
                    // Check neighbors to prevent large open areas (labyrinth feel)
                    let neighborCount = 0;
                    const checkDirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
                    for (const d of checkDirs) {
                        if (visited.has(`${nx + d[0]},${ny + d[1]}`)) neighborCount++;
                    }

                    // If > 1 neighbor, we are creating a cluster/loop. Avoid most of the time.
                    if (neighborCount > 1 && Math.random() > 0.3) {
                        break;
                    }

                    this.createRoom(nx, ny, false);
                    visited.add(key);
                    nodes.push({ x: nx, y: ny });
                    cx = nx;
                    cy = ny;
                    created++;
                } else {
                    // If we hit an existing room, we might stop this segment or just skip
                    // Let's stop to avoid weird overlaps, effectively "connecting" to that room
                    cx = nx;
                    cy = ny;
                    break;
                }
            }
        }

        console.log(`[DungeonService] Generated ${created} rooms.`);

        // Add Exit Portal in a room far from start
        // Simple heuristic: furthest Manhattan distance
        let furthestNode = nodes[0];
        let maxDist = 0;

        for (const node of nodes) {
            const dist = Math.abs(node.x - this.DUNGEON_OFFSET_X) + Math.abs(node.y - this.DUNGEON_OFFSET_Y);
            if (dist > maxDist) {
                maxDist = dist;
                furthestNode = node;
            }
        }

        const exitRoom = WorldQuery.findRoomAt(this.engine, furthestNode.x, furthestNode.y);
        if (exitRoom) {
            const portal = new Entity();
            portal.addComponent(new Position(furthestNode.x, furthestNode.y));
            portal.addComponent(new Description("Reality Rift", "<terminal>A BLINDING TEAR IN REALITY</terminal> revealing the stable world beyond."));
            portal.addComponent(new Portal('room', 'plaza'));
            this.engine.addEntity(portal);

            // Boss spawn
            // this.spawnEnemy(furthestNode.x, furthestNode.y, 3);
        }
    }

    private createRoom(x: number, y: number, isEntry: boolean) {
        const room = new Entity();
        room.addComponent(new IsRoom());
        room.addComponent(new Position(x, y));

        const flavor = this.generateRoomFlavor(isEntry);
        room.addComponent(new Description(flavor.title, flavor.desc));
        room.addComponent(new Atmosphere("Glitch-Fog", "Strobe", "Erratic"));

        this.engine.addEntity(room);

        if (!isEntry) {
            // Chance to spawn enemy
            /*
            if (Math.random() < 0.6) {
                this.spawnEnemy(x, y);
            }
            */
        }
    }

    private generateRoomFlavor(isEntry: boolean): { title: string, desc: string } {
        if (isEntry) {
            return {
                title: "Glitch Zone Entry",
                desc: "The floor here is a wireframe grid floating in a void. Code fragments drift like snow."
            };
        }

        const prefixes = ["Corrupted", "Fragmented", "Null", "Static", "Neon", "Digital"];
        const nouns = ["Sector", "Cache", "Node", "Buffer", "Archive", "Nexus"];
        const title = `${prefixes[Math.floor(Math.random() * prefixes.length)]} ${nouns[Math.floor(Math.random() * nouns.length)]}`;

        const descs = [
            "Walls of scrolling hex-code pulse with a sickly green light.",
            "The geometry here is non-Euclidean, shifting when you look away.",
            "Floating monoliths of black data block your path.",
            "The air tastes like copper and ozone. Static electricity crackles.",
            "Ghostly echoes of deleted files whisper from the shadows."
        ];

        return {
            title: title,
            desc: descs[Math.floor(Math.random() * descs.length)]
        };
    }

    private spawnEnemy(x: number, y: number, minTier: number = 1) {
        if (this.enemies.length === 0) return;

        // Filter by tier (simple logic: random enemy that meets minTier)
        // Actually, let's just pick random for now, maybe weight by tier later
        const enemyDef = this.enemies[Math.floor(Math.random() * this.enemies.length)];

        const entity = new Entity();
        entity.addComponent(new NPC(
            enemyDef.name,
            ["...buffer overflow...", "010101", "kill -9"],
            enemyDef.description,
            true, // canMove
            'glitch_enemy',
            true // isAggressive
        ));
        entity.addComponent(new Position(x, y));

        // Map Stats
        const hp = enemyDef.stats.hp;
        const atk = enemyDef.stats.atk;
        const def = enemyDef.stats.def;
        entity.addComponent(new CombatStats(hp, atk, def));
        entity.addComponent(new Stats()); // Base stats

        // Visuals
        entity.addComponent(new Visuals(
            enemyDef.visuals.char,
            enemyDef.visuals.color,
            enemyDef.visuals.glitch_rate
        ));

        this.engine.addEntity(entity);
    }

    public markVisited(playerId: string, x: number, y: number) {
        if (!this.visitedRooms.has(playerId)) {
            this.visitedRooms.set(playerId, new Set());
        }
        this.visitedRooms.get(playerId)!.add(`${x},${y}`);
    }

    public isVisited(playerId: string, x: number, y: number): boolean {
        // If not in dungeon range, always visited (main world)
        if (x < this.DUNGEON_OFFSET_X) return true;

        return this.visitedRooms.get(playerId)?.has(`${x},${y}`) || false;
    }
}
