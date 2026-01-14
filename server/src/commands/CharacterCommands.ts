import { CommandRegistry } from './CommandRegistry';
import { Stats } from '../components/Stats';

export const registerCharacterCommands = (registry: CommandRegistry) => {
    registry.register({
        name: 'sheet',
        aliases: ['stats'],
        description: 'View your character attributes',
        execute: (ctx) => ctx.systems.character.handleSheet(ctx.socketId, ctx.engine),
        ignoresRoundtime: true
    });

    registry.register({
        name: 'score',
        aliases: ['skills'],
        description: 'View your character skills',
        execute: (ctx) => ctx.systems.character.handleScore(ctx.socketId, ctx.engine),
        ignoresRoundtime: true
    });
};
