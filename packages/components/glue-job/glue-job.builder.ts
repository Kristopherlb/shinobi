import {
  ConfigBuilder,
  ConfigBuilderContext,
  ComponentConfigSchema
} from '@shinobi/core';

export type GlueJobType = 'glueetl' | 'gluestreaming' | 'pythonshell' | 'glueray';
export type GlueWorkerType = 'Standard' | 'G.1X' | 'G.2X' | 'G.4X' | 'G.8X' | 'Z.2X';
export type RemovalPolicyOption = 'retain' | 'destroy';

export interface GlueJobCommandConfig {
  pythonVersion: string;
  scriptArguments: Record<string, string>;
}

export interface GlueJobNotificationConfig {
  notifyDelayAfter?: number;
}

export interface GlueJobExecutionPropertyConfig {
  maxConcurrentRuns?: number;
}

export interface GlueJobWorkerConfiguration {
  workerType: GlueWorkerType;
  numberOfWorkers: number;
}

export interface GlueJobLoggingGroupConfig {
  id: string;
  enabled: boolean;
  logGroupSuffix: string;
  retentionDays: number;
  removalPolicy: RemovalPolicyOption;
}

export interface GlueJobLoggingConfig {
  groups: GlueJobLoggingGroupConfig[];
}

export interface GlueJobFailureAlarmConfig {
  threshold: number;
  evaluationPeriods: number;
  periodMinutes: number;
}

export interface GlueJobDurationAlarmConfig {
  thresholdMs: number;
  evaluationPeriods: number;
  periodMinutes: number;
}

export interface GlueJobMonitoringConfig {
  enabled: boolean;
  jobFailure: GlueJobFailureAlarmConfig;
  jobDuration: GlueJobDurationAlarmConfig;
}

export interface GlueJobEncryptionConfig {
  enabled: boolean;
  kmsKeyArn?: string;
  createCustomerManagedKey: boolean;
  removalPolicy: RemovalPolicyOption;
}

export interface GlueJobSecurityConfig {
  securityConfigurationName?: string;
  encryption: GlueJobEncryptionConfig;
}

export interface GlueJobConfig {
  jobName?: string;
  description?: string;
  glueVersion: string;
  jobType: GlueJobType;
  roleArn?: string;
  scriptLocation: string;
  command: GlueJobCommandConfig;
  connections: string[];
  maxConcurrentRuns: number;
  maxRetries: number;
  timeout: number;
  notificationProperty?: GlueJobNotificationConfig;
  executionProperty?: GlueJobExecutionPropertyConfig;
  workerConfiguration: GlueJobWorkerConfiguration;
  defaultArguments: Record<string, string>;
  nonOverridableArguments: Record<string, string>;
  security: GlueJobSecurityConfig;
  logging: GlueJobLoggingConfig;
  monitoring: GlueJobMonitoringConfig;
  tags: Record<string, string>;
}

const COMMAND_SCHEMA: ComponentConfigSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    pythonVersion: {
      type: 'string',
      enum: ['2', '3', '3.6', '3.7', '3.9', '3.10'],
      default: '3'
    },
    scriptArguments: {
      type: 'object',
      additionalProperties: { type: 'string' }
    }
  }
};

const WORKER_CONFIGURATION_SCHEMA: ComponentConfigSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    workerType: {
      type: 'string',
      enum: ['Standard', 'G.1X', 'G.2X', 'G.4X', 'G.8X', 'Z.2X']
    },
    numberOfWorkers: {
      type: 'number',
      minimum: 1,
      maximum: 299
    }
  }
};

const LOGGING_GROUP_SCHEMA: ComponentConfigSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['id'],
  properties: {
    id: { type: 'string' },
    enabled: { type: 'boolean' },
    logGroupSuffix: { type: 'string' },
    retentionDays: { type: 'number', minimum: 1 },
    removalPolicy: { type: 'string', enum: ['retain', 'destroy'] }
  }
};

const LOGGING_SCHEMA: ComponentConfigSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    groups: {
      type: 'array',
      minItems: 1,
      items: LOGGING_GROUP_SCHEMA
    }
  }
};

const MONITORING_FAILURE_SCHEMA: ComponentConfigSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    threshold: { type: 'number', minimum: 0 },
    evaluationPeriods: { type: 'number', minimum: 1 },
    periodMinutes: { type: 'number', minimum: 1 }
  }
};

