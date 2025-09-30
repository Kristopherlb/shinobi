/**
 * Configuration builder for the RDS PostgreSQL component.
 *
 * The builder implements the platform's configuration precedence chain
 * and exposes a normalized configuration object that the component can
 * consume without awareness of compliance frameworks. All framework
 * specific defaults should be captured in the segregated /config YAML and
 * merged here so the component logic stays policy-agnostic.
 */

import {
  ConfigBuilder,
  ConfigBuilderContext,
  ComponentConfigSchema
} from '@shinobi/core';
import { ComponentContext, ComponentSpec } from '@platform/contracts';

export type RdsRemovalPolicy = 'retain' | 'destroy';

export interface RdsPostgresLogConfig {
  enabled?: boolean;
  logGroupName?: string;
  retentionInDays?: number;
  removalPolicy?: RdsRemovalPolicy;
  tags?: Record<string, string>;
}

export interface RdsPostgresEncryptionConfig {
  enabled?: boolean;
  kmsKeyArn?: string;
  customerManagedKey?: {
    create?: boolean;
    alias?: string;
    enableRotation?: boolean;
  };
}

export interface RdsPostgresBackupConfig {
  retentionDays?: number;
  copyTagsToSnapshots?: boolean;
  preferredWindow?: string;
}

export interface RdsPostgresEnhancedMonitoringConfig {
  enabled?: boolean;
  intervalSeconds?: number;
}

export interface RdsPostgresPerformanceInsightsConfig {
  enabled?: boolean;
  retentionDays?: number;
  useCustomerManagedKey?: boolean;
}

export interface RdsPostgresAlarmConfig {
  enabled?: boolean;
  threshold?: number;
  evaluationPeriods?: number;
  periodMinutes?: number;
  comparisonOperator?: 'gt' | 'gte' | 'lt' | 'lte';
  treatMissingData?: 'breaching' | 'not-breaching' | 'ignore' | 'missing';
  statistic?: string;
  tags?: Record<string, string>;
}

export interface RdsPostgresMonitoringAlarmsConfig {
  cpuUtilization?: RdsPostgresAlarmConfig;
  freeStorageSpaceBytes?: RdsPostgresAlarmConfig;
  databaseConnections?: RdsPostgresAlarmConfig;
}

export interface RdsPostgresMonitoringConfig {
  enhancedMonitoring?: RdsPostgresEnhancedMonitoringConfig;
  performanceInsights?: RdsPostgresPerformanceInsightsConfig;
  alarms?: RdsPostgresMonitoringAlarmsConfig;
}

export interface RdsPostgresRotationConfig {
  enabled?: boolean;
  mode?: 'single-user' | 'multi-user';
  scheduleInDays?: number;
}

export interface RdsPostgresParameterGroupConfig {
  enabled?: boolean;
  description?: string;
  parameters?: Record<string, string>;
}

export interface RdsPostgresSecurityConfig {
  iamAuthentication?: boolean;
  enforceSsl?: boolean;
}

export interface RdsPostgresNetworkingConfig {
  vpcId?: string;
  useDefaultVpc?: boolean;
  subnetIds?: string[];
  ingressCidrs?: string[];
  port?: number;
}

export interface RdsPostgresInstanceConfig {
  engineVersion?: string;
  instanceType?: string;
  allocatedStorage?: number;
  maxAllocatedStorage?: number;
  publiclyAccessible?: boolean;
  multiAz?: boolean;
  deletionProtection?: boolean;
  removalPolicy?: RdsRemovalPolicy;
}

export interface RdsPostgresObservabilityConfig {
  logExports?: string[];
}

export interface RdsPostgresConfig {
  dbName: string;
  description?: string;
  username: string;
  instance?: RdsPostgresInstanceConfig;
  encryption?: RdsPostgresEncryptionConfig;
  backup?: RdsPostgresBackupConfig;
  monitoring?: RdsPostgresMonitoringConfig;
  logging?: {
    database?: RdsPostgresLogConfig;
    audit?: RdsPostgresLogConfig;
  };
  rotation?: RdsPostgresRotationConfig;
  parameterGroup?: RdsPostgresParameterGroupConfig;
  security?: RdsPostgresSecurityConfig;
  networking?: RdsPostgresNetworkingConfig;
  observability?: RdsPostgresObservabilityConfig;
  tags?: Record<string, string>;
  hardeningProfile?: string;
}

const LOG_CONFIG_DEFINITION = {
  type: 'object',
  additionalProperties: false,
  properties: {
    enabled: { type: 'boolean', default: false },
    logGroupName: { type: 'string' },
    retentionInDays: { type: 'number', minimum: 1 },
    removalPolicy: { type: 'string', enum: ['retain', 'destroy'], default: 'retain' },
    tags: {
      type: 'object',
      additionalProperties: { type: 'string' }
    }
  },
  default: {
    enabled: false,
    retentionInDays: 90,
    removalPolicy: 'retain'
  }
};

