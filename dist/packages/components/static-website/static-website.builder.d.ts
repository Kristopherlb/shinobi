/**
 * Configuration Builder for Static Website Component
 *
 * Implements the ConfigBuilder pattern as defined in the Platform Component API Contract.
 * Provides 5-layer configuration precedence chain and compliance-aware defaults.
 */
import { ConfigBuilder, ConfigBuilderContext } from '../../../src/platform/contracts/config-builder';
/**
 * Configuration interface for Static Website component
 */
export interface StaticWebsiteConfig {
    /** Website name (used for resource naming) */
    websiteName?: string;
    /** Domain configuration */
    domain?: {
        /** Primary domain name */
        domainName: string;
        /** Alternative domain names */
        alternativeDomainNames?: string[];
        /** Certificate ARN for SSL/TLS */
        certificateArn?: string;
        /** Hosted zone ID for DNS */
        hostedZoneId?: string;
    };
    /** S3 bucket configuration */
    bucket?: {
        /** Website index document */
        indexDocument?: string;
        /** Website error document */
        errorDocument?: string;
        /** Enable versioning */
        versioning?: boolean;
        /** Enable access logging */
        accessLogging?: boolean;
    };
    /** CloudFront distribution configuration */
    distribution?: {
        /** Enable distribution */
        enabled?: boolean;
        /** Enable access logging */
        enableLogging?: boolean;
        /** Log file prefix */
        logFilePrefix?: string;
    };
    /** Deployment configuration */
    deployment?: {
        /** Source path for website files */
        sourcePath?: string;
        /** Enable automatic deployment */
        enabled?: boolean;
        /** Deployment retention policy */
        retainOnDelete?: boolean;
    };
    /** Security configuration */
    security?: {
        /** Block public access */
        blockPublicAccess?: boolean;
        /** Enable encryption */
        encryption?: boolean;
        /** Enforce HTTPS */
        enforceHTTPS?: boolean;
    };
    /** Tags for resources */
    tags?: Record<string, string>;
}
/**
 * JSON Schema for Static Website configuration validation
 */
export declare const STATIC_WEBSITE_CONFIG_SCHEMA: {
    type: string;
    title: string;
    description: string;
    properties: {
        websiteName: {
            type: string;
            description: string;
            pattern: string;
            maxLength: number;
        };
        domain: {
            type: string;
            description: string;
            properties: {
                domainName: {
                    type: string;
                    description: string;
                };
                alternativeDomainNames: {
                    type: string;
                    description: string;
                    items: {
                        type: string;
                    };
                    default: never[];
                };
                certificateArn: {
                    type: string;
                    description: string;
                };
                hostedZoneId: {
                    type: string;
                    description: string;
                };
            };
            required: string[];
            additionalProperties: boolean;
        };
        bucket: {
            type: string;
            description: string;
            properties: {
                indexDocument: {
                    type: string;
                    description: string;
                    default: string;
                };
                errorDocument: {
                    type: string;
                    description: string;
                    default: string;
                };
                versioning: {
                    type: string;
                    description: string;
                    default: boolean;
                };
                accessLogging: {
                    type: string;
                    description: string;
                    default: boolean;
                };
            };
            additionalProperties: boolean;
            default: {
                indexDocument: string;
                errorDocument: string;
                versioning: boolean;
                accessLogging: boolean;
            };
        };
        distribution: {
            type: string;
            description: string;
            properties: {
                enabled: {
                    type: string;
                    description: string;
                    default: boolean;
                };
                enableLogging: {
                    type: string;
                    description: string;
                    default: boolean;
                };
                logFilePrefix: {
                    type: string;
                    description: string;
                    default: string;
                };
            };
            additionalProperties: boolean;
            default: {
                enabled: boolean;
                enableLogging: boolean;
                logFilePrefix: string;
            };
        };
        deployment: {
            type: string;
            description: string;
            properties: {
                sourcePath: {
                    type: string;
                    description: string;
                };
                enabled: {
                    type: string;
                    description: string;
                    default: boolean;
                };
                retainOnDelete: {
                    type: string;
                    description: string;
                    default: boolean;
                };
            };
            additionalProperties: boolean;
            default: {
                enabled: boolean;
                retainOnDelete: boolean;
            };
        };
        security: {
            type: string;
            description: string;
            properties: {
                blockPublicAccess: {
                    type: string;
                    description: string;
                    default: boolean;
                };
                encryption: {
                    type: string;
                    description: string;
                    default: boolean;
                };
                enforceHTTPS: {
                    type: string;
                    description: string;
                    default: boolean;
                };
            };
            additionalProperties: boolean;
            default: {
                blockPublicAccess: boolean;
                encryption: boolean;
                enforceHTTPS: boolean;
            };
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
 * ConfigBuilder for Static Website component
 *
 * Implements the 5-layer configuration precedence chain:
 * 1. Hardcoded Fallbacks (ultra-safe baseline)
 * 2. Platform Defaults (from platform config)
 * 3. Environment Defaults (from environment config)
 * 4. Component Overrides (from service.yml)
 * 5. Policy Overrides (from governance policies)
 */
export declare class StaticWebsiteConfigBuilder extends ConfigBuilder<StaticWebsiteConfig> {
    constructor(builderContext: ConfigBuilderContext);
    /**
     * Layer 1: Hardcoded Fallbacks
     * Ultra-safe baseline configuration that works in any environment
     */
    protected getHardcodedFallbacks(): Partial<StaticWebsiteConfig>;
    /**
     * Layer 2: Compliance Framework Defaults
     * Security and compliance-specific configurations
     */
    protected getComplianceFrameworkDefaults(): Partial<StaticWebsiteConfig>;
    /**
     * Get the JSON Schema for validation
     */
    getSchema(): any;
}
