let uuidCounter = 0;
jest.mock('uuid', () => ({
    v4: () => `test-id-${uuidCounter++}`
}));

import { Entity } from '../Entity';

describe('Entity', () => {
    test('should have an id', () => {
        const entity = new Entity();
        expect(entity.id).toBeDefined();
    });
});
