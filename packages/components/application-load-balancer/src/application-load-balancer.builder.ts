import {
  ConfigBuilder,
  ConfigBuilderContext,
  ComponentConfigSchema,
  ComponentContext,
  ComponentSpec
} from '@shinobi/core';
import schemaJson from '../Config.schema.json' assert { type: 'json' };

export type AlbScheme = 'internet-facing' | 'internal';
export type AlbIpAddressType = 'ipv4' | 'dualstack';
export type AlbListenerProtocol = 'HTTP' | 'HTTPS';
export type AlbTargetType = 'instance' | 'ip' | 'lambda';
export type AlbListenerDefaultActionType = 'fixed-response' | 'redirect' | 'forward';
export type AlbComparisonOperator = 'gt' | 'gte' | 'lt' | 'lte';
export type AlbTreatMissingData = 'breaching' | 'not-breaching' | 'ignore' | 'missing';
export type AlbRemovalPolicy = 'retain' | 'destroy';
export type AlbDeploymentStrategyType = 'single' | 'blue-green';
export type AlbTrafficShiftType = 'AllAtOnce' | 'Linear' | 'Canary';

export interface AlbIngressRuleConfig {
  port: number;
  protocol?: 'tcp';
  cidr: string;
  description?: string;
}

export interface AlbSecurityGroupConfig {
  create?: boolean;
  securityGroupIds?: string[];
  ingress?: AlbIngressRuleConfig[];
}

export interface AlbAccessLogsConfig {
  enabled?: boolean;
  bucketName?: string;
  bucket?: string;
  prefix?: string;
  retentionDays?: number;
  removalPolicy?: AlbRemovalPolicy;
}

export interface AlbHealthCheckConfig {
  enabled?: boolean;
  path?: string;
  protocol?: AlbListenerProtocol;
  port?: number;
  healthyThresholdCount?: number;
  unhealthyThresholdCount?: number;
  timeoutSeconds?: number;
  intervalSeconds?: number;
  matcher?: string;
}

export interface AlbStickinessConfig {
  enabled?: boolean;
  durationSeconds?: number;
}

export interface AlbTargetGroupConfig {
  name: string;
  port: number;
  protocol: AlbListenerProtocol;
  targetType: AlbTargetType;
  healthCheck?: AlbHealthCheckConfig;
  stickiness?: AlbStickinessConfig;
}

export interface AlbListenerFixedResponseConfig {
  statusCode?: number;
  contentType?: string;
  messageBody?: string;
}

export interface AlbListenerRedirectConfig {
  redirectUrl: string;
}

export interface AlbListenerDefaultActionConfig {
  type: AlbListenerDefaultActionType;
  fixedResponse?: AlbListenerFixedResponseConfig;
  redirect?: AlbListenerRedirectConfig;
}

export interface AlbListenerConfig {
  port: number;
  protocol: AlbListenerProtocol;
  certificateArn?: string;
  sslPolicy?: string;
  redirectToHttps?: boolean;
  defaultAction?: AlbListenerDefaultActionConfig;
}

export interface AlbTrafficRouteConfig {
  type: AlbTrafficShiftType;
  percentage?: number;
  interval?: number;
}

export interface AlbBlueGreenConfig {
  productionTrafficRoute?: AlbTrafficRouteConfig;
  testTrafficRoute?: AlbTrafficRouteConfig;
  terminationWaitTimeMinutes?: number;
}

export interface AlbDeploymentStrategyConfig {
  type: AlbDeploymentStrategyType;
  blueGreenConfig?: AlbBlueGreenConfig;
}

export interface AlbAlarmConfig {
  enabled?: boolean;
  threshold?: number;
  evaluationPeriods?: number;
  periodMinutes?: number;
  comparisonOperator?: AlbComparisonOperator;
  treatMissingData?: AlbTreatMissingData;
  statistic?: string;
  tags?: Record<string, string>;
}

export interface AlbMonitoringAlarmsConfig {
  http5xx?: AlbAlarmConfig;
  unhealthyHosts?: AlbAlarmConfig;
  connectionErrors?: AlbAlarmConfig;
  rejectedConnections?: AlbAlarmConfig;
}

export interface AlbMonitoringConfig {
  enabled?: boolean;
  alarms?: AlbMonitoringAlarmsConfig;
}

export interface AlbXRayTracingConfig {
  enabled?: boolean;
  samplingRate?: number;
  serviceName?: string;
}

export interface AlbWAFConfig {
  enabled?: boolean;
  managedRuleGroups?: string[];
  customRules?: any[];
}

export interface AlbObservabilityConfig {
  dashboard?: {
    enabled?: boolean;
    name?: string;
  };
  xrayTracing?: AlbXRayTracingConfig;
  waf?: AlbWAFConfig;
}

