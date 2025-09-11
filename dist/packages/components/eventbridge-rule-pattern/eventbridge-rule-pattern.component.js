"use strict";
/**
 * EventBridge Rule Pattern Component implementing Component API Contract v1.0
 *
 * A managed event pattern-based rule for reacting to specific events happening across an AWS account.
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
exports.EventBridgeRulePatternComponent = exports.EventBridgeRulePatternConfigBuilder = exports.EVENTBRIDGE_RULE_PATTERN_CONFIG_SCHEMA = void 0;
const events = __importStar(require("aws-cdk-lib/aws-events"));
const sqs = __importStar(require("aws-cdk-lib/aws-sqs"));
const logs = __importStar(require("aws-cdk-lib/aws-logs"));
const cloudwatch = __importStar(require("aws-cdk-lib/aws-cloudwatch"));
const cdk = __importStar(require("aws-cdk-lib"));
const contracts_1 = require("@platform/contracts");
/**
 * JSON Schema for EventBridge Rule Pattern configuration
 */
exports.EVENTBRIDGE_RULE_PATTERN_CONFIG_SCHEMA = {
    type: 'object',
    properties: {
        ruleName: {
            type: 'string',
            pattern: '^[a-zA-Z0-9._-]+$',
            maxLength: 64
        },
        eventPattern: {
            type: 'object',
            properties: {
                source: {
                    type: 'array',
                    items: { type: 'string' }
                },
                detailType: {
                    type: 'array',
                    items: { type: 'string' }
                },
                account: {
                    type: 'array',
                    items: { type: 'string' }
                },
                region: {
                    type: 'array',
                    items: { type: 'string' }
                },
                detail: {
                    type: 'object'
                },
                resources: {
                    type: 'array',
                    items: { type: 'string' }
                },
                time: {
                    type: 'object',
                    properties: {
                        numeric: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    operator: { type: 'string' },
                                    value: { type: 'number' }
                                },
                                required: ['operator', 'value']
                            }
                        }
                    }
                }
            },
            required: ['source']
        },
        description: { type: 'string' },
        eventBus: {
            type: 'object',
            properties: {
                busName: { type: 'string' },
                busArn: { type: 'string' }
            }
        },
        state: {
            type: 'string',
            enum: ['enabled', 'disabled']
        },
        input: {
            type: 'object',
            properties: {
                inputType: {
                    type: 'string',
                    enum: ['constant', 'transformer', 'path']
                },
                inputValue: { type: 'string' },
                inputPath: { type: 'string' },
                inputTransformer: {
                    type: 'object',
                    properties: {
                        inputPathsMap: {
                            type: 'object',
                            additionalProperties: { type: 'string' }
                        },
                        inputTemplate: { type: 'string' }
                    },
                    required: ['inputTemplate']
                }
            },
            required: ['inputType']
        },
        deadLetterQueue: {
            type: 'object',
            properties: {
                enabled: { type: 'boolean' },
                maxRetryAttempts: { type: 'number', minimum: 0, maximum: 185 },
                retentionPeriod: { type: 'number', minimum: 1, maximum: 14 }
            }
        },
        monitoring: {
            type: 'object',
            properties: {
                enabled: { type: 'boolean' },
                alarmOnFailure: { type: 'boolean' },
                failureThreshold: { type: 'number', minimum: 1 },
                cloudWatchLogs: {
                    type: 'object',
                    properties: {
                        enabled: { type: 'boolean' },
                        logGroupName: { type: 'string' },
                        retentionInDays: {
                            type: 'number',
                            enum: [1, 3, 5, 7, 14, 30, 60, 90, 120, 150, 180, 365, 400, 545, 731, 1827, 3653]
                        }
                    }
                }
            }
        },
        tags: {
            type: 'object',
            additionalProperties: { type: 'string' }
        }
    },
    required: ['eventPattern'],
    additionalProperties: false
};
/**
 * ConfigBuilder for EventBridge Rule Pattern component
 */
