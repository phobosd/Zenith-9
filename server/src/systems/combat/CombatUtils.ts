import { Entity } from '../../ecs/Entity';
import { Roundtime } from '../../components/Roundtime';
import { IEngine } from '../../ecs/IEngine';
import { MessageService } from '../../services/MessageService';

import { Server } from 'socket.io';
import { CombatBuffer, CombatAction } from '../../components/CombatBuffer';

export class CombatUtils {
    static emitBufferUpdate(playerId: string, buffer: CombatBuffer, io: Server, currentAction?: CombatAction) {
        io.to(playerId).emit('buffer-update', {
            actions: buffer.actions,
            maxSlots: buffer.maxSlots,
            isExecuting: buffer.isExecuting,
            isBuilding: buffer.isBuilding,
            flow: buffer.flow,
            malware: buffer.malware,
            currentAction
        });
    }

    static applyRoundtime(entity: Entity, seconds: number): void {
        let rt = entity.getComponent(Roundtime);
        if (!rt) {
            rt = new Roundtime(0);
            entity.addComponent(rt);
        }
        // Only update total if we are actually increasing the RT
        if (seconds > rt.secondsRemaining) {
            rt.secondsRemaining = seconds;
            rt.totalSeconds = seconds;
        }
    }

    static checkRoundtime(entity: Entity, messageService: MessageService, silent: boolean = false): boolean {
        const rt = entity.getComponent(Roundtime);
        if (rt && rt.secondsRemaining > 0) {
            if (!silent) {
                messageService.info(entity.id, `...wait ${rt.secondsRemaining.toFixed(1)}s`);
            }
            return false;
        }
        return true;
    }

    static parseTargetName(targetName: string): { name: string, ordinal: number } {
        const parts = targetName.toLowerCase().split(' ');
        const ordinals: { [key: string]: number } = {
            'first': 1, 'second': 2, 'third': 3, 'fourth': 4, 'fifth': 5,
            'sixth': 6, 'seventh': 7, 'eighth': 8, 'ninth': 9, 'tenth': 10
        };

        let ordinal = 1;
        let name = targetName;

        if (parts.length > 1 && ordinals[parts[0]]) {
            ordinal = ordinals[parts[0]];
            name = parts.slice(1).join(' ');
        }

        return { name, ordinal };
    }
}
