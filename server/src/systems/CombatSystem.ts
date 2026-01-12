import { System } from '../ecs/System';
import { Entity } from '../ecs/Entity';
import { CombatStats } from '../components/CombatStats';
import { Stats } from '../components/Stats';
import { Weapon } from '../components/Weapon';
import { Magazine } from '../components/Magazine';
import { Position } from '../components/Position';
import { NPC } from '../components/NPC';
import { Inventory } from '../components/Inventory';
import { Item } from '../components/Item';
import { Container } from '../components/Container';
import { Stance, StanceType } from '../components/Stance';
import { Server } from 'socket.io';
import { Engine } from '../ecs/Engine';
import { WorldQuery } from '../utils/WorldQuery';
import { IEngine } from '../commands/CommandRegistry';
import { PrefabFactory } from '../factories/PrefabFactory';
import { BodyPart, EngagementTier } from '../types/CombatTypes';
import { WoundTable } from '../components/WoundTable';
import { IsCyberspace } from '../components/IsCyberspace';
import { IsPersona } from '../components/IsPersona';
import { Roundtime } from '../components/Roundtime';

interface CriticalEffect {
    name: string;
    alert: string;
    description: string;
    apply: (target: Entity, source: Entity, skillLevel: number) => string;
}

import { MessageService } from '../services/MessageService';
import { AutomatedAction } from '../components/AutomatedAction';

export class CombatSystem extends System {
    private engine: IEngine;
    private io: Server;
    private messageService: MessageService;

    constructor(engine: IEngine, io: Server, messageService: MessageService) {
        super();
        this.engine = engine;
        this.io = io;
        this.messageService = messageService;
    }

    private critTable: CriticalEffect[] = [
        {
            name: "Neural Feedback",
            alert: "[!! SYNAPSE FRY !!]",
            description: "Stuns the target, scrambling their neural interface.",
            apply: (target, source, skillLevel) => {
                const duration = 1 + Math.floor(skillLevel / 5);
                return `Target stunned for ${duration} rounds!`;
            }
        },
        {
            name: "Optic Glitch",
            alert: "[!! VISUAL ERROR !!]",
            description: "Corrupts target's visual feed, reducing accuracy.",
            apply: (target, source, skillLevel) => {
                const intensity = 10 + skillLevel * 2;
                return `Target's targeting sensors scrambled! Accuracy -${intensity}%`;
            }
        },
        {
            name: "Armor Shred",
            alert: "[!! HULL BREACH !!]",
            description: "Permanently damages the target's protective plating.",
            apply: (target, source, skillLevel) => {
                const stats = target.getComponent(CombatStats);
                if (stats) {
                    const shred = 2 + Math.floor(skillLevel / 3);
                    stats.defense = Math.max(0, stats.defense - shred);
                    return `Armor stripped! Defense reduced by ${shred}.`;
                }
                return "Target has no armor to shred.";
            }
        },
        {
            name: "Ammo Cook-off",
            alert: "[!! THERMAL CRIT !!]",
            description: "Superheats the target's ammunition or power cells.",
            apply: (target, source, skillLevel) => {
                const damage = 5 + skillLevel;
                const stats = target.getComponent(CombatStats);
                if (stats) {
                    stats.hp -= damage;
                }
                return `Ammo explosion! Target takes ${damage} fire damage.`;
            }
        },
        {
            name: "Actuator Lock",
            alert: "[!! MOTOR SEIZE !!]",
            description: "Jams the target's movement servos.",
            apply: (target, source, skillLevel) => {
                const stats = target.getComponent(Stats);
                if (stats) {
                    const agiAttr = stats.attributes.get('AGI');
                    if (agiAttr) {
                        const reduction = 2 + Math.floor(skillLevel / 4);
                        agiAttr.value = Math.max(1, agiAttr.value - reduction);
                        return `Servos locked! Agility reduced by ${reduction}.`;
                    }
                }
                return "Target's movement systems unaffected.";
            }
        }
    ];

    resolveCrit(target: Entity, source: Entity, weapon: Weapon, skillLevel: number): string {
        // Legacy crit table - we'll keep it for flavor but integrate with the new system
        const roll = Math.floor(Math.random() * this.critTable.length);
        const effect = this.critTable[roll];

        let log = `\n${effect.alert}\n`;
        log += effect.apply(target, source, skillLevel);

        return log;
    }

    private calculateAttackerPower(attacker: Entity, weapon: Weapon, skillName: string): number {
        const stats = attacker.getComponent(Stats);
        const combatStats = attacker.getComponent(CombatStats);
        if (!stats || !combatStats) return 0;

        const skill = stats.skills.get(skillName)?.level || 1;
        const agi = stats.attributes.get('AGI')?.value || 10;
        const balance = combatStats.balance;

        // Attacker_Power = (Skill * 0.6) + (Agility * 0.4) + (Current_Balance * 20)
        return (skill * 0.6) + (agi * 0.4) + (balance * 20);
    }

    private calculateDefenderPower(defender: Entity, attackType: 'MELEE' | 'RANGED' = 'MELEE'): number {
        const stats = defender.getComponent(Stats);
        const combatStats = defender.getComponent(CombatStats);
        if (!stats || !combatStats) return 0;

        const agi = stats.attributes.get('AGI')?.value || 10;
        const balance = combatStats.balance;

        // Base skills
        const evasionSkill = stats.skills.get('Evasion')?.level || 1;
        const parrySkill = stats.skills.get('Melee Combat')?.level || 1; // Using Melee Combat for Parry
        const shieldSkill = stats.skills.get('Shield Usage')?.level || 1; // Assuming Shield Usage skill exists

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

        // Shield (Applicable vs Both, but better vs Ranged if specialized)
        const shieldVal = (shieldSkill * 0.6) + (agi * 0.4); // Should use STR for shield? Sticking to AGI for now
        effectiveDefense += shieldVal * (combatStats.shield / 100);

        // Balance modifier
        return effectiveDefense + (balance * 20);
    }

