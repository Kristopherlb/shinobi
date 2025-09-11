/**
 * OpenFeature Provider Component
 * 
 * Provisions backend infrastructure for feature flagging providers.
 * Initial implementation supports AWS AppConfig as the default provider.
 * Implements Platform Feature Flagging & Canary Deployment Standard v1.0.
 */

import * as appconfig from 'aws-cdk-lib/aws-appconfig';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {
  Component,
  ComponentSpec,
  ComponentContext,
  ComponentCapabilities,
  ConfigBuilder,
  ComponentConfigSchema,
  OpenFeatureProviderCapability
} from '@platform/contracts';

/**
 * Configuration interface for OpenFeature Provider component
 */
export interface OpenFeatureProviderConfig {
  /** Provider type (aws-appconfig, launchdarkly, flagsmith, etc.) */
  providerType: 'aws-appconfig' | 'launchdarkly' | 'flagsmith';
  
  /** Application name for the feature flag provider */
  applicationName?: string;
  
  /** Environment name for feature flags */
  environmentName?: string;
  
  /** AWS AppConfig specific configuration */
  awsAppConfig?: {
    /** Configuration profile name */
    configurationProfileName?: string;
    /** Deployment strategy ID for AWS AppConfig */
    deploymentStrategyId?: string;
    /** Monitor specifications for rollback */
    monitors?: Array<{
      alarmArn: string;
      alarmRoleArn?: string;
    }>;
  };
  
  /** LaunchDarkly specific configuration */
  launchDarkly?: {
    /** LaunchDarkly project key */
    projectKey?: string;
    /** LaunchDarkly environment key */
    environmentKey?: string;
    /** SDK key for client-side flags */
    clientSideId?: string;
  };
  
  /** Flagsmith specific configuration */
  flagsmith?: {
    /** Flagsmith environment key */
    environmentKey?: string;
    /** API URL for self-hosted Flagsmith */
    apiUrl?: string;
  };
}

/**
 * Configuration schema for OpenFeature Provider component
 */
export const OPENFEATURE_PROVIDER_CONFIG_SCHEMA: ComponentConfigSchema = {
  type: 'object',
  title: 'OpenFeature Provider Configuration',
  description: 'Configuration for provisioning feature flagging backend infrastructure',
  properties: {
    providerType: {
      type: 'string',
      enum: ['aws-appconfig', 'launchdarkly', 'flagsmith'],
      description: 'Backend provider for feature flags',
      default: 'aws-appconfig'
    },
    applicationName: {
      type: 'string',
      description: 'Application name for the feature flag provider',
      minLength: 1,
      maxLength: 64
    },
    environmentName: {
      type: 'string', 
      description: 'Environment name for feature flags',
      minLength: 1,
      maxLength: 64
    },
    awsAppConfig: {
      type: 'object',
      description: 'AWS AppConfig specific configuration',
      properties: {
        configurationProfileName: {
          type: 'string',
          description: 'Configuration profile name',
          maxLength: 64
        },
        deploymentStrategyId: {
          type: 'string',
          description: 'Deployment strategy ID for gradual rollouts'
        }
      }
    }
  },
  required: ['providerType'],
  additionalProperties: false,
  defaults: {
    providerType: 'aws-appconfig',
    environmentName: 'production'
  }
};

/**
 * OpenFeature Provider Component implementing Platform Feature Flagging Standard v1.0
 */
export class OpenFeatureProviderComponent extends Component {
  private application?: appconfig.CfnApplication;
  private environment?: appconfig.CfnEnvironment;
  private configurationProfile?: appconfig.CfnConfigurationProfile;
  private deploymentStrategy?: appconfig.CfnDeploymentStrategy;
  private retrieverRole?: iam.Role;
  private config?: OpenFeatureProviderConfig;

  constructor(scope: Construct, id: string, context: ComponentContext, spec: ComponentSpec) {
    super(scope, id, context, spec);
  }

