let uuidCounter = 0;
jest.mock('uuid', () => ({
    v4: () => `test-id-${uuidCounter++}`
}));

import { Engine } from '../Engine';
import { Entity } from '../Entity';
import { Component } from '../Component';

class TestComponent extends Component {
    static type = 'TestComponent';
}

class AnotherComponent extends Component {
    static type = 'AnotherComponent';
}

describe('Engine', () => {
    let engine: Engine;

    beforeEach(() => {
        engine = new Engine();
    });

    test('should cache component queries', () => {
        const entity1 = new Entity();
        entity1.addComponent(new TestComponent());
        engine.addEntity(entity1);

        const entity2 = new Entity();
        entity2.addComponent(new TestComponent());
        engine.addEntity(entity2);

        // First call - should populate cache
        const results1 = engine.getEntitiesWithComponent(TestComponent);
        expect(results1).toHaveLength(2);

        // Second call - should use cache
        const results2 = engine.getEntitiesWithComponent(TestComponent);
        expect(results2).toBe(results1); // Reference equality check for cache
    });

    test('should invalidate cache when component is added', () => {
        const entity1 = new Entity();
        entity1.addComponent(new TestComponent());
        engine.addEntity(entity1);

        engine.getEntitiesWithComponent(TestComponent); // Populate cache

        const entity2 = new Entity();
        entity2.addComponent(new TestComponent());
        engine.addEntity(entity2);

        const results = engine.getEntitiesWithComponent(TestComponent);
        expect(results).toHaveLength(2);
    });

    test('should invalidate cache when component is removed', () => {
        const entity1 = new Entity();
        entity1.addComponent(new TestComponent());
        engine.addEntity(entity1);

        engine.getEntitiesWithComponent(TestComponent); // Populate cache

        entity1.removeComponent(TestComponent);

        const results = engine.getEntitiesWithComponent(TestComponent);
        expect(results).toHaveLength(0);
    });

    test('should handle multiple component types independently', () => {
        const entity1 = new Entity();
        entity1.addComponent(new TestComponent());
        engine.addEntity(entity1);

        const entity2 = new Entity();
        entity2.addComponent(new AnotherComponent());
        engine.addEntity(entity2);

        const testResults = engine.getEntitiesWithComponent(TestComponent);
        const anotherResults = engine.getEntitiesWithComponent(AnotherComponent);

        expect(testResults).toHaveLength(1);
        expect(anotherResults).toHaveLength(1);
        expect(testResults[0]).toBe(entity1);
        expect(anotherResults[0]).toBe(entity2);
    });
});
