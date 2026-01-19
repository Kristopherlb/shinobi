/**
 * Configuration Builder for SageMakerNotebookInstanceComponent Component
 * 
 * Implements the ConfigBuilder pattern as defined in the Platform Component API Contract.
 * Provides 5-layer configuration precedence chain and compliance-aware defaults.
 */

import { ConfigBuilder, ConfigBuilderContext, ComponentConfigSchema, ComponentContext, ComponentSpec } from '@shinobi/core';
import schemaJson from './Config.schema.json' with { type: 'json' };

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
  /** High-risk environment flag (set via platform config or service.yml) */
  highRiskEnvironment?: boolean;
  /** Retain KMS key on deletion (set by builder based on risk level) */
  retainKmsKey?: boolean;
}

/**
 * JSON Schema for SageMakerNotebookInstanceComponent configuration validation
 */
export const SAGEMAKER_NOTEBOOK_INSTANCE_CONFIG_SCHEMA: ComponentConfigSchema = schemaJson as ComponentConfigSchema;

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
   * 
   * Provides sensible defaults based on risk assessment flags rather than framework checks.
   * High-risk environment defaults can be set via:
   * - Platform config files (`/config/{framework}.yml`) setting `highRiskEnvironment: true`
   * - Service-level configuration in `service.yml`
   * - Environment defaults
   * 
   * This ensures configuration is data-driven and risk-based, not framework-dependent.
   */
  protected getComplianceFrameworkDefaults(): Partial<SageMakerNotebookInstanceConfig> {
    // Check if highRiskEnvironment flag is set in component config or platform config
    const componentConfig = this.builderContext.spec.config as Partial<SageMakerNotebookInstanceConfig> | undefined;
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
        rootAccess: 'Disabled', // Disable root access in high-risk environments
        directInternetAccess: 'Disabled', // Disable direct internet access (require VPC endpoint)
        security: {
          kmsEncryption: true, // Enable KMS encryption in high-risk environments
          vpcOnly: true // Require VPC-only access in high-risk environments
        },
        compliance: {
          auditLogging: true, // Enable audit logging in high-risk environments
          retentionDays: 1095 // 3 years retention for high-risk environments (can be overridden to 2555 for higher risk)
        },
        instanceMetadataServiceConfiguration: {
          minimumInstanceMetadataServiceVersion: '2' // Require IMDSv2 in high-risk environments
        },
        monitoring: {
          enabled: true,
          detailedMetrics: true // Enable detailed metrics in high-risk environments
        },
        retainKmsKey: true // Retain KMS key on deletion in high-risk environments
      };
    }
    
    return {}; // Standard/default environment - use hardcoded fallbacks
  }
  
  /**
   * Get the JSON Schema for validation
   */
  public getSchema(): any {
    return SAGEMAKER_NOTEBOOK_INSTANCE_CONFIG_SCHEMA;
  }
}
