import {
  ConfigBuilder,
  ConfigBuilderContext,
  ComponentConfigSchema
} from '@shinobi/core';
import { ComponentContext, ComponentSpec } from '@shinobi/core';
import * as fs from 'fs';
import * as path from 'path';

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

export interface EcsFargateNetworkConfig {
  allowAllOutbound: boolean;
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
  network?: EcsFargateNetworkConfig;
  hardeningProfile: string;
  tags: Record<string, string>;
  /** High-risk environment flag (set via platform config or service.yml) */
  highRiskEnvironment?: boolean;
  /** Ephemeral storage size in GiB (set by builder based on risk level) */
  ephemeralStorageGiB?: number;
  /** Use customer-managed KMS key for log encryption (set by builder based on risk level) */
  useCustomerManagedKeyForLogs?: boolean;
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

const NETWORK_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    allowAllOutbound: { type: 'boolean', default: false }
  }
};

// Load schema from standalone Config.schema.json file
const schemaPath = path.join(__dirname, '..', 'Config.schema.json');
const schemaContent = fs.readFileSync(schemaPath, 'utf-8');
export const ECS_FARGATE_SERVICE_CONFIG_SCHEMA: ComponentConfigSchema = JSON.parse(schemaContent);

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
      // Safe defaults only - no framework conditionals
      cpu: 256,
      memory: 512,
      desiredCount: 1,
      ephemeralStorageGiB: 30,
      port: 8080,
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
        removalPolicy: 'destroy'
      },
      useCustomerManagedKeyForLogs: false,
      monitoring: {
        enabled: true,
        alarms: {
          cpuUtilization: {
            ...DEFAULT_ALARM_BASELINE,
            enabled: true,
            threshold: 85
          },
          memoryUtilization: {
            ...DEFAULT_ALARM_BASELINE,
            enabled: true,
            threshold: 90
          },
          runningTaskCount: {
            ...DEFAULT_ALARM_BASELINE,
            enabled: true,
            threshold: 1,
            comparisonOperator: 'lt'
          }
        }
      },
      diagnostics: {
        enableExecuteCommand: false
      },
      network: {
        allowAllOutbound: false
      },
      hardeningProfile: 'baseline',
      tags: {}
    } as Partial<EcsFargateServiceConfig>;
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
  protected getComplianceFrameworkDefaults(): Partial<EcsFargateServiceConfig> {
    // Check if highRiskEnvironment flag is set in component config or platform config
    const componentConfig = this.builderContext.spec.config as Partial<EcsFargateServiceConfig> | undefined;
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
        // Enhanced compute resources for high-risk environments
        cpu: 1024,
        memory: 2048,
        // High availability required
        desiredCount: 2,
        // Enhanced ephemeral storage for high-risk environments
        ephemeralStorageGiB: 50,
        // Enhanced logging with longer retention
        logging: {
          createLogGroup: true,
          streamPrefix: this.builderContext.spec.name,
          retentionInDays: 1095, // 3 years (can be overridden to 2555 for higher risk)
          removalPolicy: 'retain'
        },
        // Use customer-managed KMS key for log encryption
        useCustomerManagedKeyForLogs: true,
        // Stricter monitoring thresholds
        monitoring: {
          enabled: true,
          alarms: {
            cpuUtilization: {
              ...DEFAULT_ALARM_BASELINE,
              enabled: true,
              threshold: 75
            },
            memoryUtilization: {
              ...DEFAULT_ALARM_BASELINE,
              enabled: true,
              threshold: 80
            },
            runningTaskCount: {
              ...DEFAULT_ALARM_BASELINE,
              enabled: true,
              threshold: 2,
              comparisonOperator: 'lt'
            }
          }
        },
        // ECS Exec required for audit
        diagnostics: {
          enableExecuteCommand: true
        }
      };
    }
    
    return {}; // Standard/default environment - use hardcoded fallbacks
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

    const desiredCount = this.normaliseDesiredCount(config.desiredCount);
    const autoScaling = this.normaliseAutoScaling(config.autoScaling, desiredCount);
    const logging = this.normaliseLogging(config.logging);

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
      logging,
      monitoring: this.normaliseMonitoring(config.monitoring, desiredCount, autoScaling),
      diagnostics: this.normaliseDiagnostics(config.diagnostics),
      network: this.normaliseNetwork(config.network),
      hardeningProfile: config.hardeningProfile ?? 'baseline',
      tags: config.tags ?? {},
      highRiskEnvironment: config.highRiskEnvironment
    };
  }

  private normaliseDesiredCount(inputDesiredCount: number | undefined): number {
    return inputDesiredCount ?? 1;
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
    autoScaling: EcsFargateAutoScalingConfig | undefined
  ): EcsFargateMonitoringConfig {
    const enabled = monitoring?.enabled ?? true;
    const runningTaskThreshold = monitoring?.alarms?.runningTaskCount?.threshold
      ?? autoScaling?.minCapacity
      ?? desiredCount;

    // Use config values - thresholds are set by getComplianceFrameworkDefaults() for high-risk environments
    const cpuThreshold = monitoring?.alarms?.cpuUtilization?.threshold ?? 85;
    const memoryThreshold = monitoring?.alarms?.memoryUtilization?.threshold ?? 90;
    const runningTaskCountThreshold = runningTaskThreshold;
    const cpuAlarmInput = {
      ...monitoring?.alarms?.cpuUtilization,
      threshold: cpuThreshold
    } as EcsFargateAlarmConfig | undefined;
    const memoryAlarmInput = {
      ...monitoring?.alarms?.memoryUtilization,
      threshold: memoryThreshold
    } as EcsFargateAlarmConfig | undefined;
    const runningTaskAlarmInput = {
      ...monitoring?.alarms?.runningTaskCount,
      threshold: runningTaskCountThreshold,
      comparisonOperator: monitoring?.alarms?.runningTaskCount?.comparisonOperator ?? 'lt'
    } as EcsFargateAlarmConfig | undefined;

    return {
      enabled,
      alarms: {
        cpuUtilization: this.normaliseAlarmConfig(cpuAlarmInput, {
          ...DEFAULT_ALARM_BASELINE,
          enabled,
          threshold: cpuThreshold,
          datapointsToAlarm: monitoring?.alarms?.cpuUtilization?.datapointsToAlarm
        }),
        memoryUtilization: this.normaliseAlarmConfig(memoryAlarmInput, {
          ...DEFAULT_ALARM_BASELINE,
          enabled,
          threshold: memoryThreshold,
          datapointsToAlarm: monitoring?.alarms?.memoryUtilization?.datapointsToAlarm
        }),
        runningTaskCount: this.normaliseAlarmConfig(runningTaskAlarmInput, {
          ...DEFAULT_ALARM_BASELINE,
          enabled,
          threshold: runningTaskCountThreshold,
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

  private normaliseNetwork(network?: Partial<EcsFargateNetworkConfig>): EcsFargateNetworkConfig {
    return {
      allowAllOutbound: network?.allowAllOutbound ?? false
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
