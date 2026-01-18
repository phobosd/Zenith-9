import { Component } from '../ecs/Component';

export class Role extends Component {
    static type = 'Role';

    value: string;

    constructor(value: string = 'user') {
        super();
        this.value = value;
    }
}
