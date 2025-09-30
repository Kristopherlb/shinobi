import {
  ConfigBuilder,
  ConfigBuilderContext,
  ComponentConfigSchema
} from '@shinobi/core';
import { ComponentContext, ComponentSpec } from '@platform/contracts';

export type OpenSearchVolumeType = 'gp2' | 'gp3' | 'io1' | 'io2';
export type OpenSearchRemovalPolicy = 'retain' | 'destroy';
export type OpenSearchComparisonOperator = 'gt' | 'gte' | 'lt' | 'lte';
export type OpenSearchTreatMissingData = 'breaching' | 'not-breaching' | 'ignore' | 'missing';
export type OpenSearchTlsSecurityPolicy = 'Policy-Min-TLS-1-0-2019-07' | 'Policy-Min-TLS-1-2-2019-07';
export type OpenSearchAutoTuneDesiredState = 'ENABLED' | 'DISABLED';

export interface OpenSearchAlarmConfig {
  enabled?: boolean;
  threshold?: number;
  evaluationPeriods?: number;
  periodMinutes?: number;
  comparisonOperator?: OpenSearchComparisonOperator;
  treatMissingData?: OpenSearchTreatMissingData;
  statistic?: string;
  tags?: Record<string, string>;
}

export interface OpenSearchLogConfig {
  enabled?: boolean;
  createLogGroup?: boolean;
  logGroupName?: string;
  retentionInDays?: number;
  removalPolicy?: OpenSearchRemovalPolicy;
  tags?: Record<string, string>;
}

export interface OpenSearchAccessPolicyStatementConfig {
  effect: 'Allow' | 'Deny';
  principals?: string[];
  actions: string[];
  resources?: string[];
  conditions?: Record<string, any>;
}

export interface OpenSearchDomainConfig {
  domainName: string;
  version: string;
  cluster: {
    instanceType: string;
    instanceCount: number;
    zoneAwarenessEnabled: boolean;
    availabilityZoneCount: number;
    dedicatedMasterEnabled: boolean;
    masterInstanceType?: string;
    masterInstanceCount?: number;
    warmEnabled: boolean;
    warmInstanceType?: string;
    warmInstanceCount?: number;
  };
  ebs: {
    enabled: boolean;
    volumeType: OpenSearchVolumeType;
    volumeSize: number;
    iops?: number;
    throughput?: number;
  };
  vpc: {
    enabled: boolean;
    vpcId?: string;
    subnetIds: string[];
    securityGroupIds: string[];
    createSecurityGroup: boolean;
    ingressRules: Array<{
      port: number;
      protocol: 'tcp' | 'udp';
      cidr: string;
      description?: string;
    }>;
  };
  encryption: {
    atRest: {
      enabled: boolean;
      kmsKeyArn?: string;
    };
    nodeToNode: boolean;
  };
  domainEndpoint: {
    enforceHttps: boolean;
    tlsSecurityPolicy: OpenSearchTlsSecurityPolicy;
  };
  advancedSecurity: {
    enabled: boolean;
    internalUserDatabaseEnabled: boolean;
    masterUserName?: string;
    masterUserPassword?: string;
    masterUserPasswordSecretArn?: string;
  };
  logging: {
    slowSearch: OpenSearchLogConfig;
    slowIndex: OpenSearchLogConfig;
    application: OpenSearchLogConfig;
    audit: OpenSearchLogConfig;
  };
  monitoring: {
    enabled: boolean;
    alarms: {
      clusterStatusRed: OpenSearchAlarmConfig;
      clusterStatusYellow: OpenSearchAlarmConfig;
      jvmMemoryPressure: OpenSearchAlarmConfig;
      freeStorageSpace: OpenSearchAlarmConfig;
    };
  };
  snapshot: {
    automatedSnapshotStartHour: number;
  };
  maintenance: {
    autoTune: {
      enabled: boolean;
      desiredState: OpenSearchAutoTuneDesiredState;
    };
    offPeakWindowEnabled: boolean;
  };
  accessPolicies: {
    statements: OpenSearchAccessPolicyStatementConfig[];
  };
  advancedOptions: Record<string, string>;
  hardeningProfile: string;
  removalPolicy: OpenSearchRemovalPolicy;
  tags: Record<string, string>;
}

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
    statistic: { type: 'string', default: 'Maximum' },
    tags: {
      type: 'object',
      additionalProperties: { type: 'string' },
      default: {}
    }
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
    removalPolicy: {
      type: 'string',
      enum: ['retain', 'destroy'],
      default: 'destroy'
    },
    tags: {
      type: 'object',
      additionalProperties: { type: 'string' },
      default: {}
    }
  }
};

