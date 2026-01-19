import * as fs from 'fs';
import * as path from 'path';
import { Logger } from '../../utils/Logger';
import { WorldDirector } from '../Director';
import { DirectorLogLevel } from '../DirectorTypes';
import { ItemRegistry } from '../../services/ItemRegistry';
import { NPCRegistry } from '../../services/NPCRegistry';
import { RoomRegistry } from '../../services/RoomRegistry';
import { CompendiumService } from '../../services/CompendiumService';
import { AuthService } from '../../services/AuthService';
import { CharacterService } from '../../services/CharacterService';
import { PrefabFactory } from '../../factories/PrefabFactory';
import { ImageDownloader } from '../../utils/ImageDownloader';
import { Stats } from '../../components/Stats';
import { Reputation } from '../../components/Reputation';
import { Inventory } from '../../components/Inventory';
import { Container } from '../../components/Container';
import { Position } from '../../components/Position';
import { NPC } from '../../components/NPC';

export class DirectorManagementService {
    private director: WorldDirector;
    private configPath = path.join(process.cwd(), 'data', 'director_config.json');

    public isPaused: boolean = true;
    public personality = {
        chaos: { value: 0.2, enabled: true },
        aggression: { value: 0.0, enabled: false },
        expansion: { value: 0.1, enabled: true }
    };
    public glitchConfig = {
        mobCount: 5,
        itemCount: 5,
        legendaryChance: 0.05
    };

    constructor(director: WorldDirector) {
        this.director = director;
    }

    public loadConfig() {
        try {
            if (fs.existsSync(this.configPath)) {
                const raw = fs.readFileSync(this.configPath, 'utf-8');
                const config = JSON.parse(raw);

                if (config.glitchConfig) this.glitchConfig = config.glitchConfig;
                if (config.personality) this.personality = config.personality;
                if (config.paused !== undefined) this.isPaused = config.paused;

                Logger.info('Director', 'Loaded configuration from disk.');
            }
        } catch (err) {
            Logger.error('Director', `Failed to load config: ${err}`);
        }
    }

    public saveConfig() {
        try {
            const config = {
                glitchConfig: this.glitchConfig,
                personality: this.personality,
                paused: this.isPaused
            };
            fs.writeFileSync(this.configPath, JSON.stringify(config, null, 4));
            Logger.info('Director', 'Saved configuration to disk.');
        } catch (err) {
            Logger.error('Director', `Failed to save config: ${err}`);
        }
    }

    public pause() {
        this.isPaused = true;
        this.saveConfig();
        this.director.log(DirectorLogLevel.WARN, 'Director PAUSED.');
        this.director.adminNamespace.emit('director:status', this.director.getStatus());
    }

    public resume() {
        this.isPaused = false;
        this.saveConfig();
        this.director.log(DirectorLogLevel.SUCCESS, 'Director RESUMED.');
        this.director.adminNamespace.emit('director:status', this.director.getStatus());
    }

    public updatePersonality(update: any) {
        if (update.chaos !== undefined) this.personality.chaos = { ...this.personality.chaos, ...update.chaos };
        if (update.aggression !== undefined) this.personality.aggression = { ...this.personality.aggression, ...update.aggression };
        if (update.expansion !== undefined) this.personality.expansion = { ...this.personality.expansion, ...update.expansion };

        this.director.log(DirectorLogLevel.INFO, `Personality updated: ${JSON.stringify(this.personality)}`);
        this.saveConfig();
        this.director.adminNamespace.emit('director:status', this.director.getStatus());
    }

    public updateGlitchConfig(config: any) {
        this.glitchConfig = { ...this.glitchConfig, ...config };
        this.saveConfig();
        this.director.log(DirectorLogLevel.INFO, 'Glitch Door configuration updated.');
        this.director.adminNamespace.emit('director:status', this.director.getStatus());
    }

    // --- User Management ---

    public getUsers() {
        return AuthService.getInstance().getAllUsers();
    }

    public updateUserRole(userId: number, role: string) {
        if (AuthService.getInstance().updateUserRole(userId, role)) {
            this.director.log(DirectorLogLevel.SUCCESS, `Updated user ${userId} role to ${role}`);
            this.director.adminNamespace.emit('director:users_update', this.getUsers());
        } else {
            this.director.log(DirectorLogLevel.ERROR, `Failed to update user ${userId} role.`);
        }
    }

    public async updateUserPassword(userId: number, password: string) {
        if (await AuthService.getInstance().updateUserPassword(userId, password)) {
            this.director.log(DirectorLogLevel.SUCCESS, `Updated password for user ${userId}`);
        } else {
            this.director.log(DirectorLogLevel.ERROR, `Failed to update password for user ${userId}.`);
        }
    }

