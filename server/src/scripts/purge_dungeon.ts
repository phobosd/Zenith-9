import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'game.db');
const db = new Database(dbPath);

console.log('Purging duplicates and limiting vendors in database...');

const rows = db.prepare('SELECT id, data FROM world_entities').all() as any[];
const seen = new Set<string>();
const toDelete: string[] = [];
let vendorCount = 0;
const MAX_VENDORS = 7;

rows.forEach(row => {
    try {
        const data = JSON.parse(row.data);
        const pos = data.components?.Position;
        const desc = data.components?.Description;
        const npc = data.components?.NPC;

        if (pos && desc) {
            const key = `${pos.x},${pos.y},${desc.title}`;
            if (seen.has(key)) {
                toDelete.push(row.id);
                return;
            }
            seen.add(key);
        }

        if (npc && npc.typeName === 'Street Vendor') {
            vendorCount++;
            if (vendorCount > MAX_VENDORS) {
                toDelete.push(row.id);
            }
        }
    } catch (err) {
        console.error(`Failed to parse entity ${row.id}:`, err);
    }
});

if (toDelete.length > 0) {
    const deleteStmt = db.prepare('DELETE FROM world_entities WHERE id = ?');
    const transaction = db.transaction((ids) => {
        for (const id of ids) {
            deleteStmt.run(id);
        }
    });
    transaction(toDelete);
    console.log(`Purged ${toDelete.length} entities (duplicates or excess vendors).`);
} else {
    console.log('No duplicates or excess vendors found.');
}

db.close();
