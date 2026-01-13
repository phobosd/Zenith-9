import { System } from '../ecs/System';
import { Stats } from '../components/Stats';
import { CombatStats } from '../components/CombatStats';
import { Inventory } from '../components/Inventory';
import { Item } from '../components/Item';
import { WorldQuery } from '../utils/WorldQuery';
import { IEngine } from '../ecs/IEngine';
import { MessageService } from '../services/MessageService';
import { Server } from 'socket.io';

export class CharacterSystem extends System {
    private messageService: MessageService;

    constructor(private io: Server) {
        super();
        this.messageService = new MessageService(io);
    }

    update(engine: IEngine, deltaTime: number): void {
        // Character-related logic
    }

    handleSheet(entityId: string, engine: IEngine) {
        const player = WorldQuery.getEntityById(engine, entityId);
        if (!player) return;

        const stats = player.getComponent(Stats);
        const combatStats = player.getComponent(CombatStats);
        if (!stats || !combatStats) {
            this.messageService.info(entityId, "You don't have a character sheet.");
            return;
        }

        const attributes = [];
        for (const [key, attr] of stats.attributes) {
            let fullName = attr.name;
            if (attr.name === 'STR') fullName = 'Strength';
            if (attr.name === 'CON') fullName = 'Constitution';
            if (attr.name === 'AGI') fullName = 'Agility';
            if (attr.name === 'CHA') fullName = 'Charisma';
            attributes.push({ name: fullName, value: attr.value });
        }

        const inventory = player.getComponent(Inventory);
        const getItemName = (id: string | null) => {
            if (!id) return "None";
            const item = WorldQuery.getEntityById(engine, id);
            return item?.getComponent(Item)?.name || "Unknown";
        };

        const sheetData = {
            attributes: attributes,
            combat: {
                hp: combatStats.hp,
                maxHp: combatStats.maxHp,
                defense: combatStats.defense,
                damage: combatStats.attack
            },
            equipment: inventory ? {
                head: getItemName(inventory.equipment.get('head') || null),
                torso: getItemName(inventory.equipment.get('torso') || null),
                legs: getItemName(inventory.equipment.get('legs') || null),
                feet: getItemName(inventory.equipment.get('feet') || null),
                hands: getItemName(inventory.equipment.get('hands') || null)
            } : null
        };

        this.io.to(entityId).emit('sheet-data', sheetData);
    }

    handleScore(entityId: string, engine: IEngine) {
        const player = WorldQuery.getEntityById(engine, entityId);
        if (!player) return;

        const stats = player.getComponent(Stats);
        if (!stats) {
            this.messageService.info(entityId, "You don't have a character sheet.");
            return;
        }

        const skills = [];
        for (const [key, skill] of stats.skills) {
            const percent = Math.floor((skill.uses / skill.maxUses) * 100);
            skills.push({
                name: skill.name,
                level: skill.level,
                progress: percent
            });
        }

        this.io.to(entityId).emit('score-data', { skills });
    }
}
