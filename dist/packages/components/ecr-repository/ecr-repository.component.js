"use strict";
/**
 * ECR Repository Component
 *
 * AWS Elastic Container Registry for secure container image storage and management.
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
exports.EcrRepositoryComponent = exports.EcrRepositoryConfigBuilder = exports.ECR_REPOSITORY_CONFIG_SCHEMA = void 0;
const ecr = __importStar(require("aws-cdk-lib/aws-ecr"));
const iam = __importStar(require("aws-cdk-lib/aws-iam"));
const logs = __importStar(require("aws-cdk-lib/aws-logs"));
const cloudwatch = __importStar(require("aws-cdk-lib/aws-cloudwatch"));
const cdk = __importStar(require("aws-cdk-lib"));
const contracts_1 = require("@platform/contracts");
/**
 * Configuration schema for ECR Repository component
 */
exports.ECR_REPOSITORY_CONFIG_SCHEMA = {
    type: 'object',
    title: 'ECR Repository Configuration',
    description: 'Configuration for creating an ECR repository',
    required: ['repositoryName'],
    properties: {
        repositoryName: {
            type: 'string',
            description: 'Name of the repository',
            pattern: '^[a-z0-9]([._-]?[a-z0-9])*$',
            minLength: 2,
            maxLength: 256
        },
        imageScanningConfiguration: {
            type: 'object',
            description: 'Image scanning configuration',
            properties: {
                scanOnPush: {
                    type: 'boolean',
                    description: 'Enable automatic image scanning on push',
                    default: true
                }
            },
            additionalProperties: false,
            default: { scanOnPush: true }
        },
        imageTagMutability: {
            type: 'string',
            description: 'Image tag mutability setting',
            enum: ['MUTABLE', 'IMMUTABLE'],
            default: 'MUTABLE'
        },
        lifecyclePolicy: {
            type: 'object',
            description: 'Lifecycle management policy',
            properties: {
                maxImageCount: {
                    type: 'number',
                    description: 'Maximum number of images to keep',
                    minimum: 1,
                    maximum: 1000,
                    default: 100
                },
                maxImageAge: {
                    type: 'number',
                    description: 'Maximum image age in days',
                    minimum: 1,
                    maximum: 3650,
                    default: 365
                },
                untaggedImageRetentionDays: {
                    type: 'number',
                    description: 'Retention period for untagged images in days',
                    minimum: 1,
                    maximum: 365,
                    default: 7
                }
            },
            additionalProperties: false
        },
        repositoryPolicy: {
            type: 'object',
            description: 'IAM policy document for repository access'
        },
        encryption: {
            type: 'object',
            description: 'Encryption configuration',
            properties: {
                encryptionType: {
                    type: 'string',
                    description: 'Encryption type',
                    enum: ['AES256', 'KMS'],
                    default: 'AES256'
                },
                kmsKeyArn: {
                    type: 'string',
                    description: 'KMS key ARN for KMS encryption'
                }
            },
            additionalProperties: false,
            default: { encryptionType: 'AES256' }
        },
        tags: {
            type: 'object',
            description: 'Tags for the repository',
            additionalProperties: {
                type: 'string'
            },
            default: {}
        }
    },
    additionalProperties: false,
    defaults: {
        imageScanningConfiguration: { scanOnPush: true },
        imageTagMutability: 'MUTABLE',
        encryption: { encryptionType: 'AES256' },
        tags: {}
    }
};
/**
 * Configuration builder for ECR Repository component
 */
