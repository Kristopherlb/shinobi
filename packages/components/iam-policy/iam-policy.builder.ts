/**
 * Configuration Builder for IamPolicyComponent Component
 * 
 * Implements the ConfigBuilder pattern as defined in the Platform Component API Contract.
 * Provides 5-layer configuration precedence chain and compliance-aware defaults.
 */

import {
  ConfigBuilder,
  ConfigBuilderContext,
  ComponentConfigSchema
} from '@shinobi/core';
import { ComponentContext, ComponentSpec } from '@shinobi/core';

export type IamPolicyRemovalPolicy = 'retain' | 'destroy';
export type IamPolicyType = 'managed' | 'inline';
export type PolicyTemplateType = 
  | 'read-only'
  | 'lambda-execution'
  | 'ecs-task'
  | 's3-access'
  | 'rds-access'
  | 'dynamodb-access'
  | 'custom';

// ===== TYPE DEFINITIONS =====

export interface PolicyStatementSpec {
  Sid?: string;
  Effect: 'Allow' | 'Deny';
  Action: string | string[];
  Resource?: string | string[];
  Condition?: Record<string, any>;
}

export interface PolicyDocumentSpec {
  Version?: string;
  Statement: PolicyStatementSpec[];
}

export interface PolicyTemplateSpec {
  type: PolicyTemplateType;
  resources?: string[];
  additionalStatements?: PolicyStatementSpec[];
}

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
  // Core policy fields
  policyName?: string;
  policyType: IamPolicyType;
  description?: string;
  path?: string;
  
  // Policy content (mutually exclusive with template)
  policyDocument?: PolicyDocumentSpec;
  policyTemplate?: PolicyTemplateSpec;
  
  // Attachment targets (only for managed policies)
  groups?: string[];
  roles?: string[];
  users?: string[];
  
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
}

/**
 * JSON Schema for IamPolicyComponent configuration validation
 */
