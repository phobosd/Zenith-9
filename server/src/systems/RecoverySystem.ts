import { System } from '../ecs/System';
import { CombatStats } from '../components/CombatStats';
import { Stats } from '../components/Stats';
import { IEngine } from '../ecs/IEngine';

export class RecoverySystem extends System {
    private regenTimer: number = 0;
    private readonly REGEN_INTERVAL = 5000; // Regenerate every 5 seconds

    update(engine: IEngine, dt: number): void {
        this.regenTimer += dt;
        if (this.regenTimer >= this.REGEN_INTERVAL) {
            this.regenTimer = 0;
            this.processRegeneration(engine);
        }
    }

    private processRegeneration(engine: IEngine): void {
        const entities = engine.getEntitiesWithComponent(CombatStats);
        for (const entity of entities) {
            const combatStats = entity.getComponent(CombatStats);
            const stats = entity.getComponent(Stats);
            if (!combatStats) continue;

            // Health Regeneration
            if (combatStats.hp < combatStats.maxHp) {
                // Base regen + bonus from CON
                const con = stats?.attributes.get('CON')?.value || 10;
                const regenAmount = 1 + Math.floor(con / 10);
                combatStats.hp = Math.min(combatStats.maxHp, combatStats.hp + regenAmount);
            }

            // Fatigue Recovery
            if (combatStats.fatigue > 0) {
                const con = stats?.attributes.get('CON')?.value || 10;
                const recoveryAmount = 2 + Math.floor(con / 5);
                combatStats.fatigue = Math.max(0, combatStats.fatigue - recoveryAmount);
            }
        }
    }
}
