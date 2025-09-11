"use strict";
/**
 * Configuration Builder for S3BucketComponent Component
 *
 * Implements the ConfigBuilder pattern as defined in the Platform Component API Contract.
 * Provides 5-layer configuration precedence chain and compliance-aware defaults.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.S3BucketComponentConfigBuilder = exports.S3_BUCKET_CONFIG_SCHEMA = void 0;
const config_builder_1 = require("../../platform/contracts/config-builder");
/**
 * JSON Schema for S3BucketComponent configuration validation
 */
exports.S3_BUCKET_CONFIG_SCHEMA = {
    type: 'object',
    properties: {
        name: {
            type: 'string',
            description: 'Component name (optional, will be auto-generated from component name)',
            pattern: '^[a-zA-Z][a-zA-Z0-9-_]*$',
            maxLength: 128
        },
        description: {
            type: 'string',
            description: 'Component description for documentation',
            maxLength: 1024
        },
        monitoring: {
            type: 'object',
            description: 'Monitoring and observability configuration',
            properties: {
                enabled: {
                    type: 'boolean',
                    default: true,
                    description: 'Enable monitoring'
                },
                detailedMetrics: {
                    type: 'boolean',
                    default: false,
                    description: 'Enable detailed CloudWatch metrics'
                }
            },
            additionalProperties: false
        },
        tags: {
            type: 'object',
            description: 'Additional resource tags',
            additionalProperties: { type: 'string' }
        }
    },
    additionalProperties: false
};
/**
 * ConfigBuilder for S3BucketComponent component
 *
 * Implements the 5-layer configuration precedence chain:
 * 1. Hardcoded Fallbacks (ultra-safe baseline)
 * 2. Platform Defaults (from platform config)
 * 3. Environment Defaults (from environment config)
 * 4. Component Overrides (from service.yml)
 * 5. Policy Overrides (from governance policies)
 */
class S3BucketComponentConfigBuilder extends config_builder_1.ConfigBuilder {
    /**
     * Layer 1: Hardcoded Fallbacks
     * Ultra-safe baseline configuration that works in any environment
     */
    getHardcodedFallbacks() {
        return {
            monitoring: {
                enabled: true,
                detailedMetrics: false
            },
            tags: {}
        };
    }
    /**
     * Layer 2: Compliance Framework Defaults
     * Security and compliance-specific configurations
     */
    getComplianceFrameworkDefaults() {
        const framework = this.context.complianceFramework;
        const baseCompliance = {
            monitoring: {
                enabled: true,
                detailedMetrics: true
            }
        };
        if (framework === 'fedramp-moderate' || framework === 'fedramp-high') {
            return {
                ...baseCompliance,
                monitoring: {
                    ...baseCompliance.monitoring,
                    detailedMetrics: true // Mandatory for FedRAMP
                }
            };
        }
        return baseCompliance;
    }
    /**
     * Get the JSON Schema for validation
     */
    getSchema() {
        return exports.S3_BUCKET_CONFIG_SCHEMA;
    }
}
exports.S3BucketComponentConfigBuilder = S3BucketComponentConfigBuilder;
