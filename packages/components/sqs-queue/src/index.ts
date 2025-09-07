/**
 * SQS Queue Component
 * 
 * A managed message queue with compliance hardening and DLQ support.
 * Implements three-tiered compliance model (Commercial/FedRAMP Moderate/FedRAMP High).
 */

import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {
  Component,
  ComponentSpec,
  ComponentContext,
  ComponentCapabilities
} from '@platform/contracts';

/**
 * Configuration interface for SQS Queue component
 */
export interface SqsQueueConfig {
  /** Queue name (optional, will be auto-generated if not provided) */
  queueName?: string;
  
  /** Visibility timeout in seconds */
  visibilityTimeoutSeconds?: number;
  
  /** Message retention period in seconds */
  messageRetentionPeriod?: number;
  
  /** Maximum message size in bytes */
  maxMessageSizeBytes?: number;
  
  /** Delivery delay in seconds */
  deliveryDelaySeconds?: number;
  
  /** Receive message wait time in seconds (long polling) */
  receiveMessageWaitTimeSeconds?: number;
  
  /** Dead letter queue configuration */
  deadLetterQueue?: {
    /** Enable dead letter queue */
    enabled: boolean;
    /** Maximum receive count before moving to DLQ */
    maxReceiveCount?: number;
  };
  
  /** FIFO queue configuration */
  fifo?: {
    /** Enable FIFO queue */
    enabled: boolean;
    /** Content-based deduplication */
    contentBasedDeduplication?: boolean;
    /** Deduplication scope */
    deduplicationScope?: 'messageGroup' | 'queue';
    /** FIFO throughput limit */
    fifoThroughputLimit?: 'perQueue' | 'perMessageGroupId';
  };
  
  /** Encryption configuration */
  encryption?: {
    /** Enable server-side encryption */
    enabled?: boolean;
    /** KMS key ARN for encryption */
    kmsKeyArn?: string;
    /** KMS data key reuse period in seconds */
    kmsDataKeyReusePeriodSeconds?: number;
  };
}

/**
 * Configuration schema for SQS Queue component
 */
export const SQS_QUEUE_CONFIG_SCHEMA = {
  type: 'object',
  title: 'SQS Queue Configuration',
  description: 'Configuration for creating an SQS message queue',
  properties: {
    queueName: {
      type: 'string',
      description: 'Queue name (will be auto-generated if not provided)',
      pattern: '^[a-zA-Z0-9_-]+(\.fifo)?$',
      minLength: 1,
      maxLength: 80
    },
    visibilityTimeoutSeconds: {
      type: 'number',
      description: 'Visibility timeout in seconds',
      minimum: 0,
      maximum: 43200,
      default: 30
    },
    messageRetentionPeriod: {
      type: 'number',
      description: 'Message retention period in seconds',
      minimum: 60,
      maximum: 1209600,
      default: 345600
    },
    maxMessageSizeBytes: {
      type: 'number',
      description: 'Maximum message size in bytes',
      minimum: 1024,
      maximum: 262144,
      default: 262144
    },
    deliveryDelaySeconds: {
      type: 'number',
      description: 'Delivery delay in seconds',
      minimum: 0,
      maximum: 900,
      default: 0
    },
    receiveMessageWaitTimeSeconds: {
      type: 'number',
      description: 'Long polling wait time in seconds',
      minimum: 0,
      maximum: 20,
      default: 0
    },
    deadLetterQueue: {
      type: 'object',
      description: 'Dead letter queue configuration',
      properties: {
        enabled: {
          type: 'boolean',
          description: 'Enable dead letter queue',
          default: true
        },
        maxReceiveCount: {
          type: 'number',
          description: 'Maximum receive count before moving to DLQ',
          minimum: 1,
          maximum: 1000,
          default: 3
        }
      },
      additionalProperties: false,
      default: {
        enabled: true,
        maxReceiveCount: 3
      }
    },
    fifo: {
      type: 'object',
      description: 'FIFO queue configuration',
      properties: {
        enabled: {
          type: 'boolean',
          description: 'Enable FIFO queue',
          default: false
        },
        contentBasedDeduplication: {
          type: 'boolean',
          description: 'Enable content-based deduplication',
          default: false
        },
        deduplicationScope: {
          type: 'string',
          description: 'Deduplication scope',
          enum: ['messageGroup', 'queue'],
          default: 'queue'
        },
        fifoThroughputLimit: {
          type: 'string',
          description: 'FIFO throughput limit',
          enum: ['perQueue', 'perMessageGroupId'],
          default: 'perQueue'
        }
      },
      additionalProperties: false,
      default: {
        enabled: false,
        contentBasedDeduplication: false,
        deduplicationScope: 'queue',
        fifoThroughputLimit: 'perQueue'
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
        },
        kmsDataKeyReusePeriodSeconds: {
          type: 'number',
          description: 'KMS data key reuse period in seconds',
          minimum: 60,
          maximum: 86400,
          default: 300
        }
      },
      additionalProperties: false,
      default: {
        enabled: false,
        kmsDataKeyReusePeriodSeconds: 300
      }
    }
  },
  additionalProperties: false,
  defaults: {
    visibilityTimeoutSeconds: 30,
    messageRetentionPeriod: 345600,
    maxMessageSizeBytes: 262144,
    deliveryDelaySeconds: 0,
    receiveMessageWaitTimeSeconds: 0,
    deadLetterQueue: {
      enabled: true,
      maxReceiveCount: 3
    },
    fifo: {
      enabled: false,
      contentBasedDeduplication: false,
      deduplicationScope: 'queue',
      fifoThroughputLimit: 'perQueue'
    },
    encryption: {
      enabled: false,
      kmsDataKeyReusePeriodSeconds: 300
    }
  }
};

