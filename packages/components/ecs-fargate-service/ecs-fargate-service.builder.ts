import {
  ConfigBuilder,
  ConfigBuilderContext,
  ComponentConfigSchema
} from '@shinobi/core';
import { ComponentContext, ComponentSpec } from '@platform/contracts';

export type EcsFargateDeploymentStrategyType = 'rolling' | 'blue-green';

export type EcsFargateAlarmComparisonOperator = 'gt' | 'gte' | 'lt' | 'lte';

export type EcsFargateTreatMissingData = 'breaching' | 'not-breaching' | 'ignore' | 'missing';

export interface EcsFargateImageConfig {
  repository: string;
  tag: string;
}

export interface EcsFargateServiceConnectConfig {
  portMappingName: string;
  dnsName?: string;
  namespace?: string;
}

export interface EcsFargateHealthCheckConfig {
  command: string[];
  intervalSeconds: number;
  timeoutSeconds: number;
  retries: number;
}

export interface EcsFargateAutoScalingConfig {
  minCapacity: number;
  maxCapacity: number;
  targetCpuUtilization?: number;
  targetMemoryUtilization?: number;
}

export interface EcsFargateDeploymentStrategyConfig {
  type: EcsFargateDeploymentStrategyType;
  blueGreen?: {
    loadBalancer?: {
      productionPort: number;
      testPort?: number;
    };
    trafficShifting?: {
      initialPercentage?: number;
      waitTime?: number;
    };
  };
}

export interface EcsFargateLoggingConfig {
  createLogGroup: boolean;
  logGroupName?: string;
  streamPrefix: string;
  retentionInDays: number;
  removalPolicy: 'retain' | 'destroy';
}

export interface EcsFargateAlarmConfig {
  enabled?: boolean;
  threshold?: number;
  evaluationPeriods?: number;
  periodMinutes?: number;
  comparisonOperator?: EcsFargateAlarmComparisonOperator;
  treatMissingData?: EcsFargateTreatMissingData;
  statistic?: string;
  datapointsToAlarm?: number;
  tags?: Record<string, string>;
}

export interface EcsFargateMonitoringConfig {
  enabled: boolean;
  alarms: {
    cpuUtilization: EcsFargateAlarmConfig;
    memoryUtilization: EcsFargateAlarmConfig;
    runningTaskCount: EcsFargateAlarmConfig;
  };
}

export interface EcsFargateDiagnosticsConfig {
  enableExecuteCommand: boolean;
}

export interface EcsFargateServiceConfig {
  cluster: string;
  image: EcsFargateImageConfig;
  cpu: number;
  memory: number;
  port: number;
  serviceConnect: EcsFargateServiceConnectConfig;
  environment: Record<string, string>;
  secrets: Record<string, string>;
  taskRoleArn?: string;
  desiredCount: number;
  healthCheck?: EcsFargateHealthCheckConfig;
  autoScaling?: EcsFargateAutoScalingConfig;
  deploymentStrategy: EcsFargateDeploymentStrategyConfig;
  logging: EcsFargateLoggingConfig;
  monitoring: EcsFargateMonitoringConfig;
  diagnostics: EcsFargateDiagnosticsConfig;
  hardeningProfile: string;
  tags: Record<string, string>;
}

const HEALTH_CHECK_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['command'],
  properties: {
    command: {
      type: 'array',
      items: { type: 'string' },
      minItems: 1
    },
    intervalSeconds: {
      type: 'number',
      minimum: 5,
      maximum: 300,
      default: 30
    },
    timeoutSeconds: {
      type: 'number',
      minimum: 2,
      maximum: 60,
      default: 5
    },
    retries: {
      type: 'number',
      minimum: 1,
      maximum: 10,
      default: 3
    }
  }
};

const AUTOSCALING_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['minCapacity', 'maxCapacity'],
  properties: {
    minCapacity: { type: 'number', minimum: 0, maximum: 1000 },
    maxCapacity: { type: 'number', minimum: 1, maximum: 1000 },
    targetCpuUtilization: { type: 'number', minimum: 10, maximum: 100 },
    targetMemoryUtilization: { type: 'number', minimum: 10, maximum: 100 }
  }
};

const DEPLOYMENT_STRATEGY_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    type: { type: 'string', enum: ['rolling', 'blue-green'], default: 'rolling' },
    blueGreen: {
      type: 'object',
      additionalProperties: false,
      properties: {
        loadBalancer: {
          type: 'object',
          additionalProperties: false,
          properties: {
            productionPort: { type: 'number', minimum: 1, maximum: 65535 },
            testPort: { type: 'number', minimum: 1, maximum: 65535 }
          },
          required: ['productionPort']
        },
        trafficShifting: {
          type: 'object',
          additionalProperties: false,
          properties: {
            initialPercentage: { type: 'number', minimum: 0, maximum: 100, default: 10 },
            waitTime: { type: 'number', minimum: 1, maximum: 1440, default: 5 }
          }
        }
      }
    }
  }
};

