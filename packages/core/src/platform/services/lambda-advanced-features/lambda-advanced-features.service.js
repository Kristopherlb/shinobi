import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as iam from 'aws-cdk-lib/aws-iam';
/**
 * Lambda Advanced Features Service
 *
 * Platform-level service providing advanced Lambda features including:
 * - Dead Letter Queue (DLQ) configuration
 * - Event source integration (SQS, EventBridge)
 * - Performance optimizations (provisioned concurrency, reserved concurrency, SnapStart)
 * - Circuit breaker patterns
 * - Security enhancements
 * - Error handling patterns
 * - Comprehensive monitoring and alerting
 */
export class LambdaAdvancedFeaturesService {
    scope;
    lambdaFunction;
    context;
    componentType;
    // Advanced feature resources
    deadLetterQueue;
    eventSources = [];
    performanceAlarms = [];
    securityEnhancements = [];
    constructor(scope, lambdaFunction, context, componentType) {
        this.scope = scope;
        this.lambdaFunction = lambdaFunction;
        this.context = context;
        this.componentType = componentType;
    }
    /**
     * Configure Dead Letter Queue for Lambda function
     */
    configureDeadLetterQueue(dlqConfig) {
        if (!dlqConfig.enabled) {
            return undefined;
        }
        const queueName = dlqConfig.queueName || `${this.lambdaFunction.functionName}-dlq`;
        // Create DLQ with appropriate configuration
        this.deadLetterQueue = new sqs.Queue(this.scope, 'LambdaDLQ', {
            queueName,
            retentionPeriod: cdk.Duration.days(dlqConfig.retentionDays || 14),
            visibilityTimeout: cdk.Duration.seconds(dlqConfig.visibilityTimeoutSeconds || 30),
            encryption: sqs.QueueEncryption.SQS_MANAGED,
            deadLetterQueue: undefined, // DLQ doesn't need its own DLQ
        });
        // Apply tags
        cdk.Tags.of(this.deadLetterQueue).add('Service', this.context.serviceName);
        cdk.Tags.of(this.deadLetterQueue).add('Environment', this.context.environment);
        cdk.Tags.of(this.deadLetterQueue).add('Component', this.componentType);
        cdk.Tags.of(this.deadLetterQueue).add('Feature', 'dead-letter-queue');
        cdk.Tags.of(this.deadLetterQueue).add('ManagedBy', 'Shinobi');
        // Create CloudWatch alarms for DLQ monitoring
        this.createDLQMonitoringAlarms();
        return this.deadLetterQueue;
    }
    /**
     * Configure SQS event sources
     */
    configureSqsEventSources(sqsConfig) {
        if (!sqsConfig.enabled) {
            return;
        }
        sqsConfig.queues.forEach(queueConfig => {
            let queue;
            if (queueConfig.queueArn) {
                // Use existing queue
                queue = sqs.Queue.fromQueueArn(this.scope, `ExistingQueue-${queueConfig.name}`, queueConfig.queueArn);
            }
            else {
                // Create new queue
                queue = new sqs.Queue(this.scope, `LambdaQueue-${queueConfig.name}`, {
                    queueName: `${this.lambdaFunction.functionName}-${queueConfig.name}`,
                    encryption: sqs.QueueEncryption.SQS_MANAGED,
                });
                // Apply tags
                cdk.Tags.of(queue).add('Service', this.context.serviceName);
                cdk.Tags.of(queue).add('Environment', this.context.environment);
                cdk.Tags.of(queue).add('Component', this.componentType);
                cdk.Tags.of(queue).add('Feature', 'sqs-event-source');
                cdk.Tags.of(queue).add('ManagedBy', 'Shinobi');
            }
            // Create event source mapping
            const eventSourceMapping = new lambda.EventSourceMapping(this.scope, `EventSourceMapping-${queueConfig.name}`, {
                target: this.lambdaFunction,
                eventSourceArn: queue.queueArn,
                batchSize: queueConfig.batchSize || 10,
                maxBatchingWindow: cdk.Duration.seconds(queueConfig.maximumBatchingWindowSeconds || 5),
                enabled: queueConfig.enabled !== false,
                reportBatchItemFailures: true
            });
            this.eventSources.push(eventSourceMapping);
            // Create monitoring alarms for SQS
            this.createSqsMonitoringAlarms(queue, queueConfig.name);
        });
    }
    /**
     * Configure EventBridge event sources
     */
    configureEventBridgeEventSources(eventBridgeConfig) {
        if (!eventBridgeConfig.enabled) {
            return;
        }
        eventBridgeConfig.rules.forEach(ruleConfig => {
            const rule = new events.Rule(this.scope, `LambdaRule-${ruleConfig.name}`, {
                ruleName: `${this.lambdaFunction.functionName}-${ruleConfig.name}`,
                eventPattern: ruleConfig.eventPattern,
                enabled: ruleConfig.enabled !== false,
                description: `EventBridge rule for ${this.lambdaFunction.functionName} - ${ruleConfig.name}`
            });
            // Add Lambda as target
            rule.addTarget(new targets.LambdaFunction(this.lambdaFunction, {
                retryAttempts: 3,
                maxEventAge: cdk.Duration.minutes(5)
            }));
            // Apply tags
            cdk.Tags.of(rule).add('Service', this.context.serviceName);
            cdk.Tags.of(rule).add('Environment', this.context.environment);
            cdk.Tags.of(rule).add('Component', this.componentType);
            cdk.Tags.of(rule).add('Feature', 'eventbridge-event-source');
            cdk.Tags.of(rule).add('ManagedBy', 'Shinobi');
            // Create monitoring alarms for EventBridge
            this.createEventBridgeMonitoringAlarms(rule, ruleConfig.name);
        });
    }
    /**
     * Configure performance optimizations
     */
    configurePerformanceOptimizations(perfConfig) {
        // Configure provisioned concurrency
        if (perfConfig.provisionedConcurrency.enabled) {
            // Note: Provisioned concurrency configuration is complex and requires additional setup
            // This is a simplified implementation for demonstration
            const alias = new lambda.Alias(this.scope, 'LambdaAlias', {
                aliasName: 'PROVISIONED',
                version: this.lambdaFunction.currentVersion
            });
            // Apply tags
            cdk.Tags.of(alias).add('Service', this.context.serviceName);
            cdk.Tags.of(alias).add('Environment', this.context.environment);
            cdk.Tags.of(alias).add('Component', this.componentType);
            cdk.Tags.of(alias).add('Feature', 'provisioned-concurrency');
            cdk.Tags.of(alias).add('ManagedBy', 'Shinobi');
            // Create monitoring alarms for provisioned concurrency
            this.createProvisionedConcurrencyMonitoringAlarms(alias);
        }
        // Configure reserved concurrency
        if (perfConfig.reservedConcurrency.enabled) {
            // Note: Reserved concurrency is set during function creation, not after
            // This would need to be handled in the main component
        }
        // Configure SnapStart (Java only)
        if (perfConfig.snapStart.enabled && this.lambdaFunction.runtime.family === lambda.RuntimeFamily.JAVA) {
            // Note: SnapStart configuration is set during function creation, not after
            // This would need to be handled in the main component
        }
    }
    /**
     * Configure circuit breaker pattern
     */
    configureCircuitBreaker(circuitBreakerConfig) {
        if (!circuitBreakerConfig.enabled) {
            return;
        }
        // Create circuit breaker state machine (simplified implementation)
        // In a real implementation, you might use Step Functions or a custom solution
        this.createCircuitBreakerMonitoring(circuitBreakerConfig);
    }
    /**
     * Configure security enhancements
     */
    configureSecurityEnhancements(securityConfig) {
        // VPC configuration is handled during function creation
        // This method can be used to add additional security policies
        if (securityConfig.encryption.enabled && securityConfig.encryption.kmsKeyId) {
            // Add KMS permissions
            this.securityEnhancements.push(new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: [
                    'kms:Decrypt',
                    'kms:DescribeKey',
                    'kms:GenerateDataKey'
                ],
                resources: [securityConfig.encryption.kmsKeyId]
            }));
        }
        if (securityConfig.secretsManager.enabled && securityConfig.secretsManager.secretArn) {
            // Add Secrets Manager permissions
            this.securityEnhancements.push(new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: [
                    'secretsmanager:GetSecretValue',
                    'secretsmanager:DescribeSecret'
                ],
                resources: [securityConfig.secretsManager.secretArn]
            }));
        }
    }
    /**
     * Configure error handling patterns
     */
    configureErrorHandling(errorHandlingConfig) {
        // Error handling configuration is primarily handled through DLQ and retry policies
        // This method can be used to configure additional error handling patterns
        if (errorHandlingConfig.enableRetry) {
            // Configure retry policies for event sources
            this.eventSources.forEach(eventSource => {
                if (eventSource instanceof lambda.EventSourceMapping) {
                    // Event source mappings can be configured with retry policies
                    // This is a simplified implementation
                }
            });
        }
    }
    /**
     * Create DLQ monitoring alarms
     */
    createDLQMonitoringAlarms() {
        if (!this.deadLetterQueue) {
            return;
        }
        // DLQ message count alarm
        const dlqMessageCountAlarm = new cloudwatch.Alarm(this.scope, 'LambdaDLQMessageCount', {
            alarmName: `${this.lambdaFunction.functionName}-dlq-message-count`,
            alarmDescription: 'Lambda DLQ message count is high',
            metric: this.deadLetterQueue.metricApproximateNumberOfMessagesDelayed(),
            threshold: 1,
            evaluationPeriods: 1,
            treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
            comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD
        });
        this.performanceAlarms.push(dlqMessageCountAlarm);
        // DLQ age alarm
        const dlqAgeAlarm = new cloudwatch.Alarm(this.scope, 'LambdaDLQAge', {
            alarmName: `${this.lambdaFunction.functionName}-dlq-age`,
            alarmDescription: 'Lambda DLQ message age is high',
            metric: this.deadLetterQueue.metricApproximateAgeOfOldestMessage(),
            threshold: 300, // 5 minutes
            evaluationPeriods: 1,
            treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
            comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD
        });
        this.performanceAlarms.push(dlqAgeAlarm);
    }
    /**
     * Create SQS monitoring alarms
     */
    createSqsMonitoringAlarms(queue, queueName) {
        // SQS queue depth alarm
        const queueDepthAlarm = new cloudwatch.Alarm(this.scope, `LambdaSQSDepth-${queueName}`, {
            alarmName: `${this.lambdaFunction.functionName}-sqs-${queueName}-depth`,
            alarmDescription: `Lambda SQS queue ${queueName} depth is high`,
            metric: queue.metricApproximateNumberOfMessagesDelayed(),
            threshold: 100,
            evaluationPeriods: 2,
            treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
            comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD
        });
        this.performanceAlarms.push(queueDepthAlarm);
        // SQS processing time alarm
        const processingTimeAlarm = new cloudwatch.Alarm(this.scope, `LambdaSQSProcessingTime-${queueName}`, {
            alarmName: `${this.lambdaFunction.functionName}-sqs-${queueName}-processing-time`,
            alarmDescription: `Lambda SQS queue ${queueName} processing time is high`,
            metric: queue.metricApproximateAgeOfOldestMessage(),
            threshold: 300, // 5 minutes
            evaluationPeriods: 2,
            treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
            comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD
        });
        this.performanceAlarms.push(processingTimeAlarm);
    }
    /**
     * Create EventBridge monitoring alarms
     */
    createEventBridgeMonitoringAlarms(rule, ruleName) {
        // EventBridge rule invocations alarm
        const invocationsAlarm = new cloudwatch.Alarm(this.scope, `LambdaEventBridgeInvocations-${ruleName}`, {
            alarmName: `${this.lambdaFunction.functionName}-eventbridge-${ruleName}-invocations`,
            alarmDescription: `Lambda EventBridge rule ${ruleName} invocations are high`,
            metric: new cloudwatch.Metric({
                namespace: 'AWS/Events',
                metricName: 'Invocations',
                dimensionsMap: {
                    RuleName: rule.ruleName
                }
            }),
            threshold: 1000,
            evaluationPeriods: 1,
            treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
            comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD
        });
        this.performanceAlarms.push(invocationsAlarm);
    }
    /**
     * Create provisioned concurrency monitoring alarms
     */
    createProvisionedConcurrencyMonitoringAlarms(alias) {
        // Provisioned concurrency utilization alarm
        const utilizationAlarm = new cloudwatch.Alarm(this.scope, 'LambdaProvisionedConcurrencyUtilization', {
            alarmName: `${this.lambdaFunction.functionName}-provisioned-concurrency-utilization`,
            alarmDescription: 'Lambda provisioned concurrency utilization is high',
            metric: new cloudwatch.Metric({
                namespace: 'AWS/Lambda',
                metricName: 'ProvisionedConcurrencyUtilization',
                dimensionsMap: {
                    FunctionName: this.lambdaFunction.functionName,
                    Alias: alias.aliasName
                }
            }),
            threshold: 80,
            evaluationPeriods: 2,
            treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
            comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD
        });
        this.performanceAlarms.push(utilizationAlarm);
    }
    /**
     * Create circuit breaker monitoring
     */
    createCircuitBreakerMonitoring(circuitBreakerConfig) {
        if (!circuitBreakerConfig.monitoringEnabled) {
            return;
        }
        // Circuit breaker failure rate alarm
        const failureRateAlarm = new cloudwatch.Alarm(this.scope, 'LambdaCircuitBreakerFailureRate', {
            alarmName: `${this.lambdaFunction.functionName}-circuit-breaker-failure-rate`,
            alarmDescription: 'Lambda circuit breaker failure rate is high',
            metric: this.lambdaFunction.metricErrors(),
            threshold: circuitBreakerConfig.failureThreshold,
            evaluationPeriods: 2,
            treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
            comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD
        });
        this.performanceAlarms.push(failureRateAlarm);
    }
    /**
     * Get all created alarms for external monitoring setup
     */
    getPerformanceAlarms() {
        return this.performanceAlarms;
    }
    /**
     * Get DLQ for external configuration
     */
    getDeadLetterQueue() {
        return this.deadLetterQueue;
    }
    /**
     * Get event sources for external configuration
     */
    getEventSources() {
        return this.eventSources;
    }
    /**
     * Get security enhancement policies
     */
    getSecurityEnhancementPolicies() {
        return this.securityEnhancements;
    }
    /**
     * Factory method for Lambda API components
     */
    static createForApi(scope, lambdaFunction, context) {
        return new LambdaAdvancedFeaturesService(scope, lambdaFunction, context, 'lambda-api');
    }
    /**
     * Factory method for Lambda Worker components
     */
    static createForWorker(scope, lambdaFunction, context) {
        return new LambdaAdvancedFeaturesService(scope, lambdaFunction, context, 'lambda-worker');
    }
}
//# sourceMappingURL=lambda-advanced-features.service.js.map