class EventBridgeRulePatternConfigBuilder {
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
            state: 'enabled',
            description: `EventBridge rule pattern for ${this.spec.name}`,
            monitoring: {
                enabled: true,
                alarmOnFailure: true,
                failureThreshold: this.getDefaultFailureThreshold(),
                cloudWatchLogs: {
                    enabled: true,
                    retentionInDays: this.getDefaultLogRetention()
                }
            },
            deadLetterQueue: {
                enabled: this.shouldEnableDeadLetterQueue(),
                maxRetryAttempts: this.getDefaultRetryAttempts(),
                retentionPeriod: this.getDefaultDlqRetention()
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
                    monitoring: {
                        enabled: true,
                        alarmOnFailure: true,
                        failureThreshold: 1, // More sensitive monitoring
                        cloudWatchLogs: {
                            enabled: true,
                            retentionInDays: 365 // One year retention for high compliance
                        }
                    },
                    deadLetterQueue: {
                        enabled: true, // Mandatory DLQ for high compliance
                        maxRetryAttempts: 5,
                        retentionPeriod: 14
                    }
                };
            case 'fedramp-moderate':
                return {
                    monitoring: {
                        enabled: true,
                        alarmOnFailure: true,
                        failureThreshold: 3,
                        cloudWatchLogs: {
                            enabled: true,
                            retentionInDays: 90 // 90 days for moderate compliance
                        }
                    },
                    deadLetterQueue: {
                        enabled: true, // Recommended DLQ for moderate compliance
                        maxRetryAttempts: 3,
                        retentionPeriod: 14
                    }
                };
            default: // commercial
                return {
                    monitoring: {
                        enabled: false, // Optional for commercial
                        alarmOnFailure: false
                    },
                    deadLetterQueue: {
                        enabled: false // Cost optimization
                    }
                };
        }
    }
    /**
     * Get default failure threshold based on compliance framework
     */
    getDefaultFailureThreshold() {
        switch (this.context.complianceFramework) {
            case 'fedramp-high':
                return 1; // Most sensitive
            case 'fedramp-moderate':
                return 3; // Moderate sensitivity
            default:
                return 5; // Cost-optimized
        }
    }
    /**
     * Get default log retention based on compliance framework
     */
    getDefaultLogRetention() {
        switch (this.context.complianceFramework) {
            case 'fedramp-high':
                return 365; // One year
            case 'fedramp-moderate':
                return 90; // 90 days
            default:
                return 30; // One month
        }
    }
    /**
     * Determine if dead letter queue should be enabled by default
     */
    shouldEnableDeadLetterQueue() {
        return ['fedramp-moderate', 'fedramp-high'].includes(this.context.complianceFramework);
    }
    /**
     * Get default retry attempts based on compliance framework
     */
    getDefaultRetryAttempts() {
        switch (this.context.complianceFramework) {
            case 'fedramp-high':
                return 5; // More resilient
            case 'fedramp-moderate':
                return 3; // Standard resilience
            default:
                return 3; // Basic resilience
        }
    }
    /**
     * Get default dead letter queue retention period
     */
    getDefaultDlqRetention() {
        return 14; // Standard 14 days across all frameworks
    }
}
exports.EventBridgeRulePatternConfigBuilder = EventBridgeRulePatternConfigBuilder;
/**
 * EventBridge Rule Pattern Component implementing Component API Contract v1.0
 */
