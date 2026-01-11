export enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3
}

export class Logger {
    private static currentLevel: LogLevel = LogLevel.INFO;

    static setLevel(level: LogLevel) {
        this.currentLevel = level;
    }

    static debug(context: string, message: string, ...args: any[]) {
        if (this.currentLevel <= LogLevel.DEBUG) {
            console.log(`[DEBUG][${context}] ${message}`, ...args);
        }
    }

    static info(context: string, message: string, ...args: any[]) {
        if (this.currentLevel <= LogLevel.INFO) {
            console.info(`[INFO][${context}] ${message}`, ...args);
        }
    }

    static warn(context: string, message: string, ...args: any[]) {
        if (this.currentLevel <= LogLevel.WARN) {
            console.warn(`[WARN][${context}] ${message}`, ...args);
        }
    }

    static error(context: string, message: string, error?: any) {
        if (this.currentLevel <= LogLevel.ERROR) {
            if (error) {
                console.error(`[ERROR][${context}] ${message}`, error);
            } else {
                console.error(`[ERROR][${context}] ${message}`);
            }
        }
    }
}
