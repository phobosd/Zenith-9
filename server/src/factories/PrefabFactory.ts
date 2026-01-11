import { Entity } from '../ecs/Entity';
import { Item } from '../components/Item';
import { Weapon } from '../components/Weapon';
import { Magazine } from '../components/Magazine';
import { Container } from '../components/Container';
import { NPC } from '../components/NPC';
import { CombatStats } from '../components/CombatStats';
import { Position } from '../components/Position';

import { ItemRegistry } from '../services/ItemRegistry';

export class PrefabFactory {
    static createItem(name: string): Entity | null {
        const entity = new Entity();
        const registry = ItemRegistry.getInstance();

        // Try to find by ID first (exact match), then by name (fuzzy/exact)
        let def = registry.getItem(name);

        // If not found by ID, try to find by name in the registry (ItemRegistry handles this via its map)

        if (def) {
            entity.addComponent(new Item(def.name, def.description, def.weight, 1, def.size, def.legality, def.attributes, def.shortName));

            if (def.type === 'container') {
                const capacity = def.extraData.capacity || 10;
                entity.addComponent(new Container(capacity));
            } else if (def.type === 'weapon') {
                const data = def.extraData;
                entity.addComponent(new Weapon(def.name, data.damage || 10, data.range || 10, data.ammoType || '9mm', data.magSize || 10, { speed: 1.0, zoneSize: 1, jitter: 0.1 }));
            }

            return entity;
        }

        // Fallback for hardcoded items (legacy support)
        const lowerName = name.toLowerCase();
        switch (lowerName) {
            case 'beer can':
                entity.addComponent(new Item("Beer Can", "An empty, crushed beer can.", 0.5));
                break;
            case 'backpack':
                entity.addComponent(new Item("Backpack", "A sturdy canvas backpack.", 1.0));
                entity.addComponent(new Container(20.0));
                break;
            default:
                return null;
        }
        return entity;
    }

    static createNPC(name: string): Entity | null {
        const entity = new Entity();
        const lowerName = name.toLowerCase();

        switch (lowerName) {
            case 'giant rat':
                entity.addComponent(new NPC(
                    "Giant Rat",
                    ["Squeak!", "Hiss...", "*scratches floor*"],
                    "A massive, mutated rodent the size of a large dog. Its fur is matted and greasy, patchy in places where scarred, pink skin shows through. Its eyes glow with a sickly, radioactive green luminescence, twitching erratically. You can hear its heavy, wheezing breath and smell the acrid stench of decay and sewage that clings to it."
                ));
                entity.addComponent(new CombatStats(20, 5, 0));
                break;
            case 'cyber thug':
                entity.addComponent(new NPC(
                    "Cyber Thug",
                    ["You lookin' at me?", "Got any credits?", "This is my turf."],
                    "A lean, dangerous figure leaning with practiced nonchalance. They wear a patchwork of scavenged leather and matte-black synthetic plates. A glowing red cybernetic implant replaces their left eye, scanning you with mechanical precision, while their right hand hovers near a holster. A low hum emanates from their enhanced limbs, and they smell of ozone and cheap tobacco."
                ));
                entity.addComponent(new CombatStats(50, 10, 5));
                break;
            case 'dancer':
                entity.addComponent(new NPC(
                    "Dancer",
                    ["Keep the rhythm.", "Want a drink?", "Too loud? Never."],
                    "A holographic dancer shimmering in the strobe lights."
                ));
                entity.addComponent(new CombatStats(30, 5, 2));
                break;
            case 'ripperdoc':
                entity.addComponent(new NPC(
                    "Ripperdoc",
                    ["Need a fix?", "I can replace that arm.", "Clean credits only."],
                    "A surgeon with multi-tool fingers and a blood-stained apron."
                ));
                entity.addComponent(new CombatStats(40, 8, 3));
                break;
            case 'street vendor':
                entity.addComponent(new NPC(
                    "Street Vendor",
                    ["Fresh noodles!", "Best synthetic meat!", "Buy something!"],
                    "An old man hunched over a steaming cart."
                ));
                entity.addComponent(new CombatStats(30, 5, 1));
                break;
            default:
                return null;
        }
        return entity;
    }

    static getSpawnableItems(): string[] {
        return [
            'beer can', '9mm pistol', '9mm mag', 'backpack',
            'tactical shirt', 'cargo pants', 'utility belt'
        ];
    }

    static getSpawnableNPCs(): string[] {
        return ['giant rat', 'cyber thug', 'dancer', 'ripperdoc', 'street vendor'];
    }
}
