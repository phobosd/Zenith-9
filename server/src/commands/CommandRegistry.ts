import { Server } from 'socket.io';
import { MovementSystem } from '../systems/MovementSystem';
import { InteractionSystem } from '../systems/InteractionSystem';
import { NPCSystem } from '../systems/NPCSystem';
import { CombatSystem } from '../systems/CombatSystem';
import { Entity } from '../ecs/Entity';

export interface SystemRegistry {
    movement: MovementSystem;
    interaction: InteractionSystem;
    npc: NPCSystem;
    combat: CombatSystem;
}

export interface IEngine {
    addEntity(entity: Entity): void;
    removeEntity(entityId: string): void;
    getEntity(entityId: string): Entity | undefined;
    getEntities(): Map<string, Entity>;
}

export interface CommandContext {
    socketId: string;
    args: string[];
    io: Server;
    engine: IEngine;
    systems: SystemRegistry;
}

export interface Command {
    name: string;
    aliases: string[];
    description: string;
    execute: (context: CommandContext) => void;
}

export class CommandRegistry {
    private commands: Map<string, Command> = new Map();

    register(command: Command) {
        this.commands.set(command.name, command);
        command.aliases.forEach(alias => this.commands.set(alias, command));
    }

    execute(input: string, context: CommandContext) {
        const parts = input.trim().split(/\s+/);
        const commandName = parts[0].toLowerCase();
        const args = parts.slice(1);
        context.args = args; // Update args in context

        const command = this.commands.get(commandName);

        if (command) {
            try {
                command.execute(context);
            } catch (error) {
                console.error(`Error executing command '${commandName}':`, error);
                context.io.to(context.socketId).emit('message', `<error>An internal error occurred while executing the command.</error>`);
            }
        } else {
            context.io.to(context.socketId).emit('message', "Invalid command. Type '?' for a list of commands.");
        }
    }

    getHelp(): string {
        const uniqueCommands = Array.from(new Set(this.commands.values()));
        const helpLines = uniqueCommands.map(cmd => {
            const aliases = cmd.aliases.length > 0 ? ` (${cmd.aliases.join(', ')})` : '';
            return `<cmd>${cmd.name}${aliases}</cmd>: ${cmd.description}`;
        });
        return `<title>[Available Commands]</title>\n` + helpLines.join('\n');
    }
}