class EcrRepositoryConfigBuilder {
    context;
    spec;
    constructor(context, spec) {
        this.context = context;
        this.spec = spec;
    }
    async build() {
        return this.buildSync();
    }
    buildSync() {
        const platformDefaults = this.getPlatformDefaults();
        const complianceDefaults = this.getComplianceFrameworkDefaults();
        const userConfig = this.spec.config || {};
        const mergedConfig = this.mergeConfigs(this.mergeConfigs(platformDefaults, complianceDefaults), userConfig);
        return mergedConfig;
    }
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
    getPlatformDefaults() {
        return {
            imageScanningConfiguration: {
                scanOnPush: this.getDefaultScanOnPush()
            },
            imageTagMutability: this.getDefaultMutability(),
            encryption: {
                encryptionType: this.getDefaultEncryptionType()
            },
            lifecyclePolicy: this.getDefaultLifecyclePolicy(),
            tags: {
                'service': this.context.serviceName,
                'environment': this.context.environment
            }
        };
    }
    getComplianceFrameworkDefaults() {
        const framework = this.context.complianceFramework;
        switch (framework) {
            case 'fedramp-moderate':
                return {
                    imageScanningConfiguration: {
                        scanOnPush: true // Mandatory for compliance
                    },
                    imageTagMutability: 'IMMUTABLE', // Required for compliance
                    encryption: {
                        encryptionType: 'KMS' // Customer-managed encryption required
                    },
                    lifecyclePolicy: {
                        maxImageCount: 50, // Smaller retention for compliance
                        maxImageAge: 180, // 6 months retention
                        untaggedImageRetentionDays: 3 // Quick cleanup
                    },
                    tags: {
                        'compliance-framework': 'fedramp-moderate',
                        'image-scanning': 'enabled',
                        'data-classification': 'controlled'
                    }
                };
            case 'fedramp-high':
                return {
                    imageScanningConfiguration: {
                        scanOnPush: true // Mandatory
                    },
                    imageTagMutability: 'IMMUTABLE', // Mandatory for high security
                    encryption: {
                        encryptionType: 'KMS' // Required customer-managed encryption
                    },
                    lifecyclePolicy: {
                        maxImageCount: 25, // Strict retention for high security
                        maxImageAge: 90, // 3 months retention
                        untaggedImageRetentionDays: 1 // Immediate cleanup
                    },
                    tags: {
                        'compliance-framework': 'fedramp-high',
                        'image-scanning': 'enabled',
                        'data-classification': 'confidential',
                        'security-level': 'high'
                    }
                };
            default: // commercial
                return {
                    imageTagMutability: 'MUTABLE',
                    encryption: {
                        encryptionType: 'AES256' // Standard encryption for commercial
                    }
                };
        }
    }
    getDefaultScanOnPush() {
        return ['fedramp-moderate', 'fedramp-high'].includes(this.context.complianceFramework);
    }
    getDefaultMutability() {
        return ['fedramp-moderate', 'fedramp-high'].includes(this.context.complianceFramework)
            ? 'IMMUTABLE' : 'MUTABLE';
    }
    getDefaultEncryptionType() {
        return ['fedramp-moderate', 'fedramp-high'].includes(this.context.complianceFramework)
            ? 'KMS' : 'AES256';
    }
    getDefaultLifecyclePolicy() {
        switch (this.context.complianceFramework) {
            case 'fedramp-high':
                return {
                    maxImageCount: 25,
                    maxImageAge: 90,
                    untaggedImageRetentionDays: 1
                };
            case 'fedramp-moderate':
                return {
                    maxImageCount: 50,
                    maxImageAge: 180,
                    untaggedImageRetentionDays: 3
                };
            default:
                return {
                    maxImageCount: 100,
                    maxImageAge: 365,
                    untaggedImageRetentionDays: 7
                };
        }
    }
}
exports.EcrRepositoryConfigBuilder = EcrRepositoryConfigBuilder;
/**
 * ECR Repository Component implementing Component API Contract v1.0
 */
