import { Component } from '../ecs/Component';

export class Inventory extends Component {
    static type = 'Inventory';

    public leftHand: string | null = null;
    public rightHand: string | null = null;
    public equipment: Map<string, string> = new Map(); // slot -> entityId

    constructor() {
        super();
    }

    public addItem(itemId: string): boolean {
        if (!this.rightHand) {
            this.rightHand = itemId;
            return true;
        }
        if (!this.leftHand) {
            this.leftHand = itemId;
            return true;
        }
        return false;
    }

    public removeItem(itemId: string): boolean {
        if (this.leftHand === itemId) {
            this.leftHand = null;
            return true;
        }
        if (this.rightHand === itemId) {
            this.rightHand = null;
            return true;
        }
        return false;
    }

    public hasItem(itemId: string): boolean {
        return this.leftHand === itemId || this.rightHand === itemId;
    }
}
