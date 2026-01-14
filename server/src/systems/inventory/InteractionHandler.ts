import { IEngine } from '../../ecs/IEngine';
import { WorldQuery } from '../../utils/WorldQuery';
import { Position } from '../../components/Position';
import { Inventory } from '../../components/Inventory';
import { Item } from '../../components/Item';
import { Container } from '../../components/Container';
import { Entity } from '../../ecs/Entity';
import { MessageService } from '../../services/MessageService';
import { ParserUtils } from '../../utils/ParserUtils';
import { InventoryUtils } from './InventoryUtils';
import { Server } from 'socket.io';

export class InteractionHandler {
    static handleGet(entityId: string, itemName: string, engine: IEngine, messageService: MessageService, io: Server) {
        const player = WorldQuery.getEntityById(engine, entityId);
        if (!player) return;

        const playerPos = player.getComponent(Position);
        const inventory = player.getComponent(Inventory);
        if (!playerPos || !inventory) return;

        const fromMatch = itemName.toLowerCase().match(/^(.+?)\s+from\s+(.+)$/);
        let targetNameRaw = itemName.toLowerCase();
        let specifiedContainerNameRaw: string | null = null;

        if (fromMatch) {
            targetNameRaw = fromMatch[1].trim();
            specifiedContainerNameRaw = fromMatch[2].trim();
        }

        const { index: itemIndex, name: targetName } = ParserUtils.parseOrdinal(targetNameRaw);
        const { index: containerIndex, name: specifiedContainerName } = specifiedContainerNameRaw ? ParserUtils.parseOrdinal(specifiedContainerNameRaw) : { index: 0, name: null };

        const itemMatches: Entity[] = [];

        if (!specifiedContainerName) {
            const itemsInRoom = WorldQuery.findItemsAt(engine, playerPos.x, playerPos.y);
            itemsInRoom.forEach(item => {
                const itemComp = item.getComponent(Item);
                if (itemComp && itemComp.matches(targetName)) {
                    itemMatches.push(item);
                }
            });
        }

        let fromContainer = false;
        let containerEntity: Entity | undefined;
        let containerDisplayName = "";

        if (itemMatches.length <= itemIndex) {
            // Check hands and equipment for containers
            const containerMatches: { entity: Entity, name: string }[] = [];

            const checkContainer = (id: string | null) => {
                if (!id) return;
                const entity = WorldQuery.getEntityById(engine, id);
                const itemComp = entity?.getComponent(Item);
                const containerComp = entity?.getComponent(Container);
                if (itemComp && containerComp) {
                    if (!specifiedContainerName || itemComp.matches(specifiedContainerName)) {
                        containerMatches.push({ entity: entity!, name: itemComp.name });
                    }
                }
            };

            checkContainer(inventory.leftHand);
            checkContainer(inventory.rightHand);
            for (const id of inventory.equipment.values()) {
                checkContainer(id);
            }

            const targetContainerEntity = containerMatches[containerIndex];
            if (targetContainerEntity) {
                const container = targetContainerEntity.entity.getComponent(Container);
                if (container) {
                    container.items.forEach(id => {
                        const item = WorldQuery.getEntityById(engine, id);
                        const i = item?.getComponent(Item);
                        if (i && i.name.toLowerCase().includes(targetName)) {
                            itemMatches.push(item!);
                        }
                    });

                    if (itemMatches.length > itemIndex) {
                        fromContainer = true;
                        containerEntity = targetContainerEntity.entity;
                        containerDisplayName = targetContainerEntity.name;
                    }
                }
            }
        }

        const targetItem = itemMatches[itemIndex];

        if (targetItem) {
            if (!inventory.leftHand || !inventory.rightHand) {
                const itemComp = targetItem.getComponent(Item);
                if (fromContainer && containerEntity) {
                    const container = containerEntity.getComponent(Container);
                    if (container) {
                        container.items = container.items.filter(id => id !== targetItem!.id);
                        container.currentWeight -= itemComp!.weight;
                    }
                } else {
                    targetItem.removeComponent(Position);
                }

                let sourceMsg = fromContainer ? ` from your ${containerDisplayName}` : "";
                if (!inventory.leftHand) {
                    inventory.leftHand = targetItem.id;
                    messageService.info(entityId, `You picked up the ${itemComp!.name}${sourceMsg} with your left hand.`);
                } else {
                    inventory.rightHand = targetItem.id;
                    messageService.info(entityId, `You picked up the ${itemComp!.name}${sourceMsg} with your right hand.`);
                }
                InventoryUtils.refreshAutocomplete(entityId, engine, io, messageService);
            } else {
                messageService.info(entityId, `Your hands are full!`);
            }
        } else {
            messageService.info(entityId, specifiedContainerName ? `You don't see a ${targetName} in your ${specifiedContainerName}.` : `You don't see a ${itemName} here.`);
        }
    }

