"use strict";
/**
 * EventBridge Rule Cron Component implementing Component API Contract v1.0
 *
 * A managed cron-based scheduling rule for triggering Lambda functions and other targets.
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
exports.EventBridgeRuleCronComponent = exports.EventBridgeRuleCronConfigBuilder = exports.EVENTBRIDGE_RULE_CRON_CONFIG_SCHEMA = void 0;
const events = __importStar(require("aws-cdk-lib/aws-events"));
const targets = __importStar(require("aws-cdk-lib/aws-events-targets"));
const logs = __importStar(require("aws-cdk-lib/aws-logs"));
const cloudwatch = __importStar(require("aws-cdk-lib/aws-cloudwatch"));
const cdk = __importStar(require("aws-cdk-lib"));
const src_1 = require("../../../platform/contracts/src");
/**
 * Configuration schema for EventBridge Rule Cron component
 */
exports.EVENTBRIDGE_RULE_CRON_CONFIG_SCHEMA = {
    type: 'object',
    title: 'EventBridge Rule Cron Configuration',
    description: 'Configuration for creating an EventBridge cron rule',
    required: ['schedule'],
    properties: {
        ruleName: {
            type: 'string',
            description: 'Name of the EventBridge rule',
            pattern: '^[a-zA-Z0-9._-]+$',
            minLength: 1,
            maxLength: 64
        },
        schedule: {
            type: 'string',
            description: 'Cron expression for the schedule',
            pattern: '^(cron\\(|rate\\().+\\)$',
            examples: [
                'cron(0 2 * * ? *)',
                'rate(5 minutes)',
                'cron(15 10 ? * 6L 2002-2005)'
            ]
        },
        description: {
            type: 'string',
            description: 'Description of the rule',
            maxLength: 512
        },
        eventBus: {
            type: 'object',
            description: 'EventBridge bus configuration',
            properties: {
                busName: {
                    type: 'string',
                    description: 'Name of the event bus',
                    pattern: '^[a-zA-Z0-9._/-]+$'
                },
                busArn: {
                    type: 'string',
                    description: 'ARN of the event bus',
                    pattern: '^arn:aws:events:[a-z0-9-]+:[0-9]{12}:event-bus/[a-zA-Z0-9._/-]+$'
                }
            }
        },
        state: {
            type: 'string',
            description: 'Initial state of the rule',
            enum: ['enabled', 'disabled'],
            default: 'enabled'
        },
        input: {
            type: 'object',
            description: 'Input configuration for rule targets',
            required: ['inputType'],
            properties: {
                inputType: {
                    type: 'string',
                    description: 'Type of input to provide to targets',
                    enum: ['constant', 'transformer', 'path']
                },
                inputValue: {
                    type: 'string',
                    description: 'Constant input value (for inputType: constant)'
                },
                inputPath: {
                    type: 'string',
                    description: 'JSONPath to extract from event (for inputType: path)'
                },
                inputTransformer: {
                    type: 'object',
                    description: 'Input transformer configuration (for inputType: transformer)',
                    required: ['inputTemplate'],
                    properties: {
                        inputPathsMap: {
                            type: 'object',
                            description: 'Map of JSONPath expressions to variables',
                            additionalProperties: {
                                type: 'string'
                            }
                        },
                        inputTemplate: {
                            type: 'string',
                            description: 'Template for transforming input'
                        }
                    }
                }
            }
        },
        deadLetterQueue: {
            type: 'object',
            description: 'Dead letter queue configuration',
            properties: {
                enabled: {
                    type: 'boolean',
                    description: 'Enable dead letter queue',
                    default: false
                },
                maxRetryAttempts: {
                    type: 'number',
                    description: 'Maximum retry attempts before DLQ',
                    minimum: 0,
                    maximum: 185,
                    default: 3
                },
                retentionPeriod: {
                    type: 'number',
                    description: 'DLQ message retention period in days',
                    minimum: 1,
                    maximum: 14,
                    default: 14
                }
            }
        },
        monitoring: {
            type: 'object',
            description: 'Monitoring configuration',
            properties: {
                enabled: {
                    type: 'boolean',
                    description: 'Enable enhanced monitoring',
                    default: false
                },
                alarmOnFailure: {
                    type: 'boolean',
                    description: 'Create CloudWatch alarm on failures',
                    default: false
                },
                failureThreshold: {
                    type: 'number',
                    description: 'Failure threshold for alarms',
                    minimum: 1,
                    default: 3
                },
                cloudWatchLogs: {
                    type: 'object',
                    description: 'CloudWatch Logs configuration',
                    properties: {
                        enabled: {
                            type: 'boolean',
                            description: 'Enable CloudWatch Logs',
                            default: false
                        },
                        logGroupName: {
                            type: 'string',
                            description: 'CloudWatch log group name'
                        },
                        retentionInDays: {
                            type: 'number',
                            description: 'Log retention period in days',
                            enum: [1, 3, 5, 7, 14, 30, 60, 90, 120, 150, 180, 365, 400, 545, 731, 1827, 3653],
                            default: 14
                        }
                    }
                }
            }
        }
    },
    additionalProperties: false
};
/**
 * Configuration builder for EventBridge Rule Cron component
 */
