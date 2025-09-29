import {
  ConfigBuilder,
  ConfigBuilderContext,
  ComponentConfigSchema
} from '@shinobi/core';
import { ComponentContext, ComponentSpec } from '@platform/contracts';

export type EfsPerformanceMode = 'generalPurpose' | 'maxIO';
export type EfsThroughputMode = 'bursting' | 'provisioned' | 'elastic';
export type EfsRemovalPolicy = 'retain' | 'destroy';
export type EfsProtocol = 'tcp' | 'udp';
export type EfsAlarmComparisonOperator = 'gt' | 'gte' | 'lt' | 'lte';
export type EfsTreatMissingData = 'breaching' | 'not-breaching' | 'ignore' | 'missing';

export interface EfsSecurityGroupRuleConfig {
  port: number;
  protocol?: EfsProtocol;
  cidr: string;
  description?: string;
}

export interface EfsSecurityGroupConfig {
  create?: boolean;
  securityGroupId?: string;
  description?: string;
  ingressRules?: EfsSecurityGroupRuleConfig[];
}

export interface EfsVpcConfig {
  enabled?: boolean;
  vpcId?: string;
  subnetIds?: string[];
  securityGroup?: EfsSecurityGroupConfig;
}

export interface EfsCustomerManagedKmsKeyConfig {
  create?: boolean;
  alias?: string;
  enableRotation?: boolean;
}

export interface EfsEncryptionConfig {
  enabled?: boolean;
  encryptInTransit?: boolean;
  kmsKeyArn?: string;
  customerManagedKey?: EfsCustomerManagedKmsKeyConfig;
}

export interface EfsLifecycleConfig {
  transitionToIA?: 'AFTER_7_DAYS' | 'AFTER_14_DAYS' | 'AFTER_30_DAYS' | 'AFTER_60_DAYS' | 'AFTER_90_DAYS';
  transitionToPrimary?: 'AFTER_1_ACCESS';
}

export interface EfsLogConfig {
  enabled?: boolean;
  createLogGroup?: boolean;
  logGroupName?: string;
  retentionInDays?: number;
  removalPolicy?: EfsRemovalPolicy;
  tags?: Record<string, string>;
}

export interface EfsAlarmConfig {
  enabled?: boolean;
  threshold?: number;
  evaluationPeriods?: number;
  periodMinutes?: number;
  comparisonOperator?: EfsAlarmComparisonOperator;
  treatMissingData?: EfsTreatMissingData;
  statistic?: string;
  tags?: Record<string, string>;
}

export interface EfsMonitoringConfig {
  enabled?: boolean;
  alarms?: {
    storageUtilization?: EfsAlarmConfig;
    clientConnections?: EfsAlarmConfig;
    burstCreditBalance?: EfsAlarmConfig;
  };
}

export interface EfsFilesystemConfig {
  fileSystemName: string;
  performanceMode: EfsPerformanceMode;
  throughputMode: EfsThroughputMode;
  provisionedThroughputMibps?: number;
  encryption: {
    enabled: boolean;
    encryptInTransit: boolean;
    kmsKeyArn?: string;
    customerManagedKey: {
      create: boolean;
      alias?: string;
      enableRotation: boolean;
    };
  };
  vpc: {
    enabled: boolean;
    vpcId?: string;
    subnetIds: string[];
    securityGroup: {
      create: boolean;
      securityGroupId?: string;
      description?: string;
      ingressRules: EfsSecurityGroupRuleConfig[];
    };
  };
  lifecycle: {
    transitionToIA?: 'AFTER_7_DAYS' | 'AFTER_14_DAYS' | 'AFTER_30_DAYS' | 'AFTER_60_DAYS' | 'AFTER_90_DAYS';
    transitionToPrimary?: 'AFTER_1_ACCESS';
  };
  backups: {
    enabled: boolean;
  };
  logging: {
    access: EfsLogConfig;
    audit: EfsLogConfig;
  };
  monitoring: {
    enabled: boolean;
    alarms: {
      storageUtilization: EfsAlarmConfig;
      clientConnections: EfsAlarmConfig;
      burstCreditBalance: EfsAlarmConfig;
    };
  };
  filesystemPolicy?: Record<string, any>;
  removalPolicy: EfsRemovalPolicy;
  hardeningProfile: string;
  tags: Record<string, string>;
}

