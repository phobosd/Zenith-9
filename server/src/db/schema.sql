CREATE TABLE IF NOT EXISTS items (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    short_name TEXT NOT NULL,
    description TEXT NOT NULL,
    weight REAL NOT NULL,
    size TEXT NOT NULL,
    legality TEXT NOT NULL,
    attributes TEXT NOT NULL,
    cost INTEGER NOT NULL,
    type TEXT NOT NULL,
    slot TEXT,
    rarity TEXT DEFAULT 'Common',
    extra_data TEXT
);
