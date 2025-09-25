/**
 * Observability Handlers
 * Mock implementation for testing
 */
export interface IObservabilityHandler {
    handle(context: any): Promise<void>;
}
export interface ObservabilityConfig {
    enabled: boolean;
    level: string;
}
export declare class LambdaObservabilityHandler implements IObservabilityHandler {
    handle(context: any): Promise<void>;
}
export declare class VpcObservabilityHandler implements IObservabilityHandler {
    handle(context: any): Promise<void>;
}
export declare class AlbObservabilityHandler implements IObservabilityHandler {
    handle(context: any): Promise<void>;
}
