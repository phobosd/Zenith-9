import { SnapshotService } from '../services/SnapshotService';

const service = new SnapshotService();

async function main() {
    const args = process.argv.slice(2);
    const command = args[0];
    const param = args[1];

    try {
        switch (command) {
            case 'create':
                const name = param || 'manual';
                await service.createSnapshot(name);
                break;
            case 'restore':
                if (!param) {
                    console.error('Error: Snapshot ID required for restore.');
                    console.log('Available snapshots:');
                    const snaps = await service.listSnapshots();
                    snaps.forEach(s => console.log(` - ${s}`));
                    process.exit(1);
                }
                await service.restoreSnapshot(param);
                break;
            case 'list':
                const snapshots = await service.listSnapshots();
                console.log('Snapshots:');
                snapshots.forEach(s => console.log(` - ${s}`));
                break;
            default:
                console.log('Usage:');
                console.log('  npm run snapshot:create [name]');
                console.log('  npm run snapshot:restore <snapshot_id>');
                console.log('  npm run snapshot:list');
        }
        process.exit(0);
    } catch (err) {
        console.error('Snapshot failed:', err);
        process.exit(1);
    }
}

main();