const ACCESS_POLICY_STATEMENT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['effect', 'actions'],
  properties: {
    effect: {
      type: 'string',
      enum: ['Allow', 'Deny']
    },
    principals: {
      type: 'array',
      items: { type: 'string' },
      default: []
    },
    actions: {
      type: 'array',
      items: { type: 'string' }
    },
    resources: {
      type: 'array',
      items: { type: 'string' },
      default: []
    },
    conditions: {
      type: 'object',
      default: {}
    }
  }
};

export const OPENSEARCH_DOMAIN_CONFIG_SCHEMA: ComponentConfigSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    domainName: { type: 'string' },
    version: {
      type: 'string',
      enum: ['OpenSearch_1.3', 'OpenSearch_2.3', 'OpenSearch_2.5', 'OpenSearch_2.7'],
      default: 'OpenSearch_2.7'
    },
    cluster: {
      type: 'object',
      additionalProperties: false,
      properties: {
        instanceType: { type: 'string' },
        instanceCount: { type: 'number', minimum: 1, maximum: 80 },
        zoneAwarenessEnabled: { type: 'boolean' },
        availabilityZoneCount: { type: 'number', minimum: 1, maximum: 3 },
        dedicatedMasterEnabled: { type: 'boolean' },
        masterInstanceType: { type: 'string' },
        masterInstanceCount: { type: 'number', enum: [3, 5] },
        warmEnabled: { type: 'boolean' },
        warmInstanceType: { type: 'string' },
        warmInstanceCount: { type: 'number', minimum: 2, maximum: 150 }
      }
    },
    ebs: {
      type: 'object',
      additionalProperties: false,
      properties: {
        enabled: { type: 'boolean' },
        volumeType: { type: 'string', enum: ['gp2', 'gp3', 'io1', 'io2'] },
        volumeSize: { type: 'number', minimum: 10, maximum: 3584 },
        iops: { type: 'number', minimum: 100, maximum: 16000 },
        throughput: { type: 'number', minimum: 125, maximum: 1000 }
      }
    },
    vpc: {
      type: 'object',
      additionalProperties: false,
      properties: {
        enabled: { type: 'boolean' },
        vpcId: { type: 'string' },
        subnetIds: {
          type: 'array',
          items: { type: 'string' },
          default: []
        },
        securityGroupIds: {
          type: 'array',
          items: { type: 'string' },
          default: []
        },
        createSecurityGroup: { type: 'boolean' },
        ingressRules: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['port', 'cidr'],
            properties: {
              port: { type: 'number', minimum: 1, maximum: 65535 },
              protocol: { type: 'string', enum: ['tcp', 'udp'], default: 'tcp' },
              cidr: { type: 'string' },
              description: { type: 'string' }
            }
          },
          default: []
        }
      }
    },
    encryption: {
      type: 'object',
      additionalProperties: false,
      properties: {
        atRest: {
          type: 'object',
          additionalProperties: false,
          properties: {
            enabled: { type: 'boolean' },
            kmsKeyArn: { type: 'string' }
          }
        },
        nodeToNode: { type: 'boolean' }
      }
    },
    domainEndpoint: {
      type: 'object',
      additionalProperties: false,
      properties: {
        enforceHttps: { type: 'boolean' },
        tlsSecurityPolicy: {
          type: 'string',
          enum: ['Policy-Min-TLS-1-0-2019-07', 'Policy-Min-TLS-1-2-2019-07']
        }
      }
    },
    advancedSecurity: {
      type: 'object',
      additionalProperties: false,
      properties: {
        enabled: { type: 'boolean' },
        internalUserDatabaseEnabled: { type: 'boolean' },
        masterUserName: { type: 'string' },
        masterUserPassword: { type: 'string' },
        masterUserPasswordSecretArn: { type: 'string' }
      }
    },
    logging: {
      type: 'object',
      additionalProperties: false,
      properties: {
        slowSearch: LOG_SCHEMA,
        slowIndex: LOG_SCHEMA,
        application: LOG_SCHEMA,
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
            clusterStatusRed: ALARM_SCHEMA,
            clusterStatusYellow: ALARM_SCHEMA,
            jvmMemoryPressure: ALARM_SCHEMA,
            freeStorageSpace: ALARM_SCHEMA
          }
        }
      }
    },
    snapshot: {
      type: 'object',
      additionalProperties: false,
      properties: {
        automatedSnapshotStartHour: { type: 'number', minimum: 0, maximum: 23 }
      }
    },
    maintenance: {
      type: 'object',
      additionalProperties: false,
      properties: {
        autoTune: {
          type: 'object',
          additionalProperties: false,
          properties: {
            enabled: { type: 'boolean' },
            desiredState: {
              type: 'string',
              enum: ['ENABLED', 'DISABLED']
            }
          }
        },
        offPeakWindowEnabled: { type: 'boolean' }
      }
    },
    accessPolicies: {
      type: 'object',
      additionalProperties: false,
      properties: {
        statements: {
          type: 'array',
          items: ACCESS_POLICY_STATEMENT_SCHEMA,
          default: []
        }
      }
    },
    advancedOptions: {
      type: 'object',
      additionalProperties: { type: 'string' },
      default: {}
    },
    hardeningProfile: { type: 'string' },
    removalPolicy: {
      type: 'string',
      enum: ['retain', 'destroy']
    },
    tags: {
      type: 'object',
      additionalProperties: { type: 'string' },
      default: {}
    }
  }
};

