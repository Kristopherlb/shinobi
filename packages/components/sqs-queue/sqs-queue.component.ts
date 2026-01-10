/**
 * SQS Queue Component implementing Platform Component API Contract v1.1
 * 
 * SQS message queue with compliance hardening and DLQ support
 * 
 * @author Platform Team
 * @category messaging
 * @service SQS
 */

import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { BaseComponent } from '@shinobi/core';
import {
  ComponentSpec,
  ComponentContext,
  ComponentCapabilities
} from '@shinobi/core';
import { 
  SqsQueueConfig, 
  SqsQueueConfigBuilder 
} from './sqs-queue.builder.js';

/**
 * SQS Queue Component
 * 
 * Extends BaseComponent and implements the Platform Component API Contract.
 * Provides SQS message queue with compliance hardening and DLQ support functionality with:
 * - Production-ready defaults
 * - Compliance framework support (Commercial, FedRAMP)
 * - Integrated monitoring and observability
 * - Security-first configuration
 */
export class SqsQueueComponent extends BaseComponent {
  
  /** Final resolved configuration */
  private config!: SqsQueueConfig;
  
  /** Main SQS queue construct */
  private queue!: sqs.Queue;
  
  /** Dead letter queue (if enabled) */
  private deadLetterQueue?: sqs.Queue;
  
  /** KMS key for encryption (if customer-managed) */
  private kmsKey?: kms.IKey;
  private managedKmsKey?: kms.Key;
  private kmsKeyAlias?: kms.Alias;
  
  /** CloudWatch dashboard for queue metrics */
  private dashboard?: cloudwatch.Dashboard;
  
  /** CloudWatch alarms for queue metrics */
  private queueDepthAlarm?: cloudwatch.Alarm;
  private messageAgeAlarm?: cloudwatch.Alarm;
  private inFlightAlarm?: cloudwatch.Alarm;
  
  /**
   * Constructor
   */
  constructor(scope: Construct, id: string, context: ComponentContext, spec: ComponentSpec) {
    super(scope, id, context, spec);
  }
  
  /**
   * Component type identifier
   */
  public getType(): string {
    return 'sqs-queue';
  }
  
  /**
   * Main synthesis method
   * 
   * Follows the exact sequence defined in the Platform Component API Contract:
   * 1. Build configuration using ConfigBuilder
   * 2. Create helper resources (KMS keys, log groups, etc.)
   * 3. Create main AWS resources
   * 4. Apply standard tags to all resources
   * 5. Register constructs
   * 6. Register capabilities
   */
  public synth(): void {
    this.logComponentEvent('synthesis_start', 'Starting SQS queue component synthesis', {
      component: {
        name: this.spec.name,
        type: this.getType()
      },
      context: {
        environment: this.context.environment,
        complianceFramework: this.context.complianceFramework
      }
    });
    
    try {
      // Step 1: Build configuration using ConfigBuilder
      const configBuilder = new SqsQueueConfigBuilder(this.context, this.spec);
      this.config = configBuilder.buildSync();
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/31cd8a5c-c5a9-4c85-9dba-5f04dc91dc42',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'sqs-queue.component.ts:93',message:'config built',data:{encryptionEnabled:this.config.encryption?.enabled,dlqEnabled:this.config.deadLetterQueue?.enabled,highRisk:this.config.highRiskEnvironment},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      
      // Step 2: Create helper resources (KMS keys, etc.)
      this.createKmsKeyIfNeeded();
      
      // Step 3: Create main AWS resources (DLQ first, then main queue)
      this.createDeadLetterQueueIfNeeded();
      this.createMainQueue();
      
      // Step 3.5: Configure DLQ redrive policy for operational recovery
      this.configureDlqRedrivePolicy();
      
      // Step 3.6: Configure monitoring and alarms
      this.configureMonitoring();
      
      // Step 3.7: Configure OpenTelemetry observability
      this.configureObservabilityForQueue();
      
      // Step 3.8: Create CloudWatch dashboard
      this.createCloudWatchDashboard();
      
      // Step 4: Apply standard tags to all resources
      this.applyStandardTags(this.queue);
      if (this.deadLetterQueue) {
        this.applyStandardTags(this.deadLetterQueue);
      }
      if (this.managedKmsKey) {
        this.applyStandardTags(this.managedKmsKey);
      }
      if (this.kmsKeyAlias) {
        this.applyStandardTags(this.kmsKeyAlias);
      }
      
      // Step 5: Register constructs
      this.registerConstruct('main', this.queue);
      if (this.deadLetterQueue) {
        this.registerConstruct('deadLetterQueue', this.deadLetterQueue);
      }
      if (this.managedKmsKey) {
        this.registerConstruct('kmsKey', this.managedKmsKey);
      }
      if (this.kmsKeyAlias) {
        this.registerConstruct('kmsKeyAlias', this.kmsKeyAlias);
      }
      
      // Step 6: Register capabilities
      this.registerCapabilities();
      
      this.logComponentEvent('synthesis_complete', 'SQS queue component synthesis completed successfully');
    } catch (error) {
      this.logError(error as Error, 'Component synthesis');
      throw error;
    }
  }
  
