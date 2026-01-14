import { Engine } from '../ecs/Engine';
import { LayoutGenerator } from './LayoutGenerator';
import { RoomFactory } from './RoomFactory';
import { MatrixGenerator } from './MatrixGenerator';

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
}