  /**
   * Synthesis phase - Create OpenFeature provider infrastructure
   */
  public synth(): void {
    this.logComponentEvent('synthesis_start', 'Starting OpenFeature Provider component synthesis', {
      providerType: this.spec.config?.providerType
    });
    
    const startTime = Date.now();
    
    try {
      // Build configuration
      this.config = this.buildConfigSync();
      
      this.logComponentEvent('config_built', 'OpenFeature Provider configuration built successfully', {
        providerType: this.config.providerType,
        applicationName: this.config.applicationName
      });
      
      // Create provider-specific infrastructure
      switch (this.config.providerType) {
        case 'aws-appconfig':
          this.createAwsAppConfigInfrastructure();
          break;
        case 'launchdarkly':
          this.createLaunchDarklyInfrastructure();
          break;
        case 'flagsmith':
          this.createFlagsmithInfrastructure();
          break;
        default:
          throw new Error(`Unsupported provider type: ${this.config.providerType}`);
      }
      
      // Register capabilities
      this.registerCapability('openfeature:provider', this.buildProviderCapability());
      
      // Log successful synthesis completion
      const duration = Date.now() - startTime;
      this.logPerformanceMetric('component_synthesis', duration, {
        resourcesCreated: Object.keys(this.capabilities).length
      });
      
      this.logComponentEvent('synthesis_complete', 'OpenFeature Provider component synthesis completed successfully', {
        providerType: this.config.providerType,
        resourcesCreated: Object.keys(this.constructs).size
      });
      
    } catch (error) {
      this.logError(error as Error, 'component synthesis', {
        componentType: 'openfeature-provider',
        stage: 'synthesis'
      });
      throw error;
    }
  }

  /**
   * Get the capabilities this component provides
   */
  public getCapabilities(): ComponentCapabilities {
    this.validateSynthesized();
    return this.capabilities;
  }

  /**
   * Get the component type identifier
   */
  public getType(): string {
    return 'openfeature-provider';
  }

