/**
 * Configuration Builder for Ec2InstanceComponent Component
 * 
 * Implements the ConfigBuilder pattern as defined in the Platform Component API Contract.
 * Provides 5-layer configuration precedence chain and compliance-aware defaults.
 */

import {
  ConfigBuilder,
  ConfigBuilderContext,
  ComponentConfigSchema,
  ComponentSpec,
  ComponentContext
} from '@shinobi/core';
import schemaJson from './Config.schema.json' with { type: 'json' };

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
    /** Log retention in days for CloudWatch agent log group */
    logRetentionInDays?: number;
  };

  /** Security configuration */
  security?: {
    /** Disable IMDSv1 */
    requireImdsv2?: boolean;
    /** Instance metadata hop limit */
    httpTokens?: 'optional' | 'required';
    /** Enable Nitro Enclaves */
    nitroEnclaves?: boolean;
    /** CIDR blocks allowed for SSH access */
    allowedSshCidrs?: string[];
  };
}

/**
 * JSON Schema for Ec2InstanceComponent configuration validation
 */
export const EC2_INSTANCE_CONFIG_SCHEMA: ComponentConfigSchema = schemaJson as ComponentConfigSchema;

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
        encrypted: true,
        deleteOnTermination: true
      },
      monitoring: {
        detailed: false,
        cloudWatchAgent: false,
        logRetentionInDays: 90
      },
      security: {
        requireImdsv2: false,
        httpTokens: 'optional',
        nitroEnclaves: false,
        allowedSshCidrs: []
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
