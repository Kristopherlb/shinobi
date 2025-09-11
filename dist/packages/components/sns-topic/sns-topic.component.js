"use strict";
/**
 * SNS Topic Component
 *
 * A pub/sub topic with compliance hardening and subscription management.
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
exports.SnsTopicComponent = exports.SnsTopicConfigBuilder = exports.SNS_TOPIC_CONFIG_SCHEMA = void 0;
const sns = __importStar(require("aws-cdk-lib/aws-sns"));
const kms = __importStar(require("aws-cdk-lib/aws-kms"));
const iam = __importStar(require("aws-cdk-lib/aws-iam"));
const cloudwatch = __importStar(require("aws-cdk-lib/aws-cloudwatch"));
const cdk = __importStar(require("aws-cdk-lib"));
const contracts_1 = require("@platform/contracts");
/**
 * Configuration schema for SNS Topic component
 */
exports.SNS_TOPIC_CONFIG_SCHEMA = {
    type: 'object',
    title: 'SNS Topic Configuration',
    description: 'Configuration for creating an SNS pub/sub topic',
    properties: {
        topicName: {
            type: 'string',
            description: 'Topic name (will be auto-generated if not provided)',
            pattern: '^[a-zA-Z0-9_-]+(\.fifo)?$',
            minLength: 1,
            maxLength: 256
        },
        displayName: {
            type: 'string',
            description: 'Display name for the topic',
            maxLength: 100
        },
        fifo: {
            type: 'object',
            description: 'FIFO topic configuration',
            properties: {
                enabled: {
                    type: 'boolean',
                    description: 'Enable FIFO topic',
                    default: false
                },
                contentBasedDeduplication: {
                    type: 'boolean',
                    description: 'Enable content-based deduplication',
                    default: false
                }
            },
            additionalProperties: false,
            default: {
                enabled: false,
                contentBasedDeduplication: false
            }
        },
        encryption: {
            type: 'object',
            description: 'Encryption configuration',
            properties: {
                enabled: {
                    type: 'boolean',
                    description: 'Enable server-side encryption',
                    default: false
                },
                kmsKeyArn: {
                    type: 'string',
                    description: 'KMS key ARN for encryption',
                    pattern: '^arn:aws:kms:[a-z0-9-]+:[0-9]{12}:key/[a-f0-9-]{36}$'
                }
            },
            additionalProperties: false,
            default: {
                enabled: false
            }
        },
        deliveryPolicy: {
            type: 'object',
            description: 'Delivery policy configuration',
            properties: {
                http: {
                    type: 'object',
                    description: 'HTTP delivery retry policy',
                    properties: {
                        defaultHealthyRetryPolicy: {
                            type: 'object',
                            description: 'Default healthy retry policy for HTTP endpoints',
                            properties: {
                                numRetries: {
                                    type: 'number',
                                    description: 'Number of retries',
                                    minimum: 0,
                                    maximum: 100,
                                    default: 3
                                },
                                numMinDelayRetries: {
                                    type: 'number',
                                    description: 'Number of minimum delay retries',
                                    minimum: 0,
                                    maximum: 20,
                                    default: 0
                                },
                                minDelayTarget: {
                                    type: 'number',
                                    description: 'Minimum delay target in seconds',
                                    minimum: 1,
                                    maximum: 3600,
                                    default: 20
                                },
                                maxDelayTarget: {
                                    type: 'number',
                                    description: 'Maximum delay target in seconds',
                                    minimum: 1,
                                    maximum: 3600,
                                    default: 20
                                },
                                numMaxDelayRetries: {
                                    type: 'number',
                                    description: 'Number of maximum delay retries',
                                    minimum: 0,
                                    maximum: 20,
                                    default: 0
                                },
                                backoffFunction: {
                                    type: 'string',
                                    description: 'Backoff function type',
                                    enum: ['linear', 'arithmetic', 'geometric', 'exponential'],
                                    default: 'linear'
                                }
                            },
                            additionalProperties: false,
                            default: {
                                numRetries: 3,
                                numMinDelayRetries: 0,
                                minDelayTarget: 20,
                                maxDelayTarget: 20,
                                numMaxDelayRetries: 0,
                                backoffFunction: 'linear'
                            }
                        }
                    },
                    additionalProperties: false
                }
            },
            additionalProperties: false
        },
        messageFilterPolicy: {
            type: 'object',
            description: 'Message filtering policy (arbitrary key-value pairs)',
            additionalProperties: true
        },
        tracingConfig: {
            type: 'object',
            description: 'X-Ray tracing configuration',
            properties: {
                enabled: {
                    type: 'boolean',
                    description: 'Enable X-Ray tracing',
                    default: false
                }
            },
            additionalProperties: false,
            default: {
                enabled: false
            }
        }
    },
    additionalProperties: false,
    defaults: {
        fifo: {
            enabled: false,
            contentBasedDeduplication: false
        },
        encryption: {
            enabled: false
        },
        tracingConfig: {
            enabled: false
        }
    }
};
/**
 * Configuration builder for SNS Topic component
 */
