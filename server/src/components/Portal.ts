import { Component } from '../ecs/Component';

export class Portal extends Component {
    static type = 'Portal';

    constructor(
        public destinationType: 'dungeon' | 'room',
        public destinationId: string = '', // For specific room IDs if needed
        public keyRequired: string = ''
    ) {
        super();
    }
}
