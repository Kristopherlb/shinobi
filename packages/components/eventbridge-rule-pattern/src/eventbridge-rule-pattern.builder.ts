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
    kmsKeyId: { type: 'string' },
    retentionDays: {
      type: 'number',
      enum: [1, 3, 5, 7, 14, 30, 60, 90, 120, 150, 180, 365, 400, 545, 731, 1095, 1827, 2555, 3653]
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
  required: ['eventPattern', 'deadLetterQueue', 'monitoring'],
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

/**
 * Get compliance-aware defaults for log retention and removal policy
 */
function getComplianceLogDefaults(framework: string): { retentionDays: number; removalPolicy: RemovalPolicyOption } {
  switch (framework) {
    case 'fedramp-high':
      return {
        retentionDays: 3653, // 10 years (>=7 year FedRAMP High requirement)
        removalPolicy: 'retain'
      };
    case 'fedramp-moderate':
      return {
        retentionDays: 1827, // 5 years (>=3 year FedRAMP Moderate requirement)
        removalPolicy: 'retain'
      };
    case 'commercial':
    default:
      return {
        retentionDays: 365, // 1 year for commercial
        removalPolicy: 'retain'
      };
  }
}

/**
 * Compliance-aware fallback defaults
 * DLQ and monitoring are now mandatory (enabled: true)
 * Log retention and removal policies are compliance-aware
 */
function getHardenedFallbacks(framework: string): Partial<EventBridgeRulePatternConfig> {
  const logDefaults = getComplianceLogDefaults(framework);

  return {
    description: undefined,
    state: 'enabled',
    deadLetterQueue: {
      enabled: true, // MANDATORY for resilient event-driven design
      maxRetryAttempts: 3,
      retentionDays: 14
    },
    monitoring: {
      enabled: true, // MANDATORY per platform observability standard
      failedInvocations: { ...ALARM_BASELINE, enabled: true },
      invocations: { ...ALARM_BASELINE, comparisonOperator: 'lte', treatMissingData: 'breaching' },
      matchedEvents: { ...ALARM_BASELINE, comparisonOperator: 'lte', treatMissingData: 'breaching' },
      deadLetterQueueMessages: { ...ALARM_BASELINE, enabled: true },
      cloudWatchLogs: {
        enabled: true, // MANDATORY per platform logging standard
        retentionDays: logDefaults.retentionDays,
        removalPolicy: logDefaults.removalPolicy
      }
    },
    tags: {}
  };
}

export class EventBridgeRulePatternComponentConfigBuilder extends ConfigBuilder<EventBridgeRulePatternConfig> {
  constructor(context: ConfigBuilderContext['context'], spec: ConfigBuilderContext['spec']) {
    super({ context, spec }, EVENTBRIDGE_RULE_PATTERN_CONFIG_SCHEMA);
  }

  protected getHardcodedFallbacks(): Record<string, any> {
    const framework = this.builderContext.context.complianceFramework || 'commercial';
    return getHardenedFallbacks(framework);
  }

  public buildSync(): EventBridgeRulePatternConfig {
    const resolved = super.buildSync() as Partial<EventBridgeRulePatternConfig>;
    
    if (!resolved.eventPattern || Object.keys(resolved.eventPattern).length === 0) {
      throw new Error('eventbridge-rule-pattern requires `eventPattern` to be specified.');
    }

    // Validate mandatory fields
    if (!resolved.deadLetterQueue) {
      throw new Error('deadLetterQueue is required for eventbridge-rule-pattern components. Set { enabled: true } at minimum.');
    }

    if (!resolved.monitoring) {
      throw new Error('monitoring is required for eventbridge-rule-pattern components. Set { enabled: true, cloudWatchLogs: { enabled: true } } at minimum.');
    }

    // Enforce monitoring cannot be disabled
    if (resolved.monitoring.enabled === false) {
      throw new Error('Monitoring cannot be disabled per platform observability standard. Remove monitoring.enabled or set to true.');
    }

    // Enforce DLQ cannot be disabled
    if (resolved.deadLetterQueue.enabled === false) {
      throw new Error('Dead letter queue cannot be disabled for resilient event-driven design. Remove deadLetterQueue.enabled or set to true.');
    }

    return this.normaliseConfig(resolved);
  }

  public getSchema(): ComponentConfigSchema {
    return EVENTBRIDGE_RULE_PATTERN_CONFIG_SCHEMA;
  }

  private normaliseConfig(config: Partial<EventBridgeRulePatternConfig>): EventBridgeRulePatternConfig {
    const ruleName = this.sanitiseRuleName(config.ruleName);
    const framework = this.builderContext.context.complianceFramework || 'commercial';
    const hardenedFallbacks = getHardenedFallbacks(framework);
    const monitoring = config.monitoring ?? hardenedFallbacks.monitoring!;
    const defaultLogGroupName = this.buildManagedLogGroupName(ruleName);

    const failedInvocations = this.normaliseAlarm(monitoring.failedInvocations, { ...ALARM_BASELINE, enabled: true }, 5, 'gte');
    failedInvocations.enabled = monitoring.failedInvocations?.enabled ?? true;

    const invocations = this.normaliseAlarm(monitoring.invocations, { ...ALARM_BASELINE, comparisonOperator: 'lte', treatMissingData: 'breaching' }, 0, 'lte');
    invocations.enabled = monitoring.invocations?.enabled ?? false;

    const matchedEvents = this.normaliseAlarm(monitoring.matchedEvents, { ...ALARM_BASELINE, comparisonOperator: 'lte', treatMissingData: 'breaching' }, 0, 'lte');
    matchedEvents.enabled = monitoring.matchedEvents?.enabled ?? false;

    const dlqMessages = this.normaliseAlarm(monitoring.deadLetterQueueMessages, { ...ALARM_BASELINE, enabled: true }, 1, 'gte');
    dlqMessages.enabled = monitoring.deadLetterQueueMessages?.enabled ?? true;

    return {
      ruleName,
      description: config.description ?? `EventBridge rule pattern for ${this.builderContext.spec.name}`,
      state: (config.state ?? 'enabled') as RuleState,
      eventPattern: config.eventPattern!,
      eventBus: config.eventBus,
      input: this.normaliseInput(config.input),
      deadLetterQueue: this.normaliseDeadLetterQueue(config.deadLetterQueue, hardenedFallbacks),
      monitoring: {
        enabled: true, // Always true per platform standard
        failedInvocations,
        invocations,
        matchedEvents,
        deadLetterQueueMessages: dlqMessages,
        cloudWatchLogs: this.normaliseCloudWatchLogs(monitoring.cloudWatchLogs, framework, defaultLogGroupName)
      },
      tags: config.tags ?? {}
    };
  }

  private sanitiseRuleName(name?: string): string {
    const fallback = `${this.builderContext.context.serviceName}-${this.builderContext.spec.name}`;
    const candidate = name ?? fallback;
    // Sanitize to allow builder to handle any input
    return candidate.replace(/[^a-zA-Z0-9._-]/g, '-').slice(0, 64);
  }

  private normaliseInput(input?: Partial<RuleInputConfig>): RuleInputConfig | undefined {
    if (!input || !input.type) {
      return undefined;
    }

    if (input.type === 'transformer' && !input.transformer?.inputTemplate) {
      throw new Error('input.transformer.inputTemplate is required when input.type is "transformer".');
    }

    return {
      type: input.type as 'constant' | 'path' | 'transformer',
      value: input.value,
      path: input.path,
      transformer: input.transformer ? {
        inputPathsMap: input.transformer.inputPathsMap,
        inputTemplate: input.transformer.inputTemplate
      } : undefined
    };
  }

  private normaliseDeadLetterQueue(
    config: Partial<DeadLetterQueueConfig> | undefined,
    fallbacks: Partial<EventBridgeRulePatternConfig>
  ): DeadLetterQueueConfig {
    const defaults = fallbacks.deadLetterQueue!;
    return {
      enabled: true, // Always true - mandatory
      maxRetryAttempts: config?.maxRetryAttempts ?? defaults.maxRetryAttempts,
      retentionDays: config?.retentionDays ?? defaults.retentionDays
    };
  }

  private normaliseCloudWatchLogs(
    config: Partial<CloudWatchLogsConfig> | undefined,
    framework: string,
    defaultLogGroupName: string
  ): CloudWatchLogsConfig {
    const defaults = getComplianceLogDefaults(framework);
    return {
      enabled: true, // Always true - mandatory
      logGroupName: config?.logGroupName ?? defaultLogGroupName,
      retentionDays: config?.retentionDays ?? defaults.retentionDays,
      removalPolicy: config?.removalPolicy ?? defaults.removalPolicy
    };
  }

  private buildManagedLogGroupName(ruleName: string): string {
    const service = this.sanitiseSegment(this.builderContext.context.serviceName ?? 'service');
    const component = this.sanitiseSegment(this.builderContext.spec.name ?? 'rule');
    return `/aws/platform/events/${service}-${component}-${ruleName}`.slice(0, 256);
  }

  private sanitiseSegment(value: string): string {
    return value.replace(/[^a-zA-Z0-9._-]/g, '-');
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
