/**
 * SQS Queue Component
 * 
 * A managed message queue with compliance hardening and DLQ support.
 * Implements three-tiered compliance model (Commercial/FedRAMP Moderate/FedRAMP High).
 */

import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {
  Component,
  ComponentSpec,
  ComponentContext,
  ComponentCapabilities,
  ConfigBuilder,
  ComponentConfigSchema,
  QueueSqsCapability
} from '../../contracts';

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
export const SQS_QUEUE_CONFIG_SCHEMA: ComponentConfigSchema = {
  type: 'object',
  title: 'SQS Queue Configuration',
  description: 'Configuration for creating an SQS message queue',
  properties: {
    queueName: {
      type: 'string',
      description: 'Queue name (will be auto-generated if not provided)',
      pattern: '^[a-zA-Z0-9_-]+$',
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
    receiveMessageWaitTimeSeconds: {
      type: 'number',
      description: 'Long polling wait time in seconds',
      minimum: 0,
      maximum: 20,
      default: 0
    }
  },
  additionalProperties: false,
  defaults: {
    visibilityTimeoutSeconds: 30,
    messageRetentionPeriod: 345600, // 4 days
    receiveMessageWaitTimeSeconds: 0
  }
};

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
    // Build configuration
    this.config = this.buildConfigSync();
    
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
        dlqProps.fifo = true;
        dlqProps.queueName = dlqProps.queueName ? 
          `${dlqProps.queueName}.fifo` : undefined;
      }

      this.deadLetterQueue = new sqs.Queue(this, 'DeadLetterQueue', dlqProps);
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
      queueProps.fifo = true;
      queueProps.contentBasedDeduplication = this.config!.fifo.contentBasedDeduplication;
      queueProps.deduplicationScope = this.config!.fifo.deduplicationScope === 'messageGroup' ?
        sqs.DeduplicationScope.MESSAGE_GROUP : sqs.DeduplicationScope.QUEUE;
      queueProps.fifoThroughputLimit = this.config!.fifo.fifoThroughputLimit === 'perMessageGroupId' ?
        sqs.FifoThroughputLimit.PER_MESSAGE_GROUP_ID : sqs.FifoThroughputLimit.PER_QUEUE;
    }

    this.queue = new sqs.Queue(this, 'Queue', queueProps);
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
  private buildQueueCapability(): QueueSqsCapability {
    return {
      queueUrl: this.queue!.queueUrl,
      queueArn: this.queue!.queueArn
    };
  }

  /**
   * Helper methods for compliance decisions
   */
  private shouldUseCustomerManagedKey(): boolean {
    return ['fedramp-moderate', 'fedramp-high'].includes(this.context.complianceFramework) ||
           this.config!.encryption?.enabled === true;
  }

  private isComplianceFramework(): boolean {
    return ['fedramp-moderate', 'fedramp-high'].includes(this.context.complianceFramework);
  }

  private getQueueEncryption(): sqs.QueueEncryption {
    if (this.shouldUseCustomerManagedKey()) {
      return sqs.QueueEncryption.KMS;
    } else if (this.context.complianceFramework !== 'commercial') {
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
   * Simplified config building for demo purposes
   */
  private buildConfigSync(): SqsQueueConfig {
    const config: SqsQueueConfig = {
      queueName: this.spec.config?.queueName,
      visibilityTimeoutSeconds: this.spec.config?.visibilityTimeoutSeconds || 30,
      messageRetentionPeriod: this.spec.config?.messageRetentionPeriod || 345600,
      maxMessageSizeBytes: this.spec.config?.maxMessageSizeBytes,
      deliveryDelaySeconds: this.spec.config?.deliveryDelaySeconds,
      receiveMessageWaitTimeSeconds: this.spec.config?.receiveMessageWaitTimeSeconds || 0,
      deadLetterQueue: this.spec.config?.deadLetterQueue || { enabled: true, maxReceiveCount: 3 },
      fifo: this.spec.config?.fifo || { enabled: false },
      encryption: this.spec.config?.encryption || { enabled: this.shouldUseCustomerManagedKey() }
    };

    return config;
  }
}