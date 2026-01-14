import { Entity } from '../../ecs/Entity';
import { Stats } from '../../components/Stats';
import { CombatStats } from '../../components/CombatStats';
import { Weapon } from '../../components/Weapon';
import { Inventory } from '../../components/Inventory';
import { Stance, StanceType } from '../../components/Stance';
import { Armor } from '../../components/Armor';
import { IEngine } from '../../ecs/IEngine';
import { WorldQuery } from '../../utils/WorldQuery';
import { EngagementTier } from '../../types/CombatTypes';

export type HitType = 'crushing' | 'solid' | 'marginal' | 'miss';

export class CombatCalculator {
    static calculateAttackerPower(attacker: Entity, weapon: Weapon, skillName: string): number {
        const stats = attacker.getComponent(Stats);
        const combatStats = attacker.getComponent(CombatStats);
        if (!stats || !combatStats) return 0;

        // Use Brawling skill for brawling weapons
        const effectiveSkillName = weapon.category === 'brawling' ? 'Brawling' : skillName;
        const skill = stats.skills.get(effectiveSkillName)?.level || 1;
        const agi = stats.attributes.get('AGI')?.value || 10;
        const balance = combatStats.balance;

        // Attacker_Power = (Skill * 0.6) + (Agility * 0.4) + (Current_Balance * 20)
        const power = (skill * 0.6) + (agi * 0.4) + (balance * 20);
        console.log(`[CombatDebug] AttackerPower: Skill(${effectiveSkillName})=${skill}, AGI=${agi}, Bal=${balance} => Power=${power}`);
        return power;
    }

    static calculateDefenderPower(defender: Entity, engine: IEngine, attackType: 'MELEE' | 'RANGED' = 'MELEE'): number {
        const stats = defender.getComponent(Stats);
        const combatStats = defender.getComponent(CombatStats);
        if (!stats || !combatStats) return 0;

        const agi = stats.attributes.get('AGI')?.value || 10;
        const balance = combatStats.balance;

        // Base skills
        const evasionSkill = stats.skills.get('Evasion')?.level || 1;

        // Determine Parry Skill
        let parrySkill = stats.skills.get('Melee Combat')?.level || 1;
        const inventory = defender.getComponent(Inventory);
        if (inventory && inventory.rightHand) {
            const weaponEntity = WorldQuery.getEntityById(engine, inventory.rightHand);
            if (weaponEntity) {
                const weapon = weaponEntity.getComponent(Weapon);
                if (weapon && weapon.name.toLowerCase().includes('katana')) {
                    parrySkill = stats.skills.get('Kenjutsu')?.level || 1;
                }
            }
        }
        const shieldSkill = stats.skills.get('Shield Usage')?.level || 1;

        // Effective Defense = Weighted sum of defenses based on allocation
        let effectiveDefense = 0;

        // Evasion (Always applicable)
        const evasionVal = (evasionSkill * 0.6) + (agi * 0.4);
        effectiveDefense += evasionVal * (combatStats.evasion / 100);

        if (attackType === 'MELEE') {
            // Parry (Only vs Melee)
            const parryVal = (parrySkill * 0.6) + (agi * 0.4);
            effectiveDefense += parryVal * (combatStats.parry / 100);
        }

        // Shield (Applicable vs Both)
        const shieldVal = (shieldSkill * 0.6) + (agi * 0.4);
        effectiveDefense += shieldVal * (combatStats.shield / 100);

        // Balance modifier
        let power = effectiveDefense + (balance * 20);

        // Physical Stance Penalty
        const physicalStance = defender.getComponent(Stance);
        if (physicalStance) {
            if (physicalStance.current === StanceType.Sitting) {
                power *= 0.75; // 25% penalty
            } else if (physicalStance.current === StanceType.Lying) {
                power *= 0.5; // 50% penalty
            }
        }

        // Natural Armor / Base Defense
        power += combatStats.defense;

        // Equipment Armor
        if (inventory) {
            for (const [slot, itemId] of inventory.equipment) {
                const itemEntity = WorldQuery.getEntityById(engine, itemId);
                const armor = itemEntity?.getComponent(Armor);
                if (armor) {
                    power += armor.defense;
                    // Apply penalty to power (representing agility loss)
                    if (armor.penalty > 0) {
                        power -= armor.penalty;
                    }
                }
            }
        }

        return power;
    }

    static determineHitType(margin: number): HitType {
        if (margin > 15) return 'crushing';
        if (margin > 0) return 'solid';
        if (margin > -10) return 'marginal';
        return 'miss';
    }

    static createBrawlingWeapon(move: string): Weapon {
        const weapon = new Weapon("Fists", "brawling", 5, 0);
        weapon.range = 0;
        weapon.minTier = EngagementTier.CLOSE_QUARTERS;
        weapon.maxTier = EngagementTier.CLOSE_QUARTERS;

        switch (move.toLowerCase()) {
            case 'punch':
                weapon.name = "Fists (Punch)";
                weapon.damage = 5;
                weapon.difficulty = { speed: 1.0, zoneSize: 5, jitter: 0.5 };
                weapon.roundtime = 3;
                break;
            case 'jab':
                weapon.name = "Fists (Jab)";
                weapon.damage = 3;
                weapon.difficulty = { speed: 1.2, zoneSize: 6, jitter: 0.3 };
                weapon.roundtime = 2;
                break;
            case 'uppercut':
                weapon.name = "Fists (Uppercut)";
                weapon.damage = 8;
                weapon.difficulty = { speed: 0.8, zoneSize: 4, jitter: 0.7 };
                weapon.roundtime = 4;
                break;
            case 'headbutt':
                weapon.name = "Headbutt";
                weapon.damage = 10;
                weapon.difficulty = { speed: 0.6, zoneSize: 3, jitter: 1.0 };
                weapon.roundtime = 4;
                break;
        }
        return weapon;
    }
}