    private applyWoundToTarget(target: Entity, part: BodyPart, level: number): string {
        const woundTable = target.getComponent(WoundTable);
        const isCyberspace = target.getComponent(IsCyberspace) || target.getComponent(IsPersona);
        if (!woundTable) return "";

        let mappedPart = part;
        if (isCyberspace) {
            // Neural Feedback: Map physical limbs to digital components
            if (part === BodyPart.Head || part === BodyPart.Eyes) mappedPart = 'Logic_Processor' as any;
            else mappedPart = 'Memory_Address' as any;
        }

        woundTable.applyWound(mappedPart, level);
        const wound = woundTable.getWound(mappedPart);

        let effectLog = `\n[WOUND] ${mappedPart}: Level ${wound?.level}`;

        if (isCyberspace) {
            effectLog = `\n[NEURAL FEEDBACK] ${mappedPart} corrupted! Level ${wound?.level}`;
        }

        // Apply functional penalties (simplified for now)
        if (level >= 8 && (part === BodyPart.Head || mappedPart === ('Logic_Processor' as any))) {
            effectLog += "\n[STUN] Target is dazed!";
        } else if (part === BodyPart.R_Arm || part === BodyPart.L_Arm) {
            effectLog += `\n[PENALTY] Accuracy reduced!`;
        }

        return effectLog;
    }

    handleAttack(attackerId: string, targetName: string, engine: IEngine): void {
        if (!this.checkRoundtime(attackerId, engine)) return;

        const attacker = WorldQuery.getEntityById(engine, attackerId);
        if (!attacker) return;

        const combatStats = attacker.getComponent(CombatStats);
        if (combatStats) {
            if (combatStats.fatigue < 2) {
                this.messageService.info(attackerId, "You are too exhausted to attack!");
                return;
            }
            combatStats.fatigue -= 2;
        }

        // Turing Police Special Ability: Command_Shutdown
        const npcComp = attacker.getComponent(NPC);
        if (npcComp && npcComp.tag === 'turing' && Math.random() < 0.2) { // 20% chance to use special
            // Find target entity
            const targetEntity = engine.getEntitiesWithComponent(CombatStats).find(e => {
                const pos = e.getComponent(Position);
                const pPos = attacker.getComponent(Position);
                // Simple check: is it a player? (no NPC component) and in same room
                return !e.hasComponent(NPC) && pos?.x === pPos?.x && pos?.y === pPos?.y;
            });

            if (targetEntity) {
                this.messageService.combat(targetEntity.id, `\n[COMBAT] ${npcComp.typeName} points a device at you and initiates COMMAND_SHUTDOWN!`);
                this.applyRoundtime(targetEntity.id, 10, engine);
                this.messageService.system(targetEntity.id, "[SYSTEM] MOTOR FUNCTIONS SUSPENDED. REBOOTING...");
                return; // Consumes action
            }
        }

        const attackerPos = attacker.getComponent(Position);
        const stance = attacker.getComponent(Stance);
        if (!attackerPos) {
            this.messageService.info(attackerId, "You don't have a position.");
            return;
        }

        if (stance && stance.current !== StanceType.Standing) {
            this.messageService.info(attackerId, `You can't attack while ${stance.current}!`);
            return;
        }

        // Find target NPC in the same room
        const target = engine.getEntitiesWithComponent(NPC).find(e => {
            const npc = e.getComponent(NPC);
            const pos = e.getComponent(Position);
            if (!npc || !pos) return false;
            return npc.typeName.toLowerCase().includes(targetName.toLowerCase()) &&
                pos.x === attackerPos.x && pos.y === attackerPos.y;
        });

        if (!target) {
            this.messageService.info(attackerId, `You don't see "${targetName}" here.`);
            return;
        }

        const targetNPC = target.getComponent(NPC);
        const targetCombatStats = target.getComponent(CombatStats);

        if (!targetCombatStats) {
            this.messageService.info(attackerId, `You can't attack ${targetNPC?.typeName || 'that'}.`);
            return;
        }

        // Set NPC to hostile when attacked
        targetCombatStats.isHostile = true;

        // Get attacker's weapon and stats
        const attackerInventory = attacker.getComponent(Inventory);
        const attackerStats = attacker.getComponent(Stats);
        const attackerCombatStats = attacker.getComponent(CombatStats);

        if (!attackerInventory || !attackerStats || !attackerCombatStats) {
            this.messageService.info(attackerId, "You're not ready for combat.");
            return;
        }

        // Get weapon from right hand
        let weaponEntity: Entity | undefined;
        let weapon: Weapon | undefined;

        if (attackerInventory.rightHand) {
            weaponEntity = WorldQuery.getEntityById(engine, attackerInventory.rightHand);
            weapon = weaponEntity?.getComponent(Weapon);
        }

        if (!weapon) {
            this.messageService.info(attackerId, "You need a weapon in your right hand to attack!");
            return;
        }

        // Check ammo for ranged weapons and reload if needed
        if (weapon.range > 0 && weapon.currentAmmo <= 0) {
            // Try to find a magazine to reload
            const magEntity = this.findMagazine(attacker, engine, weapon.ammoType || "9mm");

            if (!magEntity) {
                this.messageService.info(attackerId, `Your ${weapon.name} is out of ammo and you have no magazines!`);
                return;
            }

            // Reload from magazine
            const magItem = magEntity.getComponent(Item);
            if (magItem && magItem.quantity > 0) {
                weapon.currentAmmo = weapon.magSize;
                magItem.quantity--;

                // Remove magazine entity if depleted
                if (magItem.quantity <= 0) {
                    this.removeFromContainer(attacker, magEntity.id, engine);
                }

                this.messageService.system(attackerId, `Reloading ${weapon.name}... [${magItem.quantity} mags left]`);
                return; // Reloading consumes the action
            }
        }

        // Calculate sync bar parameters based on weapon and skills
        const agiAttr = attackerStats.attributes.get('AGI');
        const agility = agiAttr?.value || 10;
        const skillLevel = attackerStats.skills.get('Marksmanship (Light)')?.level || 1;

        // Weapon difficulty modifies the sync bar
        const baseSpeed = weapon.difficulty.speed;
        const baseZoneSize = weapon.difficulty.zoneSize;
        const jitter = weapon.difficulty.jitter;

        // AGI makes crit zone wider (easier)
        const critZoneSize = Math.floor(baseZoneSize + (agility - 10) / 5);

        // Skill level slows down cursor speed (easier)
        const cursorSpeed = baseSpeed * (1 - (skillLevel * 0.05));

        // Check Engagement Tier compatibility
        const tiers = Object.values(EngagementTier);
        const currentTierIndex = tiers.indexOf(attackerCombatStats.engagementTier);
        const minTierIndex = tiers.indexOf(weapon.minTier);
        const maxTierIndex = tiers.indexOf(weapon.maxTier);

        if (currentTierIndex < minTierIndex || currentTierIndex > maxTierIndex) {
            this.messageService.info(attackerId, `Your ${weapon.name} is not effective at ${attackerCombatStats.engagementTier} range! You need to MANEUVER.`);
            return;
        }

        // Send sync bar challenge to client
        this.io.to(attackerId).emit('combat-sync', {
            targetId: target.id,
            targetName: targetNPC?.typeName || 'Target',
            weaponName: weapon.name,
            syncBar: {
                speed: cursorSpeed,
                critZoneSize: critZoneSize,
                jitter: jitter,
                barLength: 20
            }
        });

        // Apply Roundtime for attack (3 seconds base)
        this.applyRoundtime(attackerId, 3, engine);
    }

