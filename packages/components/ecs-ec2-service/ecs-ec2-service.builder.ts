import {
  ConfigBuilder,
  ConfigBuilderContext,
  ComponentConfigSchema
} from '@shinobi/core';
import { ComponentContext, ComponentSpec } from '@platform/contracts';

export type EcsPlacementConstraintType = 'memberOf' | 'distinctInstance';
export type EcsPlacementStrategyType = 'random' | 'spread' | 'binpack';
export type EcsEc2LogRemovalPolicy = 'retain' | 'destroy';

export interface EcsServiceConnectConfig {
  portMappingName: string;
  dnsName?: string;
  namespace?: string;
}

export interface EcsImageConfig {
  repository: string;
  tag: string;
}

export interface EcsHealthCheckConfig {
  command: string[];
  intervalSeconds: number;
  timeoutSeconds: number;
  retries: number;
}

export interface EcsPlacementConstraintConfig {
  type: EcsPlacementConstraintType;
  expression?: string;
}

export interface EcsPlacementStrategyConfig {
  type: EcsPlacementStrategyType;
  field?: string;
}

export interface EcsAutoScalingConfig {
  minCapacity: number;
  maxCapacity: number;
  targetCpuUtilization?: number;
  targetMemoryUtilization?: number;
}

export interface EcsLogConfig {
  createLogGroup: boolean;
  logGroupName?: string;
  streamPrefix: string;
  retentionInDays: number;
  removalPolicy: EcsEc2LogRemovalPolicy;
}

export interface EcsAlarmConfig {
  enabled: boolean;
  threshold: number;
  evaluationPeriods: number;
}

export interface EcsMonitoringConfig {
  enabled: boolean;
  alarms: {
    cpu: EcsAlarmConfig;
    memory: EcsAlarmConfig;
  };
}

export interface EcsDiagnosticsConfig {
  enableExecuteCommand: boolean;
}

export interface EcsEc2ServiceConfig {
  cluster: string;
  image: EcsImageConfig;
  taskCpu: number;
  taskMemory: number;
  port: number;
  serviceConnect: EcsServiceConnectConfig;
  environment: Record<string, string>;
  secrets: Record<string, string>;
  taskRoleArn?: string;
  desiredCount: number;
  placementConstraints: EcsPlacementConstraintConfig[];
  placementStrategies: EcsPlacementStrategyConfig[];
  healthCheck?: EcsHealthCheckConfig;
  autoScaling?: EcsAutoScalingConfig;
  logging: EcsLogConfig;
  monitoring: EcsMonitoringConfig;
  diagnostics: EcsDiagnosticsConfig;
  tags: Record<string, string>;
}

const HEALTH_CHECK_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    command: {
      type: 'array',
      items: { type: 'string' },
      minItems: 1
    },
    intervalSeconds: { type: 'number', minimum: 5, maximum: 300, default: 30 },
    timeoutSeconds: { type: 'number', minimum: 2, maximum: 60, default: 5 },
    retries: { type: 'number', minimum: 1, maximum: 10, default: 3 }
  },
  required: ['command']
};

const PLACEMENT_CONSTRAINT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    type: { type: 'string', enum: ['memberOf', 'distinctInstance'] },
    expression: { type: 'string' }
  },
  required: ['type']
};

const PLACEMENT_STRATEGY_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    type: { type: 'string', enum: ['random', 'spread', 'binpack'] },
    field: { type: 'string' }
  },
  required: ['type']
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
    enabled: { type: 'boolean', default: true },
    threshold: { type: 'number', minimum: 1, maximum: 100, default: 80 },
    evaluationPeriods: { type: 'number', minimum: 1, maximum: 10, default: 3 }
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
        cpu: ALARM_SCHEMA,
        memory: ALARM_SCHEMA
      }
    }
  }
};

const SERVICE_CONNECT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    portMappingName: { type: 'string', minLength: 1, maxLength: 64 },
    dnsName: { type: 'string', minLength: 1, maxLength: 253 },
    namespace: { type: 'string', minLength: 1, maxLength: 253 }
  },
  required: ['portMappingName']
};

