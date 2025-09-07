/**
 * SNS Topic Component
 * 
 * A pub/sub topic with compliance hardening and subscription management.
 * Implements three-tiered compliance model (Commercial/FedRAMP Moderate/FedRAMP High).
 */

import * as sns from 'aws-cdk-lib/aws-sns';
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
  TopicSnsCapability
} from '../../contracts';

/**
 * Configuration interface for SNS Topic component
 */
export interface SnsTopicConfig {
  /** Topic name (optional, will be auto-generated if not provided) */
  topicName?: string;
  
  /** Display name for the topic */
  displayName?: string;
  
  /** FIFO topic configuration */
  fifo?: {
    /** Enable FIFO topic */
    enabled: boolean;
    /** Content-based deduplication */
    contentBasedDeduplication?: boolean;
  };
  
  /** Encryption configuration */
  encryption?: {
    /** Enable server-side encryption */
    enabled?: boolean;
    /** KMS key ARN for encryption */
    kmsKeyArn?: string;
  };
  
  /** Delivery policy configuration */
  deliveryPolicy?: {
    /** HTTP retry policy */
    http?: {
      defaultHealthyRetryPolicy?: {
        numRetries?: number;
        numMinDelayRetries?: number;
        minDelayTarget?: number;
        maxDelayTarget?: number;
        numMaxDelayRetries?: number;
        backoffFunction?: 'linear' | 'arithmetic' | 'geometric' | 'exponential';
      };
    };
  };
  
  /** Message filtering policy */
  messageFilterPolicy?: Record<string, any>;
  
  /** Tracing configuration */
  tracingConfig?: {
    /** Enable X-Ray tracing */
    enabled?: boolean;
  };
}

/**
 * Configuration schema for SNS Topic component
 */
export const SNS_TOPIC_CONFIG_SCHEMA: ComponentConfigSchema = {
  type: 'object',
  title: 'SNS Topic Configuration',
  description: 'Configuration for creating an SNS pub/sub topic',
  properties: {
    topicName: {
      type: 'string',
      description: 'Topic name (will be auto-generated if not provided)',
      pattern: '^[a-zA-Z0-9_-]+$',
      minLength: 1,
      maxLength: 256
    },
    displayName: {
      type: 'string',
      description: 'Display name for the topic',
      maxLength: 100
    },
    fifo: {
      type: 'object',
      description: 'FIFO topic configuration',
      properties: {
        enabled: {
          type: 'boolean',
          description: 'Enable FIFO topic',
          default: false
        },
        contentBasedDeduplication: {
          type: 'boolean',
          description: 'Enable content-based deduplication',
          default: false
        }
      }
    }
  },
  additionalProperties: false,
  defaults: {
    fifo: { enabled: false }
  }
};

/**
 * SNS Topic Component implementing Component API Contract v1.0
 */
export class SnsTopicComponent extends Component {
  private topic?: sns.Topic;
  private kmsKey?: kms.Key;
  private config?: SnsTopicConfig;

  constructor(scope: Construct, id: string, context: ComponentContext, spec: ComponentSpec) {
    super(scope, id, context, spec);
  }

  /**
   * Synthesis phase - Create SNS topic with compliance hardening
   */
  public synth(): void {
    // Build configuration
    this.config = this.buildConfigSync();
    
    // Create KMS key for encryption if needed
    this.createKmsKeyIfNeeded();
    
    // Create SNS topic
    this.createTopic();
    
    // Apply compliance hardening
    this.applyComplianceHardening();
    
    // Register constructs
    this.registerConstruct('topic', this.topic!);
    if (this.kmsKey) {
      this.registerConstruct('kmsKey', this.kmsKey);
    }
    
    // Register capabilities
    this.registerCapability('topic:sns', this.buildTopicCapability());
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
    return 'sns-topic';
  }

