/**
 * Configuration Builder for IamPolicyComponent Component
 * 
 * Implements the ConfigBuilder pattern as defined in the Platform Component API Contract.
 * Provides 5-layer configuration precedence chain and compliance-aware defaults.
 */

import { ConfigBuilder, ConfigBuilderContext } from '../../platform/contracts/config-builder';
import { ComponentContext, ComponentSpec } from '../../platform/contracts/component-interfaces';

export type IamPolicyRemovalPolicy = 'retain' | 'destroy';

export interface IamPolicyLogConfig {
  enabled?: boolean;
  logGroupName?: string;
  logGroupNameSuffix?: string;
  retentionInDays?: number;
  removalPolicy?: IamPolicyRemovalPolicy;
  tags?: Record<string, string>;
}

export interface IamPolicyUsageAlarmConfig {
  enabled?: boolean;
  threshold?: number;
  evaluationPeriods?: number;
  periodMinutes?: number;
  treatMissingData?: 'not-breaching' | 'breaching' | 'ignore' | 'missing';
  tags?: Record<string, string>;
}

export interface IamPolicyControlsConfig {
  denyInsecureTransport?: boolean;
  requireMfaForActions?: string[];
  additionalStatements?: Array<{
    sid?: string;
    effect: 'Allow' | 'Deny';
    actions: string[];
    resources?: string[];
    conditions?: Record<string, any>;
  }>;
}

export interface IamPolicyMonitoringConfig {
  enabled?: boolean;
  detailedMetrics?: boolean;
  usageAlarm?: IamPolicyUsageAlarmConfig;
}

/**
 * Configuration interface for IamPolicyComponent component
 */
export interface IamPolicyConfig {
  /** Component name (optional, will be auto-generated) */
  name?: string;
  
  /** Component description */
  description?: string;
  
  /** Logging and audit configuration */
  logging?: {
    usage?: IamPolicyLogConfig;
    compliance?: IamPolicyLogConfig;
    audit?: IamPolicyLogConfig;
  };

  /** Compliance controls */
  controls?: IamPolicyControlsConfig;

  /** Enable detailed monitoring */
  monitoring?: IamPolicyMonitoringConfig;
  
  /** Tagging configuration */
  tags?: Record<string, string>;
  
  // TODO: Add component-specific configuration properties
}

/**
 * JSON Schema for IamPolicyComponent configuration validation
 */
export const IAM_POLICY_CONFIG_SCHEMA = {
  type: 'object',
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
    monitoring: {
      type: 'object',
      description: 'Monitoring and observability configuration',
      properties: {
        enabled: {
          type: 'boolean',
          default: false,
          description: 'Enable monitoring'
        },
        detailedMetrics: {
          type: 'boolean',
          default: false,
          description: 'Enable detailed CloudWatch metrics'
        },
        usageAlarm: {
          type: 'object',
          additionalProperties: false,
          properties: {
            enabled: { type: 'boolean', default: false },
            threshold: { type: 'number', minimum: 1 },
            evaluationPeriods: { type: 'number', minimum: 1, default: 2 },
            periodMinutes: { type: 'number', minimum: 1, default: 60 },
            treatMissingData: {
              type: 'string',
              enum: ['not-breaching', 'breaching', 'ignore', 'missing'],
              default: 'not-breaching'
            },
            tags: {
              type: 'object',
              additionalProperties: { type: 'string' }
            }
          }
        }
      },
      additionalProperties: false
    },
    tags: {
      type: 'object',
      description: 'Additional resource tags',
      additionalProperties: { type: 'string' }
    },
    logging: {
      type: 'object',
      description: 'Logging configuration for IAM policy',
      additionalProperties: false,
      properties: {
        usage: { $ref: '#/definitions/logConfig' },
        compliance: { $ref: '#/definitions/logConfig' },
        audit: { $ref: '#/definitions/logConfig' }
      }
    },
    controls: {
      type: 'object',
      description: 'Compliance control statements',
      additionalProperties: false,
      properties: {
        denyInsecureTransport: { type: 'boolean', default: false },
        requireMfaForActions: {
          type: 'array',
          items: { type: 'string' },
          default: []
        },
        additionalStatements: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['effect', 'actions'],
            properties: {
              sid: { type: 'string' },
              effect: { type: 'string', enum: ['Allow', 'Deny'] },
              actions: {
                type: 'array',
                items: { type: 'string' },
                minItems: 1
              },
              resources: {
                type: 'array',
                items: { type: 'string' }
              },
              conditions: {
                type: 'object'
              }
            }
          },
          default: []
        }
      }
    }
  },
  additionalProperties: false,
  definitions: {
    logConfig: {
      type: 'object',
      additionalProperties: false,
      properties: {
        enabled: { type: 'boolean', default: false },
        logGroupName: { type: 'string' },
        logGroupNameSuffix: { type: 'string' },
        retentionInDays: { type: 'number', minimum: 1 },
        removalPolicy: { type: 'string', enum: ['retain', 'destroy'] },
        tags: {
          type: 'object',
          additionalProperties: { type: 'string' }
        }
      }
    }
  }
};

