import {
  ConfigBuilder,
  ConfigBuilderContext,
  ComponentConfigSchema
} from '@shinobi/core';

export type RuleState = 'enabled' | 'disabled';
export type RemovalPolicyOption = 'retain' | 'destroy';
export type AlarmComparisonOperator = 'gt' | 'gte' | 'lt' | 'lte';
export type AlarmTreatMissingData = 'breaching' | 'not-breaching' | 'ignore' | 'missing';

export interface AlarmConfig {
  enabled: boolean;
  threshold: number;
  evaluationPeriods: number;
  periodMinutes: number;
  comparisonOperator: AlarmComparisonOperator;
  treatMissingData: AlarmTreatMissingData;
  statistic: 'Average' | 'Sum' | 'Minimum' | 'Maximum';
}

export interface CloudWatchLogsConfig {
  enabled: boolean;
  logGroupName?: string;
  retentionDays: number;
  removalPolicy: RemovalPolicyOption;
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

export interface RuleInputConfig {
  type: 'constant' | 'path' | 'transformer';
  value?: string;
  path?: string;
  transformer?: {
    inputPathsMap?: Record<string, string>;
    inputTemplate: string;
  };
}

export interface EventBridgeRulePatternConfig {
  ruleName: string;
  description: string;
  state: RuleState;
  eventPattern: Record<string, any>;
  eventBus?: EventBusConfig;
  input?: RuleInputConfig;
  deadLetterQueue: DeadLetterQueueConfig;
  monitoring: {
    enabled: boolean;
    failedInvocations: AlarmConfig;
    invocations: AlarmConfig;
    matchedEvents: AlarmConfig;
    deadLetterQueueMessages: AlarmConfig;
    cloudWatchLogs: CloudWatchLogsConfig;
  };
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
    statistic: { type: 'string', enum: ['Average', 'Sum', 'Minimum', 'Maximum'] }
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

const DEAD_LETTER_QUEUE_SCHEMA: ComponentConfigSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    enabled: { type: 'boolean' },
    maxRetryAttempts: { type: 'number', minimum: 0, maximum: 185 },
    retentionDays: { type: 'number', minimum: 1, maximum: 14 }
  }
};

const INPUT_SCHEMA: ComponentConfigSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    type: { type: 'string', enum: ['constant', 'path', 'transformer'] },
    value: { type: 'string' },
    path: { type: 'string' },
    transformer: {
      type: 'object',
      additionalProperties: false,
      properties: {
        inputPathsMap: {
          type: 'object',
          additionalProperties: { type: 'string' }
        },
        inputTemplate: { type: 'string' }
      }
    }
  }
};

