import { CommandContext } from '../commands/CommandRegistry';
import { Entity } from '../ecs/Entity';
import { Position } from '../components/Position';
import { NPC } from '../components/NPC';
import { Stats } from '../components/Stats';
import { WorldQuery } from './WorldQuery';

export const findTarget = (ctx: CommandContext, targetName: string): Entity | undefined => {
    if (!targetName || targetName.toLowerCase() === 'me' || targetName.toLowerCase() === 'self') {
        return ctx.engine.getEntity(ctx.socketId);
    }

    // Get player position
    const player = ctx.engine.getEntity(ctx.socketId);
    if (!player) return undefined;
    const pos = player.getComponent(Position);
    if (!pos) return undefined;

    const ordinalNames = ["first", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth", "ninth", "tenth"];
    const parts = targetName.toLowerCase().split(' ');
    let ordinal = 1;
    let searchName = targetName;

    if (parts.length > 1) {
        const firstPart = parts[0];
        const index = ordinalNames.indexOf(firstPart);
        if (index !== -1) {
            ordinal = index + 1;
            searchName = parts.slice(1).join(' ');
        } else {
            const lastPart = parts[parts.length - 1];
            const num = parseInt(lastPart);
            if (!isNaN(num)) {
                ordinal = num;
                searchName = parts.slice(0, -1).join(' ');
            }
        }
    }

    // Search for NPCs in the same room
    const npcs = WorldQuery.findNPCsAt(ctx.engine, pos.x, pos.y);
    const matchingNPCs = npcs.filter((n: Entity) => {
        const npcComp = n.getComponent(NPC);
        return npcComp && npcComp.typeName.toLowerCase().includes(searchName.toLowerCase());
    });

    if (matchingNPCs.length >= ordinal) {
        return matchingNPCs[ordinal - 1];
    }

    // Search for other players in the same room
    const entities = ctx.engine.getEntities();
    let playerMatchCount = 0;
    for (const [id, entity] of entities) {
        if (id === ctx.socketId) continue;
        const ePos = entity.getComponent(Position);
        if (ePos && ePos.x === pos.x && ePos.y === pos.y) {
            // Check if it's a player (has Stats but not NPC)
            if (entity.hasComponent(Stats) && !entity.hasComponent(NPC)) {
                if (id.toLowerCase().includes(searchName.toLowerCase())) {
                    playerMatchCount++;
                    if (playerMatchCount === ordinal) return entity;
                }
            }
        }
    }

    // Search globally by ID
    const globalEntity = ctx.engine.getEntity(targetName);
    if (globalEntity) return globalEntity;

    return undefined;
};
