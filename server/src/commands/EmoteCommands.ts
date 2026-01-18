import { CommandRegistry } from './CommandRegistry';
import { Position } from '../components/Position';
import { Description } from '../components/Description';

/**
 * Predefined emotes for quick social interactions
 * Each emote has first-person and third-person messages
 */
interface EmoteDefinition {
    self: string;      // What the player sees
    others: string;    // What others see (use {name} as placeholder)
    targeted?: {       // Optional: targeted version
        self: string;
        others: string;
        target: string;
    };
}

const EMOTES: Record<string, EmoteDefinition> = {
    nod: {
        self: 'You nod.',
        others: '{name} nods.',
        targeted: {
            self: 'You nod at {target}.',
            others: '{name} nods at {target}.',
            target: '{name} nods at you.'
        }
    },
    grin: {
        self: 'You grin.',
        others: '{name} grins.',
        targeted: {
            self: 'You grin at {target}.',
            others: '{name} grins at {target}.',
            target: '{name} grins at you.'
        }
    },
    laugh: {
        self: 'You laugh.',
        others: '{name} laughs.',
        targeted: {
            self: 'You laugh at {target}.',
            others: '{name} laughs at {target}.',
            target: '{name} laughs at you.'
        }
    },
    shrug: {
        self: 'You shrug.',
        others: '{name} shrugs.',
        targeted: {
            self: 'You shrug at {target}.',
            others: '{name} shrugs at {target}.',
            target: '{name} shrugs at you.'
        }
    },
    wave: {
        self: 'You wave.',
        others: '{name} waves.',
        targeted: {
            self: 'You wave at {target}.',
            others: '{name} waves at {target}.',
            target: '{name} waves at you.'
        }
    },
    bow: {
        self: 'You bow respectfully.',
        others: '{name} bows respectfully.',
        targeted: {
            self: 'You bow respectfully to {target}.',
            others: '{name} bows respectfully to {target}.',
            target: '{name} bows respectfully to you.'
        }
    },
    salute: {
        self: 'You snap off a crisp salute.',
        others: '{name} snaps off a crisp salute.',
        targeted: {
            self: 'You salute {target}.',
            others: '{name} salutes {target}.',
            target: '{name} salutes you.'
        }
    },
    glare: {
        self: 'You glare.',
        others: '{name} glares.',
        targeted: {
            self: 'You glare at {target}.',
            others: '{name} glares at {target}.',
            target: '{name} glares at you.'
        }
    },
    smirk: {
        self: 'You smirk.',
        others: '{name} smirks.',
        targeted: {
            self: 'You smirk at {target}.',
            others: '{name} smirks at {target}.',
            target: '{name} smirks at you.'
        }
    },
    sigh: {
        self: 'You sigh.',
        others: '{name} sighs.',
        targeted: {
            self: 'You sigh at {target}.',
            others: '{name} sighs at {target}.',
            target: '{name} sighs at you.'
        }
    },
    frown: {
        self: 'You frown.',
        others: '{name} frowns.',
        targeted: {
            self: 'You frown at {target}.',
            others: '{name} frowns at {target}.',
            target: '{name} frowns at you.'
        }
    },
    chuckle: {
        self: 'You chuckle.',
        others: '{name} chuckles.',
        targeted: {
            self: 'You chuckle at {target}.',
            others: '{name} chuckles at {target}.',
            target: '{name} chuckles at you.'
        }
    },
    wink: {
        self: 'You wink.',
        others: '{name} winks.',
        targeted: {
            self: 'You wink at {target}.',
            others: '{name} winks at {target}.',
            target: '{name} winks at you.'
        }
    },
    // Cyberpunk-specific emotes
    jack: {
        self: 'You tap the neural jack at the base of your skull.',
        others: '{name} taps the neural jack at the base of their skull.',
        targeted: {
            self: 'You tap your neural jack and point at {target}.',
            others: '{name} taps their neural jack and points at {target}.',
            target: '{name} taps their neural jack and points at you.'
        }
    },
    glitch: {
        self: 'Your cybernetic eye flickers and glitches momentarily.',
        others: "{name}'s cybernetic eye flickers and glitches momentarily.",
        targeted: {
            self: 'Your cybernetic eye glitches as you look at {target}.',
            others: "{name}'s cybernetic eye glitches as they look at {target}.",
            target: "{name}'s cybernetic eye glitches as they look at you."
        }
    }
};

export function registerEmoteCommands(registry: CommandRegistry) {
    // Register each emote as a command
    Object.entries(EMOTES).forEach(([emoteName, emote]) => {
        registry.register({
            name: emoteName,
            aliases: [],
            description: `Emote: ${emote.self}`,
            execute: (ctx) => {
                const player = ctx.engine.getEntity(ctx.socketId);
                if (!player) return;

                const pos = player.getComponent(Position);
                if (!pos) return;

                const charName = player.getComponent(Description)?.title || 'Someone';
                const roomName = `room:${pos.x}:${pos.y}`;

                // Check if there's a target
                const targetArg = ctx.args.join(' ').trim();

                if (targetArg && emote.targeted) {
                    // Find target in room
                    const roomEntities = ctx.engine.getEntitiesWithComponent(Position)
                        .filter(e => {
                            const p = e.getComponent(Position);
                            return p && p.x === pos.x && p.y === pos.y && e.id !== ctx.socketId;
                        });

                    const target = roomEntities.find(e => {
                        const desc = e.getComponent(Description);
                        return desc?.title.toLowerCase() === targetArg.toLowerCase();
                    });

                    if (target) {
                        const targetName = target.getComponent(Description)?.title || 'Someone';

                        // Send to self
                        ctx.messageService.info(
                            ctx.socketId,
                            emote.targeted.self.replace('{target}', targetName)
                        );

                        // Send to target
                        ctx.io.to(target.id).emit('message', {
                            type: 'emote',
                            content: emote.targeted.target.replace('{name}', charName)
                        });

                        // Send to others in room (excluding sender and target)
                        ctx.io.to(roomName).except([ctx.socketId, target.id]).emit('message', {
                            type: 'emote',
                            content: emote.targeted.others
                                .replace('{name}', charName)
                                .replace('{target}', targetName)
                        });
                    } else {
                        ctx.messageService.error(ctx.socketId, `You don't see '${targetArg}' here.`);
                    }
                } else {
                    // Untargeted emote
                    // Send to self
                    ctx.messageService.info(ctx.socketId, emote.self);

                    // Send to others in room
                    ctx.io.to(roomName).except(ctx.socketId).emit('message', {
                        type: 'emote',
                        content: emote.others.replace('{name}', charName)
                    });
                }
            },
            ignoresRoundtime: true
        });
    });
}
