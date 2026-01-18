import Database from 'better-sqlite3';
import * as path from 'path';
import { Logger } from '../utils/Logger';

interface ItemSeed {
    id: string;
    name: string;
    short_name: string;
    description: string;
    weight: number;
    size: string;
    legality: string;
    attributes: string;
    cost: number;
    type: 'item' | 'weapon' | 'container' | 'cyberware' | 'armor';
    slot?: string | null;
    rarity?: string;
    extra_data: string;
}

const items: ItemSeed[] = [
    // ===== WEAPONS =====
    {
        id: 'katana',
        name: 'katana',
        short_name: 'Katana',
        description: 'A razor-sharp mono-molecular blade forged in the old style.',
        weight: 2.5,
        size: 'Large',
        legality: 'Restricted',
        attributes: 'Melee Weapon; High damage, momentum-based combat.',
        cost: 2500,
        type: 'weapon',
        rarity: 'Rare',
        extra_data: JSON.stringify({
            damage: 35,
            range: 0,
            minTier: 'melee',
            maxTier: 'close quarters',
            momentumImpact: 0.4,
            roundtime: 3,
            difficulty: { speed: 1.2, zoneSize: 3, jitter: 0.2 }
        })
    },
    {
        id: 'combat_knife',
        name: 'combat_knife',
        short_name: 'Combat Knife',
        description: 'A tactical combat knife with a serrated edge.',
        weight: 0.5,
        size: 'Small',
        legality: 'Legal',
        attributes: 'Melee Weapon; Fast, low damage.',
        cost: 150,
        type: 'weapon',
        rarity: 'Common',
        extra_data: JSON.stringify({
            damage: 15,
            range: 0,
            minTier: 'melee',
            maxTier: 'close quarters',
            momentumImpact: 0.2,
            roundtime: 2,
            difficulty: { speed: 0.8, zoneSize: 4, jitter: 0.1 }
        })
    },
    {
        id: 'monofilament_whip',
        name: 'monofilament_whip',
        short_name: 'Monofilament Whip',
        description: 'A whip made of mono-molecular wire. Extremely dangerous.',
        weight: 1.0,
        size: 'Medium',
        legality: 'Illegal',
        attributes: 'Melee Weapon; Long reach, high damage.',
        cost: 3500,
        type: 'weapon',
        rarity: 'Rare',
        extra_data: JSON.stringify({
            damage: 40,
            range: 0,
            minTier: 'close quarters',
            maxTier: 'missile',
            momentumImpact: 0.3,
            roundtime: 4,
            difficulty: { speed: 1.5, zoneSize: 2, jitter: 0.3 }
        })
    },
    {
        id: 'stun_baton',
        name: 'stun_baton',
        short_name: 'Stun Baton',
        description: 'An electrified baton used by security forces.',
        weight: 1.5,
        size: 'Medium',
        legality: 'Restricted',
        attributes: 'Melee Weapon; Stun damage.',
        cost: 500,
        type: 'weapon',
        rarity: 'Common',
        extra_data: JSON.stringify({
            damage: 20,
            range: 0,
            minTier: 'melee',
            maxTier: 'close quarters',
            momentumImpact: 0.25,
            roundtime: 3,
            difficulty: { speed: 1.0, zoneSize: 3, jitter: 0.15 }
        })
    },
    {
        id: 'heavy_pistol',
        name: 'heavy_pistol',
        short_name: 'Heavy Pistol',
        description: 'A large-caliber handgun with stopping power.',
        weight: 1.5,
        size: 'Medium',
        legality: 'Restricted',
        attributes: 'Ranged Weapon; High damage, moderate accuracy.',
        cost: 800,
        type: 'weapon',
        rarity: 'Common',
        extra_data: JSON.stringify({
            damage: 30,
            range: 20,
            minTier: 'missile',
            maxTier: 'missile',
            momentumImpact: 0.3,
            roundtime: 3,
            ammoType: '.45',
            magSize: 8,
            difficulty: { speed: 1.1, zoneSize: 3, jitter: 0.2 }
        })
    },
    {
        id: 'smg',
        name: 'smg',
        short_name: 'SMG',
        description: 'A compact submachine gun. High rate of fire.',
        weight: 2.5,
        size: 'Medium',
        legality: 'Illegal',
        attributes: 'Ranged Weapon; Automatic fire.',
        cost: 1500,
        type: 'weapon',
        rarity: 'Uncommon',
        extra_data: JSON.stringify({
            damage: 20,
            range: 15,
            minTier: 'close quarters',
            maxTier: 'missile',
            momentumImpact: 0.25,
            roundtime: 2,
            ammoType: '9mm',
            magSize: 30,
            difficulty: { speed: 1.3, zoneSize: 4, jitter: 0.25 }
        })
    },
    {
        id: 'shotgun',
        name: 'shotgun',
        short_name: 'Shotgun',
        description: 'A pump-action shotgun. Devastating at close range.',
        weight: 4.0,
        size: 'Large',
        legality: 'Restricted',
        attributes: 'Ranged Weapon; High damage, close range.',
        cost: 1200,
        type: 'weapon',
        rarity: 'Common',
        extra_data: JSON.stringify({
            damage: 50,
            range: 10,
            minTier: 'close quarters',
            maxTier: 'missile',
            momentumImpact: 0.4,
            roundtime: 4,
            ammoType: '12gauge',
            magSize: 6,
            difficulty: { speed: 0.9, zoneSize: 5, jitter: 0.1 }
        })
    },
    {
        id: 'assault_rifle',
        name: 'assault_rifle',
        short_name: 'Assault Rifle',
        description: 'A military-grade assault rifle. Accurate and deadly.',
        weight: 3.5,
        size: 'Large',
        legality: 'Illegal',
        attributes: 'Ranged Weapon; High accuracy, medium damage.',
        cost: 2500,
        type: 'weapon',
        rarity: 'Uncommon',
        extra_data: JSON.stringify({
            damage: 35,
            range: 30,
            minTier: 'missile',
            maxTier: 'missile',
            momentumImpact: 0.3,
            roundtime: 3,
            ammoType: '5.56',
            magSize: 30,
            difficulty: { speed: 1.2, zoneSize: 3, jitter: 0.15 }
        })
    },
    {
        id: 'sniper_rifle',
        name: 'sniper_rifle',
        short_name: 'Sniper Rifle',
        description: 'A high-powered sniper rifle with advanced optics.',
        weight: 5.0,
        size: 'Large',
        legality: 'Illegal',
        attributes: 'Ranged Weapon; Extreme range, high damage.',
        cost: 4000,
        type: 'weapon',
        rarity: 'Rare',
        extra_data: JSON.stringify({
            damage: 60,
            range: 50,
            minTier: 'missile',
            maxTier: 'missile',
            momentumImpact: 0.5,
            roundtime: 5,
            ammoType: '.308',
            magSize: 5,
            difficulty: { speed: 0.8, zoneSize: 2, jitter: 0.1 }
        })
    },
    {
        id: 'plasma_rifle',
        name: 'plasma_rifle',
        short_name: 'Plasma Rifle',
        description: 'An experimental energy weapon firing superheated plasma.',
        weight: 4.5,
        size: 'Large',
        legality: 'Illegal',
        attributes: 'Energy Weapon; Ignores armor.',
        cost: 8000,
        type: 'weapon',
        rarity: 'Epic',
        extra_data: JSON.stringify({
            damage: 55,
            range: 25,
            minTier: 'missile',
            maxTier: 'missile',
            momentumImpact: 0.4,
            roundtime: 4,
            ammoType: 'energy',
            magSize: 20,
            difficulty: { speed: 1.4, zoneSize: 3, jitter: 0.3 }
        })
    },

    // ===== GRENADES =====
    {
        id: 'frag_grenade',
        name: 'frag_grenade',
        short_name: 'Frag Grenade',
        description: 'A fragmentation grenade. Handle with care.',
        weight: 0.5,
        size: 'Small',
        legality: 'Illegal',
        attributes: 'Explosive; Area damage.',
        cost: 300,
        type: 'weapon',
        rarity: 'Uncommon',
        extra_data: JSON.stringify({
            damage: 40,
            range: 10,
            minTier: 'missile',
            maxTier: 'missile',
            momentumImpact: 0.0,
            roundtime: 3,
            difficulty: { speed: 1.0, zoneSize: 4, jitter: 0.2 }
        })
    },
    {
        id: 'emp_grenade',
        name: 'emp_grenade',
        short_name: 'EMP Grenade',
        description: 'An electromagnetic pulse grenade. Disables electronics.',
        weight: 0.5,
        size: 'Small',
        legality: 'Illegal',
        attributes: 'EMP; Disables cyberware and electronics.',
        cost: 500,
        type: 'weapon',
        rarity: 'Uncommon',
        extra_data: JSON.stringify({
            damage: 10,
            range: 10,
            minTier: 'missile',
            maxTier: 'missile',
            momentumImpact: 0.0,
            roundtime: 3,
            difficulty: { speed: 1.0, zoneSize: 4, jitter: 0.2 }
        })
    },
    {
        id: 'flashbang',
        name: 'flashbang',
        short_name: 'Flashbang',
        description: 'A stun grenade that disorients targets.',
        weight: 0.4,
        size: 'Small',
        legality: 'Restricted',
        attributes: 'Stun; Disorients targets.',
        cost: 200,
        type: 'weapon',
        rarity: 'Common',
        extra_data: JSON.stringify({
            damage: 5,
            range: 10,
            minTier: 'missile',
            maxTier: 'missile',
            momentumImpact: 0.0,
            roundtime: 2,
            difficulty: { speed: 1.0, zoneSize: 5, jitter: 0.1 }
        })
    },

    // ===== AMMO =====
    {
        id: 'ammo_pistol',
        name: 'ammo_pistol',
        short_name: 'Pistol Ammo',
        description: 'A box of pistol ammunition.',
        weight: 0.5,
        size: 'Small',
        legality: 'Restricted',
        attributes: 'Ammunition; For pistols.',
        cost: 50,
        type: 'item',
        rarity: 'Common',
        extra_data: JSON.stringify({
            isMagazine: true,
            capacity: 10,
            currentAmmo: 10,
            ammoType: '.45'
        })
    },
    {
        id: 'ammo_rifle',
        name: 'ammo_rifle',
        short_name: 'Rifle Ammo',
        description: 'A box of rifle ammunition.',
        weight: 0.8,
        size: 'Small',
        legality: 'Restricted',
        attributes: 'Ammunition; For rifles.',
        cost: 75,
        type: 'item',
        rarity: 'Common',
        extra_data: JSON.stringify({
            isMagazine: true,
            capacity: 30,
            currentAmmo: 30,
            ammoType: '5.56'
        })
    },
    {
        id: 'ammo_shotgun',
        name: 'ammo_shotgun',
        short_name: 'Shotgun Shells',
        description: 'A box of shotgun shells.',
        weight: 1.0,
        size: 'Small',
        legality: 'Restricted',
        attributes: 'Ammunition; For shotguns.',
        cost: 60,
        type: 'item',
        rarity: 'Common',
        extra_data: JSON.stringify({
            isMagazine: true,
            capacity: 6,
            currentAmmo: 6,
            ammoType: '12gauge'
        })
    },
    {
        id: 'ammo_energy',
        name: 'ammo_energy',
        short_name: 'Energy Cell',
        description: 'A high-capacity energy cell for plasma weapons.',
        weight: 0.3,
        size: 'Small',
        legality: 'Restricted',
        attributes: 'Ammunition; For energy weapons.',
        cost: 150,
        type: 'item',
        rarity: 'Uncommon',
        extra_data: JSON.stringify({
            isMagazine: true,
            capacity: 20,
            currentAmmo: 20,
            ammoType: 'energy'
        })
    },

    // ===== CYBERWARE =====
    {
        id: 'neural_deck',
        name: 'neural_deck',
        short_name: 'Neural Deck',
        description: 'A cyberdeck for interfacing with the Matrix.',
        weight: 0.5,
        size: 'Small',
        legality: 'Legal',
        attributes: 'Neural Cyberware; Enables Matrix access.',
        cost: 5000,
        type: 'cyberware',
        rarity: 'Rare',
        extra_data: JSON.stringify({
            slot: 'neural',
            modifiers: { INT: 2 }
        })
    },
    {
        id: 'data_chip',
        name: 'data_chip',
        short_name: 'Data Chip',
        description: 'A neural data storage chip.',
        weight: 0.01,
        size: 'Tiny',
        legality: 'Legal',
        attributes: 'Neural Cyberware; Data storage.',
        cost: 500,
        type: 'cyberware',
        rarity: 'Common',
        extra_data: JSON.stringify({
            slot: 'neural',
            modifiers: {}
        })
    },
    {
        id: 'optical_hud',
        name: 'optical_hud',
        short_name: 'Optical HUD',
        description: 'Cybernetic eye implants with heads-up display.',
        weight: 0.1,
        size: 'Tiny',
        legality: 'Legal',
        attributes: 'Optical Cyberware; Enhanced vision.',
        cost: 2000,
        type: 'cyberware',
        rarity: 'Uncommon',
        extra_data: JSON.stringify({
            slot: 'eyes',
            modifiers: { PER: 2 }
        })
    },
    {
        id: 'signal_jammer',
        name: 'signal_jammer',
        short_name: 'Signal Jammer',
        description: 'A neural implant that jams wireless signals.',
        weight: 0.2,
        size: 'Tiny',
        legality: 'Restricted',
        attributes: 'Neural Cyberware; Signal jamming.',
        cost: 3000,
        type: 'cyberware',
        rarity: 'Uncommon',
        extra_data: JSON.stringify({
            slot: 'neural',
            modifiers: {}
        })
    },
    {
        id: 'ext_drive',
        name: 'ext_drive',
        short_name: 'External Drive',
        description: 'A portable data storage device.',
        weight: 0.1,
        size: 'Tiny',
        legality: 'Legal',
        attributes: 'Storage Device; Holds data.',
        cost: 200,
        type: 'item',
        rarity: 'Common',
        extra_data: JSON.stringify({})
    },
    {
        id: 'exoskeleton_frame',
        name: 'exoskeleton_frame',
        short_name: 'Exoskeleton Frame',
        description: 'A powered exoskeleton that enhances strength.',
        weight: 10.0,
        size: 'Large',
        legality: 'Restricted',
        attributes: 'Body Cyberware; +5 STR.',
        cost: 15000,
        type: 'cyberware',
        rarity: 'Epic',
        extra_data: JSON.stringify({
            slot: 'body',
            modifiers: { STR: 5 }
        })
    },
    {
        id: 'ono_sendai_cyberspace7',
        name: 'ono_sendai_cyberspace7',
        short_name: 'Ono-Sendai Cyberspace 7',
        description: 'A top-of-the-line cyberdeck. The best money can buy.',
        weight: 0.8,
        size: 'Small',
        legality: 'Legal',
        attributes: 'Neural Cyberware; Elite Matrix interface.',
        cost: 25000,
        type: 'cyberware',
        rarity: 'Legendary',
        extra_data: JSON.stringify({
            slot: 'neural',
            modifiers: { INT: 5, PER: 3 }
        })
    },
    {
        id: 'microsoft_hacking',
        name: 'microsoft_hacking',
        short_name: 'Microsoft Hacking Suite',
        description: 'A suite of hacking tools and ICE-breakers.',
        weight: 0.1,
        size: 'Tiny',
        legality: 'Illegal',
        attributes: 'Software; Hacking tools.',
        cost: 5000,
        type: 'item',
        rarity: 'Rare',
        extra_data: JSON.stringify({})
    },
    {
        id: 'reflex_boost',
        name: 'reflex_boost',
        short_name: 'Reflex Booster',
        description: 'Neural implants that enhance reaction time.',
        weight: 0.1,
        size: 'Tiny',
        legality: 'Legal',
        attributes: 'Neural Cyberware; +3 AGI.',
        cost: 8000,
        type: 'cyberware',
        rarity: 'Rare',
        extra_data: JSON.stringify({
            slot: 'neural',
            modifiers: { AGI: 3 }
        })
    },

    // ===== CONSUMABLES =====
    {
        id: 'stimpack',
        name: 'stimpack',
        short_name: 'Stimpack',
        description: 'A stimulant injector that restores energy and balance.',
        weight: 0.2,
        size: 'Small',
        legality: 'Legal',
        attributes: 'Consumable; Restores fatigue and balance.',
        cost: 150,
        type: 'item',
        rarity: 'Common',
        extra_data: JSON.stringify({})
    },
    {
        id: 'medkit',
        name: 'medkit',
        short_name: 'Medkit',
        description: 'A comprehensive medical kit. Heals 50 HP.',
        weight: 1.0,
        size: 'Medium',
        legality: 'Legal',
        attributes: 'Consumable; Heals 50 HP.',
        cost: 200,
        type: 'item',
        rarity: 'Common',
        extra_data: JSON.stringify({})
    },
    {
        id: 'bandage',
        name: 'bandage',
        short_name: 'Bandage',
        description: 'A simple bandage. Heals 15 HP.',
        weight: 0.1,
        size: 'Small',
        legality: 'Legal',
        attributes: 'Consumable; Heals 15 HP.',
        cost: 25,
        type: 'item',
        rarity: 'Common',
        extra_data: JSON.stringify({})
    },
    {
        id: 'painkillers',
        name: 'painkillers',
        short_name: 'Painkillers',
        description: 'Pharmaceutical painkillers. Heals 25 HP.',
        weight: 0.1,
        size: 'Small',
        legality: 'Legal',
        attributes: 'Consumable; Heals 25 HP.',
        cost: 50,
        type: 'item',
        rarity: 'Common',
        extra_data: JSON.stringify({})
    },
    {
        id: 'water_bottle',
        name: 'water_bottle',
        short_name: 'Water Bottle',
        description: 'A bottle of clean water. Reduces fatigue.',
        weight: 0.5,
        size: 'Small',
        legality: 'Legal',
        attributes: 'Consumable; Reduces fatigue.',
        cost: 10,
        type: 'item',
        rarity: 'Common',
        extra_data: JSON.stringify({})
    },
    {
        id: 'energy_drink',
        name: 'energy_drink',
        short_name: 'Energy Drink',
        description: 'A caffeinated energy drink.',
        weight: 0.3,
        size: 'Small',
        legality: 'Legal',
        attributes: 'Consumable; Restores energy.',
        cost: 15,
        type: 'item',
        rarity: 'Common',
        extra_data: JSON.stringify({})
    },
    {
        id: 'nutrient_paste',
        name: 'nutrient_paste',
        short_name: 'Nutrient Paste',
        description: 'A tube of synthetic nutrients. Tastes terrible.',
        weight: 0.2,
        size: 'Small',
        legality: 'Legal',
        attributes: 'Consumable; Provides nutrition.',
        cost: 20,
        type: 'item',
        rarity: 'Common',
        extra_data: JSON.stringify({})
    },
    {
        id: 'syntho_caf',
        name: 'syntho_caf',
        short_name: 'Syntho-Caf',
        description: 'Synthetic coffee. Keeps you alert.',
        weight: 0.2,
        size: 'Small',
        legality: 'Legal',
        attributes: 'Consumable; Increases alertness.',
        cost: 12,
        type: 'item',
        rarity: 'Common',
        extra_data: JSON.stringify({})
    },

    // ===== CONTAINERS & GEAR =====
    {
        id: 'backpack',
        name: 'backpack',
        short_name: 'Backpack',
        description: 'A sturdy canvas backpack.',
        weight: 1.0,
        size: 'Medium',
        legality: 'Legal',
        attributes: 'Container; 20kg capacity.',
        cost: 100,
        type: 'container',
        slot: 'back',
        rarity: 'Common',
        extra_data: JSON.stringify({
            capacity: 20,
            slot: 'back'
        })
    },
    {
        id: 'utility_belt',
        name: 'utility_belt',
        short_name: 'Utility Belt',
        description: 'A belt with multiple pouches and tool holders.',
        weight: 0.5,
        size: 'Small',
        legality: 'Legal',
        attributes: 'Container; 5kg capacity.',
        cost: 50,
        type: 'container',
        slot: 'waist',
        rarity: 'Common',
        extra_data: JSON.stringify({
            capacity: 5,
            slot: 'waist'
        })
    },
    {
        id: 'flashlight',
        name: 'flashlight',
        short_name: 'Flashlight',
        description: 'A tactical LED flashlight.',
        weight: 0.3,
        size: 'Small',
        legality: 'Legal',
        attributes: 'Tool; Provides light.',
        cost: 25,
        type: 'item',
        rarity: 'Common',
        extra_data: JSON.stringify({})
    },
    {
        id: 'rope',
        name: 'rope',
        short_name: 'Rope',
        description: '50 feet of nylon rope.',
        weight: 2.0,
        size: 'Medium',
        legality: 'Legal',
        attributes: 'Tool; Climbing and binding.',
        cost: 30,
        type: 'item',
        rarity: 'Common',
        extra_data: JSON.stringify({})
    },
    {
        id: 'grappling_hook',
        name: 'grappling_hook',
        short_name: 'Grappling Hook',
        description: 'A folding grappling hook with magnetic grip.',
        weight: 1.5,
        size: 'Medium',
        legality: 'Legal',
        attributes: 'Tool; Climbing aid.',
        cost: 150,
        type: 'item',
        rarity: 'Uncommon',
        extra_data: JSON.stringify({})
    },
    // ===== NEW STANDARD ITEMS =====
    {
        id: 'pistol_9mm',
        name: 'pistol_9mm',
        short_name: '9mm Pistol',
        description: 'A reliable, matte-black 9mm semi-automatic pistol. The workhorse of the sprawl, favored for its balance of weight and stopping power.',
        weight: 1.0,
        size: 'Small',
        legality: 'Restricted',
        attributes: 'Ranged Weapon; Reliable and easy to conceal.',
        cost: 450,
        type: 'weapon',
        rarity: 'Common',
        extra_data: JSON.stringify({
            damage: 22,
            range: 15,
            minTier: 'missile',
            maxTier: 'missile',
            momentumImpact: 0.2,
            roundtime: 2,
            ammoType: '9mm',
            magSize: 15,
            difficulty: { speed: 1.0, zoneSize: 4, jitter: 0.1 }
        })
    },
    {
        id: 'mag_pistol_9mm',
        name: 'mag_pistol_9mm',
        short_name: '9mm Magazine',
        description: 'A standard 15-round magazine for 9mm pistols. The steel casing is cold to the touch.',
        weight: 0.2,
        size: 'Small',
        legality: 'Restricted',
        attributes: 'Ammunition; 15 rounds of 9mm.',
        cost: 40,
        type: 'item',
        rarity: 'Common',
        extra_data: JSON.stringify({
            isMagazine: true,
            capacity: 15,
            currentAmmo: 15,
            ammoType: '9mm'
        })
    },
    {
        id: 'ammo_9mm_loose',
        name: 'ammo_9mm_loose',
        short_name: 'Loose 9mm Rounds',
        description: 'A handful of loose 9mm cartridges. They jingle in your pocket like copper-clad promises.',
        weight: 0.1,
        size: 'Tiny',
        legality: 'Restricted',
        attributes: 'Ammunition; Loose rounds.',
        cost: 10,
        type: 'item',
        rarity: 'Common',
        extra_data: JSON.stringify({
            ammoType: '9mm',
            quantity: 20
        })
    },
    {
        id: 'tactical_shirt',
        name: 'tactical shirt',
        short_name: 'Tactical Shirt',
        description: 'A lightweight, moisture-wicking shirt reinforced with thin poly-mesh fibers. It offers basic protection without sacrificing mobility.',
        weight: 0.5,
        size: 'Small',
        legality: 'Legal',
        attributes: 'Torso Armor; Light and breathable.',
        cost: 120,
        type: 'armor',
        slot: 'torso',
        rarity: 'Common',
        extra_data: JSON.stringify({
            defense: 2,
            penalty: 0,
            slot: 'torso'
        })
    },
    {
        id: 'heavy_jacket',
        name: 'heavy jacket',
        short_name: 'Heavy Leather Jacket',
        description: 'A thick, weathered leather jacket with concealed ceramic plating in the shoulders and chest. It smells of old rain and burnt ozone.',
        weight: 2.5,
        size: 'Medium',
        legality: 'Legal',
        attributes: 'Torso Armor; Sturdy and stylish.',
        cost: 650,
        type: 'armor',
        slot: 'torso',
        rarity: 'Rare',
        extra_data: JSON.stringify({
            defense: 12,
            penalty: 2,
            slot: 'torso'
        })
    },
    {
        id: 'cargo_pants',
        name: 'cargo pants',
        short_name: 'Cargo Pants',
        description: 'Rugged pants with more pockets than you have things to fill them with. The knees are reinforced with synthetic padding.',
        weight: 0.8,
        size: 'Medium',
        legality: 'Legal',
        attributes: 'Leg Armor; Practical and durable.',
        cost: 80,
        type: 'armor',
        slot: 'legs',
        rarity: 'Common',
        extra_data: JSON.stringify({
            defense: 2,
            penalty: 0,
            slot: 'legs'
        })
    },
    {
        id: 'armored_slacks',
        name: 'armored slacks',
        short_name: 'Armored Slacks',
        description: 'High-end corporate wear woven with liquid-armor filaments. They look like silk but stop a knife as well as kevlar.',
        weight: 1.2,
        size: 'Medium',
        legality: 'Legal',
        attributes: 'Leg Armor; Discreet protection.',
        cost: 1200,
        type: 'armor',
        slot: 'legs',
        rarity: 'Rare',
        extra_data: JSON.stringify({
            defense: 10,
            penalty: 1,
            slot: 'legs'
        })
    },
    {
        id: 'combat_boots',
        name: 'combat boots',
        short_name: 'Combat Boots',
        description: 'Heavy-duty boots with steel toes and acid-resistant soles. They leave deep, authoritative treads in the grime of the city.',
        weight: 1.5,
        size: 'Medium',
        legality: 'Legal',
        attributes: 'Foot Armor; Solid and reliable.',
        cost: 150,
        type: 'armor',
        slot: 'feet',
        rarity: 'Common',
        extra_data: JSON.stringify({
            defense: 3,
            penalty: 1,
            slot: 'feet'
        })
    },
    {
        id: 'kinetic_dampeners',
        name: 'kinetic dampeners',
        short_name: 'Kinetic Dampener Boots',
        description: 'Sleek, high-tech boots equipped with micro-servos that absorb impact and enhance sprinting. They hum softly when you move.',
        weight: 1.0,
        size: 'Medium',
        legality: 'Legal',
        attributes: 'Foot Armor; Enhances mobility.',
        cost: 2200,
        type: 'armor',
        slot: 'feet',
        rarity: 'Rare',
        extra_data: JSON.stringify({
            defense: 6,
            penalty: 0,
            slot: 'feet'
        })
    },
    {
        id: 'street_cap',
        name: 'street cap',
        short_name: 'Street Cap',
        description: 'A simple baseball cap with a faded logo. It keeps the neon glare out of your eyes and helps you blend into the crowd.',
        weight: 0.1,
        size: 'Small',
        legality: 'Legal',
        attributes: 'Head Armor; Low profile.',
        cost: 20,
        type: 'armor',
        slot: 'head',
        rarity: 'Common',
        extra_data: JSON.stringify({
            defense: 1,
            penalty: 0,
            slot: 'head'
        })
    },
    {
        id: 'ballistic_helmet',
        name: 'ballistic helmet',
        short_name: 'Ballistic Helmet',
        description: 'A matte-grey tactical helmet with a built-in comms array. It feels heavy and secure, a literal shell against the world.',
        weight: 1.2,
        size: 'Medium',
        legality: 'Restricted',
        attributes: 'Head Armor; Serious protection.',
        cost: 950,
        type: 'armor',
        slot: 'head',
        rarity: 'Rare',
        extra_data: JSON.stringify({
            defense: 15,
            penalty: 2,
            slot: 'head'
        })
    },
    {
        id: 'stealth_belt',
        name: 'stealth belt',
        short_name: 'Stealth Utility Belt',
        description: 'A specialized belt made of non-reflective material. It features silent-release buckles and a small, integrated signal scrambler.',
        weight: 0.6,
        size: 'Small',
        legality: 'Restricted',
        attributes: 'Waist Armor; Discreet and functional.',
        cost: 1800,
        type: 'armor',
        slot: 'waist',
        rarity: 'Rare',
        extra_data: JSON.stringify({
            defense: 4,
            penalty: 0,
            slot: 'waist'
        })
    },
    {
        id: 'messenger_bag',
        name: 'messenger bag',
        short_name: 'Messenger Bag',
        description: 'A worn, waterproof messenger bag with a single cross-body strap. It has seen better days, but the stitching still holds.',
        weight: 0.8,
        size: 'Medium',
        legality: 'Legal',
        attributes: 'Container; 15kg capacity.',
        cost: 60,
        type: 'container',
        slot: 'back',
        rarity: 'Common',
        extra_data: JSON.stringify({
            capacity: 15,
            slot: 'back'
        })
    },
    {
        id: 'tactical_backpack',
        name: 'tactical backpack',
        short_name: 'Tactical Backpack',
        description: 'A high-capacity military backpack with modular attachment points and a built-in hydration bladder.',
        weight: 1.5,
        size: 'Large',
        legality: 'Legal',
        attributes: 'Container; 40kg capacity.',
        cost: 450,
        type: 'container',
        slot: 'back',
        rarity: 'Rare',
        extra_data: JSON.stringify({
            capacity: 40,
            slot: 'back'
        })
    }
];

