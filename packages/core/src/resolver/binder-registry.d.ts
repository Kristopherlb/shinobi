/**
 * Binder Registry - Manages concrete binding strategy implementations
 * Part of the Strategy pattern for component binding
 */
/**
 * Deprecated Resolver Binder Registry shim
 */
export declare class ResolverBinderRegistry {
    constructor();
    /**
     * Legacy method retained for compatibility; no registrations performed
     */
    private registerEnterpriseStrategies;
    /**
     * Legacy binding matrix retained for docs/tests; static suggestions only
     */
    getBindingMatrix(): Array<{
        sourceType: string;
        targetCapability: string;
        description: string;
        supported: boolean;
    }>;
    validateBinding(sourceType: string, targetCapability: string): {
        valid: boolean;
        reason?: string;
        suggestion?: string;
    };
}
//# sourceMappingURL=binder-registry.d.ts.map