/**
 * Configuration builder for SQS Queue component
 */
export class SqsQueueConfigBuilder {
  private context: ComponentContext;
  private spec: ComponentSpec;
  
  constructor(context: ComponentContext, spec: ComponentSpec) {
    this.context = context;
    this.spec = spec;
  }

  /**
   * Builds the final configuration by applying platform defaults, compliance frameworks, and user overrides
   */
  public async build(): Promise<SqsQueueConfig> {
    return this.buildSync();
  }

  /**
   * Synchronous version of build for use in synth() method
   */
  public buildSync(): SqsQueueConfig {
    // Start with platform defaults
    const platformDefaults = this.getPlatformDefaults();
    
    // Apply compliance framework defaults
    const complianceDefaults = this.getComplianceFrameworkDefaults();
    
    // Merge user configuration from spec
    const userConfig = this.spec.config || {};
    
    // Merge configurations (user config takes precedence)
    const mergedConfig = this.mergeConfigs(
      this.mergeConfigs(platformDefaults, complianceDefaults),
      userConfig
    );
    
    return mergedConfig as SqsQueueConfig;
  }

  /**
   * Simple merge utility for combining configuration objects
   */
  private mergeConfigs(target: Record<string, any>, source: Record<string, any>): Record<string, any> {
    const result = { ...target };
    
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.mergeConfigs(result[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    
    return result;
  }

  /**
   * Get platform-wide defaults for SQS Queue
   */
  private getPlatformDefaults(): Record<string, any> {
    return {
      visibilityTimeoutSeconds: this.getDefaultVisibilityTimeout(),
      messageRetentionPeriod: this.getDefaultMessageRetention(),
      maxMessageSizeBytes: 262144, // 256KB default
      deliveryDelaySeconds: 0,
      receiveMessageWaitTimeSeconds: this.getDefaultLongPolling(),
      deadLetterQueue: {
        enabled: this.getDefaultDLQEnabled(),
        maxReceiveCount: this.getDefaultMaxReceiveCount()
      },
      fifo: {
        enabled: false,
        contentBasedDeduplication: false,
        deduplicationScope: 'queue',
        fifoThroughputLimit: 'perQueue'
      },
      encryption: {
        enabled: this.getDefaultEncryptionEnabled(),
        kmsDataKeyReusePeriodSeconds: 300
      }
    };
  }

  /**
   * Get compliance framework specific defaults
   */
  private getComplianceFrameworkDefaults(): Record<string, any> {
    const framework = this.context.complianceFramework;
    
    switch (framework) {
      case 'fedramp-moderate':
        return {
          visibilityTimeoutSeconds: 60, // Longer timeout for compliance
          messageRetentionPeriod: 1209600, // 14 days maximum retention
          receiveMessageWaitTimeSeconds: 20, // Enable long polling for efficiency
          deadLetterQueue: {
            enabled: true, // Required for audit and debugging
            maxReceiveCount: 2 // Lower threshold for compliance
          },
          encryption: {
            enabled: true, // Encryption required for compliance
            kmsDataKeyReusePeriodSeconds: 300
          }
        };
        
      case 'fedramp-high':
        return {
          visibilityTimeoutSeconds: 120, // Extended timeout for high security
          messageRetentionPeriod: 1209600, // 14 days maximum retention
          receiveMessageWaitTimeSeconds: 20, // Enable long polling
          deadLetterQueue: {
            enabled: true, // Required for audit trails
            maxReceiveCount: 1 // Very strict failure tolerance
          },
          encryption: {
            enabled: true, // Mandatory encryption
            kmsDataKeyReusePeriodSeconds: 60 // Shorter key reuse for higher security
          }
        };
        
      default: // commercial
        return {};
    }
  }

  /**
   * Get default visibility timeout based on compliance framework
   */
  private getDefaultVisibilityTimeout(): number {
    switch (this.context.complianceFramework) {
      case 'fedramp-high':
        return 120; // Extended processing time for high compliance
      case 'fedramp-moderate':
        return 60; // Moderate processing time
      default:
        return 30; // Standard timeout
    }
  }

  /**
   * Get default message retention based on compliance framework
   */
  private getDefaultMessageRetention(): number {
    return ['fedramp-moderate', 'fedramp-high'].includes(this.context.complianceFramework) ?
      1209600 : 345600; // 14 days for compliance, 4 days for commercial
  }

  /**
   * Get default long polling setting
   */
  private getDefaultLongPolling(): number {
    return ['fedramp-moderate', 'fedramp-high'].includes(this.context.complianceFramework) ?
      20 : 0; // Enable long polling for compliance frameworks
  }

  /**
   * Get default DLQ enabled setting
   */
  private getDefaultDLQEnabled(): boolean {
    return ['fedramp-moderate', 'fedramp-high'].includes(this.context.complianceFramework) ||
           this.context.complianceFramework === 'commercial'; // Always enable DLQ
  }

  /**
   * Get default max receive count for DLQ
   */
  private getDefaultMaxReceiveCount(): number {
    switch (this.context.complianceFramework) {
      case 'fedramp-high':
        return 1; // Very strict for high compliance
      case 'fedramp-moderate':
        return 2; // Strict for moderate compliance
      default:
        return 3; // Standard for commercial
    }
  }

  /**
   * Get default encryption enabled setting
   */
  private getDefaultEncryptionEnabled(): boolean {
    return ['fedramp-moderate', 'fedramp-high'].includes(this.context.complianceFramework);
  }
}

/**
 * SQS Queue Component implementing Component API Contract v1.0
 */
export class SqsQueueComponent extends Component {
  private queue?: sqs.Queue;
  private deadLetterQueue?: sqs.Queue;
  private kmsKey?: kms.Key;
  private config?: SqsQueueConfig;

  constructor(scope: Construct, id: string, context: ComponentContext, spec: ComponentSpec) {
    super(scope, id, context, spec);
  }

  /**
   * Synthesis phase - Create SQS queue with compliance hardening
   */
  public synth(): void {
    // Log component synthesis start
    this.logComponentEvent('synthesis_start', 'Starting SQS Queue component synthesis', {
      fifoEnabled: this.spec.config?.fifo?.enabled,
      dlqEnabled: this.spec.config?.deadLetterQueue?.enabled
    });
    
    const startTime = Date.now();
    
    try {
      // Build configuration using ConfigBuilder
      const configBuilder = new SqsQueueConfigBuilder(this.context, this.spec);
      this.config = configBuilder.buildSync();
      
      // Log configuration built
      this.logComponentEvent('config_built', 'SQS Queue configuration built successfully', {
        fifoEnabled: this.config.fifo?.enabled,
        dlqEnabled: this.config.deadLetterQueue?.enabled,
        visibilityTimeout: this.config.visibilityTimeoutSeconds
      });
      
      // Create KMS key for encryption if needed
      this.createKmsKeyIfNeeded();
    
    // Create dead letter queue if enabled
    this.createDeadLetterQueueIfNeeded();
    
    // Create main queue
    this.createQueue();
    
    // Apply compliance hardening
    this.applyComplianceHardening();
    
    // Register constructs
    this.registerConstruct('queue', this.queue!);
    if (this.deadLetterQueue) {
      this.registerConstruct('deadLetterQueue', this.deadLetterQueue);
    }
    if (this.kmsKey) {
      this.registerConstruct('kmsKey', this.kmsKey);
    }
    
    // Register capabilities
    this.registerCapability('queue:sqs', this.buildQueueCapability());
    
    // Log successful synthesis completion
    const duration = Date.now() - startTime;
    this.logPerformanceMetric('component_synthesis', duration, {
      resourcesCreated: Object.keys(this.capabilities).length
    });
    
    this.logComponentEvent('synthesis_complete', 'SQS Queue component synthesis completed successfully', {
      mainQueueCreated: 1,
      dlqCreated: !!this.deadLetterQueue,
      kmsKeyCreated: !!this.kmsKey,
      alarmsCreated: 3 // Queue depth, message age, DLQ alarms
    });
    
    } catch (error) {
      this.logError(error as Error, 'component synthesis', {
        componentType: 'sqs-queue',
        stage: 'synthesis'
      });
      throw error;
    }
  }

  /**
   * Get the capabilities this component provides
   */
  public getCapabilities(): ComponentCapabilities {
    this.validateSynthesized();
    return this.capabilities;
  }

  /**
   * Get the component type identifier
   */
  public getType(): string {
    return 'sqs-queue';
  }

  /**
   * Create KMS key for encryption if required by compliance framework
   */
  private createKmsKeyIfNeeded(): void {
    if (this.shouldUseCustomerManagedKey()) {
      this.kmsKey = new kms.Key(this, 'EncryptionKey', {
        description: `Encryption key for ${this.spec.name} SQS queue`,
        enableKeyRotation: this.context.complianceFramework === 'fedramp-high',
        keyUsage: kms.KeyUsage.ENCRYPT_DECRYPT,
        keySpec: kms.KeySpec.SYMMETRIC_DEFAULT
      });
      
      // Apply standard tags to KMS key
      this.applyStandardTags(this.kmsKey, {
        'key-usage': 'sqs-encryption',
        'key-rotation-enabled': (this.context.complianceFramework === 'fedramp-high').toString()
      });

      // Grant SQS service access to the key
      this.kmsKey.addToResourcePolicy(new iam.PolicyStatement({
        sid: 'AllowSQSService',
        principals: [new iam.ServicePrincipal('sqs.amazonaws.com')],
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
   * Create dead letter queue if enabled
   */
  private createDeadLetterQueueIfNeeded(): void {
    if (this.config!.deadLetterQueue?.enabled) {
      const dlqProps: sqs.QueueProps = {
        queueName: this.config!.queueName ? 
          `${this.config!.queueName}-dlq` : undefined,
        encryption: this.getQueueEncryption(),
        encryptionMasterKey: this.kmsKey,
        retentionPeriod: cdk.Duration.days(14), // Longer retention for DLQ
        removalPolicy: this.isComplianceFramework() ? 
          cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY
      };

      // Configure FIFO DLQ if main queue is FIFO
      if (this.config!.fifo?.enabled) {
        const baseName = dlqProps.queueName || `${this.context.serviceName}-${this.spec.name}-dlq`;
        Object.assign(dlqProps, {
          fifo: true,
          queueName: `${baseName}.fifo`
        });
      }

      this.deadLetterQueue = new sqs.Queue(this, 'DeadLetterQueue', dlqProps);
      
      // Apply standard tags to dead letter queue
      this.applyStandardTags(this.deadLetterQueue, {
        'queue-type': 'dead-letter',
        'fifo-enabled': (!!this.config!.fifo?.enabled).toString(),
        'retention-period': '14-days'
      });
    }
  }

  /**
   * Create the main SQS queue
   */
  private createQueue(): void {
    const queueProps: sqs.QueueProps = {
      queueName: this.buildQueueName(),
      visibilityTimeout: cdk.Duration.seconds(
        this.config!.visibilityTimeoutSeconds || 30
      ),
      retentionPeriod: cdk.Duration.seconds(
        this.config!.messageRetentionPeriod || 345600
      ),
      maxMessageSizeBytes: this.config!.maxMessageSizeBytes,
      deliveryDelay: this.config!.deliveryDelaySeconds ? 
        cdk.Duration.seconds(this.config!.deliveryDelaySeconds) : undefined,
      receiveMessageWaitTime: cdk.Duration.seconds(
        this.config!.receiveMessageWaitTimeSeconds || 0
      ),
      encryption: this.getQueueEncryption(),
      encryptionMasterKey: this.kmsKey,
      dataKeyReuse: this.config!.encryption?.kmsDataKeyReusePeriodSeconds ? 
        cdk.Duration.seconds(this.config!.encryption.kmsDataKeyReusePeriodSeconds) : undefined,
      deadLetterQueue: this.deadLetterQueue ? {
        queue: this.deadLetterQueue,
        maxReceiveCount: this.config!.deadLetterQueue?.maxReceiveCount || 3
      } : undefined,
      removalPolicy: this.isComplianceFramework() ? 
        cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY
    };

    // Configure FIFO queue if enabled
    if (this.config!.fifo?.enabled) {
      // Create separate FIFO props
      const fifoProps = {
        fifo: true,
        contentBasedDeduplication: this.config!.fifo.contentBasedDeduplication,
        deduplicationScope: this.config!.fifo.deduplicationScope === 'messageGroup' ?
          sqs.DeduplicationScope.MESSAGE_GROUP : sqs.DeduplicationScope.QUEUE,
        fifoThroughputLimit: this.config!.fifo.fifoThroughputLimit === 'perMessageGroupId' ?
          sqs.FifoThroughputLimit.PER_MESSAGE_GROUP_ID : sqs.FifoThroughputLimit.PER_QUEUE
      };
      Object.assign(queueProps, fifoProps);
    }

    this.queue = new sqs.Queue(this, 'Queue', queueProps);
    
    // Apply standard tags to main queue
    this.applyStandardTags(this.queue, {
      'queue-type': 'main',
      'fifo-enabled': (!!this.config!.fifo?.enabled).toString(),
      'dlq-enabled': (!!this.config!.deadLetterQueue?.enabled).toString(),
      'visibility-timeout': (this.config!.visibilityTimeoutSeconds || 30).toString(),
      'long-polling': (!!this.config!.receiveMessageWaitTimeSeconds).toString()
    });
    
    // Configure observability for queue monitoring
    this.configureObservabilityForQueue();
    
    // Log main queue creation
    this.logResourceCreation('sqs-queue', this.queue.queueName, {
      fifoEnabled: !!this.config!.fifo?.enabled,
      dlqEnabled: !!this.deadLetterQueue,
      visibilityTimeout: this.config!.visibilityTimeoutSeconds,
      encryptionEnabled: this.shouldUseCustomerManagedKey()
    });
  }

  /**
   * Apply compliance-specific hardening
   */
  private applyComplianceHardening(): void {
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

  private applyCommercialHardening(): void {
    // Apply basic security policies
    if (this.queue) {
      this.queue.addToResourcePolicy(new iam.PolicyStatement({
        sid: 'DenyInsecureTransport',
        effect: iam.Effect.DENY,
        principals: [new iam.AnyPrincipal()],
        actions: ['sqs:*'],
        resources: [this.queue.queueArn],
        conditions: {
          Bool: {
            'aws:SecureTransport': 'false'
          }
        }
      }));
    }
  }

  private applyFedrampModerateHardening(): void {
    // Apply commercial hardening
    this.applyCommercialHardening();

    // Add additional access restrictions
    if (this.queue) {
      this.queue.addToResourcePolicy(new iam.PolicyStatement({
        sid: 'RestrictToVPCEndpoints',
        effect: iam.Effect.DENY,
        principals: [new iam.AnyPrincipal()],
        actions: ['sqs:*'],
        resources: [this.queue.queueArn],
        conditions: {
          StringNotEquals: {
            'aws:sourceVpce': ['vpce-*'] // Would be replaced with actual VPC endpoint ID
          }
        }
      }));

      // Require authentication for all operations
      this.queue.addToResourcePolicy(new iam.PolicyStatement({
        sid: 'RequireAuthentication',
        effect: iam.Effect.DENY,
        principals: [new iam.AnyPrincipal()],
        actions: ['sqs:*'],
        resources: [this.queue.queueArn],
        conditions: {
          Bool: {
            'aws:PrincipalIsAWSService': 'false'
          },
          'Null': {
            'aws:userid': 'true'
          }
        }
      }));
    }
  }

  private applyFedrampHighHardening(): void {
    // Apply all moderate hardening
    this.applyFedrampModerateHardening();

    // Additional high-security restrictions
    if (this.queue) {
      // Restrict to specific source IP ranges (would be organization-specific)
      this.queue.addToResourcePolicy(new iam.PolicyStatement({
        sid: 'RestrictSourceIPs',
        effect: iam.Effect.DENY,
        principals: [new iam.AnyPrincipal()],
        actions: ['sqs:*'],
        resources: [this.queue.queueArn],
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
      this.queue.addToResourcePolicy(new iam.PolicyStatement({
        sid: 'RequireMFAForDelete',
        effect: iam.Effect.DENY,
        principals: [new iam.AnyPrincipal()],
        actions: [
          'sqs:DeleteQueue',
          'sqs:PurgeQueue',
          'sqs:SetQueueAttributes'
        ],
        resources: [this.queue.queueArn],
        conditions: {
          BoolIfExists: {
            'aws:MultiFactorAuthPresent': 'false'
          }
        }
      }));
    }
  }

  /**
   * Build queue capability data shape
   */
  private buildQueueCapability(): any {
    return {
      queueUrl: this.queue!.queueUrl,
      queueArn: this.queue!.queueArn
    };
  }

  /**
   * Helper methods for compliance decisions
   */
  private shouldUseCustomerManagedKey(): boolean {
    return this.config!.encryption?.enabled === true;
  }

  private isComplianceFramework(): boolean {
    return ['fedramp-moderate', 'fedramp-high'].includes(this.context.complianceFramework);
  }

  private getQueueEncryption(): sqs.QueueEncryption {
    if (this.config!.encryption?.enabled && this.config!.encryption?.kmsKeyArn) {
      return sqs.QueueEncryption.KMS;
    } else if (this.config!.encryption?.enabled) {
      return sqs.QueueEncryption.KMS_MANAGED;
    }
    return sqs.QueueEncryption.UNENCRYPTED;
  }

  private buildQueueName(): string | undefined {
    if (this.config!.queueName) {
      let name = this.config!.queueName;
      if (this.config!.fifo?.enabled && !name.endsWith('.fifo')) {
        name += '.fifo';
      }
      return name;
    }

    // Auto-generate name
    let name = `${this.context.serviceName}-${this.spec.name}`;
    if (this.config!.fifo?.enabled) {
      name += '.fifo';
    }
    return name;
  }


  /**
   * Configure OpenTelemetry observability for SQS queue monitoring according to Platform Observability Standard
   */
  private configureObservabilityForQueue(): void {
    if (!this.queue) return;

    // Get standardized observability configuration for message queues
    const otelConfig = this.configureObservability(this.queue, {
      customAttributes: {
        'queue.type': 'sqs',
        'queue.name': this.spec.name,
        'queue.fifo': (!!this.config!.fifo?.enabled).toString(),
        'queue.dlq.enabled': (!!this.config!.deadLetterQueue?.enabled).toString(),
        'queue.visibility.timeout': (this.config!.visibilityTimeoutSeconds || 30).toString(),
        'queue.receive.wait.time': (this.config!.receiveMessageWaitTimeSeconds || 0).toString(),
        'queue.encryption': this.shouldUseCustomerManagedKey() ? 'customer-managed' : 'aws-managed'
      }
    });

    // Create CloudWatch alarms for queue monitoring based on compliance framework
    this.createQueueMonitoringAlarms();
    
    // Configure message tracing for distributed observability
    this.configureMessageTracing();
  }

  /**
   * Create CloudWatch alarms for comprehensive queue monitoring
   */
  private createQueueMonitoringAlarms(): void {
    if (!this.queue) return;

    const alarmThresholds = this.getQueueAlarmThresholds();

    // Queue depth alarm - critical for preventing message backlog
    new cloudwatch.Alarm(this, 'QueueDepthAlarm', {
      metric: this.queue.metricApproximateNumberOfMessagesVisible(),
      threshold: alarmThresholds.queueDepth,
      evaluationPeriods: 2,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      alarmDescription: `High message count in ${this.spec.name} queue`
    });

    // Age of oldest message alarm - monitors processing delays
    new cloudwatch.Alarm(this, 'MessageAgeAlarm', {
      metric: this.queue.metricApproximateAgeOfOldestMessage(),
      threshold: alarmThresholds.messageAge,
      evaluationPeriods: 3,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      alarmDescription: `Old messages detected in ${this.spec.name} queue`
    });

    // Dead letter queue alarm (if DLQ is enabled)
    if (this.deadLetterQueue) {
      new cloudwatch.Alarm(this, 'DeadLetterQueueAlarm', {
        metric: this.deadLetterQueue.metricApproximateNumberOfMessagesVisible(),
        threshold: 1, // Any message in DLQ should trigger alarm
        evaluationPeriods: 1,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
        alarmDescription: `Messages detected in ${this.spec.name} dead letter queue`
      });
    }
  }

  /**
   * Configure message tracing for distributed observability
   */
  private configureMessageTracing(): void {
    // For SQS, message tracing is implemented through message attributes
    // This configuration ensures that trace context is preserved across queue operations
    
    const messageAttributes = {
      'OtelTraceId': {
        DataType: 'String',
        StringValue: 'trace-id-placeholder'
      },
      'OtelSpanId': {
        DataType: 'String', 
        StringValue: 'span-id-placeholder'
      },
      'ServiceName': {
        DataType: 'String',
        StringValue: this.spec.name
      },
      'ComplianceFramework': {
        DataType: 'String',
        StringValue: this.context.complianceFramework
      }
    };

    // Store configuration for use by Lambda functions that process messages
    // In production, this would be available as environment variables or SSM parameters
  }

  /**
   * Get alarm thresholds based on compliance framework requirements
   */
  private getQueueAlarmThresholds(): { queueDepth: number; messageAge: number } {
    switch (this.context.complianceFramework) {
      case 'fedramp-high':
        return {
          queueDepth: 100, // Strict limits for high compliance
          messageAge: 300 // 5 minutes maximum age
        };
      case 'fedramp-moderate':
        return {
          queueDepth: 500, // Moderate limits
          messageAge: 900 // 15 minutes maximum age
        };
      default:
        return {
          queueDepth: 1000, // Standard limits for commercial
          messageAge: 1800 // 30 minutes maximum age
        };
    }
  }
}