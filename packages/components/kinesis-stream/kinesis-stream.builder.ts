import {
  ConfigBuilder,
  ConfigBuilderContext,
  ComponentConfigSchema
} from '@shinobi/core';
import { ComponentContext, ComponentSpec } from '@platform/contracts';

export type KinesisStreamMode = 'provisioned' | 'on-demand';
export type KinesisEncryptionType = 'none' | 'aws-managed' | 'kms';

export interface KinesisStreamCustomerManagedKeyConfig {
  create?: boolean;
  alias?: string;
  enableRotation?: boolean;
}

export interface KinesisStreamEncryptionConfig {
  type?: KinesisEncryptionType;
  kmsKeyArn?: string;
  customerManagedKey?: KinesisStreamCustomerManagedKeyConfig;
}

export interface KinesisStreamAlarmConfig {
  enabled?: boolean;
  threshold?: number;
  evaluationPeriods?: number;
  periodMinutes?: number;
  comparisonOperator?: 'gt' | 'gte' | 'lt' | 'lte';
  treatMissingData?: 'breaching' | 'not-breaching' | 'ignore' | 'missing';
  statistic?: string;
  tags?: Record<string, string>;
}

export interface KinesisStreamMonitoringConfig {
  enabled?: boolean;
  enhancedMetrics?: boolean;
  alarms?: {
    iteratorAgeMs?: KinesisStreamAlarmConfig;
    readProvisionedExceeded?: KinesisStreamAlarmConfig;
    writeProvisionedExceeded?: KinesisStreamAlarmConfig;
  };
}

export interface KinesisStreamConfig {
  streamName: string;
  streamMode: KinesisStreamMode;
  shardCount?: number;
  retentionHours: number;
  encryption: KinesisStreamEncryptionConfig;
  monitoring: KinesisStreamMonitoringConfig;
  hardeningProfile: string;
  tags: Record<string, string>;
}

const ALARM_DEFINITION = {
  type: 'object',
  additionalProperties: false,
  properties: {
    enabled: { type: 'boolean', default: false },
    threshold: { type: 'number' },
    evaluationPeriods: { type: 'number', minimum: 1, default: 2 },
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
  }
};

export const KINESIS_STREAM_CONFIG_SCHEMA: ComponentConfigSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    streamName: {
      type: 'string',
      pattern: '^[a-zA-Z0-9_.-]+$'
    },
    streamMode: {
      type: 'string',
      enum: ['provisioned', 'on-demand'],
      default: 'provisioned'
    },
    shardCount: {
      type: 'number',
      minimum: 1,
      maximum: 500000
    },
    retentionHours: {
      type: 'number',
      minimum: 24,
      maximum: 8760,
      default: 24
    },
    encryption: {
      type: 'object',
      additionalProperties: false,
      properties: {
        type: {
          type: 'string',
          enum: ['none', 'aws-managed', 'kms'],
          default: 'none'
        },
        kmsKeyArn: { type: 'string' },
        customerManagedKey: {
          type: 'object',
          additionalProperties: false,
          properties: {
            create: { type: 'boolean', default: false },
            alias: { type: 'string' },
            enableRotation: { type: 'boolean', default: true }
          }
        }
      },
      default: {
        type: 'none'
      }
    },
    monitoring: {
      type: 'object',
      additionalProperties: false,
      properties: {
        enabled: { type: 'boolean', default: false },
        enhancedMetrics: { type: 'boolean', default: false },
        alarms: {
          type: 'object',
          additionalProperties: false,
          properties: {
            iteratorAgeMs: ALARM_DEFINITION,
            readProvisionedExceeded: ALARM_DEFINITION,
            writeProvisionedExceeded: ALARM_DEFINITION
          },
          default: {}
        }
      },
      default: {}
    },
    hardeningProfile: {
      type: 'string',
      description: 'Abstract security posture indicator used by downstream services'
    },
    tags: {
      type: 'object',
      additionalProperties: { type: 'string' },
      default: {}
    }
  }
};

export class KinesisStreamComponentConfigBuilder extends ConfigBuilder<KinesisStreamConfig> {
  constructor(context: ComponentContext, spec: ComponentSpec) {
    const builderContext: ConfigBuilderContext = { context, spec };
    super(builderContext, KINESIS_STREAM_CONFIG_SCHEMA);
  }

  protected getHardcodedFallbacks(): Partial<KinesisStreamConfig> {
    return {
      streamMode: 'provisioned',
      shardCount: 1,
      retentionHours: 24,
      encryption: {
        type: 'none'
      },
      monitoring: {
        enabled: false,
        enhancedMetrics: false,
        alarms: {}
      },
      hardeningProfile: 'baseline',
      tags: {}
    };
  }

  public buildSync(): KinesisStreamConfig {
    const resolved = super.buildSync() as KinesisStreamConfig;
    return this.normaliseConfig(resolved);
  }

  private normaliseAlarmConfig(
    alarm: KinesisStreamAlarmConfig | undefined,
    defaults: Required<Omit<KinesisStreamAlarmConfig, 'tags'>>
  ): KinesisStreamAlarmConfig {
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

  private normaliseConfig(config: KinesisStreamConfig): KinesisStreamConfig {
    const specName = this.builderContext.spec.name;

    const sanitisedName = (config.streamName ?? specName)
      .replace(/[^a-zA-Z0-9_.-]/g, '-')
      .substring(0, 128);

    const streamMode = config.streamMode ?? 'provisioned';
    const shardCount = streamMode === 'on-demand' ? undefined : Math.max(1, config.shardCount ?? 1);

    return {
      streamName: sanitisedName,
      streamMode,
      shardCount,
      retentionHours: config.retentionHours ?? 24,
      encryption: {
        type: config.encryption?.type ?? 'none',
        kmsKeyArn: config.encryption?.kmsKeyArn,
        customerManagedKey: {
          create: config.encryption?.customerManagedKey?.create ?? false,
          alias: config.encryption?.customerManagedKey?.alias,
          enableRotation: config.encryption?.customerManagedKey?.enableRotation ?? true
        }
      },
      monitoring: {
        enabled: config.monitoring?.enabled ?? false,
        enhancedMetrics: config.monitoring?.enhancedMetrics ?? false,
        alarms: {
          iteratorAgeMs: this.normaliseAlarmConfig(config.monitoring?.alarms?.iteratorAgeMs, {
            enabled: config.monitoring?.enabled ?? false,
            threshold: 600000,
            evaluationPeriods: 2,
            periodMinutes: 5,
            comparisonOperator: 'gte',
            treatMissingData: 'not-breaching',
            statistic: 'Maximum'
          }),
          readProvisionedExceeded: this.normaliseAlarmConfig(config.monitoring?.alarms?.readProvisionedExceeded, {
            enabled: config.monitoring?.enabled ?? false,
            threshold: 1,
            evaluationPeriods: 1,
            periodMinutes: 5,
            comparisonOperator: 'gte',
            treatMissingData: 'not-breaching',
            statistic: 'Sum'
          }),
          writeProvisionedExceeded: this.normaliseAlarmConfig(config.monitoring?.alarms?.writeProvisionedExceeded, {
            enabled: config.monitoring?.enabled ?? false,
            threshold: 1,
            evaluationPeriods: 1,
            periodMinutes: 5,
            comparisonOperator: 'gte',
            treatMissingData: 'not-breaching',
            statistic: 'Sum'
          })
        }
      },
      hardeningProfile: config.hardeningProfile ?? 'baseline',
      tags: config.tags ?? {}
    };
  }
}