const LOGGING_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    createLogGroup: { type: 'boolean', default: true },
    logGroupName: { type: 'string' },
    streamPrefix: { type: 'string', default: 'service' },
    retentionInDays: {
      type: 'number',
      enum: [1, 3, 5, 7, 14, 30, 60, 90, 120, 150, 180, 365, 400, 545, 731, 1827, 3653],
      default: 30
    },
    removalPolicy: { type: 'string', enum: ['retain', 'destroy'], default: 'retain' }
  }
};

const ALARM_SCHEMA = {
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
      default: 'gt'
    },
    treatMissingData: {
      type: 'string',
      enum: ['breaching', 'not-breaching', 'ignore', 'missing'],
      default: 'not-breaching'
    },
    statistic: { type: 'string', default: 'Average' },
    datapointsToAlarm: { type: 'number', minimum: 1 },
    tags: {
      type: 'object',
      additionalProperties: { type: 'string' }
    }
  }
};

const MONITORING_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    enabled: { type: 'boolean', default: true },
    alarms: {
      type: 'object',
      additionalProperties: false,
      properties: {
        cpuUtilization: ALARM_SCHEMA,
        memoryUtilization: ALARM_SCHEMA,
        runningTaskCount: ALARM_SCHEMA
      }
    }
  }
};

const DIAGNOSTICS_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    enableExecuteCommand: { type: 'boolean', default: false }
  }
};

export const ECS_FARGATE_SERVICE_CONFIG_SCHEMA: ComponentConfigSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['cluster', 'image', 'serviceConnect'],
  properties: {
    cluster: { type: 'string', minLength: 1 },
    image: {
      type: 'object',
      additionalProperties: false,
      required: ['repository'],
      properties: {
        repository: { type: 'string', minLength: 1 },
        tag: { type: 'string', default: 'latest' }
      }
    },
    cpu: { type: 'number', enum: [256, 512, 1024, 2048, 4096, 8192, 16384], default: 256 },
    memory: { type: 'number', minimum: 512, maximum: 122880, default: 512 },
    port: { type: 'number', minimum: 1, maximum: 65535, default: 8080 },
    serviceConnect: {
      type: 'object',
      additionalProperties: false,
      required: ['portMappingName'],
      properties: {
        portMappingName: { type: 'string', minLength: 1, maxLength: 64 },
        dnsName: { type: 'string', minLength: 1, maxLength: 253 },
        namespace: { type: 'string', minLength: 1, maxLength: 253 }
      }
    },
    environment: {
      type: 'object',
      additionalProperties: { type: 'string' },
      default: {}
    },
    secrets: {
      type: 'object',
      additionalProperties: { type: 'string' },
      default: {}
    },
    taskRoleArn: { type: 'string' },
    desiredCount: { type: 'number', minimum: 0, maximum: 1000, default: 1 },
    healthCheck: HEALTH_CHECK_SCHEMA,
    autoScaling: AUTOSCALING_SCHEMA,
    deploymentStrategy: DEPLOYMENT_STRATEGY_SCHEMA,
    logging: LOGGING_SCHEMA,
    monitoring: MONITORING_SCHEMA,
    diagnostics: DIAGNOSTICS_SCHEMA,
    hardeningProfile: { type: 'string', default: 'baseline' },
    tags: {
      type: 'object',
      additionalProperties: { type: 'string' },
      default: {}
    }
  }
};

type AlarmDefaults = {
  enabled: boolean;
  threshold: number;
  evaluationPeriods: number;
  periodMinutes: number;
  comparisonOperator: EcsFargateAlarmComparisonOperator;
  treatMissingData: EcsFargateTreatMissingData;
  statistic: string;
  datapointsToAlarm?: number;
};

const DEFAULT_ALARM_BASELINE: AlarmDefaults = {
  enabled: false,
  threshold: 0,
  evaluationPeriods: 2,
  periodMinutes: 5,
  comparisonOperator: 'gt',
  treatMissingData: 'not-breaching',
  statistic: 'Average'
};

export class EcsFargateServiceComponentConfigBuilder extends ConfigBuilder<EcsFargateServiceConfig> {
  constructor(context: ComponentContext, spec: ComponentSpec) {
    const builderContext: ConfigBuilderContext = { context, spec };
    super(builderContext, ECS_FARGATE_SERVICE_CONFIG_SCHEMA);
  }