const MONITORING_DURATION_SCHEMA: ComponentConfigSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    thresholdMs: { type: 'number', minimum: 1 },
    evaluationPeriods: { type: 'number', minimum: 1 },
    periodMinutes: { type: 'number', minimum: 1 }
  }
};

const MONITORING_SCHEMA: ComponentConfigSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    enabled: { type: 'boolean' },
    jobFailure: MONITORING_FAILURE_SCHEMA,
    jobDuration: MONITORING_DURATION_SCHEMA
  }
};

const ENCRYPTION_SCHEMA: ComponentConfigSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    enabled: { type: 'boolean' },
    kmsKeyArn: { type: 'string' },
    createCustomerManagedKey: { type: 'boolean' },
    removalPolicy: { type: 'string', enum: ['retain', 'destroy'] }
  }
};

const SECURITY_SCHEMA: ComponentConfigSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    securityConfigurationName: { type: 'string' },
    encryption: ENCRYPTION_SCHEMA
  }
};

export const GLUE_JOB_CONFIG_SCHEMA: ComponentConfigSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['scriptLocation'],
  properties: {
    jobName: {
      type: 'string',
      pattern: '^[a-zA-Z0-9_-]+$'
    },
    description: {
      type: 'string'
    },
    glueVersion: {
      type: 'string',
      enum: ['1.0', '2.0', '3.0', '4.0']
    },
    jobType: {
      type: 'string',
      enum: ['glueetl', 'gluestreaming', 'pythonshell', 'glueray']
    },
    roleArn: {
      type: 'string'
    },
    scriptLocation: {
      type: 'string'
    },
    command: COMMAND_SCHEMA,
    connections: {
      type: 'array',
      items: { type: 'string' }
    },
    maxConcurrentRuns: {
      type: 'number',
      minimum: 1,
      maximum: 1000
    },
    maxRetries: {
      type: 'number',
      minimum: 0,
      maximum: 10
    },
    timeout: {
      type: 'number',
      minimum: 1,
      maximum: 2880
    },
    notificationProperty: {
      type: 'object',
      additionalProperties: false,
      properties: {
        notifyDelayAfter: {
          type: 'number',
          minimum: 1
        }
      }
    },
    executionProperty: {
      type: 'object',
      additionalProperties: false,
      properties: {
        maxConcurrentRuns: {
          type: 'number',
          minimum: 1,
          maximum: 1000
        }
      }
    },
    workerConfiguration: WORKER_CONFIGURATION_SCHEMA,
    defaultArguments: {
      type: 'object',
      additionalProperties: { type: 'string' }
    },
    nonOverridableArguments: {
      type: 'object',
      additionalProperties: { type: 'string' }
    },
    security: SECURITY_SCHEMA,
    logging: LOGGING_SCHEMA,
    monitoring: MONITORING_SCHEMA,
    tags: {
      type: 'object',
      additionalProperties: { type: 'string' }
    }
  }
};

const DEFAULT_LOGGING_GROUPS: GlueJobLoggingGroupConfig[] = [
  {
    id: 'security',
    enabled: true,
    logGroupSuffix: 'security',
    retentionDays: 90,
    removalPolicy: 'destroy'
  }
];

const DEFAULT_MONITORING: GlueJobMonitoringConfig = {
  enabled: false,
  jobFailure: {
    threshold: 1,
    evaluationPeriods: 1,
    periodMinutes: 5
  },
  jobDuration: {
    thresholdMs: 3_600_000,
    evaluationPeriods: 1,
    periodMinutes: 15
  }
};

const HARDENED_DEFAULTS: Partial<GlueJobConfig> = {
  glueVersion: '4.0',
  jobType: 'glueetl',
  command: {
    pythonVersion: '3',
    scriptArguments: {}
  },
  connections: [],
  maxConcurrentRuns: 1,
  maxRetries: 0,
  timeout: 2880,
  workerConfiguration: {
    workerType: 'G.1X',
    numberOfWorkers: 10
  },
  defaultArguments: {},
  nonOverridableArguments: {},
  security: {
    encryption: {
      enabled: false,
      createCustomerManagedKey: false,
      removalPolicy: 'destroy'
    }
  },
  logging: {
    groups: DEFAULT_LOGGING_GROUPS
  },
  monitoring: DEFAULT_MONITORING,
  tags: {}
};

