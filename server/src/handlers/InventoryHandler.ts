import { Server } from 'socket.io';
import { IEngine } from '../commands/CommandRegistry';
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

export class InventoryHandler {
    constructor(private io: Server, private messageService: MessageService) { }

    handleGet(entityId: string, itemName: string, engine: IEngine) {
        const player = WorldQuery.getEntityById(engine, entityId);
        if (!player) return;

        const playerPos = player.getComponent(Position);
        const inventory = player.getComponent(Inventory);
        if (!playerPos || !inventory) return;

        // Clean up input
        let targetName = itemName.toLowerCase();
        let specifiedContainerName: string | null = null;

        // Handle "get X from Y" syntax
        const fromMatch = targetName.match(/^(.+?)\s+from\s+(.+)$/);
        if (fromMatch) {
            targetName = fromMatch[1].trim();
            specifiedContainerName = fromMatch[2].trim();
        }

        if (targetName === 'can') targetName = 'beer can'; // Specific alias for convenience

        // 1. Try to find item in current location (Room)
        // Only if no container was specified
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

        // 2. Search in containers (hands first, then equipped)
        if (!targetItem) {
            // Check left hand for container
            if (inventory.leftHand) {
                const handEntity = WorldQuery.getEntityById(engine, inventory.leftHand);
                const container = handEntity?.getComponent(Container);
                const handItem = handEntity?.getComponent(Item);

                if (container && handItem) {
                    // If a container was specified, check if this is it
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
                        }
                    }
                }
            }