export function seedDatabase() {
    const dbPath = path.join(process.cwd(), 'game.db');
    const db = new Database(dbPath);

    Logger.info('Seed', 'Starting database seed...');

    try {
        // Create table if it doesn't exist
        db.exec(`
            CREATE TABLE IF NOT EXISTS items (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                short_name TEXT NOT NULL,
                description TEXT NOT NULL,
                weight REAL NOT NULL,
                size TEXT NOT NULL,
                legality TEXT NOT NULL,
                attributes TEXT NOT NULL,
                cost INTEGER NOT NULL,
                type TEXT NOT NULL,
                slot TEXT,
                rarity TEXT DEFAULT 'Common',
                extra_data TEXT
            );
        `);

        const insert = db.prepare(`
            INSERT OR REPLACE INTO items (
                id, name, short_name, description, weight, size, legality,
                attributes, cost, type, slot, rarity, extra_data
            ) VALUES (
                ?, ?, ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?, ?
            )
        `);

        const insertMany = db.transaction((items: ItemSeed[]) => {
            for (const item of items) {
                insert.run(
                    item.id,
                    item.name,
                    item.short_name,
                    item.description,
                    item.weight,
                    item.size,
                    item.legality,
                    item.attributes,
                    item.cost,
                    item.type,
                    item.slot || null,
                    item.rarity || 'Common',
                    item.extra_data
                );
            }
        });

        insertMany(items);

        Logger.info('Seed', `Successfully seeded ${items.length} items into the database.`);

        // Verify
        const count = db.prepare('SELECT COUNT(*) as count FROM items').get() as { count: number };
        Logger.info('Seed', `Total items in database: ${count.count}`);

    } catch (err) {
        Logger.error('Seed', 'Failed to seed database', err);
        throw err;
    } finally {
        db.close();
    }
}

// Run if called directly
if (require.main === module) {
    seedDatabase();
    console.log('Database seeding complete!');
}