export const EVENTBRIDGE_RULE_PATTERN_CONFIG_SCHEMA: ComponentConfigSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['eventPattern'],
  properties: {
    ruleName: { type: 'string' },
    description: { type: 'string' },
    state: { type: 'string', enum: ['enabled', 'disabled'] },
    eventPattern: { type: 'object' },
    eventBus: {
      type: 'object',
      additionalProperties: false,
      properties: {
        name: { type: 'string' },
        arn: { type: 'string' }
      }
    },
    input: INPUT_SCHEMA,
    deadLetterQueue: DEAD_LETTER_QUEUE_SCHEMA,
    monitoring: {
      type: 'object',
      additionalProperties: false,
      properties: {
        enabled: { type: 'boolean' },
        failedInvocations: ALARM_SCHEMA,
        invocations: ALARM_SCHEMA,
        matchedEvents: ALARM_SCHEMA,
        deadLetterQueueMessages: ALARM_SCHEMA,
        cloudWatchLogs: CLOUDWATCH_LOGS_SCHEMA
      }
    },
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

const HARDENED_FALLBACKS: Partial<EventBridgeRulePatternConfig> = {
  description: undefined,
  state: 'enabled',
  deadLetterQueue: {
    enabled: false,
    maxRetryAttempts: 3,
    retentionDays: 14
  },
  monitoring: {
    enabled: false,
    failedInvocations: ALARM_BASELINE,
    invocations: { ...ALARM_BASELINE, comparisonOperator: 'lte', treatMissingData: 'breaching' },
    matchedEvents: { ...ALARM_BASELINE, comparisonOperator: 'lte', treatMissingData: 'breaching' },
    deadLetterQueueMessages: { ...ALARM_BASELINE },
    cloudWatchLogs: {
      enabled: false,
      retentionDays: 30,
      removalPolicy: 'destroy'
    }
  },
  tags: {}
};

export class EventBridgeRulePatternComponentConfigBuilder extends ConfigBuilder<EventBridgeRulePatternConfig> {
  constructor(context: ConfigBuilderContext['context'], spec: ConfigBuilderContext['spec']) {
    super({ context, spec }, EVENTBRIDGE_RULE_PATTERN_CONFIG_SCHEMA);
  }

  protected getHardcodedFallbacks(): Record<string, any> {
    return HARDENED_FALLBACKS;
  }

  public buildSync(): EventBridgeRulePatternConfig {
    const resolved = super.buildSync() as Partial<EventBridgeRulePatternConfig>;
    if (!resolved.eventPattern || Object.keys(resolved.eventPattern).length === 0) {
      throw new Error('eventbridge-rule-pattern requires `eventPattern` to be specified.');
    }
    return this.normaliseConfig(resolved);
  }

  public getSchema(): ComponentConfigSchema {
    return EVENTBRIDGE_RULE_PATTERN_CONFIG_SCHEMA;
  }

  private normaliseConfig(config: Partial<EventBridgeRulePatternConfig>): EventBridgeRulePatternConfig {
    const ruleName = this.sanitiseRuleName(config.ruleName);
    const monitoring = config.monitoring ?? HARDENED_FALLBACKS.monitoring!;

    return {
      ruleName,
      description: config.description ?? `EventBridge rule pattern for ${this.builderContext.spec.name}`,
      state: (config.state ?? 'enabled') as RuleState,
      eventPattern: config.eventPattern!,
      eventBus: config.eventBus,
      input: this.normaliseInput(config.input),
      deadLetterQueue: this.normaliseDeadLetterQueue(config.deadLetterQueue),
      monitoring: {
        enabled: monitoring.enabled ?? false,
        failedInvocations: this.normaliseAlarm(monitoring.failedInvocations, ALARM_BASELINE, 5, 'gte'),
        invocations: this.normaliseAlarm(monitoring.invocations, { ...ALARM_BASELINE, comparisonOperator: 'lte', treatMissingData: 'breaching' }, 0, 'lte'),
        matchedEvents: this.normaliseAlarm(monitoring.matchedEvents, { ...ALARM_BASELINE, comparisonOperator: 'lte', treatMissingData: 'breaching' }, 0, 'lte'),
        deadLetterQueueMessages: this.normaliseAlarm(monitoring.deadLetterQueueMessages, ALARM_BASELINE, 1, 'gte'),
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
      transformer: input.transformer ? {
        inputPathsMap: input.transformer.inputPathsMap,
        inputTemplate: input.transformer.inputTemplate
      } : undefined
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
      retentionDays: config?.retentionDays ?? defaults.retentionDays ?? 30,
      removalPolicy: config?.removalPolicy ?? defaults.removalPolicy ?? 'destroy'
    };
  }

  private normaliseAlarm(
    config: Partial<AlarmConfig> | undefined,
    baseline: AlarmConfig,
    defaultThreshold: number,
    defaultComparison: AlarmComparisonOperator
  ): AlarmConfig {
    return {
      enabled: config?.enabled ?? baseline.enabled ?? false,
      threshold: config?.threshold ?? defaultThreshold,
      evaluationPeriods: config?.evaluationPeriods ?? baseline.evaluationPeriods,
      periodMinutes: config?.periodMinutes ?? baseline.periodMinutes,
      comparisonOperator: config?.comparisonOperator ?? defaultComparison,
      treatMissingData: config?.treatMissingData ?? baseline.treatMissingData,
      statistic: config?.statistic ?? baseline.statistic
    };
  }
}
