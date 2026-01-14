import { CommandRegistry } from './CommandRegistry';
import { PrefabFactory } from '../factories/PrefabFactory';
import { ItemRegistry } from '../services/ItemRegistry';
import { WorldQuery } from '../utils/WorldQuery';
import { findTarget } from '../utils/TargetingUtils';
import { Position } from '../components/Position';
import { Credits } from '../components/Credits';
import { CombatStats } from '../components/CombatStats';
import { Stats } from '../components/Stats';
import { NPC } from '../components/NPC';
import { EngagementTier } from '../types/CombatTypes';
import { Description } from '../components/Description';
import { Item } from '../components/Item';

export const registerAdminCommands = (registry: CommandRegistry) => {
    registry.register({
        name: 'god',
        aliases: ['admin'],
        description: 'Admin commands (Usage: god <spawn|set-stat|set-skill|view|reset|weather|pacify|registry>)',
        execute: (ctx) => {
            const subCommand = ctx.args[0];
            if (!subCommand) {
                ctx.messageService.info(ctx.socketId, 'Usage: god <spawn> <type>');
                return;
            }

            if (subCommand === 'spawn') {
                const name = ctx.args.slice(1).join(' ');
                if (!name) {
                    ctx.messageService.info(ctx.socketId, 'Usage: god spawn <item name | npc name>');
                    return;
                }

                // Get player position
                const player = ctx.engine.getEntity(ctx.socketId);
                if (!player) return;
                const pos = player.getComponent(Position);
                if (!pos) return;

                // Try to spawn NPC
                let entity = PrefabFactory.createNPC(name);
                if (entity) {
                    entity.addComponent(new Position(pos.x, pos.y));
                    ctx.engine.addEntity(entity);
                    PrefabFactory.equipNPC(entity, ctx.engine);

                    // Immediately detect nearby players for aggressive NPCs
                    ctx.systems.npc.onNPCSpawned(entity, ctx.engine);

                    ctx.messageService.success(ctx.socketId, `Spawned NPC: ${name}`);

                    // Refresh autocomplete for the player
                    ctx.systems.observation.refreshAutocomplete(ctx.socketId, ctx.engine);
                    return;
                }

                // Try to spawn Item
                entity = PrefabFactory.createItem(name);
                if (entity) {
                    entity.addComponent(new Position(pos.x, pos.y));
                    ctx.engine.addEntity(entity);
                    ctx.messageService.success(ctx.socketId, `Spawned Item: ${name}`);

                    // Refresh autocomplete for the player
                    ctx.systems.observation.refreshAutocomplete(ctx.socketId, ctx.engine);
                    return;
                }

                ctx.messageService.error(ctx.socketId, `Unknown entity: ${name}`);
            } else if (subCommand === 'money' || subCommand === 'credits') {
                if (ctx.args.length < 2) {
                    ctx.messageService.info(ctx.socketId, 'Usage: god money <amount> [target]');
                    return;
                }

                const amount = parseInt(ctx.args[1]);
                if (isNaN(amount)) {
                    ctx.messageService.info(ctx.socketId, 'Usage: god money <amount> [target]');
                    return;
                }

                const targetName = ctx.args.slice(2).join(' ') || 'me';
                const target = findTarget(ctx, targetName);

                if (!target) {
                    ctx.messageService.error(ctx.socketId, `Target not found: ${targetName}`);
                    return;
                }

                const creditsComp = target.getComponent(Credits);
                if (creditsComp) {
                    creditsComp.credits += amount;
                    ctx.messageService.success(ctx.socketId, `Added ${amount} credits to ${targetName}. New balance: ${creditsComp.credits}`);
                } else {
                    target.addComponent(new Credits(0, amount));
                    ctx.messageService.success(ctx.socketId, `Added Credits component and ${amount} credits to ${targetName}.`);
                }
            } else if (subCommand === 'set-stat') {
                if (ctx.args.length < 3) {
                    ctx.messageService.info(ctx.socketId, 'Usage: god set-stat [target] <stat> <value>');
                    return;
                }

                const value = parseInt(ctx.args[ctx.args.length - 1]);
                const statName = ctx.args[ctx.args.length - 2].toUpperCase();
                let targetName = ctx.args.slice(1, ctx.args.length - 2).join(' ');

                if (!targetName) targetName = 'me';

                if (isNaN(value)) {
                    ctx.messageService.info(ctx.socketId, 'Usage: god set-stat [target] <stat> <value>');
                    return;
                }

                const target = findTarget(ctx, targetName);
                if (!target) {
                    ctx.messageService.error(ctx.socketId, `Target not found: ${targetName}`);
                    return;
                }

                if (statName === 'HP' || statName === 'MAXHP' || statName === 'ATTACK' || statName === 'DEFENSE') {
                    const combatStats = target.getComponent(CombatStats);
                    if (combatStats) {
                        if (statName === 'HP') combatStats.hp = value;
                        else if (statName === 'MAXHP') combatStats.maxHp = value;
                        else if (statName === 'ATTACK') {
                            if (!target.hasComponent(NPC)) {
                                ctx.messageService.error(ctx.socketId, "ATTACK can only be set on NPCs.");
                                return;
                            }
                            combatStats.attack = value;
                        }
                        else if (statName === 'DEFENSE') {
                            if (!target.hasComponent(NPC)) {
                                ctx.messageService.error(ctx.socketId, "DEFENSE can only be set on NPCs.");
                                return;
                            }
                            combatStats.defense = value;
                        }
                        ctx.messageService.success(ctx.socketId, `Set ${statName} of ${targetName} to ${value}.`);
                    } else {
                        ctx.messageService.error(ctx.socketId, `Target ${targetName} has no combat stats.`);
                    }
                } else {
                    const stats = target.getComponent(Stats);
                    if (stats) {
                        const attr = stats.attributes.get(statName);
                        if (attr) {
                            attr.value = value;
                            ctx.messageService.success(ctx.socketId, `Set ${statName} of ${targetName} to ${value}.`);
                        } else {
                            ctx.messageService.error(ctx.socketId, `Stat not found: ${statName}. Available: ${Array.from(stats.attributes.keys()).join(', ')}`);
                        }
                    } else {
                        ctx.messageService.error(ctx.socketId, `Target ${targetName} has no stats.`);
                    }
                }
            } else if (subCommand === 'set-skill') {
                if (ctx.args.length < 3) {
                    ctx.messageService.info(ctx.socketId, 'Usage: god set-skill [target] <skill> <value>');
                    return;
                }

                const value = parseInt(ctx.args[ctx.args.length - 1]);
                if (isNaN(value)) {
                    ctx.messageService.info(ctx.socketId, 'Usage: god set-skill [target] <skill> <value>');
                    return;
                }

                let targetEntity = undefined;
                let targetName = 'me';
                let skillName = '';

                // Try to find a target from the first few words
                for (let i = 1; i < ctx.args.length - 1; i++) {
                    const potentialTargetName = ctx.args.slice(1, i + 1).join(' ');
                    const found = findTarget(ctx, potentialTargetName);
                    if (found) {
                        targetEntity = found;
                        targetName = potentialTargetName;
                        skillName = ctx.args.slice(i + 1, ctx.args.length - 1).join(' ');
                    }
                }

                if (!targetEntity) {
                    targetEntity = ctx.engine.getEntity(ctx.socketId);
                    targetName = 'me';
                    skillName = ctx.args.slice(1, ctx.args.length - 1).join(' ');
                }

                if (!targetEntity) {
                    ctx.messageService.error(ctx.socketId, `Target not found: ${targetName}`);
                    return;
                }

                const stats = targetEntity.getComponent(Stats);
                if (stats) {
                    // Try exact match first
                    let skill = stats.skills.get(skillName);
                    if (!skill) {
                        // Try case-insensitive match
                        const key = Array.from(stats.skills.keys()).find(k => k.toLowerCase() === skillName.toLowerCase());
                        if (key) skill = stats.skills.get(key);
                    }

                    if (skill) {
                        skill.level = value;
                        skill.uses = 0;
                        skill.maxUses = value * 10;
                        ctx.messageService.success(ctx.socketId, `Set skill ${skill.name} of ${targetName} to level ${value}.`);
                    } else {
                        ctx.messageService.error(ctx.socketId, `Skill not found: ${skillName}. Available: ${Array.from(stats.skills.keys()).join(', ')}`);
                    }
                } else {
                    ctx.messageService.error(ctx.socketId, `Target ${targetName} has no stats.`);
                }
            } else if (subCommand === 'view') {
                const targetName = ctx.args[1] || 'me';
                const target = findTarget(ctx, targetName);
                if (!target) {
                    ctx.messageService.error(ctx.socketId, `Target not found: ${targetName}`);
                    return;
                }

                const stats = target.getComponent(Stats);
                const combatStats = target.getComponent(CombatStats);
                const npc = target.getComponent(NPC);

                let msg = `<title>[God View: ${npc ? npc.typeName : (target.id === ctx.socketId ? 'You' : 'Player ' + target.id)}]</title>\n`;

                if (combatStats) {
                    msg += `<info>HP:</info> <success>${combatStats.hp}/${combatStats.maxHp}</success>\n`;
                    msg += `<info>Attack:</info> ${combatStats.attack} | <info>Defense:</info> ${combatStats.defense}\n`;
                }

                if (stats) {
                    msg += `<title>-- Attributes --</title>\n`;
                    for (const [name, attr] of stats.attributes) {
                        msg += `<info>${name}:</info> ${attr.value}  `;
                    }
                    msg += `\n<title>-- Skills --</title>\n`;
                    for (const [name, skill] of stats.skills) {
                        msg += `<info>${name}:</info> Lvl ${skill.level} (${skill.uses}/${skill.maxUses})\n`;
                    }
                }

                ctx.messageService.info(ctx.socketId, msg);
            } else if (subCommand === 'reset') {
                const target = ctx.args[1];
                if (!target) {
                    ctx.messageService.info(ctx.socketId, 'Usage: god reset <skills|health>');
                    return;
                }

                const player = ctx.engine.getEntity(ctx.socketId);
                if (!player) return;

                if (target === 'skills' || target === 'score') {
                    const stats = player.getComponent(Stats);
                    if (stats) {
                        for (const [key, skill] of stats.skills) {
                            skill.level = 1;
                            skill.uses = 0;
                            skill.maxUses = 10;
                        }
                        ctx.messageService.success(ctx.socketId, 'Skills reset to Level 1.');
                    }
                } else if (target === 'health' || target === 'hp') {
                    const combatStats = player.getComponent(CombatStats);
                    if (combatStats) {
                        combatStats.hp = combatStats.maxHp;
                        ctx.messageService.success(ctx.socketId, 'Health restored to full.');
                    }
                } else {
                    ctx.messageService.error(ctx.socketId, `Unknown reset target: ${target}`);
                }
            } else if (subCommand === 'weather') {
                ctx.systems.atmosphere.triggerWeatherChange(ctx.engine);
                ctx.messageService.success(ctx.socketId, 'Weather change triggered.');
            } else if (subCommand === 'pacify') {
                const targetName = ctx.args.slice(1).join(' ');
                const player = ctx.engine.getEntity(ctx.socketId);
                const pos = player?.getComponent(Position);
                if (!pos) return;

                if (targetName) {
                    const target = findTarget(ctx, targetName);
                    const combatStats = target?.getComponent(CombatStats);
                    if (combatStats) {
                        combatStats.isHostile = false;
                        combatStats.engagementTier = EngagementTier.DISENGAGED;
                        ctx.messageService.success(ctx.socketId, `Pacified ${targetName}.`);
                    } else {
                        ctx.messageService.error(ctx.socketId, `Target ${targetName} not found or has no combat stats.`);
                    }
                } else {
                    // Pacify all in room
                    const npcs = WorldQuery.findNPCsAt(ctx.engine, pos.x, pos.y);
                    npcs.forEach(npc => {
                        const combatStats = npc.getComponent(CombatStats);
                        if (combatStats) {
                            combatStats.isHostile = false;
                            combatStats.engagementTier = EngagementTier.DISENGAGED;
                        }
                    });
                    ctx.messageService.success(ctx.socketId, `Pacified all NPCs in the room.`);
                }
            } else if (subCommand === 'registry') {
                const items = ItemRegistry.getInstance().getAllItems();
                const uniqueItems = Array.from(new Set(items));
                let msg = `<title>[Item Registry - ${uniqueItems.length} unique items]</title>\n`;
                uniqueItems.slice(0, 50).forEach(item => {
                    msg += `<info>${item.id}</info>: <cmd>${item.name}</cmd> | <success>${item.shortName}</success>\n`;
                });
                ctx.messageService.info(ctx.socketId, msg);
            } else if (subCommand === 'find') {
                const targetName = ctx.args.slice(1).join(' ');
                if (!targetName) {
                    ctx.messageService.info(ctx.socketId, 'Usage: god find <name>');
                    return;
                }

                let found = false;
                let msg = `<title>[Search Results for: ${targetName}]</title>\n`;

                for (const [id, entity] of ctx.engine.getEntities()) {
                    const desc = entity.getComponent(Description);
                    const pos = entity.getComponent(Position);
                    const npc = entity.getComponent(NPC);
                    const item = entity.getComponent(Item);

                    const name = npc?.typeName || item?.name || desc?.title || id;

                    if (name.toLowerCase().includes(targetName.toLowerCase())) {
                        found = true;
                        const posStr = pos ? `(${pos.x}, ${pos.y})` : 'No Position';
                        msg += `<info>${name}</info> [${id}] at ${posStr}\n`;
                    }
                }

                if (!found) {
                    ctx.messageService.error(ctx.socketId, `No entities found matching: ${targetName}`);
                } else {
                    ctx.messageService.info(ctx.socketId, msg);
                }
            }
        }
    });

    registry.register({
        name: 'refresh',
        aliases: ['reset'],
        description: 'Reset your character to default stats (for testing)',
        execute: (ctx) => {
            const player = ctx.engine.getEntity(ctx.socketId);
            if (!player) return;

            // Remove and re-add Stats component to get new defaults
            if (player.hasComponent(Stats)) {
                player.removeComponent(Stats);
            }
            player.addComponent(new Stats());

            // Reset CombatStats to new defaults
            const combatStats = player.getComponent(CombatStats);
            if (combatStats) {
                combatStats.hp = 150;
                combatStats.maxHp = 150;
                combatStats.attack = 15;
                combatStats.defense = 5;
            }

            ctx.messageService.success(ctx.socketId, 'Character refreshed to default stats!');
            ctx.systems.character.handleSheet(ctx.socketId, ctx.engine);
        },
        ignoresRoundtime: true
    });
};
