/**
 * Queue Binder Strategy
 * Handles binding between compute components and queue components (SQS, SNS, etc.)
 */

import * as iam from 'aws-cdk-lib/aws-iam';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as sns from 'aws-cdk-lib/aws-sns';
import { EnhancedBinderStrategy } from '../enhanced-binder-strategy';
import {
  EnhancedBindingContext,
  EnhancedBindingResult,
  IamPolicy,
  SecurityGroupRule,
  ComplianceAction
} from '../bindings';

/**
 * Queue binder strategy for SQS/SNS connections
 */
export class QueueBinderStrategy extends EnhancedBinderStrategy {

  getStrategyName(): string {
    return 'QueueBinderStrategy';
  }

  canHandle(sourceType: string, targetCapability: string): boolean {
    // Handle any compute component binding to queue capabilities
    const computeTypes = ['lambda-api', 'ecs-service', 'ec2-instance', 'fargate-service'];
    const queueCapabilities = ['queue:sqs', 'topic:sns', 'messaging:sqs', 'messaging:sns'];

    return computeTypes.includes(sourceType) && queueCapabilities.includes(targetCapability);
  }

  bind(context: EnhancedBindingContext): EnhancedBindingResult {
    this.validateBindingContext(context);

    const capability = context.targetCapabilityData;
    const access = context.directive.access;

    // Generate environment variables
    const environmentVariables = this.generateEnvironmentVariables(context);

    // Create IAM policies for queue access
    const iamPolicies = this.createQueueIamPolicies(context, capability, access);

    // SQS/SNS don't require security group rules (HTTP/HTTPS access)
    const securityGroupRules: SecurityGroupRule[] = [];

    // Apply compliance restrictions
    const { policies, rules, actions } = this.applyComplianceRestrictions(
      context,
      iamPolicies,
      securityGroupRules
    );

    // Configure dead letter queue if specified
    const dlqConfig = this.configureDeadLetterQueue(context, capability, actions);

    return this.createBindingResult(
      environmentVariables,
      policies,
      rules,
      actions,
      context,
      {
        networkConfig: this.createQueueNetworkConfig(context, capability),
        deadLetterQueue: dlqConfig
      }
    );
  }