export const RDS_POSTGRES_CONFIG_SCHEMA: ComponentConfigSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    dbName: {
      type: 'string',
      description: 'Logical database name',
      pattern: '^[a-zA-Z_][a-zA-Z0-9_\-]*$'
    },
    description: {
      type: 'string',
      maxLength: 1024
    },
    username: {
      type: 'string',
      description: 'Master username for the database',
      pattern: '^[a-zA-Z][a-zA-Z0-9_\-]*$'
    },
    instance: {
      type: 'object',
      additionalProperties: false,
      properties: {
        engineVersion: { type: 'string', default: '15.4' },
        instanceType: { type: 'string', default: 't3.micro' },
        allocatedStorage: { type: 'number', minimum: 20, default: 20 },
        maxAllocatedStorage: { type: 'number', minimum: 20 },
        publiclyAccessible: { type: 'boolean', default: false },
        multiAz: { type: 'boolean', default: false },
        deletionProtection: { type: 'boolean', default: false },
        removalPolicy: { type: 'string', enum: ['retain', 'destroy'], default: 'destroy' }
      },
      default: {}
    },
    encryption: {
      type: 'object',
      additionalProperties: false,
      properties: {
        enabled: { type: 'boolean', default: false },
        kmsKeyArn: { type: 'string' },
        customerManagedKey: {
          type: 'object',
          additionalProperties: false,
          properties: {
            create: { type: 'boolean', default: false },
            alias: { type: 'string' },
            enableRotation: { type: 'boolean', default: false }
          },
          default: {
            create: false,
            enableRotation: false
          }
        }
      },
      default: {}
    },
    backup: {
      type: 'object',
      additionalProperties: false,
      properties: {
        retentionDays: { type: 'number', minimum: 0, default: 7 },
        copyTagsToSnapshots: { type: 'boolean', default: true },
        preferredWindow: { type: 'string' }
      },
      default: {}
    },
    monitoring: {
      type: 'object',
      additionalProperties: false,
      properties: {
        enhancedMonitoring: {
          type: 'object',
          additionalProperties: false,
          properties: {
            enabled: { type: 'boolean', default: false },
            intervalSeconds: { type: 'number', minimum: 1, default: 60 }
          },
          default: {}
        },
        performanceInsights: {
          type: 'object',
          additionalProperties: false,
          properties: {
            enabled: { type: 'boolean', default: false },
            retentionDays: { type: 'number', minimum: 7, default: 7 },
            useCustomerManagedKey: { type: 'boolean', default: false }
          },
          default: {}
        },
        alarms: {
          type: 'object',
          additionalProperties: false,
          properties: {
            cpuUtilization: { $ref: '#/definitions/alarmConfig' },
            freeStorageSpaceBytes: { $ref: '#/definitions/alarmConfig' },
            databaseConnections: { $ref: '#/definitions/alarmConfig' }
          },
          default: {}
        }
      },
      default: {}
    },
    logging: {
      type: 'object',
      additionalProperties: false,
      properties: {
        database: LOG_CONFIG_DEFINITION,
        audit: LOG_CONFIG_DEFINITION
      },
      default: {}
    },
    rotation: {
      type: 'object',
      additionalProperties: false,
      properties: {
        enabled: { type: 'boolean', default: false },
        mode: { type: 'string', enum: ['single-user', 'multi-user'], default: 'single-user' },
        scheduleInDays: { type: 'number', minimum: 1, maximum: 365, default: 30 }
      },
      default: {}
    },
    parameterGroup: {
      type: 'object',
      additionalProperties: false,
      properties: {
        enabled: { type: 'boolean', default: false },
        description: { type: 'string' },
        parameters: {
          type: 'object',
          additionalProperties: { type: 'string' }
        }
      },
      default: {}
    },
    security: {
      type: 'object',
      additionalProperties: false,
      properties: {
        iamAuthentication: { type: 'boolean', default: false },
        enforceSsl: { type: 'boolean', default: true }
      },
      default: {}
    },
    networking: {
      type: 'object',
      additionalProperties: false,
      properties: {
        vpcId: { type: 'string' },
        useDefaultVpc: { type: 'boolean', default: true },
        subnetIds: {
          type: 'array',
          items: { type: 'string' },
          default: []
        },
        ingressCidrs: {
          type: 'array',
          items: { type: 'string' },
          default: []
        },
        port: { type: 'number', default: 5432 }
      },
      default: {}
    },
    observability: {
      type: 'object',
      additionalProperties: false,
      properties: {
        logExports: {
          type: 'array',
          items: { type: 'string' },
          default: ['postgresql']
        }
      },
      default: {}
    },
    tags: {
      type: 'object',
      additionalProperties: { type: 'string' },
      default: {}
    },
    hardeningProfile: {
      type: 'string',
      description: 'Abstract hardening profile identifier used by binders and downstream services'
    }
  },
  definitions: {
    alarmConfig: {
      type: 'object',
      additionalProperties: false,
      properties: {
        enabled: { type: 'boolean', default: false },
        threshold: { type: 'number' },
        evaluationPeriods: { type: 'number', minimum: 1, default: 1 },
        periodMinutes: { type: 'number', minimum: 1, default: 5 },
        comparisonOperator: {
          type: 'string',
          enum: ['gt', 'gte', 'lt', 'lte'],
          default: 'gte'
        },
        treatMissingData: {
          type: 'string',
          enum: ['breaching', 'not-breaching', 'ignore', 'missing'],
          default: 'not-breaching'
        },
        statistic: { type: 'string', default: 'Average' },
        tags: {
          type: 'object',
          additionalProperties: { type: 'string' }
        }
      },
      default: {
        enabled: false,
        evaluationPeriods: 1,
        periodMinutes: 5,
        comparisonOperator: 'gte',
        treatMissingData: 'not-breaching',
        statistic: 'Average'
      }
    }
  }
};

