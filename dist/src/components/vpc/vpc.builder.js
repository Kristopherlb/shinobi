"use strict";
/**
 * Configuration Builder for VPC Component
 *
 * Implements the ConfigBuilder pattern as defined in the Platform Component API Contract.
 * Provides 5-layer configuration precedence chain and compliance-aware defaults.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.VpcConfigBuilder = exports.VPC_CONFIG_SCHEMA = void 0;
const config_builder_1 = require("../../../src/platform/contracts/config-builder");
/**
 * JSON Schema for VPC configuration validation
 */
exports.VPC_CONFIG_SCHEMA = {
    type: 'object',
    properties: {
        name: {
            type: 'string',
            description: 'VPC name (optional, defaults to component name)',
            pattern: '^[a-zA-Z][a-zA-Z0-9-_]*$',
            maxLength: 128
        },
        description: {
            type: 'string',
            description: 'VPC description for documentation',
            maxLength: 1024
        },
        cidr: {
            type: 'string',
            description: 'CIDR block for the VPC',
            pattern: '^(?:[0-9]{1,3}\\.){3}[0-9]{1,3}/[0-9]{1,2}$',
            default: '10.0.0.0/16'
        },
        maxAzs: {
            type: 'number',
            description: 'Maximum number of Availability Zones',
            minimum: 2,
            maximum: 6,
            default: 2
        },
        natGateways: {
            type: 'number',
            description: 'Number of NAT gateways',
            minimum: 0,
            maximum: 6,
            default: 1
        },
        flowLogsEnabled: {
            type: 'boolean',
            description: 'Enable VPC Flow Logs',
            default: true
        },
        flowLogRetentionDays: {
            type: 'number',
            description: 'VPC Flow Logs retention period in days',
            enum: [1, 3, 5, 7, 14, 30, 60, 90, 120, 150, 180, 365, 400, 545, 731, 1827, 3653],
            default: 365
        },
        subnets: {
            type: 'object',
            description: 'Subnet configuration',
            properties: {
                public: {
                    type: 'object',
                    properties: {
                        cidrMask: { type: 'number', minimum: 16, maximum: 28, default: 24 },
                        name: { type: 'string', default: 'Public' }
                    },
                    additionalProperties: false
                },
                private: {
                    type: 'object',
                    properties: {
                        cidrMask: { type: 'number', minimum: 16, maximum: 28, default: 24 },
                        name: { type: 'string', default: 'Private' }
                    },
                    additionalProperties: false
                },
                database: {
                    type: 'object',
                    properties: {
                        cidrMask: { type: 'number', minimum: 16, maximum: 28, default: 28 },
                        name: { type: 'string', default: 'Database' }
                    },
                    additionalProperties: false
                }
            },
            additionalProperties: false
        },
        vpcEndpoints: {
            type: 'object',
            description: 'VPC Endpoints configuration',
            properties: {
                s3: { type: 'boolean', default: false },
                dynamodb: { type: 'boolean', default: false },
                secretsManager: { type: 'boolean', default: false },
                kms: { type: 'boolean', default: false }
            },
            additionalProperties: false
        },
        dns: {
            type: 'object',
            description: 'DNS configuration',
            properties: {
                enableDnsHostnames: { type: 'boolean', default: true },
                enableDnsSupport: { type: 'boolean', default: true }
            },
            additionalProperties: false
        },
        monitoring: {
            type: 'object',
            description: 'Monitoring configuration',
            properties: {
                enabled: { type: 'boolean', description: 'Enable monitoring', default: true },
                detailedMetrics: { type: 'boolean', description: 'Enable detailed CloudWatch metrics', default: false },
                alarms: {
                    type: 'object',
                    properties: {
                        natGatewayPacketDropThreshold: { type: 'number', default: 1000 },
                        vpcFlowLogDeliveryFailures: { type: 'number', default: 10 }
                    },
                    additionalProperties: false
                }
            },
            additionalProperties: false
        },
        tags: {
            type: 'object',
            description: 'Custom tags for the VPC',
            additionalProperties: { type: 'string' }
        }
    },
    required: [],
    additionalProperties: false
};
/**
 * ConfigBuilder implementation for VPC component
 */
class VpcConfigBuilder extends config_builder_1.ConfigBuilder {
    constructor(builderContext, schema) {
        super(builderContext, schema);
    }
    /**
     * Provides ultra-safe baseline configuration that works in any environment
     */
    getHardcodedFallbacks() {
        return {
            cidr: '10.0.0.0/16',
            maxAzs: 2,
            natGateways: 1,
            flowLogsEnabled: true,
            flowLogRetentionDays: 365, // 1 year baseline
            subnets: {
                public: {
                    cidrMask: 24,
                    name: 'Public'
                },
                private: {
                    cidrMask: 24,
                    name: 'Private'
                },
                database: {
                    cidrMask: 28,
                    name: 'Database'
                }
            },
            vpcEndpoints: {
                s3: false,
                dynamodb: false,
                secretsManager: false,
                kms: false
            },
            dns: {
                enableDnsHostnames: true,
                enableDnsSupport: true
            },
            monitoring: {
                enabled: true,
                detailedMetrics: false,
                alarms: {
                    natGatewayPacketDropThreshold: 1000,
                    vpcFlowLogDeliveryFailures: 10
                }
            }
        };
    }
    /**
     * Security and compliance-specific configurations
     */
    getComplianceFrameworkDefaults() {
        const framework = this.builderContext.context.complianceFramework;
        // Commercial baseline
        const baseCompliance = {
            flowLogsEnabled: true,
            flowLogRetentionDays: 365,
            monitoring: {
                enabled: true,
                detailedMetrics: false,
                alarms: {
                    natGatewayPacketDropThreshold: 1000,
                    vpcFlowLogDeliveryFailures: 10
                }
            }
        };
        if (framework === 'fedramp-moderate' || framework === 'fedramp-high') {
            return {
                ...baseCompliance,
                flowLogRetentionDays: framework === 'fedramp-high' ? 2555 : 1827, // 7 years for high, 5 years for moderate
                natGateways: 2, // Redundancy for compliance
                vpcEndpoints: {
                    s3: true, // Required for secure data access
                    dynamodb: true,
                    secretsManager: true,
                    kms: true
                },
                monitoring: {
                    enabled: true,
                    detailedMetrics: true, // Required for compliance
                    alarms: {
                        natGatewayPacketDropThreshold: 500, // More sensitive
                        vpcFlowLogDeliveryFailures: 5 // More sensitive
                    }
                }
            };
        }
        return baseCompliance;
    }
}
exports.VpcConfigBuilder = VpcConfigBuilder;
