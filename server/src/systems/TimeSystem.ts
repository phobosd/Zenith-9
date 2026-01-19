import { System } from '../ecs/System';
import { IEngine } from '../ecs/IEngine';
import { Logger } from '../utils/Logger';

export class TimeSystem extends System {
    private totalMs: number = 0;
    private hours: number = 12; // Start at noon
    private minutes: number = 0;
    private days: number = 1;

    // 1 real second = 1 game minute (configurable)
    private readonly MS_PER_GAME_MINUTE = 1000;

    constructor() {
        super();
    }

    update(engine: IEngine, deltaTime: number): void {
        this.totalMs += deltaTime;

        if (this.totalMs >= this.MS_PER_GAME_MINUTE) {
            const minutesToAdd = Math.floor(this.totalMs / this.MS_PER_GAME_MINUTE);
            this.totalMs %= this.MS_PER_GAME_MINUTE;
            this.addMinutes(minutesToAdd);
        }
    }

    private addMinutes(mins: number) {
        this.minutes += mins;
        if (this.minutes >= 60) {
            const hoursToAdd = Math.floor(this.minutes / 60);
            this.minutes %= 60;
            this.addHours(hoursToAdd);
        }
    }

    private addHours(hrs: number) {
        this.hours += hrs;
        if (this.hours >= 24) {
            const daysToAdd = Math.floor(this.hours / 24);
            this.hours %= 24;
            this.days += daysToAdd;
            Logger.info('Time', `Day ${this.days} has begun.`);
        }
    }

    public getTimeString(): string {
        const h = this.hours.toString().padStart(2, '0');
        const m = this.minutes.toString().padStart(2, '0');
        return `${h}:${m}`;
    }

    public getHours(): number { return this.hours; }
    public getMinutes(): number { return this.minutes; }
    public getDays(): number { return this.days; }

    public isDay(): boolean {
        return this.hours >= 6 && this.hours < 20; // 6 AM to 8 PM
    }
}
