/**
 * Configuration Builder for Lambda Worker Component
 *
 * Provides the standard 5-layer precedence chain backed by the shared
 * ConfigBuilder implementation. All compliance defaults live in
 * /config/<framework>.yml – this builder simply coalesces the resolved
 * configuration and applies normalisation.
 */

import {
  ConfigBuilder,
  ConfigBuilderContext,
  ComponentConfigSchema
} from '@shinobi/core';
import { ComponentContext, ComponentSpec } from '@platform/contracts';

export type LambdaRuntime = 'nodejs18.x' | 'nodejs20.x' | 'python3.9' | 'python3.10' | 'python3.11';
export type LambdaArchitecture = 'x86_64' | 'arm64';
export type LambdaTracingMode = 'Active' | 'PassThrough';
export type LambdaLogFormat = 'TEXT' | 'JSON';
export type LambdaEventSourceType = 'sqs' | 'eventBridge' | 'eventBridgePattern';
export type LambdaAlarmComparisonOperator = 'gt' | 'gte' | 'lt' | 'lte';
export type LambdaTreatMissingData = 'breaching' | 'not-breaching' | 'ignore' | 'missing';

export interface LambdaSqsEventSourceConfig {
  type: 'sqs';
  queueArn: string;
  batchSize?: number;
  enabled?: boolean;
  maximumBatchingWindowSeconds?: number;
  scalingConfig?: {
    maximumConcurrency?: number;
  };
}

export interface LambdaEventBridgeRuleConfig {
  type: 'eventBridge';
  scheduleExpression: string;
  input?: Record<string, any>;
  enabled?: boolean;
}

export interface LambdaEventBridgePatternConfig {
  type: 'eventBridgePattern';
  eventBusArn?: string;
  pattern: Record<string, any>;
  input?: Record<string, any>;
  enabled?: boolean;
}

export type LambdaEventSource =
  | LambdaSqsEventSourceConfig
  | LambdaEventBridgeRuleConfig
  | LambdaEventBridgePatternConfig;

export interface LambdaAlarmConfig {
  enabled?: boolean;
  threshold?: number;
  evaluationPeriods?: number;
  periodMinutes?: number;
  comparisonOperator?: LambdaAlarmComparisonOperator;
  treatMissingData?: LambdaTreatMissingData;
  statistic?: string;
  tags?: Record<string, string>;
}

export interface LambdaMonitoringConfig {
  enabled?: boolean;
  alarms?: {
    errors?: LambdaAlarmConfig;
    throttles?: LambdaAlarmConfig;
    duration?: LambdaAlarmConfig;
  };
}

export interface LambdaWorkerConfig {
  functionName: string;
  handler: string;
  runtime: LambdaRuntime;
  architecture: LambdaArchitecture;
  memorySize: number;
  timeoutSeconds: number;
  description?: string;
  codePath: string;
  environment: Record<string, string>;
  reservedConcurrency?: number;
  deadLetterQueue?: {
    enabled: boolean;
    queueArn?: string;
    maxReceiveCount: number;
  };
  eventSources: LambdaEventSource[];
  vpc?: {
    enabled: boolean;
    vpcId?: string;
    subnetIds: string[];
    securityGroupIds: string[];
  };
  kmsKeyArn?: string;
  logging: {
    logRetentionDays: number;
    logFormat: LambdaLogFormat;
    systemLogLevel: 'INFO' | 'WARN' | 'ERROR';
    applicationLogLevel: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
  };
  tracing: {
    mode: LambdaTracingMode;
  };
  observability: {
    otelEnabled: boolean;
    otelLayerArn?: string;
    otelResourceAttributes: Record<string, string>;
  };
  securityTools: {
    falco: boolean;
  };
  monitoring: {
    enabled: boolean;
    alarms: {
      errors: LambdaAlarmConfig;
      throttles: LambdaAlarmConfig;
      duration: LambdaAlarmConfig;
    };
  };
  hardeningProfile: string;
  removalPolicy: 'retain' | 'destroy';
  tags: Record<string, string>;
}

const BASE_EVENT_SOURCE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    type: { type: 'string' }
  },
  required: ['type']
};

const SQS_EVENT_SOURCE_SCHEMA = {
  allOf: [
    BASE_EVENT_SOURCE_SCHEMA,
    {
      properties: {
        type: { const: 'sqs' },
        queueArn: { type: 'string' },
        batchSize: { type: 'number', minimum: 1, maximum: 1000 },
        enabled: { type: 'boolean', default: true },
        maximumBatchingWindowSeconds: { type: 'number', minimum: 0, maximum: 300 },
        scalingConfig: {
          type: 'object',
          additionalProperties: false,
          properties: {
            maximumConcurrency: { type: 'number', minimum: 1, maximum: 1000 }
          }
        }
      },
      required: ['queueArn']
    }
  ]
};