export const ECS_EC2_SERVICE_CONFIG_SCHEMA: ComponentConfigSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    cluster: { type: 'string', minLength: 1 },
    image: {
      type: 'object',
      additionalProperties: false,
      properties: {
        repository: { type: 'string', minLength: 1 },
        tag: { type: 'string', default: 'latest' }
      },
      required: ['repository']
    },
    taskCpu: { type: 'number', minimum: 128 },
    taskMemory: { type: 'number', minimum: 128 },
    port: { type: 'number', minimum: 1, maximum: 65535, default: 8080 },
    serviceConnect: SERVICE_CONNECT_SCHEMA,
    environment: { type: 'object', additionalProperties: { type: 'string' }, default: {} },
    secrets: { type: 'object', additionalProperties: { type: 'string' }, default: {} },
    taskRoleArn: { type: 'string' },
    desiredCount: { type: 'number', minimum: 0, maximum: 1000, default: 1 },
    placementConstraints: { type: 'array', items: PLACEMENT_CONSTRAINT_SCHEMA, default: [] },
    placementStrategies: { type: 'array', items: PLACEMENT_STRATEGY_SCHEMA, default: [] },
    healthCheck: HEALTH_CHECK_SCHEMA,
    autoScaling: {
      type: 'object',
      additionalProperties: false,
      properties: {
        minCapacity: { type: 'number', minimum: 0, maximum: 1000 },
        maxCapacity: { type: 'number', minimum: 1, maximum: 1000 },
        targetCpuUtilization: { type: 'number', minimum: 10, maximum: 100 },
        targetMemoryUtilization: { type: 'number', minimum: 10, maximum: 100 }
      }
    },
    logging: LOGGING_SCHEMA,
    monitoring: MONITORING_SCHEMA,
    diagnostics: {
      type: 'object',
      additionalProperties: false,
      properties: {
        enableExecuteCommand: { type: 'boolean', default: false }
      },
      default: {
        enableExecuteCommand: false
      }
    },
    tags: { type: 'object', additionalProperties: { type: 'string' }, default: {} }
  }
};

export class EcsEc2ServiceConfigBuilder extends ConfigBuilder<EcsEc2ServiceConfig> {
  constructor(context: ComponentContext, spec: ComponentSpec) {
    const builderContext: ConfigBuilderContext = { context, spec };
    super(builderContext, ECS_EC2_SERVICE_CONFIG_SCHEMA);
  }

  protected getHardcodedFallbacks(): Partial<EcsEc2ServiceConfig> {
    return {
      taskCpu: 256,
      taskMemory: 512,
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
      placementConstraints: [],
      placementStrategies: [],
      logging: {
        createLogGroup: true,
        streamPrefix: 'service',
        retentionInDays: 30,
        removalPolicy: 'retain'
      },
      monitoring: {
        enabled: true,
        alarms: {
          cpu: { enabled: true, threshold: 80, evaluationPeriods: 3 },
          memory: { enabled: true, threshold: 85, evaluationPeriods: 3 }
        }
      },
      diagnostics: {
        enableExecuteCommand: false
      },
      tags: {}
    };
  }

  public buildSync(): EcsEc2ServiceConfig {
    const resolved = super.buildSync() as Partial<EcsEc2ServiceConfig>;
    return this.normaliseConfig(resolved);
  }

  private normaliseConfig(config: Partial<EcsEc2ServiceConfig>): EcsEc2ServiceConfig {
    return {
      cluster: config.cluster!,
      image: {
        repository: config.image!.repository,
        tag: config.image?.tag ?? 'latest'
      },
      taskCpu: config.taskCpu ?? 256,
      taskMemory: config.taskMemory ?? 512,
      port: config.port ?? 8080,
      serviceConnect: this.normaliseServiceConnect(config.serviceConnect),
      environment: this.normaliseRecord(config.environment),
      secrets: this.normaliseRecord(config.secrets),
      taskRoleArn: config.taskRoleArn,
      desiredCount: config.desiredCount ?? 1,
      placementConstraints: this.normalisePlacementConstraints(config.placementConstraints),
      placementStrategies: this.normalisePlacementStrategies(config.placementStrategies),
      healthCheck: this.normaliseHealthCheck(config.healthCheck),
      autoScaling: this.normaliseAutoScaling(config.autoScaling, config.desiredCount ?? 1),
      logging: this.normaliseLogging(config.logging),
      monitoring: this.normaliseMonitoring(config.monitoring),
      diagnostics: {
        enableExecuteCommand: config.diagnostics?.enableExecuteCommand ?? false
      },
      tags: config.tags ?? {}
    };
  }

