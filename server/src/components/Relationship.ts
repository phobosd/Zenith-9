import { Component } from '../ecs/Component';

export interface RelationshipData {
    trust: number; // 0-100
    status: 'Hostile' | 'Neutral' | 'Friendly' | 'Trusted';
    history: string[]; // List of significant interaction summaries
}

export class Relationship extends Component {
    static type = 'Relationship';

    // Map PlayerID -> RelationshipData
    public relationships: Map<string, RelationshipData> = new Map();

    constructor() {
        super();
    }

    getRelationship(playerId: string): RelationshipData {
        if (!this.relationships.has(playerId)) {
            this.relationships.set(playerId, {
                trust: 50,
                status: 'Neutral',
                history: []
            });
        }
        return this.relationships.get(playerId)!;
    }

    modifyTrust(playerId: string, amount: number) {
        const rel = this.getRelationship(playerId);
        rel.trust = Math.max(0, Math.min(100, rel.trust + amount));
        this.updateStatus(playerId);
    }

    addHistory(playerId: string, event: string) {
        const rel = this.getRelationship(playerId);
        rel.history.push(event);
        if (rel.history.length > 20) {
            rel.history.shift();
        }
    }

    private updateStatus(playerId: string) {
        const rel = this.getRelationship(playerId);
        if (rel.trust < 20) rel.status = 'Hostile';
        else if (rel.trust < 60) rel.status = 'Neutral';
        else if (rel.trust < 90) rel.status = 'Friendly';
        else rel.status = 'Trusted';
    }

    // Helper for serialization since Maps don't JSON stringify well by default
    toJSON() {
        return {
            relationships: Array.from(this.relationships.entries())
        };
    }

    fromJSON(data: any) {
        if (data.relationships) {
            this.relationships = new Map(data.relationships);
        }
    }
}