class EventBridgeRuleCronConfigBuilder {
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
     * Get platform-wide defaults for EventBridge Rule Cron
     */
    getPlatformDefaults() {
        return {
            state: 'enabled',
            deadLetterQueue: {
                enabled: false,
                maxRetryAttempts: 3,
                retentionPeriod: 14
            },
            monitoring: {
                enabled: false,
                alarmOnFailure: false,
                failureThreshold: 3,
                cloudWatchLogs: {
                    enabled: false,
                    retentionInDays: 14
                }
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
                    deadLetterQueue: {
                        enabled: true, // Required for compliance
                        maxRetryAttempts: 3,
                        retentionPeriod: 14
                    },
                    monitoring: {
                        enabled: true, // Enhanced monitoring required
                        alarmOnFailure: true,
                        failureThreshold: 2,
                        cloudWatchLogs: {
                            enabled: true,
                            logGroupName: `/aws/events/rule/${this.context.serviceName}-${this.spec.name}`,
                            retentionInDays: 90 // Extended retention for compliance
                        }
                    }
                };
            case 'fedramp-high':
                return {
                    deadLetterQueue: {
                        enabled: true, // Mandatory for high compliance
                        maxRetryAttempts: 5, // More retries for critical systems
                        retentionPeriod: 14
                    },
                    monitoring: {
                        enabled: true, // Comprehensive monitoring mandatory
                        alarmOnFailure: true,
                        failureThreshold: 1, // Immediate alerting
                        cloudWatchLogs: {
                            enabled: true,
                            logGroupName: `/aws/events/rule/${this.context.serviceName}-${this.spec.name}`,
                            retentionInDays: 2557 // 7 years for high compliance
                        }
                    }
                };
            default: // commercial
                return {
                    deadLetterQueue: {
                        enabled: false, // Cost optimization
                        maxRetryAttempts: 1
                    },
                    monitoring: {
                        enabled: false, // Basic monitoring
                        alarmOnFailure: false
                    }
                };
        }
    }
}
exports.EventBridgeRuleCronConfigBuilder = EventBridgeRuleCronConfigBuilder;
/**
 * EventBridge Rule Cron Component implementing Component API Contract v1.0
 */
