import { System } from '../ecs/System';
import { IEngine } from '../ecs/IEngine';
import { WorldQuery } from '../utils/WorldQuery';
import { Inventory } from '../components/Inventory';
import { Item } from '../components/Item';
import { Credits } from '../components/Credits';
import { DescriptionService } from '../services/DescriptionService';

import { MessageService } from '../services/MessageService';
import { MessageFormatter } from '../utils/MessageFormatter';
import { Server } from 'socket.io';


// Handlers
import { InteractionHandler } from './inventory/InteractionHandler';
import { EquipmentHandler } from './inventory/EquipmentHandler';
import { ContainerHandler } from './inventory/ContainerHandler';
import { ConsumableHandler } from './inventory/ConsumableHandler';
import { InventoryUtils } from './inventory/InventoryUtils';


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
        InteractionHandler.handleGet(entityId, itemName, engine, this.messageService, this.io);
    }

    handleDrop(entityId: string, itemName: string, engine: IEngine) {
        InteractionHandler.handleDrop(entityId, itemName, engine, this.messageService, this.io);
    }

    handleSwap(entityId: string, engine: IEngine) {
        InteractionHandler.handleSwap(entityId, engine, this.messageService, this.io);
    }

    handleWear(entityId: string, itemName: string, engine: IEngine) {
        EquipmentHandler.handleWear(entityId, itemName, engine, this.messageService, this.io);
    }

    handleRemove(entityId: string, itemName: string, engine: IEngine) {
        EquipmentHandler.handleRemove(entityId, itemName, engine, this.messageService, this.io);
    }

    handleStow(entityId: string, itemName: string, engine: IEngine) {
        ContainerHandler.handleStow(entityId, itemName, engine, this.messageService, this.io);
    }

    handleUse(entityId: string, itemName: string, engine: IEngine) {
        ConsumableHandler.handleUse(entityId, itemName, engine, this.messageService, this.io);
    }

    handleInventory(entityId: string, engine: IEngine) {
        const player = WorldQuery.getEntityById(engine, entityId);
        if (!player) return;

        const inventory = player.getComponent(Inventory);
        if (!inventory) return;

        const getItemName = (id: string | null) => {
            if (!id) return "Empty";
            const item = WorldQuery.getEntityById(engine, id);
            const itemComp = item?.getComponent(Item);
            return itemComp ? MessageFormatter.item(itemComp.name, id, itemComp.rarity) : "Unknown";
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
            neural: getItemName(inventory.equipment.get('neural') || null),
            backpackContents: DescriptionService.getBackpackContents(inventory, engine),
            currency: {
                newYen: player.getComponent(Credits)?.newYen || 0,
                credits: player.getComponent(Credits)?.credits || 0
            }
        });
        InventoryUtils.refreshAutocomplete(entityId, engine, this.io, this.messageService);
    }
}
