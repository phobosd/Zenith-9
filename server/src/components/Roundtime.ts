import { Component } from '../ecs/Component';

export class Roundtime extends Component {
    static type = 'Roundtime';

    secondsRemaining: number;
    totalSeconds: number;

    constructor(seconds: number = 0) {
        super();
        this.secondsRemaining = seconds;
        this.totalSeconds = seconds;
    }
}
