import { Entity } from './Entity';
import { System } from './System';
import { IEngine } from '../commands/CommandRegistry';

export class Engine implements IEngine {
    private entities: Map<string, Entity>;
    private systems: System[];

    constructor() {
        this.entities = new Map();
        this.systems = [];
    }

    addEntity(entity: Entity): void {
        this.entities.set(entity.id, entity);
    }

    removeEntity(entityId: string): void {
        this.entities.delete(entityId);
    }

    getEntity(entityId: string): Entity | undefined {
        return this.entities.get(entityId);
    }

    getEntities(): Map<string, Entity> {
        return this.entities;
    }

    addSystem(system: System): void {
        this.systems.push(system);
    }

    update(deltaTime: number): void {
        const entitySet = new Set(this.entities.values());
        for (const system of this.systems) {
            try {
                system.update(entitySet, deltaTime);
            } catch (error) {
                console.error(`Error in system ${system.constructor.name}:`, error);
            }
        }
    }
}
