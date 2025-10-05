/**
 * Configuration Builder for EcrRepositoryComponent Component
 * 
 * Implements the ConfigBuilder pattern as defined in the Platform Component API Contract.
 * Provides 5-layer configuration precedence chain and compliance-aware defaults.
 */

import { ConfigBuilder, ConfigBuilderContext } from '@shinobi/core';

/**
 * Configuration interface for EcrRepositoryComponent component
 */
export interface EcrRepositoryConfig {
  /** Repository name (required) */
  repositoryName: string;

  /** Image scanning configuration */
  imageScanningConfiguration?: {
    /** Enable image scanning */
    scanOnPush?: boolean;
  };

  /** Image tag mutability */
  imageTagMutability?: 'MUTABLE' | 'IMMUTABLE';

  /** Lifecycle policy */
  lifecyclePolicy?: {
    /** Maximum number of images to keep */
    maxImageCount?: number;
    /** Maximum image age in days */
    maxImageAge?: number;
    /** Rules for untagged images */
    untaggedImageRetentionDays?: number;
  };

  /** Repository policy (IAM policy document) */
  repositoryPolicy?: any;

  /** Encryption configuration */
  encryption?: {
    /** Encryption type */
    encryptionType?: 'AES256' | 'KMS';
    /** KMS key ARN (only for KMS encryption) */
    kmsKeyArn?: string;
  };

  /** Monitoring configuration */
  monitoring?: {
    enabled?: boolean;
    detailedMetrics?: boolean;
    logRetentionDays?: number;
    alarms?: {
      pushRateThreshold?: number;
      sizeThreshold?: number;
    };
  };

  /** Compliance configuration */
  compliance?: {
    retentionPolicy?: 'retain' | 'destroy';
    auditLogging?: boolean;
  };

  /** Tags for the repository */
  tags?: Record<string, string>;
}

/**
 * JSON Schema for EcrRepositoryComponent configuration validation
 * Imported from standalone Config.schema.json file
 */
import ECR_REPOSITORY_CONFIG_SCHEMA_JSON from './Config.schema.json' with { type: 'json' };

export const ECR_REPOSITORY_CONFIG_SCHEMA = ECR_REPOSITORY_CONFIG_SCHEMA_JSON;

/**
 * ConfigBuilder for EcrRepositoryComponent component
 * 
 * Implements the 5-layer configuration precedence chain:
 * 1. Hardcoded Fallbacks (ultra-safe baseline)
 * 2. Platform Defaults (from platform config)
 * 3. Environment Defaults (from environment config) 
 * 4. Component Overrides (from service.yml)
 * 5. Policy Overrides (from governance policies)
 */
export class EcrRepositoryComponentConfigBuilder extends ConfigBuilder<EcrRepositoryConfig> {

  constructor(context: ConfigBuilderContext) {
    super(context, ECR_REPOSITORY_CONFIG_SCHEMA);
  }

  /**
   * Layer 1: Hardcoded Fallbacks
   * Ultra-safe baseline configuration that works in any environment
   */
  protected getHardcodedFallbacks(): Partial<EcrRepositoryConfig> {
    return {
      imageScanningConfiguration: {
        scanOnPush: false // Security-safe default
      },
      imageTagMutability: 'MUTABLE',
      encryption: {
        encryptionType: 'AES256'
      },
      lifecyclePolicy: {
        maxImageCount: 10, // Conservative default
        maxImageAge: 30, // 30 days default
        untaggedImageRetentionDays: 1 // Quick cleanup
      },
      monitoring: {
        enabled: true,
        detailedMetrics: false,
        logRetentionDays: 90 // 3 months default
      },
      compliance: {
        retentionPolicy: 'destroy',
        auditLogging: false
      },
      tags: {}
    };
  }

  /**
   * Layer 2: Compliance Framework Defaults
   * Security and compliance-specific configurations loaded from platform config
   */
  protected getComplianceFrameworkDefaults(): Partial<EcrRepositoryConfig> {
    // This will be loaded from /config/{framework}.yml files
    // For now, return empty object to be overridden by platform config
    return {};
  }

  /**
   * Get the JSON Schema for validation
   */
  public getSchema(): any {
    return ECR_REPOSITORY_CONFIG_SCHEMA;
  }
}