export class RdsPostgresComponentConfigBuilder extends ConfigBuilder<RdsPostgresConfig> {
  constructor(context: ComponentContext, spec: ComponentSpec) {
    const builderContext: ConfigBuilderContext = { context, spec };
    super(builderContext, RDS_POSTGRES_CONFIG_SCHEMA);
  }

  protected getHardcodedFallbacks(): Partial<RdsPostgresConfig> {
    return {
      username: 'postgres',
      instance: {
        engineVersion: '15.4',
        instanceType: 't3.micro',
        allocatedStorage: 20,
        multiAz: false,
        publiclyAccessible: false,
        deletionProtection: false,
        removalPolicy: 'destroy'
      },
      encryption: {
        enabled: false,
        customerManagedKey: {
          create: false,
          enableRotation: false
        }
      },
      backup: {
        retentionDays: 7,
        copyTagsToSnapshots: true
      },
      monitoring: {
        enhancedMonitoring: {
          enabled: false,
          intervalSeconds: 60
        },
        performanceInsights: {
          enabled: false,
          retentionDays: 7,
          useCustomerManagedKey: false
        },
        alarms: {}
      },
      logging: {
        database: {
          enabled: false,
          retentionInDays: 90,
          removalPolicy: 'destroy'
        },
        audit: {
          enabled: false,
          retentionInDays: 365,
          removalPolicy: 'retain'
        }
      },
      rotation: {
        enabled: false,
        mode: 'single-user',
        scheduleInDays: 30
      },
      security: {
        iamAuthentication: false,
        enforceSsl: true
      },
      networking: {
        useDefaultVpc: true,
        ingressCidrs: ['10.0.0.0/16'],
        port: 5432
      },
      observability: {
        logExports: ['postgresql']
      },
      tags: {},
      hardeningProfile: 'baseline'
    };
  }

  public buildSync(): RdsPostgresConfig {
    const resolved = super.buildSync() as RdsPostgresConfig;
    return this.normaliseConfig(resolved);
  }

  private normaliseAlarmConfig(
    alarm?: RdsPostgresAlarmConfig,
    defaults: Required<Omit<RdsPostgresAlarmConfig, 'tags'>>
  ): RdsPostgresAlarmConfig {
    return {
      enabled: alarm?.enabled ?? defaults.enabled,
      threshold: alarm?.threshold ?? defaults.threshold,
      evaluationPeriods: alarm?.evaluationPeriods ?? defaults.evaluationPeriods,
      periodMinutes: alarm?.periodMinutes ?? defaults.periodMinutes,
      comparisonOperator: alarm?.comparisonOperator ?? defaults.comparisonOperator,
      treatMissingData: alarm?.treatMissingData ?? defaults.treatMissingData,
      statistic: alarm?.statistic ?? defaults.statistic,
      tags: alarm?.tags ?? {}
    };
  }