  /**
   * Create IAM policies for queue access
   */
  private createQueueIamPolicies(
    context: EnhancedBindingContext,
    capability: any,
    access: string
  ): IamPolicy[] {
    const policies: IamPolicy[] = [];
    const queueArn = capability.resources?.arn || capability.resources?.queueArn || capability.resources?.topicArn;

    if (!queueArn) {
      throw new Error(`Queue ARN not found in capability data for ${context.target.getName()}`);
    }

    // Determine if this is SQS or SNS based on capability type
    const isSQS = capability.type?.includes('sqs') || queueArn.includes(':sqs:');
    const isSNS = capability.type?.includes('sns') || queueArn.includes(':sns:');

    if (isSQS) {
      policies.push(...this.createSQSPolicies(context, capability, access, queueArn));
    } else if (isSNS) {
      policies.push(...this.createSNSPolicies(context, capability, access, queueArn));
    }

    // CloudWatch metrics access for monitoring
    const monitoringPolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'cloudwatch:GetMetricStatistics',
        'cloudwatch:ListMetrics',
        'cloudwatch:GetMetricData'
      ],
      resources: ['*'],
      conditions: {
        'StringEquals': {
          'aws:RequestedRegion': process.env.AWS_REGION || 'us-east-1'
        }
      }
    });

    policies.push({
      statement: monitoringPolicy,
      description: `Queue monitoring access for ${context.source.getName()}`,
      complianceRequirement: 'queue_monitoring'
    });

    return policies;
  }

  /**
   * Create SQS-specific IAM policies
   */
  private createSQSPolicies(
    context: EnhancedBindingContext,
    capability: any,
    access: string,
    queueArn: string
  ): IamPolicy[] {
    const policies: IamPolicy[] = [];

    // Base SQS access policy
    const sqsActions = this.getSQSActionsForAccess(access);

    const basePolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: sqsActions,
      resources: [queueArn],
      conditions: {
        'StringEquals': {
          'aws:RequestedRegion': process.env.AWS_REGION || 'us-east-1'
        },
        'Bool': {
          'aws:SecureTransport': 'true' // Require HTTPS
        }
      }
    });

    policies.push({
      statement: basePolicy,
      description: `SQS ${access} access for ${context.source.getName()} -> ${context.target.getName()}`,
      complianceRequirement: 'sqs_access'
    });

    // SQS queue attributes access
    const attributesPolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'sqs:GetQueueAttributes',
        'sqs:ListQueues'
      ],
      resources: [queueArn],
      conditions: {
        'StringEquals': {
          'aws:RequestedRegion': process.env.AWS_REGION || 'us-east-1'
        },
        'Bool': {
          'aws:SecureTransport': 'true'
        }
      }
    });

    policies.push({
      statement: attributesPolicy,
      description: `SQS queue attributes access for ${context.source.getName()}`,
      complianceRequirement: 'sqs_attributes'
    });

    // Dead letter queue access if configured
    if (capability.deadLetterQueue?.arn) {
      const dlqPolicy = new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'sqs:SendMessage',
          'sqs:GetQueueAttributes'
        ],
        resources: [capability.deadLetterQueue.arn],
        conditions: {
          'StringEquals': {
            'aws:RequestedRegion': process.env.AWS_REGION || 'us-east-1'
          },
          'Bool': {
            'aws:SecureTransport': 'true'
          }
        }
      });

      policies.push({
        statement: dlqPolicy,
        description: `SQS dead letter queue access for ${context.source.getName()}`,
        complianceRequirement: 'sqs_dlq'
      });
    }

    return policies;
  }

  /**
   * Create SNS-specific IAM policies
   */
  private createSNSPolicies(
    context: EnhancedBindingContext,
    capability: any,
    access: string,
    topicArn: string
  ): IamPolicy[] {
    const policies: IamPolicy[] = [];

    // Base SNS access policy
    const snsActions = this.getSNSActionsForAccess(access);

    const basePolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: snsActions,
      resources: [topicArn],
      conditions: {
        'StringEquals': {
          'aws:RequestedRegion': process.env.AWS_REGION || 'us-east-1'
        },
        'Bool': {
          'aws:SecureTransport': 'true' // Require HTTPS
        }
      }
    });

    policies.push({
      statement: basePolicy,
      description: `SNS ${access} access for ${context.source.getName()} -> ${context.target.getName()}`,
      complianceRequirement: 'sns_access'
    });

    // SNS topic attributes access
    const attributesPolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'sns:GetTopicAttributes',
        'sns:ListTopics'
      ],
      resources: [topicArn],
      conditions: {
        'StringEquals': {
          'aws:RequestedRegion': process.env.AWS_REGION || 'us-east-1'
        },
        'Bool': {
          'aws:SecureTransport': 'true'
        }
      }
    });

    policies.push({
      statement: attributesPolicy,
      description: `SNS topic attributes access for ${context.source.getName()}`,
      complianceRequirement: 'sns_attributes'
    });

    return policies;
  }

  /**
   * Get SQS actions based on access level
   */
  private getSQSActionsForAccess(access: string): string[] {
    switch (access) {
      case 'read':
        return [
          'sqs:ReceiveMessage',
          'sqs:DeleteMessage',
          'sqs:ChangeMessageVisibility'
        ];
      case 'write':
        return [
          'sqs:SendMessage',
          'sqs:SendMessageBatch'
        ];
      case 'readwrite':
        return [
          'sqs:ReceiveMessage',
          'sqs:DeleteMessage',
          'sqs:ChangeMessageVisibility',
          'sqs:SendMessage',
          'sqs:SendMessageBatch'
        ];
      case 'admin':
        return [
          'sqs:ReceiveMessage',
          'sqs:DeleteMessage',
          'sqs:ChangeMessageVisibility',
          'sqs:SendMessage',
          'sqs:SendMessageBatch',
          'sqs:SetQueueAttributes',
          'sqs:GetQueueAttributes',
          'sqs:DeleteQueue'
        ];
      default:
        throw new Error(`Unsupported SQS access level: ${access}`);
    }
  }

  /**
   * Get SNS actions based on access level
   */
  private getSNSActionsForAccess(access: string): string[] {
    switch (access) {
      case 'read':
        return [
          'sns:Subscribe',
          'sns:Unsubscribe',
          'sns:GetSubscriptionAttributes'
        ];
      case 'write':
        return [
          'sns:Publish'
        ];
      case 'readwrite':
        return [
          'sns:Publish',
          'sns:Subscribe',
          'sns:Unsubscribe',
          'sns:GetSubscriptionAttributes'
        ];
      case 'admin':
        return [
          'sns:Publish',
          'sns:Subscribe',
          'sns:Unsubscribe',
          'sns:GetSubscriptionAttributes',
          'sns:SetTopicAttributes',
          'sns:GetTopicAttributes',
          'sns:DeleteTopic'
        ];
      default:
        throw new Error(`Unsupported SNS access level: ${access}`);
    }
  }

  /**
   * Configure dead letter queue
   */
  private configureDeadLetterQueue(
    context: EnhancedBindingContext,
    capability: any,
    actions: ComplianceAction[]
  ): any {
    const dlqConfig = context.directive.options?.deadLetterQueue;

    if (dlqConfig) {
      actions.push({
        type: 'policy',
        description: 'Dead letter queue configured for message processing failures',
        framework: context.complianceFramework,
        details: {
          requirement: 'dlq_configuration',
          maxReceiveCount: dlqConfig.maxReceiveCount || 3,
          queueArn: dlqConfig.queueArn
        }
      });

      return {
        enabled: true,
        maxReceiveCount: dlqConfig.maxReceiveCount || 3,
        queueArn: dlqConfig.queueArn,
        visibilityTimeout: dlqConfig.visibilityTimeout || 30
      };
    }

    return { enabled: false };
  }

  /**
   * Create queue network configuration
   */
  private createQueueNetworkConfig(context: EnhancedBindingContext, capability: any): any {
    return {
      vpc: capability.vpcEndpoint ? {
        endpoint: capability.vpcEndpoint,
        type: capability.type?.includes('sqs') ? 'sqs' : 'sns'
      } : undefined
    };
  }

  /**
   * Override environment variable generation for queue-specific mappings
   */
  protected generateEnvironmentVariables(
    context: EnhancedBindingContext,
    customMappings?: Record<string, string>
  ): Record<string, string> {
    const envVars: Record<string, string> = {};
    const capability = context.targetCapabilityData;

    // Queue-specific default mappings
    const defaultMappings: Record<string, string> = {
      queueUrl: `${context.target.getName().toUpperCase()}_QUEUE_URL`,
      queueArn: `${context.target.getName().toUpperCase()}_QUEUE_ARN`,
      topicArn: `${context.target.getName().toUpperCase()}_TOPIC_ARN`,
      region: `${context.target.getName().toUpperCase()}_QUEUE_REGION`,
      dlqUrl: `${context.target.getName().toUpperCase()}_DLQ_URL`,
      dlqArn: `${context.target.getName().toUpperCase()}_DLQ_ARN`
    };

    // Apply custom mappings or use defaults
    const mappings = customMappings || context.directive.env || defaultMappings;

    // Map capability data to environment variables
    if (capability.resources?.url && mappings.queueUrl) {
      envVars[mappings.queueUrl] = capability.resources.url;
    }
    if (capability.resources?.arn && mappings.queueArn) {
      envVars[mappings.queueArn] = capability.resources.arn;
    }
    if (capability.resources?.topicArn && mappings.topicArn) {
      envVars[mappings.topicArn] = capability.resources.topicArn;
    }
    if (capability.region && mappings.region) {
      envVars[mappings.region] = capability.region;
    }

    // Dead letter queue configuration
    if (capability.deadLetterQueue?.url && mappings.dlqUrl) {
      envVars[mappings.dlqUrl] = capability.deadLetterQueue.url;
    }
    if (capability.deadLetterQueue?.arn && mappings.dlqArn) {
      envVars[mappings.dlqArn] = capability.deadLetterQueue.arn;
    }

    return envVars;
  }

  /**
   * Override compliance restrictions for queue-specific requirements
   */
  protected applyComplianceRestrictions(
    context: EnhancedBindingContext,
    policies: IamPolicy[],
    securityGroupRules: SecurityGroupRule[]
  ): { policies: IamPolicy[]; rules: SecurityGroupRule[]; actions: ComplianceAction[] } {
    const result = super.applyComplianceRestrictions(context, policies, securityGroupRules);

    // Add queue-specific compliance actions
    if (context.complianceFramework === 'fedramp-high' || context.complianceFramework === 'fedramp-moderate') {
      result.actions.push({
        type: 'restriction',
        description: 'FedRAMP: VPC endpoint required for SQS/SNS access',
        framework: context.complianceFramework,
        details: {
          requirement: 'vpc_endpoint_sqs_sns',
          services: ['sqs', 'sns']
        }
      });

      result.actions.push({
        type: 'monitoring',
        description: 'FedRAMP: Queue access logging required',
        framework: context.complianceFramework,
        details: {
          requirement: 'queue_access_logging',
          retention: context.complianceFramework === 'fedramp-high' ? '365_days' : '90_days'
        }
      });

      // Dead letter queue requirement for FedRAMP
      result.actions.push({
        type: 'policy',
        description: 'FedRAMP: Dead letter queue required for message processing',
        framework: context.complianceFramework,
        details: {
          requirement: 'dead_letter_queue',
          purpose: 'error_handling'
        }
      });
    }

    return result;
  }
}
