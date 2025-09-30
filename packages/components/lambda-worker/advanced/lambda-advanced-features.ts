/**
 * Lambda Advanced Features
 * 
 * Provides advanced Lambda features including:
 * - Dead Letter Queue (DLQ) configuration
 * - SQS event source integration
 * - EventBridge event source integration
 * - Advanced error handling patterns
 */

import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';

/**
 * Dead Letter Queue configuration
 */
export interface DeadLetterQueueConfig {
  /** Enable DLQ */
  enabled: boolean;

  /** DLQ queue name */
  queueName?: string;

  /** Maximum receive count before sending to DLQ */
  maxReceiveCount?: number;

  /** Message retention period in seconds */
  messageRetentionPeriod?: number;

  /** Visibility timeout in seconds */
  visibilityTimeout?: number;
}

/**
 * SQS Event Source configuration
 */
export interface SqsEventSourceConfig {
  /** SQS queue ARN */
  queueArn: string;

  /** Batch size for processing messages */
  batchSize?: number;

  /** Maximum batching window in seconds */
  maxBatchingWindow?: number;

  /** Maximum concurrency */
  maxConcurrency?: number;

  /** Enable partial batch failure reporting */
  reportBatchItemFailures?: boolean;

  /** Function response type */
  functionResponseType?: lambda.FunctionResponseType;
}

/**
 * EventBridge Event Source configuration
 */
export interface EventBridgeEventSourceConfig {
  /** Event pattern for matching events */
  eventPattern: events.EventPattern;

  /** Event bus ARN (optional, defaults to default bus) */
  eventBusArn?: string;

  /** Dead letter queue for failed events */
  deadLetterQueue?: sqs.IQueue;

  /** Maximum retry attempts */
  maxRetryAttempts?: number;

  /** Retry interval in seconds */
  retryInterval?: number;
}

/**
 * Advanced Lambda Features Manager
 * 
 * Manages advanced Lambda features including DLQ, SQS, and EventBridge integration
 */
export class LambdaAdvancedFeatures {
  private construct: Construct;
  private lambdaFunction: lambda.Function;
  private dlqQueue?: sqs.Queue;

  constructor(construct: Construct, lambdaFunction: lambda.Function) {
    this.construct = construct;
    this.lambdaFunction = lambdaFunction;
  }