const DEFAULT_ALARM_BASELINE = {
  enabled: false,
  threshold: 0,
  evaluationPeriods: 1,
  periodMinutes: 5,
  comparisonOperator: 'gt' as OpenSearchComparisonOperator,
  treatMissingData: 'not-breaching' as OpenSearchTreatMissingData,
  statistic: 'Maximum'
};

export class OpenSearchDomainComponentConfigBuilder extends ConfigBuilder<OpenSearchDomainConfig> {
  constructor(context: ComponentContext, spec: ComponentSpec) {
    const builderContext: ConfigBuilderContext = { context, spec };
    super(builderContext, OPENSEARCH_DOMAIN_CONFIG_SCHEMA);
  }

  protected getHardcodedFallbacks(): Partial<OpenSearchDomainConfig> {
    return {
      version: 'OpenSearch_2.7',
      cluster: {
        instanceType: 't3.small.search',
        instanceCount: 1,
        zoneAwarenessEnabled: false,
        availabilityZoneCount: 2,
        dedicatedMasterEnabled: false,
        warmEnabled: false
      },
      ebs: {
        enabled: true,
        volumeType: 'gp3',
        volumeSize: 20
      },
      vpc: {
        enabled: false,
        vpcId: undefined,
        subnetIds: [],
        securityGroupIds: [],
        createSecurityGroup: false,
        ingressRules: []
      },
      encryption: {
        atRest: {
          enabled: true
        },
        nodeToNode: true
      },
      domainEndpoint: {
        enforceHttps: true,
        tlsSecurityPolicy: 'Policy-Min-TLS-1-2-2019-07'
      },
      advancedSecurity: {
        enabled: false,
        internalUserDatabaseEnabled: false
      },
      logging: {
        slowSearch: { enabled: false, createLogGroup: true, retentionInDays: 90, removalPolicy: 'destroy' },
        slowIndex: { enabled: false, createLogGroup: true, retentionInDays: 90, removalPolicy: 'destroy' },
        application: { enabled: false, createLogGroup: true, retentionInDays: 90, removalPolicy: 'destroy' },
        audit: { enabled: false, createLogGroup: true, retentionInDays: 365, removalPolicy: 'retain' }
      },
      monitoring: {
        enabled: false,
        alarms: {
          clusterStatusRed: { ...DEFAULT_ALARM_BASELINE },
          clusterStatusYellow: { ...DEFAULT_ALARM_BASELINE },
          jvmMemoryPressure: { ...DEFAULT_ALARM_BASELINE, threshold: 80 },
          freeStorageSpace: { ...DEFAULT_ALARM_BASELINE, threshold: 20, comparisonOperator: 'lt' }
        }
      },
      snapshot: {
        automatedSnapshotStartHour: 0
      },
      maintenance: {
        autoTune: {
          enabled: false,
          desiredState: 'DISABLED'
        },
        offPeakWindowEnabled: false
      },
      accessPolicies: {
        statements: []
      },
      advancedOptions: {},
      hardeningProfile: 'baseline',
      removalPolicy: 'destroy',
      tags: {}
    };
  }

