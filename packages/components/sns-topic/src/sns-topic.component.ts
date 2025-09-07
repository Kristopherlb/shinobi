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
  ComponentCapabilities
} from '@platform/contracts';

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
export const SNS_TOPIC_CONFIG_SCHEMA = {
  type: 'object',
  title: 'SNS Topic Configuration',
  description: 'Configuration for creating an SNS pub/sub topic',
  properties: {
    topicName: {
      type: 'string',
      description: 'Topic name (will be auto-generated if not provided)',
      pattern: '^[a-zA-Z0-9_-]+(\.fifo)?$',
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
      },
      additionalProperties: false,
      default: {
        enabled: false,
        contentBasedDeduplication: false
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
        }
      },
      additionalProperties: false,
      default: {
        enabled: false
      }
    },
    deliveryPolicy: {
      type: 'object',
      description: 'Delivery policy configuration',
      properties: {
        http: {
          type: 'object',
          description: 'HTTP delivery retry policy',
          properties: {
            defaultHealthyRetryPolicy: {
              type: 'object',
              description: 'Default healthy retry policy for HTTP endpoints',
              properties: {
                numRetries: {
                  type: 'number',
                  description: 'Number of retries',
                  minimum: 0,
                  maximum: 100,
                  default: 3
                },
                numMinDelayRetries: {
                  type: 'number',
                  description: 'Number of minimum delay retries',
                  minimum: 0,
                  maximum: 20,
                  default: 0
                },
                minDelayTarget: {
                  type: 'number',
                  description: 'Minimum delay target in seconds',
                  minimum: 1,
                  maximum: 3600,
                  default: 20
                },
                maxDelayTarget: {
                  type: 'number',
                  description: 'Maximum delay target in seconds',
                  minimum: 1,
                  maximum: 3600,
                  default: 20
                },
                numMaxDelayRetries: {
                  type: 'number',
                  description: 'Number of maximum delay retries',
                  minimum: 0,
                  maximum: 20,
                  default: 0
                },
                backoffFunction: {
                  type: 'string',
                  description: 'Backoff function type',
                  enum: ['linear', 'arithmetic', 'geometric', 'exponential'],
                  default: 'linear'
                }
              },
              additionalProperties: false,
              default: {
                numRetries: 3,
                numMinDelayRetries: 0,
                minDelayTarget: 20,
                maxDelayTarget: 20,
                numMaxDelayRetries: 0,
                backoffFunction: 'linear'
              }
            }
          },
          additionalProperties: false
        }
      },
      additionalProperties: false
    },
    messageFilterPolicy: {
      type: 'object',
      description: 'Message filtering policy (arbitrary key-value pairs)',
      additionalProperties: true
    },
    tracingConfig: {
      type: 'object',
      description: 'X-Ray tracing configuration',
      properties: {
        enabled: {
          type: 'boolean',
          description: 'Enable X-Ray tracing',
          default: false
        }
      },
      additionalProperties: false,
      default: {
        enabled: false
      }
    }
  },
  additionalProperties: false,
  defaults: {
    fifo: {
      enabled: false,
      contentBasedDeduplication: false
    },
    encryption: {
      enabled: false
    },
    tracingConfig: {
      enabled: false
    }
  }
};

/**
 * Configuration builder for SNS Topic component
 */
export class SnsTopicConfigBuilder {
  private context: ComponentContext;
  private spec: ComponentSpec;
  
  constructor(context: ComponentContext, spec: ComponentSpec) {
    this.context = context;
    this.spec = spec;
  }

  /**
   * Builds the final configuration by applying platform defaults, compliance frameworks, and user overrides
   */
  public async build(): Promise<SnsTopicConfig> {
    return this.buildSync();
  }

