import { Entity } from '../ecs/Entity';
import { Position } from '../components/Position';
import { IsRoom } from '../components/IsRoom';
import { Item } from '../components/Item';
import { NPC } from '../components/NPC';
import { Terminal } from '../components/Terminal';
import { PuzzleObject } from '../components/PuzzleObject';
import { IEngine } from '../commands/CommandRegistry';

export class WorldQuery {
    /**
     * Find an entity by its unique ID.
     */
    static getEntityById(engine: IEngine, id: string): Entity | undefined {
        return engine.getEntity(id);
    }

    /**
     * Find a room at the specified coordinates.
     */
    static findRoomAt(engine: IEngine, x: number, y: number): Entity | undefined {
        const rooms = engine.getEntitiesWithComponent(IsRoom);
        for (const room of rooms) {
            const pos = room.getComponent(Position);
            if (pos && pos.x === x && pos.y === y) {
                return room;
            }
        }
        return undefined;
    }

    /**
     * Find all NPCs at the specified coordinates.
     */
    static findNPCsAt(engine: IEngine, x: number, y: number): Entity[] {
        const npcs = engine.getEntitiesWithComponent(NPC);
        return npcs.filter(e => {
            const pos = e.getComponent(Position);
            return pos && pos.x === x && pos.y === y;
        });
    }

    /**
     * Find all items at the specified coordinates.
     */
    static findItemsAt(engine: IEngine, x: number, y: number): Entity[] {
        const items = engine.getEntitiesWithComponent(Item);
        return items.filter(e => {
            const pos = e.getComponent(Position);
            return pos && pos.x === x && pos.y === y;
        });
    }

    /**
     * Find all terminals at the specified coordinates.
     */
    static findTerminalsAt(engine: IEngine, x: number, y: number): Entity[] {
        const terminals = engine.getEntitiesWithComponent(Terminal);
        return terminals.filter(e => {
            const pos = e.getComponent(Position);
            return pos && pos.x === x && pos.y === y;
        });
    }

    /**
     * Find all puzzle objects at the specified coordinates.
     */
    static findPuzzleObjectsAt(engine: IEngine, x: number, y: number): Entity[] {
        const objects = engine.getEntitiesWithComponent(PuzzleObject);
        return objects.filter(e => {
            const pos = e.getComponent(Position);
            return pos && pos.x === x && pos.y === y;
        });
    }
}
