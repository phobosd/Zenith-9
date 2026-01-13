import { Entity } from '../ecs/Entity';
import { Position } from '../components/Position';

export class SpatialIndex {
    private index: Map<string, Set<string>> = new Map();

    private getKey(x: number, y: number): string {
        return `${x},${y}`;
    }

    add(entityId: string, x: number, y: number) {
        const key = this.getKey(x, y);
        if (!this.index.has(key)) {
            this.index.set(key, new Set());
        }
        this.index.get(key)!.add(entityId);
    }

    remove(entityId: string, x: number, y: number) {
        const key = this.getKey(x, y);
        const set = this.index.get(key);
        if (set) {
            set.delete(entityId);
            if (set.size === 0) {
                this.index.delete(key);
            }
        }
    }

    update(entityId: string, oldX: number, oldY: number, newX: number, newY: number) {
        if (oldX === newX && oldY === newY) return;
        this.remove(entityId, oldX, oldY);
        this.add(entityId, newX, newY);
    }

    getEntitiesAt(x: number, y: number): string[] {
        const key = this.getKey(x, y);
        const set = this.index.get(key);
        return set ? Array.from(set) : [];
    }

    clear() {
        this.index.clear();
    }
}