  /**
   * Creates KMS key if customer-managed encryption is required
   */
  private createKmsKeyIfNeeded(): void {
    if (!this.shouldUseCustomerManagedKey()) {
      return;
    }
    
    if (this.config.encryption?.kmsKeyId) {
      // Use existing KMS key
      this.kmsKey = kms.Key.fromKeyArn(
        this,
        'ImportedQueueKey',
        this.config.encryption.kmsKeyId
      );
      return;
    }
    
    // Create new KMS key
    this.managedKmsKey = new kms.Key(this, 'QueueEncryptionKey', {
      description: `Encryption key for ${this.spec.name} SQS queue`,
      enableKeyRotation: this.config.encryption?.enableKeyRotation ?? false,
      keyUsage: kms.KeyUsage.ENCRYPT_DECRYPT,
      keySpec: kms.KeySpec.SYMMETRIC_DEFAULT
    });
    
    // Create alias for easier identification
    this.kmsKeyAlias = new kms.Alias(this, 'QueueEncryptionKeyAlias', {
      aliasName: `alias/${this.context.serviceName}-${this.spec.name}-sqs-queue`,
      targetKey: this.managedKmsKey
    });
    
    // Grant SQS service access to the key
    this.managedKmsKey.addToResourcePolicy(new iam.PolicyStatement({
      sid: 'AllowSqsServiceAccess',
      principals: [new iam.ServicePrincipal('sqs.amazonaws.com')],
      actions: [
        'kms:Decrypt',
        'kms:GenerateDataKey*',
        'kms:ReEncrypt*',
        'kms:DescribeKey'
      ],
      resources: ['*']
    }));
    
    this.kmsKey = this.managedKmsKey;
  }
  
  /**
   * Determines if customer-managed KMS key should be used
   * 
   * Creates a KMS key when encryption is enabled in config.
   * Configuration layers (platform defaults, environment defaults, component overrides)
   * handle compliance requirements via risk-based flags (highRiskEnvironment).
   */
  private shouldUseCustomerManagedKey(): boolean {
    // Use config value - compliance logic is in ConfigBuilder
    return this.config.encryption?.enabled === true;
  }
  
