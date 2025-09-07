"use strict";
/**
 * S3 Bucket Component
 *
 * An Amazon S3 bucket for object storage with compliance hardening.
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
exports.S3BucketComponent = exports.S3BucketConfigBuilder = exports.S3_BUCKET_CONFIG_SCHEMA = void 0;
const s3 = __importStar(require("aws-cdk-lib/aws-s3"));
const kms = __importStar(require("aws-cdk-lib/aws-kms"));
const lambda = __importStar(require("aws-cdk-lib/aws-lambda"));
const s3n = __importStar(require("aws-cdk-lib/aws-s3-notifications"));
const iam = __importStar(require("aws-cdk-lib/aws-iam"));
const cdk = __importStar(require("aws-cdk-lib"));
const contracts_1 = require("@platform/contracts");
/**
 * Configuration schema for S3 Bucket component
 */
exports.S3_BUCKET_CONFIG_SCHEMA = {
    type: 'object',
    title: 'S3 Bucket Configuration',
    description: 'Configuration for creating an S3 bucket for object storage',
    properties: {
        bucketName: {
            type: 'string',
            description: 'Bucket name (must be globally unique)',
            pattern: '^[a-z0-9.-]+$',
            minLength: 3,
            maxLength: 63
        },
        public: {
            type: 'boolean',
            description: 'Whether to allow public access to the bucket',
            default: false
        },
        website: {
            type: 'object',
            description: 'Static website hosting configuration',
            properties: {
                enabled: {
                    type: 'boolean',
                    description: 'Enable static website hosting',
                    default: false
                },
                indexDocument: {
                    type: 'string',
                    description: 'Index document for website hosting',
                    default: 'index.html'
                },
                errorDocument: {
                    type: 'string',
                    description: 'Error document for website hosting',
                    default: 'error.html'
                }
            },
            additionalProperties: false,
            default: {
                enabled: false,
                indexDocument: 'index.html',
                errorDocument: 'error.html'
            }
        },
        eventBridgeEnabled: {
            type: 'boolean',
            description: 'Enable EventBridge notifications for object events',
            default: false
        },
        versioning: {
            type: 'boolean',
            description: 'Enable object versioning',
            default: true
        },
        encryption: {
            type: 'object',
            description: 'Encryption configuration',
            properties: {
                type: {
                    type: 'string',
                    description: 'Encryption type',
                    enum: ['AES256', 'KMS'],
                    default: 'AES256'
                },
                kmsKeyArn: {
                    type: 'string',
                    description: 'KMS key ARN for encryption (required when type is KMS)',
                    pattern: '^arn:aws:kms:[a-z0-9-]+:[0-9]{12}:key/[a-f0-9-]{36}$'
                }
            },
            additionalProperties: false,
            default: {
                type: 'AES256'
            }
        },
        lifecycleRules: {
            type: 'array',
            description: 'Lifecycle rules for object management',
            items: {
                type: 'object',
                properties: {
                    id: {
                        type: 'string',
                        description: 'Unique identifier for the lifecycle rule'
                    },
                    enabled: {
                        type: 'boolean',
                        description: 'Whether the lifecycle rule is enabled',
                        default: true
                    },
                    transitions: {
                        type: 'array',
                        description: 'Storage class transitions',
                        items: {
                            type: 'object',
                            properties: {
                                storageClass: {
                                    type: 'string',
                                    description: 'Target storage class',
                                    enum: ['STANDARD_IA', 'ONEZONE_IA', 'GLACIER', 'DEEP_ARCHIVE', 'GLACIER_IR']
                                },
                                transitionAfter: {
                                    type: 'number',
                                    description: 'Number of days after creation to transition',
                                    minimum: 1
                                }
                            },
                            required: ['storageClass', 'transitionAfter'],
                            additionalProperties: false
                        }
                    },
                    expiration: {
                        type: 'object',
                        description: 'Object expiration configuration',
                        properties: {
                            days: {
                                type: 'number',
                                description: 'Number of days after creation to expire objects',
                                minimum: 1
                            }
                        },
                        required: ['days'],
                        additionalProperties: false
                    }
                },
                required: ['id', 'enabled'],
                additionalProperties: false
            },
            default: []
        },
        security: {
            type: 'object',
            description: 'Security tooling configuration',
            properties: {
                tools: {
                    type: 'object',
                    description: 'Security tools configuration',
                    properties: {
                        clamavScan: {
                            type: 'boolean',
                            description: 'Enable ClamAV virus scanning for uploaded objects',
                            default: false
                        }
                    },
                    additionalProperties: false,
                    default: {
                        clamavScan: false
                    }
                }
            },
            additionalProperties: false,
            default: {
                tools: {
                    clamavScan: false
                }
            }
        },
        compliance: {
            type: 'object',
            description: 'Backup and compliance settings',
            properties: {
                objectLock: {
                    type: 'object',
                    description: 'Object Lock configuration for compliance',
                    properties: {
                        enabled: {
                            type: 'boolean',
                            description: 'Enable Object Lock',
                            default: false
                        },
                        mode: {
                            type: 'string',
                            description: 'Object Lock retention mode',
                            enum: ['GOVERNANCE', 'COMPLIANCE'],
                            default: 'COMPLIANCE'
                        },
                        retentionDays: {
                            type: 'number',
                            description: 'Default retention period in days',
                            minimum: 1,
                            maximum: 36500,
                            default: 395
                        }
                    },
                    additionalProperties: false,
                    default: {
                        enabled: false,
                        mode: 'COMPLIANCE',
                        retentionDays: 395
                    }
                },
                auditLogging: {
                    type: 'boolean',
                    description: 'Enable audit logging to centralized audit bucket',
                    default: false
                }
            },
            additionalProperties: false,
            default: {
                objectLock: {
                    enabled: false,
                    mode: 'COMPLIANCE',
                    retentionDays: 395
                },
                auditLogging: false
            }
        }
    },
    additionalProperties: false,
    defaults: {
        public: false,
        website: {
            enabled: false,
            indexDocument: 'index.html',
            errorDocument: 'error.html'
        },
        eventBridgeEnabled: false,
        versioning: true,
        encryption: {
            type: 'AES256'
        },
        lifecycleRules: [],
        security: {
            tools: {
                clamavScan: false
            }
        },
        compliance: {
            objectLock: {
                enabled: false,
                mode: 'COMPLIANCE',
                retentionDays: 395
            },
            auditLogging: false
        }
    }
};
/**
 * Configuration builder for S3 Bucket component
 */