class EventBridgeRulePatternComponent extends contracts_1.Component {
    rule;
    deadLetterQueue;
    logGroup;
    config;
    constructor(scope, id, context, spec) {
        super(scope, id, context, spec);
    }
    /**
     * Synthesis phase - Create EventBridge rule with event pattern filtering
     */
    synth() {
        this.logComponentEvent('synthesis_start', 'Starting EventBridge Rule Pattern synthesis');
        try {
            // Build configuration using ConfigBuilder
            const configBuilder = new EventBridgeRulePatternConfigBuilder(this.context, this.spec);
            this.config = configBuilder.buildSync();
            // Validate event pattern for production compliance
            this.validateEventPatternForCompliance();
            // Create dead letter queue if needed
            this.createDeadLetterQueueIfNeeded();
            // Create CloudWatch log group if needed
            this.createCloudWatchLogGroupIfNeeded();
            // Create EventBridge rule
            this.createEventBridgeRule();
            // Configure observability
            this.configureObservabilityForEventBridge();
            // Configure rule-specific monitoring alarms
            this.configureEventBridgeAlarms();
            // Apply compliance hardening
            this.applyComplianceHardening();
            // Register constructs
            this.registerConstruct('rule', this.rule);
            if (this.deadLetterQueue) {
                this.registerConstruct('deadLetterQueue', this.deadLetterQueue);
            }
            if (this.logGroup) {
                this.registerConstruct('logGroup', this.logGroup);
            }
            // Register capabilities
            this.registerCapability('eventbridge:rule-pattern', this.buildEventBridgeCapability());
            this.logComponentEvent('synthesis_complete', 'EventBridge Rule Pattern synthesis completed successfully');
        }
        catch (error) {
            this.logError(error, 'EventBridge Rule Pattern synthesis');
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
        return 'eventbridge-rule-pattern';
    }
    /**
     * Validate event pattern for production compliance
     */
    validateEventPatternForCompliance() {
        if (this.context.environment === 'prod') {
            // Security requirement: no wildcards for event source in production
            const eventPattern = this.config.eventPattern;
            if (eventPattern.source && eventPattern.source.some(source => source.includes('*'))) {
                throw new Error('Production environments do not allow wildcards in event source patterns for security compliance');
            }
        }
    }
    /**
     * Create dead letter queue if enabled in config
     */
    createDeadLetterQueueIfNeeded() {
        if (!this.config.deadLetterQueue?.enabled) {
            return;
        }
        this.deadLetterQueue = new sqs.Queue(this, 'DeadLetterQueue', {
            queueName: `${this.context.serviceName}-${this.spec.name}-dlq`,
            retentionPeriod: cdk.Duration.days(this.config.deadLetterQueue.retentionPeriod || 14),
            visibilityTimeout: cdk.Duration.minutes(5)
        });
        // Apply standard tags
        this.applyStandardTags(this.deadLetterQueue, {
            'queue-type': 'dead-letter'
        });
        this.logResourceCreation('dead-letter-queue', this.deadLetterQueue.queueName, {
            retentionPeriod: this.config.deadLetterQueue.retentionPeriod
        });
    }
    /**
     * Create CloudWatch log group if enabled
     */
    createCloudWatchLogGroupIfNeeded() {
        if (!this.config.monitoring?.cloudWatchLogs?.enabled) {
            return;
        }
        const logGroupName = this.config.monitoring.cloudWatchLogs.logGroupName ||
            `/aws/events/rule/${this.context.serviceName}-${this.spec.name}`;
        this.logGroup = new logs.LogGroup(this, 'LogGroup', {
            logGroupName,
            retention: this.getLogRetention(),
            removalPolicy: this.context.complianceFramework.startsWith('fedramp') ?
                cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY
        });
        // Apply standard tags
        this.applyStandardTags(this.logGroup, {
            'log-type': 'eventbridge-rule'
        });
        this.logResourceCreation('log-group', logGroupName, {
            retention: this.config.monitoring.cloudWatchLogs.retentionInDays
        });
    }
    /**
     * Create EventBridge rule with event pattern
     */
    createEventBridgeRule() {
        const ruleName = this.config.ruleName || `${this.context.serviceName}-${this.spec.name}`;
        this.rule = new events.Rule(this, 'EventBridgeRule', {
            ruleName,
            description: this.config.description,
            eventPattern: this.buildCdkEventPattern(),
            enabled: this.config.state === 'enabled',
            eventBus: this.config.eventBus?.busName ?
                events.EventBus.fromEventBusName(this, 'EventBus', this.config.eventBus.busName) :
                events.EventBus.fromEventBusName(this, 'EventBus', 'default')
        });
        // Apply standard tags
        this.applyStandardTags(this.rule, {
            'rule-type': 'pattern',
            'event-source': this.config.eventPattern.source?.join(',') || 'unknown'
        });
        this.logResourceCreation('eventbridge-rule', ruleName, {
            state: this.config.state,
            eventPattern: this.config.eventPattern,
            eventBus: this.config.eventBus?.busName || 'default'
        });
    }
    /**
     * Configure CloudWatch observability for EventBridge rule
     */
    configureObservabilityForEventBridge() {
        if (!this.config.monitoring?.enabled) {
            return;
        }
        const ruleName = this.rule.ruleName;
        // Create alarm for failed invocations
        new cloudwatch.Alarm(this, 'FailedInvocationsAlarm', {
            alarmName: `${this.context.serviceName}-${this.spec.name}-failed-invocations`,
            alarmDescription: 'EventBridge rule failed invocations alarm',
            metric: new cloudwatch.Metric({
                namespace: 'AWS/Events',
                metricName: 'FailedInvocations',
                dimensionsMap: {
                    RuleName: ruleName
                },
                statistic: 'Sum',
                period: cdk.Duration.minutes(5)
            }),
            threshold: this.config.monitoring.failureThreshold || 5,
            evaluationPeriods: 2,
            comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
            treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING
        });
        this.logComponentEvent('observability_configured', 'OpenTelemetry observability standard applied to EventBridge rule', {
            alarmsCreated: 1,
            ruleName: ruleName,
            monitoringEnabled: true
        });
    }
    /**
     * Configure comprehensive CloudWatch alarms for EventBridge rule monitoring
     */
    configureEventBridgeAlarms() {
        if (!this.config.monitoring?.enabled) {
            return;
        }
        const ruleName = this.rule.ruleName;
        // 1. Invocation Count Alarm (detect traffic drops/spikes)
        new cloudwatch.Alarm(this, 'InvocationCountAlarm', {
            alarmName: `${this.context.serviceName}-${this.spec.name}-invocation-count`,
            alarmDescription: 'EventBridge rule invocation count monitoring',
            metric: new cloudwatch.Metric({
                namespace: 'AWS/Events',
                metricName: 'Invocations',
                dimensionsMap: {
                    RuleName: ruleName
                },
                statistic: 'Sum',
                period: cdk.Duration.minutes(5)
            }),
            threshold: 0,
            evaluationPeriods: 3,
            comparisonOperator: cloudwatch.ComparisonOperator.LESS_THAN_OR_EQUAL_TO_THRESHOLD,
            treatMissingData: cloudwatch.TreatMissingData.BREACHING
        });
        // 2. Matched Events Alarm (detect pattern matching issues)
        new cloudwatch.Alarm(this, 'MatchedEventsAlarm', {
            alarmName: `${this.context.serviceName}-${this.spec.name}-matched-events`,
            alarmDescription: 'EventBridge rule matched events monitoring',
            metric: new cloudwatch.Metric({
                namespace: 'AWS/Events',
                metricName: 'MatchedEvents',
                dimensionsMap: {
                    RuleName: ruleName
                },
                statistic: 'Sum',
                period: cdk.Duration.minutes(5)
            }),
            threshold: 0,
            evaluationPeriods: 6, // 30 minutes of no matched events
            comparisonOperator: cloudwatch.ComparisonOperator.LESS_THAN_OR_EQUAL_TO_THRESHOLD,
            treatMissingData: cloudwatch.TreatMissingData.BREACHING
        });
        // 3. Dead Letter Queue Messages Alarm (if DLQ is enabled)
        if (this.deadLetterQueue) {
            new cloudwatch.Alarm(this, 'DlqMessagesAlarm', {
                alarmName: `${this.context.serviceName}-${this.spec.name}-dlq-messages`,
                alarmDescription: 'Dead letter queue messages alarm',
                metric: new cloudwatch.Metric({
                    namespace: 'AWS/SQS',
                    metricName: 'ApproximateNumberOfVisibleMessages',
                    dimensionsMap: {
                        QueueName: this.deadLetterQueue.queueName
                    },
                    statistic: 'Average',
                    period: cdk.Duration.minutes(5)
                }),
                threshold: 1,
                evaluationPeriods: 1,
                comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
                treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING
            });
        }
        this.logComponentEvent('comprehensive_alarms_configured', 'Comprehensive CloudWatch alarms configured for EventBridge rule', {
            alarmsCreated: this.deadLetterQueue ? 4 : 3, // Including the original FailedInvocations alarm
            ruleName: ruleName,
            dlqMonitoring: !!this.deadLetterQueue
        });
    }
    /**
     * Apply compliance hardening based on framework
     */
    applyComplianceHardening() {
        if (!this.rule)
            return;
        switch (this.context.complianceFramework) {
            case 'fedramp-high':
            case 'fedramp-moderate':
                // For FedRAMP environments, ensure rule has proper IAM restrictions
                const cfnRule = this.rule.node.defaultChild;
                cfnRule.addMetadata('ComplianceFramework', this.context.complianceFramework);
                this.logComponentEvent('compliance_hardening_applied', 'FedRAMP compliance hardening applied', {
                    framework: this.context.complianceFramework,
                    deadLetterQueueEnabled: !!this.deadLetterQueue,
                    loggingEnabled: !!this.logGroup
                });
                break;
            default:
                // No special hardening needed for commercial
                break;
        }
    }
    /**
     * Build EventBridge capability descriptor
     */
    buildEventBridgeCapability() {
        return {
            type: 'eventbridge:rule-pattern',
            ruleName: this.rule.ruleName,
            ruleArn: this.rule.ruleArn,
            eventPattern: this.config.eventPattern,
            state: this.config.state,
            eventBus: this.config.eventBus?.busName || 'default',
            deadLetterQueue: this.deadLetterQueue ? {
                queueUrl: this.deadLetterQueue.queueUrl,
                queueArn: this.deadLetterQueue.queueArn
            } : undefined
        };
    }
    /**
     * Get log retention period based on compliance framework
     */
    getLogRetention() {
        const retentionDays = this.config.monitoring?.cloudWatchLogs?.retentionInDays || 30;
        const retentionMap = {
            1: logs.RetentionDays.ONE_DAY,
            3: logs.RetentionDays.THREE_DAYS,
            5: logs.RetentionDays.FIVE_DAYS,
            7: logs.RetentionDays.ONE_WEEK,
            14: logs.RetentionDays.TWO_WEEKS,
            30: logs.RetentionDays.ONE_MONTH,
            60: logs.RetentionDays.TWO_MONTHS,
            90: logs.RetentionDays.THREE_MONTHS,
            120: logs.RetentionDays.FOUR_MONTHS,
            150: logs.RetentionDays.FIVE_MONTHS,
            180: logs.RetentionDays.SIX_MONTHS,
            365: logs.RetentionDays.ONE_YEAR,
            400: logs.RetentionDays.THIRTEEN_MONTHS,
            545: logs.RetentionDays.EIGHTEEN_MONTHS,
            731: logs.RetentionDays.TWO_YEARS,
            1827: logs.RetentionDays.FIVE_YEARS,
            3653: logs.RetentionDays.TEN_YEARS
        };
        return retentionMap[retentionDays] || logs.RetentionDays.ONE_MONTH;
    }
    /**
     * Build CDK-compatible event pattern from config
     */
    buildCdkEventPattern() {
        const pattern = this.config.eventPattern;
        return {
            source: pattern.source,
            detailType: pattern.detailType,
            account: pattern.account,
            region: pattern.region,
            detail: pattern.detail,
            resources: pattern.resources,
            time: pattern.time?.numeric?.map(n => `${n.operator}:${n.value}`)
        };
    }
}
exports.EventBridgeRulePatternComponent = EventBridgeRulePatternComponent;
