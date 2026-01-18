import { System } from '../ecs/System';
import { Stats } from '../components/Stats';
import { CombatStats } from '../components/CombatStats';
import { Inventory } from '../components/Inventory';
import { Item } from '../components/Item';
import { WorldQuery } from '../utils/WorldQuery';
import { IEngine } from '../ecs/IEngine';
import { MessageService } from '../services/MessageService';
import { Server } from 'socket.io';
import { LogoutTimer } from '../components/LogoutTimer';
import { CombatUtils } from './combat/CombatUtils';
import { CharacterService } from '../services/CharacterService';
import { Logger } from '../utils/Logger';
import { Reputation } from '../components/Reputation';
import { WorldStateService } from '../services/WorldStateService';
import { Container } from '../components/Container';
import { Description } from '../components/Description';

export class CharacterSystem extends System {
    private messageService: MessageService;

    constructor(private io: Server, private worldState: WorldStateService) {
        super();
        this.messageService = new MessageService(io);
    }

    update(engine: IEngine, deltaTime: number): void {
        const entitiesWithLogout = engine.getEntitiesWithComponent(LogoutTimer);
        entitiesWithLogout.forEach(entity => {
            const timer = entity.getComponent(LogoutTimer)!;
            timer.secondsRemaining -= deltaTime / 1000;

            if (timer.secondsRemaining <= 0) {
                this.performFinalLogout(entity.id, engine);
                entity.removeComponent(LogoutTimer);
            }
        });
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
            } : null,
            name: player.getComponent(Description)?.title || "Unknown",
            reputation: player.getComponent(Reputation)?.factions ? Object.fromEntries(player.getComponent(Reputation)!.factions) : {}
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

    handleLogout(entityId: string, engine: IEngine) {
        const player = WorldQuery.getEntityById(engine, entityId);
        if (!player) return;

        if (player.hasComponent(LogoutTimer)) {
            this.messageService.info(entityId, "You are already logging out.");
            return;
        }

        // Apply 5s RT
        CombatUtils.applyRoundtime(player, 5);
        this.messageService.info(entityId, "Logging out in 5 seconds... stay still.");

        player.addComponent(new LogoutTimer(5));
    }

    private async performFinalLogout(entityId: string, engine: IEngine) {
        const player = WorldQuery.getEntityById(engine, entityId);
        if (!player) return;

        Logger.info('Character', `Performing final logout for ${entityId}`);

        // Save character data
        const charService = CharacterService.getInstance();
        const charData = charService.getCharacterBySocketId(entityId);
        if (charData) {
            // Remove LogoutTimer before saving so it doesn't persist
            player.removeComponent(LogoutTimer);

            charService.saveCharacter(charData.id, player.toJSON());

            // Save items in inventory to world_entities
            const inventory = player.getComponent(Inventory);
            if (inventory) {
                const saveItem = async (itemId: string | null) => {
                    if (!itemId) return;
                    const item = engine.getEntity(itemId);
                    if (item) {
                        await this.worldState.saveEntity(item);
                        const container = item.getComponent(Container);
                        if (container) {
                            for (const subId of container.items) {
                                await saveItem(subId);
                            }
                        }
                    }
                };

                await saveItem(inventory.leftHand);
                await saveItem(inventory.rightHand);
                for (const itemId of inventory.equipment.values()) {
                    await saveItem(itemId);
                }
            }

            this.messageService.info(entityId, "Character and inventory saved. Neural link severed.");
        }

        // Notify client to clear state
        this.io.to(entityId).emit('auth:logout');

        // Remove from engine
        engine.removeEntity(entityId);
    }
}
