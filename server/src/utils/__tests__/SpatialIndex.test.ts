import { SpatialIndex } from '../SpatialIndex';

describe('SpatialIndex', () => {
    let spatialIndex: SpatialIndex;

    beforeEach(() => {
        spatialIndex = new SpatialIndex();
    });

    test('should add and retrieve entities at coordinates', () => {
        spatialIndex.add('entity1', 10, 10);
        spatialIndex.add('entity2', 10, 10);
        spatialIndex.add('entity3', 20, 20);

        const entitiesAt10 = spatialIndex.getEntitiesAt(10, 10);
        expect(entitiesAt10).toContain('entity1');
        expect(entitiesAt10).toContain('entity2');
        expect(entitiesAt10).toHaveLength(2);

        const entitiesAt20 = spatialIndex.getEntitiesAt(20, 20);
        expect(entitiesAt20).toContain('entity3');
        expect(entitiesAt20).toHaveLength(1);
    });

    test('should remove entities correctly', () => {
        spatialIndex.add('entity1', 10, 10);
        spatialIndex.remove('entity1', 10, 10);

        const entities = spatialIndex.getEntitiesAt(10, 10);
        expect(entities).toHaveLength(0);
    });

    test('should update entity positions', () => {
        spatialIndex.add('entity1', 10, 10);
        spatialIndex.update('entity1', 10, 10, 15, 15);

        expect(spatialIndex.getEntitiesAt(10, 10)).toHaveLength(0);
        expect(spatialIndex.getEntitiesAt(15, 15)).toContain('entity1');
    });

    test('should clear all entities', () => {
        spatialIndex.add('entity1', 10, 10);
        spatialIndex.add('entity2', 20, 20);
        spatialIndex.clear();

        expect(spatialIndex.getEntitiesAt(10, 10)).toHaveLength(0);
        expect(spatialIndex.getEntitiesAt(20, 20)).toHaveLength(0);
    });
});
