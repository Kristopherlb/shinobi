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
      
      // Step 2.5: Validate encryption for compliance frameworks
      this.validateEncryptionForCompliance();
      
      // Step 3: Create main AWS resources (DLQ first, then main queue)
      this.createDeadLetterQueueIfNeeded();
      this.createMainQueue();
      
      // Step 3.5: Configure DLQ redrive policy for operational recovery
      this.configureDlqRedrivePolicy();
      
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
      enableKeyRotation: this.context.complianceFramework === 'fedramp-high',
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
   * Creates a KMS key when:
   * - Encryption is enabled in config (regardless of framework)
   * - OR when compliance framework requires it (fedramp-moderate/high)
   * 
   * This allows highRiskEnvironment flag to enable encryption in any framework.
   */
  private shouldUseCustomerManagedKey(): boolean {
    // If encryption is explicitly enabled in config, create KMS key
    if (this.config.encryption?.enabled === true) {
      return true;
    }
    
    // For FedRAMP frameworks, encryption is required
    return this.context.complianceFramework === 'fedramp-moderate' ||
           this.context.complianceFramework === 'fedramp-high';
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
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/31cd8a5c-c5a9-4c85-9dba-5f04dc91dc42',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'sqs-queue.component.ts:250',message:'queue created',data:{queueName:this.queue.queueName,queueArn:this.queue.queueArn},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
    // #endregion
    
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
   * Validates encryption configuration for compliance frameworks
   * Logs warning if encryption is disabled in non-commercial frameworks
   */
  private validateEncryptionForCompliance(): void {
    if (!this.config.encryption?.enabled && 
        this.context.complianceFramework !== 'commercial') {
      this.logComponentEvent(
        'encryption_disabled_warning',
        'Encryption is disabled in non-commercial compliance framework',
        {
          complianceFramework: this.context.complianceFramework,
          component: this.spec.name,
          warning: 'Encryption should be enabled for FedRAMP compliance frameworks'
        }
      );
    }
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
