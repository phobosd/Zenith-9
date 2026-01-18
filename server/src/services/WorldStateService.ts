import { Entity } from '../ecs/Entity';
import { ComponentRegistry } from '../ecs/ComponentRegistry';
import { PersistenceManager } from '../persistence/PersistenceManager';
import { IEngine } from '../ecs/IEngine';
import { Logger } from '../utils/Logger';

export class WorldStateService {
    constructor(private persistence: PersistenceManager) {
        ComponentRegistry.init();
    }

    async saveEntity(entity: Entity) {
        await this.persistence.saveEntity(entity.id, entity.toJSON());
    }

    async loadEntity(entityId: string): Promise<Entity | null> {
        const data = await this.persistence.getEntity(entityId);
        if (!data) return null;

        return this.reconstructEntity(data);
    }

    reconstructEntity(data: any): Entity {
        const entity = new Entity(data.id);
        entity.version = data.version || 1;

        // Future: Handle migrations based on entity.version
        if (entity.version < 1) {
            // Perform migrations
        }

        if (data.components) {
            for (const type in data.components) {
                const componentClass = ComponentRegistry.get(type);
                if (componentClass) {
                    const component = new componentClass();
                    component.fromJSON(data.components[type]);
                    entity.addComponent(component);
                } else {
                    Logger.warn('WorldStateService', `Unknown component type: ${type} for entity ${data.id}`);
                }
            }
        }

        return entity;
    }

    async saveAllEntities(entities: Entity[]) {
        const data = entities.map(e => e.toJSON());
        await this.persistence.saveWorldState(data);
    }

    async loadWorldState(engine: IEngine) {
        const entitiesData = await this.persistence.getAllEntities();
        Logger.info('WorldStateService', `Loading ${entitiesData.length} entities from database...`);
        for (const data of entitiesData) {
            try {
                const entity = this.reconstructEntity(data);
                engine.addEntity(entity);
            } catch (err) {
                Logger.error('WorldStateService', `Failed to reconstruct entity ${data?.id}: ${err}`);
                throw err;
            }
        }
    }
}
