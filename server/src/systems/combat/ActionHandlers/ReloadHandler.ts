import { Entity } from '../../../ecs/Entity';
import { IEngine } from '../../../ecs/IEngine';
import { Inventory } from '../../../components/Inventory';
import { Weapon } from '../../../components/Weapon';
import { Magazine } from '../../../components/Magazine';
import { Item } from '../../../components/Item';
import { Container } from '../../../components/Container';
import { Position } from '../../../components/Position';
import { Stats } from '../../../components/Stats';
import { WorldQuery } from '../../../utils/WorldQuery';
import { MessageService } from '../../../services/MessageService';
import { CombatUtils } from '../CombatUtils';

export class ReloadHandler {
    static handleCheckAmmo(playerId: string, engine: IEngine, messageService: MessageService): void {
        const player = WorldQuery.getEntityById(engine, playerId);
        if (!player) return;

        const inventory = player.getComponent(Inventory);
        if (!inventory || !inventory.rightHand) {
            messageService.info(playerId, "You are not holding a weapon.");
            return;
        }

        const weaponEntity = WorldQuery.getEntityById(engine, inventory.rightHand);
        const weapon = weaponEntity?.getComponent(Weapon);

        if (!weapon) {
            messageService.info(playerId, "That's not a weapon.");
            return;
        }

        if (weapon.range === 0) {
            messageService.info(playerId, `Your ${weapon.name} is a melee weapon and doesn't use ammo.`);
            return;
        }

        messageService.info(playerId, `Your ${weapon.name} has ${weapon.currentAmmo}/${weapon.magSize} rounds remaining.`);
    }

    static handleReload(playerId: string, engine: IEngine, messageService: MessageService): void {
        const player = WorldQuery.getEntityById(engine, playerId);
        if (!player) return;

        const inventory = player.getComponent(Inventory);
        if (!inventory || !inventory.rightHand) {
            messageService.info(playerId, "You need to be holding a weapon to reload it.");
            return;
        }

        const weaponEntity = WorldQuery.getEntityById(engine, inventory.rightHand);
        const weapon = weaponEntity?.getComponent(Weapon);

        if (!weapon) {
            messageService.info(playerId, "That's not a weapon.");
            return;
        }

        if (weapon.range === 0) {
            messageService.info(playerId, "You can't reload a melee weapon.");
            return;
        }

        // Find a magazine
        let magEntity = this.findMagazine(player, engine, weapon.magazineType || weapon.ammoType || "9mm", true); // true = exclude backpack

        // Fallback: search by ammo type if specific magazine not found
        if (!magEntity && weapon.magazineType && weapon.ammoType) {
            magEntity = this.findMagazine(player, engine, weapon.ammoType, true);
        }

        if (!magEntity) {
            const needed = weapon.magazineType || `${weapon.ammoType} magazine`;
            messageService.info(playerId, `You don't have any ${needed} handy (check your belt, pockets, or the ground).`);
            return;
        }

        // Determine skill for reload speed
        let skillName = 'Marksmanship (Light)'; // Default
        const cat = weapon.category.toLowerCase();
        if (cat.includes('pistol') || cat.includes('smg')) {
            skillName = 'Marksmanship (Light)';
        } else if (cat.includes('rifle') || cat.includes('carbine')) {
            skillName = 'Marksmanship (Medium)';
        } else if (cat.includes('shotgun') || cat.includes('heavy') || cat.includes('launcher') || cat.includes('sweeper')) {
            skillName = 'Marksmanship (Heavy)';
        }

        const stats = player.getComponent(Stats);
        const skillLevel = stats?.skills.get(skillName)?.level || 0;

        // Calculate RT: Base 5s - (0.5s * skillLevel), min 1s
        const reduction = skillLevel * 0.5;
        const reloadTime = Math.max(1, 5 - reduction);

        // Reload logic
        const magComp = magEntity.getComponent(Magazine);
        const magItem = magEntity.getComponent(Item);

        if (magComp && magComp.currentAmmo > 0) {
            const oldAmmo = weapon.currentAmmo;
            weapon.currentAmmo = magComp.currentAmmo;

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

            messageService.success(playerId, `You slap a fresh ${magComp.name} into your ${weapon.name}. (${oldAmmo} -> ${weapon.currentAmmo}) [Time: ${reloadTime}s]`);
            CombatUtils.applyRoundtime(player, reloadTime);
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

            messageService.success(playerId, `You reload your ${weapon.name}. (${oldAmmo} -> ${weapon.currentAmmo}) [Time: ${reloadTime}s]`);
            CombatUtils.applyRoundtime(player, reloadTime);
        }
    }

    private static isItemInInventory(player: Entity, itemId: string, engine: IEngine): boolean {
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

    private static findMagazine(attacker: Entity, engine: IEngine, magType: string, excludeBackpack: boolean = false): Entity | null {
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

    private static removeFromContainer(attacker: Entity, itemId: string, engine: IEngine): void {
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
                    engine.removeEntity(itemId);
                    return;
                }
            }
        }
    }
}
