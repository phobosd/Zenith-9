export abstract class Component {
    public static type: string;
    constructor() { }

    fromJSON(data: any): void {
        for (const key in data) {
            const value = data[key];
            if (value && typeof value === 'object' && value.__type === 'Map') {
                (this as any)[key] = new Map(value.data);
            } else {
                (this as any)[key] = value;
            }
        }
    }

    toJSON(): any {
        const obj: any = {};
        for (const key in this) {
            if (Object.prototype.hasOwnProperty.call(this, key)) {
                const value = (this as any)[key];
                if (value instanceof Map) {
                    obj[key] = { __type: 'Map', data: Array.from(value.entries()) };
                } else {
                    obj[key] = value;
                }
            }
        }
        return obj;
    }
}

export type ComponentClass<T extends Component> = new (...args: any[]) => T;