  /**
   * Creates the main SQS queue
   */
  private createMainQueue(): void {
    this.logComponentEvent('sqs_queue_creation_start', 'Creating SQS queue');
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/31cd8a5c-c5a9-4c85-9dba-5f04dc91dc42',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'sqs-queue.component.ts:202',message:'createMainQueue entry',data:{encryptionEnabled:this.config.encryption?.enabled,hasKmsKey:!!this.kmsKey},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    
    // Queue naming: use explicit name if provided, otherwise auto-generate
    // Note: Environment-specific naming requirements should be handled via configuration layers
    // (environment defaults in service.yml, platform defaults, etc.), not code conditionals
    const queueName = this.config.queueName; // undefined means CDK will auto-generate
    
    const encryptionType = this.config.encryption?.enabled && this.kmsKey
      ? sqs.QueueEncryption.KMS
      : sqs.QueueEncryption.UNENCRYPTED;
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/31cd8a5c-c5a9-4c85-9dba-5f04dc91dc42',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'sqs-queue.component.ts:210',message:'queue encryption decision',data:{encryptionType,encryptionEnabled:this.config.encryption?.enabled,hasKmsKey:!!this.kmsKey},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    
    // Build queue props - only include encryptionMasterKey when encryption is KMS and key exists
    const queueProps: sqs.QueueProps = {
      queueName: queueName, // undefined = auto-generate, string = explicit name
      visibilityTimeout: cdk.Duration.seconds(this.config.visibilityTimeoutSeconds || 30),
      retentionPeriod: cdk.Duration.days(this.config.messageRetentionDays || 4),
      receiveMessageWaitTime: cdk.Duration.seconds(this.config.receiveMessageWaitTimeSeconds || 0),
      encryption: encryptionType,
      ...(encryptionType === sqs.QueueEncryption.KMS && this.kmsKey
        ? { encryptionMasterKey: this.kmsKey }
        : {}),
      deadLetterQueue: this.deadLetterQueue ? {
        maxReceiveCount: this.config.deadLetterQueue?.maxReceiveCount || 3,
        queue: this.deadLetterQueue
      } : undefined,
    };
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/31cd8a5c-c5a9-4c85-9dba-5f04dc91dc42',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'sqs-queue.component.ts:243',message:'queue props before creation',data:{encryption:encryptionType,hasEncryptionMasterKey:!!queueProps.encryptionMasterKey,kmsKeyArn:this.kmsKey?.keyArn},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
    // #endregion
    
    this.queue = new sqs.Queue(this, 'Queue', queueProps);
    
    // Enable detailed metrics if configured (SQS detailed metrics are always available but may incur costs)
    if (this.config.monitoring?.detailedMetrics) {
      // SQS detailed metrics are automatically available for all queues
      // No additional configuration needed - metrics are available in CloudWatch
      this.logComponentEvent('detailed_metrics_enabled', 'Detailed CloudWatch metrics enabled for SQS queue', {
        queueName: this.queue.queueName,
        note: 'Detailed metrics may incur additional CloudWatch costs'
      });
    }
    
    this.logComponentEvent('sqs_queue_creation_complete', 'SQS queue created successfully', {
      queueName: this.queue.queueName,
      queueArn: this.queue.queueArn
    });
  }
  
  /**
   * Creates dead letter queue if configured
   */
  private createDeadLetterQueueIfNeeded(): void {
    if (!this.config.deadLetterQueue?.enabled) {
      return;
    }
    
    const queueName = this.config.queueName || `${this.context.serviceName}-${this.spec.name}`;
    const dlqName = `${queueName}-dlq`;
    
    const dlqProps: sqs.QueueProps = {
      queueName: dlqName,
      retentionPeriod: cdk.Duration.days(this.config.deadLetterQueue.retentionDays || 14),
      encryption: this.config.encryption?.enabled && this.kmsKey
        ? sqs.QueueEncryption.KMS
        : sqs.QueueEncryption.UNENCRYPTED,
      encryptionMasterKey: this.kmsKey,
    };
    
    this.deadLetterQueue = new sqs.Queue(this, 'DeadLetterQueue', dlqProps);
    
    this.logComponentEvent('dlq_creation_complete', 'Dead letter queue created successfully', {
      dlqName: this.deadLetterQueue.queueName,
      dlqArn: this.deadLetterQueue.queueArn
    });
  }
  
