"use strict";
/**
 * Configuration Builder for Static Website Component
 *
 * Implements the ConfigBuilder pattern as defined in the Platform Component API Contract.
 * Provides 5-layer configuration precedence chain and compliance-aware defaults.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.StaticWebsiteConfigBuilder = exports.STATIC_WEBSITE_CONFIG_SCHEMA = void 0;
const config_builder_1 = require("../../../src/platform/contracts/config-builder");
/**
 * JSON Schema for Static Website configuration validation
 */
exports.STATIC_WEBSITE_CONFIG_SCHEMA = {
    type: 'object',
    title: 'Static Website Configuration',
    description: 'Configuration for creating a static website with S3 and CloudFront',
    properties: {
        websiteName: {
            type: 'string',
            description: 'Name of the website (used for resource naming)',
            pattern: '^[a-z0-9-]+$',
            maxLength: 63
        },
        domain: {
            type: 'object',
            description: 'Domain configuration',
            properties: {
                domainName: {
                    type: 'string',
                    description: 'Primary domain name for the website'
                },
                alternativeDomainNames: {
                    type: 'array',
                    description: 'Alternative domain names',
                    items: { type: 'string' },
                    default: []
                },
                certificateArn: {
                    type: 'string',
                    description: 'ACM certificate ARN for SSL/TLS'
                },
                hostedZoneId: {
                    type: 'string',
                    description: 'Route53 hosted zone ID'
                }
            },
            required: ['domainName'],
            additionalProperties: false
        },
        bucket: {
            type: 'object',
            description: 'S3 bucket configuration',
            properties: {
                indexDocument: {
                    type: 'string',
                    description: 'Index document for website',
                    default: 'index.html'
                },
                errorDocument: {
                    type: 'string',
                    description: 'Error document for website',
                    default: 'error.html'
                },
                versioning: {
                    type: 'boolean',
                    description: 'Enable S3 versioning',
                    default: false
                },
                accessLogging: {
                    type: 'boolean',
                    description: 'Enable S3 access logging',
                    default: false
                }
            },
            additionalProperties: false,
            default: {
                indexDocument: 'index.html',
                errorDocument: 'error.html',
                versioning: false,
                accessLogging: false
            }
        },
        distribution: {
            type: 'object',
            description: 'CloudFront distribution configuration',
            properties: {
                enabled: {
                    type: 'boolean',
                    description: 'Enable CloudFront distribution',
                    default: true
                },
                enableLogging: {
                    type: 'boolean',
                    description: 'Enable CloudFront access logging',
                    default: false
                },
                logFilePrefix: {
                    type: 'string',
                    description: 'CloudFront log file prefix',
                    default: 'cloudfront/'
                }
            },
            additionalProperties: false,
            default: {
                enabled: true,
                enableLogging: false,
                logFilePrefix: 'cloudfront/'
            }
        },
        deployment: {
            type: 'object',
            description: 'Deployment configuration',
            properties: {
                sourcePath: {
                    type: 'string',
                    description: 'Source path for website files'
                },
                enabled: {
                    type: 'boolean',
                    description: 'Enable automatic deployment',
                    default: false
                },
                retainOnDelete: {
                    type: 'boolean',
                    description: 'Retain deployment on stack deletion',
                    default: false
                }
            },
            additionalProperties: false,
            default: { enabled: false, retainOnDelete: false }
        },
        security: {
            type: 'object',
            description: 'Security configuration',
            properties: {
                blockPublicAccess: {
                    type: 'boolean',
                    description: 'Block S3 public access (uses CloudFront only)',
                    default: true
                },
                encryption: {
                    type: 'boolean',
                    description: 'Enable S3 encryption',
                    default: true
                },
                enforceHTTPS: {
                    type: 'boolean',
                    description: 'Enforce HTTPS connections',
                    default: true
                }
            },
            additionalProperties: false,
            default: {
                blockPublicAccess: true,
                encryption: true,
                enforceHTTPS: true
            }
        },
        tags: {
            type: 'object',
            description: 'Tags for resources',
            additionalProperties: { type: 'string' },
            default: {}
        }
    },
    additionalProperties: false
};
/**
 * ConfigBuilder for Static Website component
 *
 * Implements the 5-layer configuration precedence chain:
 * 1. Hardcoded Fallbacks (ultra-safe baseline)
 * 2. Platform Defaults (from platform config)
 * 3. Environment Defaults (from environment config)
 * 4. Component Overrides (from service.yml)
 * 5. Policy Overrides (from governance policies)
 */
class StaticWebsiteConfigBuilder extends config_builder_1.ConfigBuilder {
    constructor(builderContext) {
        super(builderContext, exports.STATIC_WEBSITE_CONFIG_SCHEMA);
    }
    /**
     * Layer 1: Hardcoded Fallbacks
     * Ultra-safe baseline configuration that works in any environment
     */
    getHardcodedFallbacks() {
        return {
            bucket: {
                indexDocument: 'index.html',
                errorDocument: 'error.html',
                versioning: false,
                accessLogging: false
            },
            distribution: {
                enabled: true,
                enableLogging: false,
                logFilePrefix: 'cloudfront/'
            },
            deployment: {
                enabled: false,
                retainOnDelete: false
            },
            security: {
                blockPublicAccess: true,
                encryption: true,
                enforceHTTPS: true
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
        const baseCompliance = {
            security: {
                blockPublicAccess: true,
                encryption: true,
                enforceHTTPS: true
            }
        };
        if (framework === 'fedramp-moderate') {
            return {
                ...baseCompliance,
                bucket: {
                    versioning: true, // Required for compliance
                    accessLogging: true // Mandatory logging
                },
                distribution: {
                    enabled: true,
                    enableLogging: true // Required logging
                }
            };
        }
        if (framework === 'fedramp-high') {
            return {
                ...baseCompliance,
                bucket: {
                    versioning: true, // Mandatory
                    accessLogging: true // Mandatory comprehensive logging
                },
                distribution: {
                    enabled: true,
                    enableLogging: true // Mandatory
                }
            };
        }
        return baseCompliance;
    }
    /**
     * Get the JSON Schema for validation
     */
    getSchema() {
        return exports.STATIC_WEBSITE_CONFIG_SCHEMA;
    }
}
exports.StaticWebsiteConfigBuilder = StaticWebsiteConfigBuilder;
