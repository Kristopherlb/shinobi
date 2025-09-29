import {
  ConfigBuilder,
  ConfigBuilderContext,
  ComponentConfigSchema
} from '@shinobi/core';

export type RemovalPolicyOption = 'retain' | 'destroy';
export type RedisLogType = 'slow-log' | 'engine-log';
export type RedisLogDestinationType = 'cloudwatch-logs' | 'kinesis-firehose';

export interface RedisAuthTokenConfig {
  enabled: boolean;
  secretArn?: string;
  description?: string;
  removalPolicy: RemovalPolicyOption;
}

export interface RedisEncryptionConfig {
  atRest: boolean;
  inTransit: boolean;
  authToken: RedisAuthTokenConfig;
}

export interface RedisBackupConfig {
  enabled: boolean;
  retentionDays: number;
  window: string;
}

export interface RedisMaintenanceConfig {
  window: string;
  notificationTopicArn?: string;
}

export interface RedisMultiAzConfig {
  enabled: boolean;
  automaticFailover: boolean;
}

export interface RedisLogDeliveryConfig {
  enabled: boolean;
  logType: RedisLogType;
  destinationType: RedisLogDestinationType;
  destinationName: string;
  logFormat: 'text' | 'json';
}

export interface RedisAlarmThresholdConfig {
  enabled: boolean;
  threshold: number;
  evaluationPeriods: number;
  periodMinutes: number;
}

export interface RedisMonitoringConfig {
  enabled: boolean;
  logDelivery: RedisLogDeliveryConfig[];
  alarms: {
    cpuUtilization: RedisAlarmThresholdConfig;
    cacheMisses: RedisAlarmThresholdConfig;
    evictions: RedisAlarmThresholdConfig;
    connections: RedisAlarmThresholdConfig;
  };
}

export interface RedisSecurityConfig {
  create: boolean;
  securityGroupIds: string[];
  allowedCidrs: string[];
}

export interface RedisVpcConfig {
  vpcId?: string;
  subnetIds: string[];
  subnetGroupName?: string;
}

export interface RedisParameterGroupConfig {
  family: string;
  parameters: Record<string, string>;
}

export interface ElastiCacheRedisConfig {
  clusterName?: string;
  description?: string;
  engineVersion: string;
  nodeType: string;
  numCacheNodes: number;
  port: number;
  vpc: RedisVpcConfig;
  security: RedisSecurityConfig;
  parameterGroup: RedisParameterGroupConfig;
  encryption: RedisEncryptionConfig;
  backup: RedisBackupConfig;
  maintenance: RedisMaintenanceConfig;
  multiAz: RedisMultiAzConfig;
  monitoring: RedisMonitoringConfig;
  tags: Record<string, string>;
}

const AUTH_TOKEN_SCHEMA: ComponentConfigSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    enabled: { type: 'boolean' },
    secretArn: { type: 'string' },
    description: { type: 'string' },
    removalPolicy: { type: 'string', enum: ['retain', 'destroy'] }
  }
};

const ENCRYPTION_SCHEMA: ComponentConfigSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    atRest: { type: 'boolean' },
    inTransit: { type: 'boolean' },
    authToken: AUTH_TOKEN_SCHEMA
  }
};

const BACKUP_SCHEMA: ComponentConfigSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    enabled: { type: 'boolean' },
    retentionDays: { type: 'number', minimum: 0, maximum: 35 },
    window: {
      type: 'string',
      pattern: '^([01]?[0-9]|2[0-3]):[0-5][0-9]-([01]?[0-9]|2[0-3]):[0-5][0-9]$'
    }
  }
};

const MAINTENANCE_SCHEMA: ComponentConfigSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    window: {
      type: 'string',
      pattern: '^(sun|mon|tue|wed|thu|fri|sat):[0-2][0-9]:[0-5][0-9]-(sun|mon|tue|wed|thu|fri|sat):[0-2][0-9]:[0-5][0-9]$'
    },
    notificationTopicArn: { type: 'string' }
  }
};

const MULTI_AZ_SCHEMA: ComponentConfigSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    enabled: { type: 'boolean' },
    automaticFailover: { type: 'boolean' }
  }
};

const LOG_DELIVERY_SCHEMA: ComponentConfigSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['logType', 'destinationType', 'destinationName'],
  properties: {
    enabled: { type: 'boolean' },
    logType: { type: 'string', enum: ['slow-log', 'engine-log'] },
    destinationType: { type: 'string', enum: ['cloudwatch-logs', 'kinesis-firehose'] },
    destinationName: { type: 'string' },
    logFormat: { type: 'string', enum: ['text', 'json'] }
  }
};

