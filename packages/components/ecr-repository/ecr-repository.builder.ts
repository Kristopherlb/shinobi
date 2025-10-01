/**
 * Configuration Builder for EcrRepositoryComponent Component
 * 
 * Implements the ConfigBuilder pattern as defined in the Platform Component API Contract.
 * Provides 5-layer configuration precedence chain and compliance-aware defaults.
 */

import { ConfigBuilder, ConfigBuilderContext } from '../@shinobi/core/config-builder.js';

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
 */
export const ECR_REPOSITORY_CONFIG_SCHEMA = {
  type: 'object',
  title: 'ECR Repository Configuration',
  description: 'Configuration for creating an ECR repository',
  required: ['repositoryName'],
  properties: {
    repositoryName: {
      type: 'string',
      description: 'Name of the repository',
      pattern: '^[a-z0-9]([._-]?[a-z0-9])*$',
      minLength: 2,
      maxLength: 256
    },
    imageScanningConfiguration: {
      type: 'object',
      description: 'Image scanning configuration',
      properties: {
        scanOnPush: {
          type: 'boolean',
          description: 'Enable automatic image scanning on push',
          default: true
        }
      },
      additionalProperties: false,
      default: { scanOnPush: true }
    },
    imageTagMutability: {
      type: 'string',
      description: 'Image tag mutability setting',
      enum: ['MUTABLE', 'IMMUTABLE'],
      default: 'MUTABLE'
    },
    lifecyclePolicy: {
      type: 'object',
      description: 'Lifecycle management policy',
      properties: {
        maxImageCount: {
          type: 'number',
          description: 'Maximum number of images to keep',
          minimum: 1,
          maximum: 1000,
          default: 100
        },
        maxImageAge: {
          type: 'number',
          description: 'Maximum image age in days',
          minimum: 1,
          maximum: 3650,
          default: 365
        },
        untaggedImageRetentionDays: {
          type: 'number',
          description: 'Retention period for untagged images in days',
          minimum: 1,
          maximum: 365,
          default: 7
        }
      },
      additionalProperties: false
    },
    repositoryPolicy: {
      type: 'object',
      description: 'IAM policy document for repository access'
    },
    encryption: {
      type: 'object',
      description: 'Encryption configuration',
      properties: {
        encryptionType: {
          type: 'string',
          description: 'Encryption type',
          enum: ['AES256', 'KMS'],
          default: 'AES256'
        },
        kmsKeyArn: {
          type: 'string',
          description: 'KMS key ARN for KMS encryption'
        }
      },
      additionalProperties: false,
      default: { encryptionType: 'AES256' }
    },
    monitoring: {
      type: 'object',
      description: 'Monitoring and observability configuration',
      properties: {
        enabled: {
          type: 'boolean',
          default: true,
          description: 'Enable monitoring'
        },
        detailedMetrics: {
          type: 'boolean',
          default: false,
          description: 'Enable detailed CloudWatch metrics'
        },
        alarms: {
          type: 'object',
          description: 'Alarm configuration',
          properties: {
            pushRateThreshold: {
              type: 'number',
              description: 'Threshold for image push rate alarm',
              minimum: 1,
              default: 50
            },
            sizeThreshold: {
              type: 'number',
              description: 'Threshold for repository size alarm in bytes',
              minimum: 1,
              default: 10737418240
            }
          },
          additionalProperties: false
        }
      },
      additionalProperties: false
    },
    compliance: {
      type: 'object',
      description: 'Compliance configuration',
      properties: {
        retentionPolicy: {
          type: 'string',
          description: 'Resource retention policy',
          enum: ['retain', 'destroy'],
          default: 'destroy'
        },
        auditLogging: {
          type: 'boolean',
          description: 'Enable audit logging',
          default: false
        }
      },
      additionalProperties: false
    },
    tags: {
      type: 'object',
      description: 'Tags for the repository',
      additionalProperties: {
        type: 'string'
      },
      default: {}
    }
  },
  additionalProperties: false,
  defaults: {
    imageScanningConfiguration: { scanOnPush: true },
    imageTagMutability: 'MUTABLE',
    encryption: { encryptionType: 'AES256' },
    monitoring: { enabled: true, detailedMetrics: false },
    compliance: { retentionPolicy: 'destroy', auditLogging: false },
    tags: {}
  }
};

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