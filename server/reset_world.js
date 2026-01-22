const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(process.cwd(), 'game.db');
const db = new Database(dbPath);

console.log('Clearing world_entities table...');
try {
    const info = db.prepare('DELETE FROM world_entities').run();
    console.log(`Deleted ${info.changes} entities.`);
    console.log('World state reset. Restart the server to regenerate the world with base NPCs.');
} catch (err) {
    console.error('Failed to reset world:', err);
}