const ALARM_SCHEMA: ComponentConfigSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    enabled: { type: 'boolean' },
    threshold: { type: 'number', minimum: 0 },
    evaluationPeriods: { type: 'number', minimum: 1 },
    periodMinutes: { type: 'number', minimum: 1 }
  }
};

const MONITORING_SCHEMA: ComponentConfigSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    enabled: { type: 'boolean' },
    logDelivery: {
      type: 'array',
      items: LOG_DELIVERY_SCHEMA
    },
    alarms: {
      type: 'object',
      additionalProperties: false,
      properties: {
        cpuUtilization: ALARM_SCHEMA,
        cacheMisses: ALARM_SCHEMA,
        evictions: ALARM_SCHEMA,
        connections: ALARM_SCHEMA
      }
    }
  }
};

const VPC_SCHEMA: ComponentConfigSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    vpcId: { type: 'string' },
    subnetIds: {
      type: 'array',
      items: { type: 'string', pattern: '^subnet-[a-f0-9]+' },
      minItems: 1
    },
    subnetGroupName: { type: 'string' }
  }
};

const SECURITY_SCHEMA: ComponentConfigSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    create: { type: 'boolean' },
    securityGroupIds: {
      type: 'array',
      items: { type: 'string', pattern: '^sg-[a-f0-9]+' }
    },
    allowedCidrs: {
      type: 'array',
      items: { type: 'string', pattern: '^([0-9]{1,3}\.){3}[0-9]{1,3}/[0-9]{1,2}$' }
    }
  }
};

const PARAMETER_GROUP_SCHEMA: ComponentConfigSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    family: { type: 'string' },
    parameters: {
      type: 'object',
      additionalProperties: { type: 'string' }
    }
  }
};

export const ELASTICACHE_REDIS_CONFIG_SCHEMA: ComponentConfigSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    clusterName: { type: 'string' },
    description: { type: 'string' },
    engineVersion: { type: 'string' },
    nodeType: { type: 'string' },
    numCacheNodes: { type: 'number', minimum: 1, maximum: 20 },
    port: { type: 'number', minimum: 1024, maximum: 65535 },
    vpc: VPC_SCHEMA,
    security: SECURITY_SCHEMA,
    parameterGroup: PARAMETER_GROUP_SCHEMA,
    encryption: ENCRYPTION_SCHEMA,
    backup: BACKUP_SCHEMA,
    maintenance: MAINTENANCE_SCHEMA,
    multiAz: MULTI_AZ_SCHEMA,
    monitoring: MONITORING_SCHEMA,
    tags: {
      type: 'object',
      additionalProperties: { type: 'string' }
    }
  }
};

const DEFAULT_ALARMS: RedisMonitoringConfig['alarms'] = {
  cpuUtilization: {
    enabled: false,
    threshold: 80,
    evaluationPeriods: 2,
    periodMinutes: 5
  },
  cacheMisses: {
    enabled: false,
    threshold: 1000,
    evaluationPeriods: 2,
    periodMinutes: 5
  },
  evictions: {
    enabled: false,
    threshold: 10,
    evaluationPeriods: 2,
    periodMinutes: 5
  },
  connections: {
    enabled: false,
    threshold: 500,
    evaluationPeriods: 2,
    periodMinutes: 5
  }
};

const HARDENED_FALLBACKS: Partial<ElastiCacheRedisConfig> = {
  engineVersion: '7.0',
  nodeType: 'cache.t4g.micro',
  numCacheNodes: 1,
  port: 6379,
  vpc: {
    subnetIds: []
  },
  security: {
    create: true,
    securityGroupIds: [],
    allowedCidrs: ['10.0.0.0/8']
  },
  parameterGroup: {
    family: 'redis7',
    parameters: {}
  },
  encryption: {
    atRest: false,
    inTransit: false,
    authToken: {
      enabled: false,
      removalPolicy: 'destroy'
    }
  },
  backup: {
    enabled: false,
    retentionDays: 1,
    window: '03:00-05:00'
  },
  maintenance: {
    window: 'sun:03:00-sun:04:00'
  },
  multiAz: {
    enabled: false,
    automaticFailover: false
  },
  monitoring: {
    enabled: false,
    logDelivery: [],
    alarms: DEFAULT_ALARMS
  },
  tags: {}
};

export class ElastiCacheRedisComponentConfigBuilder extends ConfigBuilder<ElastiCacheRedisConfig> {
  constructor(context: ConfigBuilderContext['context'], spec: ConfigBuilderContext['spec']) {
    super({ context, spec }, ELASTICACHE_REDIS_CONFIG_SCHEMA);
  }

