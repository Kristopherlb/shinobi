"use strict";
/**
 * Configuration Builder for Route53RecordComponent Component
 *
 * Implements the ConfigBuilder pattern as defined in the Platform Component API Contract.
 * Provides 5-layer configuration precedence chain and compliance-aware defaults.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Route53RecordConfigBuilder = exports.ROUTE53_RECORD_CONFIG_SCHEMA = void 0;
const config_builder_1 = require("../../../../src/platform/contracts/config-builder");
/**
 * JSON Schema for Route53RecordComponent configuration validation
 */
exports.ROUTE53_RECORD_CONFIG_SCHEMA = {
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
            maxLength: 500
        },
        record: {
            type: 'object',
            description: 'Route 53 record configuration',
            properties: {
                recordName: {
                    type: 'string',
                    description: 'DNS record name (e.g., api.example.com)',
                    pattern: '^[a-zA-Z0-9.-]+$',
                    minLength: 1,
                    maxLength: 253
                },
                recordType: {
                    type: 'string',
                    description: 'DNS record type',
                    enum: ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS', 'SOA', 'SRV', 'PTR'],
                    default: 'A'
                },
                zoneName: {
                    type: 'string',
                    description: 'Hosted zone name (e.g., example.com.)',
                    pattern: '^[a-zA-Z0-9.-]+\\.$',
                    minLength: 1,
                    maxLength: 255
                },
                target: {
                    oneOf: [
                        {
                            type: 'string',
                            description: 'Single target value for the DNS record'
                        },
                        {
                            type: 'array',
                            description: 'Multiple target values for the DNS record',
                            items: {
                                type: 'string'
                            },
                            minItems: 1
                        }
                    ]
                },
                ttl: {
                    type: 'integer',
                    description: 'Time to live in seconds',
                    minimum: 0,
                    maximum: 2147483647,
                    default: 300
                },
                comment: {
                    type: 'string',
                    description: 'Comment for the record set',
                    maxLength: 256
                },
                evaluateTargetHealth: {
                    type: 'boolean',
                    description: 'Whether to evaluate target health',
                    default: false
                },
                weight: {
                    type: 'integer',
                    description: 'Weight for weighted routing (0-255)',
                    minimum: 0,
                    maximum: 255
                },
                setIdentifier: {
                    type: 'string',
                    description: 'Set identifier for routing policies',
                    pattern: '^[a-zA-Z0-9_-]+$',
                    maxLength: 128
                },
                geoLocation: {
                    type: 'object',
                    description: 'Geographic location for geolocation routing',
                    properties: {
                        continent: {
                            type: 'string',
                            description: 'Continent code (e.g., NA, EU, AS)',
                            pattern: '^[A-Z]{2}$'
                        },
                        country: {
                            type: 'string',
                            description: 'Country code (e.g., US, CA, GB)',
                            pattern: '^[A-Z]{2}$'
                        },
                        subdivision: {
                            type: 'string',
                            description: 'Subdivision code (e.g., CA, NY, TX)',
                            pattern: '^[A-Z]{2}$'
                        }
                    }
                },
                failover: {
                    type: 'string',
                    description: 'Failover configuration',
                    enum: ['PRIMARY', 'SECONDARY']
                },
                region: {
                    type: 'string',
                    description: 'Latency-based routing region',
                    pattern: '^[a-z0-9-]+$',
                    maxLength: 20
                }
            },
            required: ['recordName', 'recordType', 'zoneName', 'target']
        },
        tags: {
            type: 'object',
            description: 'Tagging configuration (for documentation purposes only)',
            additionalProperties: {
                type: 'string',
                maxLength: 256
            }
        }
    },
    required: ['record'],
    additionalProperties: false
};
/**
 * Configuration Builder for Route53RecordComponent
 *
 * Extends the abstract ConfigBuilder to provide Route 53 record-specific configuration
 * with 5-layer precedence chain and compliance-aware defaults.
 */
class Route53RecordConfigBuilder extends config_builder_1.ConfigBuilder {
    constructor(context) {
        super(context, exports.ROUTE53_RECORD_CONFIG_SCHEMA);
    }
    /**
     * Provide component-specific hardcoded fallbacks.
     * These are the absolute, safest, most minimal defaults possible.
     *
     * Layer 1 (Priority 5 - Lowest): Hardcoded Fallbacks
     */
    getHardcodedFallbacks() {
        return {
            record: {
                recordName: 'default.example.com', // Safe default name
                recordType: 'A', // Most common record type
                zoneName: 'example.com.', // Safe default zone
                target: '127.0.0.1', // Safe default target (localhost)
                ttl: 300, // 5 minutes - reasonable default
                comment: 'Created by platform',
                evaluateTargetHealth: false, // Disabled by default for safety
                weight: undefined, // No weight by default
                setIdentifier: undefined, // No set identifier by default
                geoLocation: undefined, // No geo location by default
                failover: undefined, // No failover by default
                region: undefined // No region by default
            },
            tags: {
                'Component': 'route53-record',
                'ManagedBy': 'platform',
                'RecordType': 'A'
            }
        };
    }
}
exports.Route53RecordConfigBuilder = Route53RecordConfigBuilder;