export interface AlbVpcConfig {
  vpcId?: string;
  subnetIds?: string[];
  subnetType?: 'public' | 'private';
}

export interface ApplicationLoadBalancerConfig {
  loadBalancerName: string;
  scheme: AlbScheme;
  ipAddressType: AlbIpAddressType;
  vpc: {
    vpcId?: string;
    subnetIds: string[];
    subnetType: 'public' | 'private';
  };
  securityGroups: {
    create: boolean;
    securityGroupIds: string[];
    ingress: Required<AlbIngressRuleConfig>[];
  };
  accessLogs: {
    enabled: boolean;
    bucketName?: string;
    prefix?: string;
    retentionDays: number;
    removalPolicy: AlbRemovalPolicy;
  };
  listeners: AlbListenerConfig[];
  targetGroups: AlbTargetGroupConfig[];
  deletionProtection: boolean;
  idleTimeoutSeconds: number;
  deploymentStrategy: AlbDeploymentStrategyConfig;
  monitoring: {
    enabled: boolean;
    alarms: {
      http5xx: Required<AlbAlarmConfig>;
      unhealthyHosts: Required<AlbAlarmConfig>;
      connectionErrors: Required<AlbAlarmConfig>;
      rejectedConnections: Required<AlbAlarmConfig>;
    };
  };
  observability?: AlbObservabilityConfig;
  hardeningProfile: string;
  tags: Record<string, string>;
}

export const APPLICATION_LOAD_BALANCER_CONFIG_SCHEMA = schemaJson as ComponentConfigSchema;

const DEFAULT_HTTP_INGRESS: Required<AlbIngressRuleConfig>[] = [];

const DEFAULT_ALARM_BASELINE: Required<Omit<AlbAlarmConfig, 'tags'>> = {
  enabled: false,
  threshold: 1,
  evaluationPeriods: 2,
  periodMinutes: 5,
  comparisonOperator: 'gte',
  treatMissingData: 'not-breaching',
  statistic: 'Sum'
};

export class ApplicationLoadBalancerComponentConfigBuilder extends ConfigBuilder<ApplicationLoadBalancerConfig> {
  constructor(context: ComponentContext, spec: ComponentSpec) {
    const builderContext: ConfigBuilderContext = { context, spec };
    super(builderContext, APPLICATION_LOAD_BALANCER_CONFIG_SCHEMA);
  }

  protected getHardcodedFallbacks(): Partial<ApplicationLoadBalancerConfig> {
    return {
      scheme: 'internet-facing',
      ipAddressType: 'ipv4',
      vpc: {
        subnetType: 'public',
        subnetIds: []
      },
      securityGroups: {
        create: true,
        securityGroupIds: [],
        ingress: DEFAULT_HTTP_INGRESS
      },
      accessLogs: {
        enabled: true,
        retentionDays: 90,
        removalPolicy: 'retain'
      },
      listeners: [
        {
          port: 80,
          protocol: 'HTTP',
          redirectToHttps: false
        }
      ],
      targetGroups: [],
      deletionProtection: true,
      idleTimeoutSeconds: 60,
      deploymentStrategy: {
        type: 'single'
      },
      monitoring: {
        enabled: true,
        alarms: {
          http5xx: { ...DEFAULT_ALARM_BASELINE },
          unhealthyHosts: { ...DEFAULT_ALARM_BASELINE },
          connectionErrors: { ...DEFAULT_ALARM_BASELINE },
          rejectedConnections: { ...DEFAULT_ALARM_BASELINE }
        }
      },
      observability: {
        dashboard: {
          enabled: true,
          name: `${this.builderContext.spec.name}-alb-dashboard`
        },
        xrayTracing: {
          enabled: true,
          samplingRate: 0.1,
          serviceName: this.builderContext.spec.name
        },
        waf: {
          enabled: true,
          managedRuleGroups: ['AWSManagedRulesCommonRuleSet', 'AWSManagedRulesKnownBadInputsRuleSet', 'AWSManagedRulesSQLiRuleSet'],
          customRules: []
        }
      },
      hardeningProfile: 'baseline',
      tags: {}
    } as Partial<ApplicationLoadBalancerConfig>;
  }

  public buildSync(): ApplicationLoadBalancerConfig {
    const resolved = super.buildSync() as Partial<ApplicationLoadBalancerConfig>;
    return this.normaliseConfig(resolved);
  }