    handleSyncResult(attackerId: string, targetId: string, hitType: 'crit' | 'hit' | 'miss', engine: IEngine): void {
        const attacker = WorldQuery.getEntityById(engine, attackerId);
        const target = WorldQuery.getEntityById(engine, targetId);

        if (!attacker || !target) return;

        const targetNPC = target.getComponent(NPC);
        const targetCombatStats = target.getComponent(CombatStats);
        const attackerCombatStats = attacker.getComponent(CombatStats);
        const attackerInventory = attacker.getComponent(Inventory);
        const attackerStats = attacker.getComponent(Stats);

        if (!targetCombatStats || !attackerCombatStats || !attackerInventory || !attackerStats) return;

        // Get weapon
        let weaponEntity: Entity | undefined;
        let weapon: Weapon | undefined;

        if (attackerInventory.rightHand) {
            weaponEntity = WorldQuery.getEntityById(engine, attackerInventory.rightHand);
            weapon = weaponEntity?.getComponent(Weapon);
        }

        if (!weapon) return;

        // Determine skill name based on weapon (simplified)
        const skillName = weapon.range > 0 ? 'Marksmanship (Light)' : 'Melee Combat';

        // Calculate Powers
        const attackType = weapon.range > 0 ? 'RANGED' : 'MELEE';
        const attackerPower = this.calculateAttackerPower(attacker, weapon, skillName);
        const defenderPower = this.calculateDefenderPower(target, attackType);

        // Result Ladder Logic
        const margin = attackerPower - defenderPower;
        let combatLog = `\n<combat>You attack ${targetNPC?.typeName || 'the target'} with your ${weapon.name}!</combat>\n`;

        // Adjust hitType based on margin if it wasn't a mechanical miss
        let effectiveHitType: 'marginal' | 'solid' | 'crushing' | 'miss' = 'miss';

        if (hitType !== 'miss') {
            if (margin > 15 || hitType === 'crit') {
                effectiveHitType = 'crushing';
            } else if (margin > 0) {
                effectiveHitType = 'solid';
            } else {
                effectiveHitType = 'marginal';
            }
        }

        switch (effectiveHitType) {
            case 'crushing':
                const crushingDamage = Math.floor(weapon.damage * 1.0);
                targetCombatStats.hp -= crushingDamage;
                attackerCombatStats.balance = Math.min(1.0, attackerCombatStats.balance + 0.1);
                targetCombatStats.balance = Math.max(0.0, targetCombatStats.balance - 0.2);

                combatLog += `<combat-hit>[CRUSHING] You deal ${crushingDamage} damage!</combat-hit>`;

                // Apply Wound
                const targetPart = attackerCombatStats.targetLimb || BodyPart.Chest;
                combatLog += this.applyWoundToTarget(target, targetPart, 5);
                combatLog += "\n[STUN] Target is reeling!";
                break;

            case 'solid':
                const solidDamage = Math.floor(weapon.damage * 0.5);
                targetCombatStats.hp -= solidDamage;
                targetCombatStats.balance = Math.max(0.0, targetCombatStats.balance - 0.05);

                combatLog += `<combat-hit>[SOLID] You deal ${solidDamage} damage!</combat-hit>`;
                combatLog += `\nTarget loses balance!`;
                break;

            case 'marginal':
                const marginalDamage = Math.floor(weapon.damage * 0.1);
                targetCombatStats.hp -= marginalDamage;
                attackerCombatStats.balance = Math.min(1.0, attackerCombatStats.balance + 0.05);

                combatLog += `<combat-hit>[MARGINAL] You deal ${marginalDamage} damage.</combat-hit>`;
                combatLog += `\nYou regain some momentum.`;
                break;

            case 'miss':
                combatLog += `<combat-miss>You miss!</combat-miss>`;
                attackerCombatStats.balance = Math.max(0.0, attackerCombatStats.balance - 0.1);
                break;
        }

        // Consume ammo
        if (weapon.range > 0) {
            weapon.currentAmmo--;
            combatLog += `\n[${weapon.currentAmmo}/${weapon.magSize} rounds remaining]`;
        }

        // Update Skill XP
        const skill = attackerStats.skills.get(skillName);
        if (skill) {
            skill.uses += effectiveHitType === 'crushing' ? 5 : (effectiveHitType === 'miss' ? 0 : 1);
            this.checkSkillLevelUp(attackerId, skill);
        }

        combatLog += `\n</combat>`;

        // Check if target is dead
        if (targetCombatStats.hp <= 0) {
            combatLog += `\n<combat-death>${targetNPC?.typeName || 'Target'} has been eliminated!</combat-death>`;

            // Loot Drop Logic
            const inventory = target.getComponent(Inventory);
            if (inventory && Math.random() < 0.2) { // 20% chance to drop items
                const dropItem = (itemId: string | null) => {
                    if (!itemId) return;
                    const itemEntity = WorldQuery.getEntityById(engine, itemId);
                    if (itemEntity) {
                        const itemPos = itemEntity.getComponent(Position) || new Position(0, 0);
                        const targetPos = target.getComponent(Position);
                        if (targetPos) {
                            itemPos.x = targetPos.x;
                            itemPos.y = targetPos.y;
                            itemEntity.addComponent(itemPos); // Ensure it has position
                            this.messageService.info(attackerId, `The ${targetNPC?.typeName} drops a ${itemEntity.getComponent(Item)?.name}!`);
                        }
                    }
                };

                dropItem(inventory.rightHand);
                dropItem(inventory.leftHand);
                inventory.equipment.forEach(id => dropItem(id));

                // Clear inventory so they don't drop it again if revived (not that they revive yet)
                inventory.rightHand = null;
                inventory.leftHand = null;
                inventory.equipment.clear();
            }

            this.engine.removeEntity(target.id);
        } else {
            combatLog += `\n<combat>${targetNPC?.typeName || 'Target'}: ${targetCombatStats.hp}/${targetCombatStats.maxHp} HP | Balance: ${Math.floor(targetCombatStats.balance * 100)}%</combat>`;
        }

        this.messageService.combat(attackerId, combatLog);
    }