  protected getHardcodedFallbacks(): Partial<EcsFargateServiceConfig> {
    return {
      cpu: 256,
      memory: 512,
      port: 8080,
      desiredCount: 1,
      image: {
        repository: 'public.ecr.aws/amazonlinux/amazonlinux',
        tag: 'latest'
      },
      serviceConnect: {
        portMappingName: 'api'
      },
      environment: {},
      secrets: {},
      deploymentStrategy: {
        type: 'rolling'
      },
      logging: {
        createLogGroup: true,
        streamPrefix: 'service',
        retentionInDays: 30,
        removalPolicy: 'retain'
      },
      monitoring: {
        enabled: true,
        alarms: {
          cpuUtilization: { ...DEFAULT_ALARM_BASELINE },
          memoryUtilization: { ...DEFAULT_ALARM_BASELINE },
          runningTaskCount: {
            ...DEFAULT_ALARM_BASELINE,
            comparisonOperator: 'lt'
          }
        }
      },
      diagnostics: {
        enableExecuteCommand: false
      },
      hardeningProfile: 'baseline',
      tags: {}
    } as Partial<EcsFargateServiceConfig>;
  }

  public buildSync(): EcsFargateServiceConfig {
    const resolved = super.buildSync() as Partial<EcsFargateServiceConfig>;
    return this.normaliseConfig(resolved);
  }

  private normaliseConfig(config: Partial<EcsFargateServiceConfig>): EcsFargateServiceConfig {
    if (!config.cluster) {
      throw new Error('ECS Fargate service requires `cluster` to be set.');
    }

    if (!config.image?.repository) {
      throw new Error('ECS Fargate service requires `image.repository` to be set.');
    }

    const image = {
      repository: config.image.repository,
      tag: config.image.tag ?? 'latest'
    };

    const desiredCount = config.desiredCount ?? 1;
    const autoScaling = this.normaliseAutoScaling(config.autoScaling, desiredCount);

    return {
      cluster: config.cluster,
      image,
      cpu: config.cpu ?? 256,
      memory: config.memory ?? 512,
      port: config.port ?? 8080,
      serviceConnect: this.normaliseServiceConnect(config.serviceConnect),
      environment: this.normaliseEnvironment(config.environment),
      secrets: this.normaliseSecrets(config.secrets),
      taskRoleArn: config.taskRoleArn,
      desiredCount,
      healthCheck: this.normaliseHealthCheck(config.healthCheck),
      autoScaling,
      deploymentStrategy: this.normaliseDeploymentStrategy(config.deploymentStrategy),
      logging: this.normaliseLogging(config.logging),
      monitoring: this.normaliseMonitoring(config.monitoring, desiredCount, autoScaling),
      diagnostics: this.normaliseDiagnostics(config.diagnostics),
      hardeningProfile: config.hardeningProfile ?? 'baseline',
      tags: config.tags ?? {}
    };
  }

