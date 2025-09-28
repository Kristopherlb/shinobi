/**
 * Secrets Manager configuration builder.
 *
 * Provides a configuration surface for the Secrets Manager component that
 * adheres to the platform's five-layer precedence chain. Compliance-aware
 * defaults are sourced from segregated configuration while component logic
 * consumes only the resolved configuration returned by this builder.
 */

import {
  ConfigBuilder,
  ConfigBuilderContext,
  ComponentConfigSchema
} from '@shinobi/core';

export interface SecretsManagerGenerateSecretConfig {
  enabled?: boolean;
  excludeCharacters?: string;
  includeSpace?: boolean;
  passwordLength?: number;
  requireEachIncludedType?: boolean;
  secretStringTemplate?: string;
  generateStringKey?: string;
}

export interface SecretsManagerRotationLambdaConfig {
  functionArn?: string;
  createFunction?: boolean;
  runtime?: string;
  enableTracing?: boolean;
}

export interface SecretsManagerRotationConfig {
  enabled?: boolean;
  rotationLambda?: SecretsManagerRotationLambdaConfig;
  schedule?: {
    automaticallyAfterDays?: number;
  };
}

export interface SecretsManagerReplicaConfig {
  region: string;
  kmsKeyArn?: string;
}

export interface SecretsManagerEncryptionConfig {
  kmsKeyArn?: string;
  createCustomerManagedKey?: boolean;
  enableKeyRotation?: boolean;
}

export interface SecretsManagerRecoveryConfig {
  deletionProtection?: boolean;
  recoveryWindowInDays?: number;
}

export interface SecretsManagerMonitoringConfig {
  enabled?: boolean;
  rotationFailureThreshold?: number;
  unusualAccessThresholdMs?: number;
}

export interface SecretsManagerAccessPoliciesConfig {
  denyInsecureTransport?: boolean;
  restrictToVpce?: boolean;
  allowedVpceIds?: string[];
  requireTemporaryCredentials?: boolean;
}

export interface SecretsManagerConfig {
  secretName?: string;
  description?: string;
  secretValue?: {
    secretStringValue?: string;
    secretBinaryValue?: Buffer;
  };
  generateSecret?: SecretsManagerGenerateSecretConfig;
  automaticRotation?: SecretsManagerRotationConfig;
  replicas?: SecretsManagerReplicaConfig[];
  encryption?: SecretsManagerEncryptionConfig;
  recovery?: SecretsManagerRecoveryConfig;
  monitoring?: SecretsManagerMonitoringConfig;
  accessPolicies?: SecretsManagerAccessPoliciesConfig;
}

