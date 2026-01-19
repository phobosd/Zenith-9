const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'game.db');
const db = new Database(dbPath);

console.log(`Connected to database at ${dbPath}`);

// Get all entities
const rows = db.prepare('SELECT id, data FROM world_entities').all();
console.log(`Found ${rows.length} entities in database.`);

let deletedCount = 0;

rows.forEach(row => {
    try {
        const data = JSON.parse(row.data);
        const jsonString = JSON.stringify(data).toLowerCase();

        // Remove specific NPCs requested by user
        const targets = [
            "whisper",
            "cinder",
            "rusty bolt",
            "kira 'shard' volkov",
            "silas 'wired' thorne",
            "patch",
            "the cordyceps cartel",
            "kira 'spine' valerius",
            "retch",
            "venomspitter"
        ];

        for (const target of targets) {
            if (jsonString.includes(target)) {
                console.log(`Deleting Target NPC '${target}': ${row.id}`);
                db.prepare('DELETE FROM world_entities WHERE id = ?').run(row.id);
                deletedCount++;
                break; // Stop checking other targets for this row
            }
        }

    } catch (err) {
        console.error(`Error processing row ${row.id}:`, err);
    }
});

console.log(`Deleted ${deletedCount} entities.`);