  /**
   * Configure Dead Letter Queue for Lambda function
   */
  public configureDeadLetterQueue(config: DeadLetterQueueConfig): sqs.Queue | undefined {
    if (!config.enabled) {
      return undefined;
    }

    this.dlqQueue = new sqs.Queue(this.construct, 'LambdaDLQ', {
      queueName: config.queueName || `${this.lambdaFunction.functionName}-dlq`,
      retentionPeriod: cdk.Duration.seconds(config.messageRetentionPeriod || 1209600), // 14 days
      visibilityTimeout: cdk.Duration.seconds(config.visibilityTimeout || 30),
      encryption: sqs.QueueEncryption.SQS_MANAGED,
      encryptionMasterKey: undefined // Use SQS managed encryption
    });

    // Add DLQ permission to Lambda function
    this.lambdaFunction.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'sqs:SendMessage',
        'sqs:GetQueueAttributes'
      ],
      resources: [this.dlqQueue.queueArn]
    }));

    return this.dlqQueue;
  }

  /**
   * Configure SQS event source for Lambda function
   */
  public configureSqsEventSource(config: SqsEventSourceConfig): lambda.SqsEventSource {
    // Import existing SQS queue
    const queue = sqs.Queue.fromQueueArn(this.construct, 'SqsQueue', config.queueArn);

    // Create SQS event source
    const eventSource = new lambda.SqsEventSource(queue, {
      batchSize: config.batchSize || 10,
      maxBatchingWindow: cdk.Duration.seconds(config.maxBatchingWindow || 0),
      maxConcurrency: config.maxConcurrency,
      reportBatchItemFailures: config.reportBatchItemFailures !== false,
      functionResponseType: config.functionResponseType || lambda.FunctionResponseType.REPORT_BATCH_ITEM_FAILURES
    });

    // Add the event source to Lambda function
    this.lambdaFunction.addEventSource(eventSource);

    // Add SQS permissions to Lambda function
    this.lambdaFunction.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'sqs:ReceiveMessage',
        'sqs:DeleteMessage',
        'sqs:GetQueueAttributes',
        'sqs:ChangeMessageVisibility'
      ],
      resources: [config.queueArn]
    }));

    return eventSource;
  }

  /**
   * Configure EventBridge event source for Lambda function
   */
  public configureEventBridgeEventSource(config: EventBridgeEventSourceConfig): events.Rule {
    // Get event bus (default or custom)
    const eventBus = config.eventBusArn
      ? events.EventBus.fromEventBusArn(this.construct, 'EventBus', config.eventBusArn)
      : events.EventBus.defaultEventBus(this.construct);

    // Create EventBridge rule
    const rule = new events.Rule(this.construct, 'EventBridgeRule', {
      eventPattern: config.eventPattern,
      eventBus: eventBus,
      description: `EventBridge rule for ${this.lambdaFunction.functionName}`
    });

    // Configure Lambda target
    const lambdaTarget = new targets.LambdaFunction(this.lambdaFunction, {
      deadLetterQueue: config.deadLetterQueue,
      maxEventAge: cdk.Duration.hours(24),
      retryAttempts: config.maxRetryAttempts || 3
    });

    // Add Lambda as target to the rule
    rule.addTarget(lambdaTarget);

    // Add EventBridge permissions to Lambda function
    this.lambdaFunction.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'events:InvokeApiDestination',
        'events:PutEvents'
      ],
      resources: ['*'] // EventBridge requires wildcard for event publishing
    }));

    return rule;
  }

  /**
   * Configure Lambda function with comprehensive error handling
   */
  public configureErrorHandling(options: {
    enableDLQ?: boolean;
    enableRetry?: boolean;
    maxRetries?: number;
    retryBackoff?: boolean;
    logErrors?: boolean;
  }): void {
    const {
      enableDLQ = true,
      enableRetry = true,
      maxRetries = 3,
      retryBackoff = true,
      logErrors = true
    } = options;

    // Configure DLQ if enabled
    if (enableDLQ && !this.dlqQueue) {
      this.configureDeadLetterQueue({
        enabled: true,
        queueName: `${this.lambdaFunction.functionName}-error-dlq`
      });
    }

    // Add error handling environment variables
    this.lambdaFunction.addEnvironment('ERROR_HANDLING_ENABLED', 'true');
    this.lambdaFunction.addEnvironment('MAX_RETRIES', maxRetries.toString());
    this.lambdaFunction.addEnvironment('RETRY_BACKOFF_ENABLED', retryBackoff.toString());
    this.lambdaFunction.addEnvironment('LOG_ERRORS_ENABLED', logErrors.toString());

    if (this.dlqQueue) {
      this.lambdaFunction.addEnvironment('DLQ_QUEUE_URL', this.dlqQueue.queueUrl);
    }

    // Add CloudWatch Logs permissions for error logging
    if (logErrors) {
      this.lambdaFunction.addToRolePolicy(new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'logs:CreateLogGroup',
          'logs:CreateLogStream',
          'logs:PutLogEvents'
        ],
        resources: ['*']
      }));
    }
  }

  /**
   * Configure Lambda function with performance optimizations
   */
  public configurePerformanceOptimizations(options: {
    enableProvisionedConcurrency?: boolean;
    provisionedConcurrencyCount?: number;
    enableReservedConcurrency?: boolean;
    reservedConcurrencyLimit?: number;
    enableSnapStart?: boolean;
  }): void {
    const {
      enableProvisionedConcurrency = false,
      provisionedConcurrencyCount = 2,
      enableReservedConcurrency = false,
      reservedConcurrencyLimit = 100,
      enableSnapStart = false
    } = options;

    // Configure provisioned concurrency
    if (enableProvisionedConcurrency && provisionedConcurrencyCount > 0) {
      const alias = new lambda.Alias(this.construct, 'LambdaAlias', {
        aliasName: 'provisioned',
        version: this.lambdaFunction.currentVersion
      });

      alias.addAutoScaling({
        minCapacity: provisionedConcurrencyCount,
        maxCapacity: provisionedConcurrencyCount * 2
      });
    }

    // Configure reserved concurrency
    if (enableReservedConcurrency && reservedConcurrencyLimit > 0) {
      this.lambdaFunction.addReservedConcurrency(reservedConcurrencyLimit);
    }

    // Configure SnapStart for Java functions
    if (enableSnapStart && this.lambdaFunction.runtime.family === lambda.RuntimeFamily.JAVA) {
      this.lambdaFunction.addSnapStart(lambda.SnapStartConf.ON_PUBLISHED_VERSIONS);
    }
  }

  /**
   * Configure Lambda function with security enhancements
   */
  public configureSecurityEnhancements(options: {
    enableVPC?: boolean;
    vpcConfig?: {
      vpcId: string;
      subnetIds: string[];
      securityGroupIds: string[];
    };
    enableKMS?: boolean;
    kmsKeyArn?: string;
    enableSecretsManager?: boolean;
    secretsManagerSecretArn?: string;
  }): void {
    const {
      enableVPC = false,
      vpcConfig,
      enableKMS = false,
      kmsKeyArn,
      enableSecretsManager = false,
      secretsManagerSecretArn
    } = options;

    // Configure VPC
    if (enableVPC && vpcConfig) {
      // Note: VPC configuration should be done in the main Lambda function creation
      // This method adds VPC-related environment variables and permissions
      this.lambdaFunction.addEnvironment('VPC_ENABLED', 'true');
      this.lambdaFunction.addEnvironment('VPC_ID', vpcConfig.vpcId);
    }

    // Configure KMS encryption
    if (enableKMS && kmsKeyArn) {
      this.lambdaFunction.addEnvironment('KMS_ENABLED', 'true');
      this.lambdaFunction.addEnvironment('KMS_KEY_ARN', kmsKeyArn);

      // Add KMS permissions
      this.lambdaFunction.addToRolePolicy(new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'kms:Decrypt',
          'kms:GenerateDataKey'
        ],
        resources: [kmsKeyArn]
      }));
    }

    // Configure Secrets Manager
    if (enableSecretsManager && secretsManagerSecretArn) {
      this.lambdaFunction.addEnvironment('SECRETS_MANAGER_ENABLED', 'true');
      this.lambdaFunction.addEnvironment('SECRETS_MANAGER_SECRET_ARN', secretsManagerSecretArn);

      // Add Secrets Manager permissions
      this.lambdaFunction.addToRolePolicy(new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'secretsmanager:GetSecretValue',
          'secretsmanager:DescribeSecret'
        ],
        resources: [secretsManagerSecretArn]
      }));
    }
  }

  /**
   * Get the configured Dead Letter Queue
   */
  public getDeadLetterQueue(): sqs.Queue | undefined {
    return this.dlqQueue;
  }

  /**
   * Create a comprehensive monitoring dashboard for the Lambda function
   */
  public createMonitoringDashboard(): void {
    // This would create CloudWatch dashboards, alarms, and metrics
    // Implementation would depend on your monitoring requirements
    console.log(`Monitoring dashboard configuration for ${this.lambdaFunction.functionName}`);
  }
}