  /**
   * Create AWS AppConfig infrastructure for feature flagging
   */
  private createAwsAppConfigInfrastructure(): void {
    const applicationName = this.config!.applicationName || `${this.context.serviceName}-features`;
    const environmentName = this.config!.environmentName || this.context.environment;
    
    // Create AppConfig Application
    this.application = new appconfig.CfnApplication(this, 'Application', {
      name: applicationName,
      description: `Feature flags for ${this.context.serviceName} service`
    });
    
    this.applyStandardTags(this.application, {
      'appconfig-application': applicationName,
      'openfeature-provider': 'aws-appconfig'
    });

    // Create AppConfig Environment
    this.environment = new appconfig.CfnEnvironment(this, 'Environment', {
      applicationId: this.application.ref,
      name: environmentName,
      description: `${environmentName} environment for feature flags`,
      monitors: this.config!.awsAppConfig?.monitors?.map(monitor => ({
        alarmArn: monitor.alarmArn,
        alarmRoleArn: monitor.alarmRoleArn
      }))
    });

    this.applyStandardTags(this.environment, {
      'appconfig-environment': environmentName,
      'openfeature-provider': 'aws-appconfig'
    });

    // Create Configuration Profile for feature flags
    const profileName = this.config!.awsAppConfig?.configurationProfileName || 'feature-flags';
    this.configurationProfile = new appconfig.CfnConfigurationProfile(this, 'ConfigurationProfile', {
      applicationId: this.application.ref,
      name: profileName,
      locationUri: 'hosted',  // Hosted configuration
      type: 'AWS.AppConfig.FeatureFlags',
      description: 'OpenFeature-compatible feature flags configuration'
    });

    this.applyStandardTags(this.configurationProfile, {
      'appconfig-profile': profileName,
      'openfeature-provider': 'aws-appconfig'
    });

    // Create custom deployment strategy for progressive delivery
    this.deploymentStrategy = new appconfig.CfnDeploymentStrategy(this, 'DeploymentStrategy', {
      name: `${this.spec.name}-progressive-rollout`,
      description: 'Progressive rollout strategy for feature flags',
      deploymentDurationInMinutes: 10,
      growthFactor: 20, // 20% traffic increase
      growthType: 'LINEAR',
      finalBakeTimeInMinutes: 5,
      replicateTo: 'SSM_DOCUMENT'
    });

    // Create IAM role for retrieving configuration
    this.retrieverRole = new iam.Role(this, 'RetrieverRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      description: 'Role for retrieving AppConfig feature flags',
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole')
      ]
    });

    // Grant permissions to retrieve configuration
    this.retrieverRole.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'appconfig:StartConfigurationSession',
        'appconfig:GetConfiguration'
      ],
      resources: [
        `arn:aws:appconfig:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:application/${this.application.ref}`,
        `arn:aws:appconfig:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:application/${this.application.ref}/environment/${this.environment.ref}`,
        `arn:aws:appconfig:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:application/${this.application.ref}/configurationprofile/${this.configurationProfile.ref}`
      ]
    }));

    // Register constructs
    this.registerConstruct('application', this.application);
    this.registerConstruct('environment', this.environment);
    this.registerConstruct('configurationProfile', this.configurationProfile);
    this.registerConstruct('deploymentStrategy', this.deploymentStrategy);
    this.registerConstruct('retrieverRole', this.retrieverRole);

    this.logResourceCreation('aws-appconfig-application', applicationName, {
      applicationId: this.application.ref,
      environmentName: environmentName,
      configurationProfile: profileName
    });
  }

  /**
   * Create LaunchDarkly infrastructure (placeholder for future implementation)
   */
  private createLaunchDarklyInfrastructure(): void {
    // LaunchDarkly is a SaaS service, so infrastructure creation is minimal
    // This would typically involve creating API keys and project configurations
    // Implementation would depend on LaunchDarkly CDK constructs or custom resources
    
    this.logComponentEvent('provider_configured', 'LaunchDarkly provider configured', {
      providerType: 'launchdarkly',
      projectKey: this.config!.launchDarkly?.projectKey
    });

    // Register minimal construct for consistency
    const placeholder = new cdk.CfnOutput(this, 'LaunchDarklyConfig', {
      value: 'LaunchDarkly configuration managed externally',
      description: 'LaunchDarkly provider configuration reference'
    });
    
    this.registerConstruct('providerConfig', placeholder);
  }

  /**
   * Create Flagsmith infrastructure (placeholder for future implementation)
   */
  private createFlagsmithInfrastructure(): void {
    // Flagsmith can be self-hosted or SaaS
    // This would involve either deploying Flagsmith containers or configuring SaaS access
    
    this.logComponentEvent('provider_configured', 'Flagsmith provider configured', {
      providerType: 'flagsmith',
      environmentKey: this.config!.flagsmith?.environmentKey
    });

    // Register minimal construct for consistency
    const placeholder = new cdk.CfnOutput(this, 'FlagsmithConfig', {
      value: 'Flagsmith configuration managed externally',
      description: 'Flagsmith provider configuration reference'
    });
    
    this.registerConstruct('providerConfig', placeholder);
  }

  /**
   * Build provider capability data shape
   */
  private buildProviderCapability(): OpenFeatureProviderCapability {
    const baseCapability: OpenFeatureProviderCapability = {
      providerType: this.config!.providerType,
      connectionConfig: {},
      environmentVariables: {}
    };

    switch (this.config!.providerType) {
      case 'aws-appconfig':
        baseCapability.connectionConfig = {
          applicationId: this.application!.ref,
          environmentId: this.environment!.ref,
          configurationProfileId: this.configurationProfile!.ref
        };
        baseCapability.environmentVariables = {
          OPENFEATURE_PROVIDER: 'aws-appconfig',
          APPCONFIG_APPLICATION_ID: this.application!.ref,
          APPCONFIG_ENVIRONMENT_ID: this.environment!.ref,
          APPCONFIG_CONFIGURATION_PROFILE_ID: this.configurationProfile!.ref,
          AWS_REGION: cdk.Stack.of(this).region
        };
        break;
      case 'launchdarkly':
        baseCapability.connectionConfig = {
          projectKey: this.config!.launchDarkly?.projectKey || '',
          environmentKey: this.config!.launchDarkly?.environmentKey || ''
        };
        baseCapability.environmentVariables = {
          OPENFEATURE_PROVIDER: 'launchdarkly',
          LAUNCHDARKLY_PROJECT_KEY: this.config!.launchDarkly?.projectKey || '',
          LAUNCHDARKLY_ENVIRONMENT_KEY: this.config!.launchDarkly?.environmentKey || ''
        };
        break;
      case 'flagsmith':
        baseCapability.connectionConfig = {
          environmentKey: this.config!.flagsmith?.environmentKey || '',
          apiUrl: this.config!.flagsmith?.apiUrl || 'https://api.flagsmith.com/api/v1/'
        };
        baseCapability.environmentVariables = {
          OPENFEATURE_PROVIDER: 'flagsmith',
          FLAGSMITH_ENVIRONMENT_KEY: this.config!.flagsmith?.environmentKey || '',
          FLAGSMITH_API_URL: this.config!.flagsmith?.apiUrl || 'https://api.flagsmith.com/api/v1/'
        };
        break;
    }

    return baseCapability;
  }

  /**
   * Simplified config building for component
   */
  private buildConfigSync(): OpenFeatureProviderConfig {
    const config: OpenFeatureProviderConfig = {
      providerType: this.spec.config?.providerType || 'aws-appconfig',
      applicationName: this.spec.config?.applicationName,
      environmentName: this.spec.config?.environmentName || this.context.environment,
      awsAppConfig: this.spec.config?.awsAppConfig,
      launchDarkly: this.spec.config?.launchDarkly,
      flagsmith: this.spec.config?.flagsmith
    };

    return config;
  }
}