  private normaliseConfig(config: RdsPostgresConfig): RdsPostgresConfig {
    const specName = this.builderContext.spec.name;

    const normaliseLog = (logConfig?: RdsPostgresLogConfig, defaults?: RdsPostgresLogConfig): RdsPostgresLogConfig => ({
      enabled: logConfig?.enabled ?? defaults?.enabled ?? false,
      logGroupName: logConfig?.logGroupName ?? defaults?.logGroupName,
      retentionInDays: logConfig?.retentionInDays ?? defaults?.retentionInDays ?? 90,
      removalPolicy: logConfig?.removalPolicy ?? defaults?.removalPolicy ?? 'retain',
      tags: logConfig?.tags ?? defaults?.tags ?? {}
    });

    return {
      dbName: config.dbName ?? specName.replace(/[^a-zA-Z0-9_]/g, '_'),
      description: config.description,
      username: config.username ?? 'postgres',
      instance: {
        engineVersion: config.instance?.engineVersion ?? '15.4',
        instanceType: config.instance?.instanceType ?? 't3.micro',
        allocatedStorage: config.instance?.allocatedStorage ?? 20,
        maxAllocatedStorage: config.instance?.maxAllocatedStorage,
        publiclyAccessible: config.instance?.publiclyAccessible ?? false,
        multiAz: config.instance?.multiAz ?? false,
        deletionProtection: config.instance?.deletionProtection ?? false,
        removalPolicy: config.instance?.removalPolicy ?? 'destroy'
      },
      encryption: {
        enabled: config.encryption?.enabled ?? false,
        kmsKeyArn: config.encryption?.kmsKeyArn,
        customerManagedKey: {
          create: config.encryption?.customerManagedKey?.create ?? false,
          alias: config.encryption?.customerManagedKey?.alias,
          enableRotation: config.encryption?.customerManagedKey?.enableRotation ?? false
        }
      },
      backup: {
        retentionDays: config.backup?.retentionDays ?? 7,
        copyTagsToSnapshots: config.backup?.copyTagsToSnapshots ?? true,
        preferredWindow: config.backup?.preferredWindow
      },
      monitoring: {
        enhancedMonitoring: {
          enabled: config.monitoring?.enhancedMonitoring?.enabled ?? false,
          intervalSeconds: config.monitoring?.enhancedMonitoring?.intervalSeconds ?? 60
        },
        performanceInsights: {
          enabled: config.monitoring?.performanceInsights?.enabled ?? false,
          retentionDays: config.monitoring?.performanceInsights?.retentionDays ?? 7,
          useCustomerManagedKey: config.monitoring?.performanceInsights?.useCustomerManagedKey ?? false
        },
        alarms: {
          cpuUtilization: this.normaliseAlarmConfig(config.monitoring?.alarms?.cpuUtilization, {
            enabled: false,
            threshold: 80,
            evaluationPeriods: 3,
            periodMinutes: 5,
            comparisonOperator: 'gte',
            treatMissingData: 'not-breaching',
            statistic: 'Average'
          }),
          freeStorageSpaceBytes: this.normaliseAlarmConfig(config.monitoring?.alarms?.freeStorageSpaceBytes, {
            enabled: false,
            threshold: 2 * 1024 * 1024 * 1024,
            evaluationPeriods: 2,
            periodMinutes: 5,
            comparisonOperator: 'lte',
            treatMissingData: 'not-breaching',
            statistic: 'Average'
          }),
          databaseConnections: this.normaliseAlarmConfig(config.monitoring?.alarms?.databaseConnections, {
            enabled: false,
            threshold: 80,
            evaluationPeriods: 2,
            periodMinutes: 5,
            comparisonOperator: 'gte',
            treatMissingData: 'not-breaching',
            statistic: 'Average'
          })
        }
      },
      logging: {
        database: normaliseLog(config.logging?.database, {
          enabled: false,
          retentionInDays: 90,
          removalPolicy: 'destroy'
        }),
        audit: normaliseLog(config.logging?.audit, {
          enabled: false,
          retentionInDays: 365,
          removalPolicy: 'retain'
        })
      },
      rotation: {
        enabled: config.rotation?.enabled ?? false,
        mode: config.rotation?.mode ?? 'single-user',
        scheduleInDays: config.rotation?.scheduleInDays ?? 30
      },
      parameterGroup: config.parameterGroup?.enabled
        ? {
            enabled: true,
            description: config.parameterGroup.description ?? 'Custom PostgreSQL parameter group',
            parameters: config.parameterGroup.parameters ?? {}
          }
        : {
            enabled: false,
            description: config.parameterGroup?.description,
            parameters: config.parameterGroup?.parameters ?? {}
          },
      security: {
        iamAuthentication: config.security?.iamAuthentication ?? false,
        enforceSsl: config.security?.enforceSsl ?? true
      },
      networking: {
        vpcId: config.networking?.vpcId,
        useDefaultVpc: config.networking?.useDefaultVpc ?? !config.networking?.vpcId,
        subnetIds: config.networking?.subnetIds ?? [],
        ingressCidrs: (config.networking?.ingressCidrs ?? []).length > 0
          ? config.networking!.ingressCidrs!
          : ['10.0.0.0/16'],
        port: config.networking?.port ?? 5432
      },
      observability: {
        logExports: (config.observability?.logExports ?? ['postgresql']).length > 0
          ? config.observability!.logExports!
          : ['postgresql']
      },
      tags: config.tags ?? {},
      hardeningProfile: config.hardeningProfile ?? 'baseline'
    };
  }
}
