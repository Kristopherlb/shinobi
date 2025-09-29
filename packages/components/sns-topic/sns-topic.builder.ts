import {
  ConfigBuilder,
  ConfigBuilderContext,
  ComponentConfigSchema
} from '@shinobi/core';

export type RemovalPolicyOption = 'retain' | 'destroy';
export type AlarmComparisonOperator = 'gt' | 'gte' | 'lt' | 'lte';
export type AlarmTreatMissingData = 'breaching' | 'not-breaching' | 'ignore' | 'missing';
export type TopicTracingConfig = 'Active' | 'PassThrough';

export interface AlarmConfig {
  enabled: boolean;
  threshold: number;
  evaluationPeriods: number;
  periodMinutes: number;
  comparisonOperator: AlarmComparisonOperator;
  treatMissingData: AlarmTreatMissingData;
  statistic: 'Sum' | 'Average' | 'Minimum' | 'Maximum';
}

export interface CloudWatchAlarmsConfig {
  failedNotifications: AlarmConfig;
  messageRate: AlarmConfig;
}

export interface MonitoringConfig {
  enabled: boolean;
  alarms: CloudWatchAlarmsConfig;
}

export interface CustomerManagedKeyConfig {
  create: boolean;
  alias?: string;
  enableRotation: boolean;
}

export interface EncryptionConfig {
  enabled: boolean;
  kmsKeyArn?: string;
  customerManagedKey: CustomerManagedKeyConfig;
}

export interface FifoConfig {
  enabled: boolean;
  contentBasedDeduplication: boolean;
}

export interface TopicPolicyPrincipalConfig {
  type: 'service' | 'account' | 'any';
  identifiers?: string[];
}

export interface TopicPolicyStatementConfig {
  sid?: string;
  effect?: 'allow' | 'deny';
  principals?: TopicPolicyPrincipalConfig[];
  actions: string[];
  resources?: string[];
  conditions?: Record<string, Record<string, any>>;
}

export interface SnsTopicConfig {
  topicName?: string;
  displayName?: string;
  fifo: FifoConfig;
  encryption: EncryptionConfig;
  deliveryPolicy?: Record<string, any>;
  messageFilterPolicy?: Record<string, any>;
  tracing: TopicTracingConfig;
  policies: TopicPolicyStatementConfig[];
  monitoring: MonitoringConfig;
  tags: Record<string, string>;
}

const ALARM_SCHEMA: ComponentConfigSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    enabled: { type: 'boolean' },
    threshold: { type: 'number' },
    evaluationPeriods: { type: 'number', minimum: 1 },
    periodMinutes: { type: 'number', minimum: 1 },
    comparisonOperator: { type: 'string', enum: ['gt', 'gte', 'lt', 'lte'] },
    treatMissingData: { type: 'string', enum: ['breaching', 'not-breaching', 'ignore', 'missing'] },
    statistic: { type: 'string', enum: ['Sum', 'Average', 'Minimum', 'Maximum'] }
  }
};

const CUSTOMER_MANAGED_KEY_SCHEMA: ComponentConfigSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    create: { type: 'boolean' },
    alias: { type: 'string' },
    enableRotation: { type: 'boolean' }
  }
};

const ENCRYPTION_SCHEMA: ComponentConfigSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    enabled: { type: 'boolean' },
    kmsKeyArn: { type: 'string' },
    customerManagedKey: CUSTOMER_MANAGED_KEY_SCHEMA
  }
};

const FIFO_SCHEMA: ComponentConfigSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    enabled: { type: 'boolean' },
    contentBasedDeduplication: { type: 'boolean' }
  }
};

const POLICY_PRINCIPAL_SCHEMA: ComponentConfigSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    type: { type: 'string', enum: ['service', 'account', 'any'] },
    identifiers: {
      type: 'array',
      items: { type: 'string' }
    }
  }
};

const POLICY_STATEMENT_SCHEMA: ComponentConfigSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    sid: { type: 'string' },
    effect: { type: 'string', enum: ['allow', 'deny'] },
    principals: {
      type: 'array',
      items: POLICY_PRINCIPAL_SCHEMA
    },
    actions: {
      type: 'array',
      items: { type: 'string' }
    },
    resources: {
      type: 'array',
      items: { type: 'string' }
    },
    conditions: {
      type: 'object'
    }
  },
  required: ['actions']
};

export const SNS_TOPIC_CONFIG_SCHEMA: ComponentConfigSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    topicName: { type: 'string' },
    displayName: { type: 'string' },
    fifo: FIFO_SCHEMA,
    encryption: ENCRYPTION_SCHEMA,
    deliveryPolicy: { type: 'object' },
    messageFilterPolicy: { type: 'object' },
    tracing: { type: 'string', enum: ['Active', 'PassThrough'] },
    policies: {
      type: 'array',
      items: POLICY_STATEMENT_SCHEMA
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
            failedNotifications: ALARM_SCHEMA,
            messageRate: ALARM_SCHEMA
          }
        }
      }
    },
    tags: {
      type: 'object',
      additionalProperties: { type: 'string' }
    }
  },
  required: ['monitoring', 'fifo', 'encryption'],
  allOf: [
    {
      if: {
        properties: {
          encryption: {
            properties: {
              enabled: { const: true }
            }
          }
        }
      },
      then: {
        properties: {
          encryption: {
            anyOf: [
              { required: ['kmsKeyArn'] },
              {
                properties: {
                  customerManagedKey: {
                    properties: { create: { const: true } }
                  }
                }
              }
            ]
          }
        }
      }
    }
  ]
};

