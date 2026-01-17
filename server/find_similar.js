const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'game.db');
const db = new Database(dbPath);

try {
    const rows = db.prepare('SELECT id, name, short_name FROM items').all();

    const normalize = (s) => (s || "").toLowerCase().replace(/[^a-z0-9]/g, '').trim();

    const groups = new Map();

    for (const row of rows) {
        // Check both slug and pretty name
        const normSlug = normalize(row.name);
        const normPretty = normalize(row.short_name);

        const keys = new Set([normSlug, normPretty]);
        for (const key of keys) {
            if (!key) continue;
            if (!groups.has(key)) {
                groups.set(key, []);
            }
            groups.get(key).push(row);
        }
    }

    for (const [key, items] of groups.entries()) {
        const uniqueIds = new Set(items.map(i => i.id));
        if (uniqueIds.size > 1) {
            console.log(`Potential duplicates for key: ${key}`);
            const uniqueItems = Array.from(new Map(items.map(i => [i.id, i])).values());
            for (const item of uniqueItems) {
                console.log(`  ID: ${item.id}, Slug: ${item.name}, Pretty: ${item.short_name}`);
            }
        }
    }

} catch (err) {
    console.error(err);
} finally {
    db.close();
}
