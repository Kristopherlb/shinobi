import {
  ConfigBuilder,
  ConfigBuilderContext,
  ComponentConfigSchema
} from '@shinobi/core';
import { ComponentContext, ComponentSpec } from '@platform/contracts';

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
  protocol?: 'tcp' | 'udp' | 'icmp';
  cidr?: string;
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
  hardeningProfile: string;
  tags: Record<string, string>;
}

const INGRESS_RULE_DEFINITION = {
  type: 'object',
  additionalProperties: false,
  required: ['port'],
  properties: {
    port: {
      type: 'number',
      minimum: 1,
      maximum: 65535
    },
    protocol: {
      type: 'string',
      enum: ['tcp', 'udp', 'icmp'],
      default: 'tcp'
    },
    cidr: {
      type: 'string',
      pattern: '^(?:\\d{1,3}\\.){3}\\d{1,3}/\\d{1,2}$'
    },
    description: {
      type: 'string'
    }
  }
};

const DEFAULT_ACTION_DEFINITION = {
  type: 'object',
  additionalProperties: false,
  required: ['type'],
  properties: {
    type: {
      type: 'string',
      enum: ['fixed-response', 'redirect', 'forward']
    },
    fixedResponse: {
      type: 'object',
      additionalProperties: false,
      properties: {
        statusCode: { type: 'number', minimum: 100, maximum: 599 },
        contentType: { type: 'string' },
        messageBody: { type: 'string' }
      }
    },
    redirect: {
      type: 'object',
      additionalProperties: false,
      required: ['redirectUrl'],
      properties: {
        redirectUrl: {
          type: 'string',
          pattern: '^https?://'
        }
      }
    }
  }
};

const LISTENER_DEFINITION = {
  type: 'object',
  additionalProperties: false,
  required: ['port', 'protocol'],
  properties: {
    port: {
      type: 'number',
      minimum: 1,
      maximum: 65535
    },
    protocol: {
      type: 'string',
      enum: ['HTTP', 'HTTPS']
    },
    certificateArn: {
      type: 'string',
      pattern: '^arn:aws:acm:[a-z0-9-]+:\\d{12}:certificate/[a-f0-9-]+$'
    },
    sslPolicy: {
      type: 'string',
      pattern: '^ELBSecurityPolicy-'
    },
    redirectToHttps: {
      type: 'boolean'
    },
    defaultAction: DEFAULT_ACTION_DEFINITION
  }
};

const HEALTH_CHECK_DEFINITION = {
  type: 'object',
  additionalProperties: false,
  properties: {
    enabled: { type: 'boolean' },
    path: { type: 'string' },
    protocol: {
      type: 'string',
      enum: ['HTTP', 'HTTPS']
    },
    port: {
      type: 'number',
      minimum: 1,
      maximum: 65535
    },
    healthyThresholdCount: {
      type: 'number',
      minimum: 2,
      maximum: 10
    },
    unhealthyThresholdCount: {
      type: 'number',
      minimum: 2,
      maximum: 10
    },
    timeoutSeconds: {
      type: 'number',
      minimum: 2,
      maximum: 120
    },
    intervalSeconds: {
      type: 'number',
      minimum: 5,
      maximum: 300
    },
    matcher: { type: 'string' }
  }
};

const TARGET_GROUP_DEFINITION = {
  type: 'object',
  additionalProperties: false,
  required: ['name', 'port', 'protocol', 'targetType'],
  properties: {
    name: {
      type: 'string',
      pattern: '^[a-zA-Z0-9-]+$',
      maxLength: 32
    },
    port: {
      type: 'number',
      minimum: 1,
      maximum: 65535
    },
    protocol: {
      type: 'string',
      enum: ['HTTP', 'HTTPS']
    },
    targetType: {
      type: 'string',
      enum: ['instance', 'ip', 'lambda']
    },
    healthCheck: HEALTH_CHECK_DEFINITION,
    stickiness: {
      type: 'object',
      additionalProperties: false,
      properties: {
        enabled: { type: 'boolean' },
        durationSeconds: {
          type: 'number',
          minimum: 1,
          maximum: 604800
        }
      }
    }
  }
};

const ALARM_DEFINITION = {
  type: 'object',
  additionalProperties: false,
  properties: {
    enabled: { type: 'boolean' },
    threshold: { type: 'number' },
    evaluationPeriods: { type: 'number', minimum: 1 },
    periodMinutes: { type: 'number', minimum: 1 },
    comparisonOperator: {
      type: 'string',
      enum: ['gt', 'gte', 'lt', 'lte']
    },
    treatMissingData: {
      type: 'string',
      enum: ['breaching', 'not-breaching', 'ignore', 'missing']
    },
    statistic: { type: 'string' },
    tags: {
      type: 'object',
      additionalProperties: { type: 'string' }
    }
  }
};

