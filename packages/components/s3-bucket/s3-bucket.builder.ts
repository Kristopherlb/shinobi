/**
 * S3 Bucket configuration builder.
 *
 * Implements the shared ConfigBuilder precedence chain so that
 * all deployment defaults are sourced from the platform configuration
 * files in /config and developer overrides in service manifests.
 */

import {
  ConfigBuilder,
  ConfigBuilderContext,
  ComponentConfigSchema
} from '@shinobi/core';

export type S3BucketEncryptionType = 'AES256' | 'KMS';
export type S3BucketStorageClass =
  | 'STANDARD_IA'
  | 'ONEZONE_IA'
  | 'GLACIER'
  | 'DEEP_ARCHIVE'
  | 'GLACIER_IR';

export interface S3BucketLifecycleTransition {
  storageClass: S3BucketStorageClass;
  transitionAfter: number;
}

export interface S3BucketLifecycleRule {
  id: string;
  enabled: boolean;
  transitions?: S3BucketLifecycleTransition[];
  expiration?: {
    days: number;
  };
}

export interface S3BucketEncryptionConfig {
  type?: S3BucketEncryptionType;
  kmsKeyArn?: string;
}

export interface S3BucketSecurityConfig {
  blockPublicAccess?: boolean;
  requireSecureTransport?: boolean;
  requireMfaDelete?: boolean;
  denyDeleteActions?: boolean;
  tools?: {
    clamavScan?: boolean;
  };
}

export interface S3BucketObjectLockConfig {
  enabled: boolean;
  mode?: 'GOVERNANCE' | 'COMPLIANCE';
  retentionDays?: number;
}

export interface S3BucketComplianceConfig {
  auditLogging?: boolean;
  auditBucketName?: string;
  auditBucketRetentionDays?: number;
  auditBucketObjectLock?: S3BucketObjectLockConfig;
  objectLock?: S3BucketObjectLockConfig;
}

export interface S3BucketMonitoringConfig {
  enabled?: boolean;
  clientErrorThreshold?: number;
  serverErrorThreshold?: number;
}

export interface S3BucketWebsiteConfig {
  enabled?: boolean;
  indexDocument?: string;
  errorDocument?: string;
}

export interface S3BucketConfig {
  bucketName?: string;
  public?: boolean;
  website?: S3BucketWebsiteConfig;
  eventBridgeEnabled?: boolean;
  versioning?: boolean;
  encryption?: S3BucketEncryptionConfig;
  lifecycleRules?: S3BucketLifecycleRule[];
  security?: S3BucketSecurityConfig;
  compliance?: S3BucketComplianceConfig;
  monitoring?: S3BucketMonitoringConfig;
}

