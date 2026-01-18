import { DatabaseService } from '../services/DatabaseService';
import { Logger } from '../utils/Logger';

export class PersistenceManager {
    private db = DatabaseService.getInstance().getDb();

    constructor() {
        // SQLite is initialized in DatabaseService
    }

    async connect() {
        // No-op for SQLite, but kept for compatibility with existing calls
        Logger.info('Persistence', 'SQLite Persistence Ready');
    }

    async saveEntity(entityId: string, data: any) {
        const stmt = this.db.prepare('INSERT OR REPLACE INTO world_entities (id, data, last_updated) VALUES (?, ?, CURRENT_TIMESTAMP)');
        stmt.run(entityId, JSON.stringify(data));
    }

    async getEntity(entityId: string) {
        const row = this.db.prepare('SELECT data FROM world_entities WHERE id = ?').get(entityId) as any;
        return row ? JSON.parse(row.data) : null;
    }

    async getAllEntities(): Promise<any[]> {
        const rows = this.db.prepare('SELECT data FROM world_entities').all() as any[];
        return rows.map(row => JSON.parse(row.data));
    }

    hasEntities(): boolean {
        const row = this.db.prepare('SELECT COUNT(*) as count FROM world_entities').get() as any;
        return row.count > 0;
    }

    async saveWorldState(entities: any[]) {
        const insert = this.db.prepare('INSERT OR REPLACE INTO world_entities (id, data, last_updated) VALUES (?, ?, CURRENT_TIMESTAMP)');

        const transaction = this.db.transaction((entities) => {
            for (const entity of entities) {
                insert.run(entity.id, JSON.stringify(entity));
            }
        });

        transaction(entities);
    }
}
