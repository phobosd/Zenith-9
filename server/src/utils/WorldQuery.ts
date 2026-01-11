import { Entity } from '../ecs/Entity';
import { Position } from '../components/Position';
import { IsRoom } from '../components/IsRoom';
import { Item } from '../components/Item';
import { NPC } from '../components/NPC';
import { Terminal } from '../components/Terminal';
import { PuzzleObject } from '../components/PuzzleObject';
import { Description } from '../components/Description';

export class WorldQuery {
    /**
     * Find an entity by its unique ID.
     */
    static getEntityById(entities: Set<Entity>, id: string): Entity | undefined {
        return Array.from(entities).find(e => e.id === id);
    }

    /**
     * Find a room at the specified coordinates.
     */
    static findRoomAt(entities: Set<Entity>, x: number, y: number): Entity | undefined {
        for (const entity of entities) {
            if (entity.hasComponent(IsRoom)) {
                const pos = entity.getComponent(Position);
                if (pos && pos.x === x && pos.y === y) {
                    return entity;
                }
            }
        }
        return undefined;
    }

    /**
     * Find all NPCs at the specified coordinates.
     */
    static findNPCsAt(entities: Set<Entity>, x: number, y: number): Entity[] {
        return Array.from(entities).filter(e => {
            const pos = e.getComponent(Position);
            return e.hasComponent(NPC) && pos && pos.x === x && pos.y === y;
        });
    }

    /**
     * Find all items at the specified coordinates.
     */
    static findItemsAt(entities: Set<Entity>, x: number, y: number): Entity[] {
        return Array.from(entities).filter(e => {
            const pos = e.getComponent(Position);
            return e.hasComponent(Item) && pos && pos.x === x && pos.y === y;
        });
    }

    /**
     * Find all terminals at the specified coordinates.
     */
    static findTerminalsAt(entities: Set<Entity>, x: number, y: number): Entity[] {
        return Array.from(entities).filter(e => {
            const pos = e.getComponent(Position);
            return e.hasComponent(Terminal) && pos && pos.x === x && pos.y === y;
        });
    }

    /**
     * Find all puzzle objects at the specified coordinates.
     */
    static findPuzzleObjectsAt(entities: Set<Entity>, x: number, y: number): Entity[] {
        return Array.from(entities).filter(e => {
            const pos = e.getComponent(Position);
            return e.hasComponent(PuzzleObject) && pos && pos.x === x && pos.y === y;
        });
    }
}
