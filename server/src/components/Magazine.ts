import { Component } from '../ecs/Component';

export class Magazine extends Component {
    static type = 'Magazine';

    constructor(
        public capacity: number = 10,
        public currentAmmo: number = 10,
        public ammoType: string = '9mm'
    ) {
        super();
    }
}
