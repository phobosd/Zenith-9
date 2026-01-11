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

export interface AutocompleteData {
    type: 'room' | 'inventory';
    objects?: string[];
    items?: string[];
    containers?: string[];
}

export class AutocompleteAggregator {
    /**
     * Aggregates autocomplete data for the room the player is in.
     */
    static getRoomAutocomplete(playerPos: Position, entities: Set<Entity>): AutocompleteData {
        const objects: string[] = [];  // NPCs, terminals, puzzle objects (non-item entities)
        const groundItems: string[] = []; // Items on the ground
        const groundContainers: string[] = []; // Containers on the ground

        // Find NPCs
        const npcs = WorldQuery.findNPCsAt(entities, playerPos.x, playerPos.y);
        npcs.forEach(npc => {
            const npcComp = npc.getComponent(NPC);
            if (npcComp) {
                objects.push(npcComp.typeName.toLowerCase());
            }
        });

        // Find Terminals
        const terminals = WorldQuery.findTerminalsAt(entities, playerPos.x, playerPos.y);
        terminals.forEach(terminal => {
            const desc = terminal.getComponent(Description);
            if (desc) {
                objects.push(desc.title.toLowerCase());
            }
        });

        // Find Puzzle Objects & Other Description entities (busts, tables, etc.)
        const descEntities = Array.from(entities).filter(e => {
            const pos = e.getComponent(Position);
            const desc = e.getComponent(Description);
            const hasItem = e.hasComponent(Item);
            const isRoom = e.hasComponent(IsRoom);
            return pos && desc && !hasItem && !isRoom && pos.x === playerPos.x && pos.y === playerPos.y;
        });

        descEntities.forEach(entity => {
            const desc = entity.getComponent(Description);
            if (desc && !objects.includes(desc.title.toLowerCase())) {
                objects.push(desc.title.toLowerCase());
                // Also add shortened versions for common names
                if (desc.title.includes('Bust')) {
                    const bustType = desc.title.replace(' Bust', '').toLowerCase();
                    if (!objects.includes(bustType)) {
                        objects.push(bustType);
                    }
                    if (!objects.includes('bust')) {
                        objects.push('bust');
                    }
                }
                if (desc.title.includes('Table')) {
                    if (!objects.includes('table')) {
                        objects.push('table');
                    }
                }
            }
        });

        // Find Ground Items & Containers
        const items = WorldQuery.findItemsAt(entities, playerPos.x, playerPos.y);
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
            containers: groundContainers
        };
    }

    /**
     * Aggregates autocomplete data for the player's inventory.
     */
    static getInventoryAutocomplete(player: Entity, entities: Set<Entity>): AutocompleteData {
        const inventory = player.getComponent(Inventory);
        if (!inventory) return { type: 'inventory', items: [], containers: [] };

        const invItems: string[] = [];
        const containers: string[] = [];

        const getHandContent = (handId: string | null) => {
            if (!handId) return null;
            const item = WorldQuery.getEntityById(entities, handId);
            return item?.getComponent(Item)?.name || null;
        };

        const shortenName = (name: string): string => {
            if (name.toLowerCase().includes('pistol magazine')) return 'mag';
            return name;
        };

        if (inventory.leftHand) {
            const name = getHandContent(inventory.leftHand);
            if (name) invItems.push(shortenName(name).toLowerCase());
        }
        if (inventory.rightHand) {
            const name = getHandContent(inventory.rightHand);
            if (name) invItems.push(shortenName(name).toLowerCase());
        }

        inventory.equipment.forEach((itemId) => {
            const item = WorldQuery.getEntityById(entities, itemId);
            const itemComp = item?.getComponent(Item);
            const container = item?.getComponent(Container);

            if (container && itemComp) {
                containers.push(itemComp.name.toLowerCase());
            }

            if (container) {
                container.items.forEach(cid => {
                    const cItem = WorldQuery.getEntityById(entities, cid);
                    const name = cItem?.getComponent(Item)?.name;
                    if (name) {
                        invItems.push(shortenName(name).toLowerCase());
                    }
                });
            }
        });

        return {
            type: 'inventory',
            items: invItems.filter(n => n !== 'empty' && n !== 'unknown'),
            containers: containers
        };
    }
}
