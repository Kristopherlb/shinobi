/**
 * Configuration Builder for WAF Web ACL Component
 *
 * Implements the ConfigBuilder pattern as defined in the Platform Component API Contract.
 * Provides 5-layer configuration precedence chain and compliance-aware defaults.
 */
import { ConfigBuilder } from '../../../src/platform/contracts/config-builder';
import { ComponentContext, ComponentSpec } from '../../../src/platform/contracts/component-interfaces';
/**
 * Configuration interface for WAF Web ACL component
 */
export interface WafWebAclConfig {
    /** Web ACL name (optional, defaults to component name) */
    name?: string;
    /** Web ACL description */
    description?: string;
    /** Scope of the Web ACL */
    scope?: 'REGIONAL' | 'CLOUDFRONT';
    /** Default action for requests that don't match any rules */
    defaultAction?: 'allow' | 'block';
    /** AWS Managed Rule Groups */
    managedRuleGroups?: Array<{
        name: string;
        vendorName: string;
        priority: number;
        overrideAction?: 'none' | 'count';
        excludedRules?: string[];
    }>;
    /** Custom rules */
    customRules?: Array<{
        name: string;
        priority: number;
        action: 'allow' | 'block' | 'count';
        statement: {
            type: 'ip-set' | 'geo-match' | 'rate-based' | 'size-constraint' | 'sqli-match' | 'xss-match';
            ipSet?: string[];
            countries?: string[];
            rateLimit?: number;
            fieldToMatch?: {
                type: 'uri-path' | 'query-string' | 'header' | 'body';
                name?: string;
            };
            textTransformations?: Array<{
                priority: number;
                type: string;
            }>;
        };
    }>;
    /** Logging configuration */
    logging?: {
        enabled?: boolean;
        destinationArn?: string;
        logDestinationType?: 'kinesis-firehose' | 's3' | 'cloudwatch';
        redactedFields?: Array<{
            type: 'uri-path' | 'query-string' | 'header' | 'method';
            name?: string;
        }>;
    };
    /** Monitoring configuration */
    monitoring?: {
        enabled?: boolean;
        detailedMetrics?: boolean;
        alarms?: {
            blockedRequestsThreshold?: number;
            allowedRequestsThreshold?: number;
            sampledRequestsEnabled?: boolean;
        };
    };
    /** Tags for the Web ACL */
    tags?: Record<string, string>;
}
/**
 * JSON Schema for WAF Web ACL configuration validation
 */
export declare const WAF_WEB_ACL_CONFIG_SCHEMA: {
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
        scope: {
            type: string;
            enum: string[];
            default: string;
            description: string;
        };
        defaultAction: {
            type: string;
            enum: string[];
            default: string;
            description: string;
        };
        managedRuleGroups: {
            type: string;
            description: string;
            items: {
                type: string;
                properties: {
                    name: {
                        type: string;
                        description: string;
                    };
                    vendorName: {
                        type: string;
                        description: string;
                    };
                    priority: {
                        type: string;
                        description: string;
                    };
                    overrideAction: {
                        type: string;
                        enum: string[];
                        description: string;
                    };
                    excludedRules: {
                        type: string;
                        items: {
                            type: string;
                        };
                        description: string;
                    };
                };
                required: string[];
                additionalProperties: boolean;
            };
        };
        customRules: {
            type: string;
            description: string;
            items: {
                type: string;
                properties: {
                    name: {
                        type: string;
                        description: string;
                    };
                    priority: {
                        type: string;
                        description: string;
                    };
                    action: {
                        type: string;
                        enum: string[];
                        description: string;
                    };
                    statement: {
                        type: string;
                        description: string;
                        additionalProperties: boolean;
                    };
                };
                required: string[];
                additionalProperties: boolean;
            };
        };
        logging: {
            type: string;
            description: string;
            properties: {
                enabled: {
                    type: string;
                    default: boolean;
                    description: string;
                };
                destinationArn: {
                    type: string;
                    description: string;
                };
                logDestinationType: {
                    type: string;
                    enum: string[];
                    default: string;
                    description: string;
                };
                redactedFields: {
                    type: string;
                    description: string;
                    items: {
                        type: string;
                        properties: {
                            type: {
                                type: string;
                                enum: string[];
                            };
                            name: {
                                type: string;
                            };
                        };
                        required: string[];
                        additionalProperties: boolean;
                    };
                };
            };
            additionalProperties: boolean;
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
                alarms: {
                    type: string;
                    description: string;
                    properties: {
                        blockedRequestsThreshold: {
                            type: string;
                            default: number;
                            description: string;
                        };
                        allowedRequestsThreshold: {
                            type: string;
                            default: number;
                            description: string;
                        };
                        sampledRequestsEnabled: {
                            type: string;
                            default: boolean;
                            description: string;
                        };
                    };
                    additionalProperties: boolean;
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
 * ConfigBuilder for WAF Web ACL component
 *
 * Implements the 5-layer configuration precedence chain:
 * 1. Hardcoded Fallbacks (ultra-safe baseline)
 * 2. Platform Defaults (from platform config)
 * 3. Environment Defaults (from environment config)
 * 4. Component Overrides (from service.yml)
 * 5. Policy Overrides (from governance policies)
 */
export declare class WafWebAclConfigBuilder extends ConfigBuilder<WafWebAclConfig> {
    constructor(context: ComponentContext, spec: ComponentSpec);
    /**
     * Layer 1: Hardcoded Fallbacks
     * Ultra-safe baseline configuration that works in any environment
     */
    protected getHardcodedFallbacks(): Partial<WafWebAclConfig>;
    /**
     * Layer 2: Compliance Framework Defaults
     * Security and compliance-specific configurations
     */
    protected getComplianceFrameworkDefaults(): Partial<WafWebAclConfig>;
    /**
     * Get the JSON Schema for validation
     */
    getSchema(): any;
}