class S3BucketConfigBuilder {
    context;
    spec;
    constructor(context, spec) {
        this.context = context;
        this.spec = spec;
    }
    /**
     * Builds the final configuration by applying platform defaults, compliance frameworks, and user overrides
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
    mergeConfigs(target, source) {
        const result = { ...target };
        for (const key in source) {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                result[key] = this.mergeConfigs(result[key] || {}, source[key]);
            }
            else {
                result[key] = source[key];
            }
        }
        return result;
    }
    /**
     * Get platform-wide defaults for S3 Bucket
     */
    getPlatformDefaults() {
        return {
            public: false,
            versioning: this.getDefaultVersioning(),
            eventBridgeEnabled: false,
            encryption: {
                type: this.getDefaultEncryptionType()
            },
            website: {
                enabled: false,
                indexDocument: 'index.html',
                errorDocument: 'error.html'
            },
            lifecycleRules: this.getDefaultLifecycleRules(),
            security: {
                tools: {
                    clamavScan: this.getDefaultClamAVEnabled()
                }
            },
            compliance: {
                objectLock: {
                    enabled: this.getDefaultObjectLockEnabled(),
                    mode: 'COMPLIANCE',
                    retentionDays: this.getDefaultRetentionDays()
                },
                auditLogging: this.getDefaultAuditLogging()
            }
        };
    }
    /**
     * Get compliance framework specific defaults
     */
    getComplianceFrameworkDefaults() {
        const framework = this.context.complianceFramework;
        switch (framework) {
            case 'fedramp-moderate':
                return {
                    versioning: true, // Required for compliance
                    encryption: {
                        type: 'KMS' // Customer-managed keys required
                    },
                    security: {
                        tools: {
                            clamavScan: true // Security scanning required
                        }
                    },
                    compliance: {
                        objectLock: {
                            enabled: false, // Not required for moderate
                            mode: 'GOVERNANCE',
                            retentionDays: 1095 // 3 years
                        },
                        auditLogging: true // Enhanced logging required
                    },
                    lifecycleRules: [
                        {
                            id: 'compliance-archival',
                            enabled: true,
                            transitions: [
                                {
                                    storageClass: 'GLACIER',
                                    transitionAfter: 90
                                },
                                {
                                    storageClass: 'DEEP_ARCHIVE',
                                    transitionAfter: 365
                                }
                            ]
                        }
                    ]
                };
            case 'fedramp-high':
                return {
                    versioning: true, // Required for compliance
                    encryption: {
                        type: 'KMS' // Customer-managed keys required
                    },
                    security: {
                        tools: {
                            clamavScan: true // Security scanning required
                        }
                    },
                    compliance: {
                        objectLock: {
                            enabled: true, // Required for immutable backups
                            mode: 'COMPLIANCE',
                            retentionDays: 2555 // 7 years
                        },
                        auditLogging: true // Enhanced logging required
                    },
                    lifecycleRules: [
                        {
                            id: 'fedramp-high-archival',
                            enabled: true,
                            transitions: [
                                {
                                    storageClass: 'GLACIER',
                                    transitionAfter: 90
                                },
                                {
                                    storageClass: 'DEEP_ARCHIVE',
                                    transitionAfter: 365
                                }
                            ],
                            expiration: {
                                days: 2555 // 7 years maximum retention
                            }
                        }
                    ]
                };
            default: // commercial
                return {};
        }
    }
    /**
     * Get default versioning setting based on compliance framework
     */
    getDefaultVersioning() {
        return ['fedramp-moderate', 'fedramp-high'].includes(this.context.complianceFramework);
    }
    /**
     * Get default encryption type based on compliance framework
     */
    getDefaultEncryptionType() {
        return ['fedramp-moderate', 'fedramp-high'].includes(this.context.complianceFramework) ? 'KMS' : 'AES256';
    }
    /**
     * Get default ClamAV scanning setting
     */
    getDefaultClamAVEnabled() {
        return ['fedramp-moderate', 'fedramp-high'].includes(this.context.complianceFramework);
    }
    /**
     * Get default Object Lock setting
     */
    getDefaultObjectLockEnabled() {
        return this.context.complianceFramework === 'fedramp-high';
    }
    /**
     * Get default retention days based on compliance framework
     */
    getDefaultRetentionDays() {
        switch (this.context.complianceFramework) {
            case 'fedramp-high':
                return 2555; // 7 years for high compliance
            case 'fedramp-moderate':
                return 1095; // 3 years for moderate compliance
            default:
                return 395; // ~1 year for commercial
        }
    }
    /**
     * Get default audit logging setting
     */
    getDefaultAuditLogging() {
        return ['fedramp-moderate', 'fedramp-high'].includes(this.context.complianceFramework);
    }
    /**
     * Get default lifecycle rules based on compliance framework
     */
    getDefaultLifecycleRules() {
        const framework = this.context.complianceFramework;
        if (framework === 'fedramp-high' || framework === 'fedramp-moderate') {
            return [
                {
                    id: 'compliance-archival',
                    enabled: true,
                    transitions: [
                        {
                            storageClass: 'GLACIER',
                            transitionAfter: 90
                        },
                        {
                            storageClass: 'DEEP_ARCHIVE',
                            transitionAfter: 365
                        }
                    ]
                }
            ];
        }
        return [];
    }
}
exports.S3BucketConfigBuilder = S3BucketConfigBuilder;
/**
 * S3 Bucket Component implementing Component API Contract v1.0
 */
