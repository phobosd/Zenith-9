import { Engine } from '../ecs/Engine';
import { Entity } from '../ecs/Entity';
import { Position } from '../components/Position';
import { Description } from '../components/Description';
import { IsRoom } from '../components/IsRoom';
import { IsCyberspace } from '../components/IsCyberspace';
import { Atmosphere } from '../components/Atmosphere';
import { PrefabFactory } from '../factories/PrefabFactory';
import { RoomRegistry } from '../services/RoomRegistry';

export class MatrixGenerator {
    private engine: Engine;
    private width: number;
    private height: number;

    constructor(engine: Engine, width: number, height: number) {
        this.engine = engine;
        this.width = width;
        this.height = height;
    }

    public generate(layout: number[][]) {
        console.log("Generating Matrix Mirror world...");

        // 1. Mirror the base layout
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const type = layout[y][x];
                if (type === 0) continue;
                this.createMatrixNode(x, y, type);
            }
        }

        // 2. Mirror rooms from RoomRegistry (Generated Expansions)
        const roomRegistry = RoomRegistry.getInstance();
        const extraRooms = roomRegistry.getAllRooms();
        console.log(`Mirroring ${extraRooms.length} extra rooms from registry...`);

        for (const room of extraRooms) {
            // Map string types to layout numbers
            let typeNum = 1; // Default to street
            if (room.type === 'shop') typeNum = 3;
            else if (room.type === 'indoor') typeNum = 3;
            else if (room.type === 'dungeon') typeNum = 7;

            this.createMatrixNode(room.coordinates.x, room.coordinates.y, typeNum);
        }
    }

    private createMatrixNode(x: number, y: number, type: number) {
        const offset = 10000;

        // Check if a node already exists at this Matrix position to avoid duplicates
        const existing = this.engine.getEntitiesWithComponent(Position).find(e => {
            const pos = e.getComponent(Position);
            return pos?.x === x + offset && pos?.y === y && e.hasComponent(IsCyberspace);
        });
        if (existing) return;

        const node = new Entity();
        node.addComponent(new IsRoom());
        node.addComponent(new IsCyberspace());
        node.addComponent(new Position(x + offset, y));
        node.addComponent(new Atmosphere("Neon-Pulse Grid", "Digital Glow", "Ultra-High"));

        let title = "Digital Node";
        let desc = "A crystalline structure of pulsing light and shifting data-streams.";

        switch (type) {
            case 1: // Street
                title = "Data-Stream Conduit";
                desc = "A high-speed data conduit where packets of encrypted information flow like liquid light.";
                break;
            case 2: // Plaza
                title = "Central Processing Nexus";
                desc = "The core of the local network. Massive pillars of light represent the arcology's primary data-hubs.";
                break;
            case 3: // Shop
                title = "Encrypted Sub-Node";
                desc = "A secure sub-node containing commercial data-shards and transaction logs.";
                break;
            case 4: // Clinic
                title = "Bio-Data Repository";
                desc = "A specialized node for storing and processing biological telemetry and neural-map data.";
                break;
            case 5: // Club
                title = "Social Frequency Hub";
                desc = "A chaotic hub of unencrypted social data and sensory-broadcast streams.";
                break;
            case 6: // Park
                title = "Recursive Logic Garden";
                desc = "A peaceful sector of the grid where fractal algorithms create a digital representation of nature.";
                break;
            case 7: // Alchemist's Study / Dungeon
                title = "Obfuscated Archive";
                desc = "A heavily encrypted archive node, hidden behind layers of ancient, non-standard protocols.";
                break;
        }

        node.addComponent(new Description(title, desc));
        this.engine.addEntity(node);

        // Spawn ICE in the Matrix
        if (Math.random() > 0.8) {
            const ice = PrefabFactory.createNPC(Math.random() > 0.7 ? 'black ice' : 'white ice');
            if (ice) {
                ice.addComponent(new Position(x + offset, y));
                this.engine.addEntity(ice);
                PrefabFactory.equipICE(ice, this.engine);
            }
        }
    }
}
