/**
 * Trigger System Interfaces
 * Implementation interfaces for the trigger system defined in the Platform Binding & Trigger Specification v1.0
 */
import { TriggerDirective, TriggerContext, TriggerResult, ITriggerStrategy, TriggerCompatibilityEntry, AccessLevel } from './platform-binding-trigger-spec.js';
/**
 * Abstract base class for trigger strategies
 */
export declare abstract class TriggerStrategy implements ITriggerStrategy {
    abstract canHandle(sourceType: string, targetType: string, eventType: string): boolean;
    abstract trigger(context: TriggerContext): TriggerResult;
    abstract getCompatibilityMatrix(): TriggerCompatibilityEntry[];
    protected generateSecureDescription(context: TriggerContext): string;
    protected validateAccess(access: AccessLevel): boolean;
}
/**
 * Registry for managing trigger strategies
 */
export declare class TriggerRegistry {
    private strategies;
    register(strategy: TriggerStrategy): void;
    findStrategy(sourceType: string, targetType: string, eventType: string): TriggerStrategy | null;
    getSupportedTriggers(sourceType: string): TriggerCompatibilityEntry[];
    getAllCompatibilityEntries(): TriggerCompatibilityEntry[];
}
/**
 * Component trigger executor that uses registered strategies
 */
export declare class ComponentTrigger {
    private triggerRegistry;
    constructor(triggerRegistry: TriggerRegistry);
    trigger(context: TriggerContext): TriggerResult;
}
/**
 * Event source mapping for different AWS services
 */
export interface EventSourceMapping {
    serviceName: string;
    eventTypes: string[];
    resourceArn: string;
    configurationOptions: Record<string, any>;
}
/**
 * Trigger configuration builder for complex trigger setups
 */
export declare class TriggerConfigurationBuilder {
    private directive;
    eventType(eventType: string): this;
    target(target: {
        to?: string;
        select?: {
            type: string;
            withLabels?: Record<string, string>;
        };
    }): this;
    access(access: Extract<AccessLevel, 'invoke' | 'publish' | 'subscribe'>): this;
    filter(filter: {
        source?: string[];
        detail?: Record<string, any>;
        expressions?: string[];
    }): this;
    transform(transform: {
        input?: Record<string, string>;
        output?: Record<string, string>;
    }): this;
    options(options: {
        retry?: {
            maxAttempts?: number;
            backoffStrategy?: 'linear' | 'exponential';
        };
        deadLetter?: {
            enabled: boolean;
            maxRetries?: number;
        };
        batching?: {
            size?: number;
            window?: number;
        };
    }): this;
    metadata(metadata: {
        description?: string;
        tags?: Record<string, string>;
    }): this;
    build(): TriggerDirective;
}
/**
 * Trigger validator for runtime validation of trigger configurations
 */
export declare class TriggerValidator {
    static validateTriggerContext(context: TriggerContext): {
        valid: boolean;
        errors: string[];
    };
    static validateTriggerResult(result: TriggerResult): {
        valid: boolean;
        errors: string[];
    };
}
//# sourceMappingURL=trigger-interfaces.d.ts.map