    private checkSkillLevelUp(entityId: string, skill: { name: string, level: number, uses: number, maxUses: number }) {
        if (skill.uses >= skill.maxUses) {
            skill.level++;
            skill.uses -= skill.maxUses;
            skill.maxUses = Math.floor(skill.maxUses * 1.5); // Increase difficulty
            this.messageService.success(entityId, `*** Your ${skill.name} skill has increased to level ${skill.level}! ***`);
        }
    }


    handleCheckAmmo(playerId: string, engine: IEngine): void {
        const player = WorldQuery.getEntityById(engine, playerId);
        if (!player) return;

        const inventory = player.getComponent(Inventory);
        if (!inventory || !inventory.rightHand) {
            this.messageService.info(playerId, "You aren't holding a weapon.");
            return;
        }

        const weaponEntity = WorldQuery.getEntityById(engine, inventory.rightHand);
        const weapon = weaponEntity?.getComponent(Weapon);

        if (!weapon) {
            this.messageService.info(playerId, "That's not a weapon.");
            return;
        }

        if (weapon.range === 0) {
            this.messageService.info(playerId, "It's a melee weapon. It doesn't use ammo.");
            return;
        }

        this.messageService.info(playerId, `Your ${weapon.name} has ${weapon.currentAmmo}/${weapon.magSize} rounds remaining.`);
    }

    handleReload(playerId: string, engine: IEngine): void {
        if (!this.checkRoundtime(playerId, engine)) return;

        const player = WorldQuery.getEntityById(engine, playerId);
        if (!player) return;

        const inventory = player.getComponent(Inventory);
        if (!inventory || !inventory.rightHand) {
            this.messageService.info(playerId, "You need to be holding a weapon to reload it.");
            return;
        }

        const weaponEntity = WorldQuery.getEntityById(engine, inventory.rightHand);
        const weapon = weaponEntity?.getComponent(Weapon);

        if (!weapon) {
            this.messageService.info(playerId, "That's not a weapon.");
            return;
        }

        if (weapon.range === 0) {
            this.messageService.info(playerId, "You can't reload a melee weapon.");
            return;
        }

        // Find a magazine
        const magEntity = this.findMagazine(player, engine, weapon.magazineType || weapon.ammoType || "9mm", true); // true = exclude backpack

        if (!magEntity) {
            const needed = weapon.magazineType || `${weapon.ammoType} magazine`;
            this.messageService.info(playerId, `You don't have any ${needed} handy (check your belt, pockets, or the ground).`);
            return;
        }

        // Reload logic
        const magComp = magEntity.getComponent(Magazine);
        const magItem = magEntity.getComponent(Item);

        if (magComp && magComp.currentAmmo > 0) {
            const oldAmmo = weapon.currentAmmo;
            weapon.currentAmmo = magComp.currentAmmo;

            // In this physicalized system, we swap the magazine.
            // For now, let's just "consume" the magazine item if it's treated as a consumable,
            // OR if it's a real magazine entity, we should probably handle the swap.
            // The user said "each should be physicalized".

            // If it's a magazine item with quantity > 1, we decrement quantity and create a "spent" mag?
            // Or just treat 1 quantity = 1 magazine.
            if (magItem) {
                magItem.quantity--;
                if (magItem.quantity <= 0) {
                    const isOnGround = !this.isItemInInventory(player, magEntity.id, engine);
                    if (isOnGround) {
                        engine.removeEntity(magEntity.id);
                    } else {
                        this.removeFromContainer(player, magEntity.id, engine);
                    }
                }
            }

            this.messageService.success(playerId, `You slap a fresh ${magComp.name} into your ${weapon.name}. (${oldAmmo} -> ${weapon.currentAmmo})`);
            this.applyRoundtime(playerId, 3, engine);
        } else if (magItem && magItem.quantity > 0) {
            // Fallback for legacy items without Magazine component
            const oldAmmo = weapon.currentAmmo;
            weapon.currentAmmo = weapon.magSize;
            magItem.quantity--;

            if (magItem.quantity <= 0) {
                const isOnGround = !this.isItemInInventory(player, magEntity.id, engine);
                if (isOnGround) {
                    engine.removeEntity(magEntity.id);
                } else {
                    this.removeFromContainer(player, magEntity.id, engine);
                }
            }

            this.messageService.success(playerId, `You reload your ${weapon.name}. (${oldAmmo} -> ${weapon.currentAmmo})`);
            this.applyRoundtime(playerId, 3, engine);
        }
    }

    private isItemInInventory(player: Entity, itemId: string, engine: IEngine): boolean {
        const inventory = player.getComponent(Inventory);
        if (!inventory) return false;

        // Check hands
        if (inventory.rightHand === itemId || inventory.leftHand === itemId) return true;

        // Check containers
        for (const [slot, equipId] of inventory.equipment) {
            const equip = WorldQuery.getEntityById(engine, equipId);
            const container = equip?.getComponent(Container);
            if (container && container.items.includes(itemId)) return true;
        }
        return false;
    }