  private normaliseConfig(config: Partial<ApplicationLoadBalancerConfig>): ApplicationLoadBalancerConfig {
    const specName = this.builderContext.spec.name;

    const loadBalancerName = this.sanitiseName(config.loadBalancerName ?? specName);
    const scheme: AlbScheme = config.scheme ?? 'internet-facing';
    const ipAddressType: AlbIpAddressType = config.ipAddressType ?? 'ipv4';

    const vpc: ApplicationLoadBalancerConfig['vpc'] = {
      vpcId: config.vpc?.vpcId,
      subnetIds: [...(config.vpc?.subnetIds ?? [])],
      subnetType: config.vpc?.subnetType ?? 'public'
    };

    const securityGroups = this.normaliseSecurityGroups(config.securityGroups);
    const accessLogs = this.normaliseAccessLogs(config.accessLogs, loadBalancerName);
    const listeners = this.normaliseListeners(config.listeners);
    const targetGroups = this.normaliseTargetGroups(config.targetGroups);
    const deploymentStrategy = this.normaliseDeploymentStrategy(config.deploymentStrategy);
    const monitoring = this.normaliseMonitoring(config.monitoring);
    const observability = config.observability ?? {
      dashboard: {
        enabled: true,
        name: `${specName}-alb-dashboard`
      },
      xrayTracing: {
        enabled: true,
        samplingRate: 0.1,
        serviceName: specName
      },
      waf: {
        enabled: true,
        managedRuleGroups: ['AWSManagedRulesCommonRuleSet', 'AWSManagedRulesKnownBadInputsRuleSet', 'AWSManagedRulesSQLiRuleSet'],
        customRules: []
      }
    };

    const idleTimeoutSeconds = this.resolveIdleTimeout(config);
    const deletionProtection = config.deletionProtection ?? true;
    const hardeningProfile = config.hardeningProfile ?? 'baseline';
    const tags = { ...(config.tags ?? {}) };

    return {
      loadBalancerName,
      scheme,
      ipAddressType,
      vpc,
      securityGroups,
      accessLogs,
      listeners,
      targetGroups,
      deletionProtection,
      idleTimeoutSeconds,
      deploymentStrategy,
      monitoring,
      observability,
      hardeningProfile,
      tags
    };
  }