export const APPLICATION_LOAD_BALANCER_CONFIG_SCHEMA: ComponentConfigSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    loadBalancerName: {
      type: 'string',
      pattern: '^[a-zA-Z0-9-]+$',
      maxLength: 32
    },
    scheme: {
      type: 'string',
      enum: ['internet-facing', 'internal']
    },
    ipAddressType: {
      type: 'string',
      enum: ['ipv4', 'dualstack']
    },
    vpc: {
      type: 'object',
      additionalProperties: false,
      properties: {
        vpcId: { type: 'string' },
        subnetIds: {
          type: 'array',
          items: {
            type: 'string',
            pattern: '^subnet-[a-f0-9]+'
          }
        },
        subnetType: {
          type: 'string',
          enum: ['public', 'private']
        }
      }
    },
    securityGroups: {
      type: 'object',
      additionalProperties: false,
      properties: {
        create: { type: 'boolean' },
        securityGroupIds: {
          type: 'array',
          items: {
            type: 'string',
            pattern: '^sg-[a-f0-9]+'
          }
        },
        ingress: {
          type: 'array',
          items: INGRESS_RULE_DEFINITION
        }
      }
    },
    accessLogs: {
      type: 'object',
      additionalProperties: false,
      properties: {
        enabled: { type: 'boolean' },
        bucketName: { type: 'string' },
        bucket: { type: 'string' },
        prefix: { type: 'string' },
        retentionDays: { type: 'number', minimum: 1 },
        removalPolicy: {
          type: 'string',
          enum: ['retain', 'destroy']
        }
      }
    },
    listeners: {
      type: 'array',
      minItems: 1,
      items: LISTENER_DEFINITION
    },
    targetGroups: {
      type: 'array',
      items: TARGET_GROUP_DEFINITION
    },
    deletionProtection: { type: 'boolean' },
    idleTimeoutSeconds: {
      type: 'number',
      minimum: 1,
      maximum: 4000
    },
    idleTimeout: {
      type: 'number',
      minimum: 1,
      maximum: 4000
    },
    deploymentStrategy: {
      type: 'object',
      additionalProperties: false,
      properties: {
        type: {
          type: 'string',
          enum: ['single', 'blue-green']
        },
        blueGreenConfig: {
          type: 'object',
          additionalProperties: false,
          properties: {
            productionTrafficRoute: {
              type: 'object',
              additionalProperties: false,
              properties: {
                type: {
                  type: 'string',
                  enum: ['AllAtOnce', 'Linear', 'Canary']
                },
                percentage: { type: 'number', minimum: 1, maximum: 100 },
                interval: { type: 'number', minimum: 1, maximum: 60 }
              }
            },
            testTrafficRoute: {
              type: 'object',
              additionalProperties: false,
              properties: {
                type: {
                  type: 'string',
                  enum: ['AllAtOnce', 'Linear', 'Canary']
                },
                percentage: { type: 'number', minimum: 1, maximum: 100 }
              }
            },
            terminationWaitTimeMinutes: {
              type: 'number',
              minimum: 0,
              maximum: 2880
            }
          }
        }
      }
    },
    monitoring: {
      type: 'object',
      additionalProperties: false,
      properties: {
        enabled: { type: 'boolean' },
        alarms: {
          type: 'object',
          additionalProperties: false,
          properties: {
            http5xx: ALARM_DEFINITION,
            unhealthyHosts: ALARM_DEFINITION,
            connectionErrors: ALARM_DEFINITION,
            rejectedConnections: ALARM_DEFINITION
          }
        }
      }
    },
    hardeningProfile: { type: 'string' },
    tags: {
      type: 'object',
      additionalProperties: { type: 'string' }
    }
  }
};

const DEFAULT_HTTP_INGRESS: Required<AlbIngressRuleConfig>[] = [
  {
    port: 80,
    protocol: 'tcp',
    cidr: '0.0.0.0/0',
    description: 'Allow HTTP'
  },
  {
    port: 443,
    protocol: 'tcp',
    cidr: '0.0.0.0/0',
    description: 'Allow HTTPS'
  }
];

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
        enabled: false,
        retentionDays: 30,
        removalPolicy: 'destroy'
      },
      listeners: [
        {
          port: 80,
          protocol: 'HTTP',
          redirectToHttps: false
        }
      ],
      targetGroups: [],
      deletionProtection: false,
      idleTimeoutSeconds: 60,
      deploymentStrategy: {
        type: 'single'
      },
      monitoring: {
        enabled: false,
        alarms: {
          http5xx: { ...DEFAULT_ALARM_BASELINE },
          unhealthyHosts: { ...DEFAULT_ALARM_BASELINE },
          connectionErrors: { ...DEFAULT_ALARM_BASELINE },
          rejectedConnections: { ...DEFAULT_ALARM_BASELINE }
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

    const idleTimeoutSeconds = this.resolveIdleTimeout(config);
    const deletionProtection = config.deletionProtection ?? false;
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
    const ingress = (securityGroups?.ingress ?? DEFAULT_HTTP_INGRESS).map(rule => ({
      port: rule.port,
      protocol: rule.protocol ?? 'tcp',
      cidr: rule.cidr ?? '0.0.0.0/0',
      description: rule.description ?? `Allow ${rule.protocol ?? 'tcp'} ${rule.port}`
    }));

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
    const enabled = monitoring?.enabled ?? false;

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
