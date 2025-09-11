"use strict";
/**
 * CloudFront Distribution Component implementing Component API Contract v1.0
 *
 * A managed Content Delivery Network (CDN) for global, low-latency content delivery.
 * Implements three-tiered compliance model (Commercial/FedRAMP Moderate/FedRAMP High).
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.CloudFrontDistributionComponent = exports.CloudFrontDistributionConfigBuilder = exports.CLOUDFRONT_DISTRIBUTION_CONFIG_SCHEMA = void 0;
const cloudfront = __importStar(require("aws-cdk-lib/aws-cloudfront"));
const origins = __importStar(require("aws-cdk-lib/aws-cloudfront-origins"));
const s3 = __importStar(require("aws-cdk-lib/aws-s3"));
const certificatemanager = __importStar(require("aws-cdk-lib/aws-certificatemanager"));
const cloudwatch = __importStar(require("aws-cdk-lib/aws-cloudwatch"));
const cdk = __importStar(require("aws-cdk-lib"));
const src_1 = require("../../../platform/contracts/src");
/**
 * JSON Schema for CloudFront Distribution configuration
 */
exports.CLOUDFRONT_DISTRIBUTION_CONFIG_SCHEMA = {
    type: 'object',
    properties: {
        comment: { type: 'string' },
        origin: {
            type: 'object',
            properties: {
                type: {
                    type: 'string',
                    enum: ['s3', 'alb', 'custom']
                },
                s3BucketName: { type: 'string' },
                albDnsName: { type: 'string' },
                customDomainName: { type: 'string' },
                originPath: { type: 'string' },
                customHeaders: {
                    type: 'object',
                    additionalProperties: { type: 'string' }
                }
            },
            required: ['type']
        },
        domain: {
            type: 'object',
            properties: {
                domainNames: {
                    type: 'array',
                    items: { type: 'string' }
                },
                certificateArn: { type: 'string' },
                sslSupportMethod: {
                    type: 'string',
                    enum: ['sni-only', 'vip']
                },
                minimumProtocolVersion: { type: 'string' }
            }
        },
        defaultBehavior: {
            type: 'object',
            properties: {
                viewerProtocolPolicy: {
                    type: 'string',
                    enum: ['allow-all', 'redirect-to-https', 'https-only']
                },
                allowedMethods: {
                    type: 'array',
                    items: { type: 'string' }
                },
                cachedMethods: {
                    type: 'array',
                    items: { type: 'string' }
                },
                cachePolicyId: { type: 'string' },
                originRequestPolicyId: { type: 'string' },
                compress: { type: 'boolean' },
                ttl: {
                    type: 'object',
                    properties: {
                        default: { type: 'number', minimum: 0 },
                        maximum: { type: 'number', minimum: 0 },
                        minimum: { type: 'number', minimum: 0 }
                    }
                }
            }
        },
        additionalBehaviors: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    pathPattern: { type: 'string' },
                    viewerProtocolPolicy: {
                        type: 'string',
                        enum: ['allow-all', 'redirect-to-https', 'https-only']
                    },
                    allowedMethods: {
                        type: 'array',
                        items: { type: 'string' }
                    },
                    cachedMethods: {
                        type: 'array',
                        items: { type: 'string' }
                    },
                    cachePolicyId: { type: 'string' },
                    originRequestPolicyId: { type: 'string' },
                    compress: { type: 'boolean' }
                },
                required: ['pathPattern']
            }
        },
        geoRestriction: {
            type: 'object',
            properties: {
                type: {
                    type: 'string',
                    enum: ['whitelist', 'blacklist', 'none']
                },
                countries: {
                    type: 'array',
                    items: { type: 'string' }
                }
            },
            required: ['type']
        },
        priceClass: {
            type: 'string',
            enum: ['PriceClass_All', 'PriceClass_200', 'PriceClass_100']
        },
        logging: {
            type: 'object',
            properties: {
                enabled: { type: 'boolean' },
                bucket: { type: 'string' },
                prefix: { type: 'string' },
                includeCookies: { type: 'boolean' }
            }
        },
        webAclId: { type: 'string' },
        monitoring: {
            type: 'object',
            properties: {
                enabled: { type: 'boolean' },
                alarms: {
                    type: 'object',
                    properties: {
                        error4xxThreshold: { type: 'number', minimum: 0 },
                        error5xxThreshold: { type: 'number', minimum: 0 },
                        originLatencyThreshold: { type: 'number', minimum: 0 }
                    }
                }
            }
        },
        tags: {
            type: 'object',
            additionalProperties: { type: 'string' }
        }
    },
    required: ['origin'],
    additionalProperties: false
};
/**
 * ConfigBuilder for CloudFront Distribution component
 */
