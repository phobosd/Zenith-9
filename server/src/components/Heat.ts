import { Component } from '../ecs/Component';

export class Heat extends Component {
    static type = 'Heat';

    value: number = 0; // 0 to 100
    decayRate: number = 1; // Amount to decay per tick/minute

    constructor(initialValue: number = 0) {
        super();
        this.value = initialValue;
    }

    increase(amount: number) {
        this.value = Math.min(100, this.value + amount);
    }

    decrease(amount: number) {
        this.value = Math.max(0, this.value - amount);
    }
}
