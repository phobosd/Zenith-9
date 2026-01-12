import { Component } from '../ecs/Component';
import { BodyPart } from '../types/CombatTypes';

export interface Wound {
    level: number; // 0-10
    isProsthetic: boolean;
    isBleeding: boolean;
}

export class WoundTable extends Component {
    static type = 'WoundTable';

    wounds: Map<BodyPart, Wound> = new Map();

    constructor() {
        super();
        // Initialize all body parts with 0 wounds
        Object.values(BodyPart).forEach(part => {
            this.wounds.set(part as BodyPart, {
                level: 0,
                isProsthetic: false,
                isBleeding: false
            });
        });
    }

    getWound(part: BodyPart): Wound | undefined {
        return this.wounds.get(part);
    }

    applyWound(part: BodyPart, level: number, isProsthetic: boolean = false) {
        const wound = this.wounds.get(part);
        if (wound) {
            wound.level = Math.min(10, wound.level + level);
            wound.isProsthetic = isProsthetic;
            if (!isProsthetic && level > 0) {
                wound.isBleeding = true;
            }
        }
    }
}
