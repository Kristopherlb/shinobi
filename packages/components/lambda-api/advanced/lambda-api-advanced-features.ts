import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { IEventSource } from 'aws-cdk-lib/aws-lambda';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import { Construct } from 'constructs';
import { LambdaApiConfig } from '../src/lambda-api.builder';

export interface DeadLetterQueueConfig {
  enabled: boolean;
  maxReceiveCount?: number;
  retentionDays?: number;
  visibilityTimeoutSeconds?: number;
}

export interface EventSourceConfig {
  sqs: {
    enabled: boolean;
    queues: Array<{
      name: string;
      batchSize?: number;
      maximumBatchingWindowSeconds?: number;
      enabled?: boolean;
    }>;
  };
  eventBridge: {
    enabled: boolean;
    rules: Array<{
      name: string;
      eventPattern: events.EventPattern;
      enabled?: boolean;
    }>;
  };
}

export interface PerformanceOptimizationConfig {
  provisionedConcurrency: {
    enabled: boolean;
    minCapacity: number;
    maxCapacity: number;
    autoScaling: {
      enabled: boolean;
      targetUtilization: number;
      scaleOutCooldown: number;
      scaleInCooldown: number;
    };
  };
  reservedConcurrency: {
    enabled: boolean;
    reservedConcurrencyLimit: number;
  };
  snapStart: {
    enabled: boolean;
    optimizationTier: 'OPTIMIZE_FOR_LATENCY' | 'OPTIMIZE_FOR_DURATION';
  };
}

export interface CircuitBreakerConfig {
  enabled: boolean;
  failureThreshold: number;
  recoveryTimeoutSeconds: number;
  monitoringEnabled: boolean;
}

/**
 * Advanced features for Lambda API components including DLQ, event sources,
 * performance optimizations, and circuit breaker patterns
 */
export class LambdaApiAdvancedFeatures {
  private scope: Construct;
  private lambdaFunction: lambda.Function;
  private config: LambdaApiConfig;
  private context: any;

  // Advanced feature resources
  private deadLetterQueue?: sqs.Queue;
  private eventSources: Array<IEventSource> = [];
  private performanceAlarms: Array<cloudwatch.Alarm> = [];

  constructor(
    scope: Construct,
    lambdaFunction: lambda.Function,
    config: LambdaApiConfig,
    context: any
  ) {
    this.scope = scope;
    this.lambdaFunction = lambdaFunction;
    this.config = config;
    this.context = context;
  }

  /**
   * Configure Dead Letter Queue for Lambda function
   */
  public configureDeadLetterQueue(dlqConfig: DeadLetterQueueConfig): sqs.Queue | undefined {
    if (!dlqConfig.enabled) {
      return undefined;
    }

    // Create DLQ with appropriate configuration
    this.deadLetterQueue = new sqs.Queue(this.scope, 'LambdaApiDLQ', {
      queueName: `${this.config.functionName}-dlq`,
      retentionPeriod: cdk.Duration.days(dlqConfig.retentionDays || 14),
      visibilityTimeout: cdk.Duration.seconds(dlqConfig.visibilityTimeoutSeconds || 30),
      encryption: sqs.QueueEncryption.SQS_MANAGED,
      deadLetterQueue: undefined, // DLQ doesn't need its own DLQ
      // Note: Tags are applied via CDK tags, not in QueueProps
    });

    // Configure Lambda function to use DLQ
    this.lambdaFunction.addEventSourceMapping('DLQMapping', {
      eventSourceArn: this.deadLetterQueue.queueArn,
      batchSize: 1,
      enabled: false // DLQ is for failed messages, not active processing
    });

    // Create CloudWatch alarms for DLQ monitoring
    this.createDLQMonitoringAlarms();

    return this.deadLetterQueue;
  }

  /**
   * Configure event sources (SQS, EventBridge)
   */
  public configureEventSources(eventSourceConfig: EventSourceConfig): void {
    // Configure SQS event sources
    if (eventSourceConfig.sqs.enabled) {
      eventSourceConfig.sqs.queues.forEach(queueConfig => {
        const queue = new sqs.Queue(this.scope, `LambdaApiQueue-${queueConfig.name}`, {
          queueName: `${this.config.functionName}-${queueConfig.name}`,
          encryption: sqs.QueueEncryption.SQS_MANAGED,
          // Note: Tags are applied via CDK tags, not in QueueProps
        });

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
        this.createSQSM onitoringAlarms(queue, queueConfig.name);
      });
    }

    // Configure EventBridge event sources
    if (eventSourceConfig.eventBridge.enabled) {
      eventSourceConfig.eventBridge.rules.forEach(ruleConfig => {
        const rule = new events.Rule(this.scope, `LambdaApiRule-${ruleConfig.name}`, {
          ruleName: `${this.config.functionName}-${ruleConfig.name}`,
          eventPattern: ruleConfig.eventPattern,
          enabled: ruleConfig.enabled !== false,
          description: `EventBridge rule for ${this.config.functionName} - ${ruleConfig.name}`
        });

        // Add Lambda as target
        rule.addTarget(new targets.LambdaFunction(this.lambdaFunction, {
          retryAttempts: 3,
          maxEventAge: cdk.Duration.minutes(5)
        }));

        // Create monitoring alarms for EventBridge
        this.createEventBridgeMonitoringAlarms(rule, ruleConfig.name);
      });
    }
  }

