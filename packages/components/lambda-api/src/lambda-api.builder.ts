import {
  ConfigBuilder,
  ConfigBuilderContext,
  ComponentConfigSchema
} from '@shinobi/core';

export type LambdaRuntime =
  | 'nodejs20.x'
  | 'nodejs18.x'
  | 'python3.11'
  | 'python3.10'
  | 'python3.9';

export type LambdaArchitecture = 'x86_64' | 'arm64';
export type LambdaTracingMode = 'Active' | 'PassThrough';
export type LambdaLogFormat = 'TEXT' | 'JSON';
export type AlarmComparisonOperator = 'gt' | 'gte' | 'lt' | 'lte';
export type AlarmTreatMissingData = 'breaching' | 'not-breaching' | 'ignore' | 'missing';
export type ApiGatewayType = 'rest';
export type ApiGatewayLogFormat = 'json' | 'xml';

export interface LambdaApiAlarmConfig {
  enabled: boolean;
  threshold: number;
  evaluationPeriods: number;
  periodMinutes: number;
  comparisonOperator: AlarmComparisonOperator;
  treatMissingData: AlarmTreatMissingData;
  statistic: 'Sum' | 'Average' | 'Minimum' | 'Maximum';
  tags: Record<string, string>;
}

export interface LambdaApiMonitoringConfig {
  enabled: boolean;
  alarms: {
    lambdaErrors: LambdaApiAlarmConfig;
    lambdaThrottles: LambdaApiAlarmConfig;
    lambdaDuration: LambdaApiAlarmConfig;
    api4xxErrors: LambdaApiAlarmConfig;
    api5xxErrors: LambdaApiAlarmConfig;
  };
}

export interface LambdaApiDeploymentConfig {
  codePath: string;
  assetHash?: string;
  inlineFallbackEnabled: boolean;
}

export interface LambdaApiVpcConfig {
  enabled: boolean;
  vpcId?: string;
  subnetIds: string[];
  securityGroupIds: string[];
}

export interface LambdaApiAccessLoggingConfig {
  enabled: boolean;
  retentionDays: number;
  logFormat: ApiGatewayLogFormat;
  logGroupName?: string;
  prefix: string;
}

export interface LambdaApiCorsConfig {
  enabled: boolean;
  allowOrigins: string[];
  allowHeaders: string[];
  allowMethods: string[];
  allowCredentials: boolean;
}

export interface LambdaUsagePlanConfig {
  enabled: boolean;
  name?: string;
  throttle?: {
    rateLimit: number;
    burstLimit: number;
  };
  quota?: {
    limit: number;
    period: 'DAY' | 'WEEK' | 'MONTH';
  };
}

export interface LambdaApiGatewayConfig {
  type: ApiGatewayType;
  name?: string;
  description?: string;
  stageName: string;
  metricsEnabled: boolean;
  tracingEnabled: boolean;
  apiKeyRequired: boolean;
  throttling: {
    burstLimit: number;
    rateLimit: number;
  };
  usagePlan: LambdaUsagePlanConfig;
  logging: LambdaApiAccessLoggingConfig;
  cors: LambdaApiCorsConfig;
}

export interface LambdaApiObservabilityConfig {
  otelEnabled: boolean;
  otelLayerArn?: string;
  otelResourceAttributes: Record<string, string>;
}

export interface LambdaApiConfig {
  functionName: string;
  handler: string;
  runtime: LambdaRuntime;
  architecture: LambdaArchitecture;
  memorySize: number;
  timeoutSeconds: number;
  description?: string;
  environment: Record<string, string>;
  reservedConcurrency?: number;
  ephemeralStorageMb: number;
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
  deployment: LambdaApiDeploymentConfig;
  vpc: LambdaApiVpcConfig;
  observability: LambdaApiObservabilityConfig;
  monitoring: LambdaApiMonitoringConfig;
  securityTools: {
    falco: boolean;
  };
  hardeningProfile: string;
  removalPolicy: 'retain' | 'destroy';
  tags: Record<string, string>;
  api: LambdaApiGatewayConfig;
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
    statistic: { type: 'string', enum: ['Sum', 'Average', 'Minimum', 'Maximum'] },
    tags: {
      type: 'object',
      additionalProperties: { type: 'string' }
    }
  }
};

