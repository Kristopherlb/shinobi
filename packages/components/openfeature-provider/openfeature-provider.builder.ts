import {
  ConfigBuilder,
  ConfigBuilderContext,
  ComponentConfigSchema
} from '@shinobi/core';

export type OpenFeatureProviderKind = 'aws-appconfig' | 'launchdarkly' | 'flagsmith';

export interface AwsAppConfigMonitorConfig {
  alarmArn: string;
  alarmRoleArn?: string;
}

export interface AwsAppConfigDeploymentConfig {
  name: string;
  deploymentDurationMinutes: number;
  growthFactor: number;
  growthType: 'LINEAR' | 'EXPONENTIAL';
  finalBakeTimeInMinutes: number;
  replicateTo: 'SSM_DOCUMENT';
}

export interface AwsAppConfigProviderConfig {
  applicationName: string;
  environmentName: string;
  configurationProfileName: string;
  deploymentStrategy: AwsAppConfigDeploymentConfig;
  monitors: AwsAppConfigMonitorConfig[];
  retrieverServicePrincipal: string;
}

export interface LaunchDarklyProviderConfig {
  projectKey: string;
  environmentKey: string;
  clientSideId?: string;
}

export interface FlagsmithProviderConfig {
  environmentKey: string;
  apiUrl: string;
}

export interface OpenFeatureProviderComponentConfig {
  provider: OpenFeatureProviderKind;
  awsAppConfig?: AwsAppConfigProviderConfig;
  launchDarkly?: LaunchDarklyProviderConfig;
  flagsmith?: FlagsmithProviderConfig;
  tags: Record<string, string>;
}

const MONITOR_SCHEMA: ComponentConfigSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    alarmArn: { type: 'string' },
    alarmRoleArn: { type: 'string' }
  },
  required: ['alarmArn']
};

const AWS_APPCONFIG_SCHEMA: ComponentConfigSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    applicationName: { type: 'string' },
    environmentName: { type: 'string' },
    configurationProfileName: { type: 'string' },
    deploymentStrategy: {
      type: 'object',
      additionalProperties: false,
      properties: {
        name: { type: 'string' },
        deploymentDurationMinutes: { type: 'number', minimum: 0 },
        growthFactor: { type: 'number', minimum: 1, maximum: 100 },
        growthType: { type: 'string', enum: ['LINEAR', 'EXPONENTIAL'] },
        finalBakeTimeInMinutes: { type: 'number', minimum: 0 },
        replicateTo: { type: 'string', enum: ['SSM_DOCUMENT'] }
      }
    },
    monitors: {
      type: 'array',
      items: MONITOR_SCHEMA,
      default: []
    },
    retrieverServicePrincipal: { type: 'string' }
  }
};

const LAUNCHDARKLY_SCHEMA: ComponentConfigSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    projectKey: { type: 'string' },
    environmentKey: { type: 'string' },
    clientSideId: { type: 'string' }
  }
};

const FLAGSMITH_SCHEMA: ComponentConfigSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    environmentKey: { type: 'string' },
    apiUrl: { type: 'string' }
  }
};

export const OPENFEATURE_PROVIDER_CONFIG_SCHEMA: ComponentConfigSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    provider: {
      type: 'string',
      enum: ['aws-appconfig', 'launchdarkly', 'flagsmith']
    },
    awsAppConfig: AWS_APPCONFIG_SCHEMA,
    launchDarkly: LAUNCHDARKLY_SCHEMA,
    flagsmith: FLAGSMITH_SCHEMA,
    tags: {
      type: 'object',
      additionalProperties: { type: 'string' }
    }
  },
  required: ['provider']
};

const DEFAULT_DEPLOYMENT: AwsAppConfigDeploymentConfig = {
  name: 'progressive-rollout',
  deploymentDurationMinutes: 10,
  growthFactor: 20,
  growthType: 'LINEAR',
  finalBakeTimeInMinutes: 5,
  replicateTo: 'SSM_DOCUMENT'
};

