import {
  ConfigBuilder,
  ConfigBuilderContext,
  ComponentConfigSchema
} from '@shinobi/core';
import { ComponentContext, ComponentSpec } from '@shinobi/core';
import configSchema from './Config.schema.json' with { type: 'json' };

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
    putRecordSuccessRate?: KinesisStreamAlarmConfig;
    getRecordsSuccessRate?: KinesisStreamAlarmConfig;
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
  /** High-risk environment flag (set via platform config or service.yml) */
  highRiskEnvironment?: boolean;
}

export const KINESIS_STREAM_CONFIG_SCHEMA: ComponentConfigSchema = configSchema as ComponentConfigSchema;

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

  /**
   * Layer 2: Compliance Framework Defaults
   * 
   * Provides sensible defaults based on risk assessment flags rather than framework checks.
   * High-risk environment defaults can be set via:
   * - Platform config files (`/config/{framework}.yml`) setting `highRiskEnvironment: true`
   * - Service-level configuration in `service.yml`
   * - Environment defaults
   * 
   * This ensures configuration is data-driven and risk-based, not framework-dependent.
   */
  protected getComplianceFrameworkDefaults(): Partial<KinesisStreamConfig> {
    // Check if highRiskEnvironment flag is set in component config or platform config
    const componentConfig = this.builderContext.spec.config as Partial<KinesisStreamConfig> | undefined;
    let isHighRisk = componentConfig?.highRiskEnvironment ?? false;
    
    // Also check platform config if available (loaded by base class)
    try {
      const platformConfig = (this as any)._loadPlatformConfiguration();
      if (platformConfig?.highRiskEnvironment) {
        isHighRisk = true;
      }
    } catch {
      // Platform config might not be available in tests, ignore
    }
    
    if (isHighRisk) {
      // Apply enhanced security defaults for high-risk environments
      // These defaults align with FedRAMP Moderate/High requirements when highRiskEnvironment is set
      return {
        encryption: {
          type: 'kms',
          customerManagedKey: {
            create: true,
            enableRotation: true
          }
        },
        monitoring: {
          enabled: true,
          enhancedMetrics: true
        }
      };
    }
    
    return {}; // Standard/default environment - use hardcoded fallbacks
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
          }),
          putRecordSuccessRate: this.normaliseAlarmConfig(config.monitoring?.alarms?.putRecordSuccessRate, {
            enabled: config.monitoring?.enabled ?? false,
            threshold: 100, // Minimum success rate threshold (can be configured)
            evaluationPeriods: 2,
            periodMinutes: 5,
            comparisonOperator: 'lt', // Alert if success rate drops below threshold
            treatMissingData: 'not-breaching',
            statistic: 'Sum'
          }),
          getRecordsSuccessRate: this.normaliseAlarmConfig(config.monitoring?.alarms?.getRecordsSuccessRate, {
            enabled: config.monitoring?.enabled ?? false,
            threshold: 100, // Minimum success rate threshold (can be configured)
            evaluationPeriods: 2,
            periodMinutes: 5,
            comparisonOperator: 'lt', // Alert if success rate drops below threshold
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
