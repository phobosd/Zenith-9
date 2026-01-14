import { CommandRegistry, CommandContext } from './CommandRegistry';
import { Stance, StanceType } from '../components/Stance';

const moveAndLook = (ctx: CommandContext, dir: 'n' | 's' | 'e' | 'w') => {
    const player = ctx.engine.getEntity(ctx.socketId);
    const stance = player?.getComponent(Stance);

    if (stance && stance.current !== StanceType.Standing) {
        // Let MovementSystem handle the error message
        ctx.systems.movement.queueMove(ctx.socketId, dir);
        return;
    }

    ctx.systems.movement.queueMove(ctx.socketId, dir);
};

export const registerMovementCommands = (registry: CommandRegistry) => {
    registry.register({
        name: 'north',
        aliases: ['n'],
        description: 'Move north',
        execute: (ctx) => moveAndLook(ctx, 'n')
    });

    registry.register({
        name: 'south',
        aliases: ['s'],
        description: 'Move south',
        execute: (ctx) => moveAndLook(ctx, 's')
    });

    registry.register({
        name: 'east',
        aliases: ['e'],
        description: 'Move east',
        execute: (ctx) => moveAndLook(ctx, 'e')
    });

    registry.register({
        name: 'west',
        aliases: ['w'],
        description: 'Move west',
        execute: (ctx) => moveAndLook(ctx, 'w')
    });
};