const DEFAULT_CONFIG: OpenFeatureProviderComponentConfig = {
  provider: 'aws-appconfig',
  awsAppConfig: {
    applicationName: '',
    environmentName: '',
    configurationProfileName: 'feature-flags',
    deploymentStrategy: DEFAULT_DEPLOYMENT,
    monitors: [],
    retrieverServicePrincipal: 'lambda.amazonaws.com'
  },
  launchDarkly: {
    projectKey: '',
    environmentKey: '',
    clientSideId: undefined
  },
  flagsmith: {
    environmentKey: '',
    apiUrl: 'https://api.flagsmith.com/api/v1/'
  },
  tags: {}
};

export class OpenFeatureProviderComponentConfigBuilder extends ConfigBuilder<OpenFeatureProviderComponentConfig> {
  constructor(builderContext: ConfigBuilderContext) {
    super(builderContext, OPENFEATURE_PROVIDER_CONFIG_SCHEMA);
  }

  protected getHardcodedFallbacks(): Partial<OpenFeatureProviderComponentConfig> {
    return DEFAULT_CONFIG;
  }

  public buildSync(): OpenFeatureProviderComponentConfig {
    const resolved = super.buildSync() as Partial<OpenFeatureProviderComponentConfig>;
    return this.normalise(resolved);
  }

  public getSchema(): ComponentConfigSchema {
    return OPENFEATURE_PROVIDER_CONFIG_SCHEMA;
  }

  private normalise(config: Partial<OpenFeatureProviderComponentConfig>): OpenFeatureProviderComponentConfig {
    const provider = (config.provider ?? DEFAULT_CONFIG.provider) as OpenFeatureProviderKind;

    const awsAppConfig = this.normaliseAwsAppConfig(config.awsAppConfig, provider);
    const launchDarkly = this.normaliseLaunchDarkly(config.launchDarkly);
    const flagsmith = this.normaliseFlagsmith(config.flagsmith);

    return {
      provider,
      awsAppConfig,
      launchDarkly,
      flagsmith,
      tags: {
        ...DEFAULT_CONFIG.tags,
        ...(config.tags ?? {})
      }
    };
  }

  private normaliseAwsAppConfig(
    config: Partial<AwsAppConfigProviderConfig> | undefined,
    provider: OpenFeatureProviderKind
  ): AwsAppConfigProviderConfig | undefined {
    if (provider !== 'aws-appconfig') {
      return undefined;
    }

    const serviceName = this.builderContext.context.serviceName ?? 'service';
    const environment = this.builderContext.context.environment ?? 'env';

    const deployment = {
      ...DEFAULT_DEPLOYMENT,
      ...(config?.deploymentStrategy ?? {})
    } satisfies AwsAppConfigDeploymentConfig;

    return {
      applicationName: config?.applicationName?.trim() || `${serviceName}-features`,
      environmentName: config?.environmentName?.trim() || environment,
      configurationProfileName: config?.configurationProfileName?.trim() || DEFAULT_CONFIG.awsAppConfig!.configurationProfileName,
      deploymentStrategy: deployment,
      monitors: (config?.monitors ?? []).map((monitor) => ({
        alarmArn: monitor.alarmArn,
        alarmRoleArn: monitor.alarmRoleArn
      })),
      retrieverServicePrincipal: config?.retrieverServicePrincipal?.trim() || DEFAULT_CONFIG.awsAppConfig!.retrieverServicePrincipal
    };
  }

  private normaliseLaunchDarkly(config: Partial<LaunchDarklyProviderConfig> | undefined): LaunchDarklyProviderConfig | undefined {
    if (!config) {
      return DEFAULT_CONFIG.launchDarkly;
    }

    return {
      projectKey: config.projectKey?.trim() ?? DEFAULT_CONFIG.launchDarkly!.projectKey,
      environmentKey: config.environmentKey?.trim() ?? DEFAULT_CONFIG.launchDarkly!.environmentKey,
      clientSideId: config.clientSideId?.trim() || undefined
    };
  }

  private normaliseFlagsmith(config: Partial<FlagsmithProviderConfig> | undefined): FlagsmithProviderConfig | undefined {
    if (!config) {
      return DEFAULT_CONFIG.flagsmith;
    }

    return {
      environmentKey: config.environmentKey?.trim() ?? DEFAULT_CONFIG.flagsmith!.environmentKey,
      apiUrl: config.apiUrl?.trim() ?? DEFAULT_CONFIG.flagsmith!.apiUrl
    };
  }
}