  private normaliseEnvironment(environment?: Record<string, string>): Record<string, string> {
    if (!environment) {
      return {};
    }
    const normalised: Record<string, string> = {};
    Object.entries(environment).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        normalised[key] = String(value);
      }
    });
    return normalised;
  }

  private normaliseSecrets(secrets?: Record<string, string>): Record<string, string> {
    if (!secrets) {
      return {};
    }
    return Object.fromEntries(Object.entries(secrets).filter(([, value]) => Boolean(value)));
  }

  private normaliseServiceConnect(serviceConnect?: Partial<EcsFargateServiceConnectConfig>): EcsFargateServiceConnectConfig {
    const portMappingName = serviceConnect?.portMappingName
      ?? this.sanitisePortMappingName(`${this.builderContext.spec.name}-svc`);

    return {
      portMappingName,
      dnsName: serviceConnect?.dnsName ?? this.builderContext.spec.name,
      namespace: serviceConnect?.namespace
    };
  }

  private normaliseHealthCheck(healthCheck?: Partial<EcsFargateHealthCheckConfig>): EcsFargateHealthCheckConfig | undefined {
    if (!healthCheck) {
      return undefined;
    }

    return {
      command: healthCheck.command ?? ['CMD-SHELL', 'curl -f http://localhost:8080/health || exit 1'],
      intervalSeconds: healthCheck.intervalSeconds ?? 30,
      timeoutSeconds: healthCheck.timeoutSeconds ?? 5,
      retries: healthCheck.retries ?? 3
    };
  }

  private normaliseAutoScaling(
    autoScaling: Partial<EcsFargateAutoScalingConfig> | undefined,
    desiredCount: number
  ): EcsFargateAutoScalingConfig | undefined {
    if (!autoScaling) {
      return undefined;
    }

    const minCapacity = autoScaling.minCapacity ?? desiredCount;
    const maxCapacity = autoScaling.maxCapacity ?? Math.max(desiredCount, minCapacity);

    return {
      minCapacity,
      maxCapacity,
      targetCpuUtilization: autoScaling.targetCpuUtilization,
      targetMemoryUtilization: autoScaling.targetMemoryUtilization
    };
  }

  private normaliseDeploymentStrategy(deploymentStrategy?: Partial<EcsFargateDeploymentStrategyConfig>): EcsFargateDeploymentStrategyConfig {
    const type = deploymentStrategy?.type ?? 'rolling';

    if (type !== 'blue-green') {
      return { type };
    }

    const loadBalancer = deploymentStrategy?.blueGreen?.loadBalancer;
    const traffic = deploymentStrategy?.blueGreen?.trafficShifting;

    return {
      type,
      blueGreen: {
        loadBalancer: loadBalancer
          ? {
              productionPort: loadBalancer.productionPort,
              testPort: loadBalancer.testPort ?? loadBalancer.productionPort + 1
            }
          : undefined,
        trafficShifting: traffic
          ? {
              initialPercentage: traffic.initialPercentage ?? 10,
              waitTime: traffic.waitTime ?? 5
            }
          : undefined
      }
    };
  }

  private normaliseLogging(logging?: Partial<EcsFargateLoggingConfig>): EcsFargateLoggingConfig {
    return {
      createLogGroup: logging?.createLogGroup ?? true,
      logGroupName: logging?.logGroupName,
      streamPrefix: logging?.streamPrefix ?? 'service',
      retentionInDays: logging?.retentionInDays ?? 30,
      removalPolicy: logging?.removalPolicy === 'destroy' ? 'destroy' : 'retain'
    };
  }

  private normaliseMonitoring(
    monitoring: Partial<EcsFargateMonitoringConfig> | undefined,
    desiredCount: number,
    autoScaling?: EcsFargateAutoScalingConfig
  ): EcsFargateMonitoringConfig {
    const enabled = monitoring?.enabled ?? true;
    const runningTaskThreshold = monitoring?.alarms?.runningTaskCount?.threshold
      ?? autoScaling?.minCapacity
      ?? desiredCount;

    return {
      enabled,
      alarms: {
        cpuUtilization: this.normaliseAlarmConfig(monitoring?.alarms?.cpuUtilization, {
          ...DEFAULT_ALARM_BASELINE,
          enabled,
          threshold: monitoring?.alarms?.cpuUtilization?.threshold ?? 85,
          datapointsToAlarm: monitoring?.alarms?.cpuUtilization?.datapointsToAlarm
        }),
        memoryUtilization: this.normaliseAlarmConfig(monitoring?.alarms?.memoryUtilization, {
          ...DEFAULT_ALARM_BASELINE,
          enabled,
          threshold: monitoring?.alarms?.memoryUtilization?.threshold ?? 90,
          datapointsToAlarm: monitoring?.alarms?.memoryUtilization?.datapointsToAlarm
        }),
        runningTaskCount: this.normaliseAlarmConfig(monitoring?.alarms?.runningTaskCount, {
          ...DEFAULT_ALARM_BASELINE,
          enabled,
          threshold: runningTaskThreshold,
          comparisonOperator: monitoring?.alarms?.runningTaskCount?.comparisonOperator ?? 'lt',
          datapointsToAlarm: monitoring?.alarms?.runningTaskCount?.datapointsToAlarm,
          statistic: monitoring?.alarms?.runningTaskCount?.statistic ?? 'Average'
        })
      }
    };
  }

  private normaliseAlarmConfig(
    alarm: EcsFargateAlarmConfig | undefined,
    defaults: AlarmDefaults
  ): EcsFargateAlarmConfig {
    return {
      enabled: alarm?.enabled ?? defaults.enabled,
      threshold: alarm?.threshold ?? defaults.threshold,
      evaluationPeriods: alarm?.evaluationPeriods ?? defaults.evaluationPeriods,
      periodMinutes: alarm?.periodMinutes ?? defaults.periodMinutes,
      comparisonOperator: alarm?.comparisonOperator ?? defaults.comparisonOperator,
      treatMissingData: alarm?.treatMissingData ?? defaults.treatMissingData,
      statistic: alarm?.statistic ?? defaults.statistic,
      datapointsToAlarm: alarm?.datapointsToAlarm ?? defaults.datapointsToAlarm,
      tags: alarm?.tags ?? {}
    };
  }

  private normaliseDiagnostics(diagnostics?: Partial<EcsFargateDiagnosticsConfig>): EcsFargateDiagnosticsConfig {
    return {
      enableExecuteCommand: diagnostics?.enableExecuteCommand ?? false
    };
  }

  private sanitisePortMappingName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+/, '')
      .substring(0, 64)
      .replace(/-+$/, '') || 'service';
  }
}
