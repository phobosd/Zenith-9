import { Entity } from '../../ecs/Entity';
import { CombatStats } from '../../components/CombatStats';
import { Stats } from '../../components/Stats';
import { Weapon } from '../../components/Weapon';
import { BodyPart } from '../../types/CombatTypes';
import { WoundTable } from '../../components/WoundTable';
import { IsCyberspace } from '../../components/IsCyberspace';
import { IsPersona } from '../../components/IsPersona';

export interface CriticalEffect {
    name: string;
    alert: string;
    description: string;
    apply: (target: Entity, source: Entity, skillLevel: number) => string;
}

export class WoundManager {
    private static critTable: CriticalEffect[] = [
        {
            name: "Neural Feedback",
            alert: "[!! SYNAPSE FRY !!]",
            description: "Stuns the target, scrambling their neural interface.",
            apply: (target, source, skillLevel) => {
                const duration = 1 + Math.floor(skillLevel / 5);
                return `Target stunned for ${duration} rounds!`;
            }
        },
        {
            name: "Optic Glitch",
            alert: "[!! VISUAL ERROR !!]",
            description: "Corrupts target's visual feed, reducing accuracy.",
            apply: (target, source, skillLevel) => {
                const intensity = 10 + skillLevel * 2;
                return `Target's targeting sensors scrambled! Accuracy -${intensity}%`;
            }
        },
        {
            name: "Armor Shred",
            alert: "[!! HULL BREACH !!]",
            description: "Permanently damages the target's protective plating.",
            apply: (target, source, skillLevel) => {
                const stats = target.getComponent(CombatStats);
                if (stats) {
                    const shred = 2 + Math.floor(skillLevel / 3);
                    stats.defense = Math.max(0, stats.defense - shred);
                    return `Armor stripped! Defense reduced by ${shred}.`;
                }
                return "Target has no armor to shred.";
            }
        },
        {
            name: "Ammo Cook-off",
            alert: "[!! THERMAL CRIT !!]",
            description: "Superheats the target's ammunition or power cells.",
            apply: (target, source, skillLevel) => {
                const damage = 5 + skillLevel;
                const stats = target.getComponent(CombatStats);
                if (stats) {
                    stats.hp -= damage;
                }
                return `Ammo explosion! Target takes ${damage} fire damage.`;
            }
        },
        {
            name: "Actuator Lock",
            alert: "[!! MOTOR SEIZE !!]",
            description: "Jams the target's movement servos.",
            apply: (target, source, skillLevel) => {
                const stats = target.getComponent(Stats);
                if (stats) {
                    const agiAttr = stats.attributes.get('AGI');
                    if (agiAttr) {
                        const reduction = 2 + Math.floor(skillLevel / 4);
                        agiAttr.value = Math.max(1, agiAttr.value - reduction);
                        return `Servos locked! Agility reduced by ${reduction}.`;
                    }
                }
                return "Target's movement systems unaffected.";
            }
        }
    ];

    static resolveCrit(target: Entity, source: Entity, weapon: Weapon, skillLevel: number): string {
        const roll = Math.floor(Math.random() * this.critTable.length);
        const effect = this.critTable[roll];

        let log = `\n${effect.alert}\n`;
        log += effect.apply(target, source, skillLevel);

        return log;
    }

    static applyWoundToTarget(target: Entity, part: BodyPart, level: number): string {
        const woundTable = target.getComponent(WoundTable);
        const isCyberspace = target.getComponent(IsCyberspace) || target.getComponent(IsPersona);
        if (!woundTable) return "";

        let mappedPart = part;
        if (isCyberspace) {
            // Neural Feedback: Map physical limbs to digital components
            if (part === BodyPart.Head || part === BodyPart.Eyes) mappedPart = 'Logic_Processor' as any;
            else mappedPart = 'Memory_Address' as any;
        }

        woundTable.applyWound(mappedPart, level);
        const wound = woundTable.getWound(mappedPart);

        let effectLog = `\n[WOUND] ${mappedPart}: Level ${wound?.level}`;

        if (isCyberspace) {
            effectLog = `\n[NEURAL FEEDBACK] ${mappedPart} corrupted! Level ${wound?.level}`;
        }

        // Apply functional penalties (simplified for now)
        if (level >= 8 && (part === BodyPart.Head || (mappedPart as any) === 'Logic_Processor')) {
            effectLog += "\n[STUN] Target is dazed!";
        } else if (part === BodyPart.R_Arm || part === BodyPart.L_Arm) {
            effectLog += `\n[PENALTY] Accuracy reduced!`;
        }

        return effectLog;
    }
}
