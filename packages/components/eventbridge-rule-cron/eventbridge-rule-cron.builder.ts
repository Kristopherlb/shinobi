import {
  ConfigBuilder,
  ConfigBuilderContext,
  ComponentConfigSchema
} from '@shinobi/core';

export type RemovalPolicyOption = 'retain' | 'destroy';
export type AlarmComparisonOperator = 'gt' | 'gte' | 'lt' | 'lte';
export type AlarmTreatMissingData = 'breaching' | 'not-breaching' | 'ignore' | 'missing';
export type RuleState = 'enabled' | 'disabled';
export type RuleInputType = 'constant' | 'path' | 'transformer';

export interface AlarmConfig {
  enabled: boolean;
  threshold: number;
  evaluationPeriods: number;
  periodMinutes: number;
  comparisonOperator: AlarmComparisonOperator;
  treatMissingData: AlarmTreatMissingData;
  statistic: 'Sum' | 'Average' | 'Minimum' | 'Maximum';
}

export interface CloudWatchLogsConfig {
  enabled: boolean;
  logGroupName?: string;
  retentionDays: number;
  removalPolicy: RemovalPolicyOption;
}

export interface MonitoringConfig {
  enabled: boolean;
  alarms: {
    failedInvocations: AlarmConfig;
    invocationRate: AlarmConfig;
  };
  cloudWatchLogs: CloudWatchLogsConfig;
}

export interface DeadLetterQueueConfig {
  enabled: boolean;
  maxRetryAttempts: number;
  retentionDays: number;
}

export interface EventBusConfig {
  name?: string;
  arn?: string;
}

export interface RuleInputTransformerConfig {
  inputPathsMap?: Record<string, string>;
  inputTemplate: string;
}

export interface RuleInputConfig {
  type: RuleInputType;
  value?: string;
  path?: string;
  transformer?: RuleInputTransformerConfig;
}

export interface EventBridgeRuleCronConfig {
  ruleName: string;
  schedule: string;
  description?: string;
  eventBus?: EventBusConfig;
  state: RuleState;
  input?: RuleInputConfig;
  deadLetterQueue: DeadLetterQueueConfig;
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

const CLOUDWATCH_LOGS_SCHEMA: ComponentConfigSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    enabled: { type: 'boolean' },
    logGroupName: { type: 'string' },
    retentionDays: {
      type: 'number',
      enum: [1, 3, 5, 7, 14, 30, 60, 90, 120, 150, 180, 365, 400, 545, 731, 1827, 3653]
    },
    removalPolicy: { type: 'string', enum: ['retain', 'destroy'] }
  }
};

const MONITORING_SCHEMA: ComponentConfigSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    enabled: { type: 'boolean' },
    alarms: {
      type: 'object',
      additionalProperties: false,
      properties: {
        failedInvocations: ALARM_SCHEMA,
        invocationRate: ALARM_SCHEMA
      }
    },
    cloudWatchLogs: CLOUDWATCH_LOGS_SCHEMA
  }
};

const DEAD_LETTER_QUEUE_SCHEMA: ComponentConfigSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    enabled: { type: 'boolean' },
    maxRetryAttempts: { type: 'number', minimum: 0, maximum: 185 },
    retentionDays: { type: 'number', minimum: 1, maximum: 14 }
  }
};

const INPUT_TRANSFORMER_SCHEMA: ComponentConfigSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    inputPathsMap: {
      type: 'object',
      additionalProperties: { type: 'string' }
    },
    inputTemplate: { type: 'string' }
  },
  required: ['inputTemplate']
};

const INPUT_SCHEMA: ComponentConfigSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    type: { type: 'string', enum: ['constant', 'path', 'transformer'] },
    value: { type: 'string' },
    path: { type: 'string' },
    transformer: INPUT_TRANSFORMER_SCHEMA
  }
};

export const EVENTBRIDGE_RULE_CRON_CONFIG_SCHEMA: ComponentConfigSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['schedule'],
  properties: {
    ruleName: { type: 'string' },
    schedule: { type: 'string' },
    description: { type: 'string' },
    eventBus: {
      type: 'object',
      additionalProperties: false,
      properties: {
        name: { type: 'string' },
        arn: { type: 'string' }
      }
    },
    state: { type: 'string', enum: ['enabled', 'disabled'] },
    input: INPUT_SCHEMA,
    deadLetterQueue: DEAD_LETTER_QUEUE_SCHEMA,
    monitoring: MONITORING_SCHEMA,
    tags: {
      type: 'object',
      additionalProperties: { type: 'string' }
    }
  }
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

