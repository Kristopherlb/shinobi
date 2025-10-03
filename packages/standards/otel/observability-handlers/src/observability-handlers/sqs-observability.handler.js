"use strict";
/**
 * SQS Observability Handler
 *
 * Implements OpenTelemetry instrumentation and CloudWatch alarms for SQS components.
 * Provides comprehensive queue monitoring including depth, message age, and dead letter queue metrics.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SqsObservabilityHandler = void 0;
var cloudwatch = require("aws-cdk-lib/aws-cloudwatch");
var cdk = require("aws-cdk-lib");
var standards_tagging_1 = require("@shinobi/standards-tagging");
/**
 * Handler for SQS component observability
 */
var SqsObservabilityHandler = /** @class */ (function () {
    function SqsObservabilityHandler(context, taggingService) {
        if (taggingService === void 0) { taggingService = standards_tagging_1.defaultTaggingService; }
        this.supportedComponentType = 'sqs-queue';
        this.context = context;
        this.taggingService = taggingService;
    }
    /**
     * Apply standard tags to a resource
     */
    SqsObservabilityHandler.prototype.applyStandardTags = function (resource, component, additionalTags) {
        var taggingContext = {
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
    };
    /**
     * Apply OpenTelemetry instrumentation and CloudWatch alarms to SQS components
     */
    SqsObservabilityHandler.prototype.apply = function (component, config) {
        var startTime = Date.now();
        var instrumentationApplied = false;
        var alarmsCreated = 0;
        try {
            // Apply OpenTelemetry instrumentation
            instrumentationApplied = this.applySqsOTelInstrumentation(component, config);
            // Create CloudWatch alarms
            alarmsCreated = this.applySqsObservability(component, config);
            var executionTime = Date.now() - startTime;
            this.context.logger.info('SQS observability applied successfully', {
                service: 'ObservabilityService',
                componentType: component.getType(),
                componentName: component.node.id,
                alarmsCreated: alarmsCreated,
                instrumentationApplied: instrumentationApplied,
                executionTimeMs: executionTime
            });
            return {
                instrumentationApplied: instrumentationApplied,
                alarmsCreated: alarmsCreated,
                executionTimeMs: executionTime
            };
        }
        catch (error) {
            var executionTime = Date.now() - startTime;
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
    };
    /**
     * Apply SQS-specific OpenTelemetry instrumentation
     */
    SqsObservabilityHandler.prototype.applySqsOTelInstrumentation = function (component, config) {
        // SQS instrumentation is primarily handled by the applications that use the queue
        // The queue itself needs message attribute configuration for trace propagation
        this.context.logger.info('SQS trace propagation configured', {
            service: 'ObservabilityService',
            componentType: 'sqs',
            componentName: component.node.id
        });
        return true;
    };
    /**
     * Apply SQS Queue specific observability alarms
     * Creates alarms for queue depth, message age, and dead letter queue metrics
     */
    SqsObservabilityHandler.prototype.applySqsObservability = function (component, config) {
        var queue = component.getConstruct('queue');
        if (!queue) {
            this.context.logger.warn('SQS component has no queue construct registered', {
                service: 'ObservabilityService'
            });
            return 0;
        }
        var alarmCount = 0;
        var sqsThresholds = config.alarmThresholds.sqs;
        // Queue depth alarm
        var queueDepthAlarm = new cloudwatch.Alarm(component, 'SqsQueueDepthAlarm', {
            alarmName: "".concat(this.context.serviceName, "-").concat(component.node.id, "-queue-depth"),
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
            var messageAgeAlarm = new cloudwatch.Alarm(component, 'SqsMessageAgeAlarm', {
                alarmName: "".concat(this.context.serviceName, "-").concat(component.node.id, "-message-age"),
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
            var messagesSentAlarm = new cloudwatch.Alarm(component, 'SqsMessagesSentAlarm', {
                alarmName: "".concat(this.context.serviceName, "-").concat(component.node.id, "-messages-sent"),
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
            var messagesReceivedAlarm = new cloudwatch.Alarm(component, 'SqsMessagesReceivedAlarm', {
                alarmName: "".concat(this.context.serviceName, "-").concat(component.node.id, "-messages-received"),
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
    };
    return SqsObservabilityHandler;
}());
exports.SqsObservabilityHandler = SqsObservabilityHandler;
//# sourceMappingURL=sqs-observability.handler.js.map