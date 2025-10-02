import { ComponentContext } from './component-context.js';
import { ComponentSpec } from './component-spec.js';
/**
 * Configuration layer enumeration
 */
export declare enum ConfigLayer {
    HARDCODED_DEFAULTS = 0,
    COMPLIANCE_DEFAULTS = 1,
    PLATFORM_DEFAULTS = 2,
    COMPONENT_CONFIG = 3,
    ENVIRONMENT_OVERRIDES = 4
}
/**
 * Configuration builder for components
 * Implements 5-layer precedence chain:
 * 1. Hardcoded defaults (lowest priority)
 * 2. Compliance defaults
 * 3. Platform defaults
 * 4. Environment overrides
 * 5. Component config (highest priority)
 */
export declare class ComponentConfigBuilder {
    private hardcodedDefaults;
    private complianceDefaults;
    private platformDefaults;
    constructor();
    /**
     * Build final configuration using 5-layer precedence
     */
    buildConfig(type: string, context: ComponentContext, spec: ComponentSpec): Record<string, any>;
    /**
     * Apply configuration layer with deep merge
     */
    private applyLayer;
    /**
     * Get hardcoded defaults for component type
     */
    private getHardcodedDefaults;
    /**
     * Get compliance defaults for component type and framework
     */
    private getComplianceDefaults;
    /**
     * Get platform defaults for component type
     */
    private getPlatformDefaults;
    /**
     * Get environment overrides for component type
     */
    private getEnvironmentOverrides;
    /**
     * Initialize default configurations for all component types
     */
    private initializeDefaultConfigurations;
    /**
     * Initialize hardcoded defaults for component types
     */
    private initializeHardcodedDefaults;
    /**
     * Initialize compliance-specific defaults
     */
    private initializeComplianceDefaults;
    /**
     * Initialize platform defaults
     */
    private initializePlatformDefaults;
}
//# sourceMappingURL=component-config-builder.d.ts.map