const SECURITY_GROUP_RULE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['port', 'cidr'],
  properties: {
    port: { type: 'number', minimum: 1, maximum: 65535 },
    protocol: { type: 'string', enum: ['tcp', 'udp'], default: 'tcp' },
    cidr: { type: 'string' },
    description: { type: 'string' }
  }
};

const LOG_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    enabled: { type: 'boolean', default: false },
    createLogGroup: { type: 'boolean', default: true },
    logGroupName: { type: 'string' },
    retentionInDays: { type: 'number', minimum: 1, default: 90 },
    removalPolicy: { type: 'string', enum: ['retain', 'destroy'], default: 'destroy' },
    tags: { type: 'object', additionalProperties: { type: 'string' }, default: {} }
  }
};

const ALARM_SCHEMA = {
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
      default: 'gt'
    },
    treatMissingData: {
      type: 'string',
      enum: ['breaching', 'not-breaching', 'ignore', 'missing'],
      default: 'not-breaching'
    },
    statistic: { type: 'string', default: 'Average' },
    tags: { type: 'object', additionalProperties: { type: 'string' }, default: {} }
  }
};

export const EFS_FILESYSTEM_CONFIG_SCHEMA: ComponentConfigSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    fileSystemName: { type: 'string' },
    performanceMode: { type: 'string', enum: ['generalPurpose', 'maxIO'], default: 'generalPurpose' },
    throughputMode: { type: 'string', enum: ['bursting', 'provisioned', 'elastic'], default: 'bursting' },
    provisionedThroughputMibps: { type: 'number', minimum: 1, maximum: 1024 },
    encryption: {
      type: 'object',
      additionalProperties: false,
      properties: {
        enabled: { type: 'boolean' },
        encryptInTransit: { type: 'boolean' },
        kmsKeyArn: { type: 'string' },
        customerManagedKey: {
          type: 'object',
          additionalProperties: false,
          properties: {
            create: { type: 'boolean' },
            alias: { type: 'string' },
            enableRotation: { type: 'boolean' }
          }
        }
      }
    },
    vpc: {
      type: 'object',
      additionalProperties: false,
      properties: {
        enabled: { type: 'boolean' },
        vpcId: { type: 'string' },
        subnetIds: { type: 'array', items: { type: 'string' }, default: [] },
        securityGroup: {
          type: 'object',
          additionalProperties: false,
          properties: {
            create: { type: 'boolean' },
            securityGroupId: { type: 'string' },
            description: { type: 'string' },
            ingressRules: { type: 'array', items: SECURITY_GROUP_RULE_SCHEMA, default: [] }
          }
        }
      }
    },
    lifecycle: {
      type: 'object',
      additionalProperties: false,
      properties: {
        transitionToIA: {
          type: 'string',
          enum: ['AFTER_7_DAYS', 'AFTER_14_DAYS', 'AFTER_30_DAYS', 'AFTER_60_DAYS', 'AFTER_90_DAYS']
        },
        transitionToPrimary: {
          type: 'string',
          enum: ['AFTER_1_ACCESS']
        }
      }
    },
    backups: {
      type: 'object',
      additionalProperties: false,
      properties: {
        enabled: { type: 'boolean' }
      }
    },
    logging: {
      type: 'object',
      additionalProperties: false,
      properties: {
        access: LOG_SCHEMA,
        audit: LOG_SCHEMA
      }
    },
    monitoring: {
      type: 'object',
      additionalProperties: false,
      properties: {
        enabled: { type: 'boolean' },
        alarms: {
          type: 'object',
          additionalProperties: false,
          properties: {
            storageUtilization: ALARM_SCHEMA,
            clientConnections: ALARM_SCHEMA,
            burstCreditBalance: ALARM_SCHEMA
          }
        }
      }
    },
    filesystemPolicy: { type: 'object' },
    removalPolicy: { type: 'string', enum: ['retain', 'destroy'] },
    hardeningProfile: { type: 'string' },
    tags: { type: 'object', additionalProperties: { type: 'string' } }
  }
};

const DEFAULT_ALARM_BASELINE: Required<Omit<EfsAlarmConfig, 'tags'>> = {
  enabled: false,
  threshold: 0,
  evaluationPeriods: 1,
  periodMinutes: 5,
  comparisonOperator: 'gt',
  treatMissingData: 'not-breaching',
  statistic: 'Average'
};

