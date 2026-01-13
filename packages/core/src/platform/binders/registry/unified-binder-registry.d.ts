/**
 * Unified Binder Registry
 *
 * Central registry for all unified binder strategies following design principles:
 * - Dependency injection: strategies provided via constructor (composition root pattern)
 * - No global state: no singletons, all state is instance-based
 * - Single responsibility: only handles strategy registration and lookup
 * - Configurable: supports custom strategy sets per instance
 */
import type { IUnifiedBinderStrategy } from '../../contracts/platform-binding-trigger-spec.js';
/**
 * Registry for unified binder strategies
 *
 * Strategies are registered by their supported capabilities.
 * Lookup is O(1) via Map-based storage.
 *
 * Usage:
 * ```typescript
 * const registry = new UnifiedBinderRegistry([
 *   new KmsBinderStrategy(),
 *   new SecretsManagerBinderStrategy(),
 *   // ... more strategies
 * ]);
 *
 * const strategy = registry.findStrategy('security:kms');
 * if (strategy) {
 *   const result = await strategy.bind(context);
 * }
 * ```
 */
export declare class UnifiedBinderRegistry {
    /**
     * Map of capability -> strategy
     * A single strategy may handle multiple capabilities
     */
    private strategies;
    /**
     * Creates a new registry with the provided strategies
     *
     * @param strategies - Array of unified binder strategies to register
     */
    constructor(strategies?: IUnifiedBinderStrategy[]);
    /**
     * Register a strategy by its supported capabilities
     *
     * @param strategy - The unified binder strategy to register
     */
    register(strategy: IUnifiedBinderStrategy): void;
    /**
     * Find a strategy by capability
     *
     * @param capability - The capability to find a strategy for (e.g., 'security:kms', 'db:postgres')
     * @returns The strategy that handles this capability, or null if not found
     */
    findStrategy(capability: string): IUnifiedBinderStrategy | null;
    /**
     * Find a strategy that can handle the given source type and capability
     *
     * This method first looks up by capability, then verifies the strategy
     * can actually handle the source type via canHandle().
     *
     * @param sourceType - The type of the source component (e.g., 'lambda-api', 'ecs-task')
     * @param capability - The target capability (e.g., 'security:kms', 'db:postgres')
     * @returns The strategy that can handle this binding, or null if not found
     */
    findStrategyForBinding(sourceType: string, capability: string): IUnifiedBinderStrategy | null;
    /**
     * Get all registered capabilities
     *
     * @returns Array of all capability strings that have strategies registered
     */
    getRegisteredCapabilities(): string[];
    /**
     * Check if a capability has a registered strategy
     *
     * @param capability - The capability to check
     * @returns true if a strategy is registered for this capability
     */
    hasStrategy(capability: string): boolean;
    /**
     * Get the number of registered strategies (not capabilities)
     *
     * @returns Count of unique strategies
     */
    getStrategyCount(): number;
    /**
     * Get all unique strategy instances
     *
     * Returns an array of all unique strategy instances registered in the registry.
     * Useful for metadata-only queries, health checks, and catalog generation.
     *
     * @returns Array of unique strategy instances (deduplicated)
     */
    getAllUniqueStrategies(): IUnifiedBinderStrategy[];
    /**
     * Helper to get a strategy name for logging/debugging
     */
    private getStrategyName;
}
//# sourceMappingURL=unified-binder-registry.d.ts.map