const HARDENED_FALLBACKS: Partial<EventBridgeRuleCronConfig> = {
  state: 'enabled',
  deadLetterQueue: {
    enabled: false,
    maxRetryAttempts: 3,
    retentionDays: 14
  },
  monitoring: {
    enabled: false,
    alarms: {
      failedInvocations: { ...ALARM_BASELINE, threshold: 1 },
      invocationRate: { ...ALARM_BASELINE, threshold: 1000 }
    },
    cloudWatchLogs: {
      enabled: false,
      retentionDays: 14,
      removalPolicy: 'destroy'
    }
  },
  tags: {}
};

export class EventBridgeRuleCronComponentConfigBuilder extends ConfigBuilder<EventBridgeRuleCronConfig> {
  constructor(context: ConfigBuilderContext['context'], spec: ConfigBuilderContext['spec']) {
    super({ context, spec }, EVENTBRIDGE_RULE_CRON_CONFIG_SCHEMA);
  }

  protected getHardcodedFallbacks(): Record<string, any> {
    return HARDENED_FALLBACKS;
  }

  public buildSync(): EventBridgeRuleCronConfig {
    const resolved = super.buildSync() as Partial<EventBridgeRuleCronConfig>;
    if (!resolved.schedule) {
      throw new Error('eventbridge-rule-cron requires `schedule` to be specified.');
    }
    return this.normaliseConfig(resolved);
  }

  public getSchema(): ComponentConfigSchema {
    return EVENTBRIDGE_RULE_CRON_CONFIG_SCHEMA;
  }

  private normaliseConfig(config: Partial<EventBridgeRuleCronConfig>): EventBridgeRuleCronConfig {
    const monitoring = config.monitoring ?? HARDENED_FALLBACKS.monitoring!;

    return {
      ruleName: this.sanitiseRuleName(config.ruleName),
      schedule: config.schedule!,
      description: config.description,
      eventBus: config.eventBus,
      state: (config.state ?? 'enabled') as RuleState,
      input: this.normaliseInput(config.input),
      deadLetterQueue: this.normaliseDeadLetterQueue(config.deadLetterQueue),
      monitoring: {
        enabled: monitoring.enabled ?? false,
        alarms: {
          failedInvocations: this.normaliseAlarm(monitoring.alarms?.failedInvocations, {
            ...ALARM_BASELINE,
            threshold: 1
          }),
          invocationRate: this.normaliseAlarm(monitoring.alarms?.invocationRate, {
            ...ALARM_BASELINE,
            threshold: 1000
          })
        },
        cloudWatchLogs: this.normaliseCloudWatchLogs(monitoring.cloudWatchLogs)
      },
      tags: config.tags ?? {}
    };
  }

  private sanitiseRuleName(name?: string): string {
    const fallback = `${this.builderContext.context.serviceName}-${this.builderContext.spec.name}`;
    const candidate = name ?? fallback;
    return candidate.replace(/[^a-zA-Z0-9._-]/g, '-').slice(0, 64);
  }

  private normaliseInput(input?: Partial<RuleInputConfig>): RuleInputConfig | undefined {
    if (!input) {
      return undefined;
    }

    if (input.type === 'transformer' && !input.transformer?.inputTemplate) {
      throw new Error('input.transformer.inputTemplate is required when input.type is "transformer".');
    }

    return {
      type: input.type,
      value: input.value,
      path: input.path,
      transformer: input.transformer
        ? {
            inputPathsMap: input.transformer.inputPathsMap,
            inputTemplate: input.transformer.inputTemplate
          }
        : undefined
    };
  }

  private normaliseDeadLetterQueue(config?: Partial<DeadLetterQueueConfig>): DeadLetterQueueConfig {
    return {
      enabled: config?.enabled ?? false,
      maxRetryAttempts: config?.maxRetryAttempts ?? 3,
      retentionDays: config?.retentionDays ?? 14
    };
  }

  private normaliseCloudWatchLogs(config?: Partial<CloudWatchLogsConfig>): CloudWatchLogsConfig {
    const defaults = HARDENED_FALLBACKS.monitoring!.cloudWatchLogs!;
    return {
      enabled: config?.enabled ?? defaults.enabled ?? false,
      logGroupName: config?.logGroupName,
      retentionDays: config?.retentionDays ?? defaults.retentionDays ?? 14,
      removalPolicy: config?.removalPolicy ?? defaults.removalPolicy ?? 'destroy'
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