export class EfsFilesystemComponentConfigBuilder extends ConfigBuilder<EfsFilesystemConfig> {
  constructor(context: ComponentContext, spec: ComponentSpec) {
    const builderContext: ConfigBuilderContext = { context, spec };
    super(builderContext, EFS_FILESYSTEM_CONFIG_SCHEMA);
  }

  protected getHardcodedFallbacks(): Partial<EfsFilesystemConfig> {
    return {
      fileSystemName: undefined,
      performanceMode: 'generalPurpose',
      throughputMode: 'bursting',
      encryption: {
        enabled: true,
        encryptInTransit: false,
        customerManagedKey: {
          create: false,
          enableRotation: true
        }
      },
      vpc: {
        enabled: false,
        subnetIds: [],
        securityGroup: {
          create: false,
          ingressRules: this.defaultIngressRules()
        }
      },
      lifecycle: {},
      backups: {
        enabled: false
      },
      logging: {
        access: {
          enabled: false,
          createLogGroup: true,
          retentionInDays: 90,
          removalPolicy: 'destroy'
        },
        audit: {
          enabled: false,
          createLogGroup: true,
          retentionInDays: 365,
          removalPolicy: 'retain'
        }
      },
      monitoring: {
        enabled: false,
        alarms: {
          storageUtilization: { ...DEFAULT_ALARM_BASELINE },
          clientConnections: { ...DEFAULT_ALARM_BASELINE },
          burstCreditBalance: { ...DEFAULT_ALARM_BASELINE }
        }
      },
      removalPolicy: 'retain',
      hardeningProfile: 'baseline',
      tags: {}
    } as Partial<EfsFilesystemConfig>;
  }

  public buildSync(): EfsFilesystemConfig {
    const resolved = super.buildSync() as Partial<EfsFilesystemConfig>;
    return this.normaliseConfig(resolved);
  }

  private normaliseConfig(config: Partial<EfsFilesystemConfig>): EfsFilesystemConfig {
    const fileSystemName = this.sanitiseFilesystemName(
      config.fileSystemName ?? `${this.builderContext.context.serviceName}-${this.builderContext.spec.name}`
    );

    return {
      fileSystemName,
      performanceMode: (config.performanceMode ?? 'generalPurpose') as EfsPerformanceMode,
      throughputMode: (config.throughputMode ?? 'bursting') as EfsThroughputMode,
      provisionedThroughputMibps: config.throughputMode === 'provisioned'
        ? this.clampNumber(config.provisionedThroughputMibps, 1, 1024, 1)
        : undefined,
      encryption: this.normaliseEncryption(config.encryption),
      vpc: this.normaliseVpc(config.vpc),
      lifecycle: this.normaliseLifecycle(config.lifecycle),
      backups: {
        enabled: config.backups?.enabled ?? false
      },
      logging: this.normaliseLogging(config.logging),
      monitoring: this.normaliseMonitoring(config.monitoring),
      filesystemPolicy: config.filesystemPolicy,
      removalPolicy: this.normaliseRemovalPolicy(config.removalPolicy),
      hardeningProfile: config.hardeningProfile ?? 'baseline',
      tags: config.tags ?? {}
    };
  }

  private normaliseEncryption(encryption?: Partial<EfsEncryptionConfig>): EfsFilesystemConfig['encryption'] {
    const enabled = encryption?.enabled ?? true;
    return {
      enabled,
      encryptInTransit: encryption?.encryptInTransit ?? false,
      kmsKeyArn: encryption?.kmsKeyArn,
      customerManagedKey: {
        create: encryption?.customerManagedKey?.create ?? false,
        alias: encryption?.customerManagedKey?.alias,
        enableRotation: encryption?.customerManagedKey?.enableRotation ?? true
      }
    };
  }

  private normaliseVpc(vpc?: Partial<EfsVpcConfig>): EfsFilesystemConfig['vpc'] {
    const hasExplicitVpc = Boolean(vpc?.vpcId) || Boolean(vpc?.subnetIds && vpc.subnetIds.length > 0);
    const enabled = hasExplicitVpc ? true : vpc?.enabled ?? false;
    const securityGroup = vpc?.securityGroup ?? {};
    const ingressRules = (securityGroup.ingressRules ?? this.defaultIngressRules()).map(rule => ({
      port: rule.port,
      protocol: rule.protocol ?? 'tcp',
      cidr: rule.cidr,
      description: rule.description
    }));

    return {
      enabled,
      vpcId: vpc?.vpcId,
      subnetIds: vpc?.subnetIds ?? [],
      securityGroup: {
        create: securityGroup.create ?? (enabled && !securityGroup.securityGroupId),
        securityGroupId: securityGroup.securityGroupId,
        description: securityGroup.description,
        ingressRules
      }
    };
  }

