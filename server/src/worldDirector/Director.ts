import { Server, Socket } from 'socket.io';
import { Logger } from '../utils/Logger';
import { GuardrailService } from '../services/GuardrailService';
import { SnapshotService } from '../services/SnapshotService';
import { PublisherService } from '../services/PublisherService';
import { NPCGenerator } from '../generation/generators/NPCGenerator';
import { ItemGenerator } from '../generation/generators/ItemGenerator';
import { QuestGenerator } from '../generation/generators/QuestGenerator';
import { RoomGenerator } from '../generation/generators/RoomGenerator';
import { LLMService } from '../generation/llm/LLMService';
import { ProposalStatus, ProposalType } from '../generation/proposals/schemas';
import { ItemRegistry } from '../services/ItemRegistry';
import { NPCRegistry } from '../services/NPCRegistry';
import { RoomRegistry } from '../services/RoomRegistry';
import { PrefabFactory } from '../factories/PrefabFactory';
import { Engine } from '../ecs/Engine';
import { ChunkSystem } from '../world/ChunkSystem';

export enum DirectorLogLevel {
    INFO = 'info',
    WARN = 'warn',
    ERROR = 'error',
    SUCCESS = 'success'
}

export interface DirectorLogEntry {
    timestamp: number;
    level: DirectorLogLevel;
    message: string;
    context?: any;
}

export class WorldDirector {
    private io: Server;
    private adminNamespace: any;
    private guardrails: GuardrailService;
    private snapshots: SnapshotService;
    private publisher: PublisherService;
    private llm: LLMService;

    // Generators
    private npcGen: NPCGenerator;
    private itemGen: ItemGenerator;
    private questGen: QuestGenerator;
    private roomGen: RoomGenerator;

    private engine: Engine;
    private chunkSystem: ChunkSystem;
    private automationInterval: NodeJS.Timeout | null = null;

    private isPaused: boolean = true; // Start paused for safety
    private logs: DirectorLogEntry[] = [];
    private proposals: any[] = []; // Pending content proposals
    private personality = {
        chaos: { value: 0.2, enabled: true },
        aggression: { value: 0.3, enabled: true },
        expansion: { value: 0.1, enabled: true }
    };

    constructor(io: Server, guardrails: GuardrailService, snapshots: SnapshotService, publisher: PublisherService, engine: Engine) {
        this.io = io;
        this.guardrails = guardrails;
        this.snapshots = snapshots;
        this.publisher = publisher;
        this.engine = engine;
        this.chunkSystem = new ChunkSystem(engine);
        this.llm = new LLMService(guardrails.getConfig().llmProfiles);
        this.adminNamespace = io.of('/admin');

        // Initialize Generators
        this.npcGen = new NPCGenerator();
        this.itemGen = new ItemGenerator();
        this.questGen = new QuestGenerator();
        this.roomGen = new RoomGenerator();

        this.setupAdminSocket();

        // Listen for config changes (manual file edits)
        this.guardrails.onUpdate((config) => {
            this.llm.updateConfig(config.llmProfiles);
            this.log(DirectorLogLevel.INFO, 'LLM Profiles re-synced from disk.');
            this.adminNamespace.emit('director:status', this.getStatus());
        });

        this.log(DirectorLogLevel.INFO, 'World Director initialized and standby.');

        // Start the automation loop (it will respect isPaused)
        this.startAutomationLoop();
    }

    private startAutomationLoop() {
    }

