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

export const IAM_ROLE_CONFIG_SCHEMA: ComponentConfigSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    roleName: {
      type: 'string',
      description: 'Name of the role (will be auto-generated if not provided)',
      pattern: '^[a-zA-Z0-9+=,.@_-]+$',
      maxLength: 64
    },
    description: {
      type: 'string',
      description: 'Description of the role',
      maxLength: 1000
    },
    assumedBy: {
      type: 'array',
      description: 'Services or entities that can assume this role',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          service: { type: 'string' },
          accountId: { type: 'string', pattern: '^[0-9]{12}$' },
          roleArn: { type: 'string' },
          federatedProvider: { type: 'string' }
        }
      }
    },
    managedPolicies: {
      type: 'array',
      items: { type: 'string' },
      description: 'Managed policy ARNs to attach'
    },
    inlinePolicies: {
      type: 'array',
      items: {
        type: 'object',
        required: ['name', 'document'],
        additionalProperties: false,
        properties: {
          name: { type: 'string' },
          document: { type: 'object' }
        }
      }
    },
    maxSessionDuration: {
      type: 'number',
      minimum: 3600,
      maximum: 43200,
      description: 'Maximum session duration in seconds'
    },
    externalId: {
      type: 'string',
      description: 'External ID for cross-account role assumption',
      maxLength: 1224
    },
    path: {
      type: 'string',
      description: 'IAM path for the role',
      pattern: '^(?:/|/[a-zA-Z0-9/_-]*/)$',
      default: '/'
    },
    permissionsBoundary: {
      type: 'string',
      description: 'ARN of the permissions boundary policy to attach'
    },
    tags: {
      type: 'object',
      description: 'Additional tags to apply to the role',
      additionalProperties: {
        type: 'string'
      }
    },
    logging: {
      type: 'object',
      description: 'Logging configuration for IAM role operations',
      additionalProperties: false,
      properties: {
        access: {
          $ref: '#/definitions/logConfig',
          description: 'Access log configuration'
        },
        audit: {
          $ref: '#/definitions/logConfig',
          description: 'Audit log configuration'
        }
      }
    },
    monitoring: {
      type: 'object',
      description: 'Monitoring and observability configuration',
      additionalProperties: false,
      properties: {
        enabled: {
          type: 'boolean',
          description: 'Enable monitoring for this role',
          default: false
        },
        detailedMetrics: {
          type: 'boolean',
          description: 'Enable detailed CloudWatch metrics',
          default: false
        },
        sessionAlarm: {
          type: 'object',
          description: 'Session duration alarm configuration',
          additionalProperties: false,
          properties: {
            enabled: { type: 'boolean', default: false },
            thresholdMinutes: { type: 'number', minimum: 1 },
            evaluationPeriods: { type: 'number', minimum: 1, default: 1 },
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
      }
    },
    controls: {
      type: 'object',
      description: 'Compliance control configuration',
      additionalProperties: false,
      properties: {
        requireInstanceProfile: { type: 'boolean', default: false },
        enforceBoundary: { type: 'boolean', default: false },
        denyInsecureTransport: { type: 'boolean', default: false },
        trustPolicies: {
          type: 'object',
          additionalProperties: false,
          properties: {
            enforceMfa: { type: 'boolean', default: false },
            allowExternalId: { type: 'boolean', default: false },
            externalIdCondition: { type: 'string' },
            allowedServicePrincipals: {
              type: 'array',
              items: { type: 'string' }
            }
          }
        },
        additionalStatements: {
          type: 'array',
          items: {
            type: 'object',
            required: ['effect', 'actions'],
            additionalProperties: false,
            properties: {
              sid: { type: 'string' },
              effect: { type: 'string', enum: ['Allow', 'Deny'] },
              actions: {
                type: 'array',
                items: { type: 'string' }
              },
              resources: {
                type: 'array',
                items: { type: 'string' }
              },
              conditions: { type: 'object' }
            }
          }
        }
      }
    }
  },
  definitions: {
    logConfig: {
      type: 'object',
      description: 'CloudWatch Logs group configuration',
      additionalProperties: false,
      properties: {
        enabled: {
          type: 'boolean',
          description: 'Enable log group creation',
          default: false
        },
        logGroupName: {
          type: 'string',
          description: 'Custom log group name (auto-generated if not provided)'
        },
        logGroupNameSuffix: {
          type: 'string',
          description: 'Suffix to append to auto-generated log group name'
        },
        retentionInDays: {
          type: 'number',
          description: 'Log retention period in days',
          minimum: 1,
          enum: [1, 3, 5, 7, 14, 30, 60, 90, 120, 150, 180, 365, 400, 545, 731, 1827, 3653]
        },
        removalPolicy: {
          type: 'string',
          description: 'Removal policy for the log group',
          enum: ['retain', 'destroy'],
          default: 'retain'
        },
        tags: {
          type: 'object',
          description: 'Additional tags for the log group',
          additionalProperties: {
            type: 'string'
          }
        }
      }
    }
  }
};

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

  protected getComplianceFrameworkDefaults(): Partial<IamRoleConfig> {
    const framework = this.builderContext.context.complianceFramework;

    if (framework === 'fedramp-high') {
      // FedRAMP High requires a permissions boundary by default
      // Use a platform-managed boundary policy ARN
      return {
        permissionsBoundary: `arn:aws:iam::${this.builderContext.context.accountId}:policy/platform-fedramp-high-permissions-boundary`
      };
    }

    return {};
  }

  public buildSync(): IamRoleConfig {
    // Get compliance framework defaults and merge them
    const complianceDefaults = this.getComplianceFrameworkDefaults();
    const resolved = super.buildSync() as IamRoleConfig;
    
    // Merge compliance defaults (they take precedence over hardcoded fallbacks but can be overridden)
    const merged = {
      ...resolved,
      ...complianceDefaults,
      // Preserve existing config values if they're set
      permissionsBoundary: resolved.permissionsBoundary ?? complianceDefaults.permissionsBoundary
    };
    
    return this.normaliseConfig(merged);
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
