import { Component } from '../ecs/Component';

export class Personality extends Component {
    static type = 'Personality';

    constructor(
        public traits: string[] = [],
        public voice: string = "Neutral",
        public agenda: string = "Survive",
        public background: string = ""
    ) {
        super();
    }
}