const EVENTBRIDGE_RULE_SCHEMA = {
  allOf: [
    BASE_EVENT_SOURCE_SCHEMA,
    {
      properties: {
        type: { const: 'eventBridge' },
        scheduleExpression: { type: 'string' },
        input: { type: 'object', default: {} },
        enabled: { type: 'boolean', default: true }
      },
      required: ['scheduleExpression']
    }
  ]
};

const EVENTBRIDGE_PATTERN_SCHEMA = {
  allOf: [
    BASE_EVENT_SOURCE_SCHEMA,
    {
      properties: {
        type: { const: 'eventBridgePattern' },
        eventBusArn: { type: 'string' },
        pattern: { type: 'object' },
        input: { type: 'object', default: {} },
        enabled: { type: 'boolean', default: true }
      },
      required: ['pattern']
    }
  ]
};

const ALARM_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    enabled: { type: 'boolean', default: false },
    threshold: { type: 'number' },
    evaluationPeriods: { type: 'number', minimum: 1, default: 1 },
    periodMinutes: { type: 'number', minimum: 1, default: 5 },
    comparisonOperator: { type: 'string', enum: ['gt', 'gte', 'lt', 'lte'], default: 'gt' },
    treatMissingData: { type: 'string', enum: ['breaching', 'not-breaching', 'ignore', 'missing'], default: 'not-breaching' },
    statistic: { type: 'string', default: 'Sum' },
    tags: { type: 'object', additionalProperties: { type: 'string' }, default: {} }
  }
};

export const LAMBDA_WORKER_CONFIG_SCHEMA: ComponentConfigSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['handler'],
  properties: {
    functionName: { type: 'string' },
    handler: { type: 'string' },
    runtime: { type: 'string', enum: ['nodejs18.x', 'nodejs20.x', 'python3.9', 'python3.10', 'python3.11'], default: 'nodejs20.x' },
    architecture: { type: 'string', enum: ['x86_64', 'arm64'], default: 'x86_64' },
    memorySize: { type: 'number', minimum: 128, maximum: 10240, default: 256 },
    timeoutSeconds: { type: 'number', minimum: 1, maximum: 900, default: 300 },
    description: { type: 'string' },
    codePath: { type: 'string', default: './src' },
    environment: {
      type: 'object',
      additionalProperties: { type: 'string' },
      default: {}
    },
    reservedConcurrency: { type: 'number', minimum: 0, maximum: 1000 },
    deadLetterQueue: {
      type: 'object',
      additionalProperties: false,
      properties: {
        enabled: { type: 'boolean', default: false },
        queueArn: { type: 'string' },
        maxReceiveCount: { type: 'number', minimum: 1, maximum: 1000, default: 3 }
      }
    },
    eventSources: {
      type: 'array',
      items: {
        anyOf: [SQS_EVENT_SOURCE_SCHEMA, EVENTBRIDGE_RULE_SCHEMA, EVENTBRIDGE_PATTERN_SCHEMA]
      },
      default: []
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
        }
      },
      default: {
        enabled: false,
        subnetIds: [],
        securityGroupIds: []
      }
    },
    kmsKeyArn: { type: 'string' },
    logging: {
      type: 'object',
      additionalProperties: false,
      properties: {
        logRetentionDays: { type: 'number', minimum: 1, default: 30 },
        logFormat: { type: 'string', enum: ['TEXT', 'JSON'], default: 'JSON' },
        systemLogLevel: { type: 'string', enum: ['INFO', 'WARN', 'ERROR'], default: 'INFO' },
        applicationLogLevel: { type: 'string', enum: ['DEBUG', 'INFO', 'WARN', 'ERROR'], default: 'INFO' }
      }
    },
    tracing: {
      type: 'object',
      additionalProperties: false,
      properties: {
        mode: { type: 'string', enum: ['Active', 'PassThrough'], default: 'PassThrough' }
      },
      default: {
        mode: 'PassThrough'
      }
    },
    observability: {
      type: 'object',
      additionalProperties: false,
      properties: {
        otelEnabled: { type: 'boolean', default: false },
        otelLayerArn: { type: 'string' },
        otelResourceAttributes: { type: 'object', additionalProperties: { type: 'string' }, default: {} }
      },
      default: {
        otelEnabled: false,
        otelResourceAttributes: {}
      }
    },
    securityTools: {
      type: 'object',
      additionalProperties: false,
      properties: {
        falco: { type: 'boolean', default: false }
      },
      default: {
        falco: false
      }
    },
    monitoring: {
      type: 'object',
      additionalProperties: false,
      properties: {
        enabled: { type: 'boolean', default: false },
        alarms: {
          type: 'object',
          additionalProperties: false,
          properties: {
            errors: ALARM_SCHEMA,
            throttles: ALARM_SCHEMA,
            duration: ALARM_SCHEMA
          }
        }
      },
      default: {
        enabled: false,
        alarms: {}
      }
    },
    hardeningProfile: { type: 'string' },
    removalPolicy: { type: 'string', enum: ['retain', 'destroy'], default: 'retain' },
    tags: { type: 'object', additionalProperties: { type: 'string' }, default: {} }
  }
};

