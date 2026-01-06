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
import configSchema from './Config.schema.json' with { type: 'json' };

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
    secretArn?: string; // Reference to existing secret in Secrets Manager
    generateSecret?: boolean; // Generate new secret
    allowUnsafePlainText?: boolean; // Only for non-sensitive configuration values
  };
  generateSecret?: SecretsManagerGenerateSecretConfig;
  automaticRotation?: SecretsManagerRotationConfig;
  replicas?: SecretsManagerReplicaConfig[];
  encryption?: SecretsManagerEncryptionConfig;
  recovery?: SecretsManagerRecoveryConfig;
  monitoring?: SecretsManagerMonitoringConfig;
  accessPolicies?: SecretsManagerAccessPoliciesConfig;
}

/**
 * JSON Schema for Secrets Manager configuration validation
 * 
 * Schema is imported from Config.schema.json file per component standards.
 */
export const SECRETS_MANAGER_CONFIG_SCHEMA = configSchema as ComponentConfigSchema;

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
    const resolved = super.buildSync() as SecretsManagerConfig;
    return this.normaliseConfig(resolved);
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

}
