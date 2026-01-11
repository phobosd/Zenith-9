import { Entity } from './Entity';
import { System } from './System';
import { IEngine } from '../commands/CommandRegistry';
import { Logger } from '../utils/Logger';

export class Engine implements IEngine {
    private entities: Map<string, Entity>;
    private systems: System[];
    private componentIndex: Map<string, Set<string>>;

    constructor() {
        this.entities = new Map();
        this.systems = [];
        this.componentIndex = new Map();
    }

    addEntity(entity: Entity): void {
        this.entities.set(entity.id, entity);
        // Index existing components
        entity.components.forEach((_, type) => {
            this.addToIndex(type, entity.id);
        });

        // Listen for future component changes
        entity.on('componentAdded', (type: string) => this.addToIndex(type, entity.id));
        entity.on('componentRemoved', (type: string) => this.removeFromIndex(type, entity.id));
    }

    removeEntity(entityId: string): void {
        const entity = this.entities.get(entityId);
        if (entity) {
            entity.components.forEach((_, type) => {
                this.removeFromIndex(type, entityId);
            });
            // Remove listeners
            entity.removeAllListeners('componentAdded');
            entity.removeAllListeners('componentRemoved');
        }
        this.entities.delete(entityId);
    }

    private addToIndex(componentType: string, entityId: string) {
        if (!this.componentIndex.has(componentType)) {
            this.componentIndex.set(componentType, new Set());
        }
        this.componentIndex.get(componentType)!.add(entityId);
    }

    private removeFromIndex(componentType: string, entityId: string) {
        const set = this.componentIndex.get(componentType);
        if (set) {
            set.delete(entityId);
            if (set.size === 0) {
                this.componentIndex.delete(componentType);
            }
        }
    }

    getEntitiesWithComponent<T extends any>(componentClass: any): Entity[] {
        const type = componentClass.type;
        const ids = this.componentIndex.get(type);
        if (!ids) return [];

        return Array.from(ids)
            .map(id => this.entities.get(id))
            .filter((e): e is Entity => !!e);
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
        for (const system of this.systems) {
            try {
                system.update(this, deltaTime);
            } catch (error) {
                Logger.error('Engine', `Error in system ${system.constructor.name}:`, error);
            }
        }
    }
}
