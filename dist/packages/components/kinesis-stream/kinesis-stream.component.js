"use strict";
/**
 * Kinesis Stream Component implementing Component API Contract v1.0
 *
 * A managed high-throughput, real-time data ingestion service.
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
exports.KinesisStreamComponent = exports.KinesisStreamConfigBuilder = exports.KINESIS_STREAM_CONFIG_SCHEMA = void 0;
const kinesis = __importStar(require("aws-cdk-lib/aws-kinesis"));
const kms = __importStar(require("aws-cdk-lib/aws-kms"));
const cloudwatch = __importStar(require("aws-cdk-lib/aws-cloudwatch"));
const cdk = __importStar(require("aws-cdk-lib"));
const contracts_1 = require("@platform/contracts");
/**
 * JSON Schema for Kinesis Stream configuration
 */
exports.KINESIS_STREAM_CONFIG_SCHEMA = {
    type: 'object',
    properties: {
        streamName: {
            type: 'string',
            pattern: '^[a-zA-Z0-9_.-]+$',
            maxLength: 128
        },
        shardCount: {
            type: 'number',
            minimum: 1,
            maximum: 500000
        },
        retentionPeriod: {
            type: 'number',
            minimum: 24,
            maximum: 8760
        },
        encryption: {
            type: 'object',
            properties: {
                type: {
                    type: 'string',
                    enum: ['none', 'kms']
                },
                kmsKeyId: { type: 'string' }
            },
            required: ['type']
        },
        monitoring: {
            type: 'object',
            properties: {
                enabled: { type: 'boolean' },
                enhancedMetrics: { type: 'boolean' },
                alarms: {
                    type: 'object',
                    properties: {
                        iteratorAgeThreshold: { type: 'number', minimum: 0 },
                        readThroughputThreshold: { type: 'number', minimum: 0 },
                        writeThroughputThreshold: { type: 'number', minimum: 0 }
                    }
                }
            }
        },
        tags: {
            type: 'object',
            additionalProperties: { type: 'string' }
        }
    },
    required: ['shardCount'],
    additionalProperties: false
};
/**
 * ConfigBuilder for Kinesis Stream component
 */
class KinesisStreamConfigBuilder {
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
            retentionPeriod: this.getDefaultRetentionPeriod(),
            encryption: {
                type: this.shouldEnableEncryption() ? 'kms' : 'none'
            },
            monitoring: {
                enabled: true,
                enhancedMetrics: this.shouldEnableEnhancedMetrics(),
                alarms: {
                    iteratorAgeThreshold: this.getDefaultIteratorAgeThreshold(),
                    readThroughputThreshold: 80,
                    writeThroughputThreshold: 80
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
                    retentionPeriod: 168, // 7 days minimum for FedRAMP High
                    encryption: {
                        type: 'kms' // Mandatory encryption
                    },
                    monitoring: {
                        enabled: true,
                        enhancedMetrics: true, // Enhanced monitoring for compliance
                        alarms: {
                            iteratorAgeThreshold: 60000, // 1 minute for high compliance
                            readThroughputThreshold: 70, // More sensitive monitoring
                            writeThroughputThreshold: 70
                        }
                    }
                };
            case 'fedramp-moderate':
                return {
                    retentionPeriod: 72, // 3 days for FedRAMP Moderate
                    encryption: {
                        type: 'kms' // Recommended encryption
                    },
                    monitoring: {
                        enabled: true,
                        enhancedMetrics: true,
                        alarms: {
                            iteratorAgeThreshold: 300000, // 5 minutes for moderate compliance
                            readThroughputThreshold: 75,
                            writeThroughputThreshold: 75
                        }
                    }
                };
            default: // commercial
                return {
                    retentionPeriod: 24, // 24 hours for cost optimization
                    encryption: {
                        type: 'none' // Optional for commercial
                    },
                    monitoring: {
                        enabled: false, // Optional monitoring
                        enhancedMetrics: false
                    }
                };
        }
    }
    /**
     * Get default retention period based on compliance framework
     */
    getDefaultRetentionPeriod() {
        switch (this.context.complianceFramework) {
            case 'fedramp-high':
                return 168; // 7 days
            case 'fedramp-moderate':
                return 72; // 3 days
            default:
                return 24; // 1 day
        }
    }
    /**
     * Determine if encryption should be enabled by default
     */
    shouldEnableEncryption() {
        return ['fedramp-moderate', 'fedramp-high'].includes(this.context.complianceFramework);
    }
    /**
     * Determine if enhanced metrics should be enabled by default
     */
    shouldEnableEnhancedMetrics() {
        return ['fedramp-moderate', 'fedramp-high'].includes(this.context.complianceFramework);
    }
    /**
     * Get default iterator age threshold based on compliance framework
     */
    getDefaultIteratorAgeThreshold() {
        switch (this.context.complianceFramework) {
            case 'fedramp-high':
                return 60000; // 1 minute
            case 'fedramp-moderate':
                return 300000; // 5 minutes
            default:
                return 600000; // 10 minutes
        }
    }
}
exports.KinesisStreamConfigBuilder = KinesisStreamConfigBuilder;
/**
 * Kinesis Stream Component implementing Component API Contract v1.0
 */