    private setupAdminSocket() {
        this.adminNamespace.on('connection', (socket: Socket) => {
            Logger.info('Director', `Admin connected: ${socket.id}`);

            // Send current state
            socket.emit('director:status', this.getStatus());

            // Send recent logs
            this.logs.slice(-50).forEach(log => socket.emit('director:log', log));

            socket.on('director:pause', () => this.pause());
            socket.on('director:resume', () => this.resume());

            socket.on('director:update_personality', (update: any) => {
                if (update.chaos !== undefined) this.personality.chaos = { ...this.personality.chaos, ...update.chaos };
                if (update.aggression !== undefined) this.personality.aggression = { ...this.personality.aggression, ...update.aggression };
                if (update.expansion !== undefined) this.personality.expansion = { ...this.personality.expansion, ...update.expansion };

                this.log(DirectorLogLevel.INFO, `Personality updated: ${JSON.stringify(this.personality)}`);
                this.adminNamespace.emit('director:status', this.getStatus());
            });

            socket.on('director:update_guardrail', (update: any) => {
                const config = this.guardrails.getConfig();
                if (update.requireHumanApproval !== undefined) config.features.requireHumanApproval = update.requireHumanApproval;
                if (update.autoSnapshotHighRisk !== undefined) config.features.autoSnapshotHighRisk = update.autoSnapshotHighRisk;
                if (update.enableNPCs !== undefined) config.features.enableNPCs = update.enableNPCs;
                if (update.enableItems !== undefined) config.features.enableItems = update.enableItems;
                if (update.enableQuests !== undefined) config.features.enableQuests = update.enableQuests;
                if (update.enableExpansions !== undefined) config.features.enableExpansions = update.enableExpansions;
                if (update.restrictedToGlitchArea !== undefined) config.features.restrictedToGlitchArea = update.restrictedToGlitchArea;

                if (update.budgets !== undefined) {
                    config.budgets = { ...config.budgets, ...update.budgets };
                }
                if (update.llmProfiles !== undefined) {
                    config.llmProfiles = update.llmProfiles;
                    this.llm.updateConfig(config.llmProfiles);
                }
                this.guardrails.saveConfig(config);
                this.log(DirectorLogLevel.INFO, `Guardrails updated: ${JSON.stringify(update)}`);
                this.adminNamespace.emit('director:status', this.getStatus());
            });

            socket.on('director:approve_proposal', async (id: string) => {
                const proposal = this.proposals.find(p => p.id === id);
                if (proposal) {
                    try {
                        proposal.status = ProposalStatus.APPROVED;
                        const filePath = await this.publisher.publish(proposal);
                        this.log(DirectorLogLevel.SUCCESS, `Proposal PUBLISHED: ${proposal.type} -> ${filePath}`);

                        // Trigger registry reloads
                        if (proposal.type === ProposalType.ITEM) {
                            ItemRegistry.getInstance().reloadGeneratedItems();
                        } else if (proposal.type === ProposalType.NPC) {
                            NPCRegistry.getInstance().reloadGeneratedNPCs();
                        } else if (proposal.type === ProposalType.WORLD_EXPANSION) {
                            RoomRegistry.getInstance().reloadGeneratedRooms();
                            // Spawn the new room immediately
                            const roomEntity = PrefabFactory.createRoom(proposal.payload.id);
                            if (roomEntity) {
                                this.engine.addEntity(roomEntity);
                                this.log(DirectorLogLevel.SUCCESS, `Spawned new room: ${proposal.payload.name}`);
                            }
                        }

                        // Broadcast global autocomplete update
                        this.io.emit('autocomplete-data', {
                            spawnables: [...PrefabFactory.getSpawnableItems(), ...PrefabFactory.getSpawnableNPCs()],
                            stats: ['STR', 'CON', 'AGI', 'CHA', 'HP', 'MAXHP', 'ATTACK', 'DEFENSE'],
                            skills: [
                                'Hacking',
                                'Stealth',
                                'Marksmanship (Light)',
                                'Marksmanship (Medium)',
                                'Marksmanship (Heavy)'
                            ]
                        });

                        this.proposals = this.proposals.filter(p => p.id !== id);
                        this.adminNamespace.emit('director:proposals_update', this.proposals);
                    } catch (err) {
                        this.log(DirectorLogLevel.ERROR, `Failed to publish proposal: ${err}`);
                    }
                }
            });

            socket.on('director:reject_proposal', (id: string) => {
                this.log(DirectorLogLevel.WARN, `Proposal REJECTED: ${id}`);
                this.proposals = this.proposals.filter(p => p.id !== id);
                this.adminNamespace.emit('director:proposals_update', this.proposals);
            });

            socket.on('director:manual_trigger', async (data: { type: string }) => {
                this.log(DirectorLogLevel.INFO, `Manual trigger received: ${data.type}`);

                let proposal;
                const config = this.guardrails.getConfig();

                switch (data.type) {
                    case 'NPC':
                        proposal = await this.npcGen.generate(config, this.llm, { generatedBy: 'Manual' });
                        break;
                    case 'MOB':
                        proposal = await this.npcGen.generate(config, this.llm, { generatedBy: 'Manual', subtype: 'MOB' });
                        break;
                    case 'ITEM':
                        proposal = await this.itemGen.generate(config, this.llm, { generatedBy: 'Manual' });
                        break;
                    case 'QUEST':
                        proposal = await this.questGen.generate(config, this.llm, { generatedBy: 'Manual' });
                        break;
                    case 'WORLD_EXPANSION':
                        proposal = await this.roomGen.generate(config, this.llm, { generatedBy: 'Manual' });
                        break;
                    default:
                        this.log(DirectorLogLevel.WARN, `Generator for ${data.type} not yet implemented.`);
                        return;
                }

                if (proposal) {
                    this.proposals.push(proposal);
                    this.log(DirectorLogLevel.INFO, `Draft created: ${proposal.type} - ${proposal.id}`);
                    this.adminNamespace.emit('director:proposals_update', this.proposals);
                }
            });

            socket.on('director:get_chunks', () => {
                const chunks = this.chunkSystem.getGeneratedChunks();
                this.log(DirectorLogLevel.INFO, `Sending chunks update: ${chunks.length} chunks`, chunks);
                socket.emit('director:chunks_update', chunks);
            });

            socket.on('director:generate_chunk', async (data: { x: number, y: number }) => {
                this.log(DirectorLogLevel.INFO, `Manual Chunk Generation requested for (${data.x}, ${data.y})`);
                await this.generateChunk(data.x, data.y);
                socket.emit('director:chunks_update', this.chunkSystem.getGeneratedChunks());
            });

            socket.on('director:delete_chunk', (data: { x: number, y: number }) => {
                this.log(DirectorLogLevel.INFO, `Chunk deletion requested for (${data.x}, ${data.y})`);
                if (this.chunkSystem.deleteChunk(data.x, data.y)) {
                    this.log(DirectorLogLevel.SUCCESS, `Chunk (${data.x}, ${data.y}) deleted.`);
                    this.adminNamespace.emit('director:chunks_update', this.chunkSystem.getGeneratedChunks());

                    // Also reload room registry to remove deleted rooms from memory
                    RoomRegistry.getInstance().reloadGeneratedRooms();
                } else {
                    this.log(DirectorLogLevel.ERROR, `Failed to delete chunk (${data.x}, ${data.y}) (not found or error).`);
                }
            });

            // Item & NPC Management
            socket.on('director:get_items', () => {
                const items = ItemRegistry.getInstance().getAllItems();
                // Filter duplicates (since registry stores by id, name, shortName)
                const uniqueItems = Array.from(new Map(items.map(item => [item.id, item])).values());
                socket.emit('director:items_update', uniqueItems);
            });

            socket.on('director:delete_item', (id: string) => {
                if (ItemRegistry.getInstance().deleteItem(id)) {
                    this.log(DirectorLogLevel.SUCCESS, `Deleted item: ${id}`);
                    const items = ItemRegistry.getInstance().getAllItems();
                    const uniqueItems = Array.from(new Map(items.map(item => [item.id, item])).values());
                    this.adminNamespace.emit('director:items_update', uniqueItems);
                } else {
                    this.log(DirectorLogLevel.ERROR, `Failed to delete item: ${id}`);
                }
            });

            socket.on('director:update_item', (data: { id: string, updates: any }) => {
                if (ItemRegistry.getInstance().updateItem(data.id, data.updates)) {
                    this.log(DirectorLogLevel.SUCCESS, `Updated item: ${data.id}`);
                    const items = ItemRegistry.getInstance().getAllItems();
                    const uniqueItems = Array.from(new Map(items.map(item => [item.id, item])).values());
                    this.adminNamespace.emit('director:items_update', uniqueItems);
                } else {
                    this.log(DirectorLogLevel.ERROR, `Failed to update item: ${data.id}`);
                }
            });

            socket.on('director:get_npcs', () => {
                const npcs = NPCRegistry.getInstance().getAllNPCs();
                const uniqueNPCs = Array.from(new Map(npcs.map(npc => [npc.id, npc])).values());
                socket.emit('director:npcs_update', uniqueNPCs);
            });

            socket.on('director:delete_npc', (id: string) => {
                if (NPCRegistry.getInstance().deleteNPC(id)) {
                    this.log(DirectorLogLevel.SUCCESS, `Deleted NPC: ${id}`);
                    const npcs = NPCRegistry.getInstance().getAllNPCs();
                    const uniqueNPCs = Array.from(new Map(npcs.map(npc => [npc.id, npc])).values());
                    this.adminNamespace.emit('director:npcs_update', uniqueNPCs);
                } else {
                    this.log(DirectorLogLevel.ERROR, `Failed to delete NPC: ${id}`);
                }
            });

            socket.on('director:update_npc', (data: { id: string, updates: any }) => {
                if (NPCRegistry.getInstance().updateNPC(data.id, data.updates)) {
                    this.log(DirectorLogLevel.SUCCESS, `Updated NPC: ${data.id}`);
                    const npcs = NPCRegistry.getInstance().getAllNPCs();
                    const uniqueNPCs = Array.from(new Map(npcs.map(npc => [npc.id, npc])).values());
                    this.adminNamespace.emit('director:npcs_update', uniqueNPCs);
                } else {
                    this.log(DirectorLogLevel.ERROR, `Failed to update NPC: ${data.id}`);
                }
            });

            // Snapshot Handlers
            socket.on('snapshot:list', async () => {
                const snapshots = await this.snapshots.listSnapshots();
                socket.emit('snapshot:list_update', snapshots);
            });

            socket.on('snapshot:create', async (name: string) => {
                try {
                    const id = await this.snapshots.createSnapshot(name || 'manual');
                    this.log(DirectorLogLevel.SUCCESS, `Snapshot created: ${id}`);
                    const snapshots = await this.snapshots.listSnapshots();
                    this.adminNamespace.emit('snapshot:list_update', snapshots);
                } catch (err) {
                    this.log(DirectorLogLevel.ERROR, `Failed to create snapshot: ${err}`);
                }
            });

            socket.on('snapshot:restore', async (id: string) => {
                try {
                    await this.snapshots.restoreSnapshot(id);
                    this.log(DirectorLogLevel.SUCCESS, `World restored to snapshot: ${id}`);
                    // After restore, we should probably pause the director if it was running
                    if (!this.isPaused) await this.pause();
                } catch (err) {
                    this.log(DirectorLogLevel.ERROR, `Failed to restore snapshot: ${err}`);
                }
            });

            socket.on('snapshot:delete', async (id: string) => {
                try {
                    await this.snapshots.deleteSnapshot(id);
                    this.log(DirectorLogLevel.INFO, `Snapshot deleted: ${id}`);
                    const snapshots = await this.snapshots.listSnapshots();
                    this.adminNamespace.emit('snapshot:list_update', snapshots);
                } catch (err) {
                    this.log(DirectorLogLevel.ERROR, `Failed to delete snapshot: ${err}`);
                }
            });

            socket.on('disconnect', () => {
                Logger.info('Director', `Admin disconnected: ${socket.id}`);
            });
        });
    }

