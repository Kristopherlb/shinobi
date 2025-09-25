/**
 * Configuration Builder for ShinobiComponent Component
 *
 * Implements the ConfigBuilder pattern as defined in the Platform Component API Contract.
 * Provides 5-layer configuration precedence chain and compliance-aware defaults.
 */
import { ConfigBuilder } from '../../@shinobi/core/config-builder';
import { ShinobiConfig } from './shinobi.component';
/**
 * ConfigBuilder for ShinobiComponent component
 *
 * Implements the 5-layer configuration precedence chain:
 * 1. Hardcoded Fallbacks (ultra-safe baseline)
 * 2. Platform Defaults (from platform config)
 * 3. Environment Defaults (from environment config)
 * 4. Component Overrides (from service.yml)
 * 5. Policy Overrides (from governance policies)
 */
export declare class ShinobiComponentConfigBuilder extends ConfigBuilder<ShinobiConfig> {
    /**
     * Layer 1: Hardcoded Fallbacks
     * Ultra-safe baseline configuration that works in any environment
     */
    protected getHardcodedFallbacks(): Partial<ShinobiConfig>;
    /**
     * Layer 2: Compliance Framework Defaults
     * Security and compliance-specific configurations
     */
    protected getComplianceFrameworkDefaults(): Partial<ShinobiConfig>;
    /**
     * Get the JSON Schema for validation
     */
    getSchema(): any;
}
//# sourceMappingURL=shinobi.builder.d.ts.map