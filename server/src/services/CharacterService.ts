import { DatabaseService } from './DatabaseService';
import { Logger } from '../utils/Logger';
import { Entity } from '../ecs/Entity';
import { IEngine } from '../ecs/IEngine';
import { Position } from '../components/Position';
import { Description } from '../components/Description';
import { Stats } from '../components/Stats';
import { CombatStats } from '../components/CombatStats';
import { Inventory } from '../components/Inventory';
import { Credits } from '../components/Credits';
import { Stance, StanceType } from '../components/Stance';
import { Momentum } from '../components/Momentum';
import { CombatBuffer } from '../components/CombatBuffer';
import { PrefabFactory } from '../factories/PrefabFactory';
import { Container } from '../components/Container';
import { Item } from '../components/Item';
import { Weapon } from '../components/Weapon';
import { Armor } from '../components/Armor';
import { ComponentRegistry } from '../ecs/ComponentRegistry';
import { Reputation } from '../components/Reputation';
import { Heat } from '../components/Heat';
import { Humanity } from '../components/Humanity';
import { NPC } from '../components/NPC';


export interface Archetype {
    name: string;
    description: string;
    stats: {
        STR: number;
        CON: number;
        AGI: number;
        CHA: number;
    };
    startingItems: string[];
}

export const ARCHETYPES: Record<string, Archetype> = {
    'street_samurai': {
        name: 'Street Samurai',
        description: 'A master of chrome and steel. High physical prowess and combat readiness.',
        stats: { STR: 14, CON: 12, AGI: 14, CHA: 6 },
        startingItems: ['katana', 'tactical_vest', 'stimpack']
    },
    'netrunner': {
        name: 'Netrunner',
        description: 'A ghost in the machine. Exceptional intelligence and perception for digital warfare.',
        stats: { STR: 6, CON: 8, AGI: 10, CHA: 8 },
        startingItems: ['neural_deck', 'data_chip', 'medkit']
    },
    'gutter_punk': {
        name: 'Gutter Punk',
        description: 'A survivor of the sprawl. High constitution and street-smarts.',
        stats: { STR: 10, CON: 16, AGI: 10, CHA: 12 },
        startingItems: ['combat_knife', 'backpack', 'bandage', 'bandage']
    }
};

export class CharacterService {
    private static instance: CharacterService;
    private db = DatabaseService.getInstance().getDb();

    private constructor() { }

    private activeCharacters: Map<string, any> = new Map();

    public static getInstance(): CharacterService {
        if (!CharacterService.instance) {
            CharacterService.instance = new CharacterService();
        }
        return CharacterService.instance;
    }

    public async createCharacter(userId: number, name: string, archetypeKey: string): Promise<{ success: boolean; message: string }> {
        try {
            const archetype = ARCHETYPES[archetypeKey];
            if (!archetype) return { success: false, message: 'Invalid archetype' };

            // Check if name exists
            const existing = this.db.prepare('SELECT id FROM characters WHERE name = ?').get(name);
            if (existing) return { success: false, message: 'Character name already taken' };

            // Initial data structure (will be populated during first save)
            const initialData = JSON.stringify({
                archetype: archetypeKey,
                components: {}
            });

            const stmt = this.db.prepare('INSERT INTO characters (user_id, name, archetype, data) VALUES (?, ?, ?, ?)');
            stmt.run(userId, name, archetypeKey, initialData);

            return { success: true, message: 'Character created successfully' };
        } catch (error) {
            Logger.error('Character', 'Creation error', error);
            return { success: false, message: 'Internal server error' };
        }
    }

    public getCharacterByUserId(userId: number) {
        return this.db.prepare('SELECT * FROM characters WHERE user_id = ?').get(userId) as any;
    }

    public getAllCharacters() {
        return this.db.prepare('SELECT * FROM characters').all() as any[];
    }

    public getCharacterById(id: number) {
        return this.db.prepare('SELECT * FROM characters WHERE id = ?').get(id) as any;
    }

    public getCharacterBySocketId(socketId: string) {
        return this.activeCharacters.get(socketId);
    }

    public removeCharacter(socketId: string) {
        this.activeCharacters.delete(socketId);
    }

    public isPlayer(socketId: string): boolean {
        return this.activeCharacters.has(socketId);
    }

    public getActiveEntityByCharId(charId: number, engine: IEngine): Entity | undefined {
        for (const [socketId, data] of this.activeCharacters.entries()) {
            if (data.id === charId) {
                const entity = engine.getEntity(socketId);
                if (entity) return entity;
            }
        }
        return undefined;
    }

    public updateNPCTargets(oldId: string, newId: string, engine: IEngine) {
        const npcs = engine.getEntitiesWithComponent(NPC);
        npcs.forEach(npc => {
            const stats = npc.getComponent(CombatStats);
            if (stats && stats.targetId === oldId) {
                stats.targetId = newId;
                Logger.info('Character', `Updated NPC ${npc.id} target from ${oldId} to ${newId}`);
            }
        });
    }

