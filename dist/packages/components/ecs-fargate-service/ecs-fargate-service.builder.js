"use strict";
/**
 * Configuration Builder for EcsFargateServiceComponent Component
 *
 * Implements the ConfigBuilder pattern as defined in the Platform Component API Contract.
 * Provides 5-layer configuration precedence chain and compliance-aware defaults.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EcsFargateServiceComponentConfigBuilder = exports.ECS_FARGATE_SERVICE_CONFIG_SCHEMA = void 0;
const config_builder_1 = require("../../../src/platform/contracts/config-builder");
/**
 * JSON Schema for EcsFargateServiceComponent configuration validation
 */
exports.ECS_FARGATE_SERVICE_CONFIG_SCHEMA = {
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
        // TODO: Add component-specific schema properties
    },
    additionalProperties: false
};
/**
 * ConfigBuilder for EcsFargateServiceComponent component
 *
 * Implements the 5-layer configuration precedence chain:
 * 1. Hardcoded Fallbacks (ultra-safe baseline)
 * 2. Platform Defaults (from platform config)
 * 3. Environment Defaults (from environment config)
 * 4. Component Overrides (from service.yml)
 * 5. Policy Overrides (from governance policies)
 */
class EcsFargateServiceComponentConfigBuilder extends config_builder_1.ConfigBuilder {
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
            // TODO: Add component-specific hardcoded fallbacks
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
                // TODO: Add FedRAMP-specific compliance defaults
            };
        }
        return baseCompliance;
    }
    /**
     * Get the JSON Schema for validation
     */
    getSchema() {
        return exports.ECS_FARGATE_SERVICE_CONFIG_SCHEMA;
    }
}
exports.EcsFargateServiceComponentConfigBuilder = EcsFargateServiceComponentConfigBuilder;
