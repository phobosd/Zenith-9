import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';
import { createClient } from 'redis';
import { promisify } from 'util';
import { exec } from 'child_process';

const execAsync = promisify(exec);

export class SnapshotService {
    private redisClient: any;
    private backupDir: string;
    private dataDir: string;

    constructor() {
        const redisUrl = process.env.REDIS_URL ||
            (process.env.REDIS_HOST ? `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT || 6379}` : 'redis://localhost:6379');

        this.redisClient = createClient({
            url: redisUrl
        });

        this.redisClient.on('error', (err: any) => console.error('Redis Client Error', err));

        this.backupDir = path.resolve(__dirname, '../../backups');
        this.dataDir = path.resolve(__dirname, '../../data');

        if (!fs.existsSync(this.backupDir)) {
            fs.mkdirSync(this.backupDir, { recursive: true });
        }
    }

    private async connectRedis() {
        if (!this.redisClient.isOpen) {
            await this.redisClient.connect();
        }
    }

    private getTimestamp(): string {
        const now = new Date();
        return now.toISOString().replace(/[:.]/g, '-');
    }

    /**
     * Creates a full snapshot of the world state (Redis + Data Files)
     */
    async createSnapshot(name: string = 'manual'): Promise<string> {
        await this.connectRedis();

        const timestamp = this.getTimestamp();
        const snapshotId = `${timestamp}_${name}`;
        const snapshotPath = path.join(this.backupDir, snapshotId);

        console.log(`[Snapshot] Creating snapshot: ${snapshotId}...`);

        // 1. Create snapshot directory
        fs.mkdirSync(snapshotPath, { recursive: true });

        // 2. Trigger Redis Save and Copy dump.rdb
        // Note: In a real production env, we might use BGSAVE and wait, 
        // but for this setup, we'll try to save and then copy the dump file.
        // We assume Redis is running locally and dumping to default location or we can export keys.
        // For simplicity and reliability in this specific setup, we will serialize all keys to JSON.
        // Copying dump.rdb is risky if we don't know exactly where it is or if it's locked.

        console.log(`[Snapshot] Dumping Redis state...`);
        const redisDump = await this.dumpRedisToJson();
        fs.writeFileSync(path.join(snapshotPath, 'redis_dump.json'), JSON.stringify(redisDump, null, 2));

        // 3. Backup SQLite Database
        console.log(`[Snapshot] Backing up SQLite database...`);
        const dbPath = path.resolve(process.cwd(), 'game.db');
        if (fs.existsSync(dbPath)) {
            fs.copyFileSync(dbPath, path.join(snapshotPath, 'game.db'));
        }

        // 4. Zip Data Directory
        console.log(`[Snapshot] Backing up data directory...`);
        const zip = new AdmZip();
        zip.addLocalFolder(this.dataDir);
        zip.writeZip(path.join(snapshotPath, 'data.zip'));

        console.log(`[Snapshot] Snapshot created successfully at ${snapshotPath}`);
        return snapshotId;
    }

    /**
     * Restores a snapshot, wiping current state.
     */
    async restoreSnapshot(snapshotId: string): Promise<void> {
        await this.connectRedis();

        const snapshotPath = path.join(this.backupDir, snapshotId);
        if (!fs.existsSync(snapshotPath)) {
            throw new Error(`Snapshot ${snapshotId} not found.`);
        }

        console.log(`[Snapshot] Restoring snapshot: ${snapshotId}...`);

        // 1. Restore Redis
        console.log(`[Snapshot] Flushing Redis...`);
        await this.redisClient.flushAll();

        console.log(`[Snapshot] Restoring Redis keys...`);
        const redisDumpPath = path.join(snapshotPath, 'redis_dump.json');
        if (fs.existsSync(redisDumpPath)) {
            const redisDump = JSON.parse(fs.readFileSync(redisDumpPath, 'utf-8'));
            await this.restoreRedisFromJson(redisDump);
        }

        // 2. Restore SQLite Database
        console.log(`[Snapshot] Restoring SQLite database...`);
        const snapshotDbPath = path.join(snapshotPath, 'game.db');
        const currentDbPath = path.resolve(process.cwd(), 'game.db');

        if (fs.existsSync(snapshotDbPath)) {
            // Close DB connection before overwriting
            const { DatabaseService } = await import('./DatabaseService');
            DatabaseService.getInstance().getDb().close();

            fs.copyFileSync(snapshotDbPath, currentDbPath);
            console.log(`[Snapshot] SQLite database restored. NOTE: Server may need restart if DB connection was active.`);
        }

        // 3. Restore Data Directory
        console.log(`[Snapshot] Restoring data directory...`);
        const zipPath = path.join(snapshotPath, 'data.zip');
        if (fs.existsSync(zipPath)) {
            // Clear current data dir
            // Be careful not to delete the dir itself if it causes permission issues, just contents
            fs.rmSync(this.dataDir, { recursive: true, force: true });
            fs.mkdirSync(this.dataDir);

            const zip = new AdmZip(zipPath);
            zip.extractAllTo(this.dataDir, true);
        }

        console.log(`[Snapshot] Restore complete. Triggering server restart in 2 seconds...`);

        // Trigger a restart to ensure all services re-initialize with the new data
        setTimeout(() => {
            console.log('[Snapshot] Restarting server...');
            process.exit(0);
        }, 2000);
    }

    async listSnapshots(): Promise<string[]> {
        if (!fs.existsSync(this.backupDir)) return [];
        return fs.readdirSync(this.backupDir).filter(f => fs.statSync(path.join(this.backupDir, f)).isDirectory()).reverse();
    }

    async deleteSnapshot(snapshotId: string): Promise<void> {
        const snapshotPath = path.join(this.backupDir, snapshotId);
        if (fs.existsSync(snapshotPath)) {
            fs.rmSync(snapshotPath, { recursive: true, force: true });
            console.log(`[Snapshot] Deleted snapshot: ${snapshotId}`);
        }
    }

    // --- Helpers for Redis JSON Dump/Restore ---

    private async dumpRedisToJson(): Promise<Record<string, string>> {
        const keys = await this.redisClient.keys('*');
        const dump: Record<string, string> = {};

        for (const key of keys) {
            const type = await this.redisClient.type(key);
            if (type === 'string') {
                dump[key] = await this.redisClient.get(key);
            }
            // Add other types if needed (hash, list, set), but our ECS mostly uses strings (JSON)
        }
        return dump;
    }

    private async restoreRedisFromJson(dump: Record<string, string>) {
        for (const [key, value] of Object.entries(dump)) {
            await this.redisClient.set(key, value);
        }
    }
}
