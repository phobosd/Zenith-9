import { Component } from '../ecs/Component';

export class Item extends Component {
    static type = 'Item';

    constructor(
        public name: string,
        public description: string,
        public weight: number = 0.1,
        public quantity: number = 1,
        public size: string = "Small",
        public legality: string = "Legal",
        public attributes: string = "",
        public shortName: string = ""
    ) {
        super();
        if (!this.shortName) {
            // Default shortName to the first word of the name if not provided
            this.shortName = this.name.split(' ')[0].toLowerCase();
        }
    }
}