class CloudFrontDistributionConfigBuilder {
    context;
    spec;
    constructor(context, spec) {
        this.context = context;
        this.spec = spec;
    }
    /**
     * Asynchronous build method - delegates to synchronous implementation
     */
    async build() {
        return this.buildSync();
    }
    /**
     * Synchronous version of build for use in synth() method
     */
    buildSync() {
        // Start with platform defaults
        const platformDefaults = this.getPlatformDefaults();
        // Apply compliance framework defaults
        const complianceDefaults = this.getComplianceFrameworkDefaults();
        // Merge user configuration from spec
        const userConfig = this.spec.config || {};
        // Merge configurations (user config takes precedence)
        const mergedConfig = this.mergeConfigs(this.mergeConfigs(platformDefaults, complianceDefaults), userConfig);
        return mergedConfig;
    }
    /**
     * Simple merge utility for combining configuration objects
     */
    mergeConfigs(base, override) {
        const result = { ...base };
        for (const [key, value] of Object.entries(override)) {
            if (value !== undefined && value !== null) {
                if (typeof value === 'object' && !Array.isArray(value) && typeof result[key] === 'object' && !Array.isArray(result[key])) {
                    result[key] = this.mergeConfigs(result[key] || {}, value);
                }
                else {
                    result[key] = value;
                }
            }
        }
        return result;
    }
    /**
     * Get platform-wide defaults with intelligent configuration
     */
    getPlatformDefaults() {
        return {
            comment: `CloudFront distribution for ${this.spec.name}`,
            defaultBehavior: {
                viewerProtocolPolicy: this.getDefaultViewerProtocolPolicy(),
                allowedMethods: ['GET', 'HEAD', 'OPTIONS'],
                cachedMethods: ['GET', 'HEAD'],
                compress: true,
                ttl: {
                    default: 86400, // 24 hours
                    maximum: 31536000, // 1 year
                    minimum: 0
                }
            },
            priceClass: this.getDefaultPriceClass(),
            geoRestriction: {
                type: 'none'
            },
            logging: {
                enabled: this.shouldEnableLogging(),
                includeCookies: false
            },
            monitoring: {
                enabled: true,
                alarms: {
                    error4xxThreshold: 50,
                    error5xxThreshold: 10,
                    originLatencyThreshold: 5000
                }
            }
        };
    }
    /**
     * Get compliance framework-specific defaults
     */
    getComplianceFrameworkDefaults() {
        switch (this.context.complianceFramework) {
            case 'fedramp-high':
                return {
                    defaultBehavior: {
                        viewerProtocolPolicy: 'https-only', // Mandatory HTTPS
                        ttl: {
                            default: 3600, // Shorter cache for security
                            maximum: 86400,
                            minimum: 0
                        }
                    },
                    priceClass: 'PriceClass_All', // Global coverage for compliance
                    logging: {
                        enabled: true, // Mandatory logging
                        includeCookies: true
                    },
                    monitoring: {
                        enabled: true,
                        alarms: {
                            error4xxThreshold: 25, // More sensitive monitoring
                            error5xxThreshold: 5,
                            originLatencyThreshold: 3000
                        }
                    }
                };
            case 'fedramp-moderate':
                return {
                    defaultBehavior: {
                        viewerProtocolPolicy: 'redirect-to-https', // Force HTTPS
                        ttl: {
                            default: 7200, // 2 hours
                            maximum: 86400,
                            minimum: 0
                        }
                    },
                    priceClass: 'PriceClass_200', // US, Europe, Asia coverage
                    logging: {
                        enabled: true, // Recommended logging
                        includeCookies: false
                    },
                    monitoring: {
                        enabled: true,
                        alarms: {
                            error4xxThreshold: 35,
                            error5xxThreshold: 8,
                            originLatencyThreshold: 4000
                        }
                    }
                };
            default: // commercial
                return {
                    defaultBehavior: {
                        viewerProtocolPolicy: 'allow-all', // Flexible for commercial
                    },
                    priceClass: 'PriceClass_100', // Cost-optimized
                    logging: {
                        enabled: false // Optional for commercial
                    },
                    monitoring: {
                        enabled: false // Optional monitoring
                    }
                };
        }
    }
    /**
     * Get default viewer protocol policy based on compliance framework
     */
    getDefaultViewerProtocolPolicy() {
        switch (this.context.complianceFramework) {
            case 'fedramp-high':
                return 'https-only';
            case 'fedramp-moderate':
                return 'redirect-to-https';
            default:
                return 'allow-all';
        }
    }
    /**
     * Get default price class based on compliance framework
     */
    getDefaultPriceClass() {
        switch (this.context.complianceFramework) {
            case 'fedramp-high':
                return 'PriceClass_All';
            case 'fedramp-moderate':
                return 'PriceClass_200';
            default:
                return 'PriceClass_100';
        }
    }
    /**
     * Determine if logging should be enabled by default
     */
    shouldEnableLogging() {
        return ['fedramp-moderate', 'fedramp-high'].includes(this.context.complianceFramework);
    }
}
exports.CloudFrontDistributionConfigBuilder = CloudFrontDistributionConfigBuilder;
/**
 * CloudFront Distribution Component implementing Component API Contract v1.0
 */
