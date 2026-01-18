import { Component, ComponentClass } from './Component';
import { v4 as uuidv4 } from 'uuid';
import { EventEmitter } from 'events';

export class Entity extends EventEmitter {
    public id: string;
    public components: Map<string, Component>;
    public version: number = 1;

    constructor(id?: string) {
        super();
        this.id = id || uuidv4();
        this.components = new Map();
    }

    addComponent(component: Component): void {
        const type = (component.constructor as any).type;
        this.components.set(type, component);
        this.emit('componentAdded', type);
    }

    getComponent<T extends Component>(componentClass: ComponentClass<T>): T | undefined {
        return this.components.get((componentClass as any).type) as T;
    }

    hasComponent<T extends Component>(componentClass: ComponentClass<T>): boolean {
        return this.components.has((componentClass as any).type);
    }

    removeComponent<T extends Component>(componentClass: ComponentClass<T>): void {
        const type = (componentClass as any).type;
        if (this.components.has(type)) {
            this.components.delete(type);
            this.emit('componentRemoved', type);
        }
    }

    toJSON() {
        const componentsObj: any = {};
        this.components.forEach((component, type) => {
            // Never serialize LogoutTimer
            if (type !== 'LogoutTimer') {
                componentsObj[type] = component;
            }
        });
        return {
            id: this.id,
            version: this.version,
            components: componentsObj
        };
    }
}