    private findMagazine(attacker: Entity, engine: IEngine, magType: string, excludeBackpack: boolean = false): Entity | null {
        const inventory = attacker.getComponent(Inventory);
        const pos = attacker.getComponent(Position);

        // 1. Search Inventory (Belt, Pockets, etc.)
        if (inventory) {
            for (const [slot, equipId] of inventory.equipment) {
                if (excludeBackpack && slot === 'back') continue; // Skip backpack if requested

                const equip = WorldQuery.getEntityById(engine, equipId);
                const container = equip?.getComponent(Container);

                if (container) {
                    for (const itemId of container.items) {
                        const item = WorldQuery.getEntityById(engine, itemId);
                        const itemComp = item?.getComponent(Item);
                        const magComp = item?.getComponent(Magazine);

                        if (magComp) {
                            // Match by Magazine component name or ammoType
                            if (magComp.name.toLowerCase().includes(magType.toLowerCase()) ||
                                magComp.ammoType.toLowerCase() === magType.toLowerCase()) {
                                if (magComp.currentAmmo > 0) return item || null;
                            }
                        } else if (itemComp && itemComp.quantity > 0) {
                            // Fallback for items without Magazine component
                            if (itemComp.name.toLowerCase().includes(magType.toLowerCase()) ||
                                itemComp.description.toLowerCase().includes(magType.toLowerCase())) {
                                return item || null;
                            }
                        }
                    }
                }
            }
        }

        // 2. Search Ground
        if (pos) {
            const roomEntities = engine.getEntitiesWithComponent(Item);
            for (const entity of roomEntities) {
                const itemPos = entity.getComponent(Position);
                const itemComp = entity.getComponent(Item);
                const magComp = entity.getComponent(Magazine);

                if (itemPos && itemPos.x === pos.x && itemPos.y === pos.y) {
                    if (magComp) {
                        if (magComp.name.toLowerCase().includes(magType.toLowerCase()) ||
                            magComp.ammoType.toLowerCase() === magType.toLowerCase()) {
                            if (magComp.currentAmmo > 0) return entity;
                        }
                    } else if (itemComp && itemComp.quantity > 0) {
                        if (itemComp.name.toLowerCase().includes(magType.toLowerCase()) ||
                            itemComp.description.toLowerCase().includes(magType.toLowerCase())) {
                            return entity;
                        }
                    }
                }
            }
        }

        return null;
    }

    private removeFromContainer(attacker: Entity, itemId: string, engine: IEngine): void {
        const inventory = attacker.getComponent(Inventory);
        if (!inventory) return;

        // Find and remove from container
        for (const [slot, equipId] of inventory.equipment) {
            const equip = WorldQuery.getEntityById(engine, equipId);
            const container = equip?.getComponent(Container);

            if (container) {
                const index = container.items.indexOf(itemId);
                if (index > -1) {
                    container.items.splice(index, 1);
                    const item = WorldQuery.getEntityById(engine, itemId)?.getComponent(Item);
                    if (item) {
                        container.currentWeight -= item.weight;
                    }
                    this.engine.removeEntity(itemId);
                    return;
                }
            }
        }
    }

    update(engine: IEngine, deltaTime: number): void {
        // 1. Process Automated Actions
        const automatedEntities = engine.getEntitiesWithComponent(AutomatedAction);
        for (const entity of automatedEntities) {
            const action = entity.getComponent(AutomatedAction);
            if (!action) continue;

            // Check if entity is in Roundtime
            if (!this.checkRoundtime(entity.id, engine, true)) continue; // If we CANNOT act, skip

            // Validate Target
            const target = WorldQuery.getEntityById(engine, action.targetId);
            if (!target) {
                this.messageService.info(entity.id, "Target lost. Stopping action.");
                entity.removeComponent(AutomatedAction);
                continue;
            }

            // Check if target is still in same room
            const pos = entity.getComponent(Position);
            const targetPos = target.getComponent(Position);
            if (!pos || !targetPos || pos.x !== targetPos.x || pos.y !== targetPos.y) {
                this.messageService.info(entity.id, "Target is no longer here. Stopping action.");
                entity.removeComponent(AutomatedAction);
                continue;
            }

            // Perform Action
            if (action.type === 'ADVANCE') {
                const result = this.performManeuver(entity, target, 'CLOSE', engine);
                if (result === 'MAX_RANGE' || result === 'FAIL_STOP') {
                    entity.removeComponent(AutomatedAction);
                    this.messageService.info(entity.id, "You stop advancing.");
                }
            } else if (action.type === 'RETREAT') {
                const result = this.performManeuver(entity, target, 'WITHDRAW', engine);
                if (result === 'MAX_RANGE' || result === 'FAIL_STOP') {
                    entity.removeComponent(AutomatedAction);
                    this.messageService.info(entity.id, "You stop retreating.");
                }
            }
        }

        // 2. Process Combat Stats (Regen, RT)
        const entities = engine.getEntitiesWithComponent(CombatStats);

        entities.forEach(entity => {
            const stats = entity.getComponent(CombatStats);
            const playerStats = entity.getComponent(Stats);

            if (stats && playerStats) {
                // Balance regens over time (0.05 per second)
                if (stats.balance < 1.0) {
                    const regenRate = 0.05 * (deltaTime / 1000);
                    stats.balance = Math.min(1.0, stats.balance + regenRate);
                }

                // Fatigue Regeneration
                // Base regen: 2 per second + (CON / 10)
                const con = playerStats.attributes.get('CON')?.value || 10;
                const maxFatigue = con * 10; // Max Fatigue = CON * 10

                // If not exerting (simplified: always regen for now, actions reduce it)
                if (stats.fatigue < maxFatigue) {
                    const fatigueRegen = (2 + (con / 10)) * (deltaTime / 1000);
                    stats.fatigue = Math.min(maxFatigue, stats.fatigue + fatigueRegen);
                }

                // Exhaustion Check
                if (stats.fatigue <= 0) {
                    stats.balance = Math.min(0.5, stats.balance); // Cap balance at 50% when exhausted
                }
            }

            // Update Roundtime
            const rt = entity.getComponent(Roundtime);
            if (rt && rt.secondsRemaining > 0) {
                rt.secondsRemaining -= deltaTime / 1000;
                if (rt.secondsRemaining < 0) rt.secondsRemaining = 0;
            }
        });
    }