class EcrRepositoryComponent extends contracts_1.Component {
    repository;
    config;
    constructor(scope, id, context, spec) {
        super(scope, id, context, spec);
    }
    synth() {
        this.logComponentEvent('synthesis_start', 'Starting ECR Repository component synthesis', {
            repositoryName: this.spec.config?.repositoryName,
            scanOnPush: this.spec.config?.imageScanningConfiguration?.scanOnPush
        });
        const startTime = Date.now();
        try {
            const configBuilder = new EcrRepositoryConfigBuilder(this.context, this.spec);
            this.config = configBuilder.buildSync();
            this.logComponentEvent('config_built', 'ECR Repository configuration built successfully', {
                repositoryName: this.config.repositoryName,
                encryptionType: this.config.encryption?.encryptionType,
                imageTagMutability: this.config.imageTagMutability
            });
            this.createRepository();
            this.applyComplianceHardening();
            this.configureObservabilityForRepository();
            this.registerConstruct('repository', this.repository);
            this.registerCapability('container:ecr', this.buildRepositoryCapability());
            const duration = Date.now() - startTime;
            this.logPerformanceMetric('component_synthesis', duration, {
                resourcesCreated: Object.keys(this.capabilities).length
            });
            this.logComponentEvent('synthesis_complete', 'ECR Repository component synthesis completed successfully', {
                repositoryCreated: 1,
                scanningEnabled: this.config.imageScanningConfiguration?.scanOnPush,
                encryptionType: this.config.encryption?.encryptionType
            });
        }
        catch (error) {
            this.logError(error, 'component synthesis', {
                componentType: 'ecr-repository',
                stage: 'synthesis'
            });
            throw error;
        }
    }
    getCapabilities() {
        this.validateSynthesized();
        return this.capabilities;
    }
    getType() {
        return 'ecr-repository';
    }
    createRepository() {
        const repositoryProps = {
            repositoryName: this.config.repositoryName,
            imageScanOnPush: this.config.imageScanningConfiguration?.scanOnPush,
            imageTagMutability: this.mapImageTagMutability(this.config.imageTagMutability),
            lifecycleRules: this.buildLifecycleRules(),
            repositoryPolicyDocument: this.config.repositoryPolicy ?
                iam.PolicyDocument.fromJson(this.config.repositoryPolicy) : undefined,
            encryption: this.buildEncryptionConfiguration(),
            removalPolicy: this.getRemovalPolicy()
        };
        this.repository = new ecr.Repository(this, 'Repository', repositoryProps);
        this.applyStandardTags(this.repository, {
            'repository-name': this.config.repositoryName,
            'image-scanning': (this.config.imageScanningConfiguration?.scanOnPush || false).toString(),
            'tag-mutability': this.config.imageTagMutability,
            'encryption-type': this.config.encryption?.encryptionType || 'AES256'
        });
        if (this.config.tags) {
            Object.entries(this.config.tags).forEach(([key, value]) => {
                cdk.Tags.of(this.repository).add(key, value);
            });
        }
        this.logResourceCreation('ecr-repository', this.config.repositoryName, {
            repositoryName: this.config.repositoryName,
            scanOnPush: this.config.imageScanningConfiguration?.scanOnPush,
            encryptionType: this.config.encryption?.encryptionType,
            tagMutability: this.config.imageTagMutability
        });
    }
    mapImageTagMutability(mutability) {
        switch (mutability) {
            case 'IMMUTABLE':
                return ecr.TagMutability.IMMUTABLE;
            default:
                return ecr.TagMutability.MUTABLE;
        }
    }
    buildEncryptionConfiguration() {
        if (this.config.encryption?.encryptionType === 'KMS') {
            return ecr.RepositoryEncryption.kms(this.config.encryption.kmsKeyArn ?
                kms.Key.fromKeyArn(this, 'EncryptionKey', this.config.encryption.kmsKeyArn) :
                undefined);
        }
        return ecr.RepositoryEncryption.aes256();
    }
    buildLifecycleRules() {
        if (!this.config.lifecyclePolicy) {
            return undefined;
        }
        const rules = [];
        // Rule for tagged images by count
        if (this.config.lifecyclePolicy.maxImageCount) {
            rules.push({
                description: 'Keep only the most recent tagged images',
                tagStatus: ecr.TagStatus.TAGGED,
                selection: ecr.LifecycleSelection.maxImageCount(this.config.lifecyclePolicy.maxImageCount)
            });
        }
        // Rule for tagged images by age
        if (this.config.lifecyclePolicy.maxImageAge) {
            rules.push({
                description: 'Remove old tagged images',
                tagStatus: ecr.TagStatus.TAGGED,
                selection: ecr.LifecycleSelection.maxImageAge(cdk.Duration.days(this.config.lifecyclePolicy.maxImageAge))
            });
        }
        // Rule for untagged images
        if (this.config.lifecyclePolicy.untaggedImageRetentionDays) {
            rules.push({
                description: 'Remove untagged images',
                tagStatus: ecr.TagStatus.UNTAGGED,
                selection: ecr.LifecycleSelection.maxImageAge(cdk.Duration.days(this.config.lifecyclePolicy.untaggedImageRetentionDays))
            });
        }
        return rules.length > 0 ? rules : undefined;
    }
    getRemovalPolicy() {
        return ['fedramp-moderate', 'fedramp-high'].includes(this.context.complianceFramework)
            ? cdk.RemovalPolicy.RETAIN
            : cdk.RemovalPolicy.DESTROY;
    }
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
        // Basic access logging
        if (this.repository) {
            const accessLogGroup = new logs.LogGroup(this, 'AccessLogGroup', {
                logGroupName: `/aws/ecr/${this.config.repositoryName}`,
                retention: logs.RetentionDays.THREE_MONTHS,
                removalPolicy: cdk.RemovalPolicy.DESTROY
            });
            this.applyStandardTags(accessLogGroup, {
                'log-type': 'repository-access',
                'retention': '3-months'
            });
        }
    }
    applyFedrampModerateHardening() {
        this.applyCommercialHardening();
        if (this.repository) {
            // Enhanced compliance logging
            const complianceLogGroup = new logs.LogGroup(this, 'ComplianceLogGroup', {
                logGroupName: `/aws/ecr/${this.config.repositoryName}/compliance`,
                retention: logs.RetentionDays.ONE_YEAR,
                removalPolicy: cdk.RemovalPolicy.RETAIN
            });
            this.applyStandardTags(complianceLogGroup, {
                'log-type': 'compliance',
                'retention': '1-year',
                'compliance': 'fedramp-moderate'
            });
            // Repository policy for compliance
            this.repository.addToResourcePolicy(new iam.PolicyStatement({
                sid: 'DenyInsecureConnections',
                effect: iam.Effect.DENY,
                principals: [new iam.AnyPrincipal()],
                actions: ['ecr:*'],
                resources: ['*'],
                conditions: {
                    Bool: {
                        'aws:SecureTransport': 'false'
                    }
                }
            }));
        }
    }
    applyFedrampHighHardening() {
        this.applyFedrampModerateHardening();
        if (this.repository) {
            // Extended audit logging
            const auditLogGroup = new logs.LogGroup(this, 'AuditLogGroup', {
                logGroupName: `/aws/ecr/${this.config.repositoryName}/audit`,
                retention: logs.RetentionDays.TEN_YEARS,
                removalPolicy: cdk.RemovalPolicy.RETAIN
            });
            this.applyStandardTags(auditLogGroup, {
                'log-type': 'audit',
                'retention': '10-years',
                'compliance': 'fedramp-high'
            });
            // Additional security restrictions
            this.repository.addToResourcePolicy(new iam.PolicyStatement({
                sid: 'RequireSignedImages',
                effect: iam.Effect.DENY,
                principals: [new iam.AnyPrincipal()],
                actions: [
                    'ecr:PutImage'
                ],
                resources: ['*'],
                conditions: {
                    StringNotEquals: {
                        'ecr:image-signature-verification': 'true'
                    }
                }
            }));
        }
    }
    buildRepositoryCapability() {
        return {
            repositoryArn: this.repository.repositoryArn,
            repositoryName: this.config.repositoryName,
            repositoryUri: this.repository.repositoryUri
        };
    }
    configureObservabilityForRepository() {
        if (this.context.complianceFramework === 'commercial') {
            return;
        }
        const repositoryName = this.config.repositoryName;
        // 1. Image Push Rate Alarm
        const imagePushAlarm = new cloudwatch.Alarm(this, 'ImagePushRateAlarm', {
            alarmName: `${this.context.serviceName}-${this.spec.name}-high-push-rate`,
            alarmDescription: 'ECR repository high image push rate alarm',
            metric: new cloudwatch.Metric({
                namespace: 'AWS/ECR',
                metricName: 'NumberOfImagesPushed',
                dimensionsMap: {
                    RepositoryName: repositoryName
                },
                statistic: 'Sum',
                period: cdk.Duration.minutes(15)
            }),
            threshold: 50, // High push rate threshold
            evaluationPeriods: 2,
            comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
            treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING
        });
        this.applyStandardTags(imagePushAlarm, {
            'alarm-type': 'high-push-rate',
            'metric-type': 'usage',
            'threshold': '50'
        });
        // 2. Repository Size Alarm
        const repositorySizeAlarm = new cloudwatch.Alarm(this, 'RepositorySizeAlarm', {
            alarmName: `${this.context.serviceName}-${this.spec.name}-repository-size`,
            alarmDescription: 'ECR repository size threshold alarm',
            metric: new cloudwatch.Metric({
                namespace: 'AWS/ECR',
                metricName: 'RepositorySizeInBytes',
                dimensionsMap: {
                    RepositoryName: repositoryName
                },
                statistic: 'Maximum',
                period: cdk.Duration.hours(1)
            }),
            threshold: 10737418240, // 10GB threshold
            evaluationPeriods: 1,
            comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
            treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING
        });
        this.applyStandardTags(repositorySizeAlarm, {
            'alarm-type': 'repository-size',
            'metric-type': 'capacity',
            'threshold': '10GB'
        });
        this.logComponentEvent('observability_configured', 'OpenTelemetry observability standard applied to ECR Repository', {
            alarmsCreated: 2,
            repositoryName: repositoryName,
            monitoringEnabled: true
        });
    }
}
exports.EcrRepositoryComponent = EcrRepositoryComponent;
