/**
 * Strategy Pattern Implementation for Component Binding
 * Handles different binding types between components cleanly
 */
import { BindingContext, BindingResult, IBinderStrategy } from '@platform/contracts';
export interface BindingDirective {
    to?: string;
    select?: {
        type: string;
        withLabels?: Record<string, string>;
    };
    capability: string;
    access: 'read' | 'write' | 'readwrite' | 'admin';
    env?: Record<string, string>;
    options?: Record<string, any>;
}
/**
 * Strategy interface for different binding types
 */
export declare abstract class BinderStrategy implements IBinderStrategy {
    abstract canHandle(sourceType: string, targetCapability: string): boolean;
    abstract bind(context: BindingContext): BindingResult;
    protected generateSecureDescription(context: BindingContext): string;
}
/**
 * Registry for managing binder strategies
 */
export declare class BinderRegistry {
    private strategies;
    register(strategy: BinderStrategy): void;
    findStrategy(sourceType: string, targetCapability: string): BinderStrategy | null;
    getCompatibleTargets(sourceType: string): Array<{
        targetType: string;
        capability: string;
    }>;
}
/**
 * Component binder that uses registered strategies
 */
export declare class ComponentBinder {
    private binderRegistry;
    constructor(binderRegistry: BinderRegistry);
    bind(context: BindingContext): BindingResult;
}
