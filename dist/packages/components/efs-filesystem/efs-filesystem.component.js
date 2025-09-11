"use strict";
/**
 * EFS Filesystem Component
 *
 * AWS Elastic File System for scalable, shared storage across multiple instances.
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
exports.EfsFilesystemComponent = exports.EfsFilesystemConfigBuilder = exports.EFS_FILESYSTEM_CONFIG_SCHEMA = void 0;
const efs = __importStar(require("aws-cdk-lib/aws-efs"));
const ec2 = __importStar(require("aws-cdk-lib/aws-ec2"));
const kms = __importStar(require("aws-cdk-lib/aws-kms"));
const logs = __importStar(require("aws-cdk-lib/aws-logs"));
const cloudwatch = __importStar(require("aws-cdk-lib/aws-cloudwatch"));
const cdk = __importStar(require("aws-cdk-lib"));
const contracts_1 = require("@platform/contracts");
/**
 * Configuration schema for EFS Filesystem component
 */
exports.EFS_FILESYSTEM_CONFIG_SCHEMA = {
    type: 'object',
    title: 'EFS Filesystem Configuration',
    description: 'Configuration for creating an EFS filesystem',
    properties: {
        filesystemName: {
            type: 'string',
            description: 'Name of the filesystem (will be auto-generated if not provided)',
            maxLength: 256
        },
        vpc: {
            type: 'object',
            description: 'VPC configuration',
            properties: {
                vpcId: {
                    type: 'string',
                    description: 'VPC ID where filesystem will be created'
                },
                subnetIds: {
                    type: 'array',
                    description: 'Subnet IDs for mount targets',
                    items: {
                        type: 'string'
                    }
                }
            },
            additionalProperties: false
        },
        performanceMode: {
            type: 'string',
            description: 'Performance mode for the filesystem',
            enum: ['generalPurpose', 'maxIO'],
            default: 'generalPurpose'
        },
        throughputMode: {
            type: 'string',
            description: 'Throughput mode for the filesystem',
            enum: ['provisioned', 'bursting'],
            default: 'bursting'
        },
        provisionedThroughputPerSecond: {
            type: 'number',
            description: 'Provisioned throughput in MiB/s (only for provisioned mode)',
            minimum: 1,
            maximum: 1024
        },
        encryption: {
            type: 'object',
            description: 'Encryption configuration',
            properties: {
                encrypted: {
                    type: 'boolean',
                    description: 'Encrypt data at rest',
                    default: true
                },
                kmsKeyArn: {
                    type: 'string',
                    description: 'KMS key ARN for encryption'
                },
                encryptInTransit: {
                    type: 'boolean',
                    description: 'Encrypt data in transit',
                    default: true
                }
            },
            additionalProperties: false,
            default: { encrypted: true, encryptInTransit: true }
        },
        lifecyclePolicy: {
            type: 'object',
            description: 'Lifecycle management policy',
            properties: {
                transitionToIA: {
                    type: 'string',
                    description: 'When to transition to Infrequent Access',
                    enum: ['AFTER_7_DAYS', 'AFTER_14_DAYS', 'AFTER_30_DAYS', 'AFTER_60_DAYS', 'AFTER_90_DAYS']
                },
                transitionToPrimaryStorageClass: {
                    type: 'string',
                    description: 'When to transition back to primary storage',
                    enum: ['AFTER_1_ACCESS']
                }
            },
            additionalProperties: false
        },
        enableAutomaticBackups: {
            type: 'boolean',
            description: 'Enable automatic backups',
            default: false
        },
        filesystemPolicy: {
            type: 'object',
            description: 'IAM policy document for filesystem access'
        },
        tags: {
            type: 'object',
            description: 'Tags for the filesystem',
            additionalProperties: {
                type: 'string'
            },
            default: {}
        }
    },
    additionalProperties: false,
    defaults: {
        performanceMode: 'generalPurpose',
        throughputMode: 'bursting',
        encryption: { encrypted: true, encryptInTransit: true },
        enableAutomaticBackups: false,
        tags: {}
    }
};
/**
 * Configuration builder for EFS Filesystem component
 */