  /**
   * Configures DLQ redrive capability for operational recovery
   * 
   * Note: SQS redrive is a queue-level feature that allows messages to be moved
   * from DLQ back to the source queue. This is typically done via:
   * - AWS Console: DLQ → Start DLQ Redrive
   * - AWS CLI: aws sqs start-message-move-task
   * - AWS SDK: StartMessageMoveTask API
   * 
   * The DLQ is automatically configured to allow redrive operations.
   * 
   * Required IAM permissions for redrive operations:
   * - sqs:StartMessageMoveTask (on DLQ)
   * - sqs:SendMessage (on source queue)
   * - sqs:GetQueueAttributes (on both queues)
   * 
   * These permissions should be granted to operational roles via bindings or IAM policies.
   */
  private configureDlqRedrivePolicy(): void {
    if (!this.deadLetterQueue || !this.config.deadLetterQueue?.enabled) {
      return;
    }
    
    // DLQ redrive is automatically available when DLQ is configured
    // The deadLetterQueue configuration in QueueProps enables this capability
    // Additional IAM permissions may be required for redrive operations:
    // - sqs:StartMessageMoveTask (on DLQ)
    // - sqs:SendMessage (on source queue)
    // - sqs:GetQueueAttributes (on both queues)
    
    this.logComponentEvent('dlq_redrive_available', 'DLQ redrive capability available for operational recovery', {
      dlqArn: this.deadLetterQueue.queueArn,
      sourceQueueArn: this.queue.queueArn,
      note: 'Use AWS Console, CLI, or SDK to perform redrive operations'
    });
  }
  
  /**
   * Configures CloudWatch monitoring and alarms for the queue
   */
  private configureMonitoring(): void {
    if (!this.config.monitoring?.enabled || !this.queue) {
      return;
    }

    // Enable detailed metrics if configured
    if (this.config.monitoring.detailedMetrics) {
      // Detailed metrics are enabled via queue properties (handled in createMainQueue)
      // This is a no-op as SQS detailed metrics are enabled per-queue via CDK
    }

    // Create CloudWatch alarms for key SQS metrics
    this.createQueueAlarms();
  }