class SnsTopicConfigBuilder {
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
     * Get platform-wide defaults for SNS Topic
     */
    getPlatformDefaults() {
        return {
            fifo: {
                enabled: false,
                contentBasedDeduplication: false
            },
            encryption: {
                enabled: this.getDefaultEncryptionEnabled()
            },
            tracingConfig: {
                enabled: this.getDefaultTracingEnabled()
            },
            deliveryPolicy: this.getDefaultDeliveryPolicy()
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
                    encryption: {
                        enabled: true // Encryption required for compliance
                    },
                    tracingConfig: {
                        enabled: true // Enhanced monitoring required
                    },
                    deliveryPolicy: {
                        http: {
                            defaultHealthyRetryPolicy: {
                                numRetries: 5, // Increased retries for reliability
                                numMinDelayRetries: 2,
                                minDelayTarget: 30,
                                maxDelayTarget: 120,
                                numMaxDelayRetries: 2,
                                backoffFunction: 'exponential' // Better for compliance
                            }
                        }
                    }
                };
            case 'fedramp-high':
                return {
                    encryption: {
                        enabled: true // Mandatory encryption
                    },
                    tracingConfig: {
                        enabled: true // Required for audit trails
                    },
                    deliveryPolicy: {
                        http: {
                            defaultHealthyRetryPolicy: {
                                numRetries: 10, // Maximum retries for high compliance
                                numMinDelayRetries: 3,
                                minDelayTarget: 60,
                                maxDelayTarget: 300,
                                numMaxDelayRetries: 3,
                                backoffFunction: 'exponential' // Exponential backoff for reliability
                            }
                        }
                    }
                };
            default: // commercial
                return {};
        }
    }
    /**
     * Get default encryption enabled setting
     */
    getDefaultEncryptionEnabled() {
        return ['fedramp-moderate', 'fedramp-high'].includes(this.context.complianceFramework);
    }
    /**
     * Get default tracing enabled setting
     */
    getDefaultTracingEnabled() {
        return ['fedramp-moderate', 'fedramp-high'].includes(this.context.complianceFramework);
    }
    /**
     * Get default delivery policy based on compliance framework
     */
    getDefaultDeliveryPolicy() {
        const framework = this.context.complianceFramework;
        if (framework === 'fedramp-high' || framework === 'fedramp-moderate') {
            return {
                http: {
                    defaultHealthyRetryPolicy: {
                        numRetries: framework === 'fedramp-high' ? 10 : 5,
                        numMinDelayRetries: framework === 'fedramp-high' ? 3 : 2,
                        minDelayTarget: framework === 'fedramp-high' ? 60 : 30,
                        maxDelayTarget: framework === 'fedramp-high' ? 300 : 120,
                        numMaxDelayRetries: framework === 'fedramp-high' ? 3 : 2,
                        backoffFunction: 'exponential'
                    }
                }
            };
        }
        return {
            http: {
                defaultHealthyRetryPolicy: {
                    numRetries: 3,
                    numMinDelayRetries: 0,
                    minDelayTarget: 20,
                    maxDelayTarget: 20,
                    numMaxDelayRetries: 0,
                    backoffFunction: 'linear'
                }
            }
        };
    }
}
exports.SnsTopicConfigBuilder = SnsTopicConfigBuilder;
/**
 * SNS Topic Component implementing Component API Contract v1.0
 */