  public buildSync(): OpenSearchDomainConfig {
    const resolved = super.buildSync() as Partial<OpenSearchDomainConfig>;
    return this.normaliseConfig(resolved);
  }

  private normaliseConfig(config: Partial<OpenSearchDomainConfig>): OpenSearchDomainConfig {
    const domainName = this.sanitiseDomainName(
      config.domainName ?? `${this.builderContext.context.serviceName}-${this.builderContext.spec.name}`
    );

    return {
      domainName,
      version: config.version ?? 'OpenSearch_2.7',
      cluster: this.normaliseClusterConfig(config.cluster),
      ebs: this.normaliseEbsConfig(config.ebs),
      vpc: this.normaliseVpcConfig(config.vpc),
      encryption: this.normaliseEncryptionConfig(config.encryption),
      domainEndpoint: this.normaliseDomainEndpoint(config.domainEndpoint),
      advancedSecurity: this.normaliseAdvancedSecurity(config.advancedSecurity),
      logging: this.normaliseLogging(config.logging),
      monitoring: this.normaliseMonitoring(config.monitoring),
      snapshot: {
        automatedSnapshotStartHour: this.clampNumber(config.snapshot?.automatedSnapshotStartHour, 0, 23, 0)
      },
      maintenance: this.normaliseMaintenance(config.maintenance),
      accessPolicies: this.normaliseAccessPolicies(config.accessPolicies),
      advancedOptions: config.advancedOptions ?? {},
      hardeningProfile: config.hardeningProfile ?? 'baseline',
      removalPolicy: this.normaliseRemovalPolicy(config.removalPolicy),
      tags: config.tags ?? {}
    };
  }

  private normaliseClusterConfig(cluster?: Partial<OpenSearchDomainConfig['cluster']>): OpenSearchDomainConfig['cluster'] {
    const zoneAwarenessEnabled = cluster?.zoneAwarenessEnabled ?? false;
    const dedicatedMasterEnabled = cluster?.dedicatedMasterEnabled ?? false;
    const warmEnabled = cluster?.warmEnabled ?? false;

    return {
      instanceType: cluster?.instanceType ?? 't3.small.search',
      instanceCount: cluster?.instanceCount ?? 1,
      zoneAwarenessEnabled,
      availabilityZoneCount: zoneAwarenessEnabled ? this.clampNumber(cluster?.availabilityZoneCount, 2, 3, 2) : 2,
      dedicatedMasterEnabled,
      masterInstanceType: dedicatedMasterEnabled ? cluster?.masterInstanceType ?? cluster?.instanceType ?? 'm6g.medium.search' : undefined,
      masterInstanceCount: dedicatedMasterEnabled ? cluster?.masterInstanceCount ?? 3 : undefined,
      warmEnabled,
      warmInstanceType: warmEnabled ? cluster?.warmInstanceType ?? 'ultrawarm1.medium.search' : undefined,
      warmInstanceCount: warmEnabled ? cluster?.warmInstanceCount ?? 2 : undefined
    };
  }

