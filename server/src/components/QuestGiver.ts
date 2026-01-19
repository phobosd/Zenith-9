
import { Component } from '../ecs/Component';

export interface QuestReward {
    credits?: number;
    xp?: number;
    items?: string[]; // Item IDs
}

export interface QuestDefinition {
    id: string;
    title: string;
    description: string;
    type: 'delivery' | 'elimination' | 'talk' | 'collection';
    targetRoomId?: string; // For delivery/travel
    targetNpcId?: string; // For elimination/talk
    rewards: QuestReward;
    requiredItemId?: string; // The package to deliver
}

export class QuestGiver extends Component {
    public availableQuests: QuestDefinition[] = [];

    constructor(quests: QuestDefinition[] = []) {
        super();
        this.availableQuests = quests;
    }
}
