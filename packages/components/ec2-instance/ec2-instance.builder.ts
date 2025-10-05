/**
 * Configuration Builder for Ec2InstanceComponent Component
 * 
 * Implements the ConfigBuilder pattern as defined in the Platform Component API Contract.
 * Provides 5-layer configuration precedence chain and compliance-aware defaults.
 */

import {
  ConfigBuilder,
  ConfigBuilderContext,
  ComponentSpec,
  ComponentContext
} from '@shinobi/core';

/**
 * Configuration interface for Ec2InstanceComponent component
 */
export interface Ec2InstanceConfig {
  /** Instance type */
  instanceType?: string;

  /** AMI ID or lookup criteria */
  ami?: {
    /** AMI ID */
    amiId?: string;
    /** AMI name pattern for lookup */
    namePattern?: string;
    /** AMI owner */
    owner?: string;
  };

  /** VPC configuration */
  vpc?: {
    /** VPC ID */
    vpcId?: string;
    /** Subnet ID */
    subnetId?: string;
    /** Security group IDs */
    securityGroupIds?: string[];
  };

  /** User data script */
  userData?: {
    /** User data script content */
    script?: string;
    /** User data from file */
    fromFile?: string;
  };

  /** Key pair for SSH access */
  keyPair?: {
    /** Key pair name */
    keyName?: string;
  };

  /** EBS configuration */
  storage?: {
    /** Root volume size in GB */
    rootVolumeSize?: number;
    /** Root volume type */
    rootVolumeType?: string;
    /** IOPS for io1/io2 volume types */
    iops?: number;
    /** Enable encryption */
    encrypted?: boolean;
    /** KMS key ARN */
    kmsKeyArn?: string;
    /** Delete on termination */
    deleteOnTermination?: boolean;
  };

  /** Monitoring configuration */
  monitoring?: {
    /** Enable detailed monitoring */
    detailed?: boolean;
    /** CloudWatch agent config */
    cloudWatchAgent?: boolean;
  };

  /** Security configuration */
  security?: {
    /** Disable IMDSv1 */
    requireImdsv2?: boolean;
    /** Instance metadata hop limit */
    httpTokens?: 'optional' | 'required';
    /** Enable Nitro Enclaves */
    nitroEnclaves?: boolean;
  };
}

/**
 * JSON Schema for Ec2InstanceComponent configuration validation
 */
export const EC2_INSTANCE_CONFIG_SCHEMA = {
  type: 'object',
  title: 'EC2 Instance Configuration',
  description: 'Configuration for creating an EC2 compute instance with compliance hardening',
  properties: {
    instanceType: {
      type: 'string',
      description: 'EC2 instance type',
      enum: [
        't3.micro', 't3.small', 't3.medium', 't3.large', 't3.xlarge', 't3.2xlarge',
        'm5.large', 'm5.xlarge', 'm5.2xlarge', 'm5.4xlarge', 'm5.8xlarge',
        'c5.large', 'c5.xlarge', 'c5.2xlarge', 'c5.4xlarge',
        'r5.large', 'r5.xlarge', 'r5.2xlarge'
      ],
      default: 't3.micro'
    },
    ami: {
      type: 'object',
      description: 'AMI configuration',
      properties: {
        amiId: {
          type: 'string',
          description: 'Specific AMI ID to use',
          pattern: '^ami-[a-f0-9]{8,17}$'
        },
        namePattern: {
          type: 'string',
          description: 'AMI name pattern for lookup',
          default: 'amzn2-ami-hvm-*-x86_64-gp2'
        },
        owner: {
          type: 'string',
          description: 'AMI owner',
          enum: ['amazon', 'self', 'aws-marketplace'],
          default: 'amazon'
        }
      },
      additionalProperties: false
    },
    vpc: {
      type: 'object',
      description: 'VPC configuration',
      properties: {
        vpcId: {
          type: 'string',
          description: 'VPC ID to deploy into',
          pattern: '^vpc-[a-f0-9]{8,17}$'
        },
        subnetId: {
          type: 'string',
          description: 'Subnet ID for the instance',
          pattern: '^subnet-[a-f0-9]{8,17}$'
        },
        securityGroupIds: {
          type: 'array',
          description: 'Additional security group IDs',
          items: {
            type: 'string',
            pattern: '^sg-[a-f0-9]{8,17}$'
          },
          maxItems: 5
        }
      },
      additionalProperties: false
    },
    userData: {
      type: 'object',
      description: 'User data script configuration',
      properties: {
        script: {
          type: 'string',
          description: 'User data script content'
        },
        fromFile: {
          type: 'string',
          description: 'Path to user data script file'
        }
      },
      additionalProperties: false
    },
    keyPair: {
      type: 'object',
      description: 'Key pair configuration for SSH access',
      properties: {
        keyName: {
          type: 'string',
          description: 'EC2 key pair name'
        }
      },
      additionalProperties: false
    },
    storage: {
      type: 'object',
      description: 'EBS storage configuration',
      properties: {
        rootVolumeSize: {
          type: 'number',
          description: 'Root volume size in GB',
          minimum: 8,
          maximum: 16384,
          default: 20
        },
        rootVolumeType: {
          type: 'string',
          description: 'Root volume type',
          enum: ['gp2', 'gp3', 'io1', 'io2'],
          default: 'gp3'
        },
        encrypted: {
          type: 'boolean',
          description: 'Enable EBS encryption',
          default: false
        },
        kmsKeyArn: {
          type: 'string',
          description: 'KMS key ARN for encryption',
          pattern: '^arn:aws:kms:[a-z0-9-]+:[0-9]{12}:key/[a-f0-9-]{36}$'
        },
        deleteOnTermination: {
          type: 'boolean',
          description: 'Delete volume on instance termination',
          default: true
        }
      },
      additionalProperties: false
    },
    monitoring: {
      type: 'object',
      description: 'Monitoring configuration',
      properties: {
        detailed: {
          type: 'boolean',
          description: 'Enable detailed CloudWatch monitoring',
          default: false
        },
        cloudWatchAgent: {
          type: 'boolean',
          description: 'Enable CloudWatch agent installation',
          default: false
        }
      },
      additionalProperties: false
    },
    security: {
      type: 'object',
      description: 'Security configuration',
      properties: {
        requireImdsv2: {
          type: 'boolean',
          description: 'Disable IMDSv1 and require IMDSv2',
          default: false
        },
        httpTokens: {
          type: 'string',
          description: 'Instance metadata service token requirement',
          enum: ['optional', 'required'],
          default: 'optional'
        },
        nitroEnclaves: {
          type: 'boolean',
          description: 'Enable AWS Nitro Enclaves',
          default: false
        }
      },
      additionalProperties: false
    }
  },
  additionalProperties: false,
  required: []
};

