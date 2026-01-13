import { Entity } from '../ecs/Entity';
import { Position } from '../components/Position';
import { IsRoom } from '../components/IsRoom';
import { Item } from '../components/Item';
import { NPC } from '../components/NPC';
import { Terminal } from '../components/Terminal';
import { PuzzleObject } from '../components/PuzzleObject';
import { IEngine } from '../ecs/IEngine';

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
        return engine.getEntitiesAt(x, y).find(e => e.hasComponent(IsRoom));
    }

    /**
     * Find all NPCs at the specified coordinates.
     */
    static findNPCsAt(engine: IEngine, x: number, y: number): Entity[] {
        return engine.getEntitiesAt(x, y).filter(e => e.hasComponent(NPC));
    }

    /**
     * Find all items at the specified coordinates.
     */
    static findItemsAt(engine: IEngine, x: number, y: number): Entity[] {
        return engine.getEntitiesAt(x, y).filter(e => e.hasComponent(Item));
    }

    /**
     * Find all terminals at the specified coordinates.
     */
    static findTerminalsAt(engine: IEngine, x: number, y: number): Entity[] {
        return engine.getEntitiesAt(x, y).filter(e => e.hasComponent(Terminal));
    }

    /**
     * Find all puzzle objects at the specified coordinates.
     */
    static findPuzzleObjectsAt(engine: IEngine, x: number, y: number): Entity[] {
        return engine.getEntitiesAt(x, y).filter(e => e.hasComponent(PuzzleObject));
    }
}
