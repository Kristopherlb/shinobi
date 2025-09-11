"use strict";
/**
 * Configuration Builder for SSM Parameter Component
 *
 * Implements the ConfigBuilder pattern as defined in the Platform Component API Contract.
 * Provides 5-layer configuration precedence chain and compliance-aware defaults.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SsmParameterConfigBuilder = exports.SSM_PARAMETER_CONFIG_SCHEMA = void 0;
const config_builder_1 = require("../../../src/platform/contracts/config-builder");
/**
 * JSON Schema for SSM Parameter configuration validation
 */
exports.SSM_PARAMETER_CONFIG_SCHEMA = {
    type: 'object',
    title: 'SSM Parameter Configuration',
    description: 'Configuration for creating an SSM Parameter Store parameter with platform abstractions',
    required: ['parameterName'],
    properties: {
        parameterName: {
            type: 'string',
            description: 'Name of the parameter (must start with /)',
            pattern: '^/[a-zA-Z0-9_.-/]+$',
            minLength: 1,
            maxLength: 2048
        },
        description: {
            type: 'string',
            description: 'Description of the parameter',
            maxLength: 1024
        },
        parameterType: {
            type: 'string',
            description: 'Parameter type - platform abstraction for common use cases',
            enum: ['configuration', 'secret', 'feature-flag', 'connection-string'],
            default: 'configuration'
        },
        value: {
            type: 'string',
            description: 'Parameter value',
            maxLength: 4096
        },
        sensitivityLevel: {
            type: 'string',
            description: 'Parameter sensitivity level - determines encryption and access patterns',
            enum: ['public', 'internal', 'confidential'],
            default: 'internal'
        },
        validationPattern: {
            type: 'string',
            description: 'Value validation pattern - platform-managed patterns for common types',
            enum: ['url', 'email', 'json', 'base64', 'custom'],
            default: 'custom'
        },
        customValidationPattern: {
            type: 'string',
            description: 'Custom validation regex (only when validationPattern is custom)'
        },
        encryption: {
            type: 'object',
            description: 'Encryption configuration',
            properties: {
                kmsKeyArn: {
                    type: 'string',
                    description: 'KMS key ARN for SecureString encryption'
                }
            },
            additionalProperties: false
        },
        tags: {
            type: 'object',
            description: 'Tags for the parameter',
            additionalProperties: {
                type: 'string'
            },
            default: {}
        }
    },
    additionalProperties: false
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
class SsmParameterConfigBuilder extends config_builder_1.ConfigBuilder {
    constructor(builderContext) {
        super(builderContext, exports.SSM_PARAMETER_CONFIG_SCHEMA);
    }
    /**
     * Layer 1: Hardcoded Fallbacks
     * Ultra-safe baseline configuration that works in any environment
     */
    getHardcodedFallbacks() {
        return {
            parameterType: 'configuration',
            sensitivityLevel: 'internal',
            validationPattern: 'custom',
            tags: {
                'platform-managed': 'true'
            }
        };
    }
    /**
     * Layer 2: Compliance Framework Defaults
     * Security and compliance-specific configurations loaded from platform config files
     */
    getComplianceFrameworkDefaults() {
        // All compliance framework defaults are now managed via segregated platform 
        // configuration files (/config/*.yml) following "Configuration over Code" principle
        return {};
    }
    /**
     * Get the JSON Schema for validation
     */
    getSchema() {
        return exports.SSM_PARAMETER_CONFIG_SCHEMA;
    }
}
exports.SsmParameterConfigBuilder = SsmParameterConfigBuilder;
