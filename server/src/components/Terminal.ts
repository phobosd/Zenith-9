import { Component } from '../ecs/Component';

export class Terminal extends Component {
    static type = 'Terminal';

    constructor(
        public id: string,
        public data: any = {}
    ) {
        super();
    }
}