  /**
   * Synchronous version of build for use in synth() method
   */
  public buildSync(): SnsTopicConfig {
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
    
    return mergedConfig as SnsTopicConfig;
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
   * Get platform-wide defaults for SNS Topic
   */
  private getPlatformDefaults(): Record<string, any> {
    return {
      fifo: {
        enabled: false,
        contentBasedDeduplication: false
      },
      encryption: {
        enabled: this.getDefaultEncryptionEnabled()
      },
      tracingConfig: {
        enabled: this.getDefaultTracingEnabled()
      },
      deliveryPolicy: this.getDefaultDeliveryPolicy()
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
          encryption: {
            enabled: true // Encryption required for compliance
          },
          tracingConfig: {
            enabled: true // Enhanced monitoring required
          },
          deliveryPolicy: {
            http: {
              defaultHealthyRetryPolicy: {
                numRetries: 5, // Increased retries for reliability
                numMinDelayRetries: 2,
                minDelayTarget: 30,
                maxDelayTarget: 120,
                numMaxDelayRetries: 2,
                backoffFunction: 'exponential' // Better for compliance
              }
            }
          }
        };
        
      case 'fedramp-high':
        return {
          encryption: {
            enabled: true // Mandatory encryption
          },
          tracingConfig: {
            enabled: true // Required for audit trails
          },
          deliveryPolicy: {
            http: {
              defaultHealthyRetryPolicy: {
                numRetries: 10, // Maximum retries for high compliance
                numMinDelayRetries: 3,
                minDelayTarget: 60,
                maxDelayTarget: 300,
                numMaxDelayRetries: 3,
                backoffFunction: 'exponential' // Exponential backoff for reliability
              }
            }
          }
        };
        
      default: // commercial
        return {};
    }
  }

  /**
   * Get default encryption enabled setting
   */
  private getDefaultEncryptionEnabled(): boolean {
    return ['fedramp-moderate', 'fedramp-high'].includes(this.context.complianceFramework);
  }

  /**
   * Get default tracing enabled setting
   */
  private getDefaultTracingEnabled(): boolean {
    return ['fedramp-moderate', 'fedramp-high'].includes(this.context.complianceFramework);
  }

  /**
   * Get default delivery policy based on compliance framework
   */
  private getDefaultDeliveryPolicy(): any {
    const framework = this.context.complianceFramework;
    
    if (framework === 'fedramp-high' || framework === 'fedramp-moderate') {
      return {
        http: {
          defaultHealthyRetryPolicy: {
            numRetries: framework === 'fedramp-high' ? 10 : 5,
            numMinDelayRetries: framework === 'fedramp-high' ? 3 : 2,
            minDelayTarget: framework === 'fedramp-high' ? 60 : 30,
            maxDelayTarget: framework === 'fedramp-high' ? 300 : 120,
            numMaxDelayRetries: framework === 'fedramp-high' ? 3 : 2,
            backoffFunction: 'exponential'
          }
        }
      };
    }
    
    return {
      http: {
        defaultHealthyRetryPolicy: {
          numRetries: 3,
          numMinDelayRetries: 0,
          minDelayTarget: 20,
          maxDelayTarget: 20,
          numMaxDelayRetries: 0,
          backoffFunction: 'linear'
        }
      }
    };
  }
}

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
    // Build configuration using ConfigBuilder
    const configBuilder = new SnsTopicConfigBuilder(this.context, this.spec);
    this.config = configBuilder.buildSync();
    
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
      // Tracing not supported in SNS TopicProps - would be configured at subscription level
    };

    // Configure FIFO topic if enabled
    if (this.config!.fifo?.enabled) {
      Object.assign(topicProps, {
        fifo: true,
        contentBasedDeduplication: this.config!.fifo.contentBasedDeduplication
      });
    }

    this.topic = new sns.Topic(this, 'Topic', topicProps);

    // Apply delivery policy if configured
    if (this.config!.deliveryPolicy) {
      const cfnTopic = this.topic.node.defaultChild as sns.CfnTopic;
      // Set delivery policy through CFN properties
      cfnTopic.addPropertyOverride('DeliveryPolicy', this.config!.deliveryPolicy);
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
  private buildTopicCapability(): any {
    return {
      topicArn: this.topic!.topicArn
    };
  }

  /**
   * Helper methods for compliance decisions
   */
  private shouldUseCustomerManagedKey(): boolean {
    return this.config!.encryption?.enabled === true;
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

}