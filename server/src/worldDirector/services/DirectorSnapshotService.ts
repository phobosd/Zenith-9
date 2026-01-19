import { WorldDirector } from '../Director';
import { DirectorLogLevel } from '../DirectorTypes';
import { SnapshotService } from '../../services/SnapshotService';

export class DirectorSnapshotService {
    private director: WorldDirector;
    private snapshotService: SnapshotService;

    constructor(director: WorldDirector, snapshotService: SnapshotService) {
        this.director = director;
        this.snapshotService = snapshotService;
    }

    public async listSnapshots() {
        return await this.snapshotService.listSnapshots();
    }

    public async createSnapshot(name?: string) {
        try {
            this.director.log(DirectorLogLevel.INFO, `Creating snapshot: ${name || 'manual'}...`);
            await this.snapshotService.createSnapshot(name);
            this.director.log(DirectorLogLevel.SUCCESS, `Snapshot created successfully.`);

            const list = await this.listSnapshots();
            this.director.adminNamespace.emit('snapshot:list_update', list);
        } catch (err) {
            this.director.log(DirectorLogLevel.ERROR, `Failed to create snapshot: ${err}`);
        }
    }

    public async restoreSnapshot(id: string) {
        try {
            this.director.log(DirectorLogLevel.WARN, `RESTORING SNAPSHOT: ${id}. System will be temporarily unavailable.`);
            await this.snapshotService.restoreSnapshot(id);
            this.director.log(DirectorLogLevel.SUCCESS, `Snapshot ${id} restored successfully. Server is RESTARTING to apply changes.`);
            this.director.log(DirectorLogLevel.INFO, `System state restored to ${id}. Admin connection will drop momentarily.`);
        } catch (err) {
            this.director.log(DirectorLogLevel.ERROR, `Failed to restore snapshot: ${err}`);
        }
    }

    public async deleteSnapshot(id: string) {
        try {
            await this.snapshotService.deleteSnapshot(id);
            this.director.log(DirectorLogLevel.SUCCESS, `Snapshot ${id} deleted.`);

            const list = await this.listSnapshots();
            this.director.adminNamespace.emit('snapshot:list_update', list);
        } catch (err) {
            this.director.log(DirectorLogLevel.ERROR, `Failed to delete snapshot: ${err}`);
        }
    }
}
