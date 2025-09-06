export interface LoggerConfig {
    verbose: boolean;
    ci: boolean;
}
declare class Logger {
    private config;
    configure(config: LoggerConfig): void;
    info(message: string, data?: any): void;
    success(message: string, data?: any): void;
    warn(message: string, data?: any): void;
    error(message: string, error?: any): void;
    debug(message: string, data?: any): void;
}
export declare const logger: Logger;
export {};