  private normaliseLifecycle(lifecycle?: Partial<EfsLifecycleConfig>): EfsFilesystemConfig['lifecycle'] {
    return {
      transitionToIA: lifecycle?.transitionToIA,
      transitionToPrimary: lifecycle?.transitionToPrimary
    };
  }

  private normaliseLogging(logging?: Partial<EfsFilesystemConfig['logging']>): EfsFilesystemConfig['logging'] {
    return {
      access: this.normaliseLogConfig(logging?.access, { retentionInDays: 90, removalPolicy: 'destroy' }),
      audit: this.normaliseLogConfig(logging?.audit, { retentionInDays: 365, removalPolicy: 'retain' })
    };
  }

  private normaliseLogConfig(
    log: EfsLogConfig | undefined,
    defaults: { retentionInDays: number; removalPolicy: EfsRemovalPolicy }
  ): EfsLogConfig {
    return {
      enabled: log?.enabled ?? false,
      createLogGroup: log?.createLogGroup ?? true,
      logGroupName: log?.logGroupName,
      retentionInDays: log?.retentionInDays ?? defaults.retentionInDays,
      removalPolicy: log?.removalPolicy ?? defaults.removalPolicy,
      tags: log?.tags ?? {}
    };
  }

  private normaliseMonitoring(monitoring?: Partial<EfsMonitoringConfig>): EfsFilesystemConfig['monitoring'] {
    const enabled = monitoring?.enabled ?? false;
    return {
      enabled,
      alarms: {
        storageUtilization: this.normaliseAlarmConfig(monitoring?.alarms?.storageUtilization, {
          ...DEFAULT_ALARM_BASELINE,
          enabled,
          threshold: monitoring?.alarms?.storageUtilization?.threshold ?? 1099511627776,
          statistic: monitoring?.alarms?.storageUtilization?.statistic ?? 'Average'
        }),
        clientConnections: this.normaliseAlarmConfig(monitoring?.alarms?.clientConnections, {
          ...DEFAULT_ALARM_BASELINE,
          enabled,
          threshold: monitoring?.alarms?.clientConnections?.threshold ?? 1000,
          statistic: monitoring?.alarms?.clientConnections?.statistic ?? 'Average'
        }),
        burstCreditBalance: this.normaliseAlarmConfig(monitoring?.alarms?.burstCreditBalance, {
          ...DEFAULT_ALARM_BASELINE,
          enabled,
          threshold: monitoring?.alarms?.burstCreditBalance?.threshold ?? 128,
          comparisonOperator: monitoring?.alarms?.burstCreditBalance?.comparisonOperator ?? 'lt',
          statistic: monitoring?.alarms?.burstCreditBalance?.statistic ?? 'Minimum'
        })
      }
    };
  }

  private normaliseAlarmConfig(
    alarm: EfsAlarmConfig | undefined,
    defaults: Required<Omit<EfsAlarmConfig, 'tags'>>
  ): EfsAlarmConfig {
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

  private normaliseRemovalPolicy(policy?: EfsRemovalPolicy): EfsRemovalPolicy {
    return policy === 'destroy' ? 'destroy' : 'retain';
  }

  private sanitiseFilesystemName(name: string): string {
    const normalised = name
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+/, '')
      .substring(0, 255)
      .replace(/-+$/, '');

    return normalised || 'filesystem';
  }

  private clampNumber(value: number | undefined, min: number, max: number, fallback: number): number {
    if (value === undefined || Number.isNaN(value)) {
      return fallback;
    }
    return Math.max(min, Math.min(max, value));
  }

  private defaultIngressRules(): Required<EfsSecurityGroupRuleConfig>[] {
    return [
      {
        port: 2049,
        protocol: 'tcp',
        cidr: '0.0.0.0/0',
        description: 'NFS access'
      }
    ];
  }
}