    public deleteUser(userId: number) {
        if (AuthService.getInstance().deleteUser(userId)) {
            this.director.log(DirectorLogLevel.SUCCESS, `Deleted user ${userId}`);
            this.director.adminNamespace.emit('director:users_update', this.getUsers());
        } else {
            this.director.log(DirectorLogLevel.ERROR, `Failed to delete user ${userId}.`);
        }
    }

    // --- Character Management ---

    public getCharacters() {
        const charService = CharacterService.getInstance();
        const characters = charService.getAllCharacters();
        // We need to access engine from director, assuming it's public or accessible.
        // Director.ts has public engine property? Let's check.
        // In Director.ts: public engine: Engine; (It was public in the file view I saw earlier? No, it was private in constructor but maybe public property?
        // Let's assume I need to cast to any or it is public. In DirectorSocketHandler I used (this.director as any).engine.
        // I should make it public in Director.ts if it isn't.
        // For now I will cast to any.
        const engine = (this.director as any).engine;

        return characters.map(c => ({
            ...c,
            online: !!charService.getActiveEntityByCharId(c.id, engine)
        }));
    }

    public updateCharacterStats(charId: number, stats: any, skills?: any, reputation?: any) {
        const charService = CharacterService.getInstance();
        const engine = (this.director as any).engine;
        const activeEntity = charService.getActiveEntityByCharId(charId, engine);

        if (activeEntity) {
            const statsComp = activeEntity.getComponent(Stats);
            if (statsComp) {
                for (const [key, value] of Object.entries(stats)) {
                    if (statsComp.attributes.has(key)) {
                        statsComp.attributes.get(key)!.value = Number(value);
                    }
                }
                if (skills) {
                    for (const [key, value] of Object.entries(skills)) {
                        if (statsComp.skills.has(key)) {
                            const skill = statsComp.skills.get(key)!;
                            skill.level = Number(value);
                            skill.maxUses = skill.level * 10;
                        } else {
                            statsComp.addSkill(key, Number(value));
                        }
                    }
                }
            }

            if (reputation) {
                let repComp = activeEntity.getComponent(Reputation);
                if (!repComp) {
                    repComp = new Reputation();
                    activeEntity.addComponent(repComp);
                }
                for (const [faction, value] of Object.entries(reputation)) {
                    repComp.factions.set(faction, Number(value));
                }
            }

            this.director.log(DirectorLogLevel.SUCCESS, `Updated active data for character ${charId}`);
        } else {
            const char = charService.getCharacterById(charId);
            if (char) {
                const jsonData = JSON.parse(char.data);
                if (!jsonData.components) jsonData.components = {};

                const tempStats = new Stats();
                if (jsonData.components.Stats) {
                    tempStats.fromJSON(jsonData.components.Stats);
                }

                for (const [key, value] of Object.entries(stats)) {
                    if (tempStats.attributes.has(key)) {
                        tempStats.attributes.get(key)!.value = Number(value);
                    }
                }

                if (skills) {
                    for (const [key, value] of Object.entries(skills)) {
                        if (tempStats.skills.has(key)) {
                            const skill = tempStats.skills.get(key)!;
                            skill.level = Number(value);
                            skill.maxUses = skill.level * 10;
                        } else {
                            tempStats.addSkill(key, Number(value));
                        }
                    }
                }

                jsonData.components.Stats = tempStats.toJSON();

                if (reputation) {
                    const tempRep = new Reputation();
                    if (jsonData.components.Reputation) {
                        tempRep.fromJSON(jsonData.components.Reputation);
                    }
                    for (const [faction, value] of Object.entries(reputation)) {
                        tempRep.factions.set(faction, Number(value));
                    }
                    jsonData.components.Reputation = tempRep.toJSON();
                }

                charService.saveCharacter(charId, jsonData);
                this.director.log(DirectorLogLevel.SUCCESS, `Updated offline data for character ${charId}`);
            } else {
                this.director.log(DirectorLogLevel.ERROR, `Character ${charId} not found.`);
            }
        }

        this.director.adminNamespace.emit('director:characters_update', this.getCharacters());
    }