    public log(level: DirectorLogLevel, message: string, context?: any) {
        const entry: DirectorLogEntry = {
            timestamp: Date.now(),
            level,
            message,
            context
        };
        this.logs.push(entry);
        if (this.logs.length > 1000) this.logs.shift();

        this.adminNamespace.emit('director:log', entry);
        Logger.info('Director', `[${level.toUpperCase()}] ${message}`);
    }

    public async pause() {
        if (this.isPaused) return;
        this.isPaused = true;
        this.log(DirectorLogLevel.WARN, 'Automation HALTED by Admin.');
        this.adminNamespace.emit('director:status', this.getStatus());
    }

    public async resume() {
        if (!this.isPaused) return;

        this.log(DirectorLogLevel.INFO, 'Resuming automation...');

        // Auto-snapshot before starting if configured
        if (this.guardrails.getConfig().features.autoSnapshotHighRisk) {
            try {
                this.log(DirectorLogLevel.INFO, 'Triggering auto-snapshot before resume...');
                const snapId = await this.snapshots.createSnapshot('auto_resume');
                this.log(DirectorLogLevel.SUCCESS, `Auto-snapshot created: ${snapId}`);
            } catch (err) {
                this.log(DirectorLogLevel.ERROR, 'Auto-snapshot failed! Aborting resume.', err);
                return;
            }
        }

        this.isPaused = false;
        this.log(DirectorLogLevel.SUCCESS, 'Automation ACTIVE.');
        this.adminNamespace.emit('director:status', this.getStatus());
    }

