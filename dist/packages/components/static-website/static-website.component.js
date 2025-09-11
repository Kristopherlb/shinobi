"use strict";
/**
 * Static Website Component
 *
 * Static website hosting with S3 and CloudFront CDN for global performance.
 * Implements Platform Component API Contract v1.1 with BaseComponent extension.
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
exports.StaticWebsiteComponent = void 0;
const s3 = __importStar(require("aws-cdk-lib/aws-s3"));
const cloudfront = __importStar(require("aws-cdk-lib/aws-cloudfront"));
const origins = __importStar(require("aws-cdk-lib/aws-cloudfront-origins"));
const s3deploy = __importStar(require("aws-cdk-lib/aws-s3-deployment"));
const certificatemanager = __importStar(require("aws-cdk-lib/aws-certificatemanager"));
const route53 = __importStar(require("aws-cdk-lib/aws-route53"));
const targets = __importStar(require("aws-cdk-lib/aws-route53-targets"));
const iam = __importStar(require("aws-cdk-lib/aws-iam"));
const cdk = __importStar(require("aws-cdk-lib"));
const base_component_1 = require("../../platform/core/base-component");
const static_website_builder_1 = require("./static-website.builder");
/**
 * Static Website Component implementing Component API Contract v1.1
 */
class StaticWebsiteComponent extends base_component_1.BaseComponent {
    bucket;
    distribution;
    deployment;
    accessLogBucket;
    distributionLogBucket;
    config;
    logger = this.getLogger();
    constructor(scope, id, context, spec) {
        super(scope, id, context, spec);
    }
    synth() {
        this.logger.info('Starting Static Website component synthesis', {
            componentName: this.spec.name,
            componentType: this.getType()
        });
        try {
            // Step 1: Build configuration using ConfigBuilder
            const configBuilder = new static_website_builder_1.StaticWebsiteConfigBuilder({
                context: this.context,
                spec: this.spec
            });
            this.config = configBuilder.buildSync();
            // Step 2: Create helper resources (if needed) - KMS key creation handled by BaseComponent if needed
            // Step 3: Instantiate AWS CDK L2 constructs
            this.createAccessLogBucketIfNeeded();
            this.createDistributionLogBucketIfNeeded();
            this.createWebsiteBucket();
            this.createCloudFrontDistribution();
            this.createDnsRecordsIfNeeded();
            this.createDeploymentIfNeeded();
            // Step 4: Apply standard tags
            this.applyStandardTags(this.bucket, {
                'bucket-type': 'website',
                'website-name': this.buildWebsiteName(),
                'versioning': (this.config.bucket?.versioning || false).toString(),
                'encryption': (this.config.security?.encryption || false).toString()
            });
            if (this.distribution) {
                this.applyStandardTags(this.distribution, {
                    'distribution-type': 'website',
                    'website': this.buildWebsiteName(),
                    'logging-enabled': (this.config.distribution?.enableLogging || false).toString()
                });
            }
            // Step 5: Register constructs for patches.ts access
            this.registerConstruct('main', this.bucket);
            this.registerConstruct('bucket', this.bucket);
            if (this.distribution) {
                this.registerConstruct('distribution', this.distribution);
            }
            if (this.deployment) {
                this.registerConstruct('deployment', this.deployment);
            }
            // Step 6: Register capabilities for component binding
            this.registerCapability('hosting:static', this.buildWebsiteCapability());
            this.logger.info('Static Website component synthesis completed successfully', {
                bucketName: this.bucket.bucketName,
                distributionId: this.distribution?.distributionId,
                deploymentEnabled: this.config.deployment?.enabled
            });
        }
        catch (error) {
            this.logger.error('Static Website component synthesis failed', error, {
                componentName: this.spec.name,
                componentType: this.getType()
            });
            throw error;
        }
    }
    getCapabilities() {
        this.validateSynthesized();
        return this.capabilities;
    }
    getType() {
        return 'static-website';
    }
    createAccessLogBucketIfNeeded() {
        if (this.config.bucket?.accessLogging) {
            this.accessLogBucket = new s3.Bucket(this, 'AccessLogBucket', {
                bucketName: `${this.buildWebsiteName()}-access-logs`,
                encryption: s3.BucketEncryption.S3_MANAGED,
                blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
                removalPolicy: this.getBucketRemovalPolicy(),
                lifecycleRules: [{
                        id: 'DeleteOldLogs',
                        expiration: cdk.Duration.days(this.getLogRetentionDays())
                    }]
            });
            this.applyStandardTags(this.accessLogBucket, {
                'bucket-type': 'access-logs',
                'website': this.buildWebsiteName(),
                'log-retention': this.getLogRetentionDays().toString()
            });
        }
    }
    createDistributionLogBucketIfNeeded() {
        if (this.config.distribution?.enableLogging) {
            this.distributionLogBucket = new s3.Bucket(this, 'DistributionLogBucket', {
                bucketName: `${this.buildWebsiteName()}-cloudfront-logs`,
                encryption: s3.BucketEncryption.S3_MANAGED,
                blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
                removalPolicy: this.getBucketRemovalPolicy(),
                lifecycleRules: [{
                        id: 'DeleteOldLogs',
                        expiration: cdk.Duration.days(this.getLogRetentionDays())
                    }]
            });
            this.applyStandardTags(this.distributionLogBucket, {
                'bucket-type': 'distribution-logs',
                'website': this.buildWebsiteName(),
                'log-retention': this.getLogRetentionDays().toString()
            });
        }
    }
    createWebsiteBucket() {
        const bucketProps = {
            bucketName: this.buildWebsiteName(),
            websiteIndexDocument: this.config.bucket?.indexDocument,
            websiteErrorDocument: this.config.bucket?.errorDocument,
            versioned: this.config.bucket?.versioning,
            encryption: this.config.security?.encryption ? s3.BucketEncryption.S3_MANAGED : s3.BucketEncryption.UNENCRYPTED,
            blockPublicAccess: this.config.security?.blockPublicAccess ? s3.BlockPublicAccess.BLOCK_ALL : s3.BlockPublicAccess.BLOCK_ACLS,
            removalPolicy: this.getBucketRemovalPolicy(),
            serverAccessLogsBucket: this.accessLogBucket,
            serverAccessLogsPrefix: 's3-access/'
        };
        this.bucket = new s3.Bucket(this, 'WebsiteBucket', bucketProps);
        // Add bucket policy for CloudFront access
        if (this.config.security?.blockPublicAccess) {
            const oai = new cloudfront.OriginAccessIdentity(this, 'OAI', {
                comment: `OAI for ${this.buildWebsiteName()}`
            });
            this.bucket.addToResourcePolicy(new iam.PolicyStatement({
                actions: ['s3:GetObject'],
                resources: [this.bucket.arnForObjects('*')],
                principals: [new iam.CanonicalUserPrincipal(oai.cloudFrontOriginAccessIdentityS3CanonicalUserId)]
            }));
        }
        this.logger.info('Website S3 bucket created', {
            bucketName: this.bucket.bucketName,
            versioning: this.config.bucket?.versioning,
            encryption: this.config.security?.encryption
        });
    }
    createCloudFrontDistribution() {
        if (!this.config.distribution?.enabled) {
            return;
        }
        // Default behavior
        const defaultBehavior = {
            origin: new origins.S3Origin(this.bucket),
            viewerProtocolPolicy: this.config.security?.enforceHTTPS ?
                cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS :
                cloudfront.ViewerProtocolPolicy.ALLOW_ALL,
            allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
            cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
            cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED
        };
        const distributionProps = {
            defaultBehavior: defaultBehavior,
            domainNames: this.config.domain ? [this.config.domain.domainName, ...(this.config.domain.alternativeDomainNames || [])] : undefined,
            certificate: this.config.domain?.certificateArn ?
                certificatemanager.Certificate.fromCertificateArn(this, 'Certificate', this.config.domain.certificateArn) :
                undefined,
            priceClass: cloudfront.PriceClass.PRICE_CLASS_100, // Simplified from pass-through
            defaultRootObject: this.config.bucket?.indexDocument,
            errorResponses: [
                {
                    httpStatus: 404,
                    responseHttpStatus: 404,
                    responsePagePath: `/${this.config.bucket?.errorDocument}`
                }
            ],
            enableLogging: this.config.distribution.enableLogging,
            logBucket: this.distributionLogBucket,
            logFilePrefix: this.config.distribution.logFilePrefix
        };
        this.distribution = new cloudfront.Distribution(this, 'Distribution', distributionProps);
        this.logger.info('CloudFront distribution created', {
            distributionId: this.distribution.distributionId,
            domainName: this.distribution.distributionDomainName,
            loggingEnabled: this.config.distribution.enableLogging
        });
    }
    createDnsRecordsIfNeeded() {
        if (!this.config.domain || !this.distribution) {
            return;
        }
        if (this.config.domain.hostedZoneId) {
            const hostedZone = route53.HostedZone.fromHostedZoneId(this, 'HostedZone', this.config.domain.hostedZoneId);
            // Create A record for primary domain
            new route53.ARecord(this, 'AliasRecord', {
                zone: hostedZone,
                recordName: this.config.domain.domainName,
                target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(this.distribution))
            });
            // Create A records for alternative domains
            if (this.config.domain.alternativeDomainNames) {
                this.config.domain.alternativeDomainNames.forEach((altDomain, index) => {
                    new route53.ARecord(this, `AliasRecord${index}`, {
                        zone: hostedZone,
                        recordName: altDomain,
                        target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(this.distribution))
                    });
                });
            }
            this.logger.info('DNS records created', {
                primaryDomain: this.config.domain.domainName,
                alternativeDomains: this.config.domain.alternativeDomainNames?.length || 0
            });
        }
    }
    createDeploymentIfNeeded() {
        if (!this.config.deployment?.enabled || !this.config.deployment.sourcePath) {
            return;
        }
        this.deployment = new s3deploy.BucketDeployment(this, 'Deployment', {
            sources: [s3deploy.Source.asset(this.config.deployment.sourcePath)],
            destinationBucket: this.bucket,
            distribution: this.distribution,
            distributionPaths: ['/*'],
            retainOnDelete: this.config.deployment.retainOnDelete
        });
        this.applyStandardTags(this.deployment, {
            'deployment-type': 'automatic',
            'source-path': this.config.deployment.sourcePath,
            'retain-on-delete': (this.config.deployment.retainOnDelete || false).toString()
        });
        this.logger.info('S3 deployment created', {
            sourcePath: this.config.deployment.sourcePath,
            retainOnDelete: this.config.deployment.retainOnDelete
        });
    }
    buildWebsiteName() {
        if (this.config.websiteName) {
            return this.config.websiteName;
        }
        return `${this.context.serviceName}-${this.spec.name}`;
    }
    getBucketRemovalPolicy() {
        return ['fedramp-moderate', 'fedramp-high'].includes(this.context.complianceFramework)
            ? cdk.RemovalPolicy.RETAIN
            : cdk.RemovalPolicy.DESTROY;
    }
    getLogRetentionDays() {
        switch (this.context.complianceFramework) {
            case 'fedramp-high':
                return 3650; // 10 years
            case 'fedramp-moderate':
                return 365; // 1 year
            default:
                return 90; // 3 months
        }
    }
    buildWebsiteCapability() {
        return {
            bucketName: this.bucket.bucketName,
            websiteUrl: this.bucket.bucketWebsiteUrl,
            distributionDomainName: this.distribution?.distributionDomainName,
            distributionId: this.distribution?.distributionId
        };
    }
}
exports.StaticWebsiteComponent = StaticWebsiteComponent;
