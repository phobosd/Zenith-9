const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'game.db');

if (!fs.existsSync(dbPath)) {
    console.log('Database file not found. Nothing to wipe.');
    process.exit(0);
}

const db = new Database(dbPath);
console.log(`Connected to database at ${dbPath}`);

try {
    // Clear world entities but keep characters/users if they are in the same DB
    // Based on PersistenceManager.ts, world entities are in 'world_entities'
    const result = db.prepare('DELETE FROM world_entities').run();
    console.log(`Successfully deleted ${result.changes} world entities.`);

    // Also clear world_state if it exists (sometimes used for global state)
    try {
        db.prepare('DELETE FROM world_state').run();
        console.log('Cleared world_state table.');
    } catch (e) {
        // Table might not exist
    }

} catch (err) {
    console.error('Error wiping world entities:', err);
} finally {
    db.close();
}
