/**
 * Configuration Builder for SSM Parameter Component
 *
 * Implements the ConfigBuilder pattern as defined in the Platform Component API Contract.
 * Provides 5-layer configuration precedence chain and compliance-aware defaults.
 */
import { ConfigBuilder, ConfigBuilderContext } from '../../../src/platform/contracts/config-builder';
/**
 * Configuration interface for SSM Parameter component
 */
export interface SsmParameterConfig {
    /** Parameter name (required) */
    parameterName: string;
    /** Parameter description */
    description?: string;
    /** Parameter type - platform abstraction for common use cases */
    parameterType?: 'configuration' | 'secret' | 'feature-flag' | 'connection-string';
    /** Parameter value */
    value?: string;
    /** Parameter sensitivity level - determines encryption and access patterns */
    sensitivityLevel?: 'public' | 'internal' | 'confidential';
    /** Value validation pattern - platform-managed patterns for common types */
    validationPattern?: 'url' | 'email' | 'json' | 'base64' | 'custom';
    /** Custom validation regex (only when validationPattern is 'custom') */
    customValidationPattern?: string;
    /** Encryption configuration for SecureString parameters */
    encryption?: {
        /** KMS key ARN for encryption */
        kmsKeyArn?: string;
    };
    /** Tags for the parameter */
    tags?: Record<string, string>;
}
/**
 * JSON Schema for SSM Parameter configuration validation
 */
export declare const SSM_PARAMETER_CONFIG_SCHEMA: {
    type: string;
    title: string;
    description: string;
    required: string[];
    properties: {
        parameterName: {
            type: string;
            description: string;
            pattern: string;
            minLength: number;
            maxLength: number;
        };
        description: {
            type: string;
            description: string;
            maxLength: number;
        };
        parameterType: {
            type: string;
            description: string;
            enum: string[];
            default: string;
        };
        value: {
            type: string;
            description: string;
            maxLength: number;
        };
        sensitivityLevel: {
            type: string;
            description: string;
            enum: string[];
            default: string;
        };
        validationPattern: {
            type: string;
            description: string;
            enum: string[];
            default: string;
        };
        customValidationPattern: {
            type: string;
            description: string;
        };
        encryption: {
            type: string;
            description: string;
            properties: {
                kmsKeyArn: {
                    type: string;
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
            default: {};
        };
    };
    additionalProperties: boolean;
};
/**
 * ConfigBuilder for SSM Parameter component
 *
 * Implements the 5-layer configuration precedence chain:
 * 1. Hardcoded Fallbacks (ultra-safe baseline)
 * 2. Platform Defaults (from platform config)
 * 3. Environment Defaults (from environment config)
 * 4. Component Overrides (from service.yml)
 * 5. Policy Overrides (from governance policies)
 */
export declare class SsmParameterConfigBuilder extends ConfigBuilder<SsmParameterConfig> {
    constructor(builderContext: ConfigBuilderContext);
    /**
     * Layer 1: Hardcoded Fallbacks
     * Ultra-safe baseline configuration that works in any environment
     */
    protected getHardcodedFallbacks(): Partial<SsmParameterConfig>;
    /**
     * Layer 2: Compliance Framework Defaults
     * Security and compliance-specific configurations loaded from platform config files
     */
    protected getComplianceFrameworkDefaults(): Partial<SsmParameterConfig>;
    /**
     * Get the JSON Schema for validation
     */
    getSchema(): any;
}
