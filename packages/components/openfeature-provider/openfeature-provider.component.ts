/**
 * OpenFeature Provider Component
 *
 * Provisions feature flag provider infrastructure based on the resolved
 * configuration produced by the shared ConfigBuilder. The component no longer
 * inspects the compliance framework directly – all framework-specific behaviour
 * must be encoded in `/config/<framework>.yml`.
 */

import * as appconfig from 'aws-cdk-lib/aws-appconfig';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {
  BaseComponent,
  ComponentSpec,
  ComponentContext,
  ComponentCapabilities
} from '@shinobi/core';
import {
  AwsAppConfigProviderConfig,
  FlagsmithProviderConfig,
  LaunchDarklyProviderConfig,
  OpenFeatureProviderComponentConfig,
  OpenFeatureProviderComponentConfigBuilder,
  OpenFeatureProviderKind
} from './openfeature-provider.builder.ts';
import { OpenFeatureProviderCapability } from '@shinobi/core/platform/contracts/openfeature-interfaces';

export class OpenFeatureProviderComponent extends BaseComponent {
  private config?: OpenFeatureProviderComponentConfig;
  private application?: appconfig.CfnApplication;
  private environment?: appconfig.CfnEnvironment;
  private configurationProfile?: appconfig.CfnConfigurationProfile;
  private deploymentStrategy?: appconfig.CfnDeploymentStrategy;
  private retrieverRole?: iam.Role;

  constructor(scope: Construct, id: string, context: ComponentContext, spec: ComponentSpec) {
    super(scope, id, context, spec);
  }

  public synth(): void {
    this.logComponentEvent('synthesis_start', 'Starting OpenFeature provider synthesis');

    try {
      this.config = new OpenFeatureProviderComponentConfigBuilder({
        context: this.context,
        spec: this.spec
      }).buildSync();

      switch (this.config.provider) {
        case 'aws-appconfig':
          this.createAwsAppConfigInfrastructure(this.config.awsAppConfig!);
          break;
        case 'launchdarkly':
          this.createLaunchDarklyPlaceholder(this.config.launchDarkly);
          break;
        case 'flagsmith':
          this.createFlagsmithPlaceholder(this.config.flagsmith);
          break;
      }

      this.registerCapability('openfeature:provider', this.buildProviderCapability());
      this.logComponentEvent('synthesis_complete', 'OpenFeature provider synthesis completed');
    } catch (error) {
      this.logError(error as Error, 'openfeature-provider synthesis');
      throw error;
    }
  }

  public getCapabilities(): ComponentCapabilities {
    this.validateSynthesized();
    return this.capabilities;
  }

  public getType(): string {
    return 'openfeature-provider';
  }

  private createAwsAppConfigInfrastructure(config: AwsAppConfigProviderConfig): void {
    const applicationName = config.applicationName;
    const environmentName = config.environmentName;

    this.application = new appconfig.CfnApplication(this, 'Application', {
      name: applicationName,
      description: `Feature flags for ${this.context.serviceName}`
    });

    this.applyStandardTags(this.application, {
      'openfeature-provider': 'aws-appconfig',
      ...(this.config?.tags ?? {})
    });

    this.environment = new appconfig.CfnEnvironment(this, 'Environment', {
      applicationId: this.application.ref,
      name: environmentName,
      description: `${environmentName} environment for ${this.context.serviceName} feature flags`,
      monitors: config.monitors.map(monitor => ({
        alarmArn: monitor.alarmArn,
        alarmRoleArn: monitor.alarmRoleArn
      }))
    });

    this.applyStandardTags(this.environment, {
      'openfeature-provider': 'aws-appconfig',
      ...(this.config?.tags ?? {})
    });

    this.configurationProfile = new appconfig.CfnConfigurationProfile(this, 'ConfigurationProfile', {
      applicationId: this.application.ref,
      name: config.configurationProfileName,
      locationUri: 'hosted',
      type: 'AWS.AppConfig.FeatureFlags',
      description: 'OpenFeature-compatible feature flags configuration'
    });

    this.applyStandardTags(this.configurationProfile, {
      'openfeature-provider': 'aws-appconfig',
      ...(this.config?.tags ?? {})
    });

    this.deploymentStrategy = new appconfig.CfnDeploymentStrategy(this, 'DeploymentStrategy', {
      name: config.deploymentStrategy.name,
      deploymentDurationInMinutes: config.deploymentStrategy.deploymentDurationMinutes,
      growthFactor: config.deploymentStrategy.growthFactor,
      growthType: config.deploymentStrategy.growthType,
      finalBakeTimeInMinutes: config.deploymentStrategy.finalBakeTimeInMinutes,
      replicateTo: config.deploymentStrategy.replicateTo
    });

    this.retrieverRole = new iam.Role(this, 'RetrieverRole', {
      assumedBy: new iam.ServicePrincipal(config.retrieverServicePrincipal),
      description: 'Role for retrieving AppConfig feature flags',
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole')
      ]
    });

