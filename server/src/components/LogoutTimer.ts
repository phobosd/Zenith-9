import { Component } from '../ecs/Component';

export class LogoutTimer extends Component {
    static type = 'LogoutTimer';
    secondsRemaining: number;

    constructor(seconds: number = 5) {
        super();
        this.secondsRemaining = seconds;
    }
}
