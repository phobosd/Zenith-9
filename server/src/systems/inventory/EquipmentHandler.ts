import { IEngine } from '../../ecs/IEngine';
import { WorldQuery } from '../../utils/WorldQuery';
import { Position } from '../../components/Position';
import { Inventory } from '../../components/Inventory';
import { Item } from '../../components/Item';
import { Entity } from '../../ecs/Entity';
import { MessageService } from '../../services/MessageService';
import { ParserUtils } from '../../utils/ParserUtils';
import { InventoryUtils } from './InventoryUtils';
import { Server } from 'socket.io';

export class EquipmentHandler {
    static handleWear(entityId: string, itemName: string, engine: IEngine, messageService: MessageService, io: Server) {
        const player = WorldQuery.getEntityById(engine, entityId);
        if (!player) return;

        const inventory = player.getComponent(Inventory);
        if (!inventory) return;

        const { index, name: targetName } = ParserUtils.parseOrdinal(itemName.toLowerCase());
        const itemMatches: { entity: Entity, source: 'left' | 'right' | 'ground' }[] = [];

        if (inventory.leftHand) {
            const item = WorldQuery.getEntityById(engine, inventory.leftHand);
            if (item?.getComponent(Item)?.name.toLowerCase().includes(targetName)) {
                itemMatches.push({ entity: item!, source: 'left' });
            }
        }

        if (inventory.rightHand) {
            const item = WorldQuery.getEntityById(engine, inventory.rightHand);
            if (item?.getComponent(Item)?.name.toLowerCase().includes(targetName)) {
                itemMatches.push({ entity: item!, source: 'right' });
            }
        }

        const playerPos = player.getComponent(Position);
        if (playerPos) {
            const itemsInRoom = WorldQuery.findItemsAt(engine, playerPos.x, playerPos.y);
            itemsInRoom.forEach(item => {
                const itemComp = item.getComponent(Item);
                if (itemComp && itemComp.matches(targetName)) {
                    itemMatches.push({ entity: item, source: 'ground' });
                }
            });
        }

        const match = itemMatches[index];
        if (!match) {
            const ordinalStr = index > 0 ? `${ParserUtils.ORDINAL_NAMES[index] || (index + 1) + 'th'} ` : '';
            messageService.info(entityId, `You don't have a ${ordinalStr}${targetName} to wear.`);
            return;
        }

        const itemToWear = match.entity;
        const fromHand = match.source === 'ground' ? null : match.source;
        const fromGround = match.source === 'ground';

        const itemComp = itemToWear.getComponent(Item);
        if (!itemComp) return;

        let slot = itemComp.slot;
        if (!slot) {
            const n = itemComp.name.toLowerCase();
            if (n.includes('backpack')) slot = 'back';
            else if (n.includes('shirt') || n.includes('jacket')) slot = 'torso';
            else if (n.includes('pants')) slot = 'legs';
            else if (n.includes('belt')) slot = 'waist';
            else if (n.includes('helmet')) slot = 'head';
            else if (n.includes('boots')) slot = 'feet';
            else if (n.includes('link') || n.includes('jack') || n.includes('neural')) slot = 'neural';
            else {
                messageService.info(entityId, `You can't wear the ${itemComp.name}.`);
                return;
            }
            itemComp.slot = slot;
        }

        if (Array.from(inventory.equipment.values()).includes(itemToWear.id)) {
            messageService.info(entityId, `You're already wearing the ${itemComp.name}.`);
            return;
        }

        if (inventory.equipment.get(slot)) {
            messageService.info(entityId, `You're already wearing something on your ${slot}.`);
            return;
        }

        if (fromHand === 'left') inventory.leftHand = null;
        else if (fromHand === 'right') inventory.rightHand = null;
        else if (fromGround) itemToWear.removeComponent(Position);

        inventory.equipment.set(slot, itemToWear.id);
        messageService.success(entityId, `You wear the ${itemComp.name} on your ${slot}.`);
        InventoryUtils.refreshAutocomplete(entityId, engine, io, messageService);
    }

    static handleRemove(entityId: string, itemName: string, engine: IEngine, messageService: MessageService, io: Server) {
        const player = WorldQuery.getEntityById(engine, entityId);
        if (!player) return;

        const inventory = player.getComponent(Inventory);
        if (!inventory) return;

        const { index, name: targetName } = ParserUtils.parseOrdinal(itemName.toLowerCase());
        const itemMatches: { entity: Entity, slot: string }[] = [];

        for (const [s, id] of inventory.equipment) {
            const item = WorldQuery.getEntityById(engine, id);
            const itemComp = item?.getComponent(Item);
            if (itemComp && itemComp.matches(targetName)) {
                itemMatches.push({ entity: item!, slot: s });
            }
        }

        const match = itemMatches[index];
        if (!match) {
            const ordinalStr = index > 0 ? `${ParserUtils.ORDINAL_NAMES[index] || (index + 1) + 'th'} ` : '';
            messageService.info(entityId, `You aren't wearing a ${ordinalStr}${targetName}.`);
            return;
        }

        const itemToRemove = match.entity;
        const slot = match.slot;

        const itemComp = itemToRemove.getComponent(Item);
        inventory.equipment.delete(slot);

        if (!inventory.leftHand) {
            inventory.leftHand = itemToRemove.id;
            messageService.success(entityId, `You remove the ${itemComp!.name} and hold it in your left hand.`);
        } else if (!inventory.rightHand) {
            inventory.rightHand = itemToRemove.id;
            messageService.success(entityId, `You remove the ${itemComp!.name} and hold it in your right hand.`);
        } else {
            const pos = player.getComponent(Position);
            if (pos) itemToRemove.addComponent(new Position(pos.x, pos.y));
            messageService.success(entityId, `You remove the ${itemComp!.name} and drop it on the ground.`);
        }
        InventoryUtils.refreshAutocomplete(entityId, engine, io, messageService);
    }
}
