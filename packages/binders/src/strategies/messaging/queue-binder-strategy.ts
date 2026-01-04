/**
 * Queue Binder Strategy (Unified)
 * Handles messaging bindings for Amazon SQS and SNS with mandatory compliance enforcement
 */

import { UnifiedBinderStrategyBase, resolveActions } from '@shinobi/core';
import type { BindingContext, EnhancedBindingResult, CompatibilityEntry, AccessLevel } from '@shinobi/core';
import type { IamPolicy } from '@shinobi/core';
import { PolicyStatement, Effect } from 'aws-cdk-lib/aws-iam';

export class QueueBinderStrategy extends UnifiedBinderStrategyBase {
  readonly supportedCapabilities = ['messaging:sqs', 'messaging:sns', 'topic:sns', 'queue:sqs'];

  getStrategyName(): string {
    return 'Queue Binder Strategy (SQS/SNS)';
  }

  canHandle(sourceType: string, targetCapability: string): boolean {
    return this.supportedCapabilities.includes(targetCapability);
  }

  getCompatibilityMatrix(): CompatibilityEntry[] {
    return [
      {
        sourceType: '*',
        targetType: 'sqs-queue',
        capability: 'messaging:sqs',
        supportedAccess: ['read', 'write', 'readwrite'],
        description: 'Bind to SQS queue for sending and receiving messages',
        examples: ['lambda-api -> messaging:sqs (write)', 'ecs-task -> messaging:sqs (read)']
      },
      {
        sourceType: '*',
        targetType: 'sqs-queue',
        capability: 'queue:sqs',
        supportedAccess: ['read', 'write', 'readwrite'],
        description: 'Bind to SQS queue (alias capability)',
        examples: ['lambda-api -> queue:sqs (readwrite)']
      },
      {
        sourceType: '*',
        targetType: 'sns-topic',
        capability: 'messaging:sns',
        supportedAccess: ['publish', 'subscribe'],
        description: 'Bind to SNS topic for publishing and subscribing to messages',
        examples: ['lambda-api -> messaging:sns (publish)', 'lambda-worker -> messaging:sns (subscribe)']
      },
      {
        sourceType: '*',
        targetType: 'sns-topic',
        capability: 'topic:sns',
        supportedAccess: ['publish', 'subscribe'],
        description: 'Bind to SNS topic (alias capability)',
        examples: ['lambda-api -> topic:sns (publish)']
      }
    ];
  }

  protected async doBind(context: BindingContext): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    const { source, target, directive } = context;
    const { capability } = directive;

    // Validate inputs
    if (!target) {
      throw new Error('Target component is required for queue binding');
    }
    if (!capability) {
      throw new Error('Binding capability is required');
    }

    // Get target capability data
    const targetCapabilities = target.getCapabilities();
    const targetCapabilityData = targetCapabilities[capability];
    if (!targetCapabilityData) {
      throw new Error(`Target component does not provide capability '${capability}'`);
    }

