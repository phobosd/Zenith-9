import { Entity } from '../ecs/Entity';
import { Position } from '../components/Position';
import { Item } from '../components/Item';
import { NPC } from '../components/NPC';
import { Terminal } from '../components/Terminal';
import { Description } from '../components/Description';
import { Container } from '../components/Container';
import { Inventory } from '../components/Inventory';
import { IsRoom } from '../components/IsRoom';
import { WorldQuery } from '../utils/WorldQuery';
import { IEngine } from '../ecs/IEngine';

export interface AutocompleteData {
    type: 'room' | 'inventory';
    objects?: string[];
    items?: string[];
    containers?: string[];
    npcs?: string[];
    equipped?: string[];
}

export class AutocompleteAggregator {
    /**
     * Aggregates autocomplete data for the room the player is in.
     */
    static getRoomAutocomplete(playerPos: Position, engine: IEngine): AutocompleteData {
        const objects: string[] = [];  // NPCs, terminals, puzzle objects (non-item entities)
        const groundItems: string[] = []; // Items on the ground
        const groundContainers: string[] = []; // Containers on the ground

        // Find NPCs
        const npcs = WorldQuery.findNPCsAt(engine, playerPos.x, playerPos.y);
        const typeCounts = new Map<string, number>();
        const typeTotals = new Map<string, number>();
        const ordinalNames = ["first", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth", "ninth", "tenth"];

        npcs.forEach(npc => {
            const npcComp = npc.getComponent(NPC);
            if (npcComp) {
                const name = npcComp.typeName.toLowerCase();
                typeTotals.set(name, (typeTotals.get(name) || 0) + 1);
            }
        });

        const npcs_list: string[] = [];
        npcs.forEach(npc => {
            const npcComp = npc.getComponent(NPC);
            if (npcComp) {
                const name = npcComp.typeName.toLowerCase();
                const total = typeTotals.get(name) || 0;

                let finalName = name;
                if (total > 1) {
                    const count = (typeCounts.get(name) || 0) + 1;
                    typeCounts.set(name, count);
                    const ordinal = ordinalNames[count - 1] || count.toString();
                    finalName = `${ordinal} ${name}`;
                }
                objects.push(finalName);
                npcs_list.push(finalName);
            }
        });

        // Find Terminals
        const terminals = WorldQuery.findTerminalsAt(engine, playerPos.x, playerPos.y);
        terminals.forEach(terminal => {
            const desc = terminal.getComponent(Description);
            if (desc) {
                const title = desc.title.toLowerCase();
                objects.push(title);
            }
        });

        // Find Puzzle Objects & Other Description entities (busts, tables, etc.)
        const descEntities = engine.getEntitiesWithComponent(Description).filter(e => {
            const pos = e.getComponent(Position);
            const desc = e.getComponent(Description);
            const hasItem = e.hasComponent(Item);
            const isRoom = e.hasComponent(IsRoom);
            return pos && desc && !hasItem && !isRoom && pos.x === playerPos.x && pos.y === playerPos.y;
        });

        descEntities.forEach(entity => {
            const desc = entity.getComponent(Description);
            if (desc) {
                const title = desc.title.toLowerCase();
                if (!objects.includes(title)) {
                    objects.push(title);
                }

            }
        });

        // Find Ground Items & Containers
        const items = WorldQuery.findItemsAt(engine, playerPos.x, playerPos.y);
        items.forEach(item => {
            const itemComp = item.getComponent(Item);
            const containerComp = item.getComponent(Container);

            if (itemComp) {
                groundItems.push(itemComp.name.toLowerCase());

                // If it's also a container, add it to groundContainers
                if (containerComp) {
                    groundContainers.push(itemComp.name.toLowerCase());
                }
            }
        });

        return {
            type: 'room',
            objects: objects,
            items: groundItems,
            containers: groundContainers,
            npcs: npcs_list
        };
    }

    /**
     * Aggregates autocomplete data for the player's inventory.
     */
    static getInventoryAutocomplete(player: Entity, engine: IEngine): AutocompleteData {
        const inventory = player.getComponent(Inventory);
        if (!inventory) return { type: 'inventory', items: [], containers: [] };

        const invItems: string[] = [];
        const containers: string[] = [];
        const equipped: string[] = [];

        const getHandContent = (handId: string | null) => {
            if (!handId) return null;
            const item = WorldQuery.getEntityById(engine, handId);
            return item?.getComponent(Item)?.name || null;
        };

        const addSuggestions = (name: string) => {
            const lowerName = name.toLowerCase();
            if (!invItems.includes(lowerName)) invItems.push(lowerName);


            // Specific aliases
            if (lowerName.includes('pistol magazine')) {
                if (!invItems.includes('mag')) invItems.push('mag');
            }
        };

        if (inventory.leftHand) {
            const name = getHandContent(inventory.leftHand);
            if (name) addSuggestions(name);
        }
        if (inventory.rightHand) {
            const name = getHandContent(inventory.rightHand);
            if (name) addSuggestions(name);
        }

        // Check hands for containers
        if (inventory.leftHand) {
            const item = WorldQuery.getEntityById(engine, inventory.leftHand);
            const itemComp = item?.getComponent(Item);
            const container = item?.getComponent(Container);
            if (container && itemComp) {
                containers.push(itemComp.name.toLowerCase());
            }
        }
        if (inventory.rightHand) {
            const item = WorldQuery.getEntityById(engine, inventory.rightHand);
            const itemComp = item?.getComponent(Item);
            const container = item?.getComponent(Container);
            if (container && itemComp) {
                containers.push(itemComp.name.toLowerCase());
            }
        }

        inventory.equipment.forEach((itemId) => {
            const item = WorldQuery.getEntityById(engine, itemId);
            const itemComp = item?.getComponent(Item);
            const container = item?.getComponent(Container);

            // Add to equipped list
            if (itemComp) {
                equipped.push(itemComp.name.toLowerCase());
            }

            if (container && itemComp) {
                containers.push(itemComp.name.toLowerCase());
            }

            if (container) {
                container.items.forEach(cid => {
                    const cItem = WorldQuery.getEntityById(engine, cid);
                    const name = cItem?.getComponent(Item)?.name;
                    if (name) addSuggestions(name);
                });
            }
        });

        return {
            type: 'inventory',
            items: invItems.filter(n => n !== 'empty' && n !== 'unknown'),
            containers: Array.from(new Set(containers)), // Remove duplicates
            equipped: equipped
        };
    }
}
