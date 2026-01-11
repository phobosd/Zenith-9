import { Entity } from './Entity';
import { IEngine } from '../commands/CommandRegistry';

export abstract class System {
    public abstract update(engine: IEngine, deltaTime: number): void;
}
