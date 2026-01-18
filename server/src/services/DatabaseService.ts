import Database from 'better-sqlite3';
import path from 'path';
import { Logger } from '../utils/Logger';

export class DatabaseService {
    private static instance: DatabaseService;
    private db: Database.Database;

    private constructor() {
        const dbPath = path.join(process.cwd(), 'game.db');
        this.db = new Database(dbPath);
        this.init();
    }

    public static getInstance(): DatabaseService {
        if (!DatabaseService.instance) {
            DatabaseService.instance = new DatabaseService();
        }
        return DatabaseService.instance;
    }

    private init() {
        Logger.info('Database', 'Initializing SQLite tables...');

        // Users Table
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                role TEXT DEFAULT 'user',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Characters Table
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS characters (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                name TEXT UNIQUE NOT NULL,
                archetype TEXT NOT NULL,
                data TEXT NOT NULL, -- Serialized ECS Components
                last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        `);

        // World Entities Table (for non-player persistence)
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS world_entities (
                id TEXT PRIMARY KEY,
                data TEXT NOT NULL,
                last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        Logger.info('Database', 'SQLite tables initialized.');
    }

    public getDb(): Database.Database {
        return this.db;
    }
}