class KinesisStreamComponent extends contracts_1.Component {
    stream;
    kmsKey;
    config;
    constructor(scope, id, context, spec) {
        super(scope, id, context, spec);
    }
    /**
     * Synthesis phase - Create Kinesis stream with compliance hardening
     */
    synth() {
        this.logComponentEvent('synthesis_start', 'Starting Kinesis Stream synthesis');
        try {
            // Build configuration using ConfigBuilder
            const configBuilder = new KinesisStreamConfigBuilder(this.context, this.spec);
            this.config = configBuilder.buildSync();
            // Create KMS key if encryption is enabled
            this.createKmsKeyIfNeeded();
            // Create Kinesis stream
            this.createKinesisStream();
            // Configure observability
            this.configureKinesisObservability();
            // Apply compliance hardening
            this.applyComplianceHardening();
            // Register constructs
            this.registerConstruct('stream', this.stream);
            if (this.kmsKey) {
                this.registerConstruct('kmsKey', this.kmsKey);
            }
            // Register capabilities
            this.registerCapability('stream:kinesis', this.buildKinesisCapability());
            this.logComponentEvent('synthesis_complete', 'Kinesis Stream synthesis completed successfully');
        }
        catch (error) {
            this.logError(error, 'Kinesis Stream synthesis');
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
        return 'kinesis-stream';
    }
    /**
     * Create KMS key for encryption if needed
     */
    createKmsKeyIfNeeded() {
        if (this.config.encryption?.type !== 'kms') {
            return;
        }
        this.kmsKey = new kms.Key(this, 'KmsKey', {
            description: `KMS key for Kinesis stream ${this.spec.name}`,
            enableKeyRotation: true,
            removalPolicy: this.context.complianceFramework.startsWith('fedramp') ?
                cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY
        });
        // Apply standard tags
        this.applyStandardTags(this.kmsKey, {
            'encryption-type': 'customer-managed'
        });
        this.logResourceCreation('kms-key', this.kmsKey.keyId, {
            keyRotation: true,
            purpose: 'kinesis-encryption'
        });
    }
    /**
     * Create Kinesis stream
     */
    createKinesisStream() {
        const streamName = this.config.streamName || `${this.context.serviceName}-${this.spec.name}`;
        const streamProps = {
            streamName,
            shardCount: this.config.shardCount,
            retentionPeriod: cdk.Duration.hours(this.config.retentionPeriod || 24)
        };
        // Apply encryption if enabled
        if (this.config.encryption?.type === 'kms') {
            streamProps.encryption = kinesis.StreamEncryption.KMS;
            if (this.kmsKey) {
                streamProps.encryptionKey = this.kmsKey;
            }
        }
        this.stream = new kinesis.Stream(this, 'KinesisStream', streamProps);
        // Apply standard tags
        this.applyStandardTags(this.stream, {
            'stream-type': 'real-time-data',
            'shard-count': this.config.shardCount.toString(),
            'encryption': this.config.encryption?.type || 'none'
        });
        this.logResourceCreation('kinesis-stream', streamName, {
            shardCount: this.config.shardCount,
            retentionPeriod: this.config.retentionPeriod,
            encryption: this.config.encryption?.type
        });
    }
    /**
     * Configure CloudWatch observability for Kinesis stream
     */
    configureKinesisObservability() {
        if (!this.config.monitoring?.enabled) {
            return;
        }
        const streamName = this.stream.streamName;
        // 1. Iterator Age Alarm (consumer lag)
        new cloudwatch.Alarm(this, 'IteratorAgeAlarm', {
            alarmName: `${this.context.serviceName}-${this.spec.name}-iterator-age`,
            alarmDescription: 'Kinesis stream iterator age alarm (consumer lag)',
            metric: new cloudwatch.Metric({
                namespace: 'AWS/Kinesis',
                metricName: 'GetRecords.IteratorAgeMilliseconds',
                dimensionsMap: {
                    StreamName: streamName
                },
                statistic: 'Maximum',
                period: cdk.Duration.minutes(5)
            }),
            threshold: this.config.monitoring.alarms?.iteratorAgeThreshold || 600000,
            evaluationPeriods: 2,
            comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
            treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING
        });
        // 2. Read Provisioned Throughput Exceeded Alarm
        new cloudwatch.Alarm(this, 'ReadThroughputAlarm', {
            alarmName: `${this.context.serviceName}-${this.spec.name}-read-throughput`,
            alarmDescription: 'Kinesis stream read throughput exceeded alarm',
            metric: new cloudwatch.Metric({
                namespace: 'AWS/Kinesis',
                metricName: 'ReadProvisionedThroughputExceeded',
                dimensionsMap: {
                    StreamName: streamName
                },
                statistic: 'Sum',
                period: cdk.Duration.minutes(5)
            }),
            threshold: 1,
            evaluationPeriods: 1,
            comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
            treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING
        });
        // 3. Write Provisioned Throughput Exceeded Alarm
        new cloudwatch.Alarm(this, 'WriteThroughputAlarm', {
            alarmName: `${this.context.serviceName}-${this.spec.name}-write-throughput`,
            alarmDescription: 'Kinesis stream write throughput exceeded alarm',
            metric: new cloudwatch.Metric({
                namespace: 'AWS/Kinesis',
                metricName: 'WriteProvisionedThroughputExceeded',
                dimensionsMap: {
                    StreamName: streamName
                },
                statistic: 'Sum',
                period: cdk.Duration.minutes(5)
            }),
            threshold: 1,
            evaluationPeriods: 1,
            comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
            treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING
        });
        this.logComponentEvent('observability_configured', 'OpenTelemetry observability standard applied to Kinesis stream', {
            alarmsCreated: 3,
            streamName: streamName,
            monitoringEnabled: true
        });
    }
    /**
     * Apply compliance hardening based on framework
     */
    applyComplianceHardening() {
        if (!this.stream)
            return;
        switch (this.context.complianceFramework) {
            case 'fedramp-high':
            case 'fedramp-moderate':
                // For FedRAMP environments, ensure stream has proper encryption and monitoring
                const cfnStream = this.stream.node.defaultChild;
                cfnStream.addMetadata('ComplianceFramework', this.context.complianceFramework);
                this.logComponentEvent('compliance_hardening_applied', 'FedRAMP compliance hardening applied', {
                    framework: this.context.complianceFramework,
                    encryptionEnabled: this.config.encryption?.type === 'kms',
                    enhancedMetrics: this.config.monitoring?.enhancedMetrics
                });
                break;
            default:
                // No special hardening needed for commercial
                break;
        }
    }
    /**
     * Build Kinesis capability descriptor
     */
    buildKinesisCapability() {
        return {
            type: 'stream:kinesis',
            streamName: this.stream.streamName,
            streamArn: this.stream.streamArn,
            shardCount: this.config.shardCount,
            retentionPeriod: this.config.retentionPeriod,
            encryption: this.config.encryption?.type,
            kmsKeyArn: this.kmsKey?.keyArn
        };
    }
}
exports.KinesisStreamComponent = KinesisStreamComponent;