  /**
   * Creates CloudWatch alarms for SQS queue metrics
   */
  private createQueueAlarms(): void {
    if (!this.queue) {
      return;
    }

    const queueName = this.queue.queueName;
    const alarmPrefix = `${this.context.serviceName}-${this.spec.name}`;

    // Alarm: Queue depth (messages waiting to be processed)
    const queueDepthAlarm = new cloudwatch.Alarm(this, 'QueueDepthAlarm', {
      alarmName: `${alarmPrefix}-queue-depth-high`,
      alarmDescription: `Alert when queue depth exceeds threshold for ${this.spec.name}`,
      metric: new cloudwatch.Metric({
        namespace: 'AWS/SQS',
        metricName: 'ApproximateNumberOfMessagesVisible',
        dimensionsMap: {
          QueueName: queueName
        },
        statistic: 'Average',
        period: cdk.Duration.minutes(5)
      }),
      threshold: 1000, // Alert when more than 1000 messages are waiting
      evaluationPeriods: 2,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING
    });

    this.applyStandardTags(queueDepthAlarm, {
      'alarm-type': 'queue-depth',
      'metric': 'ApproximateNumberOfMessagesVisible'
    });

    // Alarm: Message age (oldest message in queue)
    const messageAgeAlarm = new cloudwatch.Alarm(this, 'MessageAgeAlarm', {
      alarmName: `${alarmPrefix}-message-age-high`,
      alarmDescription: `Alert when oldest message age exceeds threshold for ${this.spec.name}`,
      metric: new cloudwatch.Metric({
        namespace: 'AWS/SQS',
        metricName: 'ApproximateAgeOfOldestMessage',
        dimensionsMap: {
          QueueName: queueName
        },
        statistic: 'Maximum',
        period: cdk.Duration.minutes(5)
      }),
      threshold: 300, // Alert when oldest message is older than 5 minutes (300 seconds)
      evaluationPeriods: 2,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING
    });

    this.applyStandardTags(messageAgeAlarm, {
      'alarm-type': 'message-age',
      'metric': 'ApproximateAgeOfOldestMessage'
    });

    // Alarm: In-flight messages (messages being processed)
    const inFlightAlarm = new cloudwatch.Alarm(this, 'InFlightMessagesAlarm', {
      alarmName: `${alarmPrefix}-in-flight-messages-high`,
      alarmDescription: `Alert when in-flight messages exceed threshold for ${this.spec.name}`,
      metric: new cloudwatch.Metric({
        namespace: 'AWS/SQS',
        metricName: 'ApproximateNumberOfMessagesNotVisible',
        dimensionsMap: {
          QueueName: queueName
        },
        statistic: 'Average',
        period: cdk.Duration.minutes(5)
      }),
      threshold: 100, // Alert when more than 100 messages are in-flight
      evaluationPeriods: 2,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING
    });

    this.applyStandardTags(inFlightAlarm, {
      'alarm-type': 'in-flight-messages',
      'metric': 'ApproximateNumberOfMessagesNotVisible'
    });

    // Store alarm references for dashboard
    this.queueDepthAlarm = queueDepthAlarm;
    this.messageAgeAlarm = messageAgeAlarm;
    this.inFlightAlarm = inFlightAlarm;
    
    // Register alarms as constructs
    this.registerConstruct('queueDepthAlarm', queueDepthAlarm);
    this.registerConstruct('messageAgeAlarm', messageAgeAlarm);
    this.registerConstruct('inFlightAlarm', inFlightAlarm);

    this.logComponentEvent('monitoring_configured', 'CloudWatch alarms created for SQS queue', {
      alarmsCreated: 3,
      queueName: queueName
    });
  }

  /**
   * Configures OpenTelemetry observability for SQS queue consumers
   * 
   * Provides OTel environment variables for Lambda, ECS, and EC2 consumers
   * to enable distributed tracing and metrics export.
   */
  private configureObservabilityForQueue(): void {
    if (!this.config.monitoring?.enabled || !this.queue) {
      return;
    }

    // Get standardized OpenTelemetry environment variables
    const otelEnvVars = this.configureObservability(this.queue, {
      serviceName: `${this.context.serviceName}-${this.spec.name}-sqs`
    });

    // Add SQS-specific resource attributes
    otelEnvVars['OTEL_RESOURCE_ATTRIBUTES'] = [
      otelEnvVars['OTEL_RESOURCE_ATTRIBUTES'] || '',
      `messaging.system=sqs`,
      `messaging.destination=${this.queue.queueName}`,
      `component.type=sqs-queue`,
      `aws.sqs.queue_name=${this.queue.queueName}`
    ].filter(Boolean).join(',');

    // Register OTel capability for consumers to use
    this.registerCapability('otel:environment', otelEnvVars);

    this.logComponentEvent('observability_configured', 'OpenTelemetry observability configured for SQS queue', {
      otelServiceName: otelEnvVars['OTEL_SERVICE_NAME'],
      otelExporterEndpoint: otelEnvVars['OTEL_EXPORTER_OTLP_ENDPOINT'],
      queueName: this.queue.queueName
    });
  }