const ALARM_BASELINE: AlarmConfig = {
  enabled: false,
  threshold: 0,
  evaluationPeriods: 1,
  periodMinutes: 5,
  comparisonOperator: 'gte',
  treatMissingData: 'not-breaching',
  statistic: 'Sum'
};

const HARDENED_FALLBACKS: Partial<SnsTopicConfig> = {
  fifo: {
    enabled: false,
    contentBasedDeduplication: false
  },
  encryption: {
    enabled: false,
    customerManagedKey: {
      create: false,
      enableRotation: true
    }
  },
  tracing: 'PassThrough',
  policies: [],
  monitoring: {
    enabled: false,
    alarms: {
      failedNotifications: { ...ALARM_BASELINE },
      messageRate: { ...ALARM_BASELINE }
    }
  },
  tags: {}
};

export class SnsTopicComponentConfigBuilder extends ConfigBuilder<SnsTopicConfig> {
  constructor(context: ConfigBuilderContext['context'], spec: ConfigBuilderContext['spec']) {
    super({ context, spec }, SNS_TOPIC_CONFIG_SCHEMA);
  }

  protected getHardcodedFallbacks(): Record<string, any> {
    return HARDENED_FALLBACKS;
  }

  public buildSync(): SnsTopicConfig {
    const resolved = super.buildSync() as Partial<SnsTopicConfig>;
    return this.normaliseConfig(resolved);
  }

  public getSchema(): ComponentConfigSchema {
    return SNS_TOPIC_CONFIG_SCHEMA;
  }

  private normaliseConfig(config: Partial<SnsTopicConfig>): SnsTopicConfig {
    return {
      topicName: config.topicName,
      displayName: config.displayName,
      fifo: {
        enabled: config.fifo?.enabled ?? false,
        contentBasedDeduplication: config.fifo?.contentBasedDeduplication ?? false
      },
      encryption: this.normaliseEncryption(config.encryption),
      deliveryPolicy: config.deliveryPolicy,
      messageFilterPolicy: config.messageFilterPolicy,
      tracing: config.tracing ?? 'PassThrough',
      policies: (config.policies ?? []).map(statement => ({
        sid: statement.sid,
        effect: statement.effect ?? 'allow',
        principals: statement.principals ?? [],
        actions: statement.actions,
        resources: statement.resources,
        conditions: statement.conditions
      })),
      monitoring: this.normaliseMonitoring(config.monitoring),
      tags: config.tags ?? {}
    };
  }

  private normaliseEncryption(encryption?: Partial<EncryptionConfig>): EncryptionConfig {
    const enabled = encryption?.enabled ?? false;
    const create = encryption?.customerManagedKey?.create ?? false;
    if (enabled && !create && !encryption?.kmsKeyArn) {
      throw new Error('sns-topic encryption requires either `encryption.kmsKeyArn` or `encryption.customerManagedKey.create` set to true.');
    }
    return {
      enabled,
      kmsKeyArn: encryption?.kmsKeyArn,
      customerManagedKey: {
        create,
        alias: encryption?.customerManagedKey?.alias,
        enableRotation: encryption?.customerManagedKey?.enableRotation ?? true
      }
    };
  }

  private normaliseMonitoring(monitoring?: Partial<MonitoringConfig>): MonitoringConfig {
    const baseline = HARDENED_FALLBACKS.monitoring!;
    const alarms = monitoring?.alarms ?? baseline.alarms;
    return {
      enabled: monitoring?.enabled ?? baseline.enabled ?? false,
      alarms: {
        failedNotifications: this.normaliseAlarm(alarms?.failedNotifications, {
          ...ALARM_BASELINE,
          threshold: 1
        }),
        messageRate: this.normaliseAlarm(alarms?.messageRate, {
          ...ALARM_BASELINE,
          threshold: 10000
        })
      }
    };
  }

  private normaliseAlarm(config: Partial<AlarmConfig> | undefined, defaults: AlarmConfig): AlarmConfig {
    return {
      enabled: config?.enabled ?? defaults.enabled ?? false,
      threshold: config?.threshold ?? defaults.threshold,
      evaluationPeriods: config?.evaluationPeriods ?? defaults.evaluationPeriods,
      periodMinutes: config?.periodMinutes ?? defaults.periodMinutes,
      comparisonOperator: config?.comparisonOperator ?? defaults.comparisonOperator,
      treatMissingData: config?.treatMissingData ?? defaults.treatMissingData,
      statistic: config?.statistic ?? defaults.statistic
    };
  }
}