    handleStop(playerId: string, engine: IEngine) {
        const player = WorldQuery.getEntityById(engine, playerId);
        if (!player) return;

        if (player.hasComponent(AutomatedAction)) {
            player.removeComponent(AutomatedAction);
            this.messageService.info(playerId, "You stop your actions.");
        } else {
            this.messageService.info(playerId, "You aren't doing anything automatically.");
        }
    }



    handleAdvance(playerId: string, targetName: string, engine: IEngine) {
        this.initiateAutomatedManeuver(playerId, targetName, 'ADVANCE', engine);
    }

    handleRetreat(playerId: string, targetName: string, engine: IEngine) {
        this.initiateAutomatedManeuver(playerId, targetName, 'RETREAT', engine);
    }

    private initiateAutomatedManeuver(playerId: string, targetName: string, type: 'ADVANCE' | 'RETREAT', engine: IEngine) {
        const player = WorldQuery.getEntityById(engine, playerId);
        if (!player) return;

        // Find target
        const roomEntities = engine.getEntitiesWithComponent(NPC);
        let target: Entity | undefined;

        if (targetName) {
            target = roomEntities.find(e => {
                const pos = e.getComponent(Position);
                const pPos = player.getComponent(Position);
                const npc = e.getComponent(NPC);
                return pos?.x === pPos?.x && pos?.y === pPos?.y &&
                    npc?.typeName.toLowerCase().includes(targetName.toLowerCase());
            });
        } else {
            // Default: Assume engaged target or closest hostile
            const stats = player.getComponent(CombatStats);
            target = roomEntities.find(e => {
                const pos = e.getComponent(Position);
                const pPos = player.getComponent(Position);
                const tStats = e.getComponent(CombatStats);
                // Prefer target we are engaged with
                return pos?.x === pPos?.x && pos?.y === pPos?.y && tStats?.engagementTier === stats?.engagementTier && stats?.engagementTier !== EngagementTier.DISENGAGED;
            });

            if (!target) {
                // Fallback to any NPC
                target = roomEntities.find(e => {
                    const pos = e.getComponent(Position);
                    const pPos = player.getComponent(Position);
                    return pos?.x === pPos?.x && pos?.y === pPos?.y;
                });
            }
        }

        if (!target) {
            this.messageService.info(playerId, "You don't see them here.");
            return;
        }

        player.addComponent(new AutomatedAction(type, target.id));
        this.messageService.info(playerId, `You begin to ${type.toLowerCase()} on ${target.getComponent(NPC)?.typeName}...`);

        // Try immediately if not in RT
        if (this.checkRoundtime(playerId, engine, true)) {
            const result = this.performManeuver(player, target, type === 'ADVANCE' ? 'CLOSE' : 'WITHDRAW', engine);
            if (result === 'MAX_RANGE' || result === 'FAIL_STOP') {
                player.removeComponent(AutomatedAction);
            }
        }
    }

    handleManeuver(playerId: string, direction: 'CLOSE' | 'WITHDRAW', engine: IEngine, targetName?: string): void {
        if (!this.checkRoundtime(playerId, engine)) return;

        const player = WorldQuery.getEntityById(engine, playerId);
        if (!player) return;

        // Find target logic (duplicated from above, could be extracted but keeping simple for now)
        const roomEntities = engine.getEntitiesWithComponent(NPC);
        let target: Entity | undefined;

        if (targetName) {
            target = roomEntities.find(e => {
                const pos = e.getComponent(Position);
                const pPos = player.getComponent(Position);
                const npc = e.getComponent(NPC);
                return pos?.x === pPos?.x && pos?.y === pPos?.y &&
                    npc?.typeName.toLowerCase().includes(targetName.toLowerCase());
            });
        } else {
            const stats = player.getComponent(CombatStats);
            target = roomEntities.find(e => {
                const pos = e.getComponent(Position);
                const pPos = player.getComponent(Position);
                const tStats = e.getComponent(CombatStats);
                return pos?.x === pPos?.x && pos?.y === pPos?.y && tStats?.engagementTier === stats?.engagementTier && stats?.engagementTier !== EngagementTier.DISENGAGED;
            });
            if (!target) {
                target = roomEntities.find(e => {
                    const pos = e.getComponent(Position);
                    const pPos = player.getComponent(Position);
                    return pos?.x === pPos?.x && pos?.y === pPos?.y;
                });
            }
        }

        if (!target) {
            this.messageService.info(playerId, "There is no one to maneuver against!");
            return;
        }

        this.performManeuver(player, target, direction, engine);
    }

