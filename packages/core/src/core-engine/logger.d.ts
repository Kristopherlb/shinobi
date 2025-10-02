/**
 * Enterprise-grade logger for the CDK Platform
 */
export declare enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3,
    SUCCESS = 4
}
export interface LogEntry {
    timestamp: Date;
    level: LogLevel;
    message: string;
    data?: any;
}
export declare class Logger {
    private logLevel;
    private logs;
    constructor(logLevel?: LogLevel);
    debug(message: string, data?: any): void;
    info(message: string, data?: any): void;
    warn(message: string, data?: any): void;
    error(message: string, data?: any): void;
    success(message: string, data?: any): void;
    private log;
    private getLevelPrefix;
    getLogs(): LogEntry[];
    clear(): void;
}
//# sourceMappingURL=logger.d.ts.map