    public updateCharacterInventory(charId: number, inventory: any) {
        const charService = CharacterService.getInstance();
        const engine = (this.director as any).engine;
        const activeEntity = charService.getActiveEntityByCharId(charId, engine);

        if (activeEntity) {
            const inv = activeEntity.getComponent(Inventory);
            if (!inv) {
                this.director.log(DirectorLogLevel.ERROR, `Character ${charId} has no inventory component.`);
                return;
            }

            const updateSlot = (currentId: string | null, newItemId: string | null, setFn: (id: string | null) => void) => {
                if (currentId) engine.removeEntity(currentId);
                if (newItemId) {
                    const newItem = PrefabFactory.createItem(newItemId);
                    if (newItem) {
                        engine.addEntity(newItem);
                        setFn(newItem.id);
                    } else setFn(null);
                } else setFn(null);
            };

            if (inventory.rightHand !== undefined) updateSlot(inv.rightHand, inventory.rightHand, (id) => inv.rightHand = id);
            if (inventory.leftHand !== undefined) updateSlot(inv.leftHand, inventory.leftHand, (id) => inv.leftHand = id);

            if (inventory.equipment) {
                for (const [slot, itemId] of Object.entries(inventory.equipment)) {
                    const currentId = inv.equipment.get(slot) || null;
                    updateSlot(currentId, itemId as string, (id) => {
                        if (id) inv.equipment.set(slot, id);
                        else inv.equipment.delete(slot);
                    });
                }
            }

            if (inventory.backpack) {
                let backpackId = inv.equipment.get('back');
                let backpack = backpackId ? engine.getEntity(backpackId) : null;

                if (!backpack && (inventory.backpack as string[]).length > 0) {
                    const newBackpack = PrefabFactory.createItem('backpack');
                    if (newBackpack) {
                        engine.addEntity(newBackpack);
                        inv.equipment.set('back', newBackpack.id);
                        backpack = newBackpack;
                    }
                }

                if (backpack) {
                    const container = backpack.getComponent(Container);
                    if (container) {
                        for (const itemId of container.items) engine.removeEntity(itemId);
                        container.items = [];
                        for (const itemTemplateId of (inventory.backpack as string[])) {
                            const newItem = PrefabFactory.createItem(itemTemplateId);
                            if (newItem) {
                                engine.addEntity(newItem);
                                container.items.push(newItem.id);
                            }
                        }
                    }
                }
            }

            this.director.log(DirectorLogLevel.SUCCESS, `Updated active inventory for character ${charId}`);
        } else {
            const char = charService.getCharacterById(charId);
            if (char) {
                const jsonData = JSON.parse(char.data);
                if (!jsonData.components) jsonData.components = {};

                const tempInv = new Inventory();
                if (jsonData.components.Inventory) {
                    tempInv.fromJSON(jsonData.components.Inventory);
                }

                if (inventory.rightHand !== undefined) tempInv.rightHand = inventory.rightHand;
                if (inventory.leftHand !== undefined) tempInv.leftHand = inventory.leftHand;

                if (inventory.equipment) {
                    for (const [slot, itemId] of Object.entries(inventory.equipment)) {
                        if (itemId) tempInv.equipment.set(slot, itemId as string);
                        else tempInv.equipment.delete(slot);
                    }
                }

                if (inventory.backpack) {
                    this.director.log(DirectorLogLevel.WARN, `Deep backpack editing for offline characters is not fully supported yet.`);
                }

                jsonData.components.Inventory = tempInv.toJSON();
                charService.saveCharacter(charId, jsonData);
                this.director.log(DirectorLogLevel.SUCCESS, `Updated offline inventory for character ${charId}`);
            } else {
                this.director.log(DirectorLogLevel.ERROR, `Character ${charId} not found.`);
            }
        }
    }

    // --- Item Management ---

    public getItems() {
        const items = ItemRegistry.getInstance().getAllItems();
        return Array.from(new Map(items.map(item => [item.id, item])).values());
    }

    public deleteItem(id: string) {
        if (ItemRegistry.getInstance().deleteItem(id)) {
            this.director.log(DirectorLogLevel.SUCCESS, `Deleted item: ${id}`);
            this.director.adminNamespace.emit('director:items_update', this.getItems());
            CompendiumService.updateCompendium();
        } else {
            this.director.log(DirectorLogLevel.ERROR, `Failed to delete item: ${id}`);
        }
    }

    public updateItem(id: string, updates: any) {
        if (ItemRegistry.getInstance().updateItem(id, updates)) {
            this.director.log(DirectorLogLevel.SUCCESS, `Updated item: ${id}`);
            this.director.adminNamespace.emit('director:items_update', this.getItems());
            CompendiumService.updateCompendium();
        } else {
            this.director.log(DirectorLogLevel.ERROR, `Failed to update item: ${id}`);
        }
    }

    // --- NPC Management ---