            // Check right hand for container
            if (!targetItem && inventory.rightHand) {
                const handEntity = WorldQuery.getEntityById(engine, inventory.rightHand);
                const container = handEntity?.getComponent(Container);
                const handItem = handEntity?.getComponent(Item);

                if (container && handItem) {
                    // If a container was specified, check if this is it
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
                        }
                    }
                }
            }

            // Search in equipped containers
            if (!targetItem) {
                for (const itemId of inventory.equipment.values()) {
                    const equipEntity = WorldQuery.getEntityById(engine, itemId);
                    const container = equipEntity?.getComponent(Container);
                    const equipItem = equipEntity?.getComponent(Item);

                    if (container && equipItem) {
                        // If a container was specified, check if this is it
                        if (specifiedContainerName && !equipItem.name.toLowerCase().includes(specifiedContainerName)) {
                            continue;
                        }

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
            // Check hands
            if (!inventory.leftHand || !inventory.rightHand) {
                const itemComp = targetItem.getComponent(Item);

                // Logic to move item
                if (fromContainer && containerEntity) {
                    const container = containerEntity.getComponent(Container);
                    if (container) {
                        container.items = container.items.filter(id => id !== targetItem!.id);
                        container.currentWeight -= itemComp!.weight;
                    }
                } else {
                    targetItem.removeComponent(Position);
                }

                // Place in hand
                let sourceMsg = "";
                if (fromContainer) {
                    sourceMsg = ` from your ${containerDisplayName}`;
                }

                if (!inventory.leftHand) {
                    inventory.leftHand = targetItem.id;
                    this.messageService.info(entityId, `You picked up the ${itemComp!.name}${sourceMsg} with your left hand.`);
                } else {
                    inventory.rightHand = targetItem.id;
                    this.messageService.info(entityId, `You picked up the ${itemComp!.name}${sourceMsg} with your right hand.`);
                }
            } else {
                this.messageService.info(entityId, `Your hands are full!`);
                return;
            }

            // Update autocomplete
            const autocompleteData = AutocompleteAggregator.getInventoryAutocomplete(player, engine);
            this.io.to(entityId).emit('autocomplete-update', autocompleteData);
        } else {
            if (specifiedContainerName) {
                this.messageService.info(entityId, `You don't see a ${targetName} in your ${specifiedContainerName}.`);
            } else {
                this.messageService.info(entityId, `You don't see a ${itemName} here.`);
            }
        }
    }

    handleDrop(entityId: string, itemName: string, engine: IEngine) {
        const player = WorldQuery.getEntityById(engine, entityId);
        if (!player) return;

        const inventory = player.getComponent(Inventory);
        const position = player.getComponent(Position);
        if (!inventory || !position) return;

        let targetName = itemName.toLowerCase();

        // Check hands first
        let itemIdToDrop: string | null = null;
        let fromHand: 'left' | 'right' | null = null;

        if (inventory.leftHand) {
            const item = WorldQuery.getEntityById(engine, inventory.leftHand);
            if (item && item.getComponent(Item)?.name.toLowerCase().includes(targetName)) {
                itemIdToDrop = inventory.leftHand;
                fromHand = 'left';
            }
        }

        if (!itemIdToDrop && inventory.rightHand) {
            const item = WorldQuery.getEntityById(engine, inventory.rightHand);
            if (item && item.getComponent(Item)?.name.toLowerCase().includes(targetName)) {
                itemIdToDrop = inventory.rightHand;
                fromHand = 'right';
            }
        }

        // If not in hands, check backpack
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
                // Remove from source
                if (fromHand === 'left') inventory.leftHand = null;
                else if (fromHand === 'right') inventory.rightHand = null;
                else if (fromContainer) {
                    const container = fromContainer.getComponent(Container);
                    if (container) {
                        container.items = container.items.filter(id => id !== itemIdToDrop);
                        container.currentWeight -= itemComp.weight;
                    }
                }

                // Add position component to drop it on the ground
                itemEntity.addComponent(new Position(position.x, position.y));

                this.messageService.info(entityId, `You dropped the ${itemComp.name}.`);
                const autocompleteData = AutocompleteAggregator.getInventoryAutocomplete(player, engine);
                this.io.to(entityId).emit('autocomplete-update', autocompleteData);
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

        // Parse "put X in Y" syntax
        let targetItemName = itemName.toLowerCase();
        let targetContainerName = 'backpack'; // default

        const inMatch = targetItemName.match(/^(.+?)\s+in\s+(.+)$/);
        if (inMatch) {
            targetItemName = inMatch[1].trim();
            targetContainerName = inMatch[2].trim();
        }

        if (targetItemName === 'can') targetItemName = 'beer can';

        // Find item in hands with fuzzy match
        let itemIdToStow: string | null = null;
        let fromHand: 'left' | 'right' | null = null;

        if (inventory.leftHand) {
            const item = WorldQuery.getEntityById(engine, inventory.leftHand);
            if (item && item.getComponent(Item)?.name.toLowerCase().includes(targetItemName)) {
                itemIdToStow = inventory.leftHand;
                fromHand = 'left';
            }
        }

        if (!itemIdToStow && inventory.rightHand) {
            const item = WorldQuery.getEntityById(engine, inventory.rightHand);
            if (item && item.getComponent(Item)?.name.toLowerCase().includes(targetItemName)) {
                itemIdToStow = inventory.rightHand;
                fromHand = 'right';
            }
        }

        if (!itemIdToStow) {
            this.messageService.info(entityId, `You aren't holding a ${targetItemName}.`);
            return;
        }

        // Find the target container - check hands first, then equipped items
        let targetContainer: Entity | undefined = undefined;
        let containerName = '';

        // Check left hand
        if (inventory.leftHand) {
            const item = WorldQuery.getEntityById(engine, inventory.leftHand);
            const itemComp = item?.getComponent(Item);
            const container = item?.getComponent(Container);
            if (container && itemComp && itemComp.name.toLowerCase().includes(targetContainerName)) {
                targetContainer = item;
                containerName = itemComp.name;
            }
        }

        // Check right hand
        if (!targetContainer && inventory.rightHand) {
            const item = WorldQuery.getEntityById(engine, inventory.rightHand);
            const itemComp = item?.getComponent(Item);
            const container = item?.getComponent(Container);
            if (container && itemComp && itemComp.name.toLowerCase().includes(targetContainerName)) {
                targetContainer = item;
                containerName = itemComp.name;
            }
        }

        // Check equipped items
        if (!targetContainer) {
            for (const equipId of inventory.equipment.values()) {
                const equip = WorldQuery.getEntityById(engine, equipId);
                const equipItem = equip?.getComponent(Item);
                const equipContainer = equip?.getComponent(Container);

                if (equipContainer && equipItem) {
                    if (equipItem.name.toLowerCase().includes(targetContainerName)) {
                        targetContainer = equip;
                        containerName = equipItem.name;
                        break;
                    }
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
                // Success
                container.items.push(itemIdToStow);
                container.currentWeight += itemComp.weight;

                if (fromHand === 'left') inventory.leftHand = null;
                if (fromHand === 'right') inventory.rightHand = null;

                this.messageService.info(entityId, `You put the ${itemComp.name} in your ${containerName}.`);
                const autocompleteData = AutocompleteAggregator.getInventoryAutocomplete(player, engine);
                this.io.to(entityId).emit('autocomplete-update', autocompleteData);
            } else {
                this.messageService.info(entityId, `Your ${containerName} is too heavy! (${container.currentWeight.toFixed(1)}/${container.maxWeight} lbs)`);
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

        // Perform Swap
        const temp = inventory.leftHand;
        inventory.leftHand = inventory.rightHand;
        inventory.rightHand = temp;

        // Generate Message
        if (leftItem && rightItem) {
            const leftName = leftItem.getComponent(Item)?.name;
            const rightName = rightItem.getComponent(Item)?.name;
            this.messageService.info(entityId, `You swapped the ${leftName} and ${rightName} between your hands.`);
        } else if (leftItem) {
            // Was in left, now in right
            const name = leftItem.getComponent(Item)?.name;
            this.messageService.info(entityId, `You moved the ${name} to your right hand.`);
        } else if (rightItem) {
            // Was in right, now in left
            const name = rightItem.getComponent(Item)?.name;
            this.messageService.info(entityId, `You moved the ${name} to your left hand.`);
        }
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

        // Get backpack contents
        const backpackContents = DescriptionService.getBackpackContents(inventory, engine);

        // Send structured data to client for React component
        this.io.to(entityId).emit('inventory-data', {
            leftHand: getItemName(inventory.leftHand),
            rightHand: getItemName(inventory.rightHand),
            backpack: getItemName(inventory.equipment.get('back') || null),
            head: getItemName(inventory.equipment.get('head') || null),
            torso: getItemName(inventory.equipment.get('torso') || null),
            legs: getItemName(inventory.equipment.get('legs') || null),
            feet: getItemName(inventory.equipment.get('feet') || null),
            waist: getItemName(inventory.equipment.get('waist') || null),
            backpackContents,
            currency: {
                newYen: player.getComponent(Credits)?.newYen || 0,
                credits: player.getComponent(Credits)?.credits || 0
            }
        });

        const autocompleteData = AutocompleteAggregator.getInventoryAutocomplete(player, engine);
        this.io.to(entityId).emit('autocomplete-update', autocompleteData);
    }

    handleGlance(entityId: string, engine: IEngine) {
        const player = WorldQuery.getEntityById(engine, entityId);
        if (!player) return;

        const inventory = player.getComponent(Inventory);
        if (!inventory) return;

        const getHandContent = (handId: string | null) => {
            if (!handId) return "nothing";
            const item = WorldQuery.getEntityById(engine, handId);
            return item?.getComponent(Item)?.name || "something unknown";
        };

        const leftHand = getHandContent(inventory.leftHand);
        const rightHand = getHandContent(inventory.rightHand);

        let message = "";
        if (leftHand === "nothing" && rightHand === "nothing") {
            message = "You glance down at your empty hands.";
        } else {
            message = `You glance down and see you are holding ${leftHand === "nothing" ? "nothing" : `a ${leftHand}`} in your left hand and ${rightHand === "nothing" ? "nothing" : `a ${rightHand}`} in your right hand.`;
        }

        this.messageService.info(entityId, message);
    }

    handleWear(entityId: string, itemName: string, engine: IEngine) {
        const player = WorldQuery.getEntityById(engine, entityId);
        if (!player) return;

        const inventory = player.getComponent(Inventory);
        if (!inventory) return;

        const targetName = itemName.toLowerCase();

        // Find item in hands or on ground
        let itemToWear: Entity | null = null;
        let fromHand: 'left' | 'right' | null = null;
        let fromGround = false;

        // Check left hand
        if (inventory.leftHand) {
            const item = WorldQuery.getEntityById(engine, inventory.leftHand);
            if (item?.getComponent(Item)?.name.toLowerCase().includes(targetName)) {
                itemToWear = item;
                fromHand = 'left';
            }
        }

        // Check right hand
        if (!itemToWear && inventory.rightHand) {
            const item = WorldQuery.getEntityById(engine, inventory.rightHand);
            if (item?.getComponent(Item)?.name.toLowerCase().includes(targetName)) {
                itemToWear = item;
                fromHand = 'right';
            }
        }

        // Check ground
        if (!itemToWear) {
            const playerPos = player.getComponent(Position);
            if (playerPos) {
                const itemsInRoom = WorldQuery.findItemsAt(engine, playerPos.x, playerPos.y);
                itemToWear = itemsInRoom.find(item => {
                    const itemComp = item.getComponent(Item);
                    return itemComp && itemComp.name.toLowerCase().includes(targetName);
                }) || null;
                if (itemToWear) fromGround = true;
            }
        }

        if (!itemToWear) {
            this.messageService.info(entityId, `You don't have a ${itemName} to wear.`);
            return;
        }

        const itemComp = itemToWear.getComponent(Item);
        if (!itemComp) return;

        // Check if item has a slot, or assign a default based on item type
        let slot = itemComp.slot;
        if (!slot) {
            // Fallback slot assignment for legacy items
            const itemNameLower = itemComp.name.toLowerCase();
            if (itemNameLower.includes('backpack')) {
                slot = 'back';
                itemComp.slot = 'back'; // Update the component
            } else if (itemNameLower.includes('shirt') || itemNameLower.includes('jacket') || itemNameLower.includes('vest')) {
                slot = 'torso';
                itemComp.slot = 'torso';
            } else if (itemNameLower.includes('pants') || itemNameLower.includes('trousers') || itemNameLower.includes('jeans')) {
                slot = 'legs';
                itemComp.slot = 'legs';
            } else if (itemNameLower.includes('belt')) {
                slot = 'waist';
                itemComp.slot = 'waist';
            } else if (itemNameLower.includes('helmet') || itemNameLower.includes('hat') || itemNameLower.includes('cap')) {
                slot = 'head';
                itemComp.slot = 'head';
            } else if (itemNameLower.includes('boots') || itemNameLower.includes('shoes')) {
                slot = 'feet';
                itemComp.slot = 'feet';
            } else if (itemNameLower.includes('gloves')) {
                slot = 'hands';
                itemComp.slot = 'hands';
            } else {
                this.messageService.info(entityId, `You can't wear the ${itemComp.name}.`);
                return;
            }
        }

        // Check if this exact item is already equipped
        const alreadyEquipped = Array.from(inventory.equipment.values()).includes(itemToWear.id);
        if (alreadyEquipped) {
            this.messageService.info(entityId, `You're already wearing the ${itemComp.name}.`);
            return;
        }

        // Check if slot is already occupied
        const currentlyEquipped = inventory.equipment.get(slot);
        if (currentlyEquipped) {
            const currentItem = WorldQuery.getEntityById(engine, currentlyEquipped);
            const currentItemComp = currentItem?.getComponent(Item);
            this.messageService.info(entityId, `You're already wearing ${currentItemComp?.name} on your ${slot}. Remove it first.`);
            return;
        }

        // Remove from source
        if (fromHand === 'left') inventory.leftHand = null;
        else if (fromHand === 'right') inventory.rightHand = null;
        else if (fromGround) itemToWear.removeComponent(Position);

        // Equip the item
        inventory.equipment.set(slot, itemToWear.id);

        this.messageService.success(entityId, `You wear the ${itemComp.name} on your ${slot}.`);

        // Update autocomplete
        const autocompleteData = AutocompleteAggregator.getInventoryAutocomplete(player, engine);
        this.io.to(entityId).emit('autocomplete-update', autocompleteData);
    }

    handleRemove(entityId: string, itemName: string, engine: IEngine) {
        const player = WorldQuery.getEntityById(engine, entityId);
        if (!player) return;

        const inventory = player.getComponent(Inventory);
        if (!inventory) return;

        const targetName = itemName.toLowerCase();

        // Find equipped item
        let itemToRemove: Entity | null = null;
        let slot: string | null = null;

        for (const [equipSlot, equipId] of inventory.equipment) {
            const item = WorldQuery.getEntityById(engine, equipId);
            const itemComp = item?.getComponent(Item);
            if (itemComp && itemComp.name.toLowerCase().includes(targetName)) {
                itemToRemove = item || null;
                slot = equipSlot;
                break;
            }
        }

        if (!itemToRemove || !slot) {
            this.messageService.info(entityId, `You aren't wearing a ${itemName}.`);
            return;
        }

        const itemComp = itemToRemove.getComponent(Item);
        if (!itemComp) return;

        // Remove from equipment
        inventory.equipment.delete(slot);

        // Try to put in hands
        if (!inventory.leftHand) {
            inventory.leftHand = itemToRemove.id;
            this.messageService.success(entityId, `You remove the ${itemComp.name} and hold it in your left hand.`);
        } else if (!inventory.rightHand) {
            inventory.rightHand = itemToRemove.id;
            this.messageService.success(entityId, `You remove the ${itemComp.name} and hold it in your right hand.`);
        } else {
            // Hands full, drop to ground
            const playerPos = player.getComponent(Position);
            if (playerPos) {
                itemToRemove.addComponent(new Position(playerPos.x, playerPos.y));
                this.messageService.success(entityId, `You remove the ${itemComp.name} and drop it on the ground (hands full).`);
            }
        }

        // Update autocomplete
        const autocompleteData = AutocompleteAggregator.getInventoryAutocomplete(player, engine);
        this.io.to(entityId).emit('autocomplete-update', autocompleteData);
    }
}
