import { CommandRegistry } from './CommandRegistry';
import { StanceType } from '../components/Stance';

export const registerInteractionCommands = (registry: CommandRegistry) => {
    registry.register({
        name: 'look',
        aliases: ['l', 'la'],
        description: 'Look at the room, an item, or an NPC',
        execute: (ctx) => {
            let target = ctx.args.join(' ');
            if (target.toLowerCase().startsWith('at ')) {
                target = target.substring(3).trim();
            }
            ctx.systems.observation.handleLook(ctx.socketId, ctx.engine, target);
        },
        ignoresRoundtime: true
    });

    registry.register({
        name: 'map',
        aliases: ['m'],
        description: 'View the area map',
        execute: (ctx) => ctx.systems.observation.handleMap(ctx.socketId, ctx.engine),
        ignoresRoundtime: true
    });

    registry.register({
        name: 'get',
        aliases: ['g', 'take'],
        description: 'Pick up an item',
        execute: (ctx) => ctx.systems.inventory.handleGet(ctx.socketId, ctx.args.join(' '), ctx.engine)
    });

    registry.register({
        name: 'drop',
        aliases: ['d'],
        description: 'Drop an item',
        execute: (ctx) => ctx.systems.inventory.handleDrop(ctx.socketId, ctx.args.join(' '), ctx.engine)
    });

    registry.register({
        name: 'read',
        aliases: ['scan'],
        description: 'Read a terminal or object',
        execute: (ctx) => ctx.systems.interaction.handleRead(ctx.socketId, ctx.engine, ctx.args.join(' '))
    });

    registry.register({
        name: 'enter',
        aliases: ['go'],
        description: 'Enter a door or portal',
        execute: (ctx) => ctx.systems.portal.handleEnter(ctx.socketId, ctx.engine, ctx.args.join(' '))
    });

    registry.register({
        name: 'jack_in',
        aliases: ['connect', 'jackin'],
        description: 'Jack into the Matrix',
        execute: (ctx) => ctx.systems.cyberspace.handleJackIn(ctx.socketId, ctx.engine)
    });

    registry.register({
        name: 'jack_out',
        aliases: ['disconnect', 'jackout'],
        description: 'Jack out of the Matrix',
        execute: (ctx) => ctx.systems.cyberspace.handleJackOut(ctx.socketId, ctx.engine)
    });

    registry.register({
        name: 'inventory',
        aliases: ['inv', 'i'],
        description: 'Check your inventory',
        execute: (ctx) => ctx.systems.inventory.handleInventory(ctx.socketId, ctx.engine),
        ignoresRoundtime: true
    });

    registry.register({
        name: 'glance',
        aliases: ['gl'],
        description: 'Glance at your hands',
        execute: (ctx) => ctx.systems.observation.handleGlance(ctx.socketId, ctx.engine),
        ignoresRoundtime: true
    });

    registry.register({
        name: 'lie',
        aliases: ['rest', 'sleep'],
        description: 'Lie down',
        execute: (ctx) => ctx.systems.stance.handleStanceChange(ctx.socketId, StanceType.Lying, ctx.engine)
    });

    registry.register({
        name: 'sit',
        aliases: [],
        description: 'Sit down',
        execute: (ctx) => ctx.systems.stance.handleStanceChange(ctx.socketId, StanceType.Sitting, ctx.engine)
    });

    registry.register({
        name: 'stand',
        aliases: ['st'],
        description: 'Stand up',
        execute: (ctx) => ctx.systems.stance.handleStanceChange(ctx.socketId, StanceType.Standing, ctx.engine)
    });

    registry.register({
        name: 'stow',
        aliases: ['put'],
        description: 'Put an item in your backpack (Usage: stow <item>)',
        execute: (ctx) => ctx.systems.inventory.handleStow(ctx.socketId, ctx.args.join(' '), ctx.engine)
    });

    registry.register({
        name: 'swap',
        aliases: ['switch'],
        description: 'Swap items between your hands',
        execute: (ctx) => ctx.systems.inventory.handleSwap(ctx.socketId, ctx.engine)
    });

    registry.register({
        name: 'use',
        aliases: ['u'],
        description: 'Use an item from your hands or inventory',
        execute: (ctx) => ctx.systems.inventory.handleUse(ctx.socketId, ctx.args.join(' '), ctx.engine)
    });

    registry.register({
        name: 'wear',
        aliases: ['equip'],
        description: 'Wear a piece of clothing or equipment (Usage: wear <item>)',
        execute: (ctx) => ctx.systems.inventory.handleWear(ctx.socketId, ctx.args.join(' '), ctx.engine)
    });

    registry.register({
        name: 'remove',
        aliases: ['unequip', 'takeoff'],
        description: 'Remove a piece of clothing or equipment (Usage: remove <item>)',
        execute: (ctx) => ctx.systems.inventory.handleRemove(ctx.socketId, ctx.args.join(' '), ctx.engine)
    });

    registry.register({
        name: 'turn',
        aliases: ['rotate'],
        description: 'Turn an object (Usage: turn <object> <direction>)',
        execute: (ctx) => {
            const args = ctx.args;
            if (args.length < 2) {
                ctx.io.to(ctx.socketId).emit('message', 'Usage: turn <object> <direction>');
                return;
            }
            const direction = args.pop(); // Last arg is direction
            if (!direction) {
                ctx.io.to(ctx.socketId).emit('message', 'Usage: turn <object> <direction>');
                return;
            }
            const targetName = args.join(' '); // Rest is object name
            ctx.systems.interaction.handleTurn(ctx.socketId, ctx.engine, targetName, direction);
        }
    });

};
