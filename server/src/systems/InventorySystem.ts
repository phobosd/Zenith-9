import { System } from '../ecs/System';
import { IEngine } from '../ecs/IEngine';
import { WorldQuery } from '../utils/WorldQuery';
import { Position } from '../components/Position';
import { Inventory } from '../components/Inventory';
import { Item } from '../components/Item';
import { Container } from '../components/Container';
import { Entity } from '../ecs/Entity';
import { AutocompleteAggregator } from '../services/AutocompleteAggregator';
import { DescriptionService } from '../services/DescriptionService';
import { Credits } from '../components/Credits';
import { MessageService } from '../services/MessageService';
import { Server } from 'socket.io';

export class InventorySystem extends System {
    private io: Server;
    private messageService: MessageService;

    constructor(io: Server) {
        super();
        this.io = io;
        this.messageService = new MessageService(io);
    }

    update(engine: IEngine, deltaTime: number): void {
        // Inventory logic doesn't need per-tick updates for now
    }

    handleGet(entityId: string, itemName: string, engine: IEngine) {
        const player = WorldQuery.getEntityById(engine, entityId);
        if (!player) return;

        const playerPos = player.getComponent(Position);
        const inventory = player.getComponent(Inventory);
        if (!playerPos || !inventory) return;

        let targetName = itemName.toLowerCase();
        let specifiedContainerName: string | null = null;

        const fromMatch = targetName.match(/^(.+?)\s+from\s+(.+)$/);
        if (fromMatch) {
            targetName = fromMatch[1].trim();
            specifiedContainerName = fromMatch[2].trim();
        }

        if (targetName === 'can') targetName = 'beer can';

        let targetItem: Entity | undefined = undefined;
        if (!specifiedContainerName) {
            const itemsInRoom = WorldQuery.findItemsAt(engine, playerPos.x, playerPos.y);
            targetItem = itemsInRoom.find(item => {
                const itemComp = item.getComponent(Item);
                return itemComp && itemComp.name.toLowerCase().includes(targetName);
            });
        }

        let fromContainer = false;
        let containerEntity: Entity | undefined;
        let containerDisplayName = "";

        if (!targetItem) {
            // Check hands
            const hands = [inventory.leftHand, inventory.rightHand];
            for (const handId of hands) {
                if (!handId) continue;
                const handEntity = WorldQuery.getEntityById(engine, handId);
                const container = handEntity?.getComponent(Container);
                const handItem = handEntity?.getComponent(Item);

                if (container && handItem) {
                    if (!specifiedContainerName || handItem.name.toLowerCase().includes(specifiedContainerName)) {
                        const itemIdInContainer = container.items.find(id => {
                            const item = WorldQuery.getEntityById(engine, id);
                            const i = item?.getComponent(Item);
                            return i && i.name.toLowerCase().includes(targetName);
                        });

                        if (itemIdInContainer) {
                            targetItem = WorldQuery.getEntityById(engine, itemIdInContainer);
                            fromContainer = true;
                            containerEntity = handEntity;
                            containerDisplayName = handItem.name;
                            break;
                        }
                    }
                }
            }

            // Check equipment
            if (!targetItem) {
                for (const itemId of inventory.equipment.values()) {
                    const equipEntity = WorldQuery.getEntityById(engine, itemId);
                    const container = equipEntity?.getComponent(Container);
                    const equipItem = equipEntity?.getComponent(Item);

                    if (container && equipItem) {
                        if (specifiedContainerName && !equipItem.name.toLowerCase().includes(specifiedContainerName)) continue;

                        const itemIdInContainer = container.items.find(id => {
                            const item = WorldQuery.getEntityById(engine, id);
                            const i = item?.getComponent(Item);
                            return i && i.name.toLowerCase().includes(targetName);
                        });

                        if (itemIdInContainer) {
                            targetItem = WorldQuery.getEntityById(engine, itemIdInContainer);
                            fromContainer = true;
                            containerEntity = equipEntity;
                            containerDisplayName = equipItem.name;
                            break;
                        }
                    }
                }
            }
        }

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
                    this.messageService.info(entityId, `You picked up the ${itemComp!.name}${sourceMsg} with your left hand.`);
                } else {
                    inventory.rightHand = targetItem.id;
                    this.messageService.info(entityId, `You picked up the ${itemComp!.name}${sourceMsg} with your right hand.`);
                }
                this.refreshAutocomplete(entityId, engine);
            } else {
                this.messageService.info(entityId, `Your hands are full!`);
            }
        } else {
            this.messageService.info(entityId, specifiedContainerName ? `You don't see a ${targetName} in your ${specifiedContainerName}.` : `You don't see a ${itemName} here.`);
        }
    }

    handleDrop(entityId: string, itemName: string, engine: IEngine) {
        const player = WorldQuery.getEntityById(engine, entityId);
        if (!player) return;

        const inventory = player.getComponent(Inventory);
        const position = player.getComponent(Position);
        if (!inventory || !position) return;

        let targetName = itemName.toLowerCase();
        let itemIdToDrop: string | null = null;
        let fromHand: 'left' | 'right' | null = null;

        if (inventory.leftHand) {
            const item = WorldQuery.getEntityById(engine, inventory.leftHand);
            if (item?.getComponent(Item)?.name.toLowerCase().includes(targetName)) {
                itemIdToDrop = inventory.leftHand;
                fromHand = 'left';
            }
        }

        if (!itemIdToDrop && inventory.rightHand) {
            const item = WorldQuery.getEntityById(engine, inventory.rightHand);
            if (item?.getComponent(Item)?.name.toLowerCase().includes(targetName)) {
                itemIdToDrop = inventory.rightHand;
                fromHand = 'right';
            }
        }

        let fromContainer: Entity | null = null;
        if (!itemIdToDrop) {
            const backpackId = inventory.equipment.get('back');
            if (backpackId) {
                const backpack = WorldQuery.getEntityById(engine, backpackId);
                const container = backpack?.getComponent(Container);
                if (container) {
                    const foundId = container.items.find(id => {
                        const item = WorldQuery.getEntityById(engine, id);
                        return item?.getComponent(Item)?.name.toLowerCase().includes(targetName);
                    });
                    if (foundId) {
                        itemIdToDrop = foundId;
                        fromContainer = backpack!;
                    }
                }
            }
        }

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
                this.messageService.info(entityId, `You dropped the ${itemComp.name}.`);
                this.refreshAutocomplete(entityId, engine);
            }
        } else {
            this.messageService.info(entityId, `You don't have a ${itemName} to drop.`);
        }
    }

    handleStow(entityId: string, itemName: string, engine: IEngine) {
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

        let itemIdToStow: string | null = null;
        let fromHand: 'left' | 'right' | null = null;

        if (inventory.leftHand) {
            const item = WorldQuery.getEntityById(engine, inventory.leftHand);
            if (item?.getComponent(Item)?.name.toLowerCase().includes(targetItemName)) {
                itemIdToStow = inventory.leftHand;
                fromHand = 'left';
            }
        }

        if (!itemIdToStow && inventory.rightHand) {
            const item = WorldQuery.getEntityById(engine, inventory.rightHand);
            if (item?.getComponent(Item)?.name.toLowerCase().includes(targetItemName)) {
                itemIdToStow = inventory.rightHand;
                fromHand = 'right';
            }
        }

        if (!itemIdToStow) {
            this.messageService.info(entityId, `You aren't holding a ${targetItemName}.`);
            return;
        }

        let targetContainer: Entity | undefined = undefined;
        let containerName = '';

        const checkContainer = (id: string | null) => {
            if (!id) return null;
            const item = WorldQuery.getEntityById(engine, id);
            const itemComp = item?.getComponent(Item);
            const container = item?.getComponent(Container);
            if (container && itemComp && itemComp.name.toLowerCase().includes(targetContainerName)) {
                return { entity: item!, name: itemComp.name };
            }
            return null;
        };

        const handResult = checkContainer(inventory.leftHand) || checkContainer(inventory.rightHand);
        if (handResult) {
            targetContainer = handResult.entity;
            containerName = handResult.name;
        } else {
            for (const equipId of inventory.equipment.values()) {
                const res = checkContainer(equipId);
                if (res) {
                    targetContainer = res.entity;
                    containerName = res.name;
                    break;
                }
            }
        }

        if (!targetContainer) {
            this.messageService.info(entityId, `You don't have a ${targetContainerName}.`);
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
                this.messageService.info(entityId, `You put the ${itemComp.name} in your ${containerName}.`);
                this.refreshAutocomplete(entityId, engine);
            } else {
                this.messageService.info(entityId, `Your ${containerName} is too heavy!`);
            }
        }
    }

    handleSwap(entityId: string, engine: IEngine) {
        const player = WorldQuery.getEntityById(engine, entityId);
        if (!player) return;

        const inventory = player.getComponent(Inventory);
        if (!inventory) return;

        const leftItem = inventory.leftHand ? WorldQuery.getEntityById(engine, inventory.leftHand) : null;
        const rightItem = inventory.rightHand ? WorldQuery.getEntityById(engine, inventory.rightHand) : null;

        if (!leftItem && !rightItem) {
            this.messageService.info(entityId, "You have nothing in your hands to swap.");
            return;
        }

        const temp = inventory.leftHand;
        inventory.leftHand = inventory.rightHand;
        inventory.rightHand = temp;

        if (leftItem && rightItem) {
            const leftName = leftItem.getComponent(Item)?.name;
            const rightName = rightItem.getComponent(Item)?.name;
            this.messageService.info(entityId, `You swapped the ${leftName} and ${rightName} between your hands.`);
        } else if (leftItem) {
            const name = leftItem.getComponent(Item)?.name;
            this.messageService.info(entityId, `You moved the ${name} to your right hand.`);
        } else if (rightItem) {
            const name = rightItem.getComponent(Item)?.name;
            this.messageService.info(entityId, `You moved the ${name} to your left hand.`);
        }
        this.refreshAutocomplete(entityId, engine);
    }

    handleInventory(entityId: string, engine: IEngine) {
        const player = WorldQuery.getEntityById(engine, entityId);
        if (!player) return;

        const inventory = player.getComponent(Inventory);
        if (!inventory) return;

        const getItemName = (id: string | null) => {
            if (!id) return "Empty";
            const item = WorldQuery.getEntityById(engine, id);
            return item?.getComponent(Item)?.name || "Unknown";
        };

        this.io.to(entityId).emit('inventory-data', {
            leftHand: getItemName(inventory.leftHand),
            rightHand: getItemName(inventory.rightHand),
            backpack: getItemName(inventory.equipment.get('back') || null),
            head: getItemName(inventory.equipment.get('head') || null),
            torso: getItemName(inventory.equipment.get('torso') || null),
            legs: getItemName(inventory.equipment.get('legs') || null),
            feet: getItemName(inventory.equipment.get('feet') || null),
            waist: getItemName(inventory.equipment.get('waist') || null),
            backpackContents: DescriptionService.getBackpackContents(inventory, engine),
            currency: {
                newYen: player.getComponent(Credits)?.newYen || 0,
                credits: player.getComponent(Credits)?.credits || 0
            }
        });
        this.refreshAutocomplete(entityId, engine);
    }

    handleWear(entityId: string, itemName: string, engine: IEngine) {
        const player = WorldQuery.getEntityById(engine, entityId);
        if (!player) return;

        const inventory = player.getComponent(Inventory);
        if (!inventory) return;

        const targetName = itemName.toLowerCase();
        let itemToWear: Entity | null = null;
        let fromHand: 'left' | 'right' | null = null;
        let fromGround = false;

        if (inventory.leftHand) {
            const item = WorldQuery.getEntityById(engine, inventory.leftHand);
            if (item?.getComponent(Item)?.name.toLowerCase().includes(targetName)) {
                itemToWear = item;
                fromHand = 'left';
            }
        }

        if (!itemToWear && inventory.rightHand) {
            const item = WorldQuery.getEntityById(engine, inventory.rightHand);
            if (item?.getComponent(Item)?.name.toLowerCase().includes(targetName)) {
                itemToWear = item;
                fromHand = 'right';
            }
        }

        if (!itemToWear) {
            const playerPos = player.getComponent(Position);
            if (playerPos) {
                const itemsInRoom = WorldQuery.findItemsAt(engine, playerPos.x, playerPos.y);
                itemToWear = itemsInRoom.find(item => item.getComponent(Item)?.name.toLowerCase().includes(targetName)) || null;
                if (itemToWear) fromGround = true;
            }
        }

        if (!itemToWear) {
            this.messageService.info(entityId, `You don't have a ${itemName} to wear.`);
            return;
        }

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
            else {
                this.messageService.info(entityId, `You can't wear the ${itemComp.name}.`);
                return;
            }
            itemComp.slot = slot;
        }

        if (Array.from(inventory.equipment.values()).includes(itemToWear.id)) {
            this.messageService.info(entityId, `You're already wearing the ${itemComp.name}.`);
            return;
        }

        if (inventory.equipment.get(slot)) {
            this.messageService.info(entityId, `You're already wearing something on your ${slot}.`);
            return;
        }

        if (fromHand === 'left') inventory.leftHand = null;
        else if (fromHand === 'right') inventory.rightHand = null;
        else if (fromGround) itemToWear.removeComponent(Position);

        inventory.equipment.set(slot, itemToWear.id);
        this.messageService.success(entityId, `You wear the ${itemComp.name} on your ${slot}.`);
        this.refreshAutocomplete(entityId, engine);
    }

    handleRemove(entityId: string, itemName: string, engine: IEngine) {
        const player = WorldQuery.getEntityById(engine, entityId);
        if (!player) return;

        const inventory = player.getComponent(Inventory);
        if (!inventory) return;

        const targetName = itemName.toLowerCase();
        let itemToRemove: Entity | null = null;
        let slot: string | null = null;

        for (const [s, id] of inventory.equipment) {
            const item = WorldQuery.getEntityById(engine, id);
            if (item?.getComponent(Item)?.name.toLowerCase().includes(targetName)) {
                itemToRemove = item!;
                slot = s;
                break;
            }
        }

        if (!itemToRemove || !slot) {
            this.messageService.info(entityId, `You aren't wearing a ${itemName}.`);
            return;
        }

        const itemComp = itemToRemove.getComponent(Item);
        inventory.equipment.delete(slot);

        if (!inventory.leftHand) {
            inventory.leftHand = itemToRemove.id;
            this.messageService.success(entityId, `You remove the ${itemComp!.name} and hold it in your left hand.`);
        } else if (!inventory.rightHand) {
            inventory.rightHand = itemToRemove.id;
            this.messageService.success(entityId, `You remove the ${itemComp!.name} and hold it in your right hand.`);
        } else {
            const pos = player.getComponent(Position);
            if (pos) itemToRemove.addComponent(new Position(pos.x, pos.y));
            this.messageService.success(entityId, `You remove the ${itemComp!.name} and drop it on the ground.`);
        }
        this.refreshAutocomplete(entityId, engine);
    }

    private refreshAutocomplete(entityId: string, engine: IEngine) {
        const player = WorldQuery.getEntityById(engine, entityId);
        if (player) {
            const data = AutocompleteAggregator.getInventoryAutocomplete(player, engine);
            this.io.to(entityId).emit('autocomplete-update', data);
        }
    }
}