    public saveCharacter(characterId: number, data: any) {
        const stmt = this.db.prepare('UPDATE characters SET data = ?, last_seen = CURRENT_TIMESTAMP WHERE id = ?');
        stmt.run(JSON.stringify(data), characterId);
    }

    public instantiateCharacter(charData: any, socketId: string, engine: IEngine): Entity {
        this.activeCharacters.set(socketId, charData);
        const player = new Entity(socketId);
        const archetype = ARCHETYPES[charData.archetype];

        // Ensure ComponentRegistry is initialized
        ComponentRegistry.init();

        const savedData = JSON.parse(charData.data);

        if (savedData.components && Object.keys(savedData.components).length > 0) {
            // Deserialize components
            Object.entries(savedData.components).forEach(([type, data]: [string, any]) => {
                const componentClass = ComponentRegistry.get(type);
                if (componentClass) {
                    const component = new componentClass();
                    component.fromJSON(data);
                    player.addComponent(component);
                } else {
                    Logger.warn('Character', `Unknown component type during instantiation: ${type}`);
                }
            });

            // Ensure Description has the correct name (in case it was changed or missing)
            player.addComponent(new Description(charData.name, `A ${archetype.name} in the sprawl.`));

            // Ensure essential components exist if they weren't in saved data
            if (!player.hasComponent(Position)) player.addComponent(new Position(10, 10));
            if (!player.hasComponent(Stats)) this.initializeStats(player, archetype);
            if (!player.hasComponent(Reputation)) player.addComponent(new Reputation());
            if (!player.hasComponent(Heat)) player.addComponent(new Heat());
            if (!player.hasComponent(Humanity)) player.addComponent(new Humanity());
        } else {
            // New character or first login
            player.addComponent(new Description(charData.name, `A ${archetype.name} in the sprawl.`));
            this.initializeFromArchetype(player, charData.name, archetype, engine);
        }

        engine.addEntity(player);
        return player;
    }

    private initializeStats(player: Entity, archetype: Archetype) {
        const stats = new Stats();
        Object.entries(archetype.stats).forEach(([key, value]) => {
            stats.attributes.set(key, { name: key, value });
        });
        player.addComponent(stats);
    }

    private initializeFromArchetype(player: Entity, name: string, archetype: Archetype, engine: IEngine) {
        player.addComponent(new Position(10, 10));

        const stats = new Stats();
        Object.entries(archetype.stats).forEach(([key, value]) => {
            stats.attributes.set(key, { name: key, value });
        });
        player.addComponent(stats);

        player.addComponent(new CombatStats(100, 10, 5, false));
        player.addComponent(new CombatBuffer(3));
        player.addComponent(new Stance(StanceType.Standing));
        player.addComponent(new Momentum());
        player.addComponent(new Credits(500, 0));
        player.addComponent(new Reputation());
        player.addComponent(new Heat());
        player.addComponent(new Humanity());

        const inventory = new Inventory();
        player.addComponent(inventory);

        // Base starting gear for ALL characters
        const baseGear = [
            'backpack', // Create backpack first
            'katana',
            'pistol_9mm',
            'mag_pistol_9mm',
            'ammo_9mm_loose',
            'tactical shirt', // Matches DB name
            'cargo pants',    // Matches DB name
            'neural_deck'     // Matches DB ID
        ];

        const allStartingItems = [...new Set([...baseGear, ...archetype.startingItems])];

        allStartingItems.forEach(itemId => {
            const itemEntity = PrefabFactory.createItem(itemId);
            if (itemEntity) {
                Logger.info('Character', `Created starting item ${itemId} for ${name}`);
                engine.addEntity(itemEntity);

                const weapon = itemEntity.getComponent(Weapon);
                const armor = itemEntity.getComponent(Armor);
                const item = itemEntity.getComponent(Item);

                if (itemId === 'backpack') {
                    inventory.equipment.set('back', itemEntity.id);
                } else if (weapon) {
                    if (!inventory.rightHand) {
                        inventory.rightHand = itemEntity.id;
                    } else if (!inventory.leftHand) {
                        inventory.leftHand = itemEntity.id;
                    } else {
                        // Put in backpack if possible
                        const backpackId = inventory.equipment.get('back');
                        const backpack = backpackId ? engine.getEntity(backpackId) : null;
                        const container = backpack?.getComponent(Container);
                        if (container) {
                            container.items.push(itemEntity.id);
                        } else {
                            inventory.equipment.set(`stored_${itemEntity.id}`, itemEntity.id);
                        }
                    }
                } else if (armor && item?.slot) {
                    inventory.equipment.set(item.slot, itemEntity.id);
                } else {
                    // Put in backpack if possible
                    const backpackId = inventory.equipment.get('back');
                    const backpack = backpackId ? engine.getEntity(backpackId) : null;
                    const container = backpack?.getComponent(Container);
                    if (container) {
                        container.items.push(itemEntity.id);
                    } else {
                        inventory.equipment.set(`item_${itemEntity.id}`, itemEntity.id);
                    }
                }
            }
        });
    }
}