class EfsFilesystemConfigBuilder {
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
            performanceMode: 'generalPurpose',
            throughputMode: 'bursting',
            encryption: {
                encrypted: true,
                encryptInTransit: this.getDefaultEncryptInTransit()
            },
            enableAutomaticBackups: this.getDefaultBackupPolicy(),
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
                    performanceMode: 'generalPurpose', // Consistent performance for compliance
                    encryption: {
                        encrypted: true, // Mandatory encryption
                        encryptInTransit: true
                    },
                    enableAutomaticBackups: true, // Required for compliance
                    lifecyclePolicy: {
                        transitionToIA: 'AFTER_30_DAYS' // Cost optimization
                    },
                    tags: {
                        'compliance-framework': 'fedramp-moderate',
                        'data-classification': 'controlled',
                        'backup-required': 'true'
                    }
                };
            case 'fedramp-high':
                return {
                    performanceMode: 'generalPurpose',
                    encryption: {
                        encrypted: true, // Mandatory
                        encryptInTransit: true // Required for high security
                    },
                    enableAutomaticBackups: true, // Mandatory
                    lifecyclePolicy: {
                        transitionToIA: 'AFTER_7_DAYS' // Frequent archival for security
                    },
                    tags: {
                        'compliance-framework': 'fedramp-high',
                        'data-classification': 'confidential',
                        'backup-required': 'true',
                        'security-level': 'high'
                    }
                };
            default: // commercial
                return {
                    encryption: {
                        encrypted: true,
                        encryptInTransit: false // Optional for commercial
                    }
                };
        }
    }
    getDefaultEncryptInTransit() {
        return ['fedramp-moderate', 'fedramp-high'].includes(this.context.complianceFramework);
    }
    getDefaultBackupPolicy() {
        return ['fedramp-moderate', 'fedramp-high'].includes(this.context.complianceFramework);
    }
}
exports.EfsFilesystemConfigBuilder = EfsFilesystemConfigBuilder;
/**
 * EFS Filesystem Component implementing Component API Contract v1.0
 */