const MONITORING_SCHEMA: ComponentConfigSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    enabled: { type: 'boolean' },
    alarms: {
      type: 'object',
      additionalProperties: false,
      properties: {
        lambdaErrors: ALARM_SCHEMA,
        lambdaThrottles: ALARM_SCHEMA,
        lambdaDuration: ALARM_SCHEMA,
        api4xxErrors: ALARM_SCHEMA,
        api5xxErrors: ALARM_SCHEMA
      }
    }
  }
};

const DEPLOYMENT_SCHEMA: ComponentConfigSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    codePath: { type: 'string' },
    assetHash: { type: 'string' },
    inlineFallbackEnabled: { type: 'boolean' }
  },
  required: ['codePath']
};

const VPC_SCHEMA: ComponentConfigSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    enabled: { type: 'boolean' },
    vpcId: { type: 'string' },
    subnetIds: {
      type: 'array',
      items: { type: 'string' }
    },
    securityGroupIds: {
      type: 'array',
      items: { type: 'string' }
    }
  }
};

const ACCESS_LOGGING_SCHEMA: ComponentConfigSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    enabled: { type: 'boolean' },
    retentionDays: { type: 'number', minimum: 1 },
    logFormat: { type: 'string', enum: ['json', 'xml'] },
    logGroupName: { type: 'string' },
    prefix: { type: 'string' }
  }
};

const CORS_SCHEMA: ComponentConfigSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    enabled: { type: 'boolean' },
    allowOrigins: {
      type: 'array',
      items: { type: 'string' }
    },
    allowHeaders: {
      type: 'array',
      items: { type: 'string' }
    },
    allowMethods: {
      type: 'array',
      items: { type: 'string' }
    },
    allowCredentials: { type: 'boolean' }
  }
};

const USAGE_PLAN_SCHEMA: ComponentConfigSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    enabled: { type: 'boolean' },
    name: { type: 'string' },
    throttle: {
      type: 'object',
      additionalProperties: false,
      properties: {
        rateLimit: { type: 'number', minimum: 0 },
        burstLimit: { type: 'number', minimum: 0 }
      }
    },
    quota: {
      type: 'object',
      additionalProperties: false,
      properties: {
        limit: { type: 'number', minimum: 1 },
        period: { type: 'string', enum: ['DAY', 'WEEK', 'MONTH'] }
      }
    }
  }
};

const API_GATEWAY_SCHEMA: ComponentConfigSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    type: { type: 'string', enum: ['rest'] },
    name: { type: 'string' },
    description: { type: 'string' },
    stageName: { type: 'string' },
    metricsEnabled: { type: 'boolean' },
    tracingEnabled: { type: 'boolean' },
    apiKeyRequired: { type: 'boolean' },
    throttling: {
      type: 'object',
      additionalProperties: false,
      properties: {
        burstLimit: { type: 'number', minimum: 0 },
        rateLimit: { type: 'number', minimum: 0 }
      }
    },
    usagePlan: USAGE_PLAN_SCHEMA,
    logging: ACCESS_LOGGING_SCHEMA,
    cors: CORS_SCHEMA
  }
};

const OBSERVABILITY_SCHEMA: ComponentConfigSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    otelEnabled: { type: 'boolean' },
    otelLayerArn: { type: 'string' },
    otelResourceAttributes: {
      type: 'object',
      additionalProperties: { type: 'string' }
    }
  }
};