const DEFAULT_ALARM_BASELINE: Required<Omit<LambdaAlarmConfig, 'tags'>> = {
  enabled: false,
  threshold: 1,
  evaluationPeriods: 1,
  periodMinutes: 5,
  comparisonOperator: 'gt',
  treatMissingData: 'not-breaching',
  statistic: 'Sum'
};

export class LambdaWorkerComponentConfigBuilder extends ConfigBuilder<LambdaWorkerConfig> {
  constructor(context: ComponentContext, spec: ComponentSpec) {
    const builderContext: ConfigBuilderContext = { context, spec };
    super(builderContext, LAMBDA_WORKER_CONFIG_SCHEMA);
  }

  protected getHardcodedFallbacks(): Partial<LambdaWorkerConfig> {
    return {
      runtime: 'nodejs20.x',
      architecture: 'x86_64',
      memorySize: 256,
      timeoutSeconds: 300,
      codePath: './src',
      environment: {},
      eventSources: [],
      logging: {
        logRetentionDays: 30,
        logFormat: 'JSON',
        systemLogLevel: 'INFO',
        applicationLogLevel: 'INFO'
      },
      tracing: {
        mode: 'PassThrough'
      },
      observability: {
        otelEnabled: false,
        otelResourceAttributes: {}
      },
      securityTools: {
        falco: false
      },
      monitoring: {
        enabled: false,
        alarms: {
          errors: { ...DEFAULT_ALARM_BASELINE },
          throttles: { ...DEFAULT_ALARM_BASELINE },
          duration: {
            ...DEFAULT_ALARM_BASELINE,
            threshold: 60000,
            statistic: 'Average'
          }
        }
      },
      hardeningProfile: 'baseline',
      removalPolicy: 'retain',
      tags: {}
    };
  }

  public buildSync(): LambdaWorkerConfig {
    const resolved = super.buildSync() as Partial<LambdaWorkerConfig>;

    if (!resolved.handler) {
      throw new Error('Lambda worker config requires a handler (e.g. "index.handler").');
    }

    return this.normaliseConfig(resolved);
  }

  private normaliseConfig(config: Partial<LambdaWorkerConfig>): LambdaWorkerConfig {
    const functionName = this.sanitiseFunctionName(
      config.functionName ?? `${this.builderContext.context.serviceName}-${this.builderContext.spec.name}`
    );

    return {
      functionName,
      handler: config.handler!,
      runtime: (config.runtime ?? 'nodejs20.x') as LambdaRuntime,
      architecture: (config.architecture ?? 'x86_64') as LambdaArchitecture,
      memorySize: config.memorySize ?? 256,
      timeoutSeconds: config.timeoutSeconds ?? 300,
      description: config.description,
      codePath: config.codePath ?? './src',
      environment: this.normaliseEnvironment(config.environment),
      reservedConcurrency: config.reservedConcurrency,
      deadLetterQueue: this.normaliseDeadLetterQueue(config.deadLetterQueue),
      eventSources: this.normaliseEventSources(config.eventSources),
      vpc: this.normaliseVpcConfig(config.vpc),
      kmsKeyArn: config.kmsKeyArn,
      logging: this.normaliseLogging(config.logging),
      tracing: {
        mode: (config.tracing?.mode ?? 'PassThrough') as LambdaTracingMode
      },
      observability: this.normaliseObservability(config.observability),
      securityTools: {
        falco: config.securityTools?.falco ?? false
      },
      monitoring: this.normaliseMonitoring(config.monitoring),
      hardeningProfile: config.hardeningProfile ?? 'baseline',
      removalPolicy: config.removalPolicy === 'destroy' ? 'destroy' : 'retain',
      tags: config.tags ?? {}
    };
  }