class CloudFrontDistributionComponent extends src_1.Component {
    distribution;
    origin;
    config;
    constructor(scope, id, context, spec) {
        super(scope, id, context, spec);
    }
    /**
     * Synthesis phase - Create CloudFront distribution with global CDN
     */
    synth() {
        this.logComponentEvent('synthesis_start', 'Starting CloudFront Distribution synthesis');
        try {
            // Build configuration using ConfigBuilder
            const configBuilder = new CloudFrontDistributionConfigBuilder(this.context, this.spec);
            this.config = configBuilder.buildSync();
            // Create origin based on configuration
            this.createOrigin();
            // Create CloudFront distribution
            this.createCloudFrontDistribution();
            // Configure observability
            this.configureCloudFrontObservability();
            // Apply compliance hardening
            this.applyComplianceHardening();
            // Register constructs
            this.registerConstruct('distribution', this.distribution);
            // Register capabilities
            this.registerCapability('cdn:cloudfront', this.buildCloudFrontCapability());
            this.logComponentEvent('synthesis_complete', 'CloudFront Distribution synthesis completed successfully');
        }
        catch (error) {
            this.logError(error, 'CloudFront Distribution synthesis');
            throw error;
        }
    }
    /**
     * Get the capabilities this component provides
     */
    getCapabilities() {
        this.validateSynthesized();
        return this.capabilities;
    }
    /**
     * Get the component type identifier
     */
    getType() {
        return 'cloudfront-distribution';
    }
    /**
     * Create origin based on configuration
     */
    createOrigin() {
        const originConfig = this.config.origin;
        switch (originConfig.type) {
            case 's3':
                if (!originConfig.s3BucketName) {
                    throw new Error('S3 bucket name is required for S3 origin');
                }
                const bucket = s3.Bucket.fromBucketName(this, 'OriginBucket', originConfig.s3BucketName);
                this.origin = new origins.S3Origin(bucket, {
                    originPath: originConfig.originPath,
                    customHeaders: originConfig.customHeaders
                });
                break;
            case 'alb':
                if (!originConfig.albDnsName) {
                    throw new Error('ALB DNS name is required for ALB origin');
                }
                this.origin = new origins.HttpOrigin(originConfig.albDnsName, {
                    originPath: originConfig.originPath,
                    customHeaders: originConfig.customHeaders,
                    protocolPolicy: cloudfront.OriginProtocolPolicy.HTTPS_ONLY
                });
                break;
            case 'custom':
                if (!originConfig.customDomainName) {
                    throw new Error('Custom domain name is required for custom origin');
                }
                this.origin = new origins.HttpOrigin(originConfig.customDomainName, {
                    originPath: originConfig.originPath,
                    customHeaders: originConfig.customHeaders,
                    protocolPolicy: cloudfront.OriginProtocolPolicy.HTTPS_ONLY
                });
                break;
            default:
                throw new Error(`Unsupported origin type: ${originConfig.type}`);
        }
        this.logResourceCreation('cloudfront-origin', `${originConfig.type}-origin`, {
            type: originConfig.type,
            path: originConfig.originPath
        });
    }
    /**
     * Create CloudFront distribution
     */
    createCloudFrontDistribution() {
        const distributionProps = {
            comment: this.config.comment,
            defaultBehavior: {
                origin: this.origin,
                viewerProtocolPolicy: this.getViewerProtocolPolicy(),
                allowedMethods: this.getAllowedMethods(),
                cachedMethods: this.getCachedMethods(),
                compress: this.config.defaultBehavior?.compress,
                cachePolicy: this.config.defaultBehavior?.cachePolicyId ?
                    cloudfront.CachePolicy.fromCachePolicyId(this, 'CachePolicy', this.config.defaultBehavior.cachePolicyId) :
                    cloudfront.CachePolicy.CACHING_OPTIMIZED,
                originRequestPolicy: this.config.defaultBehavior?.originRequestPolicyId ?
                    cloudfront.OriginRequestPolicy.fromOriginRequestPolicyId(this, 'OriginRequestPolicy', this.config.defaultBehavior.originRequestPolicyId) :
                    undefined
            },
            additionalBehaviors: this.buildAdditionalBehaviors(),
            priceClass: this.getPriceClass(),
            geoRestriction: this.buildGeoRestriction(),
            certificate: this.config.domain?.certificateArn ?
                certificatemanager.Certificate.fromCertificateArn(this, 'Certificate', this.config.domain.certificateArn) :
                undefined,
            domainNames: this.config.domain?.domainNames,
            enableLogging: this.config.logging?.enabled,
            logBucket: this.config.logging?.bucket ?
                s3.Bucket.fromBucketName(this, 'LogBucket', this.config.logging.bucket) :
                undefined,
            logFilePrefix: this.config.logging?.prefix,
            logIncludesCookies: this.config.logging?.includeCookies,
            webAclId: this.config.webAclId
        };
        this.distribution = new cloudfront.Distribution(this, 'CloudFrontDistribution', distributionProps);
        // Apply standard tags
        this.applyStandardTags(this.distribution, {
            'distribution-type': 'cdn',
            'origin-type': this.config.origin.type,
            'price-class': this.config.priceClass || 'PriceClass_100'
        });
        this.logResourceCreation('cloudfront-distribution', this.distribution.distributionId, {
            domainName: this.distribution.distributionDomainName,
            priceClass: this.config.priceClass,
            originType: this.config.origin.type
        });
    }
    /**
     * Configure CloudWatch observability for CloudFront distribution
     */
    configureCloudFrontObservability() {
        if (!this.config.monitoring?.enabled) {
            return;
        }
        const distributionId = this.distribution.distributionId;
        // 1. 4XX Error Rate Alarm
        new cloudwatch.Alarm(this, 'Error4xxAlarm', {
            alarmName: `${this.context.serviceName}-${this.spec.name}-4xx-errors`,
            alarmDescription: 'CloudFront 4XX error rate alarm',
            metric: new cloudwatch.Metric({
                namespace: 'AWS/CloudFront',
                metricName: '4xxErrorRate',
                dimensionsMap: {
                    DistributionId: distributionId
                },
                statistic: 'Average',
                period: cdk.Duration.minutes(5)
            }),
            threshold: this.config.monitoring.alarms?.error4xxThreshold || 50,
            evaluationPeriods: 2,
            comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
            treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING
        });
        // 2. 5XX Error Rate Alarm
        new cloudwatch.Alarm(this, 'Error5xxAlarm', {
            alarmName: `${this.context.serviceName}-${this.spec.name}-5xx-errors`,
            alarmDescription: 'CloudFront 5XX error rate alarm',
            metric: new cloudwatch.Metric({
                namespace: 'AWS/CloudFront',
                metricName: '5xxErrorRate',
                dimensionsMap: {
                    DistributionId: distributionId
                },
                statistic: 'Average',
                period: cdk.Duration.minutes(5)
            }),
            threshold: this.config.monitoring.alarms?.error5xxThreshold || 10,
            evaluationPeriods: 2,
            comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
            treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING
        });
        this.logComponentEvent('observability_configured', 'OpenTelemetry observability standard applied to CloudFront distribution', {
            alarmsCreated: 2,
            distributionId: distributionId,
            monitoringEnabled: true
        });
    }
    /**
     * Apply compliance hardening based on framework
     */
    applyComplianceHardening() {
        if (!this.distribution)
            return;
        switch (this.context.complianceFramework) {
            case 'fedramp-high':
            case 'fedramp-moderate':
                // For FedRAMP environments, ensure distribution has proper security and logging
                const cfnDistribution = this.distribution.node.defaultChild;
                cfnDistribution.addMetadata('ComplianceFramework', this.context.complianceFramework);
                this.logComponentEvent('compliance_hardening_applied', 'FedRAMP compliance hardening applied', {
                    framework: this.context.complianceFramework,
                    httpsOnly: this.config.defaultBehavior?.viewerProtocolPolicy === 'https-only',
                    loggingEnabled: this.config.logging?.enabled
                });
                break;
            default:
                // No special hardening needed for commercial
                break;
        }
    }
    /**
     * Build CloudFront capability descriptor
     */
    buildCloudFrontCapability() {
        return {
            type: 'cdn:cloudfront',
            distributionId: this.distribution.distributionId,
            distributionDomainName: this.distribution.distributionDomainName,
            domainNames: this.config.domain?.domainNames,
            originType: this.config.origin.type,
            priceClass: this.config.priceClass
        };
    }
    /**
     * Helper methods for building CDK properties
     */
    getViewerProtocolPolicy() {
        switch (this.config.defaultBehavior?.viewerProtocolPolicy) {
            case 'https-only':
                return cloudfront.ViewerProtocolPolicy.HTTPS_ONLY;
            case 'redirect-to-https':
                return cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS;
            default:
                return cloudfront.ViewerProtocolPolicy.ALLOW_ALL;
        }
    }
    getAllowedMethods() {
        const methods = this.config.defaultBehavior?.allowedMethods || ['GET', 'HEAD'];
        if (methods.includes('DELETE') || methods.includes('PUT') || methods.includes('PATCH')) {
            return cloudfront.AllowedMethods.ALLOW_ALL;
        }
        if (methods.includes('POST')) {
            return cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS;
        }
        return cloudfront.AllowedMethods.ALLOW_GET_HEAD;
    }
    getCachedMethods() {
        const methods = this.config.defaultBehavior?.cachedMethods || ['GET', 'HEAD'];
        if (methods.includes('OPTIONS')) {
            return cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS;
        }
        return cloudfront.CachedMethods.CACHE_GET_HEAD;
    }
    buildAdditionalBehaviors() {
        if (!this.config.additionalBehaviors) {
            return undefined;
        }
        const behaviors = {};
        for (const behavior of this.config.additionalBehaviors) {
            behaviors[behavior.pathPattern] = {
                origin: this.origin,
                viewerProtocolPolicy: this.getViewerProtocolPolicyForBehavior(behavior.viewerProtocolPolicy),
                allowedMethods: this.getAllowedMethodsForBehavior(behavior.allowedMethods),
                cachedMethods: this.getCachedMethodsForBehavior(behavior.cachedMethods),
                compress: behavior.compress,
                cachePolicy: behavior.cachePolicyId ?
                    cloudfront.CachePolicy.fromCachePolicyId(this, `CachePolicy-${behavior.pathPattern}`, behavior.cachePolicyId) :
                    cloudfront.CachePolicy.CACHING_OPTIMIZED
            };
        }
        return behaviors;
    }
    getPriceClass() {
        switch (this.config.priceClass) {
            case 'PriceClass_All':
                return cloudfront.PriceClass.PRICE_CLASS_ALL;
            case 'PriceClass_200':
                return cloudfront.PriceClass.PRICE_CLASS_200;
            default:
                return cloudfront.PriceClass.PRICE_CLASS_100;
        }
    }
    buildGeoRestriction() {
        if (!this.config.geoRestriction || this.config.geoRestriction.type === 'none') {
            return undefined;
        }
        const countries = this.config.geoRestriction.countries || [];
        switch (this.config.geoRestriction.type) {
            case 'whitelist':
                return cloudfront.GeoRestriction.allowlist(...countries);
            case 'blacklist':
                return cloudfront.GeoRestriction.denylist(...countries);
            default:
                return undefined;
        }
    }
    getViewerProtocolPolicyForBehavior(policy) {
        switch (policy) {
            case 'https-only':
                return cloudfront.ViewerProtocolPolicy.HTTPS_ONLY;
            case 'redirect-to-https':
                return cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS;
            default:
                return cloudfront.ViewerProtocolPolicy.ALLOW_ALL;
        }
    }
    getAllowedMethodsForBehavior(methods) {
        if (!methods)
            return cloudfront.AllowedMethods.ALLOW_GET_HEAD;
        if (methods.includes('DELETE') || methods.includes('PUT') || methods.includes('PATCH')) {
            return cloudfront.AllowedMethods.ALLOW_ALL;
        }
        if (methods.includes('POST')) {
            return cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS;
        }
        return cloudfront.AllowedMethods.ALLOW_GET_HEAD;
    }
    getCachedMethodsForBehavior(methods) {
        if (!methods)
            return cloudfront.CachedMethods.CACHE_GET_HEAD;
        if (methods.includes('OPTIONS')) {
            return cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS;
        }
        return cloudfront.CachedMethods.CACHE_GET_HEAD;
    }
}
exports.CloudFrontDistributionComponent = CloudFrontDistributionComponent;
