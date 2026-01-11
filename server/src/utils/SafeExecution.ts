import { Logger } from './Logger';

export class SafeExecution {
    static run<T>(context: string, actionName: string, action: () => T, defaultValue?: T): T | undefined {
        try {
            return action();
        } catch (error) {
            Logger.error(context, `Error in ${actionName}`, error);
            return defaultValue;
        }
    }

    static async runAsync<T>(context: string, actionName: string, action: () => Promise<T>, defaultValue?: T): Promise<T | undefined> {
        try {
            return await action();
        } catch (error) {
            Logger.error(context, `Error in ${actionName}`, error);
            return defaultValue;
        }
    }
}
