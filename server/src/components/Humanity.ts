import { Component } from '../ecs/Component';

export class Humanity extends Component {
    static type = 'Humanity';

    current: number = 100;
    max: number = 100;
    cyberwareCost: number = 0;

    constructor(current: number = 100) {
        super();
        this.current = current;
    }

    calculateLoss(cyberwareCost: number) {
        this.cyberwareCost = cyberwareCost;
        this.current = Math.max(0, this.max - this.cyberwareCost);
    }
}