export const S3_BUCKET_CONFIG_SCHEMA: ComponentConfigSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    bucketName: {
      type: 'string',
      description: 'Optional name for the S3 bucket; must be globally unique',
      pattern: '^[a-z0-9.-]+$',
      minLength: 3,
      maxLength: 63
    },
    public: {
      type: 'boolean',
      description: 'Allow public read access to the bucket',
      default: false
    },
    website: {
      type: 'object',
      description: 'Static website hosting configuration',
      additionalProperties: false,
      properties: {
        enabled: {
          type: 'boolean',
          description: 'Enable S3 static website hosting',
          default: false
        },
        indexDocument: {
          type: 'string',
          description: 'Index document served for directory listings',
          default: 'index.html'
        },
        errorDocument: {
          type: 'string',
          description: 'Error document served for missing objects',
          default: 'error.html'
        }
      }
    },
    eventBridgeEnabled: {
      type: 'boolean',
      description: 'Emit bucket notifications to Amazon EventBridge',
      default: false
    },
    versioning: {
      type: 'boolean',
      description: 'Enable bucket versioning',
      default: false
    },
    encryption: {
      type: 'object',
      description: 'Server-side encryption configuration',
      additionalProperties: false,
      properties: {
        type: {
          type: 'string',
          enum: ['AES256', 'KMS'],
          description: 'Encryption type for the bucket',
          default: 'AES256'
        },
        kmsKeyArn: {
          type: 'string',
          description: 'Existing KMS key ARN to use when type is KMS',
          pattern: '^arn:aws:kms:[a-z0-9-]+:[0-9]{12}:key/[a-f0-9-]{36}$'
        }
      }
    },
    lifecycleRules: {
      type: 'array',
      description: 'Lifecycle rules applied to bucket objects',
      items: {
        type: 'object',
        required: ['id', 'enabled'],
        additionalProperties: false,
        properties: {
          id: {
            type: 'string',
            description: 'Unique identifier for the lifecycle rule'
          },
          enabled: {
            type: 'boolean',
            description: 'Enable or disable the rule'
          },
          transitions: {
            type: 'array',
            description: 'Lifecycle transitions to alternate storage classes',
            items: {
              type: 'object',
              required: ['storageClass', 'transitionAfter'],
              additionalProperties: false,
              properties: {
                storageClass: {
                  type: 'string',
                  enum: ['STANDARD_IA', 'ONEZONE_IA', 'GLACIER', 'DEEP_ARCHIVE', 'GLACIER_IR'],
                  description: 'Target storage class for the transition'
                },
                transitionAfter: {
                  type: 'number',
                  minimum: 1,
                  description: 'Number of days after object creation to transition'
                }
              }
            }
          },
          expiration: {
            type: 'object',
            additionalProperties: false,
            properties: {
              days: {
                type: 'number',
                minimum: 1,
                description: 'Expire objects after the specified number of days'
              }
            }
          }
        }
      }
    },
    security: {
      type: 'object',
      description: 'Security hardening configuration',
      additionalProperties: false,
      properties: {
        blockPublicAccess: {
          type: 'boolean',
          description: 'Apply the AWS Block Public Access configuration to the bucket',
          default: true
        },
        requireSecureTransport: {
          type: 'boolean',
          description: 'Deny requests made without HTTPS (aws:SecureTransport)',
          default: true
        },
        requireMfaDelete: {
          type: 'boolean',
          description: 'Require MFA for delete operations via bucket policy',
          default: false
        },
        denyDeleteActions: {
          type: 'boolean',
          description: 'Deny delete-style actions to enforce immutability',
          default: false
        },
        tools: {
          type: 'object',
          additionalProperties: false,
          properties: {
            clamavScan: {
              type: 'boolean',
              description: 'Enable the ClamAV virus scanning Lambda integration',
              default: false
            }
          }
        }
      }
    },
    compliance: {
      type: 'object',
      description: 'Compliance-focused configuration',
      additionalProperties: false,
      properties: {
        auditLogging: {
          type: 'boolean',
          description: 'Enable server access logging to an audit bucket',
          default: false
        },
        auditBucketName: {
          type: 'string',
          description: 'Override name for the audit bucket when auditLogging is enabled'
        },
        auditBucketRetentionDays: {
          type: 'number',
          minimum: 1,
          description: 'Retention period in days for audit bucket lifecycle rules'
        },
        auditBucketObjectLock: {
          type: 'object',
          additionalProperties: false,
          description: 'Object Lock configuration applied to the audit bucket',
          properties: {
            enabled: { type: 'boolean', default: false },
            mode: { type: 'string', enum: ['GOVERNANCE', 'COMPLIANCE'] },
            retentionDays: { type: 'number', minimum: 1 }
          }
        },
        objectLock: {
          type: 'object',
          additionalProperties: false,
          description: 'Object Lock configuration applied to the primary bucket',
          properties: {
            enabled: { type: 'boolean', default: false },
            mode: { type: 'string', enum: ['GOVERNANCE', 'COMPLIANCE'] },
            retentionDays: { type: 'number', minimum: 1 }
          }
        }
      }
    },
    monitoring: {
      type: 'object',
      description: 'Monitoring and alerting configuration',
      additionalProperties: false,
      properties: {
        enabled: {
          type: 'boolean',
          description: 'Enable CloudWatch alarms for the bucket',
          default: false
        },
        clientErrorThreshold: {
          type: 'number',
          minimum: 0,
          description: 'Alarm threshold for 4xx client errors',
          default: 10
        },
        serverErrorThreshold: {
          type: 'number',
          minimum: 0,
          description: 'Alarm threshold for 5xx server errors',
          default: 1
        }
      }
    }
  },
  allOf: [
    {
      if: {
        properties: {
          compliance: {
            properties: {
              objectLock: {
                properties: {
                  enabled: { const: true }
                }
              }
            }
          }
        }
      },
      then: {
        properties: {
          versioning: {
            const: true,
            description: 'Versioning must be enabled when objectLock.enabled is true'
          }
        }
      }
    }
  ]
};

export class S3BucketComponentConfigBuilder extends ConfigBuilder<S3BucketConfig> {
  constructor(builderContext: ConfigBuilderContext) {
    super(builderContext, S3_BUCKET_CONFIG_SCHEMA);
  }

  protected getHardcodedFallbacks(): Partial<S3BucketConfig> {
    return {
      public: false,
      website: {
        enabled: false,
        indexDocument: 'index.html',
        errorDocument: 'error.html'
      },
      eventBridgeEnabled: false,
      versioning: true,
      encryption: {
        type: 'AES256'
      },
      lifecycleRules: [],
      security: {
        blockPublicAccess: true,
        requireSecureTransport: true,
        requireMfaDelete: false,
        denyDeleteActions: false,
        tools: {
          clamavScan: false
        }
      },
      compliance: {
        auditLogging: false,
        objectLock: {
          enabled: false
        }
      },
      monitoring: {
        enabled: false,
        clientErrorThreshold: 10,
        serverErrorThreshold: 1
      }
    };
  }

  public buildSync(): S3BucketConfig {
    const config = super.buildSync();
    this.validateComplianceControls(config);
    return config;
  }

  protected getComplianceFrameworkDefaults(): Partial<S3BucketConfig> {
    // Compliance defaults are delivered via the segregated /config/{framework}.yml files.
    // The builder defers to those platform-managed values so that all deployments remain
    // manifest-driven and auditable per the configuration standard.
    return {};
  }

  private validateComplianceControls(config: S3BucketConfig): void {
    const framework = this.builderContext.context.complianceFramework;
    if (framework === 'commercial') {
      return;
    }

    if (config.versioning !== true) {
      throw new Error('S3BucketConfig: FedRAMP deployments require versioning to be enabled. Update the configuration to set versioning: true.');
    }

    if (config.encryption?.type !== 'KMS') {
      throw new Error('S3BucketConfig: FedRAMP deployments require encryption.type to be "KMS". Update the configuration to comply with FedRAMP encryption controls.');
    }

    if (config.compliance?.auditLogging !== true) {
      throw new Error('S3BucketConfig: FedRAMP deployments must enable compliance.auditLogging. Update the configuration to route access logs to an audit bucket.');
    }
  }
}
