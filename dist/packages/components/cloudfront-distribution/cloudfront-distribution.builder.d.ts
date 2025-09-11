/**
 * Configuration Builder for CloudFrontDistributionComponent Component
 *
 * Implements the ConfigBuilder pattern as defined in the Platform Component API Contract.
 * Provides 5-layer configuration precedence chain and compliance-aware defaults.
 */
import { ConfigBuilder } from '../../platform/contracts/config-builder';
/**
 * Configuration interface for CloudFrontDistributionComponent component
 */
export interface CloudFrontDistributionConfig {
    /** Component name (optional, will be auto-generated) */
    name?: string;
    /** Component description */
    description?: string;
    /** Enable detailed monitoring */
    monitoring?: {
        enabled?: boolean;
        detailedMetrics?: boolean;
        alarms?: {};
    };
    /** Tagging configuration */
    tags?: Record<string, string>;
}
/**
 * JSON Schema for CloudFrontDistributionComponent configuration validation
 */
export declare const CLOUDFRONT_DISTRIBUTION_CONFIG_SCHEMA: {
    type: string;
    properties: {
        name: {
            type: string;
            description: string;
            pattern: string;
            maxLength: number;
        };
        description: {
            type: string;
            description: string;
            maxLength: number;
        };
        monitoring: {
            type: string;
            description: string;
            properties: {
                enabled: {
                    type: string;
                    default: boolean;
                    description: string;
                };
                detailedMetrics: {
                    type: string;
                    default: boolean;
                    description: string;
                };
            };
            additionalProperties: boolean;
        };
        tags: {
            type: string;
            description: string;
            additionalProperties: {
                type: string;
            };
        };
    };
    additionalProperties: boolean;
};
/**
 * ConfigBuilder for CloudFrontDistributionComponent component
 *
 * Implements the 5-layer configuration precedence chain:
 * 1. Hardcoded Fallbacks (ultra-safe baseline)
 * 2. Platform Defaults (from platform config)
 * 3. Environment Defaults (from environment config)
 * 4. Component Overrides (from service.yml)
 * 5. Policy Overrides (from governance policies)
 */
export declare class CloudFrontDistributionComponentConfigBuilder extends ConfigBuilder<CloudFrontDistributionConfig> {
    /**
     * Layer 1: Hardcoded Fallbacks
     * Ultra-safe baseline configuration that works in any environment
     */
    protected getHardcodedFallbacks(): Partial<CloudFrontDistributionConfig>;
    /**
     * Layer 2: Compliance Framework Defaults
     * Security and compliance-specific configurations
     */
    protected getComplianceFrameworkDefaults(): Partial<CloudFrontDistributionConfig>;
    /**
     * Get the JSON Schema for validation
     */
    getSchema(): any;
}