    private performManeuver(player: Entity, target: Entity, direction: 'CLOSE' | 'WITHDRAW', engine: IEngine): 'SUCCESS' | 'FAILURE' | 'MAX_RANGE' | 'FAIL_STOP' {
        const stats = player.getComponent(CombatStats);
        const playerStats = player.getComponent(Stats);
        const stance = player.getComponent(Stance);
        const playerId = player.id;

        if (!stats || !playerStats) return 'FAIL_STOP';

        if (stance && stance.current !== StanceType.Standing) {
            this.messageService.info(playerId, `You must be standing to maneuver!`);
            return 'FAIL_STOP';
        }

        if (stats.fatigue < 5) {
            this.messageService.info(playerId, "You are too exhausted to maneuver!");
            return 'FAIL_STOP'; // Stop auto-advance if exhausted
        }

        const tiers = Object.values(EngagementTier);
        const currentIndex = tiers.indexOf(stats.engagementTier);

        // Check Range Limits BEFORE rolling
        if (direction === 'CLOSE') {
            if (currentIndex >= tiers.length - 1) {
                this.messageService.info(playerId, "You are already as close as possible!");
                return 'MAX_RANGE';
            }
        } else {
            if (currentIndex <= 1) { // 0 is NULL, 1 is MISSILE (farthest)
                this.messageService.info(playerId, "You cannot withdraw any further!");
                return 'MAX_RANGE';
            }
        }

        stats.fatigue -= 5;

        const targetStats = target.getComponent(Stats);
        const targetCombatStats = target.getComponent(CombatStats);

        const playerAgility = playerStats.attributes.get('AGI')?.value || 10;
        const targetAgility = targetStats?.attributes.get('AGI')?.value || 10;

        // Random factor (1-100)
        const playerRoll = playerAgility + Math.random() * 100;
        const targetRoll = targetAgility + Math.random() * 100;

        // Check for Hangback
        if (direction === 'CLOSE' && targetCombatStats?.isHangingBack) {
            this.messageService.info(playerId, `${target.getComponent(NPC)?.typeName} is hanging back, trying to keep distance!`);
        }

        if (playerRoll > targetRoll) {
            // SUCCESS
            if (direction === 'CLOSE') {
                if (currentIndex < tiers.length - 1) {
                    stats.engagementTier = tiers[currentIndex + 1];
                    if (targetCombatStats) targetCombatStats.engagementTier = stats.engagementTier; // Sync engagement
                    this.messageService.info(playerId, `You rush forward, weaving past ${target.getComponent(NPC)?.typeName}'s guard! Engagement: ${stats.engagementTier}`);
                    this.messageService.combat(target.id, `${player.id} rushes at you! Engagement: ${stats.engagementTier}`);

                    this.applyRoundtime(playerId, 5, engine);

                    // Check if we reached max range
                    if (currentIndex + 1 === tiers.length - 1) return 'MAX_RANGE';
                    return 'SUCCESS';
                }
            } else {
                if (currentIndex > 1) {
                    stats.engagementTier = tiers[currentIndex - 1];
                    if (targetCombatStats) targetCombatStats.engagementTier = stats.engagementTier; // Sync engagement
                    this.messageService.info(playerId, `You scramble back, putting distance between you and ${target.getComponent(NPC)?.typeName}. Engagement: ${stats.engagementTier}`);
                    this.messageService.combat(target.id, `${player.id} retreats! Engagement: ${stats.engagementTier}`);

                    this.applyRoundtime(playerId, 5, engine);

                    if (currentIndex - 1 === 1) return 'MAX_RANGE';
                    return 'SUCCESS';
                }
            }
        } else {
            // FAILURE
            if (direction === 'CLOSE' && targetCombatStats?.isHangingBack) {
                this.messageService.info(playerId, `${target.getComponent(NPC)?.typeName} successfully hangs back, preventing you from closing!`);
            } else {
                this.messageService.info(playerId, `You try to maneuver, but ${target.getComponent(NPC)?.typeName} keeps you at bay!`);
            }
            this.applyRoundtime(playerId, 3, engine); // 3s RT on failure
            return 'FAILURE';
        }
        return 'FAILURE';
    }

    handleAssess(playerId: string, engine: IEngine) {
        const player = WorldQuery.getEntityById(engine, playerId);
        const stats = player?.getComponent(CombatStats);
        const pos = player?.getComponent(Position);
        if (!player || !stats || !pos) return;

        let output = `You assess your combat situation...\n\n`;

        // Player status
        const balanceStr = this.getBalanceDescription(stats.balance);
        output += `You (${balanceStr}) are `;

        // Find targets
        const roomEntities = engine.getEntitiesWithComponent(NPC);
        const targets = roomEntities.filter(e => {
            const ePos = e.getComponent(Position);
            return ePos?.x === pos.x && ePos?.y === pos.y;
        });

        if (targets.length === 0) {
            output += "standing alone.";
        } else {
            const engagedTarget = targets.find(t => t.getComponent(CombatStats)?.engagementTier === stats.engagementTier && stats.engagementTier !== EngagementTier.DISENGAGED);

            if (engagedTarget) {
                output += `facing ${engagedTarget.getComponent(NPC)?.typeName} at ${stats.engagementTier} range.\n`;
            } else {
                output += `facing nothing in particular.\n`;
            }

            targets.forEach(t => {
                if (t === engagedTarget) return; // Already mentioned
                const tStats = t.getComponent(CombatStats);
                const tName = t.getComponent(NPC)?.typeName;
                if (tStats) {
                    const tBalance = this.getBalanceDescription(tStats.balance);
                    if (tStats.engagementTier === EngagementTier.DISENGAGED) {
                        output += `A ${tName} (${tBalance}) is nearby.\n`;
                    } else {
                        output += `A ${tName} (${tBalance}) is flanking you at ${tStats.engagementTier} range.\n`;
                    }
                }
            });
        }

        this.messageService.info(playerId, output);
    }

    handleHangback(playerId: string, engine: IEngine) {
        const player = WorldQuery.getEntityById(engine, playerId);
        const stats = player?.getComponent(CombatStats);
        if (!stats) return;

        stats.isHangingBack = !stats.isHangingBack;
        if (stats.isHangingBack) {
            this.messageService.info(playerId, "You are now hanging back, waiting to counter any advance.");
        } else {
            this.messageService.info(playerId, "You stop hanging back.");
        }
    }

    handleFlee(playerId: string, direction: string | undefined, engine: IEngine) {
        if (!this.checkRoundtime(playerId, engine)) return;

        const player = WorldQuery.getEntityById(engine, playerId);
        const stats = player?.getComponent(CombatStats);
        if (!player || !stats) return;

        this.messageService.info(playerId, "You attempt to flee from combat!");

        stats.engagementTier = EngagementTier.DISENGAGED;
        this.messageService.info(playerId, "You disengage from combat!");

        if (direction) {
            const pos = player.getComponent(Position);
            if (pos) {
                let dx = 0, dy = 0;
                if (direction === 'NORTH') dy = -1;
                if (direction === 'SOUTH') dy = 1;
                if (direction === 'EAST') dx = 1;
                if (direction === 'WEST') dx = -1;

                const targetX = pos.x + dx;
                const targetY = pos.y + dy;
                const room = WorldQuery.findRoomAt(engine, targetX, targetY);
                if (room) {
                    pos.x = targetX;
                    pos.y = targetY;
                    this.messageService.info(playerId, `You flee ${direction.toLowerCase()}!`);
                } else {
                    this.messageService.info(playerId, "You try to flee that way, but there is no exit!");
                }
            }
        }

        this.applyRoundtime(playerId, 10, engine); // Long RT for fleeing
    }

    private getBalanceDescription(balance: number): string {
        if (balance >= 0.9) return "solidly balanced";
        if (balance >= 0.7) return "balanced";
        if (balance >= 0.5) return "somewhat off balance";
        if (balance >= 0.3) return "badly balanced";
        return "very badly balanced";
    }