class EfsFilesystemComponent extends contracts_1.Component {
    filesystem;
    kmsKey;
    vpc;
    config;
    constructor(scope, id, context, spec) {
        super(scope, id, context, spec);
    }
    synth() {
        this.logComponentEvent('synthesis_start', 'Starting EFS Filesystem component synthesis', {
            filesystemName: this.spec.config?.filesystemName,
            performanceMode: this.spec.config?.performanceMode
        });
        const startTime = Date.now();
        try {
            const configBuilder = new EfsFilesystemConfigBuilder(this.context, this.spec);
            this.config = configBuilder.buildSync();
            this.logComponentEvent('config_built', 'EFS Filesystem configuration built successfully', {
                performanceMode: this.config.performanceMode,
                throughputMode: this.config.throughputMode,
                encrypted: this.config.encryption?.encrypted
            });
            this.lookupVpcIfNeeded();
            this.createKmsKeyIfNeeded();
            this.createFilesystem();
            this.applyComplianceHardening();
            this.configureObservabilityForFilesystem();
            this.registerConstruct('filesystem', this.filesystem);
            if (this.kmsKey) {
                this.registerConstruct('kmsKey', this.kmsKey);
            }
            if (this.vpc) {
                this.registerConstruct('vpc', this.vpc);
            }
            this.registerCapability('storage:efs', this.buildFilesystemCapability());
            const duration = Date.now() - startTime;
            this.logPerformanceMetric('component_synthesis', duration, {
                resourcesCreated: Object.keys(this.capabilities).length
            });
            this.logComponentEvent('synthesis_complete', 'EFS Filesystem component synthesis completed successfully', {
                filesystemCreated: 1,
                encrypted: this.config.encryption?.encrypted,
                backupsEnabled: this.config.enableAutomaticBackups
            });
        }
        catch (error) {
            this.logError(error, 'component synthesis', {
                componentType: 'efs-filesystem',
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
        return 'efs-filesystem';
    }
    lookupVpcIfNeeded() {
        if (this.config.vpc?.vpcId) {
            this.vpc = ec2.Vpc.fromLookup(this, 'Vpc', {
                vpcId: this.config.vpc.vpcId
            });
        }
    }
    createKmsKeyIfNeeded() {
        if (this.config.encryption?.encrypted && this.shouldUseCustomerManagedKey()) {
            this.kmsKey = new kms.Key(this, 'EncryptionKey', {
                description: `Encryption key for ${this.spec.name} EFS filesystem`,
                enableKeyRotation: this.context.complianceFramework === 'fedramp-high',
                keyUsage: kms.KeyUsage.ENCRYPT_DECRYPT,
                keySpec: kms.KeySpec.SYMMETRIC_DEFAULT
            });
            this.applyStandardTags(this.kmsKey, {
                'encryption-type': 'customer-managed',
                'key-rotation': (this.context.complianceFramework === 'fedramp-high').toString(),
                'resource-type': 'efs-encryption'
            });
        }
    }
    createFilesystem() {
        const filesystemProps = {
            fileSystemName: this.buildFilesystemName(),
            vpc: this.vpc,
            performanceMode: this.mapPerformanceMode(this.config.performanceMode),
            throughputMode: this.mapThroughputMode(this.config.throughputMode),
            encrypted: this.config.encryption?.encrypted,
            kmsKey: this.kmsKey || (this.config.encryption?.kmsKeyArn ?
                kms.Key.fromKeyArn(this, 'ExistingKey', this.config.encryption.kmsKeyArn) : undefined),
            lifecyclePolicy: this.buildLifecyclePolicy(),
            enableBackupPolicy: this.config.enableAutomaticBackups,
            filesystemPolicy: this.config.filesystemPolicy ?
                efs.PolicyDocument.fromJson(this.config.filesystemPolicy) : undefined
        };
        if (this.config.throughputMode === 'provisioned' && this.config.provisionedThroughputPerSecond) {
            Object.assign(filesystemProps, {
                provisionedThroughputPerSecond: cdk.Size.mebibytes(this.config.provisionedThroughputPerSecond)
            });
        }
        this.filesystem = new efs.FileSystem(this, 'Filesystem', filesystemProps);
        this.applyStandardTags(this.filesystem, {
            'filesystem-type': 'efs',
            'performance-mode': this.config.performanceMode,
            'throughput-mode': this.config.throughputMode,
            'encrypted': this.config.encryption?.encrypted.toString(),
            'backups-enabled': this.config.enableAutomaticBackups.toString()
        });
        if (this.config.tags) {
            Object.entries(this.config.tags).forEach(([key, value]) => {
                cdk.Tags.of(this.filesystem).add(key, value);
            });
        }
        this.logResourceCreation('efs-filesystem', this.buildFilesystemName(), {
            performanceMode: this.config.performanceMode,
            throughputMode: this.config.throughputMode,
            encrypted: this.config.encryption?.encrypted,
            backupsEnabled: this.config.enableAutomaticBackups
        });
    }
    mapPerformanceMode(mode) {
        switch (mode) {
            case 'maxIO':
                return efs.PerformanceMode.MAX_IO;
            default:
                return efs.PerformanceMode.GENERAL_PURPOSE;
        }
    }
    mapThroughputMode(mode) {
        switch (mode) {
            case 'provisioned':
                return efs.ThroughputMode.PROVISIONED;
            default:
                return efs.ThroughputMode.BURSTING;
        }
    }
    buildLifecyclePolicy() {
        if (!this.config.lifecyclePolicy?.transitionToIA) {
            return undefined;
        }
        switch (this.config.lifecyclePolicy.transitionToIA) {
            case 'AFTER_7_DAYS':
                return efs.LifecyclePolicy.AFTER_7_DAYS;
            case 'AFTER_14_DAYS':
                return efs.LifecyclePolicy.AFTER_14_DAYS;
            case 'AFTER_30_DAYS':
                return efs.LifecyclePolicy.AFTER_30_DAYS;
            case 'AFTER_60_DAYS':
                return efs.LifecyclePolicy.AFTER_60_DAYS;
            case 'AFTER_90_DAYS':
                return efs.LifecyclePolicy.AFTER_90_DAYS;
            default:
                return undefined;
        }
    }
    buildFilesystemName() {
        if (this.config.filesystemName) {
            return this.config.filesystemName;
        }
        return `${this.context.serviceName}-${this.spec.name}`;
    }
    shouldUseCustomerManagedKey() {
        return ['fedramp-moderate', 'fedramp-high'].includes(this.context.complianceFramework) ||
            !!this.config.encryption?.kmsKeyArn;
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
        if (this.filesystem) {
            const accessLogGroup = new logs.LogGroup(this, 'AccessLogGroup', {
                logGroupName: `/aws/efs/${this.buildFilesystemName()}`,
                retention: logs.RetentionDays.THREE_MONTHS,
                removalPolicy: cdk.RemovalPolicy.DESTROY
            });
            this.applyStandardTags(accessLogGroup, {
                'log-type': 'filesystem-access',
                'retention': '3-months'
            });
        }
    }
    applyFedrampModerateHardening() {
        this.applyCommercialHardening();
        if (this.filesystem) {
            const complianceLogGroup = new logs.LogGroup(this, 'ComplianceLogGroup', {
                logGroupName: `/aws/efs/${this.buildFilesystemName()}/compliance`,
                retention: logs.RetentionDays.ONE_YEAR,
                removalPolicy: cdk.RemovalPolicy.RETAIN
            });
            this.applyStandardTags(complianceLogGroup, {
                'log-type': 'compliance',
                'retention': '1-year',
                'compliance': 'fedramp-moderate'
            });
        }
    }
    applyFedrampHighHardening() {
        this.applyFedrampModerateHardening();
        if (this.filesystem) {
            const auditLogGroup = new logs.LogGroup(this, 'AuditLogGroup', {
                logGroupName: `/aws/efs/${this.buildFilesystemName()}/audit`,
                retention: logs.RetentionDays.TEN_YEARS,
                removalPolicy: cdk.RemovalPolicy.RETAIN
            });
            this.applyStandardTags(auditLogGroup, {
                'log-type': 'audit',
                'retention': '10-years',
                'compliance': 'fedramp-high'
            });
        }
    }
    buildFilesystemCapability() {
        return {
            filesystemId: this.filesystem.fileSystemId,
            filesystemArn: this.filesystem.fileSystemArn
        };
    }
    configureObservabilityForFilesystem() {
        if (this.context.complianceFramework === 'commercial') {
            return;
        }
        const filesystemName = this.buildFilesystemName();
        // 1. Storage Utilization Alarm
        const storageUtilizationAlarm = new cloudwatch.Alarm(this, 'StorageUtilizationAlarm', {
            alarmName: `${this.context.serviceName}-${this.spec.name}-storage-utilization`,
            alarmDescription: 'EFS filesystem storage utilization alarm',
            metric: new cloudwatch.Metric({
                namespace: 'AWS/EFS',
                metricName: 'StorageBytes',
                dimensionsMap: {
                    FileSystemId: this.filesystem.fileSystemId,
                    StorageClass: 'Total'
                },
                statistic: 'Average',
                period: cdk.Duration.hours(1)
            }),
            threshold: 1099511627776, // 1TB threshold
            evaluationPeriods: 2,
            comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
            treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING
        });
        this.applyStandardTags(storageUtilizationAlarm, {
            'alarm-type': 'storage-utilization',
            'metric-type': 'capacity',
            'threshold': '1TB'
        });
        // 2. Connection Count Alarm
        const connectionCountAlarm = new cloudwatch.Alarm(this, 'ConnectionCountAlarm', {
            alarmName: `${this.context.serviceName}-${this.spec.name}-high-connections`,
            alarmDescription: 'EFS filesystem high connection count alarm',
            metric: new cloudwatch.Metric({
                namespace: 'AWS/EFS',
                metricName: 'ClientConnections',
                dimensionsMap: {
                    FileSystemId: this.filesystem.fileSystemId
                },
                statistic: 'Average',
                period: cdk.Duration.minutes(5)
            }),
            threshold: 1000, // High connection threshold
            evaluationPeriods: 3,
            comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
            treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING
        });
        this.applyStandardTags(connectionCountAlarm, {
            'alarm-type': 'high-connections',
            'metric-type': 'usage',
            'threshold': '1000'
        });
        this.logComponentEvent('observability_configured', 'OpenTelemetry observability standard applied to EFS Filesystem', {
            alarmsCreated: 2,
            filesystemName: filesystemName,
            monitoringEnabled: true
        });
    }
}
exports.EfsFilesystemComponent = EfsFilesystemComponent;
