/**
 * Binder Matrix Implementation
 * Central registry for all supported component interactions (bindings and triggers)
 */
import { IBinderMatrix, IBinderStrategy, ITriggerStrategy, CompatibilityEntry, TriggerCompatibilityEntry } from './platform-binding-trigger-spec';
/**
 * Implementation of the Binder Matrix - Central registry for all supported component interactions
 */
export declare class BinderMatrix implements IBinderMatrix {
    private bindingStrategies;
    private triggerStrategies;
    /**
     * Register a binding strategy
     */
    registerBindingStrategy(strategy: IBinderStrategy): void;
    /**
     * Register a trigger strategy
     */
    registerTriggerStrategy(strategy: ITriggerStrategy): void;
    /**
     * Find compatible binding strategy
     */
    findBindingStrategy(sourceType: string, targetCapability: string): IBinderStrategy | null;
    /**
     * Find compatible trigger strategy
     */
    findTriggerStrategy(sourceType: string, targetType: string, eventType: string): ITriggerStrategy | null;
    /**
     * Get all supported bindings for a source type
     */
    getSupportedBindings(sourceType: string): CompatibilityEntry[];
    /**
     * Get all supported triggers for a source type
     */
    getSupportedTriggers(sourceType: string): TriggerCompatibilityEntry[];
    /**
     * Get full compatibility matrix
     */
    getFullCompatibilityMatrix(): {
        bindings: CompatibilityEntry[];
        triggers: TriggerCompatibilityEntry[];
    };
    /**
     * Get compatibility summary for a specific source type
     */
    getCompatibilitySummary(sourceType: string): {
        bindings: CompatibilityEntry[];
        triggers: TriggerCompatibilityEntry[];
        summary: {
            totalBindings: number;
            totalTriggers: number;
            supportedTargetTypes: string[];
            supportedCapabilities: string[];
            supportedEventTypes: string[];
        };
    };
    /**
     * Validate that a binding is supported
     */
    isBindingSupported(sourceType: string, targetType: string, capability: string): boolean;
    /**
     * Validate that a trigger is supported
     */
    isTriggerSupported(sourceType: string, targetType: string, eventType: string): boolean;
    /**
     * Get recommendations for unsupported bindings
     */
    getBindingRecommendations(sourceType: string, targetType: string): CompatibilityEntry[];
    /**
     * Get recommendations for unsupported triggers
     */
    getTriggerRecommendations(sourceType: string, targetType: string): TriggerCompatibilityEntry[];
    /**
     * Export the full matrix as a configuration object
     */
    exportMatrix(): {
        version: string;
        bindings: CompatibilityEntry[];
        triggers: TriggerCompatibilityEntry[];
        metadata: {
            totalStrategies: number;
            bindingStrategies: number;
            triggerStrategies: number;
            exportedAt: string;
        };
    };
}
/**
 * Singleton instance of the global binder matrix
 */
export declare const globalBinderMatrix: BinderMatrix;
/**
 * Helper functions for working with the binder matrix
 */
export declare class BinderMatrixUtils {
    /**
     * Generate human-readable description of supported interactions
     */
    static generateCompatibilityReport(matrix: BinderMatrix): string;
    /**
     * Validate matrix consistency
     */
    static validateMatrix(matrix: BinderMatrix): {
        valid: boolean;
        errors: string[];
        warnings: string[];
    };
}
//# sourceMappingURL=binder-matrix.d.ts.map