  /**
   * Creates CloudWatch dashboard for SQS queue metrics and alarms
   * 
   * Dashboard includes:
   * - Queue depth metrics
   * - Message throughput (sent, received, deleted)
   * - Message age
   * - In-flight messages
   * - Alarm status
   * - DLQ metrics (if enabled)
   */
  private createCloudWatchDashboard(): void {
    if (!this.config.monitoring?.enabled || !this.queue) {
      return;
    }

    const dashboardEnabled = this.config.monitoring?.dashboard?.enabled ?? true;
    if (!dashboardEnabled) {
      return;
    }

    const dashboardName = this.config.monitoring?.dashboard?.name
      ?? `${this.context.serviceName}-${this.spec.name}-sqs`;
    
    const queueName = this.queue.queueName;
    const dashboard = new cloudwatch.Dashboard(this, 'SqsQueueDashboard', {
      dashboardName,
      periodOverride: cloudwatch.PeriodOverride.AUTO
    });

    const dashboardWidgets: cloudwatch.IWidget[] = [];

    // 1. Queue Depth Widget
    dashboardWidgets.push(
      new cloudwatch.GraphWidget({
        title: 'Queue Depth',
        width: 12,
        height: 6,
        left: [
          new cloudwatch.Metric({
            namespace: 'AWS/SQS',
            metricName: 'ApproximateNumberOfMessagesVisible',
            dimensionsMap: { QueueName: queueName },
            statistic: 'Average',
            period: cdk.Duration.minutes(5),
            label: 'Messages Visible',
            color: cloudwatch.Color.BLUE
          })
        ],
        leftYAxis: { min: 0, label: 'Messages' }
      })
    );

    // 2. Message Throughput Widget
    dashboardWidgets.push(
      new cloudwatch.GraphWidget({
        title: 'Message Throughput',
        width: 12,
        height: 6,
        left: [
          new cloudwatch.Metric({
            namespace: 'AWS/SQS',
            metricName: 'NumberOfMessagesSent',
            dimensionsMap: { QueueName: queueName },
            statistic: 'Sum',
            period: cdk.Duration.minutes(5),
            label: 'Sent',
            color: cloudwatch.Color.GREEN
          }),
          new cloudwatch.Metric({
            namespace: 'AWS/SQS',
            metricName: 'NumberOfMessagesReceived',
            dimensionsMap: { QueueName: queueName },
            statistic: 'Sum',
            period: cdk.Duration.minutes(5),
            label: 'Received',
            color: cloudwatch.Color.BLUE
          }),
          new cloudwatch.Metric({
            namespace: 'AWS/SQS',
            metricName: 'NumberOfMessagesDeleted',
            dimensionsMap: { QueueName: queueName },
            statistic: 'Sum',
            period: cdk.Duration.minutes(5),
            label: 'Deleted',
            color: cloudwatch.Color.ORANGE
          })
        ],
        leftYAxis: { min: 0, label: 'Messages' }
      })
    );

    // 3. Message Age Widget
    dashboardWidgets.push(
      new cloudwatch.GraphWidget({
        title: 'Message Age',
        width: 12,
        height: 6,
        left: [
          new cloudwatch.Metric({
            namespace: 'AWS/SQS',
            metricName: 'ApproximateAgeOfOldestMessage',
            dimensionsMap: { QueueName: queueName },
            statistic: 'Maximum',
            period: cdk.Duration.minutes(5),
            label: 'Oldest Message Age',
            color: cloudwatch.Color.RED
          })
        ],
        leftYAxis: { min: 0, label: 'Seconds' }
      })
    );

    // 4. In-Flight Messages Widget
    dashboardWidgets.push(
      new cloudwatch.GraphWidget({
        title: 'In-Flight Messages',
        width: 12,
        height: 6,
        left: [
          new cloudwatch.Metric({
            namespace: 'AWS/SQS',
            metricName: 'ApproximateNumberOfMessagesNotVisible',
            dimensionsMap: { QueueName: queueName },
            statistic: 'Average',
            period: cdk.Duration.minutes(5),
            label: 'In-Flight',
            color: cloudwatch.Color.PURPLE
          })
        ],
        leftYAxis: { min: 0, label: 'Messages' }
      })
    );

    // 5. DLQ Metrics Widget (if DLQ is enabled)
    if (this.deadLetterQueue) {
      dashboardWidgets.push(
        new cloudwatch.GraphWidget({
          title: 'Dead Letter Queue',
          width: 12,
          height: 6,
          left: [
            new cloudwatch.Metric({
              namespace: 'AWS/SQS',
              metricName: 'ApproximateNumberOfMessagesVisible',
              dimensionsMap: { QueueName: this.deadLetterQueue.queueName },
              statistic: 'Sum',
              period: cdk.Duration.minutes(5),
              label: 'DLQ Messages',
              color: cloudwatch.Color.RED
            }),
            new cloudwatch.Metric({
              namespace: 'AWS/SQS',
              metricName: 'ApproximateAgeOfOldestMessage',
              dimensionsMap: { QueueName: this.deadLetterQueue.queueName },
              statistic: 'Maximum',
              period: cdk.Duration.minutes(5),
              label: 'DLQ Oldest Age',
              color: cloudwatch.Color.ORANGE
            })
          ],
          leftYAxis: { min: 0, label: 'Messages / Seconds' }
        })
      );
    }

    // 6. Alarm Status Widget
    const alarms: cloudwatch.IAlarm[] = [];
    if (this.queueDepthAlarm) alarms.push(this.queueDepthAlarm);
    if (this.messageAgeAlarm) alarms.push(this.messageAgeAlarm);
    if (this.inFlightAlarm) alarms.push(this.inFlightAlarm);

    if (alarms.length > 0) {
      dashboardWidgets.push(
        new cloudwatch.AlarmStatusWidget({
          title: 'Queue Alarms',
          width: 24,
          height: 3,
          alarms
        })
      );
    }

    // Add all widgets to dashboard
    dashboard.addWidgets(...dashboardWidgets);

    // Apply standard tags
    this.applyStandardTags(dashboard, {
      'dashboard-type': 'sqs-queue-monitoring',
      'queue-name': queueName
    });

    // Register dashboard as construct
    this.registerConstruct('dashboard', dashboard);
    this.dashboard = dashboard;

    this.logComponentEvent('dashboard_created', 'CloudWatch Dashboard created for SQS queue', {
      dashboardName,
      widgetCount: dashboardWidgets.length,
      queueName: queueName
    });
  }

