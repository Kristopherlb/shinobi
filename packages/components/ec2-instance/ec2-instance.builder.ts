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

  /** High-risk environment flag (set via platform config or service.yml) */
  highRiskEnvironment?: boolean;
  /** Enable KMS key rotation (set by builder based on risk level) */
  enableKeyRotation?: boolean;
  /** CPU alarm threshold (set by builder based on risk level) */
  cpuAlarmThreshold?: number;
  /** Enable STIG compliance tags (set by builder based on risk level) */
  enableStigCompliance?: boolean;
  /** Enable immutable infrastructure tags (set by builder based on risk level) */
  enableImmutableInfrastructure?: boolean;
  /** Enable compliance-specific S3 access (set by builder based on risk level) */
  enableComplianceS3Access?: boolean;
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
   * 
   * Provides sensible defaults based on risk assessment flags rather than framework checks.
   * High-risk environment defaults can be set via:
   * - Platform config files (`/config/{framework}.yml`) setting `highRiskEnvironment: true`
   * - Service-level configuration in `service.yml`
   * - Environment defaults
   * 
   * This ensures configuration is data-driven and risk-based, not framework-dependent.
   */
  protected getComplianceFrameworkDefaults(): Partial<Ec2InstanceConfig> {
    // Check if highRiskEnvironment flag is set in component config or platform config
    const componentConfig = this.builderContext.spec.config as Partial<Ec2InstanceConfig> | undefined;
    let isHighRisk = componentConfig?.highRiskEnvironment ?? false;
    
    // Also check platform config if available (loaded by base class)
    try {
      const platformConfig = (this as any)._loadPlatformConfiguration();
      if (platformConfig?.highRiskEnvironment) {
        isHighRisk = true;
      }
    } catch {
      // Platform config might not be available in tests, ignore
    }
    
    if (isHighRisk) {
      // Apply enhanced security defaults for high-risk environments
      // These defaults align with FedRAMP Moderate/High requirements when highRiskEnvironment is set
      return {
        monitoring: {
          detailed: true,
          cloudWatchAgent: true
        },
        storage: {
          encrypted: true,  // Customer-managed encryption required
          rootVolumeType: 'gp3'  // Enhanced performance
        },
        security: {
          requireImdsv2: true,
          httpTokens: 'required',
          nitroEnclaves: false  // Can be enabled explicitly for higher risk scenarios
        },
        // Enhanced monitoring and compliance features
        enableKeyRotation: true,
        cpuAlarmThreshold: 75,  // Stricter monitoring (can be overridden to 70 for higher risk)
        enableStigCompliance: true,
        enableImmutableInfrastructure: false,  // Can be enabled explicitly for higher risk
        enableComplianceS3Access: false  // Can be enabled explicitly for higher risk
      };
    }
    
    return {}; // Standard/default environment - use hardcoded fallbacks
  }

  /**
   * Get the JSON Schema for validation
   */
  public getSchema(): any {
    return EC2_INSTANCE_CONFIG_SCHEMA;
  }
}
