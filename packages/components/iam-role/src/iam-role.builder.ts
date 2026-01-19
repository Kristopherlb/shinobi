/**
 * IAM Role configuration builder.
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
import { ComponentContext, ComponentSpec } from '@shinobi/core';
import configSchema from '../Config.schema.json' with { type: 'json' };

export const IAM_ROLE_CONFIG_SCHEMA: ComponentConfigSchema = configSchema as ComponentConfigSchema;

export type IamRoleRemovalPolicy = 'retain' | 'destroy';

export interface IamRoleLogConfig {
  enabled?: boolean;
  logGroupName?: string;
  logGroupNameSuffix?: string;
  retentionInDays?: number;
  removalPolicy?: IamRoleRemovalPolicy;
  tags?: Record<string, string>;
}

export interface IamRoleMonitoringConfig {
  enabled?: boolean;
  detailedMetrics?: boolean;
  sessionAlarm?: {
    enabled?: boolean;
    thresholdMinutes?: number;
    evaluationPeriods?: number;
    treatMissingData?: 'not-breaching' | 'breaching' | 'ignore' | 'missing';
    tags?: Record<string, string>;
  };
}

export interface IamRoleTrustControl {
  enforceMfa?: boolean;
  allowExternalId?: boolean;
  externalIdCondition?: string;
  allowedServicePrincipals?: string[];
}

export interface IamRoleConfig {
  roleName?: string;
  description?: string;
  assumedBy?: Array<{
    service?: string;
    accountId?: string;
    roleArn?: string;
    federatedProvider?: string;
  }>;
  managedPolicies?: string[];
  inlinePolicies?: Array<{
    name: string;
    document: any;
  }>;
  maxSessionDuration?: number;
  externalId?: string;
  path?: string;
  permissionsBoundary?: string;
  tags?: Record<string, string>;
  /** High-risk environment flag (set via platform config or service.yml). When true, applies enhanced security defaults aligned with FedRAMP requirements. */
  highRiskEnvironment?: boolean;
  logging?: {
    access?: IamRoleLogConfig;
    audit?: IamRoleLogConfig;
  };
  monitoring?: IamRoleMonitoringConfig;
  controls?: {
    requireInstanceProfile?: boolean;
    enforceBoundary?: boolean;
    denyInsecureTransport?: boolean;
    trustPolicies?: IamRoleTrustControl;
    additionalStatements?: Array<{
      sid?: string;
      effect: 'Allow' | 'Deny';
      actions: string[];
      resources?: string[];
      conditions?: Record<string, any>;
    }>;
  };
}


export class IamRoleComponentConfigBuilder extends ConfigBuilder<IamRoleConfig> {
  constructor(context: ComponentContext, spec: ComponentSpec) {
    const builderContext: ConfigBuilderContext = { context, spec };
    super(builderContext, IAM_ROLE_CONFIG_SCHEMA);
  }

