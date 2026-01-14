import { Entity } from '../../ecs/Entity';
import { IEngine } from '../../ecs/IEngine';
import { Position } from '../../components/Position';
import { NPC } from '../../components/NPC';
import { MessageService } from '../../services/MessageService';
import { MessageFormatter } from '../../utils/MessageFormatter';
import { NPCUtils } from './NPCUtils';

export class NPCBehaviorHandler {
    static bark(npc: Entity, npcComp: NPC, pos: Position, engine: IEngine, messageService: MessageService) {
        if (!npcComp.barks || npcComp.barks.length === 0) return;

        const bark = npcComp.barks[Math.floor(Math.random() * npcComp.barks.length)];
        const message = MessageFormatter.speech(npcComp.typeName, bark);

        // Broadcast to players in the same room
        NPCUtils.broadcastToRoom(engine, pos.x, pos.y, message, messageService);
    }
}
