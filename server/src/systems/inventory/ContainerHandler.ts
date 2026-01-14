import { IEngine } from '../../ecs/IEngine';
import { WorldQuery } from '../../utils/WorldQuery';
import { Inventory } from '../../components/Inventory';
import { Item } from '../../components/Item';
import { Container } from '../../components/Container';
import { Entity } from '../../ecs/Entity';
import { MessageService } from '../../services/MessageService';
import { ParserUtils } from '../../utils/ParserUtils';
import { InventoryUtils } from './InventoryUtils';
import { Server } from 'socket.io';

export class ContainerHandler {
    static handleStow(entityId: string, itemName: string, engine: IEngine, messageService: MessageService, io: Server) {
        const player = WorldQuery.getEntityById(engine, entityId);
        if (!player) return;

        const inventory = player.getComponent(Inventory);
        if (!inventory) return;

        let targetItemName = itemName.toLowerCase();
        let targetContainerName = 'backpack';

        const inMatch = targetItemName.match(/^(.+?)\s+in\s+(.+)$/);
        if (inMatch) {
            targetItemName = inMatch[1].trim();
            targetContainerName = inMatch[2].trim();
        }

        if (targetItemName === 'can') targetItemName = 'beer can';

        const { index: itemIndex, name: targetItemNameParsed } = ParserUtils.parseOrdinal(targetItemName);
        const { index: containerIndex, name: targetContainerNameParsed } = ParserUtils.parseOrdinal(targetContainerName);

        const itemMatches: { id: string, source: 'left' | 'right' }[] = [];
        if (inventory.leftHand) {
            const item = WorldQuery.getEntityById(engine, inventory.leftHand);
            const itemComp = item?.getComponent(Item);
            if (itemComp && itemComp.matches(targetItemNameParsed)) {
                itemMatches.push({ id: inventory.leftHand, source: 'left' });
            }
        }
        if (inventory.rightHand) {
            const item = WorldQuery.getEntityById(engine, inventory.rightHand);
            const itemComp = item?.getComponent(Item);
            if (itemComp && itemComp.matches(targetItemNameParsed)) {
                itemMatches.push({ id: inventory.rightHand, source: 'right' });
            }
        }

        const itemMatch = itemMatches[itemIndex];
        let itemIdToStow: string | null = itemMatch ? itemMatch.id : null;
        let fromHand: 'left' | 'right' | null = itemMatch ? itemMatch.source : null;

        if (!itemIdToStow) {
            messageService.info(entityId, `You aren't holding a ${targetItemNameParsed}.`);
            return;
        }

        let targetContainer: Entity | undefined = undefined;
        let containerName = '';

        const containerMatches: { entity: Entity, name: string }[] = [];
        const checkContainer = (id: string | null, skipId?: string) => {
            if (!id || id === skipId) return;
            const item = WorldQuery.getEntityById(engine, id);
            const itemComp = item?.getComponent(Item);
            const container = item?.getComponent(Container);
            if (container && itemComp && itemComp.matches(targetContainerNameParsed)) {
                containerMatches.push({ entity: item!, name: itemComp.name });
            }
        };

        checkContainer(inventory.leftHand, itemIdToStow);
        checkContainer(inventory.rightHand, itemIdToStow);
        for (const equipId of inventory.equipment.values()) {
            checkContainer(equipId, itemIdToStow);
        }

        const containerMatch = containerMatches[containerIndex];
        if (containerMatch) {
            targetContainer = containerMatch.entity;
            containerName = containerMatch.name;
        }

        if (!targetContainer) {
            messageService.info(entityId, `You don't have a ${targetContainerName}.`);
            return;
        }

        const container = targetContainer.getComponent(Container);
        const itemToStow = WorldQuery.getEntityById(engine, itemIdToStow);
        const itemComp = itemToStow?.getComponent(Item);

        if (container && itemComp) {
            if (container.currentWeight + itemComp.weight <= container.maxWeight) {
                container.items.push(itemIdToStow!);
                container.currentWeight += itemComp.weight;
                if (fromHand === 'left') inventory.leftHand = null;
                if (fromHand === 'right') inventory.rightHand = null;
                messageService.info(entityId, `You put the ${itemComp.name} in your ${containerName}.`);
                InventoryUtils.refreshAutocomplete(entityId, engine, io, messageService);
            } else {
                messageService.info(entityId, `Your ${containerName} is too heavy!`);
            }
        }
    }
}
