/**
 * Configuration Builder for SageMakerNotebookInstanceComponent Component
 * 
 * Implements the ConfigBuilder pattern as defined in the Platform Component API Contract.
 * Provides 5-layer configuration precedence chain and compliance-aware defaults.
 */

import { ConfigBuilder, ConfigBuilderContext, ComponentConfigSchema } from '../@shinobi/core/config-builder';
import { ComponentContext, ComponentSpec } from '../@shinobi/core/component-interfaces';

/**
 * Configuration interface for SageMakerNotebookInstanceComponent component
 */
export interface SageMakerNotebookInstanceConfig {
  /** Component name (optional, will be auto-generated) */
  name?: string;
  
  /** Component description */
  description?: string;
  
  /** Notebook instance name (optional, will be auto-generated) */
  notebookInstanceName?: string;
  
  /** Instance type for the notebook */
  instanceType?: string;
  
  /** IAM role for the notebook instance */
  roleArn?: string;
  
  /** Subnet ID for VPC placement */
  subnetId?: string;
  
  /** VPC ID for security group creation */
  vpcId?: string;
  
  /** Security group IDs */
  securityGroupIds?: string[];
  
  /** KMS key for encryption */
  kmsKeyId?: string;
  
  /** Root access configuration */
  rootAccess?: 'Enabled' | 'Disabled';
  
  /** Direct internet access */
  directInternetAccess?: 'Enabled' | 'Disabled';
  
  /** Volume size in GB */
  volumeSizeInGB?: number;
  
  /** Default code repository */
  defaultCodeRepository?: string;
  
  /** Additional code repositories */
  additionalCodeRepositories?: string[];
  
  /** Lifecycle configuration */
  lifecycleConfigName?: string;
  
  /** Platform identifier */
  platformIdentifier?: string;
  
  /** Accelerator types */
  acceleratorTypes?: string[];
  
  /** Instance metadata service configuration */
  instanceMetadataServiceConfiguration?: {
    /** Minimum IMDS version */
    minimumInstanceMetadataServiceVersion?: string;
  };
  
  /** Monitoring configuration */
  monitoring?: {
    enabled?: boolean;
    detailedMetrics?: boolean;
  };
  
  /** Security configuration */
  security?: {
    kmsEncryption?: boolean;
    vpcOnly?: boolean;
  };
  
  /** Compliance configuration */
  compliance?: {
    auditLogging?: boolean;
    retentionDays?: number;
  };
  
  /** Tagging configuration */
  tags?: Record<string, string>;
}

/**
 * JSON Schema for SageMakerNotebookInstanceComponent configuration validation
 */
