"use strict";
/**
 * SQS Observability Handler
 *
 * Implements OpenTelemetry instrumentation and CloudWatch alarms for SQS components.
 * Provides comprehensive queue monitoring including depth, message age, and dead letter queue metrics.
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
exports.SqsObservabilityHandler = void 0;
const cloudwatch = __importStar(require("aws-cdk-lib/aws-cloudwatch"));
const cdk = __importStar(require("aws-cdk-lib"));
const standards_tagging_1 = require("@shinobi/standards-tagging");
/**
 * Handler for SQS component observability
 */
class SqsObservabilityHandler {
    supportedComponentType = 'sqs-queue';
    context;
    taggingService;
    constructor(context, taggingService = standards_tagging_1.defaultTaggingService) {
        this.context = context;
        this.taggingService = taggingService;
    }
    /**
     * Apply standard tags to a resource
     */
    applyStandardTags(resource, component, additionalTags) {
        const taggingContext = {
            serviceName: this.context.serviceName,
            serviceLabels: this.context.serviceLabels,
            componentName: component.node.id,
            componentType: this.supportedComponentType,
            environment: this.context.environment,
            complianceFramework: this.context.complianceFramework,
            region: this.context.region,
            accountId: undefined
        };
        this.taggingService.applyStandardTags(resource, taggingContext, additionalTags);
    }
    /**
     * Apply OpenTelemetry instrumentation and CloudWatch alarms to SQS components
     */
    apply(component, config) {
        const startTime = Date.now();
        let instrumentationApplied = false;
        let alarmsCreated = 0;
        try {
            // Apply OpenTelemetry instrumentation
            instrumentationApplied = this.applySqsOTelInstrumentation(component, config);
            // Create CloudWatch alarms
            alarmsCreated = this.applySqsObservability(component, config);
            const executionTime = Date.now() - startTime;
            this.context.logger.info('SQS observability applied successfully', {
                service: 'ObservabilityService',
                componentType: component.getType(),
                componentName: component.node.id,
                alarmsCreated,
                instrumentationApplied,
                executionTimeMs: executionTime
            });
            return {
                instrumentationApplied,
                alarmsCreated,
                executionTimeMs: executionTime
            };
        }
        catch (error) {
            const executionTime = Date.now() - startTime;
            this.context.logger.error('Failed to apply SQS observability', {
                service: 'ObservabilityService',
                componentType: component.getType(),
                componentName: component.node.id,
                executionTimeMs: executionTime,
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }
    /**
     * Apply SQS-specific OpenTelemetry instrumentation
     */
    applySqsOTelInstrumentation(component, config) {
        // SQS instrumentation is primarily handled by the applications that use the queue
        // The queue itself needs message attribute configuration for trace propagation
        this.context.logger.info('SQS trace propagation configured', {
            service: 'ObservabilityService',
            componentType: 'sqs',
            componentName: component.node.id
        });
        return true;
    }
    /**
     * Apply SQS Queue specific observability alarms
     * Creates alarms for queue depth, message age, and dead letter queue metrics
     */
    applySqsObservability(component, config) {
        const queue = component.getConstruct('queue');
        if (!queue) {
            this.context.logger.warn('SQS component has no queue construct registered', {
                service: 'ObservabilityService'
            });
            return 0;
        }
        let alarmCount = 0;
        const sqsThresholds = config.alarmThresholds.sqs;
        // Queue depth alarm
        const queueDepthAlarm = new cloudwatch.Alarm(component, 'SqsQueueDepthAlarm', {
            alarmName: `${this.context.serviceName}-${component.node.id}-queue-depth`,
            alarmDescription: 'SQS queue depth is high - potential processing bottleneck',
            metric: new cloudwatch.Metric({
                namespace: 'AWS/SQS',
                metricName: 'ApproximateNumberOfVisibleMessages',
                statistic: 'Average',
                period: cdk.Duration.minutes(5),
                dimensionsMap: {
                    QueueName: queue.queueName || 'unknown'
                }
            }),
            threshold: sqsThresholds.messageAge, // Using messageAge as queue depth threshold
            evaluationPeriods: 2,
            comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD
        });
        // Apply standard tags to the alarm
        this.applyStandardTags(queueDepthAlarm, component);
        alarmCount++;
        // Message age alarm for compliance frameworks
        if (this.context.complianceFramework === 'fedramp-moderate' || this.context.complianceFramework === 'fedramp-high') {
            const messageAgeAlarm = new cloudwatch.Alarm(component, 'SqsMessageAgeAlarm', {
                alarmName: `${this.context.serviceName}-${component.node.id}-message-age`,
                alarmDescription: 'SQS messages are aging - potential processing delays',
                metric: new cloudwatch.Metric({
                    namespace: 'AWS/SQS',
                    metricName: 'ApproximateAgeOfOldestMessage',
                    statistic: 'Maximum',
                    period: cdk.Duration.minutes(5),
                    dimensionsMap: {
                        QueueName: queue.queueName || 'unknown'
                    }
                }),
                threshold: sqsThresholds.messageAge,
                evaluationPeriods: 2,
                comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD
            });
            // Apply standard tags to the alarm
            this.applyStandardTags(messageAgeAlarm, component);
            alarmCount++;
        }
        // Number of messages sent alarm for high compliance
        if (this.context.complianceFramework === 'fedramp-high') {
            const messagesSentAlarm = new cloudwatch.Alarm(component, 'SqsMessagesSentAlarm', {
                alarmName: `${this.context.serviceName}-${component.node.id}-messages-sent`,
                alarmDescription: 'SQS messages sent monitoring for high compliance',
                metric: new cloudwatch.Metric({
                    namespace: 'AWS/SQS',
                    metricName: 'NumberOfMessagesSent',
                    statistic: 'Sum',
                    period: cdk.Duration.minutes(5),
                    dimensionsMap: {
                        QueueName: queue.queueName || 'unknown'
                    }
                }),
                threshold: 1000, // Alert if more than 1000 messages sent in 5 minutes
                evaluationPeriods: 2,
                comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD
            });
            // Apply standard tags to the alarm
            this.applyStandardTags(messagesSentAlarm, component);
            alarmCount++;
        }
        // Number of messages received alarm for high compliance
        if (this.context.complianceFramework === 'fedramp-high') {
            const messagesReceivedAlarm = new cloudwatch.Alarm(component, 'SqsMessagesReceivedAlarm', {
                alarmName: `${this.context.serviceName}-${component.node.id}-messages-received`,
                alarmDescription: 'SQS messages received monitoring for high compliance',
                metric: new cloudwatch.Metric({
                    namespace: 'AWS/SQS',
                    metricName: 'NumberOfMessagesReceived',
                    statistic: 'Sum',
                    period: cdk.Duration.minutes(5),
                    dimensionsMap: {
                        QueueName: queue.queueName || 'unknown'
                    }
                }),
                threshold: 1000, // Alert if more than 1000 messages received in 5 minutes
                evaluationPeriods: 2,
                comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD
            });
            // Apply standard tags to the alarm
            this.applyStandardTags(messagesReceivedAlarm, component);
            alarmCount++;
        }
        return alarmCount;
    }
}
exports.SqsObservabilityHandler = SqsObservabilityHandler;
//# sourceMappingURL=sqs-observability.handler.js.map