/**
 * ConfigBuilder for IamPolicyComponent component
 * 
 * Implements the 5-layer configuration precedence chain:
 * 1. Hardcoded Fallbacks (ultra-safe baseline)
 * 2. Platform Defaults (from platform config)
 * 3. Environment Defaults (from environment config) 
 * 4. Component Overrides (from service.yml)
 * 5. Policy Overrides (from governance policies)
 */
export class IamPolicyComponentConfigBuilder extends ConfigBuilder<IamPolicyConfig> {
  constructor(context: ComponentContext, spec: ComponentSpec) {
    const builderContext: ConfigBuilderContext = { context, spec };
    super(builderContext, IAM_POLICY_CONFIG_SCHEMA);
  }
  
  /**
   * Layer 1: Hardcoded Fallbacks
   * Ultra-safe baseline configuration that works in any environment
   */
  protected getHardcodedFallbacks(): Partial<IamPolicyConfig> {
    return {
      monitoring: {
        enabled: false,
        detailedMetrics: false,
        usageAlarm: {
          enabled: false,
          threshold: 1000,
          evaluationPeriods: 2,
          periodMinutes: 60,
          treatMissingData: 'not-breaching'
        }
      },
      logging: {
        usage: {
          enabled: false,
          retentionInDays: 90,
          removalPolicy: 'destroy'
        }
      },
      controls: {
        denyInsecureTransport: false,
        requireMfaForActions: [],
        additionalStatements: []
      },
      tags: {}
    };
  }

  public buildSync(): IamPolicyConfig {
    const resolved = super.buildSync() as IamPolicyConfig;
    return this.normaliseConfig(resolved);
  }

  private normaliseConfig(config: IamPolicyConfig): IamPolicyConfig {
    return {
      ...config,
      monitoring: {
        enabled: config.monitoring?.enabled ?? false,
        detailedMetrics: config.monitoring?.detailedMetrics ?? false,
        usageAlarm: {
          enabled: config.monitoring?.usageAlarm?.enabled ?? false,
          threshold: config.monitoring?.usageAlarm?.threshold ?? 1000,
          evaluationPeriods: config.monitoring?.usageAlarm?.evaluationPeriods ?? 2,
          periodMinutes: config.monitoring?.usageAlarm?.periodMinutes ?? 60,
          treatMissingData: config.monitoring?.usageAlarm?.treatMissingData ?? 'not-breaching',
          tags: config.monitoring?.usageAlarm?.tags ?? {}
        }
      },
      logging: {
        usage: {
          enabled: config.logging?.usage?.enabled ?? false,
          logGroupName: config.logging?.usage?.logGroupName,
          logGroupNameSuffix: config.logging?.usage?.logGroupNameSuffix,
          retentionInDays: config.logging?.usage?.retentionInDays ?? 90,
          removalPolicy: config.logging?.usage?.removalPolicy ?? 'destroy',
          tags: config.logging?.usage?.tags ?? {}
        },
        compliance: config.logging?.compliance
          ? {
            enabled: config.logging?.compliance?.enabled ?? false,
            logGroupName: config.logging?.compliance?.logGroupName,
            logGroupNameSuffix: config.logging?.compliance?.logGroupNameSuffix,
            retentionInDays: config.logging?.compliance?.retentionInDays,
            removalPolicy: config.logging?.compliance?.removalPolicy ?? 'retain',
            tags: config.logging?.compliance?.tags ?? {}
          }
          : undefined,
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
      controls: {
        denyInsecureTransport: config.controls?.denyInsecureTransport ?? false,
        requireMfaForActions: config.controls?.requireMfaForActions ?? [],
        additionalStatements: config.controls?.additionalStatements ?? []
      },
      tags: config.tags ?? {}
    };
  }
}