    this.retrieverRole.addToPrincipalPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['appconfig:StartConfigurationSession', 'appconfig:GetConfiguration'],
      resources: [
        `arn:aws:appconfig:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:application/${this.application.ref}`,
        `arn:aws:appconfig:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:application/${this.application.ref}/environment/${this.environment.ref}`,
        `arn:aws:appconfig:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:application/${this.application.ref}/configurationprofile/${this.configurationProfile.ref}`
      ]
    }));

    this.applyStandardTags(this.retrieverRole, {
      'openfeature-provider': 'aws-appconfig',
      ...(this.config?.tags ?? {})
    });

    this.registerConstruct('main', this.application);
    this.registerConstruct('application', this.application);
    this.registerConstruct('environment', this.environment);
    this.registerConstruct('configurationProfile', this.configurationProfile);
    this.registerConstruct('deploymentStrategy', this.deploymentStrategy);
    this.registerConstruct('retrieverRole', this.retrieverRole);
  }

  private createLaunchDarklyPlaceholder(config: LaunchDarklyProviderConfig | undefined): void {
    const output = new cdk.CfnOutput(this, 'LaunchDarklyConfiguration', {
      description: 'LaunchDarkly configuration is managed externally',
      value: JSON.stringify({
        projectKey: config?.projectKey ?? '',
        environmentKey: config?.environmentKey ?? '',
        clientSideId: config?.clientSideId ?? ''
      })
    });

    this.registerConstruct('main', output);
    this.registerConstruct('providerConfig', output);
  }

  private createFlagsmithPlaceholder(config: FlagsmithProviderConfig | undefined): void {
    const output = new cdk.CfnOutput(this, 'FlagsmithConfiguration', {
      description: 'Flagsmith configuration is managed externally',
      value: JSON.stringify({
        environmentKey: config?.environmentKey ?? '',
        apiUrl: config?.apiUrl ?? ''
      })
    });

    this.registerConstruct('main', output);
    this.registerConstruct('providerConfig', output);
  }

  private buildProviderCapability(): OpenFeatureProviderCapability {
    const capability: OpenFeatureProviderCapability = {
      providerType: this.config!.provider,
      connectionConfig: {},
      environmentVariables: {}
    };

    switch (this.config!.provider) {
      case 'aws-appconfig':
        capability.connectionConfig = {
          applicationId: this.application!.ref,
          environmentId: this.environment!.ref,
          configurationProfileId: this.configurationProfile!.ref
        };
        capability.environmentVariables = {
          OPENFEATURE_PROVIDER: 'aws-appconfig',
          APPCONFIG_APPLICATION_ID: this.application!.ref,
          APPCONFIG_ENVIRONMENT_ID: this.environment!.ref,
          APPCONFIG_CONFIGURATION_PROFILE_ID: this.configurationProfile!.ref,
          AWS_REGION: cdk.Stack.of(this).region
        };
        break;
      case 'launchdarkly':
        capability.connectionConfig = {
          projectKey: this.config!.launchDarkly?.projectKey ?? '',
          environmentKey: this.config!.launchDarkly?.environmentKey ?? ''
        };
        capability.environmentVariables = {
          OPENFEATURE_PROVIDER: 'launchdarkly',
          LAUNCHDARKLY_PROJECT_KEY: this.config!.launchDarkly?.projectKey ?? '',
          LAUNCHDARKLY_ENVIRONMENT_KEY: this.config!.launchDarkly?.environmentKey ?? ''
        };
        break;
      case 'flagsmith':
        capability.connectionConfig = {
          environmentKey: this.config!.flagsmith?.environmentKey ?? '',
          apiUrl: this.config!.flagsmith?.apiUrl ?? ''
        };
        capability.environmentVariables = {
          OPENFEATURE_PROVIDER: 'flagsmith',
          FLAGSMITH_ENVIRONMENT_KEY: this.config!.flagsmith?.environmentKey ?? '',
          FLAGSMITH_API_URL: this.config!.flagsmith?.apiUrl ?? ''
        };
        break;
    }

    return capability;
  }
}