  private normaliseEbsConfig(ebs?: Partial<OpenSearchDomainConfig['ebs']>): OpenSearchDomainConfig['ebs'] {
    return {
      enabled: ebs?.enabled ?? true,
      volumeType: ebs?.volumeType ?? 'gp3',
      volumeSize: this.clampNumber(ebs?.volumeSize, 10, 3584, 20),
      iops: ebs?.iops,
      throughput: ebs?.throughput
    };
  }

  private normaliseVpcConfig(vpc?: Partial<OpenSearchDomainConfig['vpc']>): OpenSearchDomainConfig['vpc'] {
    const hasExplicitVpc = Boolean(vpc?.vpcId) || Boolean(vpc?.subnetIds && vpc.subnetIds.length > 0);
    const enabled = hasExplicitVpc ? true : (vpc?.enabled ?? false);
    const ingressRules = (vpc?.ingressRules ?? []).map(rule => ({
      port: rule.port,
      protocol: rule.protocol ?? 'tcp',
      cidr: rule.cidr,
      description: rule.description
    }));

    return {
      enabled,
      vpcId: vpc?.vpcId,
      subnetIds: vpc?.subnetIds ?? [],
      securityGroupIds: vpc?.securityGroupIds ?? [],
      createSecurityGroup: enabled ? vpc?.createSecurityGroup ?? (!vpc?.securityGroupIds || vpc.securityGroupIds.length === 0) : false,
      ingressRules: ingressRules.length > 0 ? ingressRules : this.defaultIngressRules()
    };
  }

  private normaliseEncryptionConfig(encryption?: Partial<OpenSearchDomainConfig['encryption']>): OpenSearchDomainConfig['encryption'] {
    return {
      atRest: {
        enabled: encryption?.atRest?.enabled ?? true,
        kmsKeyArn: encryption?.atRest?.kmsKeyArn
      },
      nodeToNode: encryption?.nodeToNode ?? true
    };
  }

  private normaliseDomainEndpoint(domainEndpoint?: Partial<OpenSearchDomainConfig['domainEndpoint']>): OpenSearchDomainConfig['domainEndpoint'] {
    return {
      enforceHttps: domainEndpoint?.enforceHttps ?? true,
      tlsSecurityPolicy: domainEndpoint?.tlsSecurityPolicy ?? 'Policy-Min-TLS-1-2-2019-07'
    };
  }

  private normaliseAdvancedSecurity(advancedSecurity?: Partial<OpenSearchDomainConfig['advancedSecurity']>): OpenSearchDomainConfig['advancedSecurity'] {
    return {
      enabled: advancedSecurity?.enabled ?? false,
      internalUserDatabaseEnabled: advancedSecurity?.internalUserDatabaseEnabled ?? false,
      masterUserName: advancedSecurity?.masterUserName,
      masterUserPassword: advancedSecurity?.masterUserPassword,
      masterUserPasswordSecretArn: advancedSecurity?.masterUserPasswordSecretArn
    };
  }

  private normaliseLogging(logging?: Partial<OpenSearchDomainConfig['logging']>): OpenSearchDomainConfig['logging'] {
    return {
      slowSearch: this.normaliseLogConfig(logging?.slowSearch, { retentionInDays: 90, removalPolicy: 'destroy' }),
      slowIndex: this.normaliseLogConfig(logging?.slowIndex, { retentionInDays: 90, removalPolicy: 'destroy' }),
      application: this.normaliseLogConfig(logging?.application, { retentionInDays: 90, removalPolicy: 'destroy' }),
      audit: this.normaliseLogConfig(logging?.audit, { retentionInDays: 365, removalPolicy: 'retain' })
    };
  }

  private normaliseLogConfig(
    log?: OpenSearchLogConfig,
    defaults?: { retentionInDays: number; removalPolicy: OpenSearchRemovalPolicy }
  ): OpenSearchLogConfig {
    return {
      enabled: log?.enabled ?? false,
      createLogGroup: log?.createLogGroup ?? true,
      logGroupName: log?.logGroupName,
      retentionInDays: log?.retentionInDays ?? defaults?.retentionInDays ?? 90,
      removalPolicy: log?.removalPolicy ?? defaults?.removalPolicy ?? 'destroy',
      tags: log?.tags ?? {}
    };
  }