export const SAGEMAKER_NOTEBOOK_INSTANCE_CONFIG_SCHEMA = {
  type: 'object',
  title: 'SageMaker Notebook Instance Configuration',
  description: 'Configuration for creating a SageMaker Notebook Instance',
  properties: {
    name: {
      type: 'string',
      description: 'Component name (optional, will be auto-generated from component name)',
      pattern: '^[a-zA-Z][a-zA-Z0-9-_]*$',
      maxLength: 128
    },
    description: {
      type: 'string',
      description: 'Component description for documentation',
      maxLength: 1024
    },
    notebookInstanceName: {
      type: 'string',
      description: 'Name of the notebook instance (will be auto-generated if not provided)',
      pattern: '^[a-zA-Z0-9\\-]{1,63}$',
      maxLength: 63
    },
    instanceType: {
      type: 'string',
      description: 'Instance type for the notebook',
      enum: [
        'ml.t2.medium', 'ml.t2.large', 'ml.t2.xlarge', 'ml.t2.2xlarge',
        'ml.t3.medium', 'ml.t3.large', 'ml.t3.xlarge', 'ml.t3.2xlarge',
        'ml.m4.xlarge', 'ml.m4.2xlarge', 'ml.m4.4xlarge', 'ml.m4.10xlarge', 'ml.m4.16xlarge',
        'ml.m5.large', 'ml.m5.xlarge', 'ml.m5.2xlarge', 'ml.m5.4xlarge', 'ml.m5.12xlarge', 'ml.m5.24xlarge',
        'ml.c4.large', 'ml.c4.xlarge', 'ml.c4.2xlarge', 'ml.c4.4xlarge', 'ml.c4.8xlarge',
        'ml.c5.large', 'ml.c5.xlarge', 'ml.c5.2xlarge', 'ml.c5.4xlarge', 'ml.c5.9xlarge', 'ml.c5.18xlarge',
        'ml.p2.xlarge', 'ml.p2.8xlarge', 'ml.p2.16xlarge',
        'ml.p3.2xlarge', 'ml.p3.8xlarge', 'ml.p3.16xlarge',
        'ml.g4dn.xlarge', 'ml.g4dn.2xlarge', 'ml.g4dn.4xlarge', 'ml.g4dn.8xlarge', 'ml.g4dn.12xlarge', 'ml.g4dn.16xlarge'
      ]
    },
    roleArn: {
      type: 'string',
      description: 'IAM role ARN for the notebook instance'
    },
    subnetId: {
      type: 'string',
      description: 'Subnet ID for VPC placement'
    },
    securityGroupIds: {
      type: 'array',
      description: 'Security group IDs',
      items: { type: 'string' },
      maxItems: 5
    },
    kmsKeyId: {
      type: 'string',
      description: 'KMS key ID for encryption'
    },
    rootAccess: {
      type: 'string',
      description: 'Root access configuration',
      enum: ['Enabled', 'Disabled']
    },
    directInternetAccess: {
      type: 'string',
      description: 'Direct internet access',
      enum: ['Enabled', 'Disabled']
    },
    volumeSizeInGB: {
      type: 'number',
      description: 'Volume size in GB',
      minimum: 5,
      maximum: 16384
    },
    defaultCodeRepository: {
      type: 'string',
      description: 'Default code repository URL'
    },
    additionalCodeRepositories: {
      type: 'array',
      description: 'Additional code repositories',
      items: { type: 'string' },
      maxItems: 3
    },
    lifecycleConfigName: {
      type: 'string',
      description: 'Lifecycle configuration name'
    },
    platformIdentifier: {
      type: 'string',
      description: 'Platform identifier',
      enum: ['notebook-al1-v1', 'notebook-al2-v1', 'notebook-al2-v2']
    },
    acceleratorTypes: {
      type: 'array',
      description: 'Accelerator types',
      items: {
        type: 'string',
        enum: ['ml.eia1.medium', 'ml.eia1.large', 'ml.eia1.xlarge', 'ml.eia2.medium', 'ml.eia2.large', 'ml.eia2.xlarge']
      },
      maxItems: 1
    },
    instanceMetadataServiceConfiguration: {
      type: 'object',
      description: 'Instance metadata service configuration',
      properties: {
        minimumInstanceMetadataServiceVersion: {
          type: 'string',
          description: 'Minimum IMDS version',
          enum: ['1', '2']
        }
      },
      additionalProperties: false
    },
    monitoring: {
      type: 'object',
      description: 'Monitoring and observability configuration',
      properties: {
        enabled: {
          type: 'boolean',
          description: 'Enable monitoring'
        },
        detailedMetrics: {
          type: 'boolean',
          description: 'Enable detailed CloudWatch metrics'
        }
      },
      additionalProperties: false
    },
    security: {
      type: 'object',
      description: 'Security configuration',
      properties: {
        kmsEncryption: {
          type: 'boolean',
          description: 'Enable KMS encryption'
        },
        vpcOnly: {
          type: 'boolean',
          description: 'Restrict to VPC only'
        }
      },
      additionalProperties: false
    },
    compliance: {
      type: 'object',
      description: 'Compliance configuration',
      properties: {
        auditLogging: {
          type: 'boolean',
          description: 'Enable audit logging'
        },
        retentionDays: {
          type: 'number',
          description: 'Log retention period in days'
        }
      },
      additionalProperties: false
    },
    tags: {
      type: 'object',
      description: 'Additional resource tags',
      additionalProperties: { type: 'string' }
    }
  },
  additionalProperties: false
};

/**
 * ConfigBuilder for SageMakerNotebookInstanceComponent component
 * 
 * Implements the 5-layer configuration precedence chain:
 * 1. Hardcoded Fallbacks (ultra-safe baseline)
 * 2. Platform Defaults (from platform config)
 * 3. Environment Defaults (from environment config) 
 * 4. Component Overrides (from service.yml)
 * 5. Policy Overrides (from governance policies)
 */
export class SageMakerNotebookInstanceComponentConfigBuilder extends ConfigBuilder<SageMakerNotebookInstanceConfig> {
  
  constructor(context: ComponentContext, spec: ComponentSpec) {
    const builderContext: ConfigBuilderContext = { context, spec };
    const schema: ComponentConfigSchema = {
      type: 'object',
      properties: SAGEMAKER_NOTEBOOK_INSTANCE_CONFIG_SCHEMA.properties,
      required: [],
      additionalProperties: SAGEMAKER_NOTEBOOK_INSTANCE_CONFIG_SCHEMA.additionalProperties
    };
    super(builderContext, schema);
  }
  
  /**
   * Layer 1: Hardcoded Fallbacks
   * Ultra-safe baseline configuration that works in any environment
   */
  protected getHardcodedFallbacks(): Partial<SageMakerNotebookInstanceConfig> {
    return {
      instanceType: 'ml.t3.medium',
      rootAccess: 'Enabled',
      directInternetAccess: 'Enabled',
      volumeSizeInGB: 20,
      platformIdentifier: 'notebook-al2-v2',
      instanceMetadataServiceConfiguration: {
        minimumInstanceMetadataServiceVersion: '2'
      },
      monitoring: {
        enabled: true,
        detailedMetrics: false
      },
      security: {
        kmsEncryption: false,
        vpcOnly: false
      },
      compliance: {
        auditLogging: false,
        retentionDays: 90
      },
      tags: {}
    };
  }
  
  /**
   * Layer 2: Compliance Framework Defaults
   * Security and compliance-specific configurations
   */
  protected getComplianceFrameworkDefaults(): Partial<SageMakerNotebookInstanceConfig> {
    // The platform configuration is automatically loaded by the base class
    // and merged in the buildSync() method. We don't need to do anything here.
    return {};
  }
  
  /**
   * Get the JSON Schema for validation
   */
  public getSchema(): any {
    return SAGEMAKER_NOTEBOOK_INSTANCE_CONFIG_SCHEMA;
  }
}