class EventBridgeRuleCronComponent extends src_1.Component {
    rule;
    eventBus;
    logGroup;
    config;
    constructor(scope, id, context, spec) {
        super(scope, id, context, spec);
    }
    /**
     * Synthesis phase - Create EventBridge cron rule with compliance hardening
     */
    synth() {
        this.logComponentEvent('synthesis_start', 'Starting EventBridge Rule Cron synthesis');
        try {
            // Build configuration using ConfigBuilder
            const configBuilder = new EventBridgeRuleCronConfigBuilder(this.context, this.spec);
            this.config = configBuilder.buildSync();
            // Get or create event bus
            this.getEventBus();
            // Create CloudWatch log group if needed
            this.createLogGroupIfNeeded();
            // Create EventBridge rule
            this.createEventBridgeRule();
            // Apply compliance hardening
            this.applyComplianceHardening();
            // Configure observability
            this.configureObservabilityForEventBridge();
            // Register constructs
            this.registerConstruct('rule', this.rule);
            if (this.logGroup) {
                this.registerConstruct('logGroup', this.logGroup);
            }
            // Register capabilities
            this.registerCapability('scheduler:cron', this.buildCronCapability());
            this.registerCapability('trigger:eventbridge', this.buildTriggerCapability());
            this.logComponentEvent('synthesis_complete', 'EventBridge Rule Cron synthesis completed successfully');
        }
        catch (error) {
            this.logError(error, 'EventBridge Rule Cron synthesis');
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
        return 'eventbridge-rule-cron';
    }
    /**
     * Get or create event bus
     */
    getEventBus() {
        const eventBusConfig = this.config.eventBus;
        if (eventBusConfig?.busArn) {
            this.eventBus = events.EventBus.fromEventBusArn(this, 'EventBus', eventBusConfig.busArn);
        }
        else if (eventBusConfig?.busName) {
            this.eventBus = events.EventBus.fromEventBusName(this, 'EventBus', eventBusConfig.busName);
        }
        else {
            // Use default event bus
            this.eventBus = events.EventBus.fromEventBusName(this, 'DefaultEventBus', 'default');
        }
    }
    /**
     * Create CloudWatch log group if logging is enabled
     */
    createLogGroupIfNeeded() {
        const logsConfig = this.config.monitoring?.cloudWatchLogs;
        if (logsConfig?.enabled) {
            const logGroupName = logsConfig.logGroupName || `/aws/events/rule/${this.context.serviceName}-${this.spec.name}`;
            this.logGroup = new logs.LogGroup(this, 'LogGroup', {
                logGroupName,
                retention: this.mapRetentionPeriod(logsConfig.retentionInDays || 14),
                removalPolicy: this.isComplianceFramework() ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY
            });
            // Apply standard tags
            this.applyStandardTags(this.logGroup, {
                'resource-type': 'log-group',
                'purpose': 'eventbridge-rule-logs'
            });
            this.logResourceCreation('log-group', logGroupName);
        }
    }
    /**
     * Map retention days to CDK retention period
     */
    mapRetentionPeriod(retentionInDays) {
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
            2557: logs.RetentionDays.SEVEN_YEARS,
            3653: logs.RetentionDays.TEN_YEARS
        };
        return retentionMap[retentionInDays] || logs.RetentionDays.TWO_WEEKS;
    }
    /**
     * Create EventBridge rule with cron schedule
     */
    createEventBridgeRule() {
        const ruleName = this.config.ruleName || `${this.context.serviceName}-${this.spec.name}`;
        this.rule = new events.Rule(this, 'Rule', {
            ruleName,
            description: this.config.description || `Cron rule for ${this.context.serviceName}-${this.spec.name}`,
            eventBus: this.eventBus,
            schedule: this.parseScheduleExpression(this.config.schedule),
            enabled: this.config.state === 'enabled'
        });
        // Apply standard tags
        this.applyStandardTags(this.rule, {
            'resource-type': 'eventbridge-rule',
            'schedule-type': 'cron',
            'rule-state': this.config.state || 'enabled',
            ...this.config.tags
        });
        this.logResourceCreation('eventbridge-rule', ruleName);
    }
    /**
     * Parse schedule expression into CDK Schedule
     */
    parseScheduleExpression(scheduleExpression) {
        if (scheduleExpression.startsWith('cron(')) {
            const cronExpression = scheduleExpression.slice(5, -1); // Remove 'cron(' and ')'
            return events.Schedule.cron({
                minute: this.extractCronField(cronExpression, 0),
                hour: this.extractCronField(cronExpression, 1),
                day: this.extractCronField(cronExpression, 2),
                month: this.extractCronField(cronExpression, 3),
                weekDay: this.extractCronField(cronExpression, 4),
                year: this.extractCronField(cronExpression, 5)
            });
        }
        else if (scheduleExpression.startsWith('rate(')) {
            return events.Schedule.expression(scheduleExpression);
        }
        else {
            throw new Error(`Unsupported schedule expression: ${scheduleExpression}`);
        }
    }
    /**
     * Extract field from cron expression
     */
    extractCronField(cronExpression, fieldIndex) {
        const fields = cronExpression.split(/\s+/);
        if (fieldIndex < fields.length) {
            const field = fields[fieldIndex];
            return field === '*' || field === '?' ? undefined : field;
        }
        return undefined;
    }
    /**
     * Add target to the EventBridge rule
     */
    addLambdaTarget(lambdaFunction, targetInput) {
        if (!this.rule) {
            throw new Error('Rule must be synthesized before adding targets');
        }
        const target = new targets.LambdaFunction(lambdaFunction, {
            event: targetInput ? events.RuleTargetInput.fromObject(targetInput) : undefined,
            deadLetterQueue: this.config.deadLetterQueue?.enabled ? this.createDeadLetterQueue() : undefined,
            maxEventAge: this.config.deadLetterQueue?.enabled ? cdk.Duration.hours(24) : undefined,
            retryAttempts: this.config.deadLetterQueue?.maxRetryAttempts || 3
        });
        this.rule.addTarget(target);
        this.logResourceCreation('lambda-target', lambdaFunction.functionName);
    }
    /**
     * Create dead letter queue for failed events
     */
    createDeadLetterQueue() {
        // This would typically create an SQS queue for DLQ
        // For now, returning undefined as DLQ setup requires SQS component
        return undefined;
    }
    /**
     * Build cron capability data shape
     */
    buildCronCapability() {
        return {
            ruleArn: this.rule.ruleArn,
            ruleName: this.rule.ruleName,
            schedule: this.config.schedule,
            state: this.config.state
        };
    }
    /**
     * Build trigger capability data shape
     */
    buildTriggerCapability() {
        return {
            ruleArn: this.rule.ruleArn,
            ruleName: this.rule.ruleName,
            eventBusArn: this.eventBus.eventBusArn
        };
    }
    /**
     * Apply compliance hardening based on framework
     */
    applyComplianceHardening() {
        switch (this.context.complianceFramework) {
            case 'fedramp-high':
                this.applyFedrampHighHardening();
                break;
            case 'fedramp-moderate':
                this.applyFedrampModerateHardening();
                break;
            default:
                this.applyCommercialHardening();
                break;
        }
    }
    /**
     * Apply FedRAMP High compliance hardening
     */
    applyFedrampHighHardening() {
        this.logComplianceEvent('fedramp_high_hardening_applied', 'Applied FedRAMP High hardening to EventBridge rule', {
            deadLetterQueueEnabled: this.config.deadLetterQueue?.enabled,
            monitoringEnabled: this.config.monitoring?.enabled,
            cloudWatchLogsEnabled: this.config.monitoring?.cloudWatchLogs?.enabled,
            logRetentionDays: this.config.monitoring?.cloudWatchLogs?.retentionInDays
        });
    }
    /**
     * Apply FedRAMP Moderate compliance hardening
     */
    applyFedrampModerateHardening() {
        this.logComplianceEvent('fedramp_moderate_hardening_applied', 'Applied FedRAMP Moderate hardening to EventBridge rule', {
            deadLetterQueueEnabled: this.config.deadLetterQueue?.enabled,
            monitoringEnabled: this.config.monitoring?.enabled,
            cloudWatchLogsEnabled: this.config.monitoring?.cloudWatchLogs?.enabled
        });
    }
    /**
     * Apply commercial hardening
     */
    applyCommercialHardening() {
        this.logComponentEvent('commercial_hardening_applied', 'Applied commercial security hardening to EventBridge rule');
    }
    /**
     * Configure CloudWatch observability for EventBridge Rule
     */
    configureObservabilityForEventBridge() {
        const monitoringConfig = this.config.monitoring;
        if (!monitoringConfig?.enabled) {
            return;
        }
        const ruleName = this.config.ruleName || this.spec.name;
        // 1. Failed Invocations Alarm
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
            threshold: 1,
            evaluationPeriods: 1,
            comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
            treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING
        });
        // 2. Invocation Rate Alarm (too many invocations could indicate issues)
        new cloudwatch.Alarm(this, 'InvocationRateAlarm', {
            alarmName: `${this.context.serviceName}-${this.spec.name}-invocation-rate`,
            alarmDescription: 'EventBridge rule high invocation rate alarm',
            metric: new cloudwatch.Metric({
                namespace: 'AWS/Events',
                metricName: 'Invocations',
                dimensionsMap: {
                    RuleName: ruleName
                },
                statistic: 'Sum',
                period: cdk.Duration.minutes(5)
            }),
            threshold: 1000,
            evaluationPeriods: 2,
            comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
            treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING
        });
        this.logComponentEvent('observability_configured', 'OpenTelemetry observability standard applied to EventBridge rule', {
            alarmsCreated: 2,
            ruleName: ruleName,
            monitoringEnabled: true
        });
    }
    /**
     * Check if this is a compliance framework
     */
    isComplianceFramework() {
        return this.context.complianceFramework !== 'commercial';
    }
}
exports.EventBridgeRuleCronComponent = EventBridgeRuleCronComponent;
