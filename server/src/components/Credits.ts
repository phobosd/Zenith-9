import { Component } from '../ecs/Component';

export class Credits extends Component {
    static type = 'Credits';

    amount: number;

    constructor(amount: number = 0) {
        super();
        this.amount = amount;
    }
}
