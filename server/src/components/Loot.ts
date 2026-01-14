import { Component } from '../ecs/Component';

export class Loot extends Component {
    static type = 'Loot';

    constructor(public itemEntityIds: string[] = []) {
        super();
    }
}