    static handleDrop(entityId: string, itemName: string, engine: IEngine, messageService: MessageService, io: Server) {
        const player = WorldQuery.getEntityById(engine, entityId);
        if (!player) return;

        const inventory = player.getComponent(Inventory);
        const position = player.getComponent(Position);
        if (!inventory || !position) return;

        const { index, name: targetName } = ParserUtils.parseOrdinal(itemName.toLowerCase());
        const itemMatches: { id: string, source: 'left' | 'right' | Entity }[] = [];

        if (inventory.leftHand) {
            const item = WorldQuery.getEntityById(engine, inventory.leftHand);
            const itemComp = item?.getComponent(Item);
            if (itemComp && itemComp.matches(targetName)) {
                itemMatches.push({ id: inventory.leftHand, source: 'left' });
            }
        }

        if (inventory.rightHand) {
            const item = WorldQuery.getEntityById(engine, inventory.rightHand);
            const itemComp = item?.getComponent(Item);
            if (itemComp && itemComp.matches(targetName)) {
                itemMatches.push({ id: inventory.rightHand, source: 'right' });
            }
        }

        const backpackId = inventory.equipment.get('back');
        if (backpackId) {
            const backpack = WorldQuery.getEntityById(engine, backpackId);
            const container = backpack?.getComponent(Container);
            if (container) {
                container.items.forEach(id => {
                    const item = WorldQuery.getEntityById(engine, id);
                    const itemComp = item?.getComponent(Item);
                    if (itemComp && itemComp.matches(targetName)) {
                        itemMatches.push({ id, source: backpack! });
                    }
                });
            }
        }

        const match = itemMatches[index];
        let itemIdToDrop: string | null = match ? match.id : null;
        let fromHand: 'left' | 'right' | null = (match && typeof match.source === 'string') ? match.source as any : null;
        let fromContainer: Entity | null = (match && typeof match.source !== 'string') ? match.source as Entity : null;

        if (itemIdToDrop) {
            const itemEntity = WorldQuery.getEntityById(engine, itemIdToDrop);
            const itemComp = itemEntity?.getComponent(Item);

            if (itemEntity && itemComp) {
                if (fromHand === 'left') inventory.leftHand = null;
                else if (fromHand === 'right') inventory.rightHand = null;
                else if (fromContainer) {
                    const container = fromContainer.getComponent(Container);
                    if (container) {
                        container.items = container.items.filter(id => id !== itemIdToDrop);
                        container.currentWeight -= itemComp.weight;
                    }
                }

                itemEntity.addComponent(new Position(position.x, position.y));
                messageService.info(entityId, `You dropped the ${itemComp.name}.`);
                InventoryUtils.refreshAutocomplete(entityId, engine, io, messageService);
            }
        } else {
            messageService.info(entityId, `You don't have a ${itemName} to drop.`);
        }
    }

    static handleSwap(entityId: string, engine: IEngine, messageService: MessageService, io: Server) {
        const player = WorldQuery.getEntityById(engine, entityId);
        if (!player) return;

        const inventory = player.getComponent(Inventory);
        if (!inventory) return;

        const leftItem = inventory.leftHand ? WorldQuery.getEntityById(engine, inventory.leftHand) : null;
        const rightItem = inventory.rightHand ? WorldQuery.getEntityById(engine, inventory.rightHand) : null;

        if (!leftItem && !rightItem) {
            messageService.info(entityId, "You have nothing in your hands to swap.");
            return;
        }

        const temp = inventory.leftHand;
        inventory.leftHand = inventory.rightHand;
        inventory.rightHand = temp;

        if (leftItem && rightItem) {
            const leftName = leftItem.getComponent(Item)?.name;
            const rightName = rightItem.getComponent(Item)?.name;
            messageService.info(entityId, `You swapped the ${leftName} and ${rightName} between your hands.`);
        } else if (leftItem) {
            const name = leftItem.getComponent(Item)?.name;
            messageService.info(entityId, `You moved the ${name} to your right hand.`);
        } else if (rightItem) {
            const name = rightItem.getComponent(Item)?.name;
            messageService.info(entityId, `You moved the ${name} to your left hand.`);
        }
        InventoryUtils.refreshAutocomplete(entityId, engine, io, messageService);
    }
}