  protected getHardcodedFallbacks(): Record<string, any> {
    return HARDENED_FALLBACKS;
  }

  public buildSync(): ElastiCacheRedisConfig {
    const resolved = super.buildSync() as Partial<ElastiCacheRedisConfig>;
    return this.normaliseConfig(resolved);
  }

  public getSchema(): ComponentConfigSchema {
    return ELASTICACHE_REDIS_CONFIG_SCHEMA;
  }

  private normaliseConfig(config: Partial<ElastiCacheRedisConfig>): ElastiCacheRedisConfig {
    const monitoring = config.monitoring ?? HARDENED_FALLBACKS.monitoring!;

    const alarms = {
      cpuUtilization: this.normaliseAlarm(monitoring.alarms?.cpuUtilization, DEFAULT_ALARMS.cpuUtilization),
      cacheMisses: this.normaliseAlarm(monitoring.alarms?.cacheMisses, DEFAULT_ALARMS.cacheMisses),
      evictions: this.normaliseAlarm(monitoring.alarms?.evictions, DEFAULT_ALARMS.evictions),
      connections: this.normaliseAlarm(monitoring.alarms?.connections, DEFAULT_ALARMS.connections)
    };

    const logDelivery = (monitoring.logDelivery ?? []).map(entry => ({
      enabled: entry.enabled ?? true,
      logType: entry.logType,
      destinationType: entry.destinationType,
      destinationName: entry.destinationName,
      logFormat: entry.logFormat ?? 'json'
    }));

    if ((monitoring.enabled ?? false) && logDelivery.length === 0) {
      logDelivery.push({
        enabled: true,
        logType: 'slow-log',
        destinationType: 'cloudwatch-logs',
        destinationName: `/aws/elasticache/redis/${this.builderContext.context.serviceName}-${this.builderContext.spec.name}`,
        logFormat: 'json'
      });
    }

    return {
      clusterName: config.clusterName,
      description: config.description,
      engineVersion: config.engineVersion ?? '7.0',
      nodeType: config.nodeType ?? 'cache.t4g.micro',
      numCacheNodes: config.numCacheNodes ?? 1,
      port: config.port ?? 6379,
      vpc: {
        vpcId: config.vpc?.vpcId,
        subnetIds: config.vpc?.subnetIds ?? [],
        subnetGroupName: config.vpc?.subnetGroupName
      },
      security: {
        create: config.security?.create ?? true,
        securityGroupIds: config.security?.securityGroupIds ?? [],
        allowedCidrs: config.security?.allowedCidrs ?? ['10.0.0.0/8']
      },
      parameterGroup: {
        family: config.parameterGroup?.family ?? 'redis7',
        parameters: config.parameterGroup?.parameters ?? {}
      },
      encryption: this.normaliseEncryption(config.encryption),
      backup: {
        enabled: config.backup?.enabled ?? false,
        retentionDays: config.backup?.retentionDays ?? 1,
        window: config.backup?.window ?? '03:00-05:00'
      },
      maintenance: {
        window: config.maintenance?.window ?? 'sun:03:00-sun:04:00',
        notificationTopicArn: config.maintenance?.notificationTopicArn
      },
      multiAz: {
        enabled: config.multiAz?.enabled ?? false,
        automaticFailover: config.multiAz?.automaticFailover ?? false
      },
      monitoring: {
        enabled: monitoring.enabled ?? false,
        logDelivery,
        alarms
      },
      tags: config.tags ?? {}
    };
  }

  private normaliseAlarm(alarm: Partial<RedisAlarmThresholdConfig> | undefined, defaults: RedisAlarmThresholdConfig): RedisAlarmThresholdConfig {
    return {
      enabled: alarm?.enabled ?? defaults.enabled,
      threshold: alarm?.threshold ?? defaults.threshold,
      evaluationPeriods: alarm?.evaluationPeriods ?? defaults.evaluationPeriods,
      periodMinutes: alarm?.periodMinutes ?? defaults.periodMinutes
    };
  }

  private normaliseEncryption(encryption?: Partial<RedisEncryptionConfig>): RedisEncryptionConfig {
    const authToken = encryption?.authToken ?? HARDENED_FALLBACKS.encryption!.authToken;
    return {
      atRest: encryption?.atRest ?? false,
      inTransit: encryption?.inTransit ?? false,
      authToken: {
        enabled: authToken?.enabled ?? false,
        secretArn: authToken?.secretArn,
        description: authToken?.description,
        removalPolicy: authToken?.removalPolicy ?? 'destroy'
      }
    };
  }
}
