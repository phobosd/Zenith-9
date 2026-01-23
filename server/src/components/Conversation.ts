import { Component } from '../ecs/Component';

export class Conversation extends Component {
    static type = 'Conversation';
    constructor(public partnerId: string) {
        super();
    }
}