  /**
   * Registers capabilities for component binding
   * 
   * Note: Future enhancement could define typed SqsCapability interface in core types
   * (similar to SQSCapabilityData in @shinobi/core bindings.ts) for stronger binding
   * contracts and type safety. The interface would include:
   * - type: 'messaging:sqs'
   * - resources: { arn, queueUrl, queueName }
   * - encryption: { enabled, kmsKeyId? }
   * - deadLetterQueue?: { arn, queueUrl }
   * 
   * Current implementation uses standard capability vocabulary per platform standards.
   */
  private registerCapabilities(): void {
    const capability = {
      queueUrl: this.queue.queueUrl, // Required for bindings - used by Lambda, ECS, etc.
      queueArn: this.queue.queueArn,
      queueName: this.queue.queueName,
      visibilityTimeoutSeconds: this.config.visibilityTimeoutSeconds || 30, // Required for Lambda timeout validation
    };
    
    this.registerCapability('messaging:sqs', capability);
    
    if (this.deadLetterQueue) {
      this.registerCapability('messaging:sqs:dlq', {
        queueUrl: this.deadLetterQueue.queueUrl,
        queueArn: this.deadLetterQueue.queueArn,
        queueName: this.deadLetterQueue.queueName,
        // Required IAM permissions for DLQ redrive operations:
        // - sqs:StartMessageMoveTask (on this DLQ)
        // - sqs:SendMessage (on source queue)
        // - sqs:GetQueueAttributes (on both queues)
        requiredIamPermissions: [
          'sqs:StartMessageMoveTask',
          'sqs:SendMessage',
          'sqs:GetQueueAttributes'
        ]
      });
    }
  }
  
  /**
   * Returns the machine-readable capabilities of the component
   */
  public getCapabilities(): ComponentCapabilities {
    this.validateSynthesized();
    return this.capabilities;
  }
}
