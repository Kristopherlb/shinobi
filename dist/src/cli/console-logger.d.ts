export interface LoggerConfig {
    verbose: boolean;
    ci: boolean;
}
export declare class Logger {
    private config;
    configure(config: LoggerConfig): void;
    info(message: string, data?: any): void;
    success(message: string, data?: any): void;
    warn(message: string, data?: any): void;
    error(message: string, error?: any): void;
    debug(message: string, data?: any): void;
    private logs;
    getLogs(): Array<{
        level: number;
        message: string;
        data?: any;
        timestamp: string;
    }>;
    private getLevelNumber;
    private addToLogs;
}
export declare const logger: Logger;