/**
 * ConfigBuilder for Ec2InstanceComponent component
 * 
 * Implements the 5-layer configuration precedence chain:
 * 1. Hardcoded Fallbacks (ultra-safe baseline)
 * 2. Platform Defaults (from platform config)
 * 3. Environment Defaults (from environment config) 
 * 4. Component Overrides (from service.yml)
 * 5. Policy Overrides (from governance policies)
 */
export class Ec2InstanceComponentConfigBuilder extends ConfigBuilder<Ec2InstanceConfig> {

  constructor(context: ComponentContext, spec: ComponentSpec) {
    const builderContext: ConfigBuilderContext = { context, spec };
    super(builderContext, EC2_INSTANCE_CONFIG_SCHEMA);
  }

  /**
   * Layer 1: Hardcoded Fallbacks
   * Ultra-safe baseline configuration that works in any environment
   */
  protected getHardcodedFallbacks(): Partial<Ec2InstanceConfig> {
    return {
      instanceType: 't3.micro',
      ami: {
        namePattern: 'al2023-ami-*-x86_64',
        owner: 'amazon'
      },
      storage: {
        rootVolumeSize: 20,
        rootVolumeType: 'gp3',
        encrypted: false,
        deleteOnTermination: true
      },
      monitoring: {
        detailed: false,
        cloudWatchAgent: false
      },
      security: {
        requireImdsv2: false,
        httpTokens: 'optional',
        nitroEnclaves: false
      }
    };
  }

  /**
   * Layer 2: Compliance Framework Defaults
   * Security and compliance-specific configurations
   */
  protected getComplianceFrameworkDefaults(): Partial<Ec2InstanceConfig> {
    const framework = this.builderContext.context.complianceFramework;

    const baseCompliance: Partial<Ec2InstanceConfig> = {
      monitoring: {
        detailed: true,
        cloudWatchAgent: true
      }
    };

    if (framework === 'fedramp-moderate') {
      return {
        ...baseCompliance,
        storage: {
          encrypted: true  // Customer-managed encryption required
        },
        security: {
          requireImdsv2: true,
          httpTokens: 'required',
          nitroEnclaves: false
        }
      };
    }

    if (framework === 'fedramp-high') {
      return {
        ...baseCompliance,
        storage: {
          encrypted: true,  // Customer-managed encryption required
          rootVolumeType: 'gp3'  // Enhanced performance
        },
        security: {
          requireImdsv2: true,
          httpTokens: 'required',
          nitroEnclaves: true  // Enhanced security for FedRAMP High
        }
      };
    }

    return baseCompliance;
  }

  /**
   * Get the JSON Schema for validation
   */
  public getSchema(): any {
    return EC2_INSTANCE_CONFIG_SCHEMA;
  }
}