    public getStatus() {
        return {
            paused: this.isPaused,
            logCount: this.logs.length,
            personality: this.personality,
            guardrails: this.guardrails.getConfig(),
            proposals: this.proposals
        };
    }

    private async generateChunk(cx: number, cy: number) {
        if (this.chunkSystem.isChunkGenerated(cx, cy)) {
            this.log(DirectorLogLevel.WARN, `Chunk (${cx}, ${cy}) already generated.`);
            return;
        }

        this.chunkSystem.markChunkGenerated(cx, cy);

        // Generate a simple layout for this chunk
        // 20x20 grid.
        // We will generate a main street cross and some random buildings.
        const CHUNK_SIZE = 20;
        const startX = cx * CHUNK_SIZE;
        const startY = cy * CHUNK_SIZE;

        // 1. Main Streets (Cross)
        for (let i = 0; i < CHUNK_SIZE; i++) {
            // Horizontal Street at Y=10 (relative)
            await this.createAndPublishRoom(startX + i, startY + 10, 'street', 'Neon Highway');

            // Vertical Street at X=10 (relative)
            await this.createAndPublishRoom(startX + 10, startY + i, 'street', 'Neon Highway');
        }

        // 2. Bridge to Hub (0,0) if adjacent
        await this.bridgeToHub(cx, cy);

        // 3. Random Buildings (Empty Shells)
        // Generate 5-10 random buildings
        const numBuildings = 5 + Math.floor(Math.random() * 5);
        for (let i = 0; i < numBuildings; i++) {
            const rx = Math.floor(Math.random() * CHUNK_SIZE);
            const ry = Math.floor(Math.random() * CHUNK_SIZE);

            // Don't overwrite streets (row 10 or col 10)
            if (rx === 10 || ry === 10) continue;

            await this.createAndPublishRoom(startX + rx, startY + ry, 'indoor', 'Empty Structure');
        }

        this.log(DirectorLogLevel.SUCCESS, `Chunk (${cx}, ${cy}) generated with basic layout.`);
    }

