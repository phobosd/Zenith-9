import { Engine } from '../ecs/Engine';
import { Entity } from '../ecs/Entity';
import { Position } from '../components/Position';
import { Description } from '../components/Description';
import { IsRoom } from '../components/IsRoom';
import { Shop } from '../components/Shop';
import { Atmosphere } from '../components/Atmosphere';
import { PrefabFactory } from '../factories/PrefabFactory';

export interface RoomFlavor {
    title: string;
    desc: string;
    shopData?: { name: string; desc: string };
}

export class RoomFactory {
    private engine: Engine;

    constructor(engine: Engine) {
        this.engine = engine;
    }

    public createRoom(x: number, y: number, type: number) {
        const room = new Entity();
        room.addComponent(new IsRoom());
        room.addComponent(new Position(x, y));

        const flavor = this.getRoomFlavor(type, x, y);
        room.addComponent(new Description(flavor.title, flavor.desc));
        room.addComponent(new Atmosphere());

        if (flavor.shopData) {
            room.addComponent(new Shop(flavor.shopData.name, flavor.shopData.desc));

            if (flavor.shopData.name === "Chrome & Steel") {
                const fixer = PrefabFactory.createNPC('fixer', 'npc_the_fixer');
                if (fixer) {
                    fixer.addComponent(new Position(x, y));
                    this.engine.addEntity(fixer);
                }
            }

            // Spawn Terminal in all shops
            const terminal = new Entity();
            terminal.addComponent(new Position(x, y));
            terminal.addComponent(new Description("Shop Terminal", "A sleek terminal displaying a catalog of goods. Type 'read terminal' to view."));

            let items: string[] = [];
            if (flavor.shopData.name === "Chrome & Steel") {
                items = [
                    'neural_deck',
                    'data_chip',
                    'optical_hud',
                    'signal_jammer',
                    'ext_drive',
                    'exoskeleton_frame',
                    'ono_sendai_cyberspace7',
                    'microsoft_hacking',
                    'reflex_boost'
                ];
            } else if (flavor.shopData.name === "The Armory") {
                items = [
                    'combat_knife',
                    'katana',
                    'monofilament_whip',
                    'stun_baton',
                    'heavy_pistol',
                    'smg',
                    'shotgun',
                    'assault_rifle',
                    'sniper_rifle',
                    'plasma_rifle',
                    'frag_grenade',
                    'emp_grenade',
                    'flashbang',
                    'ammo_pistol',
                    'ammo_rifle',
                    'ammo_shotgun',
                    'ammo_energy'
                ];
            } else if (flavor.shopData.name === "Bits & Bytes") {
                items = [
                    'stim_pack',
                    'medkit',
                    'energy_drink',
                    'nutrient_paste',
                    'syntho_caf',
                    'backpack',
                    'utility_belt',
                    'flashlight',
                    'rope',
                    'grappling_hook'
                ];
            }

            // We don't actually add items to the terminal entity here in the original code,
            // the InteractionSystem handles 'read terminal' by checking if the room is a shop.
            // But we might want to store the stock on the terminal or shop component later.

            this.engine.addEntity(terminal);
        }

        this.engine.addEntity(room);
        return room;
    }

    private getRoomFlavor(type: number, x: number, y: number): RoomFlavor {
        switch (type) {
            case 1: // Street
                return {
                    title: "Neon-Lit Street",
                    desc: "Rain slicks the pavement, reflecting the garish neon signs above. Steam vents hiss, and the distant sound of sirens fills the air."
                };
            case 2: // Plaza
                return {
                    title: "Arcology Plaza",
                    desc: "A wide open space dominated by a massive holographic statue. Crowds of people hurry past, faces illuminated by the glow of their AR displays."
                };
            case 3: // Shop
                // Determine shop type based on coordinates (hardcoded in layout)
                // Layout:
                // layout[cy - 2][cx - 2] = 3; // Cyber-Implant Shop (8, 8)
                // layout[cy - 2][cx + 2] = 3; // Weapon Shop (12, 8)
                // layout[cy + 2][cx - 2] = 3; // General Store (8, 12)

                // We need to know the center to map back, or just check specific coords if we pass width/height
                // For now, let's just use the coordinates we know from the layout generator logic.
                // Assuming 20x20 world, cx=10, cy=10.

                if (x === 8 && y === 8) {
                    return {
                        title: "Chrome & Steel",
                        desc: "The air smells of ozone and antiseptic. Glass cases display gleaming cybernetic limbs and neural interfaces.",
                        shopData: { name: "Chrome & Steel", desc: "High-end cybernetics and neural interfaces." }
                    };
                } else if (x === 12 && y === 8) {
                    return {
                        title: "The Armory",
                        desc: "Walls lined with weapons of all shapes and sizes. The shopkeeper eyes you suspiciously from behind a reinforced counter.",
                        shopData: { name: "The Armory", desc: "Weapons for every occasion." }
                    };
                } else {
                    return {
                        title: "Bits & Bytes",
                        desc: "Cluttered shelves overflow with miscellaneous tech parts, cables, and survival gear.",
                        shopData: { name: "Bits & Bytes", desc: "General supplies and tech scraps." }
                    };
                }
            case 4: // Clinic
                return {
                    title: "Street Doc's Clinic",
                    desc: "A grimy waiting room with flickering lights. The muffled sound of a surgical drill comes from the back."
                };
            case 5: // Club
                return {
                    title: "The Glitch Club",
                    desc: "Bass thumps in your chest. The air is thick with smoke and the smell of synthetic pheromones. Dancers move in cages suspended from the ceiling."
                };
            case 6: // Park
                return {
                    title: "Synth-Park",
                    desc: "Artificial turf and holographic trees create a poor imitation of nature. The sky above is a projection of a sunny day, glitching occasionally."
                };
            case 7: // Alchemist's Study
                return {
                    title: "The Alchemist's Study",
                    desc: "A hidden room filled with strange, glowing vials and ancient-looking computer terminals. The air hums with a strange energy."
                };
            default:
                return {
                    title: "Empty Lot",
                    desc: "A vacant lot filled with rubble and trash."
                };
        }
    }
}
