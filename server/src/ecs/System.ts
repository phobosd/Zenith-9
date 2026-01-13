import { Entity } from './Entity';
import { IEngine } from './IEngine';

export abstract class System {
    public abstract update(engine: IEngine, deltaTime: number): void;
}