    private async bridgeToHub(cx: number, cy: number) {
        // If we are adjacent to (0,0), we need to fill the gap in (0,0)'s roads.
        // (0,0) roads end at index 2 and 17.
        // Gap is at 0,1 and 18,19.

        // Check if we are East of Hub (1, 0)
        if (cx === 1 && cy === 0) {
            this.log(DirectorLogLevel.INFO, "Bridging to Hub (East)...");
            // Fill Hub's East gap (18,10) and (19,10)
            await this.createAndPublishRoom(18, 10, 'street', 'Neon Highway');
            await this.createAndPublishRoom(19, 10, 'street', 'Neon Highway');
        }

        // Check if we are West of Hub (-1, 0)
        if (cx === -1 && cy === 0) {
            this.log(DirectorLogLevel.INFO, "Bridging to Hub (West)...");
            // Fill Hub's West gap (0,10) and (1,10)
            await this.createAndPublishRoom(0, 10, 'street', 'Neon Highway');
            await this.createAndPublishRoom(1, 10, 'street', 'Neon Highway');
        }

        // Check if we are South of Hub (0, 1)
        if (cx === 0 && cy === 1) {
            this.log(DirectorLogLevel.INFO, "Bridging to Hub (South)...");
            // Fill Hub's South gap (10,18) and (10,19)
            await this.createAndPublishRoom(10, 18, 'street', 'Neon Highway');
            await this.createAndPublishRoom(10, 19, 'street', 'Neon Highway');
        }

        // Check if we are North of Hub (0, -1)
        if (cx === 0 && cy === -1) {
            this.log(DirectorLogLevel.INFO, "Bridging to Hub (North)...");
            // Fill Hub's North gap (10,0) and (10,1)
            await this.createAndPublishRoom(10, 0, 'street', 'Neon Highway');
            await this.createAndPublishRoom(10, 1, 'street', 'Neon Highway');
        }
    }

    private async createAndPublishRoom(x: number, y: number, type: string, namePrefix: string) {
        // Create a proposal directly to reuse the publishing logic, but skip validation/approval for speed
        // Actually, we can just use RoomGenerator to make the proposal, then immediately publish it.

        const proposal = await this.roomGen.generate(
            this.guardrails.getConfig(),
            undefined, // No LLM for speed
            { x, y, generatedBy: 'Director:ManualChunk' }
        );

        // Override with basic info
        (proposal.payload as any).name = `${namePrefix} ${x},${y}`;
        (proposal.payload as any).description = "A placeholder location waiting for development.";
        (proposal.payload as any).type = type as any;

        // Force Approve
        proposal.status = ProposalStatus.APPROVED;

        // Publish
        try {
            await this.publisher.publish(proposal);

            // Reload registry so PrefabFactory can find the new room
            RoomRegistry.getInstance().reloadGeneratedRooms();

            // Spawn
            const roomEntity = PrefabFactory.createRoom(proposal.payload.id);
            if (roomEntity) {
                this.engine.addEntity(roomEntity);
            }
        } catch (err) {
            this.log(DirectorLogLevel.ERROR, `Failed to publish room at ${x},${y}: ${err}`);
        }
    }
}
