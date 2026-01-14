import { Entity } from '../ecs/Entity';
import { IEngine } from '../ecs/IEngine';
import { Position } from '../components/Position';
import { Inventory } from '../components/Inventory';
import { Item } from '../components/Item';
import { Container } from '../components/Container';
import { Stats } from '../components/Stats';
import { CombatStats } from '../components/CombatStats';
import { CombatBuffer } from '../components/CombatBuffer';
import { Stance, StanceType } from '../components/Stance';
import { Momentum } from '../components/Momentum';
import { Credits } from '../components/Credits';
import { Weapon } from '../components/Weapon';
import { Magazine } from '../components/Magazine';
import { EngagementTier } from '../types/CombatTypes';
import { PrefabFactory } from './PrefabFactory';

export class PlayerFactory {
    static createPlayer(socketId: string, engine: IEngine): Entity {
        const player = new Entity(socketId);
        player.addComponent(new Position(10, 10)); // Spawn in Central Plaza
        const inventory = new Inventory();
        player.addComponent(inventory);

        // Give player a backpack
        const backpack = new Entity();
        backpack.addComponent(new Item("Backpack", "A sturdy canvas backpack.", 1.0));
        backpack.addComponent(new Container(10.0)); // 10lbs capacity
        engine.addEntity(backpack);

        inventory.equipment.set('back', backpack.id);

        // Add Samurai Sword (Katana) to backpack
        const katana = PrefabFactory.createItem("katana");
        if (katana) {
            engine.addEntity(katana);
            backpack.getComponent(Container)?.items.push(katana.id);
            backpack.getComponent(Container)!.currentWeight += 1.5;
        }

        // Initialize Stats (Street Thug Archetype)
        const stats = new Stats();
        stats.attributes.set('STR', { name: 'STR', value: 12 });
        stats.attributes.set('CON', { name: 'CON', value: 12 });
        stats.attributes.set('AGI', { name: 'AGI', value: 16 }); // High Agility
        stats.attributes.set('CHA', { name: 'CHA', value: 6 });  // Low Charisma

        // Skills
        stats.skills.set('Hacking', { name: 'Hacking', level: 1, uses: 0, maxUses: 10 });
        stats.skills.set('Stealth', { name: 'Stealth', level: 1, uses: 0, maxUses: 10 });
        stats.skills.set('Marksmanship (Light)', { name: 'Marksmanship (Light)', level: 1, uses: 0, maxUses: 10 });
        stats.skills.set('Marksmanship (Medium)', { name: 'Marksmanship (Medium)', level: 1, uses: 0, maxUses: 10 });
        stats.skills.set('Marksmanship (Heavy)', { name: 'Marksmanship (Heavy)', level: 1, uses: 0, maxUses: 10 });

        player.addComponent(stats);
        player.addComponent(new CombatStats(100, 10, 5, false));
        player.addComponent(new CombatBuffer(3));
        player.addComponent(new Stance(StanceType.Standing));
        player.addComponent(new Momentum());
        player.addComponent(new Credits(500, 1000000)); // 500 New Yen, 1,000,000 Credits

        // Create Shirt with pockets
        const shirt = new Entity();
        shirt.addComponent(new Item("Tactical Shirt", "A shirt with reinforced pockets.", 0.8, 1, "Medium", "Legal", "", "shirt", "torso"));
        shirt.addComponent(new Container(3.0)); // 3lbs max
        engine.addEntity(shirt);
        inventory.equipment.set('torso', shirt.id);

        // Create Pants with pockets
        const pants = new Entity();
        pants.addComponent(new Item("Cargo Pants", "Durable tactical pants with many pockets.", 1.5, 1, "Medium", "Legal", "", "pants", "legs"));
        pants.addComponent(new Container(5.0)); // 5lbs max
        engine.addEntity(pants);
        inventory.equipment.set('legs', pants.id);

        // Create Belt
        const belt = new Entity();
        belt.addComponent(new Item("Utility Belt", "A leather belt with pouches.", 0.5, 1, "Small", "Legal", "", "belt", "waist"));
        belt.addComponent(new Container(4.0)); // 4lbs max
        engine.addEntity(belt);
        inventory.equipment.set('waist', belt.id);

        // Create 3 Individual Magazines (in Belt)
        for (let i = 0; i < 3; i++) {
            const mag = new Entity();
            mag.addComponent(new Item("9mm Pistol Magazine", "A standard 10-round magazine.", 0.2));
            mag.addComponent(new Magazine("9mm Pistol Magazine", 10, 10, "9mm"));
            engine.addEntity(mag);
            belt.getComponent(Container)?.items.push(mag.id);
            belt.getComponent(Container)!.currentWeight += 0.2;
        }

        // Create Pistol (in Right Hand)
        const pistol = new Entity();
        pistol.addComponent(new Item("9mm Pistol", "A reliable semi-automatic sidearm.", 2.0));
        pistol.addComponent(new Weapon(
            "9mm Pistol",
            "pistol",
            15,
            10,
            "9mm",
            "9mm Pistol Magazine",
            12,
            { speed: 1.2, zoneSize: 2, jitter: 0.1 },
            EngagementTier.MISSILE,
            EngagementTier.MELEE,
            0.2
        ));
        engine.addEntity(pistol);
        inventory.rightHand = pistol.id;

        // Create Cyberdeck (in Backpack)
        const deck = new Entity();
        deck.addComponent(new Item("Ono-Sendai Cyberspace 7", "A legendary cyberdeck, sleek and powerful.", 1.5, 1, "Small", "Legal", "deck"));
        engine.addEntity(deck);

        const backpackId = inventory.equipment.get('back');
        if (backpackId) {
            const backpack = engine.getEntity(backpackId);
            const container = backpack?.getComponent(Container);
            if (container) {
                container.items.push(deck.id);
            }
        }

        engine.addEntity(player);
        return player;
    }
}