  private normaliseMonitoring(monitoring?: Partial<OpenSearchDomainConfig['monitoring']>): OpenSearchDomainConfig['monitoring'] {
    const enabled = monitoring?.enabled ?? false;
    return {
      enabled,
      alarms: {
        clusterStatusRed: this.normaliseAlarmConfig(monitoring?.alarms?.clusterStatusRed, { threshold: 0, comparisonOperator: 'gt' }),
        clusterStatusYellow: this.normaliseAlarmConfig(monitoring?.alarms?.clusterStatusYellow, { threshold: 0, comparisonOperator: 'gt' }),
        jvmMemoryPressure: this.normaliseAlarmConfig(monitoring?.alarms?.jvmMemoryPressure, { threshold: 80, comparisonOperator: 'gt' }),
        freeStorageSpace: this.normaliseAlarmConfig(monitoring?.alarms?.freeStorageSpace, { threshold: 20, comparisonOperator: 'lt', statistic: 'Minimum' })
      }
    };
  }

  private normaliseAlarmConfig(
    alarm: OpenSearchAlarmConfig | undefined,
    overrides: Partial<OpenSearchAlarmConfig>
  ): OpenSearchAlarmConfig {
    return {
      enabled: alarm?.enabled ?? false,
      threshold: alarm?.threshold ?? overrides.threshold ?? 0,
      evaluationPeriods: alarm?.evaluationPeriods ?? overrides.evaluationPeriods ?? 1,
      periodMinutes: alarm?.periodMinutes ?? overrides.periodMinutes ?? 5,
      comparisonOperator: alarm?.comparisonOperator ?? overrides.comparisonOperator ?? 'gt',
      treatMissingData: alarm?.treatMissingData ?? overrides.treatMissingData ?? 'not-breaching',
      statistic: alarm?.statistic ?? overrides.statistic ?? 'Maximum',
      tags: alarm?.tags ?? {}
    };
  }

  private normaliseMaintenance(maintenance?: Partial<OpenSearchDomainConfig['maintenance']>): OpenSearchDomainConfig['maintenance'] {
    return {
      autoTune: {
        enabled: maintenance?.autoTune?.enabled ?? false,
        desiredState: maintenance?.autoTune?.desiredState ?? (maintenance?.autoTune?.enabled ? 'ENABLED' : 'DISABLED')
      },
      offPeakWindowEnabled: maintenance?.offPeakWindowEnabled ?? false
    };
  }

  private normaliseAccessPolicies(accessPolicies?: Partial<OpenSearchDomainConfig['accessPolicies']>): OpenSearchDomainConfig['accessPolicies'] {
    const statements = accessPolicies?.statements ?? [];
    return {
      statements: statements.map(stmt => ({
        effect: stmt.effect,
        principals: stmt.principals ?? [],
        actions: stmt.actions,
        resources: stmt.resources ?? [],
        conditions: stmt.conditions ?? {}
      }))
    };
  }

  private normaliseRemovalPolicy(removalPolicy?: OpenSearchRemovalPolicy): OpenSearchRemovalPolicy {
    return removalPolicy === 'retain' ? 'retain' : 'destroy';
  }

  private sanitiseDomainName(name: string): string {
    const lower = name.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    const trimmed = lower.replace(/^-+/, '');
    const prefixed = /^[a-z]/.test(trimmed) ? trimmed : `a${trimmed}`;
    return prefixed.substring(0, 28).replace(/-+$/g, '') || 'domain';
  }

  private clampNumber(value: number | undefined, min: number, max: number, fallback: number): number {
    if (value === undefined || Number.isNaN(value)) {
      return fallback;
    }
    return Math.max(min, Math.min(max, value));
  }

  private defaultIngressRules(): OpenSearchDomainConfig['vpc']['ingressRules'] {
    return [
      {
        port: 443,
        protocol: 'tcp',
        cidr: '0.0.0.0/0',
        description: 'HTTPS access'
      },
      {
        port: 9200,
        protocol: 'tcp',
        cidr: '0.0.0.0/0',
        description: 'OpenSearch API'
      }
    ];
  }
}