export const LAMBDA_API_CONFIG_SCHEMA: ComponentConfigSchema = {
  type: 'object',
  title: 'Lambda API Component Configuration',
  additionalProperties: false,
  properties: {
    functionName: { type: 'string' },
    handler: { type: 'string' },
    runtime: { type: 'string', enum: ['nodejs20.x', 'nodejs18.x', 'python3.11', 'python3.10', 'python3.9'] },
    architecture: { type: 'string', enum: ['x86_64', 'arm64'] },
    memorySize: { type: 'number', minimum: 128, maximum: 10240 },
    timeoutSeconds: { type: 'number', minimum: 1, maximum: 900 },
    description: { type: 'string' },
    environment: {
      type: 'object',
      additionalProperties: { type: 'string' }
    },
    reservedConcurrency: { type: 'number', minimum: 1 },
    ephemeralStorageMb: { type: 'number', minimum: 512, maximum: 10240 },
    kmsKeyArn: { type: 'string' },
    logging: {
      type: 'object',
      additionalProperties: false,
      properties: {
        logRetentionDays: { type: 'number', minimum: 1 },
        logFormat: { type: 'string', enum: ['TEXT', 'JSON'] },
        systemLogLevel: { type: 'string', enum: ['INFO', 'WARN', 'ERROR'] },
        applicationLogLevel: { type: 'string', enum: ['DEBUG', 'INFO', 'WARN', 'ERROR'] }
      }
    },
    tracing: {
      type: 'object',
      additionalProperties: false,
      properties: {
        mode: { type: 'string', enum: ['Active', 'PassThrough'] }
      }
    },
    deployment: DEPLOYMENT_SCHEMA,
    vpc: VPC_SCHEMA,
    observability: OBSERVABILITY_SCHEMA,
    monitoring: MONITORING_SCHEMA,
    securityTools: {
      type: 'object',
      additionalProperties: false,
      properties: {
        falco: { type: 'boolean' }
      }
    },
    hardeningProfile: { type: 'string' },
    removalPolicy: { type: 'string', enum: ['retain', 'destroy'] },
    tags: {
      type: 'object',
      additionalProperties: { type: 'string' }
    },
    api: API_GATEWAY_SCHEMA
  },
  required: ['handler', 'deployment', 'api', 'logging', 'monitoring', 'observability']
};

const HARDENED_FALLBACKS: LambdaApiConfig = {
  functionName: 'lambda-api-function',
  handler: 'src/api.handler',
  runtime: 'nodejs20.x',
  architecture: 'x86_64',
  memorySize: 512,
  timeoutSeconds: 30,
  description: undefined,
  environment: {},
  reservedConcurrency: undefined,
  ephemeralStorageMb: 512,
  kmsKeyArn: undefined,
  logging: {
    logRetentionDays: 30,
    logFormat: 'JSON',
    systemLogLevel: 'INFO',
    applicationLogLevel: 'INFO'
  },
  tracing: {
    mode: 'Active'
  },
  deployment: {
    codePath: './src',
    inlineFallbackEnabled: true
  },
  vpc: {
    enabled: false,
    vpcId: undefined,
    subnetIds: [],
    securityGroupIds: []
  },
  observability: {
    otelEnabled: true,
    otelLayerArn: undefined,
    otelResourceAttributes: {}
  },
  monitoring: {
    enabled: true,
    alarms: {
      lambdaErrors: {
        enabled: true,
        threshold: 5,
        evaluationPeriods: 1,
        periodMinutes: 5,
        comparisonOperator: 'gt',
        treatMissingData: 'not-breaching',
        statistic: 'Sum',
        tags: {}
      },
      lambdaThrottles: {
        enabled: true,
        threshold: 1,
        evaluationPeriods: 1,
        periodMinutes: 5,
        comparisonOperator: 'gt',
        treatMissingData: 'not-breaching',
        statistic: 'Sum',
        tags: {}
      },
      lambdaDuration: {
        enabled: true,
        threshold: 60000,
        evaluationPeriods: 2,
        periodMinutes: 5,
        comparisonOperator: 'gte',
        treatMissingData: 'not-breaching',
        statistic: 'Average',
        tags: {}
      },
      api4xxErrors: {
        enabled: true,
        threshold: 5,
        evaluationPeriods: 1,
        periodMinutes: 5,
        comparisonOperator: 'gt',
        treatMissingData: 'not-breaching',
        statistic: 'Sum',
        tags: {}
      },
      api5xxErrors: {
        enabled: true,
        threshold: 1,
        evaluationPeriods: 1,
        periodMinutes: 5,
        comparisonOperator: 'gt',
        treatMissingData: 'missing',
        statistic: 'Sum',
        tags: {}
      }
    }
  },
  securityTools: {
    falco: false
  },
  hardeningProfile: 'baseline',
  removalPolicy: 'retain',
  tags: {},
  api: {
    type: 'rest',
    stageName: 'prod',
    metricsEnabled: true,
    tracingEnabled: true,
    apiKeyRequired: false,
    throttling: {
      burstLimit: 100,
      rateLimit: 50
    },
    usagePlan: {
      enabled: false
    },
    logging: {
      enabled: true,
      retentionDays: 90,
      logFormat: 'json',
      prefix: 'access/'
    },
    cors: {
      enabled: true,
      allowOrigins: ['*'],
      allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
      allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowCredentials: false
    }
  }
};

