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
  /** High-risk environment flag (set via platform config or service.yml) */
  highRiskEnvironment?: boolean;
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

  public buildSync(): EcrRepositoryConfig {
    const config = super.buildSync();
    this.validateConfig(config);
    return config;
  }

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
        // Always perform vulnerability scans on push unless explicitly disabled
        scanOnPush: true
      },
      imageTagMutability: 'IMMUTABLE',
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
        logRetentionDays: 90, // 3 months default
        alarms: {
          pushRateThreshold: 50,
          sizeThreshold: 10 * 1024 * 1024 * 1024 // 10 GiB
        }
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
  protected getComplianceFrameworkDefaults(): Partial<EcrRepositoryConfig> {
    // Check if highRiskEnvironment flag is set in component config or platform config
    const componentConfig = this.builderContext.spec.config as Partial<EcrRepositoryConfig> | undefined;
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
        imageScanningConfiguration: {
          scanOnPush: true
        },
        imageTagMutability: 'IMMUTABLE',
        encryption: {
          encryptionType: 'KMS'
        },
        monitoring: {
          enabled: true,
          detailedMetrics: true,
          logRetentionDays: 365,
          alarms: {
            pushRateThreshold: 25,
            sizeThreshold: 5 * 1024 * 1024 * 1024 // 5 GiB
          }
        },
        compliance: {
          retentionPolicy: 'retain',
          auditLogging: true
        }
      };
    }
    
    return {}; // Standard/default environment - use hardcoded fallbacks
  }

  /**
   * Get the JSON Schema for validation
   */
  public getSchema(): any {
    return ECR_REPOSITORY_CONFIG_SCHEMA;
  }

  private validateConfig(config: EcrRepositoryConfig): void {
    if (!config.repositoryName || config.repositoryName.trim().length === 0) {
      throw new Error('repositoryName is required for ECR repositories');
    }

    if (config.encryption?.encryptionType === 'KMS') {
      const kmsKeyArn = config.encryption.kmsKeyArn;
      if (!kmsKeyArn) {
        throw new Error('kmsKeyArn must be provided when encryptionType is set to KMS');
      }

      const kmsArnPattern = /^arn:aws:kms:[a-z0-9-]+:\d{12}:key\/[a-f0-9-]+$/;
      if (!kmsArnPattern.test(kmsKeyArn)) {
        throw new Error(`kmsKeyArn '${kmsKeyArn}' is not a valid KMS key ARN`);
      }
    }

    if (config.lifecyclePolicy) {
      const { maxImageCount, maxImageAge, untaggedImageRetentionDays } = config.lifecyclePolicy;
      if (maxImageCount !== undefined && (maxImageCount < 1 || maxImageCount > 1000)) {
        throw new Error('lifecyclePolicy.maxImageCount must be between 1 and 1000');
      }
      if (maxImageAge !== undefined && (maxImageAge < 1 || maxImageAge > 3650)) {
        throw new Error('lifecyclePolicy.maxImageAge must be between 1 and 3650');
      }
      if (untaggedImageRetentionDays !== undefined && (untaggedImageRetentionDays < 1 || untaggedImageRetentionDays > 365)) {
        throw new Error('lifecyclePolicy.untaggedImageRetentionDays must be between 1 and 365');
      }
    }

    if (config.monitoring?.logRetentionDays !== undefined) {
      const days = config.monitoring.logRetentionDays;
      if (days < 1 || days > 3650) {
        throw new Error('monitoring.logRetentionDays must be between 1 and 3650');
      }
    }
  }
}
