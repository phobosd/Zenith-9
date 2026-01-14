import { Entity } from '../../ecs/Entity';
import { IEngine } from '../../ecs/IEngine';
import { AutomatedAction } from '../../components/AutomatedAction';
import { Position } from '../../components/Position';
import { CombatStats } from '../../components/CombatStats';
import { Stats } from '../../components/Stats';
import { Roundtime } from '../../components/Roundtime';
import { WorldQuery } from '../../utils/WorldQuery';
import { MessageService } from '../../services/MessageService';
import { CombatUtils } from './CombatUtils';
import { ManeuverHandler } from './ActionHandlers/ManeuverHandler';
import { EngagementTier } from '../../types/CombatTypes';

export class AutomationManager {
    static processAutomatedActions(engine: IEngine, messageService: MessageService): void {
        const automatedEntities = engine.getEntitiesWithComponent(AutomatedAction);
        for (const entity of automatedEntities) {
            const action = entity.getComponent(AutomatedAction);
            if (!action) continue;

            // Check if entity is in Roundtime
            if (!CombatUtils.checkRoundtime(entity, messageService, true)) continue;

            // Validate Target
            const target = WorldQuery.getEntityById(engine, action.targetId);
            if (!target) {
                messageService.info(entity.id, "Target lost. Stopping action.");
                entity.removeComponent(AutomatedAction);
                continue;
            }

            // Check if target is still in same room
            const pos = entity.getComponent(Position);
            const targetPos = target.getComponent(Position);
            if (!pos || !targetPos || pos.x !== targetPos.x || pos.y !== targetPos.y) {
                messageService.info(entity.id, "Target is no longer here. Stopping action.");
                entity.removeComponent(AutomatedAction);
                continue;
            }

            // Perform Action
            if (action.type === 'ADVANCE') {
                const result = ManeuverHandler.performManeuver(entity, target, 'CLOSE', engine, messageService);

                const stats = entity.getComponent(CombatStats);
                if (stats?.engagementTier === EngagementTier.MELEE) {
                    entity.removeComponent(AutomatedAction);
                    messageService.info(entity.id, "You reach melee range and stop advancing.");
                } else if (result === 'MAX_RANGE' || result === 'FAIL_STOP') {
                    entity.removeComponent(AutomatedAction);
                    messageService.info(entity.id, "You stop advancing.");
                }
            } else if (action.type === 'RETREAT') {
                const result = ManeuverHandler.performManeuver(entity, target, 'WITHDRAW', engine, messageService);
                if (result === 'MAX_RANGE' || result === 'FAIL_STOP') {
                    entity.removeComponent(AutomatedAction);
                    messageService.info(entity.id, "You stop retreating.");
                }
            }
        }
    }

    static processRegeneration(engine: IEngine, deltaTime: number): void {
        const entities = engine.getEntitiesWithComponent(CombatStats);

        entities.forEach(entity => {
            const stats = entity.getComponent(CombatStats);
            const playerStats = entity.getComponent(Stats);

            if (stats && playerStats) {
                // Balance regens over time (0.05 per second)
                if (stats.balance < 1.0) {
                    const regenRate = 0.05 * (deltaTime / 1000);
                    stats.balance = Math.min(1.0, stats.balance + regenRate);
                }

                // Fatigue Regeneration
                const con = playerStats.attributes.get('CON')?.value || 10;
                const maxFatigue = con * 10;

                if (stats.fatigue < maxFatigue) {
                    const fatigueRegen = (2 + (con / 10)) * (deltaTime / 1000);
                    stats.fatigue = Math.min(maxFatigue, stats.fatigue + fatigueRegen);
                }

                // Exhaustion Check
                if (stats.fatigue <= 0) {
                    stats.balance = Math.min(0.5, stats.balance);
                }
            }

            // Update Roundtime
            const rt = entity.getComponent(Roundtime);
            if (rt && rt.secondsRemaining > 0) {
                rt.secondsRemaining -= deltaTime / 1000;
                if (rt.secondsRemaining < 0) rt.secondsRemaining = 0;
            }
        });
    }

    static handleStop(playerId: string, engine: IEngine, messageService: MessageService) {
        const player = WorldQuery.getEntityById(engine, playerId);
        if (!player) return;

        if (player.hasComponent(AutomatedAction)) {
            player.removeComponent(AutomatedAction);
            messageService.info(playerId, "You stop your actions.");
        } else {
            messageService.info(playerId, "You aren't doing anything automatically.");
        }
    }
}
