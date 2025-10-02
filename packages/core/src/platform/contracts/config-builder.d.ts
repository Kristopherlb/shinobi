import { ComponentSpec, ComponentContext } from './component-interfaces.js';
/**
 * Context object passed to ConfigBuilder constructors
 */
export interface ConfigBuilderContext {
    /** Component context with service info and compliance framework */
    readonly context: ComponentContext;
    /** Component specification from manifest */
    readonly spec: ComponentSpec;
}
/**
 * JSON Schema definition for component configuration validation
 */
export interface ComponentConfigSchema {
    readonly type: string;
    readonly properties: Record<string, any>;
    readonly required?: string[];
    readonly additionalProperties?: boolean;
    readonly allOf?: any[];
}
/**
 * Abstract base class for all component configuration builders.
 *
 * Implements the centralized 5-layer configuration precedence engine:
 * 1. Hardcoded Fallbacks (Priority 5 - Lowest)
 * 2. Platform Configuration (Priority 4)
 * 3. Environment Configuration (Priority 3)
 * 4. Component Overrides (Priority 2)
 * 5. Policy Overrides (Priority 1 - Highest)
 *
 * Concrete implementations only need to provide component-specific hardcoded fallbacks.
 * All orchestration, loading, merging, and validation is handled automatically.
 */
export declare abstract class ConfigBuilder<T = Record<string, any>> {
    protected readonly builderContext: ConfigBuilderContext;
    protected readonly schema: ComponentConfigSchema;
    constructor(builderContext: ConfigBuilderContext, schema: ComponentConfigSchema);
    /**
     * Build the complete configuration by applying the 5-layer precedence chain.
     * This is the centralized configuration engine used by all components.
     */
    buildSync(): T;
    /**
     * Concrete implementations must provide component-specific hardcoded fallbacks.
     * These serve as the absolute lowest priority defaults when no other configuration is available.
     * Should contain ultra-safe, minimal configurations that work in any environment.
     */
    protected abstract getHardcodedFallbacks(): Record<string, any>;
    /**
     * Load platform-wide configuration from segregated YAML files based on compliance framework
     */
    private _loadPlatformConfiguration;
    /**
     * Get the file path for platform configuration based on compliance framework
     */
    private _getPlatformConfigPath;
    /**
     * Get service-level environment configuration
     * TODO: This will be implemented when we have service-level environment configuration support
     */
    private _getEnvironmentConfiguration;
    /**
     * Get governance policy overrides
     * TODO: This will be implemented when we have policy override support
     */
    private _getPolicyOverrides;
    /**
     * Deep merge multiple configuration objects in precedence order (lowest to highest priority).
     * This is the core merging engine that handles nested objects correctly.
     */
    private _deepMergeConfigs;
    /**
     * Recursively merge two configuration objects, with source taking precedence over target
     */
    private _mergeConfigs;
    /**
     * Resolve environment variable interpolations in configuration values
     * Supports ${env:KEY} and ${env:KEY:default} patterns
     */
    private _resolveEnvironmentInterpolationsSync;
}
//# sourceMappingURL=config-builder.d.ts.map