export const SECRETS_MANAGER_CONFIG_SCHEMA: ComponentConfigSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    secretName: {
      type: 'string',
      description: 'Name of the secret (auto-generated when omitted)',
      pattern: '^[a-zA-Z0-9_./\\-]+$',
      maxLength: 512
    },
    description: {
      type: 'string',
      description: 'Description of the secret',
      maxLength: 2048
    },
    secretValue: {
      type: 'object',
      description: 'Initial secret value',
      properties: {
        secretStringValue: {
          type: 'string',
          description: 'Secret represented as plain text'
        }
      },
      additionalProperties: false
    },
    generateSecret: {
      type: 'object',
      description: 'Automatic secret generation configuration',
      properties: {
        enabled: {
          type: 'boolean',
          default: false
        },
        excludeCharacters: {
          type: 'string',
          default: '"@/\\\''
        },
        includeSpace: {
          type: 'boolean',
          default: false
        },
        passwordLength: {
          type: 'number',
          minimum: 4,
          maximum: 1024,
          default: 32
        },
        requireEachIncludedType: {
          type: 'boolean',
          default: true
        },
        secretStringTemplate: {
          type: 'string'
        },
        generateStringKey: {
          type: 'string'
        }
      },
      additionalProperties: false,
      default: {
        enabled: false,
        excludeCharacters: '"@/\\\'',
        includeSpace: false,
        passwordLength: 32,
        requireEachIncludedType: true
      }
    },
    automaticRotation: {
      type: 'object',
      description: 'Automatic rotation configuration',
      properties: {
        enabled: {
          type: 'boolean',
          default: false
        },
        rotationLambda: {
          type: 'object',
          additionalProperties: false,
          properties: {
            functionArn: {
              type: 'string'
            },
            createFunction: {
              type: 'boolean',
              default: false
            },
            runtime: {
              type: 'string'
            },
            enableTracing: {
              type: 'boolean',
              default: false
            }
          },
          default: {
            createFunction: false,
            enableTracing: false
          }
        },
        schedule: {
          type: 'object',
          additionalProperties: false,
          properties: {
            automaticallyAfterDays: {
              type: 'number',
              minimum: 1,
              maximum: 365,
              default: 365
            }
          },
          default: {
            automaticallyAfterDays: 365
          }
        }
      },
      additionalProperties: false,
      default: {
        enabled: false,
        rotationLambda: {
          createFunction: false,
          enableTracing: false
        },
        schedule: {
          automaticallyAfterDays: 365
        }
      }
    },
    replicas: {
      type: 'array',
      description: 'Multi-region replica configuration',
      items: {
        type: 'object',
        properties: {
          region: {
            type: 'string'
          },
          kmsKeyArn: {
            type: 'string'
          }
        },
        required: ['region'],
        additionalProperties: false
      },
      default: []
    },
    encryption: {
      type: 'object',
      description: 'Encryption configuration',
      properties: {
        kmsKeyArn: {
          type: 'string'
        },
        createCustomerManagedKey: {
          type: 'boolean',
          default: false
        },
        enableKeyRotation: {
          type: 'boolean',
          default: false
        }
      },
      additionalProperties: false,
      default: {
        createCustomerManagedKey: false,
        enableKeyRotation: false
      }
    },
    recovery: {
      type: 'object',
      description: 'Deletion protection and recovery window settings',
      properties: {
        deletionProtection: {
          type: 'boolean',
          default: false
        },
        recoveryWindowInDays: {
          type: 'number',
          minimum: 7,
          maximum: 30,
          default: 30
        }
      },
      additionalProperties: false,
      default: {
        deletionProtection: false,
        recoveryWindowInDays: 30
      }
    },
    monitoring: {
      type: 'object',
      description: 'Monitoring and alarm configuration',
      properties: {
        enabled: {
          type: 'boolean',
          default: false
        },
        rotationFailureThreshold: {
          type: 'number',
          minimum: 1,
          default: 1
        },
        unusualAccessThresholdMs: {
          type: 'number',
          minimum: 100,
          default: 5000
        }
      },
      additionalProperties: false,
      default: {
        enabled: false,
        rotationFailureThreshold: 1,
        unusualAccessThresholdMs: 5000
      }
    },
    accessPolicies: {
      type: 'object',
      description: 'Secret access policy controls',
      properties: {
        denyInsecureTransport: {
          type: 'boolean',
          default: true
        },
        restrictToVpce: {
          type: 'boolean',
          default: false
        },
        allowedVpceIds: {
          type: 'array',
          items: {
            type: 'string'
          },
          default: []
        },
        requireTemporaryCredentials: {
          type: 'boolean',
          default: false
        }
      },
      additionalProperties: false,
      default: {
        denyInsecureTransport: true,
        restrictToVpce: false,
        allowedVpceIds: [],
        requireTemporaryCredentials: false
      }
    }
  }
};

export class SecretsManagerComponentConfigBuilder extends ConfigBuilder<SecretsManagerConfig> {
  constructor(options: ConfigBuilderContext) {
    super(options, SECRETS_MANAGER_CONFIG_SCHEMA);
  }

  protected getHardcodedFallbacks(): Partial<SecretsManagerConfig> {
    return {
      generateSecret: {
        enabled: false,
        excludeCharacters: '"@/\\\'',
        includeSpace: false,
        passwordLength: 32,
        requireEachIncludedType: true
      },
      automaticRotation: {
        enabled: false,
        rotationLambda: {
          createFunction: false,
          enableTracing: false
        },
        schedule: {
          automaticallyAfterDays: 365
        }
      },
      encryption: {
        createCustomerManagedKey: false,
        enableKeyRotation: false
      },
      recovery: {
        deletionProtection: false,
        recoveryWindowInDays: 30
      },
      replicas: [],
      monitoring: {
        enabled: false,
        rotationFailureThreshold: 1,
        unusualAccessThresholdMs: 5000
      },
      accessPolicies: {
        denyInsecureTransport: true,
        restrictToVpce: false,
        allowedVpceIds: [],
        requireTemporaryCredentials: false
      }
    };
  }

  public buildSync(): SecretsManagerConfig {
    const fallback = this.getHardcodedFallbacks();
    const resolved = super.buildSync();
    const complianceDefaults = this.getComplianceDefaults();
    const withCompliance = this.applyComplianceDefaults(resolved, fallback, complianceDefaults);
    return this.normaliseConfig(withCompliance as SecretsManagerConfig);
  }

