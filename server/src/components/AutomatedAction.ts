import { Component } from '../ecs/Component';

export class AutomatedAction extends Component {
    static type = 'AutomatedAction';

    constructor(
        public type: 'ADVANCE' | 'RETREAT',
        public targetId: string
    ) {
        super();
    }
}