  private normaliseEnvironment(env?: Record<string, string>): Record<string, string> {
    if (!env) {
      return {};
    }

    const normalised: Record<string, string> = {};
    Object.entries(env).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        normalised[key] = String(value);
      }
    });
    return normalised;
  }

  private normaliseDeadLetterQueue(dlq?: LambdaWorkerConfig['deadLetterQueue']): LambdaWorkerConfig['deadLetterQueue'] | undefined {
    if (!dlq?.enabled) {
      return dlq?.queueArn ? { enabled: true, queueArn: dlq.queueArn, maxReceiveCount: dlq.maxReceiveCount ?? 3 } : { enabled: false, maxReceiveCount: 3 };
    }

    return {
      enabled: true,
      queueArn: dlq.queueArn,
      maxReceiveCount: dlq.maxReceiveCount ?? 3
    };
  }

  private normaliseEventSources(sources?: LambdaEventSource[]): LambdaEventSource[] {
    if (!sources || sources.length === 0) {
      return [];
    }

    return sources.map(source => {
      switch (source.type) {
        case 'sqs':
          return {
            type: 'sqs',
            queueArn: source.queueArn,
            batchSize: source.batchSize ?? 10,
            enabled: source.enabled ?? true,
            maximumBatchingWindowSeconds: source.maximumBatchingWindowSeconds ?? 0,
            scalingConfig: source.scalingConfig?.maximumConcurrency
              ? { maximumConcurrency: source.scalingConfig.maximumConcurrency }
              : undefined
          };
        case 'eventBridge':
          return {
            type: 'eventBridge',
            scheduleExpression: source.scheduleExpression,
            input: source.input ?? {},
            enabled: source.enabled ?? true
          };
        case 'eventBridgePattern':
          return {
            type: 'eventBridgePattern',
            eventBusArn: source.eventBusArn,
            pattern: source.pattern,
            input: source.input ?? {},
            enabled: source.enabled ?? true
          };
        default:
          return source;
      }
    });
  }

  private normaliseVpcConfig(vpc?: LambdaWorkerConfig['vpc']): LambdaWorkerConfig['vpc'] | undefined {
    if (!vpc || (!vpc.enabled && !vpc.vpcId && (!vpc.subnetIds || vpc.subnetIds.length === 0))) {
      return {
        enabled: false,
        subnetIds: [],
        securityGroupIds: []
      };
    }

    const subnetIds = vpc.subnetIds ?? [];
    const securityGroupIds = vpc.securityGroupIds ?? [];

    return {
      enabled: vpc.enabled ?? Boolean(vpc.vpcId || subnetIds.length > 0 || securityGroupIds.length > 0),
      vpcId: vpc.vpcId,
      subnetIds,
      securityGroupIds
    };
  }

  private normaliseLogging(logging?: LambdaWorkerConfig['logging']): LambdaWorkerConfig['logging'] {
    return {
      logRetentionDays: logging?.logRetentionDays ?? 30,
      logFormat: (logging?.logFormat ?? 'JSON') as LambdaLogFormat,
      systemLogLevel: logging?.systemLogLevel ?? 'INFO',
      applicationLogLevel: logging?.applicationLogLevel ?? 'INFO'
    };
  }

  private normaliseObservability(observability?: LambdaWorkerConfig['observability']): LambdaWorkerConfig['observability'] {
    return {
      otelEnabled: observability?.otelEnabled ?? false,
      otelLayerArn: observability?.otelLayerArn,
      otelResourceAttributes: observability?.otelResourceAttributes ?? {}
    };
  }

  private normaliseMonitoring(monitoring?: LambdaMonitoringConfig): LambdaWorkerConfig['monitoring'] {
    const enabled = monitoring?.enabled ?? false;

    return {
      enabled,
      alarms: {
        errors: this.normaliseAlarmConfig(monitoring?.alarms?.errors, {
          ...DEFAULT_ALARM_BASELINE,
          enabled,
          threshold: monitoring?.alarms?.errors?.threshold ?? 1
        }),
        throttles: this.normaliseAlarmConfig(monitoring?.alarms?.throttles, {
          ...DEFAULT_ALARM_BASELINE,
          enabled,
          threshold: monitoring?.alarms?.throttles?.threshold ?? 1
        }),
        duration: this.normaliseAlarmConfig(monitoring?.alarms?.duration, {
          ...DEFAULT_ALARM_BASELINE,
          enabled,
          threshold: monitoring?.alarms?.duration?.threshold ?? 60000,
          statistic: monitoring?.alarms?.duration?.statistic ?? 'Average'
        })
      }
    };
  }

  private normaliseAlarmConfig(
    alarm: LambdaAlarmConfig | undefined,
    defaults: Required<Omit<LambdaAlarmConfig, 'tags'>>
  ): LambdaAlarmConfig {
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

  private sanitiseFunctionName(name: string): string {
    const cleaned = name
      .replace(/[^a-zA-Z0-9-_]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+/, '')
      .substring(0, 64)
      .replace(/-+$/, '');

    return cleaned || 'lambda-worker';
  }
}
