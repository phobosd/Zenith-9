import * as fs from 'fs';
import * as path from 'path';
import Database from 'better-sqlite3';

const dbPath = path.join(process.cwd(), 'game.db');
const db = new Database(dbPath);

const schemaPath = path.join(process.cwd(), 'src', 'db', 'schema.sql');
const schema = fs.readFileSync(schemaPath, 'utf-8');
db.exec(schema);

const itemsJsonPath = path.join(process.cwd(), 'data', 'items.json');
if (fs.existsSync(itemsJsonPath)) {
    console.log(`Loading items from ${itemsJsonPath}...`);
    const content = fs.readFileSync(itemsJsonPath, 'utf-8');
    try {
        const items = JSON.parse(content);

        const insertStmt = db.prepare(`
            INSERT OR REPLACE INTO items (
                id, name, short_name, description, weight, size, legality, 
                attributes, cost, type, slot, rarity, extra_data
            ) VALUES (
                @id, @name, @shortName, @description, @weight, @size, @legality, 
                @attributes, @cost, @type, @slot, @rarity, @extraData
            )
        `);

        const updateMany = db.transaction((items) => {
            for (const item of items) {
                // Fix potential missing fields or defaults
                const def = {
                    id: item.id,
                    name: item.name || item.shortName, // Fallback
                    shortName: item.shortName || item.name, // Fallback
                    description: item.description || '',
                    weight: item.weight || 0,
                    size: item.size || 'Medium',
                    legality: item.legality || 'Legal',
                    attributes: item.attributes || '',
                    cost: item.cost || 0,
                    type: item.type || 'item',
                    slot: item.extraData?.slot || null,
                    rarity: item.rarity || 'Common',
                    extraData: JSON.stringify(item.extraData || {})
                };
                insertStmt.run(def);
            }
        });

        updateMany(items);
        console.log(`Successfully migrated ${items.length} items to SQLite.`);

    } catch (err) {
        console.error("Failed to parse items.json or insert into DB:", err);
    }
} else {
    console.error(`items.json not found at ${itemsJsonPath}`);
}

db.close();