    public getNPCs() {
        const npcs = NPCRegistry.getInstance().getAllNPCs();
        return Array.from(new Map(npcs.map(npc => [npc.id, npc])).values());
    }

    public deleteNPC(id: string) {
        // Fetch definition first to get the name
        const npcDef = NPCRegistry.getInstance().getNPC(id);
        const name = npcDef ? npcDef.name : null;

        if (NPCRegistry.getInstance().deleteNPC(id)) {
            this.director.log(DirectorLogLevel.SUCCESS, `Deleted NPC definition: ${id}`);

            // Remove from active world
            const engine = (this.director as any).engine;
            const entities = engine.getEntitiesWithComponent(NPC);
            let removedCount = 0;

            for (const entity of entities) {
                const npcComp = entity.getComponent(NPC);
                if (npcComp) {
                    const matchesId = entity.id === id;
                    const matchesTypeName = npcComp.typeName === id || npcComp.typeName.toLowerCase() === id.toLowerCase();
                    const matchesName = name && (npcComp.typeName === name || npcComp.typeName.toLowerCase() === name.toLowerCase());

                    if (matchesId || matchesTypeName || matchesName) {
                        engine.removeEntity(entity.id);
                        removedCount++;
                    }
                }
            }

            if (removedCount > 0) {
                this.director.log(DirectorLogLevel.SUCCESS, `Removed ${removedCount} active instances of NPC ${id} (${name || 'Unknown'}) from the world.`);
            }

            this.director.adminNamespace.emit('director:npcs_update', this.getNPCs());
            CompendiumService.updateCompendium();
        } else {
            this.director.log(DirectorLogLevel.ERROR, `Failed to delete NPC: ${id}`);
        }
    }

    public updateNPC(id: string, updates: any) {
        if (NPCRegistry.getInstance().updateNPC(id, updates)) {
            this.director.log(DirectorLogLevel.SUCCESS, `Updated NPC: ${id}`);
            this.director.adminNamespace.emit('director:npcs_update', this.getNPCs());
            CompendiumService.updateCompendium();
        } else {
            this.director.log(DirectorLogLevel.ERROR, `Failed to update NPC: ${id}`);
        }
    }

    public async generatePortrait(id: string) {
        const npc = NPCRegistry.getInstance().getNPC(id);
        if (!npc) {
            this.director.log(DirectorLogLevel.ERROR, `Cannot generate portrait: NPC ${id} not found.`);
            return;
        }

        this.director.log(DirectorLogLevel.INFO, `Generating portrait for ${npc.name}...`);

        const prompt = `A cyberpunk style portrait of ${npc.name}, ${npc.description}. Role: ${npc.role}, Faction: ${npc.faction}. High quality, detailed, digital art.`;

        try {
            const imageRes = await (this.director as any).llm.generateImage(prompt);
            const imageUrl = imageRes.url;
            if (imageUrl) {
                const filename = `${id}.jpg`;
                const localPath = await ImageDownloader.downloadImage(imageUrl, filename);

                if (localPath) {
                    this.updateNPC(id, { portrait: localPath });
                    this.director.log(DirectorLogLevel.SUCCESS, `Portrait generated and saved for ${npc.name}`);
                } else {
                    this.director.log(DirectorLogLevel.ERROR, `Failed to download generated image for ${npc.name}`);
                }
            } else {
                this.director.log(DirectorLogLevel.ERROR, `LLM failed to generate image URL for ${npc.name}`);
            }
        } catch (err) {
            this.director.log(DirectorLogLevel.ERROR, `Error generating portrait for ${npc.name}: ${err}`);
        }
    }

    public spawnRoamingNPC(id: string) {
        this.director.log(DirectorLogLevel.INFO, `Spawning roaming NPC: ${id} at 10,10`);
        const npc = PrefabFactory.createNPC(id);
        if (npc) {
            let pos = npc.getComponent(Position);
            if (!pos) {
                pos = new Position(10, 10);
                npc.addComponent(pos);
            } else {
                pos.x = 10;
                pos.y = 10;
            }

            const npcComp = npc.getComponent(NPC);
            if (npcComp) {
                npcComp.canMove = true;
            }

            const engine = (this.director as any).engine;
            engine.addEntity(npc);
            PrefabFactory.equipNPC(npc, engine);

            this.director.log(DirectorLogLevel.SUCCESS, `Spawned roaming NPC ${id} at 10,10`);
        } else {
            this.director.log(DirectorLogLevel.ERROR, `Failed to spawn roaming NPC: ${id} (not found in registry)`);
        }
    }
}