export class LambdaApiComponentConfigBuilder extends ConfigBuilder<LambdaApiConfig> {
  constructor(builderContext: ConfigBuilderContext) {
    super(builderContext, LAMBDA_API_CONFIG_SCHEMA);
  }

  protected getHardcodedFallbacks(): Record<string, any> {
    return HARDENED_FALLBACKS;
  }

  public getSchema(): ComponentConfigSchema {
    return LAMBDA_API_CONFIG_SCHEMA;
  }

  public buildSync(): LambdaApiConfig {
    const resolved = super.buildSync() as Partial<LambdaApiConfig>;
    return this.normalise(resolved);
  }

  private normalise(config: Partial<LambdaApiConfig>): LambdaApiConfig {
    const merged: LambdaApiConfig = {
      ...HARDENED_FALLBACKS,
      ...config,
      logging: {
        ...HARDENED_FALLBACKS.logging,
        ...(config.logging ?? {})
      },
      tracing: {
        ...HARDENED_FALLBACKS.tracing,
        ...(config.tracing ?? {})
      },
      environment: {
        ...HARDENED_FALLBACKS.environment,
        ...(config.environment ?? {})
      },
      deployment: {
        ...HARDENED_FALLBACKS.deployment,
        ...(config.deployment ?? {})
      },
      vpc: {
        ...HARDENED_FALLBACKS.vpc,
        ...(config.vpc ?? {}),
        subnetIds: this.uniqueStrings(config.vpc?.subnetIds ?? HARDENED_FALLBACKS.vpc.subnetIds),
        securityGroupIds: this.uniqueStrings(config.vpc?.securityGroupIds ?? HARDENED_FALLBACKS.vpc.securityGroupIds)
      },
      observability: {
        ...HARDENED_FALLBACKS.observability,
        ...(config.observability ?? {}),
        otelResourceAttributes: {
          ...HARDENED_FALLBACKS.observability.otelResourceAttributes,
          ...(config.observability?.otelResourceAttributes ?? {})
        }
      },
      monitoring: this.normaliseMonitoring(config.monitoring),
      securityTools: {
        ...HARDENED_FALLBACKS.securityTools,
        ...(config.securityTools ?? {})
      },
      tags: {
        ...HARDENED_FALLBACKS.tags,
        ...(config.tags ?? {})
      },
      api: this.normaliseApiConfig(config.api)
    };

    merged.functionName = this.deriveFunctionName(merged.functionName);
    merged.handler = config.handler ?? HARDENED_FALLBACKS.handler;
    merged.runtime = (config.runtime ?? HARDENED_FALLBACKS.runtime) as LambdaRuntime;
    merged.architecture = (config.architecture ?? HARDENED_FALLBACKS.architecture) as LambdaArchitecture;
    merged.memorySize = config.memorySize ?? HARDENED_FALLBACKS.memorySize;
    merged.timeoutSeconds = config.timeoutSeconds ?? HARDENED_FALLBACKS.timeoutSeconds;
    merged.ephemeralStorageMb = config.ephemeralStorageMb ?? HARDENED_FALLBACKS.ephemeralStorageMb;
    merged.hardeningProfile = config.hardeningProfile ?? HARDENED_FALLBACKS.hardeningProfile;
    merged.removalPolicy = (config.removalPolicy ?? HARDENED_FALLBACKS.removalPolicy) as 'retain' | 'destroy';

    return merged;
  }

