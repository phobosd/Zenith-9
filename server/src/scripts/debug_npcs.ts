import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'game.db');
const db = new Database(dbPath);

const rows = db.prepare("SELECT data FROM world_entities WHERE data LIKE '%NPC%' LIMIT 5").all() as any[];
rows.forEach((row, i) => {
    console.log(`--- Entity ${i} ---`);
    try {
        const parsed = JSON.parse(row.data);
        console.log(JSON.stringify(parsed, null, 2));
    } catch (err) {
        console.error('Failed to parse JSON');
    }
});

db.close();
