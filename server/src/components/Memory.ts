import { Component } from '../ecs/Component';

export interface Rumor {
    subject: string; // Entity ID or Name
    action: string;  // e.g., "killed", "bought", "stole"
    target?: string;
    location: string; // Room description or coordinates
    time: string;    // Game time string
    reliability: number; // 0-1
}

export interface MemoryEntry {
    timestamp: number;
    description: string;
    type: 'short_term' | 'long_term';
    participants?: string[]; // Entity IDs
    rumor?: Rumor;
}

export class Memory extends Component {
    static type = 'Memory';

    public shortTerm: MemoryEntry[] = [];
    public longTerm: MemoryEntry[] = [];

    constructor() {
        super();
    }

    addShortTerm(description: string, participants: string[] = []) {
        this.shortTerm.push({
            timestamp: Date.now(),
            description,
            type: 'short_term',
            participants
        });
        // Keep short term memory limited, e.g., last 10 entries
        if (this.shortTerm.length > 10) {
            this.shortTerm.shift();
        }
    }

    addLongTerm(description: string, participants: string[] = []) {
        this.longTerm.push({
            timestamp: Date.now(),
            description,
            type: 'long_term',
            participants
        });
    }
}
