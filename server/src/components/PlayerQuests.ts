
import { Component } from '../ecs/Component';
import { QuestDefinition } from './QuestGiver';

export interface ActiveQuest extends QuestDefinition {
    acceptedAt: number;
    status: 'active' | 'completed' | 'failed';
}

export class PlayerQuests extends Component {
    public active: ActiveQuest[] = [];
    public completedIds: string[] = [];

    constructor() {
        super();
    }
}
