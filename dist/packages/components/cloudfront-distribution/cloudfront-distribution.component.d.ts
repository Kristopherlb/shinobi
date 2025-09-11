/**
 * CloudFront Distribution Component implementing Component API Contract v1.0
 *
 * A managed Content Delivery Network (CDN) for global, low-latency content delivery.
 * Implements three-tiered compliance model (Commercial/FedRAMP Moderate/FedRAMP High).
 */
import { Construct } from 'constructs';
import { Component, ComponentSpec, ComponentContext, ComponentCapabilities } from '../../../platform/contracts/src';
/**
 * Configuration interface for CloudFront Distribution component
 */
export interface CloudFrontDistributionConfig {
    /** Distribution comment/description */
    comment?: string;
    /** Origin configuration */
    origin: {
        type: 's3' | 'alb' | 'custom';
        s3BucketName?: string;
        albDnsName?: string;
        customDomainName?: string;
        originPath?: string;
        customHeaders?: Record<string, string>;
    };
    /** Custom domain configuration */
    domain?: {
        domainNames?: string[];
        certificateArn?: string;
        sslSupportMethod?: 'sni-only' | 'vip';
        minimumProtocolVersion?: string;
    };
    /** Default cache behavior */
    defaultBehavior?: {
        viewerProtocolPolicy?: 'allow-all' | 'redirect-to-https' | 'https-only';
        allowedMethods?: string[];
        cachedMethods?: string[];
        cachePolicyId?: string;
        originRequestPolicyId?: string;
        compress?: boolean;
        ttl?: {
            default?: number;
            maximum?: number;
            minimum?: number;
        };
    };
    /** Additional cache behaviors */
    additionalBehaviors?: Array<{
        pathPattern: string;
        viewerProtocolPolicy?: 'allow-all' | 'redirect-to-https' | 'https-only';
        allowedMethods?: string[];
        cachedMethods?: string[];
        cachePolicyId?: string;
        originRequestPolicyId?: string;
        compress?: boolean;
    }>;
    /** Geographic restrictions */
    geoRestriction?: {
        type: 'whitelist' | 'blacklist' | 'none';
        countries?: string[];
    };
    /** Price class */
    priceClass?: 'PriceClass_All' | 'PriceClass_200' | 'PriceClass_100';
    /** Logging configuration */
    logging?: {
        enabled?: boolean;
        bucket?: string;
        prefix?: string;
        includeCookies?: boolean;
    };
    /** WAF configuration */
    webAclId?: string;
    /** Monitoring configuration */
    monitoring?: {
        enabled?: boolean;
        alarms?: {
            error4xxThreshold?: number;
            error5xxThreshold?: number;
            originLatencyThreshold?: number;
        };
    };
    /** Tags for the distribution */
    tags?: Record<string, string>;
}
/**
 * JSON Schema for CloudFront Distribution configuration
 */