  private normaliseMonitoring(monitoring?: Partial<LambdaApiMonitoringConfig>): LambdaApiMonitoringConfig {
    const merged = {
      ...HARDENED_FALLBACKS.monitoring,
      ...(monitoring ?? {})
    } as LambdaApiMonitoringConfig;

    merged.alarms = {
      lambdaErrors: this.mergeAlarm('lambdaErrors', monitoring?.alarms?.lambdaErrors),
      lambdaThrottles: this.mergeAlarm('lambdaThrottles', monitoring?.alarms?.lambdaThrottles),
      lambdaDuration: this.mergeAlarm('lambdaDuration', monitoring?.alarms?.lambdaDuration),
      api4xxErrors: this.mergeAlarm('api4xxErrors', monitoring?.alarms?.api4xxErrors),
      api5xxErrors: this.mergeAlarm('api5xxErrors', monitoring?.alarms?.api5xxErrors)
    };

    return merged;
  }

  private mergeAlarm(key: keyof LambdaApiMonitoringConfig['alarms'],
    override?: Partial<LambdaApiAlarmConfig>): LambdaApiAlarmConfig {
    const base = HARDENED_FALLBACKS.monitoring.alarms[key];
    return {
      ...base,
      ...(override ?? {}),
      tags: {
        ...base.tags,
        ...(override?.tags ?? {})
      }
    };
  }

  private normaliseApiConfig(api?: Partial<LambdaApiGatewayConfig>): LambdaApiGatewayConfig {
    const merged: LambdaApiGatewayConfig = {
      ...HARDENED_FALLBACKS.api,
      ...(api ?? {}),
      throttling: {
        ...HARDENED_FALLBACKS.api.throttling,
        ...(api?.throttling ?? {})
      },
      usagePlan: {
        ...HARDENED_FALLBACKS.api.usagePlan,
        ...(api?.usagePlan ?? {})
      },
      logging: {
        ...HARDENED_FALLBACKS.api.logging,
        ...(api?.logging ?? {})
      },
      cors: {
        ...HARDENED_FALLBACKS.api.cors,
        ...(api?.cors ?? {}),
        allowHeaders: this.uniqueStrings(api?.cors?.allowHeaders ?? HARDENED_FALLBACKS.api.cors.allowHeaders),
        allowMethods: this.uniqueStrings(api?.cors?.allowMethods ?? HARDENED_FALLBACKS.api.cors.allowMethods),
        allowOrigins: this.uniqueStrings(api?.cors?.allowOrigins ?? HARDENED_FALLBACKS.api.cors.allowOrigins)
      }
    };

    merged.stageName = this.normaliseStageName(merged.stageName);

    return merged;
  }

  private deriveFunctionName(name?: string): string {
    if (!name || name.trim().length === 0) {
      return `${this.builderContext.spec.name}-fn`;
    }
    return name.trim();
  }

  private normaliseStageName(stage?: string): string {
    if (!stage || stage.trim().length === 0) {
      return 'prod';
    }
    return stage.trim().replace(/[^a-zA-Z0-9-_]/g, '').slice(0, 128) || 'prod';
  }

  private uniqueStrings(values: string[]): string[] {
    return Array.from(new Set((values ?? []).map((value) => value.trim()).filter(Boolean)));
  }
}
