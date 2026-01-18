import { Component } from '../ecs/Component';

export class Reputation extends Component {
    static type = 'Reputation';

    // Faction Name -> Reputation Value (-100 to 100)
    factions: Map<string, number> = new Map();

    constructor() {
        super();
    }

    getReputation(faction: string): number {
        return this.factions.get(faction) || 0;
    }

    modifyReputation(faction: string, amount: number) {
        const current = this.getReputation(faction);
        const newValue = Math.max(-100, Math.min(100, current + amount));
        this.factions.set(faction, newValue);
    }
}
