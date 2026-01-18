export abstract class Component {
    public static type: string;
    constructor() { }

    fromJSON(data: any): void {
        for (const key in data) {
            const value = data[key];
            const target = (this as any)[key];

            if (value && typeof value === 'object' && value.__type === 'Map') {
                (this as any)[key] = new Map(value.data);
            } else if (target instanceof Map && value && typeof value === 'object' && value !== null) {
                // Fallback for plain objects that should be Maps
                (this as any)[key] = new Map(Object.entries(value));
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