  protected getHardcodedFallbacks(): Partial<IamRoleConfig> {
    return {
      assumedBy: [],
      managedPolicies: [],
      inlinePolicies: [],
      maxSessionDuration: 3600,
      path: '/',
      logging: {
        access: {
          enabled: false,
          retentionInDays: 90,
          removalPolicy: 'destroy'
        }
      },
      monitoring: {
        enabled: false,
        detailedMetrics: false,
        sessionAlarm: {
          enabled: false,
          thresholdMinutes: 15,
          evaluationPeriods: 1,
          treatMissingData: 'not-breaching'
        }
      },
      controls: {
        requireInstanceProfile: false,
        enforceBoundary: false,
        denyInsecureTransport: false,
        trustPolicies: {
          enforceMfa: false,
          allowExternalId: false,
          allowedServicePrincipals: []
        },
        additionalStatements: []
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
  protected getComplianceFrameworkDefaults(): Partial<IamRoleConfig> {
    // Check if highRiskEnvironment flag is set in component config or platform config
    const componentConfig = this.builderContext.spec.config as Partial<IamRoleConfig> | undefined;
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
        controls: {
          requireInstanceProfile: true,
          enforceBoundary: true,
          denyInsecureTransport: true,
          trustPolicies: {
            enforceMfa: true,
            allowExternalId: false
          }
        },
        logging: {
          audit: {
            enabled: true,
            retentionInDays: 1095, // 3 years (can be overridden to 2555 for higher risk)
            removalPolicy: 'retain'
          },
          access: {
            enabled: true,
            retentionInDays: 1095, // 3 years (can be overridden to 2555 for higher risk)
            removalPolicy: 'retain'
          }
        },
        monitoring: {
          enabled: true,
          detailedMetrics: true,
          sessionAlarm: {
            enabled: true,
            thresholdMinutes: 15,
            evaluationPeriods: 1,
            treatMissingData: 'breaching'
          }
        },
        maxSessionDuration: 3600 // Enforce standard session duration for high-risk environments
      };
    }
    
    return {}; // Standard/default environment - use hardcoded fallbacks
  }

  public buildSync(): IamRoleConfig {
    const resolved = super.buildSync() as IamRoleConfig;
    return this.normaliseConfig(resolved);
  }

  private normaliseConfig(config: IamRoleConfig): IamRoleConfig {
    return {
      ...config,
      assumedBy: config.assumedBy ?? [],
      managedPolicies: config.managedPolicies ?? [],
      inlinePolicies: config.inlinePolicies ?? [],
      maxSessionDuration: config.maxSessionDuration ?? 3600,
      path: config.path ?? '/',
      logging: {
        access: {
          enabled: config.logging?.access?.enabled ?? false,
          logGroupName: config.logging?.access?.logGroupName,
          logGroupNameSuffix: config.logging?.access?.logGroupNameSuffix,
          retentionInDays: config.logging?.access?.retentionInDays ?? 90,
          removalPolicy: config.logging?.access?.removalPolicy ?? 'destroy',
          tags: config.logging?.access?.tags ?? {}
        },
        audit: config.logging?.audit
          ? {
            enabled: config.logging?.audit?.enabled ?? false,
            logGroupName: config.logging?.audit?.logGroupName,
            logGroupNameSuffix: config.logging?.audit?.logGroupNameSuffix,
            retentionInDays: config.logging?.audit?.retentionInDays,
            removalPolicy: config.logging?.audit?.removalPolicy ?? 'retain',
            tags: config.logging?.audit?.tags ?? {}
          }
          : undefined
      },
      monitoring: {
        enabled: config.monitoring?.enabled ?? false,
        detailedMetrics: config.monitoring?.detailedMetrics ?? false,
        sessionAlarm: {
          enabled: config.monitoring?.sessionAlarm?.enabled ?? false,
          thresholdMinutes: config.monitoring?.sessionAlarm?.thresholdMinutes ?? 15,
          evaluationPeriods: config.monitoring?.sessionAlarm?.evaluationPeriods ?? 1,
          treatMissingData: config.monitoring?.sessionAlarm?.treatMissingData ?? 'not-breaching',
          tags: config.monitoring?.sessionAlarm?.tags ?? {}
        }
      },
      controls: {
        requireInstanceProfile: config.controls?.requireInstanceProfile ?? false,
        enforceBoundary: config.controls?.enforceBoundary ?? false,
        denyInsecureTransport: config.controls?.denyInsecureTransport ?? false,
        trustPolicies: {
          enforceMfa: config.controls?.trustPolicies?.enforceMfa ?? false,
          allowExternalId: config.controls?.trustPolicies?.allowExternalId ?? false,
          externalIdCondition: config.controls?.trustPolicies?.externalIdCondition,
          allowedServicePrincipals: config.controls?.trustPolicies?.allowedServicePrincipals ?? []
        },
        additionalStatements: config.controls?.additionalStatements ?? []
      },
      tags: config.tags ?? {}
    };
  }
}