  private normaliseServiceConnect(serviceConnect?: Partial<EcsServiceConnectConfig>): EcsServiceConnectConfig {
    const portMappingName = serviceConnect?.portMappingName ?? 'api';
    return {
      portMappingName,
      dnsName: serviceConnect?.dnsName,
      namespace: serviceConnect?.namespace
    };
  }

  private normaliseRecord(record?: Record<string, string>): Record<string, string> {
    if (!record) {
      return {};
    }
    const normalised: Record<string, string> = {};
    Object.entries(record).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        normalised[key] = String(value);
      }
    });
    return normalised;
  }

  private normalisePlacementConstraints(constraints?: EcsPlacementConstraintConfig[]): EcsPlacementConstraintConfig[] {
    if (!constraints || constraints.length === 0) {
      return [];
    }
    return constraints.map(constraint => ({
      type: constraint.type,
      expression: constraint.expression
    }));
  }

  private normalisePlacementStrategies(strategies?: EcsPlacementStrategyConfig[]): EcsPlacementStrategyConfig[] {
    if (!strategies || strategies.length === 0) {
      return [];
    }
    return strategies.map(strategy => ({
      type: strategy.type,
      field: strategy.field
    }));
  }

  private normaliseHealthCheck(healthCheck?: Partial<EcsHealthCheckConfig>): EcsHealthCheckConfig | undefined {
    if (!healthCheck) {
      return undefined;
    }
    return {
      command: healthCheck.command!,
      intervalSeconds: healthCheck.intervalSeconds ?? 30,
      timeoutSeconds: healthCheck.timeoutSeconds ?? 5,
      retries: healthCheck.retries ?? 3
    };
  }

  private normaliseAutoScaling(autoScaling: Partial<EcsAutoScalingConfig> | undefined, desiredCount: number): EcsAutoScalingConfig | undefined {
    if (!autoScaling) {
      return undefined;
    }
    const min = autoScaling.minCapacity ?? desiredCount;
    const max = autoScaling.maxCapacity ?? Math.max(desiredCount, min);
    return {
      minCapacity: min,
      maxCapacity: max,
      targetCpuUtilization: autoScaling.targetCpuUtilization,
      targetMemoryUtilization: autoScaling.targetMemoryUtilization
    };
  }

  private normaliseLogging(logging?: Partial<EcsLogConfig>): EcsLogConfig {
    return {
      createLogGroup: logging?.createLogGroup ?? true,
      logGroupName: logging?.logGroupName,
      streamPrefix: logging?.streamPrefix ?? 'service',
      retentionInDays: logging?.retentionInDays ?? 30,
      removalPolicy: logging?.removalPolicy === 'destroy' ? 'destroy' : 'retain'
    };
  }

  private normaliseMonitoring(monitoring?: Partial<EcsMonitoringConfig>): EcsMonitoringConfig {
    const enabled = monitoring?.enabled ?? true;
    return {
      enabled,
      alarms: {
        cpu: {
          enabled: monitoring?.alarms?.cpu?.enabled ?? enabled,
          threshold: monitoring?.alarms?.cpu?.threshold ?? 80,
          evaluationPeriods: monitoring?.alarms?.cpu?.evaluationPeriods ?? 3
        },
        memory: {
          enabled: monitoring?.alarms?.memory?.enabled ?? enabled,
          threshold: monitoring?.alarms?.memory?.threshold ?? 85,
          evaluationPeriods: monitoring?.alarms?.memory?.evaluationPeriods ?? 3
        }
      }
    };
  }
}