  private sanitiseName(name: string): string {
    return name
      .replace(/[^a-zA-Z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-/, '')
      .substring(0, 32) || 'alb';
  }

  private normaliseSecurityGroups(securityGroups?: AlbSecurityGroupConfig): ApplicationLoadBalancerConfig['securityGroups'] {
    const create = securityGroups?.create ?? true;
    const securityGroupIds = [...(securityGroups?.securityGroupIds ?? [])];
    const ingress = (securityGroups?.ingress ?? DEFAULT_HTTP_INGRESS).map(rule => {
      if (!rule.cidr) {
        throw new Error('ALB security group ingress rules must specify a CIDR block');
      }

      return {
        port: rule.port,
        protocol: rule.protocol ?? 'tcp',
        cidr: rule.cidr,
        description: rule.description ?? `Allow ${rule.protocol ?? 'tcp'} ${rule.port}`
      };
    });

    return {
      create,
      securityGroupIds,
      ingress
    };
  }

  private normaliseAccessLogs(accessLogs: AlbAccessLogsConfig | undefined, loadBalancerName: string): ApplicationLoadBalancerConfig['accessLogs'] {
    const enabled = accessLogs?.enabled ?? false;
    const bucketName = accessLogs?.bucketName ?? accessLogs?.bucket;
    const prefix = accessLogs?.prefix ?? `${loadBalancerName}/`;
    const retentionDays = Math.max(1, accessLogs?.retentionDays ?? 30);
    const removalPolicy: AlbRemovalPolicy = accessLogs?.removalPolicy ?? 'destroy';

    return {
      enabled,
      bucketName,
      prefix,
      retentionDays,
      removalPolicy
    };
  }

  private normaliseListeners(listeners?: AlbListenerConfig[]): AlbListenerConfig[] {
    const defined = listeners?.length ? listeners : undefined;
    const listenerSet = defined ?? [
      {
        port: 80,
        protocol: 'HTTP',
        redirectToHttps: false
      }
    ];

    return listenerSet.map(listener => ({
      port: listener.port,
      protocol: listener.protocol ?? 'HTTP',
      certificateArn: listener.certificateArn,
      sslPolicy: listener.sslPolicy,
      redirectToHttps: listener.redirectToHttps ?? false,
      defaultAction: listener.defaultAction ? { ...listener.defaultAction } : undefined
    }));
  }

  private normaliseTargetGroups(targetGroups?: AlbTargetGroupConfig[]): AlbTargetGroupConfig[] {
    if (!targetGroups || targetGroups.length === 0) {
      return [];
    }

    return targetGroups.map(targetGroup => ({
      name: this.sanitiseTargetGroupName(targetGroup.name),
      port: targetGroup.port,
      protocol: targetGroup.protocol ?? 'HTTP',
      targetType: targetGroup.targetType ?? 'instance',
      healthCheck: targetGroup.healthCheck
        ? this.normaliseHealthCheck(targetGroup.healthCheck)
        : undefined,
      stickiness: targetGroup.stickiness
        ? {
          enabled: targetGroup.stickiness.enabled ?? false,
          durationSeconds: targetGroup.stickiness.durationSeconds ?? 86400
        }
        : undefined
    }));
  }

  private normaliseHealthCheck(healthCheck: AlbHealthCheckConfig): AlbHealthCheckConfig {
    return {
      enabled: healthCheck.enabled ?? true,
      path: healthCheck.path ?? '/',
      protocol: healthCheck.protocol ?? 'HTTP',
      port: healthCheck.port,
      healthyThresholdCount: healthCheck.healthyThresholdCount ?? 2,
      unhealthyThresholdCount: healthCheck.unhealthyThresholdCount ?? 2,
      timeoutSeconds: healthCheck.timeoutSeconds ?? 5,
      intervalSeconds: healthCheck.intervalSeconds ?? 30,
      matcher: healthCheck.matcher ?? '200-399'
    };
  }

  private normaliseDeploymentStrategy(strategy?: AlbDeploymentStrategyConfig): AlbDeploymentStrategyConfig {
    const type: AlbDeploymentStrategyType = strategy?.type ?? 'single';
    if (type !== 'blue-green') {
      return { type: 'single' };
    }

    return {
      type,
      blueGreenConfig: {
        productionTrafficRoute: {
          type: strategy?.blueGreenConfig?.productionTrafficRoute?.type ?? 'Linear',
          percentage: strategy?.blueGreenConfig?.productionTrafficRoute?.percentage ?? 10,
          interval: strategy?.blueGreenConfig?.productionTrafficRoute?.interval ?? 5
        },
        testTrafficRoute: strategy?.blueGreenConfig?.testTrafficRoute
          ? {
            type: strategy.blueGreenConfig.testTrafficRoute.type ?? 'Canary',
            percentage: strategy.blueGreenConfig.testTrafficRoute.percentage ?? 10
          }
          : undefined,
        terminationWaitTimeMinutes: strategy?.blueGreenConfig?.terminationWaitTimeMinutes ?? 5
      }
    };
  }

  private normaliseMonitoring(monitoring?: AlbMonitoringConfig): ApplicationLoadBalancerConfig['monitoring'] {
    const enabled = monitoring?.enabled ?? true;

    const http5xx = this.normaliseAlarmConfig(
      monitoring?.alarms?.http5xx,
      {
        ...DEFAULT_ALARM_BASELINE,
        enabled
      },
      10,
      'Sum'
    );

    const unhealthyHosts = this.normaliseAlarmConfig(
      monitoring?.alarms?.unhealthyHosts,
      {
        ...DEFAULT_ALARM_BASELINE,
        enabled,
        comparisonOperator: 'gte'
      },
      1,
      'Average'
    );

    const connectionErrors = this.normaliseAlarmConfig(
      monitoring?.alarms?.connectionErrors,
      {
        ...DEFAULT_ALARM_BASELINE,
        enabled
      },
      5,
      'Sum'
    );

    const rejectedConnections = this.normaliseAlarmConfig(
      monitoring?.alarms?.rejectedConnections,
      {
        ...DEFAULT_ALARM_BASELINE,
        enabled
      },
      1,
      'Sum'
    );

    return {
      enabled,
      alarms: {
        http5xx,
        unhealthyHosts,
        connectionErrors,
        rejectedConnections
      }
    };
  }

  private normaliseAlarmConfig(
    alarm: AlbAlarmConfig | undefined,
    defaults: Required<Omit<AlbAlarmConfig, 'tags'>>,
    defaultThreshold: number,
    defaultStatistic: string
  ): Required<AlbAlarmConfig> {
    return {
      enabled: alarm?.enabled ?? defaults.enabled,
      threshold: alarm?.threshold ?? defaultThreshold,
      evaluationPeriods: alarm?.evaluationPeriods ?? defaults.evaluationPeriods ?? 2,
      periodMinutes: alarm?.periodMinutes ?? defaults.periodMinutes ?? 5,
      comparisonOperator: alarm?.comparisonOperator ?? defaults.comparisonOperator ?? 'gte',
      treatMissingData: alarm?.treatMissingData ?? defaults.treatMissingData ?? 'not-breaching',
      statistic: alarm?.statistic ?? defaultStatistic,
      tags: { ...(alarm?.tags ?? {}) }
    };
  }

  private resolveIdleTimeout(config: Partial<ApplicationLoadBalancerConfig>): number {
    const legacy = (config as any).idleTimeout as number | undefined;
    const configured = config.idleTimeoutSeconds ?? legacy ?? 60;
    return Math.min(Math.max(1, configured), 4000);
  }

  private sanitiseTargetGroupName(name: string): string {
    return name
      .replace(/[^a-zA-Z0-9-]/g, '-')
      .substring(0, 32);
  }
}