export class GlueJobComponentConfigBuilder extends ConfigBuilder<GlueJobConfig> {
  constructor(context: ConfigBuilderContext['context'], spec: ConfigBuilderContext['spec']) {
    super({ context, spec }, GLUE_JOB_CONFIG_SCHEMA);
  }

  protected getHardcodedFallbacks(): Record<string, any> {
    return HARDENED_DEFAULTS;
  }

  public buildSync(): GlueJobConfig {
    const resolved = super.buildSync() as Partial<GlueJobConfig>;
    return this.normaliseConfig(resolved);
  }

  public getSchema(): ComponentConfigSchema {
    return GLUE_JOB_CONFIG_SCHEMA;
  }

  private normaliseConfig(config: Partial<GlueJobConfig>): GlueJobConfig {
    if (!config.scriptLocation) {
      throw new Error('glue-job configuration requires "scriptLocation" to be specified.');
    }

    const command: GlueJobCommandConfig = {
      pythonVersion: config.command?.pythonVersion ?? '3',
      scriptArguments: config.command?.scriptArguments ?? {}
    };

    const workerConfiguration: GlueJobWorkerConfiguration = {
      workerType: config.workerConfiguration?.workerType ?? 'G.1X',
      numberOfWorkers: config.workerConfiguration?.numberOfWorkers ?? 10
    };

    const security: GlueJobSecurityConfig = {
      securityConfigurationName: config.security?.securityConfigurationName,
      encryption: {
        enabled: config.security?.encryption?.enabled ?? false,
        kmsKeyArn: config.security?.encryption?.kmsKeyArn,
        createCustomerManagedKey: config.security?.encryption?.createCustomerManagedKey ?? false,
        removalPolicy: config.security?.encryption?.removalPolicy ?? 'destroy'
      }
    };

    const loggingGroups = (config.logging?.groups ?? DEFAULT_LOGGING_GROUPS).map(group => ({
      id: group.id,
      enabled: group.enabled ?? true,
      logGroupSuffix: group.logGroupSuffix ?? group.id,
      retentionDays: group.retentionDays ?? 90,
      removalPolicy: group.removalPolicy ?? 'destroy'
    }));

    const monitoring: GlueJobMonitoringConfig = {
      enabled: config.monitoring?.enabled ?? DEFAULT_MONITORING.enabled,
      jobFailure: {
        threshold: config.monitoring?.jobFailure?.threshold ?? DEFAULT_MONITORING.jobFailure.threshold,
        evaluationPeriods: config.monitoring?.jobFailure?.evaluationPeriods ?? DEFAULT_MONITORING.jobFailure.evaluationPeriods,
        periodMinutes: config.monitoring?.jobFailure?.periodMinutes ?? DEFAULT_MONITORING.jobFailure.periodMinutes
      },
      jobDuration: {
        thresholdMs: config.monitoring?.jobDuration?.thresholdMs ?? DEFAULT_MONITORING.jobDuration.thresholdMs,
        evaluationPeriods: config.monitoring?.jobDuration?.evaluationPeriods ?? DEFAULT_MONITORING.jobDuration.evaluationPeriods,
        periodMinutes: config.monitoring?.jobDuration?.periodMinutes ?? DEFAULT_MONITORING.jobDuration.periodMinutes
      }
    };

    return {
      jobName: config.jobName,
      description: config.description,
      glueVersion: config.glueVersion ?? '4.0',
      jobType: config.jobType ?? 'glueetl',
      roleArn: config.roleArn,
      scriptLocation: config.scriptLocation,
      command,
      connections: config.connections ?? [],
      maxConcurrentRuns: config.maxConcurrentRuns ?? 1,
      maxRetries: config.maxRetries ?? 0,
      timeout: config.timeout ?? 2880,
      notificationProperty: config.notificationProperty,
      executionProperty: config.executionProperty,
      workerConfiguration,
      defaultArguments: config.defaultArguments ?? {},
      nonOverridableArguments: config.nonOverridableArguments ?? {},
      security,
      logging: { groups: loggingGroups },
      monitoring,
      tags: config.tags ?? {}
    };
  }
}
