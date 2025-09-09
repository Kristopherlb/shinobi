/**
 * Binder Registry - Manages concrete binding strategy implementations
 * Part of the Strategy pattern for component binding
 */
import { BinderRegistry as BaseBinderRegistry } from '../patterns/binding-strategies';
/**
 * Extended Binder Registry with resolver-specific strategies
 * Inherits base registry and adds enterprise-specific binders
 */
export declare class ResolverBinderRegistry extends BaseBinderRegistry {
    constructor();
    /**
     * Register enterprise and compliance-specific binding strategies
     */
    private registerEnterpriseStrategies;
    /**
     * Get binding compatibility matrix for documentation/validation
     */
    getBindingMatrix(): Array<{
        sourceType: string;
        targetCapability: string;
        description: string;
        supported: boolean;
    }>;
    /**
     * Validate that a proposed binding is supported
     */
    validateBinding(sourceType: string, targetCapability: string): {
        valid: boolean;
        reason?: string;
        suggestion?: string;
    };
    /**
     * Get all supported source types
     */
    private getSupportedSourceTypes;
}
