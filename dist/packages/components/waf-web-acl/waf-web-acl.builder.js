"use strict";
/**
 * Configuration Builder for WAF Web ACL Component
 *
 * Implements the ConfigBuilder pattern as defined in the Platform Component API Contract.
 * Provides 5-layer configuration precedence chain and compliance-aware defaults.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.WafWebAclConfigBuilder = exports.WAF_WEB_ACL_CONFIG_SCHEMA = void 0;
const config_builder_1 = require("../../../src/platform/contracts/config-builder");
/**
 * JSON Schema for WAF Web ACL configuration validation
 */
exports.WAF_WEB_ACL_CONFIG_SCHEMA = {
    type: 'object',
    properties: {
        name: {
            type: 'string',
            description: 'Web ACL name (optional, defaults to component name)',
            pattern: '^[a-zA-Z][a-zA-Z0-9-_]*$',
            maxLength: 128
        },
        description: {
            type: 'string',
            description: 'Web ACL description',
            maxLength: 1024
        },
        scope: {
            type: 'string',
            enum: ['REGIONAL', 'CLOUDFRONT'],
            default: 'REGIONAL',
            description: 'Scope of the Web ACL (REGIONAL for ALB/API Gateway, CLOUDFRONT for CloudFront)'
        },
        defaultAction: {
            type: 'string',
            enum: ['allow', 'block'],
            default: 'allow',
            description: 'Default action for requests that do not match any rules'
        },
        managedRuleGroups: {
            type: 'array',
            description: 'AWS Managed Rule Groups to include',
            items: {
                type: 'object',
                properties: {
                    name: { type: 'string', description: 'Rule group name' },
                    vendorName: { type: 'string', description: 'Vendor name (usually AWS)' },
                    priority: { type: 'number', description: 'Rule priority' },
                    overrideAction: { type: 'string', enum: ['none', 'count'], description: 'Override action' },
                    excludedRules: { type: 'array', items: { type: 'string' }, description: 'Rules to exclude' }
                },
                required: ['name', 'vendorName', 'priority'],
                additionalProperties: false
            }
        },
        customRules: {
            type: 'array',
            description: 'Custom WAF rules',
            items: {
                type: 'object',
                properties: {
                    name: { type: 'string', description: 'Rule name' },
                    priority: { type: 'number', description: 'Rule priority' },
                    action: { type: 'string', enum: ['allow', 'block', 'count'], description: 'Rule action' },
                    statement: {
                        type: 'object',
                        description: 'Rule statement configuration',
                        additionalProperties: true
                    }
                },
                required: ['name', 'priority', 'action', 'statement'],
                additionalProperties: false
            }
        },
        logging: {
            type: 'object',
            description: 'WAF logging configuration',
            properties: {
                enabled: { type: 'boolean', default: true, description: 'Enable WAF logging' },
                destinationArn: { type: 'string', description: 'Log destination ARN' },
                logDestinationType: {
                    type: 'string',
                    enum: ['kinesis-firehose', 's3', 'cloudwatch'],
                    default: 'cloudwatch',
                    description: 'Type of log destination'
                },
                redactedFields: {
                    type: 'array',
                    description: 'Fields to redact from logs',
                    items: {
                        type: 'object',
                        properties: {
                            type: { type: 'string', enum: ['uri-path', 'query-string', 'header', 'method'] },
                            name: { type: 'string' }
                        },
                        required: ['type'],
                        additionalProperties: false
                    }
                }
            },
            additionalProperties: false
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
                },
                alarms: {
                    type: 'object',
                    description: 'CloudWatch alarm thresholds',
                    properties: {
                        blockedRequestsThreshold: { type: 'number', default: 1000, description: 'Blocked requests alarm threshold' },
                        allowedRequestsThreshold: { type: 'number', default: 10000, description: 'Allowed requests alarm threshold' },
                        sampledRequestsEnabled: { type: 'boolean', default: true, description: 'Enable sampled requests' }
                    },
                    additionalProperties: false
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
 * ConfigBuilder for WAF Web ACL component
 *
 * Implements the 5-layer configuration precedence chain:
 * 1. Hardcoded Fallbacks (ultra-safe baseline)
 * 2. Platform Defaults (from platform config)
 * 3. Environment Defaults (from environment config)
 * 4. Component Overrides (from service.yml)
 * 5. Policy Overrides (from governance policies)
 */
class WafWebAclConfigBuilder extends config_builder_1.ConfigBuilder {
    constructor(context, spec) {
        const builderContext = {
            context,
            spec
        };
        super(builderContext, exports.WAF_WEB_ACL_CONFIG_SCHEMA);
    }
    /**
     * Layer 1: Hardcoded Fallbacks
     * Ultra-safe baseline configuration that works in any environment
     */
    getHardcodedFallbacks() {
        return {
            scope: 'REGIONAL',
            defaultAction: 'allow',
            managedRuleGroups: [
                {
                    name: 'AWSManagedRulesCommonRuleSet',
                    vendorName: 'AWS',
                    priority: 1,
                    overrideAction: 'none'
                },
                {
                    name: 'AWSManagedRulesKnownBadInputsRuleSet',
                    vendorName: 'AWS',
                    priority: 2,
                    overrideAction: 'none'
                }
            ],
            customRules: [],
            logging: {
                enabled: true,
                logDestinationType: 'cloudwatch',
                redactedFields: []
            },
            monitoring: {
                enabled: true,
                detailedMetrics: false,
                alarms: {
                    blockedRequestsThreshold: 1000,
                    allowedRequestsThreshold: 10000,
                    sampledRequestsEnabled: true
                }
            },
            tags: {}
        };
    }
    /**
     * Layer 2: Compliance Framework Defaults
     * Security and compliance-specific configurations
     */
    getComplianceFrameworkDefaults() {
        const framework = this.builderContext.context.complianceFramework;
        // For commercial, we rely more on platform config, but add some enhancements
        const baseCompliance = {
            monitoring: {
                enabled: true,
                detailedMetrics: true, // Enhanced for commercial
                alarms: {
                    blockedRequestsThreshold: 500,
                    allowedRequestsThreshold: 5000,
                    sampledRequestsEnabled: true
                }
            }
        };
        if (framework === 'fedramp-moderate' || framework === 'fedramp-high') {
            return {
                ...baseCompliance,
                defaultAction: 'block', // More restrictive for FedRAMP
                logging: {
                    ...baseCompliance.logging,
                    enabled: true // Mandatory logging for compliance
                },
                managedRuleGroups: [
                    ...baseCompliance.managedRuleGroups,
                    {
                        name: 'AWSManagedRulesLinuxRuleSet',
                        vendorName: 'AWS',
                        priority: 4,
                        overrideAction: 'none'
                    },
                    {
                        name: 'AWSManagedRulesUnixRuleSet',
                        vendorName: 'AWS',
                        priority: 5,
                        overrideAction: 'none'
                    }
                ],
                monitoring: {
                    ...baseCompliance.monitoring,
                    detailedMetrics: true, // Mandatory for FedRAMP
                    alarms: {
                        blockedRequestsThreshold: framework === 'fedramp-high' ? 100 : 250,
                        allowedRequestsThreshold: framework === 'fedramp-high' ? 2000 : 3000,
                        sampledRequestsEnabled: true
                    }
                }
            };
        }
        return baseCompliance;
    }
    /**
     * Get the JSON Schema for validation
     */
    getSchema() {
        return exports.WAF_WEB_ACL_CONFIG_SCHEMA;
    }
}
exports.WafWebAclConfigBuilder = WafWebAclConfigBuilder;
