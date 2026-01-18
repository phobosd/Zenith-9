import { Engine } from '../ecs/Engine';
import { LayoutGenerator } from './LayoutGenerator';
import { RoomFactory } from './RoomFactory';
import { MatrixGenerator } from './MatrixGenerator';
import { Position } from '../components/Position';
import { IsRoom } from '../components/IsRoom';
import { IsCyberspace } from '../components/IsCyberspace';

export class WorldGenerator {
    private engine: Engine;
    private width: number;
    private height: number;

    constructor(engine: Engine, width: number = 20, height: number = 20) {
        this.engine = engine;
        this.width = width;
        this.height = height;
    }

    generate() {
        console.log(`Generating ${this.width}x${this.height} world...`);

        // 1. Generate Layout
        const mapLayout = LayoutGenerator.createLayout(this.width, this.height);

        // 2. Create Physical World
        const roomFactory = new RoomFactory(this.engine);
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const type = mapLayout[y][x];
                if (type !== 0) {
                    roomFactory.createRoom(x, y, type);
                }
            }
        }

        // 3. Create Matrix Mirror
        const matrixGenerator = new MatrixGenerator(this.engine, this.width, this.height);
        matrixGenerator.generate(mapLayout);

        console.log('World generation complete.');
    }

    regenerateMatrixOnly() {
        console.log('Regenerating Matrix mirror world from existing physical world...');

        // Build a layout from existing physical rooms
        const mapLayout: number[][] = [];
        for (let y = 0; y < this.height; y++) {
            mapLayout[y] = [];
            for (let x = 0; x < this.width; x++) {
                mapLayout[y][x] = 0;
            }
        }

        // Find all physical rooms (x < 10000)
        const rooms = this.engine.getEntitiesWithComponent(IsRoom);
        rooms.forEach(room => {
            const pos = room.getComponent(Position);
            const isCyber = room.hasComponent(IsCyberspace);

            if (pos && !isCyber && pos.x < 10000 && pos.x >= 0 && pos.y >= 0 && pos.x < this.width && pos.y < this.height) {
                // Determine room type based on description or default to street
                mapLayout[pos.y][pos.x] = 1; // Default to street/data conduit
            }
        });

        // Generate Matrix mirror
        const matrixGenerator = new MatrixGenerator(this.engine, this.width, this.height);
        matrixGenerator.generate(mapLayout);

        console.log('Matrix regeneration complete.');
    }
}