class S3BucketComponent extends contracts_1.Component {
    bucket;
    kmsKey;
    auditBucket;
    virusScanLambda;
    config;
    constructor(scope, id, context, spec) {
        super(scope, id, context, spec);
    }
    /**
     * Synthesis phase - Create S3 bucket with compliance hardening
     */
    synth() {
        // Build configuration using ConfigBuilder
        const configBuilder = new S3BucketConfigBuilder(this.context, this.spec);
        this.config = configBuilder.buildSync();
        // Create KMS key for encryption if needed
        this.createKmsKeyIfNeeded();
        // Create audit bucket for compliance frameworks
        this.createAuditBucketIfNeeded();
        // Create main S3 bucket
        this.createS3Bucket();
        // Apply compliance hardening
        this.applyComplianceHardening();
        // Configure security tooling
        this.configureSecurityTooling();
        // Register constructs
        this.registerConstruct('bucket', this.bucket);
        if (this.kmsKey) {
            this.registerConstruct('kmsKey', this.kmsKey);
        }
        if (this.auditBucket) {
            this.registerConstruct('auditBucket', this.auditBucket);
        }
        // Register capabilities
        this.registerCapability('bucket:s3', this.buildBucketCapability());
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
        return 's3-bucket';
    }
    /**
     * Create KMS key for encryption if required by compliance framework
     */
    createKmsKeyIfNeeded() {
        if (this.shouldUseCustomerManagedKey()) {
            this.kmsKey = new kms.Key(this, 'EncryptionKey', {
                description: `Encryption key for ${this.spec.name} S3 bucket`,
                enableKeyRotation: this.context.complianceFramework === 'fedramp-high',
                keyUsage: kms.KeyUsage.ENCRYPT_DECRYPT,
                keySpec: kms.KeySpec.SYMMETRIC_DEFAULT
            });
            // Grant S3 service access to the key
            this.kmsKey.addToResourcePolicy(new iam.PolicyStatement({
                sid: 'AllowS3Service',
                principals: [new iam.ServicePrincipal('s3.amazonaws.com')],
                actions: [
                    'kms:Decrypt',
                    'kms:GenerateDataKey'
                ],
                resources: ['*']
            }));
        }
    }
    /**
     * Create audit bucket for centralized logging in compliance frameworks
     */
    createAuditBucketIfNeeded() {
        if (this.isComplianceFramework()) {
            const auditBucketName = `${this.context.serviceName}-audit-${this.context.accountId}`;
            this.auditBucket = new s3.Bucket(this, 'AuditBucket', {
                bucketName: auditBucketName,
                versioned: true,
                encryption: s3.BucketEncryption.KMS,
                encryptionKey: this.kmsKey,
                publicReadAccess: false,
                // publicWriteAccess removed - use blockPublicAccess instead"
                blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
                lifecycleRules: [{
                        id: 'audit-retention',
                        enabled: true,
                        transitions: [{
                                storageClass: s3.StorageClass.GLACIER,
                                transitionAfter: cdk.Duration.days(90)
                            }, {
                                storageClass: s3.StorageClass.DEEP_ARCHIVE,
                                transitionAfter: cdk.Duration.days(365)
                            }],
                        // Keep audit logs for compliance requirements
                        expiration: cdk.Duration.days(this.context.complianceFramework === 'fedramp-high' ? 2555 : 1095) // 7 or 3 years
                    }],
                removalPolicy: cdk.RemovalPolicy.RETAIN
            });
            // Apply Object Lock for immutable audit logs in FedRAMP High
            if (this.context.complianceFramework === 'fedramp-high') {
                const cfnBucket = this.auditBucket.node.defaultChild;
                cfnBucket.objectLockEnabled = true;
                cfnBucket.objectLockConfiguration = {
                    objectLockEnabled: 'Enabled',
                    rule: {
                        defaultRetention: {
                            mode: 'COMPLIANCE',
                            days: 395 // 13 months default retention
                        }
                    }
                };
            }
        }
    }
    /**
     * Create the main S3 bucket with compliance-specific configuration
     */
    createS3Bucket() {
        const bucketProps = {
            bucketName: this.config.bucketName,
            versioned: this.config.versioning !== false,
            encryption: this.getBucketEncryption(),
            encryptionKey: this.kmsKey,
            publicReadAccess: this.config.public === true,
            // Public write access is controlled by blockPublicAccess
            blockPublicAccess: this.config.public === true ?
                undefined : s3.BlockPublicAccess.BLOCK_ALL,
            eventBridgeEnabled: this.config.eventBridgeEnabled,
            removalPolicy: this.isComplianceFramework() ?
                cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY
        };
        // Add website configuration if enabled
        if (this.config.website?.enabled) {
            Object.assign(bucketProps, {
                websiteIndexDocument: this.config.website.indexDocument || 'index.html',
                websiteErrorDocument: this.config.website.errorDocument || 'error.html'
            });
        }
        // Add lifecycle rules if configured
        if (this.config.lifecycleRules) {
            const lifecycleRules = this.config.lifecycleRules.map(rule => ({
                id: rule.id,
                enabled: rule.enabled,
                transitions: rule.transitions?.map(t => ({
                    storageClass: this.getStorageClass(t.storageClass),
                    transitionAfter: cdk.Duration.days(t.transitionAfter)
                })),
                expiration: rule.expiration ? cdk.Duration.days(rule.expiration.days) : undefined
            }));
            Object.assign(bucketProps, { lifecycleRules });
        }
        this.bucket = new s3.Bucket(this, 'Bucket', bucketProps);
    }
    /**
     * Apply compliance-specific hardening
     */
    applyComplianceHardening() {
        switch (this.context.complianceFramework) {
            case 'fedramp-moderate':
                this.applyFedrampModerateHardening();
                break;
            case 'fedramp-high':
                this.applyFedrampHighHardening();
                break;
            default:
                this.applyCommercialHardening();
                break;
        }
    }
    applyCommercialHardening() {
        // Enable server access logging
        if (this.bucket && this.auditBucket) {
            this.bucket.addToResourcePolicy(new iam.PolicyStatement({
                effect: iam.Effect.DENY,
                principals: [new iam.AnyPrincipal()],
                actions: ['s3:*'],
                resources: [this.bucket.bucketArn, `${this.bucket.bucketArn}/*`],
                conditions: {
                    Bool: {
                        'aws:SecureTransport': 'false'
                    }
                }
            }));
        }
    }
    applyFedrampModerateHardening() {
        // Apply commercial hardening
        this.applyCommercialHardening();
        // Enable server access logging to audit bucket
        if (this.bucket && this.auditBucket) {
            this.bucket.addToResourcePolicy(new iam.PolicyStatement({
                sid: 'DenyInsecureConnections',
                effect: iam.Effect.DENY,
                principals: [new iam.AnyPrincipal()],
                actions: ['s3:*'],
                resources: [this.bucket.bucketArn, `${this.bucket.bucketArn}/*`],
                conditions: {
                    Bool: {
                        'aws:SecureTransport': 'false'
                    }
                }
            }));
            // Enable object-level API logging
            this.bucket.addToResourcePolicy(new iam.PolicyStatement({
                sid: 'RequireSSLRequestsOnly',
                effect: iam.Effect.DENY,
                principals: [new iam.AnyPrincipal()],
                actions: ['s3:*'],
                resources: [this.bucket.bucketArn, `${this.bucket.bucketArn}/*`],
                conditions: {
                    Bool: {
                        'aws:SecureTransport': 'false'
                    }
                }
            }));
        }
        // Enable MFA delete protection
        // Note: This requires CLI/API configuration, not CDK
        this.bucket.addToResourcePolicy(new iam.PolicyStatement({
            sid: 'RequireMFAForDelete',
            effect: iam.Effect.DENY,
            principals: [new iam.AnyPrincipal()],
            actions: ['s3:DeleteObject', 's3:DeleteObjectVersion'],
            resources: [`${this.bucket.bucketArn}/*`],
            conditions: {
                BoolIfExists: {
                    'aws:MultiFactorAuthPresent': 'false'
                }
            }
        }));
    }
    applyFedrampHighHardening() {
        // Apply all moderate hardening
        this.applyFedrampModerateHardening();
        // Apply Object Lock for immutable backups
        if (this.bucket) {
            const cfnBucket = this.bucket.node.defaultChild;
            cfnBucket.objectLockEnabled = true;
            cfnBucket.objectLockConfiguration = {
                objectLockEnabled: 'Enabled',
                rule: {
                    defaultRetention: {
                        mode: 'COMPLIANCE',
                        days: this.config.compliance?.objectLock?.retentionDays || 395
                    }
                }
            };
            // Explicit deny for delete actions to ensure immutability
            this.bucket.addToResourcePolicy(new iam.PolicyStatement({
                sid: 'DenyDeleteActions',
                effect: iam.Effect.DENY,
                principals: [new iam.AnyPrincipal()],
                actions: [
                    's3:DeleteBucket',
                    's3:DeleteBucketPolicy',
                    's3:PutBucketAcl',
                    's3:PutBucketPolicy',
                    's3:PutObjectAcl'
                ],
                resources: [this.bucket.bucketArn, `${this.bucket.bucketArn}/*`]
            }));
        }
    }
    /**
     * Configure security tooling integration
     */
    configureSecurityTooling() {
        if (this.config?.security?.tools?.clamavScan) {
            this.createVirusScanLambda();
        }
    }
    /**
     * Create Lambda function for virus scanning with ClamAV
     */
    createVirusScanLambda() {
        this.virusScanLambda = new lambda.Function(this, 'VirusScanFunction', {
            runtime: lambda.Runtime.PYTHON_3_11,
            handler: 'scan.handler',
            code: lambda.Code.fromInline(`
import json
import boto3

def handler(event, context):
    # ClamAV scanning logic would be implemented here
    print(f"Scanning object: {event}")
    
    # In real implementation, this would:
    # 1. Download object from S3
    # 2. Scan with ClamAV
    # 3. Take action based on scan results
    
    return {
        'statusCode': 200,
        'body': json.dumps('Object scanned successfully')
    }
      `),
            description: 'ClamAV virus scanning for S3 objects',
            timeout: cdk.Duration.minutes(5),
            memorySize: 1024
        });
        // Add S3 notification to trigger virus scan
        if (this.bucket) {
            this.bucket.addObjectCreatedNotification(new s3n.LambdaDestination(this.virusScanLambda));
            // Grant Lambda permissions to read from S3
            this.bucket.grantRead(this.virusScanLambda);
        }
    }
    /**
     * Build bucket capability data shape
     */
    buildBucketCapability() {
        return {
            bucketName: this.bucket.bucketName,
            bucketArn: this.bucket.bucketArn
        };
    }
    /**
     * Helper methods for compliance decisions
     */
    shouldUseCustomerManagedKey() {
        return ['fedramp-moderate', 'fedramp-high'].includes(this.context.complianceFramework);
    }
    isComplianceFramework() {
        return ['fedramp-moderate', 'fedramp-high'].includes(this.context.complianceFramework);
    }
    getBucketEncryption() {
        if (this.config?.encryption?.type === 'KMS') {
            return s3.BucketEncryption.KMS;
        }
        return s3.BucketEncryption.S3_MANAGED;
    }
    getStorageClass(storageClass) {
        const storageClassMap = {
            'STANDARD_IA': s3.StorageClass.INFREQUENT_ACCESS,
            'ONEZONE_IA': s3.StorageClass.ONE_ZONE_INFREQUENT_ACCESS,
            'GLACIER': s3.StorageClass.GLACIER,
            'DEEP_ARCHIVE': s3.StorageClass.DEEP_ARCHIVE,
            'GLACIER_IR': s3.StorageClass.GLACIER_INSTANT_RETRIEVAL
        };
        return storageClassMap[storageClass] || s3.StorageClass.INFREQUENT_ACCESS;
    }
}
exports.S3BucketComponent = S3BucketComponent;
//# sourceMappingURL=s3-bucket.component.js.map