export declare const CLOUDFRONT_DISTRIBUTION_CONFIG_SCHEMA: {
    type: string;
    properties: {
        comment: {
            type: string;
        };
        origin: {
            type: string;
            properties: {
                type: {
                    type: string;
                    enum: string[];
                };
                s3BucketName: {
                    type: string;
                };
                albDnsName: {
                    type: string;
                };
                customDomainName: {
                    type: string;
                };
                originPath: {
                    type: string;
                };
                customHeaders: {
                    type: string;
                    additionalProperties: {
                        type: string;
                    };
                };
            };
            required: string[];
        };
        domain: {
            type: string;
            properties: {
                domainNames: {
                    type: string;
                    items: {
                        type: string;
                    };
                };
                certificateArn: {
                    type: string;
                };
                sslSupportMethod: {
                    type: string;
                    enum: string[];
                };
                minimumProtocolVersion: {
                    type: string;
                };
            };
        };
        defaultBehavior: {
            type: string;
            properties: {
                viewerProtocolPolicy: {
                    type: string;
                    enum: string[];
                };
                allowedMethods: {
                    type: string;
                    items: {
                        type: string;
                    };
                };
                cachedMethods: {
                    type: string;
                    items: {
                        type: string;
                    };
                };
                cachePolicyId: {
                    type: string;
                };
                originRequestPolicyId: {
                    type: string;
                };
                compress: {
                    type: string;
                };
                ttl: {
                    type: string;
                    properties: {
                        default: {
                            type: string;
                            minimum: number;
                        };
                        maximum: {
                            type: string;
                            minimum: number;
                        };
                        minimum: {
                            type: string;
                            minimum: number;
                        };
                    };
                };
            };
        };
        additionalBehaviors: {
            type: string;
            items: {
                type: string;
                properties: {
                    pathPattern: {
                        type: string;
                    };
                    viewerProtocolPolicy: {
                        type: string;
                        enum: string[];
                    };
                    allowedMethods: {
                        type: string;
                        items: {
                            type: string;
                        };
                    };
                    cachedMethods: {
                        type: string;
                        items: {
                            type: string;
                        };
                    };
                    cachePolicyId: {
                        type: string;
                    };
                    originRequestPolicyId: {
                        type: string;
                    };
                    compress: {
                        type: string;
                    };
                };
                required: string[];
            };
        };
        geoRestriction: {
            type: string;
            properties: {
                type: {
                    type: string;
                    enum: string[];
                };
                countries: {
                    type: string;
                    items: {
                        type: string;
                    };
                };
            };
            required: string[];
        };
        priceClass: {
            type: string;
            enum: string[];
        };
        logging: {
            type: string;
            properties: {
                enabled: {
                    type: string;
                };
                bucket: {
                    type: string;
                };
                prefix: {
                    type: string;
                };
                includeCookies: {
                    type: string;
                };
            };
        };
        webAclId: {
            type: string;
        };
        monitoring: {
            type: string;
            properties: {
                enabled: {
                    type: string;
                };
                alarms: {
                    type: string;
                    properties: {
                        error4xxThreshold: {
                            type: string;
                            minimum: number;
                        };
                        error5xxThreshold: {
                            type: string;
                            minimum: number;
                        };
                        originLatencyThreshold: {
                            type: string;
                            minimum: number;
                        };
                    };
                };
            };
        };
        tags: {
            type: string;
            additionalProperties: {
                type: string;
            };
        };
    };
    required: string[];
    additionalProperties: boolean;
};
/**
 * ConfigBuilder for CloudFront Distribution component
 */
export declare class CloudFrontDistributionConfigBuilder {
    private context;
    private spec;
    constructor(context: ComponentContext, spec: ComponentSpec);
    /**
     * Asynchronous build method - delegates to synchronous implementation
     */
    build(): Promise<CloudFrontDistributionConfig>;
    /**
     * Synchronous version of build for use in synth() method
     */
    buildSync(): CloudFrontDistributionConfig;
    /**
     * Simple merge utility for combining configuration objects
     */
    private mergeConfigs;
    /**
     * Get platform-wide defaults with intelligent configuration
     */
    private getPlatformDefaults;
    /**
     * Get compliance framework-specific defaults
     */
    private getComplianceFrameworkDefaults;
    /**
     * Get default viewer protocol policy based on compliance framework
     */
    private getDefaultViewerProtocolPolicy;
    /**
     * Get default price class based on compliance framework
     */
    private getDefaultPriceClass;
    /**
     * Determine if logging should be enabled by default
     */
    private shouldEnableLogging;
}
/**
 * CloudFront Distribution Component implementing Component API Contract v1.0
 */
export declare class CloudFrontDistributionComponent extends Component {
    private distribution?;
    private origin?;
    private config?;
    constructor(scope: Construct, id: string, context: ComponentContext, spec: ComponentSpec);
    /**
     * Synthesis phase - Create CloudFront distribution with global CDN
     */
    synth(): void;
    /**
     * Get the capabilities this component provides
     */
    getCapabilities(): ComponentCapabilities;
    /**
     * Get the component type identifier
     */
    getType(): string;
    /**
     * Create origin based on configuration
     */
    private createOrigin;
    /**
     * Create CloudFront distribution
     */
    private createCloudFrontDistribution;
    /**
     * Configure CloudWatch observability for CloudFront distribution
     */
    private configureCloudFrontObservability;
    /**
     * Apply compliance hardening based on framework
     */
    private applyComplianceHardening;
    /**
     * Build CloudFront capability descriptor
     */
    private buildCloudFrontCapability;
    /**
     * Helper methods for building CDK properties
     */
    private getViewerProtocolPolicy;
    private getAllowedMethods;
    private getCachedMethods;
    private buildAdditionalBehaviors;
    private getPriceClass;
    private buildGeoRestriction;
    private getViewerProtocolPolicyForBehavior;
    private getAllowedMethodsForBehavior;
    private getCachedMethodsForBehavior;
}