    // Route to appropriate binding method
    if (capability === 'messaging:sqs' || capability === 'queue:sqs') {
      return await this.bindToSQS(context, targetCapabilityData);
    } else if (capability === 'messaging:sns' || capability === 'topic:sns') {
      return await this.bindToSNS(context, targetCapabilityData);
    } else {
      throw new Error(`Unsupported queue capability: ${capability}. Supported capabilities: ${this.supportedCapabilities.join(', ')}`);
    }
  }

  /**
   * Bind to SQS queue
   * 
   * @param context - Binding context
   * @param targetData - Expected structure (SQSCapabilityData):
   *   - type: 'queue:sqs'
   *   - resources (required): { arn: string, queueUrl: string, queueName: string }
   *   - encryption (required): { enabled: boolean, kmsKeyId?: string }
   *   - deadLetterQueue (optional): { arn: string, queueUrl: string, kmsKeyId?: string }
   *   - fifoQueue (optional): boolean - Indicates if this is a FIFO queue (auto-detected if queueName ends with '.fifo')
   *   - queueType (optional): 'FIFO' | 'STANDARD' - Explicit queue type (auto-detected if queueName ends with '.fifo')
   *   - contentBasedDeduplication (optional): boolean - Whether content-based deduplication is enabled (FIFO queues only)
   * @returns Enhanced binding result without compliance block
   */
  private async bindToSQS(
    context: BindingContext,
    targetData: any
  ): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    // Validate required target properties
    if (!targetData?.resources?.arn) {
      throw new Error('Target component missing required resources.arn property for SQS binding');
    }
    if (!targetData?.resources?.queueUrl) {
      throw new Error('Target component missing required resources.queueUrl property for SQS binding');
    }
    if (!targetData?.resources?.queueName) {
      throw new Error('Target component missing required resources.queueName property for SQS binding');
    }

    const { access } = context.directive;
    const environmentVariables: Record<string, string> = {};
    const iamPolicies: IamPolicy[] = [];

    // Validate access level for SQS
    const validAccess = ['read', 'write', 'readwrite'];
    if (!validAccess.includes(access)) {
      throw new Error(`Invalid access level for SQS: ${access}. Valid levels: ${validAccess.join(', ')}`);
    }

    // Check if granular actions are provided
    const hasGranularActions = !!context.directive.actions;

    if (hasGranularActions) {
      // Use granular actions - create single policy statement with resolved actions
      const resolvedActions = resolveActions(
        context.directive,
        context,
        (acc) => this.getSqsActionsForAccess(acc),
        'sqs'
      );

      const statement = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: resolvedActions,
        resources: [targetData.resources.arn]
      });
      iamPolicies.push({
        statement,
        description: 'SQS queue access permissions (granular actions)',
        complianceRequirement: 'Least privilege IAM access'
      });
    } else {
      // Use coarse access levels - create separate statements for read/write (existing behavior)
      // Grant SQS read permissions
      if (access === 'read' || access === 'readwrite') {
        const statement = new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
            'sqs:ReceiveMessage',
            'sqs:GetQueueAttributes',
            'sqs:GetQueueUrl',
            'sqs:DeleteMessage',
            'sqs:ChangeMessageVisibility'
          ],
          resources: [targetData.resources.arn]
        });
        iamPolicies.push({
          statement,
          description: 'SQS queue read access permissions',
          complianceRequirement: 'Least privilege IAM access'
        });
      }

      // Grant SQS write permissions
      if (access === 'write' || access === 'readwrite') {
        const isFifoQueue = targetData.resources.queueName.endsWith('.fifo') || 
                           targetData.fifoQueue === true ||
                           targetData.queueType === 'FIFO';
        
        const writeActions = ['sqs:SendMessage', 'sqs:GetQueueAttributes', 'sqs:GetQueueUrl'];
        
        // FIFO queues require additional actions for batch operations and deduplication
        if (isFifoQueue) {
          writeActions.push('sqs:SendMessageBatch');
          environmentVariables['SQS_QUEUE_TYPE'] = 'FIFO';
          environmentVariables['SQS_CONTENT_BASED_DEDUPLICATION'] = 
            targetData.contentBasedDeduplication === true ? 'true' : 'false';
        }
        
        const statement = new PolicyStatement({
          effect: Effect.ALLOW,
          actions: writeActions,
          resources: [targetData.resources.arn]
        });
        iamPolicies.push({
          statement,
          description: isFifoQueue 
            ? 'SQS FIFO queue write access permissions (with batch and deduplication support)'
            : 'SQS queue write access permissions',
          complianceRequirement: 'Least privilege IAM access'
        });
      }
    }

    // Set SQS environment variables
    environmentVariables['SQS_QUEUE_URL'] = targetData.resources.queueUrl;
    environmentVariables['SQS_QUEUE_ARN'] = targetData.resources.arn;
    environmentVariables['SQS_QUEUE_NAME'] = targetData.resources.queueName;

    // Add custom environment variable mappings if provided
    if (context.directive.env) {
      Object.entries(context.directive.env).forEach(([key, value]) => {
        if (value === 'queueUrl' || value === 'QUEUE_URL') {
          environmentVariables[key] = targetData.resources.queueUrl;
        } else if (value === 'queueArn' || value === 'QUEUE_ARN') {
          environmentVariables[key] = targetData.resources.arn;
        } else if (value === 'queueName' || value === 'QUEUE_NAME') {
          environmentVariables[key] = targetData.resources.queueName;
        }
      });
    }

    // Handle encryption configuration
    if (targetData.encryption?.enabled && targetData.encryption.kmsKeyId) {
      environmentVariables['SQS_KMS_KEY_ID'] = targetData.encryption.kmsKeyId;
      
      // Add KMS decrypt permissions for encrypted queues
      const kmsStatement = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          'kms:Decrypt',
          'kms:DescribeKey'
        ],
        resources: [`arn:aws:kms:*:*:key/${targetData.encryption.kmsKeyId}`]
      });
      iamPolicies.push({
        statement: kmsStatement,
        description: 'KMS decrypt permissions for encrypted SQS queue',
        complianceRequirement: 'Encryption at rest'
      });
    }

    // Handle dead letter queue configuration
    if (targetData.deadLetterQueue?.arn) {
      environmentVariables['SQS_DLQ_ARN'] = targetData.deadLetterQueue.arn;
      environmentVariables['SQS_DLQ_URL'] = targetData.deadLetterQueue.queueUrl;
      
      // Generate IAM policy for DLQ access when write access is granted
      // This allows the source to send failed messages to the DLQ
      if (access === 'write' || access === 'readwrite') {
        const dlqStatement = new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
            'sqs:SendMessage',
            'sqs:GetQueueAttributes',
            'sqs:GetQueueUrl'
          ],
          resources: [targetData.deadLetterQueue.arn]
        });
        iamPolicies.push({
          statement: dlqStatement,
          description: 'SQS dead letter queue write access permissions',
          complianceRequirement: 'Least privilege IAM access'
        });
        
        // If DLQ is also encrypted, add KMS permissions
        if (targetData.deadLetterQueue.kmsKeyId) {
          const dlqKmsStatement = new PolicyStatement({
            effect: Effect.ALLOW,
            actions: [
              'kms:Decrypt',
              'kms:GenerateDataKey',
              'kms:DescribeKey'
            ],
            resources: [`arn:aws:kms:*:*:key/${targetData.deadLetterQueue.kmsKeyId}`]
          });
          iamPolicies.push({
            statement: dlqKmsStatement,
            description: 'KMS permissions for encrypted SQS dead letter queue',
            complianceRequirement: 'Encryption at rest'
          });
        }
      }
    }

    return {
      environmentVariables,
      iamPolicies,
      securityGroupRules: []
    };
  }

  /**
   * Get SQS actions based on access level
   * Used by resolveActions to compute base actions from coarse access level
   * 
   * @param access - Access level (read, write, readwrite)
   * @returns Array of IAM action strings
   */
  private getSqsActionsForAccess(access: string): string[] {
    switch (access) {
      case 'read':
        return [
          'sqs:ReceiveMessage',
          'sqs:GetQueueAttributes',
          'sqs:GetQueueUrl',
          'sqs:DeleteMessage',
          'sqs:ChangeMessageVisibility'
        ];
      case 'write':
        return [
          'sqs:SendMessage',
          'sqs:GetQueueAttributes',
          'sqs:GetQueueUrl'
        ];
      case 'readwrite':
        return [
          'sqs:ReceiveMessage',
          'sqs:GetQueueAttributes',
          'sqs:GetQueueUrl',
          'sqs:DeleteMessage',
          'sqs:ChangeMessageVisibility',
          'sqs:SendMessage'
        ];
      default:
        throw new Error(`Unsupported SQS access level: ${access}`);
    }
  }

  /**
   * Bind to SNS topic
   * 
   * @param context - Binding context
   * @param targetData - Expected structure (SNSCapabilityData):
   *   - type: 'topic:sns'
   *   - resources (required): { arn: string, topicName: string }
   *   - encryption (required): { enabled: boolean, kmsKeyId?: string }
   * @returns Enhanced binding result without compliance block
   */
  private async bindToSNS(
    context: BindingContext,
    targetData: any
  ): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    // Validate required target properties
    if (!targetData?.resources?.arn) {
      throw new Error('Target component missing required resources.arn property for SNS binding');
    }
    if (!targetData?.resources?.topicName) {
      throw new Error('Target component missing required resources.topicName property for SNS binding');
    }

    const { access } = context.directive;
    const accessLevel = access as AccessLevel; // SNS supports 'publish' and 'subscribe' which are excluded from BindingDirective but valid at runtime
    const environmentVariables: Record<string, string> = {};
    const iamPolicies: IamPolicy[] = [];

    // Validate access level for SNS
    const validAccess = ['publish', 'subscribe'];
    if (!validAccess.includes(accessLevel)) {
      throw new Error(`Invalid access level for SNS: ${accessLevel}. Valid levels: ${validAccess.join(', ')}`);
    }

    // Grant SNS publish permissions
    if (accessLevel === 'publish') {
      const statement = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          'sns:Publish',
          'sns:GetTopicAttributes'
        ],
        resources: [targetData.resources.arn]
      });
      iamPolicies.push({
        statement,
        description: 'SNS topic publish access permissions',
        complianceRequirement: 'Least privilege IAM access'
      });
    }

    // Grant SNS subscribe permissions
    if (accessLevel === 'subscribe') {
      const statement = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          'sns:Subscribe',
          'sns:Unsubscribe',
          'sns:ConfirmSubscription',
          'sns:GetTopicAttributes',
          'sns:ListSubscriptionsByTopic'
        ],
        resources: [targetData.resources.arn]
      });
      iamPolicies.push({
        statement,
        description: 'SNS topic subscribe access permissions (including subscription confirmation)',
        complianceRequirement: 'Least privilege IAM access'
      });
    }

    // Set SNS environment variables
    environmentVariables['SNS_TOPIC_ARN'] = targetData.resources.arn;
    environmentVariables['SNS_TOPIC_NAME'] = targetData.resources.topicName;

    // Add custom environment variable mappings if provided
    if (context.directive.env) {
      Object.entries(context.directive.env).forEach(([key, value]) => {
        if (value === 'topicArn' || value === 'TOPIC_ARN') {
          environmentVariables[key] = targetData.resources.arn;
        } else if (value === 'topicName' || value === 'TOPIC_NAME') {
          environmentVariables[key] = targetData.resources.topicName;
        }
      });
    }

    // Handle encryption configuration
    if (targetData.encryption?.enabled && targetData.encryption.kmsKeyId) {
      environmentVariables['SNS_KMS_KEY_ID'] = targetData.encryption.kmsKeyId;
      
      // Add KMS permissions for encrypted topics
      const kmsStatement = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          'kms:Decrypt',
          'kms:GenerateDataKey',
          'kms:DescribeKey'
        ],
        resources: [`arn:aws:kms:*:*:key/${targetData.encryption.kmsKeyId}`]
      });
      iamPolicies.push({
        statement: kmsStatement,
        description: 'KMS permissions for encrypted SNS topic',
        complianceRequirement: 'Encryption at rest'
      });
    }

    return {
      environmentVariables,
      iamPolicies,
      securityGroupRules: []
    };
  }
}