    handleTarget(playerId: string, partName: string, engine: IEngine): void {
        const player = WorldQuery.getEntityById(engine, playerId);
        const stats = player?.getComponent(CombatStats);
        if (!player || !stats) return;

        const part = Object.values(BodyPart).find(p => p.toLowerCase() === partName.toLowerCase());
        if (part) {
            stats.targetLimb = part;
            this.messageService.info(playerId, `Targeting bias set to: ${part}`);
        } else {
            this.messageService.info(playerId, `Unknown body part: ${partName}. Available: ${Object.values(BodyPart).join(', ')}`);
        }
    }

    handleStance(playerId: string, args: string[], engine: IEngine): void {
        const player = WorldQuery.getEntityById(engine, playerId);
        const stats = player?.getComponent(CombatStats);
        if (!player || !stats) return;

        const arg0 = args[0]?.toUpperCase();

        if (arg0 === 'EVASION') {
            stats.evasion = 100; stats.parry = 0; stats.shield = 0;
            stats.aggression = 0.0;
            this.messageService.info(playerId, "Stance set to full EVASION.");
        } else if (arg0 === 'PARRY') {
            stats.evasion = 0; stats.parry = 100; stats.shield = 0;
            stats.aggression = 0.0;
            this.messageService.info(playerId, "Stance set to full PARRY.");
        } else if (arg0 === 'SHIELD') {
            stats.evasion = 0; stats.parry = 0; stats.shield = 100;
            stats.aggression = 0.0;
            this.messageService.info(playerId, "Stance set to full SHIELD.");
        } else if (arg0 === 'OFFENSIVE') {
            stats.evasion = 33; stats.parry = 33; stats.shield = 34;
            stats.aggression = 1.0;
            this.messageService.info(playerId, "Stance set to OFFENSIVE (Balanced Defense).");
        } else if (arg0 === 'NEUTRAL') {
            stats.evasion = 33; stats.parry = 33; stats.shield = 34;
            stats.aggression = 0.5;
            this.messageService.info(playerId, "Stance set to NEUTRAL (Balanced Defense).");
        } else if (arg0 === 'DEFENSIVE') {
            stats.evasion = 33; stats.parry = 33; stats.shield = 34;
            stats.aggression = 0.0;
            this.messageService.info(playerId, "Stance set to DEFENSIVE (Balanced Defense).");
        } else if (arg0 === 'CUSTOM') {
            const e = parseInt(args[1]) || 0;
            const p = parseInt(args[2]) || 0;
            const s = parseInt(args[3]) || 0;

            if (e + p + s <= 100) {
                stats.evasion = e;
                stats.parry = p;
                stats.shield = s;
                this.messageService.info(playerId, `Custom Stance: Evasion ${e}%, Parry ${p}%, Shield ${s}%.`);
            } else {
                this.messageService.error(playerId, "Total defense allocation cannot exceed 100%.");
            }
        } else {
            this.messageService.info(playerId, "Usage: STANCE <EVASION|PARRY|SHIELD|OFFENSIVE|DEFENSIVE|NEUTRAL|CUSTOM <e> <p> <s>>");
        }
    }

    handleAppraise(playerId: string, targetName: string, engine: IEngine): void {
        const player = WorldQuery.getEntityById(engine, playerId);
        if (!player) return;

        const playerPos = player.getComponent(Position);
        if (!playerPos) return;

        const target = engine.getEntitiesWithComponent(NPC).find(e => {
            const npc = e.getComponent(NPC);
            const pos = e.getComponent(Position);
            return npc?.typeName.toLowerCase().includes(targetName.toLowerCase()) &&
                pos?.x === playerPos.x && pos?.y === playerPos.y;
        });

        if (!target) {
            this.messageService.info(playerId, `You don't see "${targetName}" here.`);
            return;
        }

        const stats = target.getComponent(CombatStats);
        const wounds = target.getComponent(WoundTable);
        const npc = target.getComponent(NPC);

        if (!stats || !wounds) {
            this.messageService.info(playerId, `You cannot appraise the condition of ${npc?.typeName || 'that'}.`);
            return;
        }

        let report = `\n<title>[Appraisal: ${npc?.typeName}]</title>\n`;

        // Balance description
        if (stats.balance > 0.8) report += "He is perfectly balanced and ready for action.\n";
        else if (stats.balance > 0.5) report += "He is slightly off-balance but steady.\n";
        else if (stats.balance > 0.2) report += "He is struggling to maintain his footing.\n";
        else report += "He is badly balanced and reeling!\n";

        // Wound description
        let woundList: string[] = [];
        wounds.wounds.forEach((w, part) => {
            if (w.level > 0) {
                let desc = "";
                if (w.level > 8) desc = "shattered";
                else if (w.level > 5) desc = "ragged";
                else if (w.level > 2) desc = "bleeding";
                else desc = "bruised";
                woundList.push(`${desc} ${part}`);
            }
        });

        if (woundList.length > 0) {
            report += `Wounds: ${woundList.join(', ')}.\n`;
        } else {
            report += "He appears to be uninjured.\n";
        }

        this.messageService.info(playerId, report);
    }

    private checkRoundtime(entityId: string, engine: IEngine, silent: boolean = false): boolean {
        const entity = WorldQuery.getEntityById(engine, entityId);
        const rt = entity?.getComponent(Roundtime);
        if (rt && rt.secondsRemaining > 0) {
            if (!silent) {
                this.messageService.info(entityId, `...wait ${Math.ceil(rt.secondsRemaining)} seconds.`);
            }
            return false;
        }
        return true;
    }

    private applyRoundtime(entityId: string, seconds: number, engine: IEngine): void {
        const entity = WorldQuery.getEntityById(engine, entityId);
        if (!entity) return;

        let rt = entity.getComponent(Roundtime);
        if (!rt) {
            rt = new Roundtime(0);
            entity.addComponent(rt);
        }
        // Only update total if we are actually increasing the RT
        if (seconds > rt.secondsRemaining) {
            rt.secondsRemaining = seconds;
            rt.totalSeconds = seconds;
        }
    }
}
