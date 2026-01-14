import { IEngine } from '../../ecs/IEngine';
import { Entity } from '../../ecs/Entity';
import { WorldQuery } from '../../utils/WorldQuery';
import { AutocompleteAggregator } from '../../services/AutocompleteAggregator';
import { Momentum } from '../../components/Momentum';
import { Inventory } from '../../components/Inventory';
import { Weapon } from '../../components/Weapon';
import { MessageService } from '../../services/MessageService';
import { Server } from 'socket.io';

export class InventoryUtils {
    static refreshAutocomplete(entityId: string, engine: IEngine, io: Server, messageService: MessageService) {
        const player = WorldQuery.getEntityById(engine, entityId);
        if (player) {
            const data = AutocompleteAggregator.getInventoryAutocomplete(player, engine);
            io.to(entityId).emit('autocomplete-update', data);

            // Samurai Momentum Reset Check
            this.checkMomentumReset(player, engine, messageService);
        }
    }

    private static checkMomentumReset(player: Entity, engine: IEngine, messageService: MessageService) {
        const momentum = player.getComponent(Momentum);
        if (!momentum || momentum.current === 0) return;

        const inventory = player.getComponent(Inventory);
        if (!inventory) return;

        const rightHandItem = inventory.rightHand ? WorldQuery.getEntityById(engine, inventory.rightHand) : null;
        const weapon = rightHandItem?.getComponent(Weapon);
        const weaponName = weapon?.name.toLowerCase() || '';

        // If holding something that isn't a katana (or nothing), reset momentum
        if (!weapon || !(weaponName.includes('katana') || weaponName.includes('kitana') || weaponName.includes('samurai sword'))) {
            momentum.reset();
            messageService.info(player.id, "<error>[MOMENTUM] Your flow is broken as you switch weapons.</error>");
        }
    }
}
