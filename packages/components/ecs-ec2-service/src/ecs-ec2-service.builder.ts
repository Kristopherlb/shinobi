import {
  ConfigBuilder,
  ConfigBuilderContext,
  ComponentConfigSchema
} from '@shinobi/core';
import { ComponentContext, ComponentSpec } from '@platform/contracts';
import configSchemaJson from '../Config.schema.json';

export type EcsPlacementConstraintType = 'memberOf' | 'distinctInstance';
export type EcsPlacementStrategyType = 'random' | 'spread' | 'binpack';
export type EcsEc2LogRemovalPolicy = 'retain' | 'destroy';
export type CollectorMode = 'sidecar' | 'centralized';
export type EgressPolicy = 'allow-all' | 'vpc-only' | 'vpc-endpoints-only';

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

export interface EcsXRayConfig {
  enabled: boolean;
  mode: CollectorMode;
}

export interface EcsAdotConfig {
  enabled: boolean;
  mode: CollectorMode;
  version?: string;
}

export interface EcsDashboardConfig {
  enabled: boolean;
  widgets?: string[];
}

export interface EcsObservabilityConfig {
  xray?: EcsXRayConfig;
  adot?: EcsAdotConfig;
  dashboard?: EcsDashboardConfig;
}

export interface EcsNetworkConfig {
  egressPolicy: EgressPolicy;
  vpcEndpoints?: string[];
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
  observability?: EcsObservabilityConfig;
  network?: EcsNetworkConfig;
  tags: Record<string, string>;
}

// Export schema loaded from Config.schema.json
export const ECS_EC2_SERVICE_CONFIG_SCHEMA: ComponentConfigSchema = configSchemaJson as ComponentConfigSchema;

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
      observability: {
        xray: { enabled: false, mode: 'centralized' },
        adot: { enabled: false, mode: 'centralized', version: 'v0.35.0' },
        dashboard: { enabled: true, widgets: ['cpu', 'memory', 'tasks', 'logs'] }
      },
      network: {
        egressPolicy: 'allow-all',
        vpcEndpoints: []
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
      observability: this.normaliseObservability(config.observability),
      network: this.normaliseNetwork(config.network),
      tags: config.tags ?? {}
    };
  }

  private normaliseObservability(observability?: Partial<EcsObservabilityConfig>): EcsObservabilityConfig {
    return {
      xray: {
        enabled: observability?.xray?.enabled ?? false,
        mode: observability?.xray?.mode ?? 'centralized'
      },
      adot: {
        enabled: observability?.adot?.enabled ?? false,
        mode: observability?.adot?.mode ?? 'centralized',
        version: observability?.adot?.version ?? 'v0.35.0'
      },
      dashboard: {
        enabled: observability?.dashboard?.enabled ?? true,
        widgets: observability?.dashboard?.widgets ?? ['cpu', 'memory', 'tasks', 'logs']
      }
    };
  }

  private normaliseNetwork(network?: Partial<EcsNetworkConfig>): EcsNetworkConfig {
    return {
      egressPolicy: network?.egressPolicy ?? 'allow-all',
      vpcEndpoints: network?.vpcEndpoints ?? []
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
