import { DatabaseService } from './services/DatabaseService';
import { Logger } from './utils/Logger';

async function migrate() {
    Logger.info('Migration', 'Starting Gibsonian Migration...');

    const db = DatabaseService.getInstance().getDb();

    Logger.info('Migration', 'Purging WorldState database (world_entities)...');
    db.prepare('DELETE FROM world_entities').run();
    Logger.info('Migration', 'Database purged.');

    Logger.info('Migration', 'Migration complete. Restart the server to repopulate the world.');
    process.exit(0);
}

migrate().catch(err => {
    Logger.error('Migration', 'Migration failed:', err);
    process.exit(1);
});