  /**
   * Create KMS key for encryption if required by compliance framework
   */
  private createKmsKeyIfNeeded(): void {
    if (this.shouldUseCustomerManagedKey()) {
      this.kmsKey = new kms.Key(this, 'EncryptionKey', {
        description: `Encryption key for ${this.spec.name} SNS topic`,
        enableKeyRotation: this.context.complianceFramework === 'fedramp-high',
        keyUsage: kms.KeyUsage.ENCRYPT_DECRYPT,
        keySpec: kms.KeySpec.SYMMETRIC_DEFAULT
      });

      // Grant SNS service access to the key
      this.kmsKey.addToResourcePolicy(new iam.PolicyStatement({
        sid: 'AllowSNSService',
        principals: [new iam.ServicePrincipal('sns.amazonaws.com')],
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
   * Create the SNS topic
   */
  private createTopic(): void {
    const topicProps: sns.TopicProps = {
      topicName: this.buildTopicName(),
      displayName: this.config!.displayName,
      masterKey: this.kmsKey,
      tracing: this.config!.tracingConfig?.enabled ? 
        sns.Tracing.ACTIVE : sns.Tracing.PASS_THROUGH
    };

    // Configure FIFO topic if enabled
    if (this.config!.fifo?.enabled) {
      topicProps.fifo = true;
      topicProps.contentBasedDeduplication = this.config!.fifo.contentBasedDeduplication;
    }

    this.topic = new sns.Topic(this, 'Topic', topicProps);

    // Apply delivery policy if configured
    if (this.config!.deliveryPolicy) {
      const cfnTopic = this.topic.node.defaultChild as sns.CfnTopic;
      cfnTopic.deliveryPolicy = this.config!.deliveryPolicy;
    }
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
    if (this.topic) {
      this.topic.addToResourcePolicy(new iam.PolicyStatement({
        sid: 'DenyInsecureTransport',
        effect: iam.Effect.DENY,
        principals: [new iam.AnyPrincipal()],
        actions: ['sns:*'],
        resources: [this.topic.topicArn],
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

    // Restrict access to authenticated principals only
    if (this.topic) {
      this.topic.addToResourcePolicy(new iam.PolicyStatement({
        sid: 'RequireAuthentication',
        effect: iam.Effect.DENY,
        principals: [new iam.AnyPrincipal()],
        actions: ['sns:*'],
        resources: [this.topic.topicArn],
        conditions: {
          Bool: {
            'aws:PrincipalIsAWSService': 'false'
          },
          'Null': {
            'aws:userid': 'true'
          }
        }
      }));

      // Restrict to VPC endpoints for compliance
      this.topic.addToResourcePolicy(new iam.PolicyStatement({
        sid: 'RestrictToVPCEndpoints',
        effect: iam.Effect.DENY,
        principals: [new iam.AnyPrincipal()],
        actions: ['sns:*'],
        resources: [this.topic.topicArn],
        conditions: {
          StringNotEquals: {
            'aws:sourceVpce': ['vpce-*'] // Would be replaced with actual VPC endpoint ID
          }
        }
      }));
    }
  }

  private applyFedrampHighHardening(): void {
    // Apply all moderate hardening
    this.applyFedrampModerateHardening();

    // Additional high-security restrictions
    if (this.topic) {
      // Restrict to specific source IP ranges
      this.topic.addToResourcePolicy(new iam.PolicyStatement({
        sid: 'RestrictSourceIPs',
        effect: iam.Effect.DENY,
        principals: [new iam.AnyPrincipal()],
        actions: ['sns:*'],
        resources: [this.topic.topicArn],
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
      this.topic.addToResourcePolicy(new iam.PolicyStatement({
        sid: 'RequireMFAForAdmin',
        effect: iam.Effect.DENY,
        principals: [new iam.AnyPrincipal()],
        actions: [
          'sns:DeleteTopic',
          'sns:SetTopicAttributes',
          'sns:RemovePermission',
          'sns:AddPermission'
        ],
        resources: [this.topic.topicArn],
        conditions: {
          BoolIfExists: {
            'aws:MultiFactorAuthPresent': 'false'
          }
        }
      }));

      // Enable X-Ray tracing for audit purposes
      const cfnTopic = this.topic.node.defaultChild as sns.CfnTopic;
      cfnTopic.tracingConfig = 'Active';
    }
  }

  /**
   * Build topic capability data shape
   */
  private buildTopicCapability(): TopicSnsCapability {
    return {
      topicArn: this.topic!.topicArn
    };
  }

  /**
   * Helper methods for compliance decisions
   */
  private shouldUseCustomerManagedKey(): boolean {
    return ['fedramp-moderate', 'fedramp-high'].includes(this.context.complianceFramework) ||
           this.config!.encryption?.enabled === true;
  }

  private buildTopicName(): string | undefined {
    if (this.config!.topicName) {
      let name = this.config!.topicName;
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
  private buildConfigSync(): SnsTopicConfig {
    const config: SnsTopicConfig = {
      topicName: this.spec.config?.topicName,
      displayName: this.spec.config?.displayName,
      fifo: this.spec.config?.fifo || { enabled: false },
      encryption: this.spec.config?.encryption || { enabled: this.shouldUseCustomerManagedKey() },
      deliveryPolicy: this.spec.config?.deliveryPolicy,
      messageFilterPolicy: this.spec.config?.messageFilterPolicy,
      tracingConfig: {
        enabled: ['fedramp-moderate', 'fedramp-high'].includes(this.context.complianceFramework)
      }
    };

    return config;
  }
}