class SnsTopicComponent extends contracts_1.Component {
    topic;
    kmsKey;
    config;
    constructor(scope, id, context, spec) {
        super(scope, id, context, spec);
    }
    /**
     * Synthesis phase - Create SNS topic with compliance hardening
     */
    synth() {
        // Build configuration using ConfigBuilder
        const configBuilder = new SnsTopicConfigBuilder(this.context, this.spec);
        this.config = configBuilder.buildSync();
        // Create KMS key for encryption if needed
        this.createKmsKeyIfNeeded();
        // Create SNS topic
        this.createTopic();
        // Apply compliance hardening
        this.applyComplianceHardening();
        // Configure observability
        this.configureObservabilityForSns();
        // Register constructs
        this.registerConstruct('topic', this.topic);
        if (this.kmsKey) {
            this.registerConstruct('kmsKey', this.kmsKey);
        }
        // Register capabilities
        this.registerCapability('topic:sns', this.buildTopicCapability());
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
        return 'sns-topic';
    }
    /**
     * Create KMS key for encryption if required by compliance framework
     */
    createKmsKeyIfNeeded() {
        if (this.shouldUseCustomerManagedKey()) {
            this.kmsKey = new kms.Key(this, 'EncryptionKey', {
                description: `Encryption key for ${this.spec.name} SNS topic`,
                enableKeyRotation: this.context.complianceFramework === 'fedramp-high',
                keyUsage: kms.KeyUsage.ENCRYPT_DECRYPT,
                keySpec: kms.KeySpec.SYMMETRIC_DEFAULT
            });
            // Apply standard tags
            this.applyStandardTags(this.kmsKey, {
                'encryption-type': 'customer-managed',
                'key-rotation': (this.context.complianceFramework === 'fedramp-high').toString(),
                'resource-type': 'sns-topic-encryption'
            });
            // Grant SNS service access to the key
            this.kmsKey.addToResourcePolicy(new iam.PolicyStatement({
                sid: 'AllowSNSService',
                principals: [new iam.ServicePrincipal('sns.amazonaws.com')],
                actions: [
                    'kms:Decrypt',
                    'kms:GenerateDataKey*',
                    'kms:DescribeKey'
                ],
                resources: ['*']
            }));
        }
    }
    /**
     * Create the SNS topic
     */
    createTopic() {
        const topicProps = {
            topicName: this.buildTopicName(),
            displayName: this.config.displayName,
            masterKey: this.kmsKey,
            // Tracing not supported in SNS TopicProps - would be configured at subscription level
        };
        // Configure FIFO topic if enabled
        if (this.config.fifo?.enabled) {
            Object.assign(topicProps, {
                fifo: true,
                contentBasedDeduplication: this.config.fifo.contentBasedDeduplication
            });
        }
        this.topic = new sns.Topic(this, 'Topic', topicProps);
        // Apply standard tags
        this.applyStandardTags(this.topic, {
            'topic-type': 'main',
            'fifo-enabled': (!!this.config.fifo?.enabled).toString(),
            'encryption-enabled': (!!this.kmsKey).toString(),
            'content-based-deduplication': (!!this.config.fifo?.contentBasedDeduplication).toString()
        });
        // Apply delivery policy if configured
        if (this.config.deliveryPolicy) {
            const cfnTopic = this.topic.node.defaultChild;
            // Set delivery policy through CFN properties
            cfnTopic.addPropertyOverride('DeliveryPolicy', this.config.deliveryPolicy);
        }
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
        // Apply basic security policies
        if (this.topic) {
            this.topic.addToResourcePolicy(new iam.PolicyStatement({
                sid: 'DenyInsecureTransport',
                effect: iam.Effect.DENY,
                principals: [new iam.AnyPrincipal()],
                actions: ['sns:*'],
                resources: [this.topic.topicArn],
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
        // Restrict access to authenticated principals only
        if (this.topic) {
            this.topic.addToResourcePolicy(new iam.PolicyStatement({
                sid: 'RequireAuthentication',
                effect: iam.Effect.DENY,
                principals: [new iam.AnyPrincipal()],
                actions: ['sns:*'],
                resources: [this.topic.topicArn],
                conditions: {
                    Bool: {
                        'aws:PrincipalIsAWSService': 'false'
                    },
                    'Null': {
                        'aws:userid': 'true'
                    }
                }
            }));
            // Restrict to VPC endpoints for compliance
            this.topic.addToResourcePolicy(new iam.PolicyStatement({
                sid: 'RestrictToVPCEndpoints',
                effect: iam.Effect.DENY,
                principals: [new iam.AnyPrincipal()],
                actions: ['sns:*'],
                resources: [this.topic.topicArn],
                conditions: {
                    StringNotEquals: {
                        'aws:sourceVpce': ['vpce-*'] // Would be replaced with actual VPC endpoint ID
                    }
                }
            }));
        }
    }
    applyFedrampHighHardening() {
        // Apply all moderate hardening
        this.applyFedrampModerateHardening();
        // Additional high-security restrictions
        if (this.topic) {
            // Restrict to specific source IP ranges
            this.topic.addToResourcePolicy(new iam.PolicyStatement({
                sid: 'RestrictSourceIPs',
                effect: iam.Effect.DENY,
                principals: [new iam.AnyPrincipal()],
                actions: ['sns:*'],
                resources: [this.topic.topicArn],
                conditions: {
                    IpAddressIfExists: {
                        'aws:sourceIp': ['10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16']
                    },
                    Bool: {
                        'aws:ViaAWSService': 'false'
                    }
                }
            }));
            // Require MFA for sensitive operations
            this.topic.addToResourcePolicy(new iam.PolicyStatement({
                sid: 'RequireMFAForAdmin',
                effect: iam.Effect.DENY,
                principals: [new iam.AnyPrincipal()],
                actions: [
                    'sns:DeleteTopic',
                    'sns:SetTopicAttributes',
                    'sns:RemovePermission',
                    'sns:AddPermission'
                ],
                resources: [this.topic.topicArn],
                conditions: {
                    BoolIfExists: {
                        'aws:MultiFactorAuthPresent': 'false'
                    }
                }
            }));
            // Enable X-Ray tracing for audit purposes
            const cfnTopic = this.topic.node.defaultChild;
            cfnTopic.tracingConfig = 'Active';
        }
    }
    /**
     * Build topic capability data shape
     */
    buildTopicCapability() {
        return {
            topicArn: this.topic.topicArn
        };
    }
    /**
     * Helper methods for compliance decisions
     */
    shouldUseCustomerManagedKey() {
        return this.config.encryption?.enabled === true;
    }
    buildTopicName() {
        if (this.config.topicName) {
            let name = this.config.topicName;
            if (this.config.fifo?.enabled && !name.endsWith('.fifo')) {
                name += '.fifo';
            }
            return name;
        }
        // Auto-generate name
        let name = `${this.context.serviceName}-${this.spec.name}`;
        if (this.config.fifo?.enabled) {
            name += '.fifo';
        }
        return name;
    }
    /**
     * Configure CloudWatch observability for SNS Topic
     */
    configureObservabilityForSns() {
        // Check if monitoring is enabled through compliance framework or explicitly configured
        if (this.context.complianceFramework === 'commercial') {
            return;
        }
        const topicName = this.buildTopicName() || this.spec.name;
        // 1. Failed Notifications Alarm
        const failedNotificationsAlarm = new cloudwatch.Alarm(this, 'FailedNotificationsAlarm', {
            alarmName: `${this.context.serviceName}-${this.spec.name}-failed-notifications`,
            alarmDescription: 'SNS topic failed notifications alarm',
            metric: new cloudwatch.Metric({
                namespace: 'AWS/SNS',
                metricName: 'NumberOfNotificationsFailed',
                dimensionsMap: {
                    TopicName: topicName
                },
                statistic: 'Sum',
                period: cdk.Duration.minutes(5)
            }),
            threshold: 1,
            evaluationPeriods: 1,
            comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
            treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING
        });
        // Apply standard tags
        this.applyStandardTags(failedNotificationsAlarm, {
            'alarm-type': 'failed-notifications',
            'metric-type': 'failure-rate',
            'threshold': '1'
        });
        // 2. Message Publishing Rate Alarm
        const messageRateAlarm = new cloudwatch.Alarm(this, 'MessagePublishingRateAlarm', {
            alarmName: `${this.context.serviceName}-${this.spec.name}-message-rate`,
            alarmDescription: 'SNS topic high message publishing rate alarm',
            metric: new cloudwatch.Metric({
                namespace: 'AWS/SNS',
                metricName: 'NumberOfMessagesPublished',
                dimensionsMap: {
                    TopicName: topicName
                },
                statistic: 'Sum',
                period: cdk.Duration.minutes(5)
            }),
            threshold: 10000,
            evaluationPeriods: 2,
            comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
            treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING
        });
        // Apply standard tags
        this.applyStandardTags(messageRateAlarm, {
            'alarm-type': 'message-rate',
            'metric-type': 'throughput',
            'threshold': '10000'
        });
        this.logComponentEvent('observability_configured', 'OpenTelemetry observability standard applied to SNS topic', {
            alarmsCreated: 2,
            topicName: topicName,
            monitoringEnabled: true
        });
    }
}
exports.SnsTopicComponent = SnsTopicComponent;
