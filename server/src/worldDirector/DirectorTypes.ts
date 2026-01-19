export enum DirectorLogLevel {
    INFO = 'info',
    WARN = 'warn',
    ERROR = 'error',
    SUCCESS = 'success'
}

export interface DirectorLogEntry {
    timestamp: number;
    level: DirectorLogLevel;
    message: string;
    context?: any;
}
