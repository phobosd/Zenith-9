import { IEngine } from '../../ecs/IEngine';
import { Position } from '../../components/Position';
import { NPC } from '../../components/NPC';
import { MessageService } from '../../services/MessageService';

export class NPCUtils {
    static broadcastToRoom(engine: IEngine, x: number, y: number, message: string, messageService: MessageService) {
        for (const entity of engine.getEntities().values()) {
            if (!entity.hasComponent(NPC)) {
                const pos = entity.getComponent(Position);
                if (pos && pos.x === x && pos.y === y) {
                    messageService.info(entity.id, message);
                }
            }
        }
    }
}