  private getComplianceDefaults(): Partial<SecretsManagerConfig> {
    const framework = this.builderContext.context.complianceFramework;

    if (framework === 'fedramp-high') {
      return {
        automaticRotation: {
          enabled: true,
          rotationLambda: {
            createFunction: true,
            enableTracing: true
          },
          schedule: {
            automaticallyAfterDays: 30
          }
        },
        encryption: {
          createCustomerManagedKey: true,
          enableKeyRotation: true
        },
        recovery: {
          deletionProtection: true,
          recoveryWindowInDays: 7
        },
        replicas: this.getReplicaDefaults(),
        monitoring: {
          enabled: true,
          rotationFailureThreshold: 1,
          unusualAccessThresholdMs: 3000
        },
        accessPolicies: {
          denyInsecureTransport: true,
          restrictToVpce: true,
          allowedVpceIds: ['vpce-*'],
          requireTemporaryCredentials: true
        }
      };
    }

    if (framework === 'fedramp-moderate') {
      return {
        automaticRotation: {
          enabled: true,
          rotationLambda: {
            createFunction: true,
            enableTracing: true
          },
          schedule: {
            automaticallyAfterDays: 90
          }
        },
        encryption: {
          createCustomerManagedKey: true,
          enableKeyRotation: false
        },
        recovery: {
          deletionProtection: true,
          recoveryWindowInDays: 30
        },
        replicas: this.getReplicaDefaults(),
        monitoring: {
          enabled: true,
          rotationFailureThreshold: 1,
          unusualAccessThresholdMs: 4000
        },
        accessPolicies: {
          denyInsecureTransport: true,
          restrictToVpce: true,
          allowedVpceIds: ['vpce-*'],
          requireTemporaryCredentials: false
        }
      };
    }

    return {
      monitoring: {
        enabled: false,
        rotationFailureThreshold: 1,
        unusualAccessThresholdMs: 5000
      },
      accessPolicies: {
        denyInsecureTransport: true,
        restrictToVpce: false,
        allowedVpceIds: [],
        requireTemporaryCredentials: false
      }
    };
  }

  private normaliseConfig(config: SecretsManagerConfig): SecretsManagerConfig {
    const accessPolicies = config.accessPolicies ?? {};
    const restrictToVpce = accessPolicies.restrictToVpce ?? false;
    const allowedVpceIds = restrictToVpce
      ? (accessPolicies.allowedVpceIds && accessPolicies.allowedVpceIds.length > 0
          ? accessPolicies.allowedVpceIds
          : ['vpce-*'])
      : accessPolicies.allowedVpceIds ?? [];

    return {
      ...config,
      automaticRotation: {
        enabled: config.automaticRotation?.enabled ?? false,
        rotationLambda: {
          createFunction: config.automaticRotation?.rotationLambda?.createFunction ?? false,
          functionArn: config.automaticRotation?.rotationLambda?.functionArn,
          runtime: config.automaticRotation?.rotationLambda?.runtime,
          enableTracing: config.automaticRotation?.rotationLambda?.enableTracing ?? false
        },
        schedule: {
          automaticallyAfterDays:
            config.automaticRotation?.schedule?.automaticallyAfterDays ?? 365
        }
      },
      encryption: {
        createCustomerManagedKey: config.encryption?.createCustomerManagedKey ?? false,
        enableKeyRotation: config.encryption?.enableKeyRotation ?? false,
        kmsKeyArn: config.encryption?.kmsKeyArn
      },
      recovery: {
        deletionProtection: config.recovery?.deletionProtection ?? false,
        recoveryWindowInDays: config.recovery?.recoveryWindowInDays ?? 30
      },
      monitoring: {
        enabled: config.monitoring?.enabled ?? false,
        rotationFailureThreshold: config.monitoring?.rotationFailureThreshold ?? 1,
        unusualAccessThresholdMs: config.monitoring?.unusualAccessThresholdMs ?? 5000
      },
      accessPolicies: {
        denyInsecureTransport: accessPolicies.denyInsecureTransport ?? true,
        restrictToVpce,
        allowedVpceIds,
        requireTemporaryCredentials: accessPolicies.requireTemporaryCredentials ?? false
      },
      replicas: config.replicas ?? []
    };
  }

  private applyComplianceDefaults(
    resolved: Record<string, any>,
    fallback: Record<string, any>,
    compliance: Record<string, any>
  ): Record<string, any> {
    const result = { ...resolved };

    for (const [key, complianceValue] of Object.entries(compliance)) {
      const fallbackValue = fallback ? fallback[key] : undefined;
      const currentValue = result[key];

      if (Array.isArray(complianceValue)) {
        if (currentValue === undefined || this.valuesEqual(currentValue, fallbackValue)) {
          result[key] = complianceValue;
        }
        continue;
      }

      if (complianceValue !== null && typeof complianceValue === 'object') {
        result[key] = this.applyComplianceDefaults(
          currentValue || {},
          (fallbackValue as Record<string, any>) || {},
          complianceValue as Record<string, any>
        );
        continue;
      }

      if (currentValue === undefined || this.valuesEqual(currentValue, fallbackValue)) {
        result[key] = complianceValue;
      }
    }

    return result;
  }

  private valuesEqual(a: any, b: any): boolean {
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) {
        return false;
      }
      return a.every((value, index) => this.valuesEqual(value, b[index]));
    }

    if (typeof a === 'object' || typeof b === 'object') {
      return JSON.stringify(a) === JSON.stringify(b);
    }

    return a === b;
  }

  private getReplicaDefaults(): SecretsManagerReplicaConfig[] {
    const primaryRegion = this.builderContext.context.region ?? 'us-east-1';
    const replicaRegion = primaryRegion === 'us-east-1' ? 'us-west-2' : 'us-east-1';
    return [{ region: replicaRegion }];
  }
}
