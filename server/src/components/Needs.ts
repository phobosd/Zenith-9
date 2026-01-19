import { Component } from '../ecs/Component';

export class Needs extends Component {
    static type = 'Needs';

    constructor(
        public hunger: number = 0,
        public safety: number = 100,
        public social: number = 50,
        public greed: number = 50
    ) {
        super();
    }
}