export const IAM_POLICY_CONFIG_SCHEMA: ComponentConfigSchema = {
  type: 'object',
  required: ['policyType'],
  properties: {
    policyName: {
      type: 'string',
      description: 'Name of the IAM policy (optional, will be auto-generated)',
      pattern: '^[a-zA-Z0-9+=,.@_-]+$',
      maxLength: 128
    },
    policyType: {
      type: 'string',
      enum: ['managed', 'inline'],
      description: 'Type of IAM policy to create'
    },
    description: {
      type: 'string',
      description: 'Policy description for documentation',
      maxLength: 1000
    },
    path: {
      type: 'string',
      description: 'Path for the policy (managed policies only)',
      pattern: '^(/|/[a-zA-Z0-9+=,.@_-]+/)$',
      default: '/'
    },
    policyDocument: {
      $ref: '#/definitions/policyDocument'
    },
    policyTemplate: {
      $ref: '#/definitions/policyTemplate'
    },
    groups: {
      type: 'array',
      description: 'IAM groups to attach policy to (managed only)',
      items: { type: 'string' }
    },
    roles: {
      type: 'array',
      description: 'IAM roles to attach policy to (managed only)',
      items: { type: 'string' }
    },
    users: {
      type: 'array',
      description: 'IAM users to attach policy to (managed only)',
      items: { type: 'string' }
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
    policyDocument: {
      type: 'object',
      description: 'IAM policy document in standard AWS format',
      required: ['Statement'],
      properties: {
        Version: { type: 'string', default: '2012-10-17' },
        Statement: {
          type: 'array',
          minItems: 1,
          items: {
            type: 'object',
            required: ['Effect', 'Action'],
            properties: {
              Sid: { type: 'string' },
              Effect: { type: 'string', enum: ['Allow', 'Deny'] },
              Action: {
                oneOf: [
                  { type: 'string' },
                  { type: 'array', items: { type: 'string' }, minItems: 1 }
                ]
              },
              Resource: {
                oneOf: [
                  { type: 'string' },
                  { type: 'array', items: { type: 'string' } }
                ]
              },
              Condition: { type: 'object' }
            }
          }
        }
      }
    },
    policyTemplate: {
      type: 'object',
      description: 'Pre-defined policy template',
      required: ['type'],
      properties: {
        type: {
          type: 'string',
          enum: [
            'read-only',
            'lambda-execution',
            'ecs-task',
            's3-access',
            'rds-access',
            'dynamodb-access',
            'custom'
          ],
          description: 'Template type - custom allows empty base with additionalStatements'
        },
        resources: {
          type: 'array',
          items: { type: 'string' },
          description: 'Resource ARNs to scope template to (defaults to wildcard if not specified)'
        },
        additionalStatements: {
          type: 'array',
          description: 'Additional policy statements to merge with template',
          items: { $ref: '#/definitions/policyDocument/properties/Statement/items' }
        }
      }
    },
    logConfig: {
      type: 'object',
      additionalProperties: false,
      properties: {
        enabled: { type: 'boolean', default: false },
        logGroupName: { type: 'string' },
        logGroupNameSuffix: { type: 'string' },
        retentionInDays: {
          type: 'number',
          enum: [1, 3, 5, 7, 14, 30, 60, 90, 120, 150, 180, 365, 400, 545, 731, 1827, 3653],
          description: 'CloudWatch Logs retention period in days'
        },
        removalPolicy: { type: 'string', enum: ['retain', 'destroy'], default: 'retain' },
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
      policyType: 'managed',
      path: '/',
      groups: [],
      roles: [],
      users: [],
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
    
    // Validation: must have either policyDocument or policyTemplate
    if (!resolved.policyDocument && !resolved.policyTemplate) {
      throw new Error('IamPolicyConfig must specify either policyDocument or policyTemplate');
    }
    
    // Validation: can't have both
    if (resolved.policyDocument && resolved.policyTemplate) {
      throw new Error('IamPolicyConfig cannot specify both policyDocument and policyTemplate');
    }
    
    // Validation: inline policies cannot have attachments
    if (resolved.policyType === 'inline' && 
        ((resolved.groups && resolved.groups.length > 0) || 
         (resolved.roles && resolved.roles.length > 0) || 
         (resolved.users && resolved.users.length > 0))) {
      throw new Error('Inline policies cannot specify groups, roles, or users. Attachments are only supported for managed policies.');
    }
    
    // Validation: policyName length
    if (resolved.policyName && resolved.policyName.length > 128) {
      throw new Error(`Policy name exceeds maximum length of 128 characters: ${resolved.policyName}`);
    }
    
    return this.normaliseConfig(resolved);
  }

  private normaliseConfig(config: IamPolicyConfig): IamPolicyConfig {
    return {
      ...config,
      policyType: config.policyType || 'managed',
      path: config.path || '/',
      groups: config.groups || [],
      roles: config.roles || [],
      users: config.users || [],
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
        usage: config.logging?.usage ? {
          enabled: config.logging.usage.enabled ?? false,
          logGroupName: config.logging.usage.logGroupName,
          logGroupNameSuffix: config.logging.usage.logGroupNameSuffix,
          retentionInDays: config.logging.usage.retentionInDays ?? 90,
          removalPolicy: config.logging.usage.removalPolicy ?? 'destroy',
          tags: config.logging.usage.tags ?? {}
        } : undefined,
        compliance: config.logging?.compliance ? {
          enabled: config.logging.compliance.enabled ?? false,
          logGroupName: config.logging.compliance.logGroupName,
          logGroupNameSuffix: config.logging.compliance.logGroupNameSuffix,
          retentionInDays: config.logging.compliance.retentionInDays ?? 365,
          removalPolicy: config.logging.compliance.removalPolicy ?? 'retain',
          tags: config.logging.compliance.tags ?? {}
        } : undefined,
        audit: config.logging?.audit ? {
          enabled: config.logging.audit.enabled ?? false,
          logGroupName: config.logging.audit.logGroupName,
          logGroupNameSuffix: config.logging.audit.logGroupNameSuffix,
          retentionInDays: config.logging.audit.retentionInDays ?? 365,
          removalPolicy: config.logging.audit.removalPolicy ?? 'retain',
          tags: config.logging.audit.tags ?? {}
        } : undefined
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