  /**
   * Configure performance optimizations
   */
  public configurePerformanceOptimizations(perfConfig: PerformanceOptimizationConfig): void {
    // Configure provisioned concurrency
    if (perfConfig.provisionedConcurrency.enabled) {
      // Note: Provisioned concurrency configuration is complex and requires additional setup
      // This is a simplified implementation for demonstration
      const alias = new lambda.Alias(this.scope, 'LambdaApiAlias', {
        aliasName: 'PROVISIONED',
        version: this.lambdaFunction.currentVersion
      });

      // Create monitoring alarms for provisioned concurrency
      this.createProvisionedConcurrencyMonitoringAlarms(alias);
    }

    // Configure reserved concurrency
    if (perfConfig.reservedConcurrency.enabled) {
      // Note: Reserved concurrency is set during function creation, not after
      // This would need to be handled in the main component
    }

    // Configure SnapStart (Java only)
    if (perfConfig.snapStart.enabled && this.config.runtime.includes('java')) {
      // Note: SnapStart configuration is set during function creation, not after
      // This would need to be handled in the main component
    }
  }

  /**
   * Configure circuit breaker pattern
   */
  public configureCircuitBreaker(circuitBreakerConfig: CircuitBreakerConfig): void {
    if (!circuitBreakerConfig.enabled) {
      return;
    }

    // Create circuit breaker state machine (simplified implementation)
    // In a real implementation, you might use Step Functions or a custom solution
    this.createCircuitBreakerMonitoring(circuitBreakerConfig);
  }

  /**
   * Create DLQ monitoring alarms
   */
  private createDLQMonitoringAlarms(): void {
    if (!this.deadLetterQueue) {
      return;
    }

    // DLQ message count alarm
    const dlqMessageCountAlarm = new cloudwatch.Alarm(this.scope, 'LambdaApiDLQMessageCount', {
      alarmName: `${this.config.functionName}-dlq-message-count`,
      alarmDescription: 'Lambda API DLQ message count is high',
      metric: this.deadLetterQueue.metricApproximateNumberOfMessagesDelayed(),
      threshold: 1,
      evaluationPeriods: 1,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD
    });

    this.performanceAlarms.push(dlqMessageCountAlarm);

    // DLQ age alarm
    const dlqAgeAlarm = new cloudwatch.Alarm(this.scope, 'LambdaApiDLQAge', {
      alarmName: `${this.config.functionName}-dlq-age`,
      alarmDescription: 'Lambda API DLQ message age is high',
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
  private createSQSM onitoringAlarms(queue: sqs.Queue, queueName: string): void {
    // SQS queue depth alarm
    const queueDepthAlarm = new cloudwatch.Alarm(this.scope, `LambdaApiSQSDepth-${queueName}`, {
      alarmName: `${this.config.functionName}-sqs-${queueName}-depth`,
      alarmDescription: `Lambda API SQS queue ${queueName} depth is high`,
      metric: queue.metricApproximateNumberOfMessagesDelayed(),
      threshold: 100,
      evaluationPeriods: 2,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD
    });

    this.performanceAlarms.push(queueDepthAlarm);

    // SQS processing time alarm
    const processingTimeAlarm = new cloudwatch.Alarm(this.scope, `LambdaApiSQSProcessingTime-${queueName}`, {
      alarmName: `${this.config.functionName}-sqs-${queueName}-processing-time`,
      alarmDescription: `Lambda API SQS queue ${queueName} processing time is high`,
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
  private createEventBridgeMonitoringAlarms(rule: events.Rule, ruleName: string): void {
    // EventBridge rule invocations alarm
    const invocationsAlarm = new cloudwatch.Alarm(this.scope, `LambdaApiEventBridgeInvocations-${ruleName}`, {
      alarmName: `${this.config.functionName}-eventbridge-${ruleName}-invocations`,
      alarmDescription: `Lambda API EventBridge rule ${ruleName} invocations are high`,
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
  private createProvisionedConcurrencyMonitoringAlarms(alias: lambda.Alias): void {
    // Provisioned concurrency utilization alarm
    const utilizationAlarm = new cloudwatch.Alarm(this.scope, 'LambdaApiProvisionedConcurrencyUtilization', {
      alarmName: `${this.config.functionName}-provisioned-concurrency-utilization`,
      alarmDescription: 'Lambda API provisioned concurrency utilization is high',
      metric: new cloudwatch.Metric({
        namespace: 'AWS/Lambda',
        metricName: 'ProvisionedConcurrencyUtilization',
        dimensionsMap: {
          FunctionName: this.config.functionName,
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
  private createCircuitBreakerMonitoring(circuitBreakerConfig: CircuitBreakerConfig): void {
    if (!circuitBreakerConfig.monitoringEnabled) {
      return;
    }

    // Circuit breaker failure rate alarm
    const failureRateAlarm = new cloudwatch.Alarm(this.scope, 'LambdaApiCircuitBreakerFailureRate', {
      alarmName: `${this.config.functionName}-circuit-breaker-failure-rate`,
      alarmDescription: 'Lambda API circuit breaker failure rate is high',
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
  public getPerformanceAlarms(): cloudwatch.Alarm[] {
    return this.performanceAlarms;
  }

  /**
   * Get DLQ for external configuration
   */
  public getDeadLetterQueue(): sqs.Queue | undefined {
    return this.deadLetterQueue;
  }

  /**
   * Get event sources for external configuration
   */
  public getEventSources(): IEventSource[] {
    return this.eventSources;
  }
}
