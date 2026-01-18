import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'game.db');
const db = new Database(dbPath);

const row = db.prepare('SELECT data FROM world_entities LIMIT 1').get() as any;
if (row) {
    console.log('Data length:', row.data.length);
    try {
        const parsed = JSON.parse(row.data);
        console.log('Parsed successfully');
        console.log(JSON.stringify(parsed, null, 2));
    } catch (err) {
        console.error('Failed to parse JSON:');
        console.error(row.data);
        console.error(err);
    }
} else {
    console.log('No data found');
}

db.close();
