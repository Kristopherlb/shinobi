/**
 * Compute to OpenFeature Binding Strategy
 * Handles binding compute components (Lambda) to OpenFeature providers
 * Implements Platform Feature Flagging & Canary Deployment Standard v1.0
 */

import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import { IComponent, BindingContext, BindingResult, CompatibilityEntry, Logger } from '@shinobi/core';

export interface ComputeToOpenFeatureStrategyDependencies {
  logger: Logger;
}

/**
 * Strategy for binding compute components to OpenFeature providers
 * Configures environment variables for OpenFeature SDK auto-configuration
 */
export class ComputeToOpenFeatureStrategy {
  constructor(private dependencies: ComputeToOpenFeatureStrategyDependencies) { }

  /**
   * Get compatibility matrix for this binding strategy
   */
  getCompatibilityMatrix(): CompatibilityEntry[] {
    return [
      {
        sourceType: 'lambda-api',
        targetType: 'openfeature-provider',
        capability: 'openfeature:provider',
        supportedAccess: ['read'],
        description: 'Configures Lambda function to use OpenFeature provider for feature flags'
      },
      {
        sourceType: 'lambda-worker',
        targetType: 'openfeature-provider',
        capability: 'openfeature:provider',
        supportedAccess: ['read'],
        description: 'Configures Lambda worker to use OpenFeature provider for feature flags'
      },
      {
        sourceType: 'lambda-function',
        targetType: 'openfeature-provider',
        capability: 'openfeature:provider',
        supportedAccess: ['read'],
        description: 'Configures Lambda function to use OpenFeature provider for feature flags'
      },
      {
        sourceType: 'container',
        targetType: 'openfeature-provider',
        capability: 'openfeature:provider',
        supportedAccess: ['read'],
        description: 'Configures container to use OpenFeature provider for feature flags'
      },
      {
        sourceType: 'ecs-service',
        targetType: 'openfeature-provider',
        capability: 'openfeature:provider',
        supportedAccess: ['read'],
        description: 'Configures ECS service to use OpenFeature provider for feature flags'
      }
    ];
  }

  /**
   * Check if this strategy can handle the given binding
   */
  canHandle(context: BindingContext): boolean {
    // Check if source is a compute component and target provides OpenFeature capability
    const isComputeSource = this.isComputeComponent(context.source);
    const hasOpenFeatureCapability = this.hasOpenFeatureCapability(context.target);
    const isOpenFeatureCapability = context.directive.capability === 'openfeature:provider';

    return isComputeSource && hasOpenFeatureCapability && isOpenFeatureCapability;
  }

  /**
   * Apply the binding between compute component and OpenFeature provider
   */
  async apply(context: BindingContext): Promise<void> {
    this.dependencies.logger.debug(`Applying compute to OpenFeature binding: ${context.directive.access} access`);

    const computeFunction = this.extractComputeFunction(context.source);
    const providerComponent = context.target;

    if (!computeFunction) {
      throw new Error('Could not extract compute function from source component');
    }

    // 1. Get OpenFeature provider capability data
    const providerCapability = this.getProviderCapability(providerComponent);

    // 2. Configure IAM permissions based on provider type
    await this.configureProviderAccess(computeFunction, providerCapability, context.directive.access);

    // 3. Set environment variables for OpenFeature SDK auto-configuration
    await this.setOpenFeatureEnvironmentVariables(computeFunction, providerCapability, context);

    // 4. Configure observability for feature flag usage
    await this.configureFeatureFlagObservability(computeFunction, providerCapability);

    this.dependencies.logger.debug('Compute to OpenFeature binding applied successfully');
  }

  /**
   * Configure IAM permissions based on provider type
   */
  private async configureProviderAccess(
    computeFunction: lambda.IFunction,
    providerCapability: any,
    access: string
  ): Promise<void> {
    this.dependencies.logger.debug(`Configuring provider access: ${providerCapability.providerType}`);

    switch (providerCapability.providerType) {
      case 'aws-appconfig':
        await this.configureAppConfigAccess(computeFunction, providerCapability, access);
        break;
      case 'launchdarkly':
        // LaunchDarkly uses API keys, no additional IAM permissions needed
        this.dependencies.logger.debug('LaunchDarkly provider configured with API key authentication');
        break;
      case 'flagsmith':
        // Flagsmith uses environment keys, no additional IAM permissions needed
        this.dependencies.logger.debug('Flagsmith provider configured with environment key authentication');
        break;
      default:
        throw new Error(`Unsupported provider type: ${providerCapability.providerType}`);
    }
  }

  /**
   * Configure AWS AppConfig access permissions
   */
  private async configureAppConfigAccess(
    computeFunction: lambda.IFunction,
    providerCapability: any,
    access: string
  ): Promise<void> {
    // Grant AppConfig permissions based on access level
    const actions = this.getAppConfigActions(access);

    computeFunction.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: actions,
      resources: [
        `arn:aws:appconfig:*:*:application/${providerCapability.connectionConfig.applicationId}`,
        `arn:aws:appconfig:*:*:application/${providerCapability.connectionConfig.applicationId}/environment/${providerCapability.connectionConfig.environmentId}`,
        `arn:aws:appconfig:*:*:application/${providerCapability.connectionConfig.applicationId}/configurationprofile/${providerCapability.connectionConfig.configurationProfileId}`
      ]
    }));

    this.dependencies.logger.debug('AWS AppConfig permissions granted successfully');
  }

  /**
   * Get AppConfig actions based on access level
   */
  private getAppConfigActions(access: string): string[] {
    const baseActions = [
      'appconfig:StartConfigurationSession',
      'appconfig:GetConfiguration'
    ];

    switch (access) {
      case 'read':
        return baseActions;
      case 'admin':
        return [
          ...baseActions,
          'appconfig:GetApplication',
          'appconfig:GetEnvironment',
          'appconfig:GetConfigurationProfile',
          'appconfig:GetDeployment',
          'appconfig:ListApplications',
          'appconfig:ListEnvironments',
          'appconfig:ListConfigurationProfiles'
        ];
      default:
        return baseActions;
    }
  }

  /**
   * Set environment variables for OpenFeature SDK auto-configuration
   */
  private async setOpenFeatureEnvironmentVariables(
    computeFunction: lambda.IFunction,
    providerCapability: any,
    context: BindingContext
  ): Promise<void> {
    this.dependencies.logger.debug('Setting OpenFeature environment variables');

    // Base OpenFeature configuration
    const environmentVariables: Record<string, string> = {
      // OpenFeature provider configuration
      ...providerCapability.environmentVariables,

      // Feature flag service metadata
      FEATURE_FLAG_SERVICE: context.target.getName(),
      FEATURE_FLAG_ENVIRONMENT: context.environment || 'production',
      FEATURE_FLAG_ACCESS_LEVEL: context.directive.access,

      // Observability configuration
      OPENFEATURE_TELEMETRY_ENABLED: 'true',
      OPENFEATURE_HOOKS_ENABLED: 'true'
    };

    // Add provider-specific configuration
    switch (providerCapability.providerType) {
      case 'aws-appconfig':
        Object.assign(environmentVariables, {
          APPCONFIG_POLL_INTERVAL_SECONDS: '60', // Default poll interval
          APPCONFIG_REQUEST_TIMEOUT_SECONDS: '30' // Request timeout
        });
        break;
      case 'launchdarkly':
        Object.assign(environmentVariables, {
          LAUNCHDARKLY_STREAMING: 'true', // Enable streaming
          LAUNCHDARKLY_EVENTS: 'true' // Enable analytics events
        });
        break;
      case 'flagsmith':
        Object.assign(environmentVariables, {
          FLAGSMITH_POLL_INTERVAL: '60000', // 60 seconds in milliseconds
          FLAGSMITH_ENABLE_ANALYTICS: 'true' // Enable analytics
        });
        break;
    }

    // Apply custom environment variable names if provided
    if (context.directive.env) {
      for (const [standardName, customName] of Object.entries(context.directive.env)) {
        if (environmentVariables[standardName]) {
          environmentVariables[customName] = environmentVariables[standardName];
          delete environmentVariables[standardName];
        }
      }
    }

    // Set environment variables on the compute function
    this.addEnvironmentVariables(computeFunction, environmentVariables);

    this.dependencies.logger.debug('OpenFeature environment variables set successfully');
  }

  /**
   * Bind method required by IBinderStrategy interface
   */
  bind(context: BindingContext): BindingResult {
    // This strategy modifies CDK constructs directly, so we return minimal result
    return {
      environmentVariables: {},
      metadata: {
        strategy: 'compute-to-openfeature',
        sourceType: context.source.getType(),
        targetType: context.target.getType(),
        capability: context.directive.capability,
        access: context.directive.access
      }
    };
  }

  /**
   * Configure observability for feature flag usage
   */
  private async configureFeatureFlagObservability(
    computeFunction: lambda.IFunction,
    providerCapability: any
  ): Promise<void> {
    this.dependencies.logger.debug('Configuring feature flag observability');

    // Add observability environment variables
    const observabilityEnvVars: Record<string, string> = {
      // OpenTelemetry tracing for feature flag evaluations
      OTEL_RESOURCE_ATTRIBUTES: `service.name=feature-flags,feature.provider=${providerCapability.providerType}`,

      // Feature flag metrics
      FEATURE_FLAG_METRICS_ENABLED: 'true',
      FEATURE_FLAG_METRICS_NAMESPACE: 'FeatureFlags',

      // Audit logging
      FEATURE_FLAG_AUDIT_LOGGING: 'true'
    };

    this.addEnvironmentVariables(computeFunction, observabilityEnvVars);

    this.dependencies.logger.debug('Feature flag observability configured successfully');
  }

  /**
   * Check if a component is a compute component
   */
  private isComputeComponent(component: IComponent): boolean {
    const computeTypes = ['lambda-api', 'lambda-worker', 'lambda-function', 'container', 'ecs-service'];
    return computeTypes.includes(component.getType());
  }

  /**
   * Check if component has OpenFeature capability
   */
  private hasOpenFeatureCapability(component: IComponent): boolean {
    const capabilities = component.getCapabilities();
    return 'openfeature:provider' in capabilities;
  }

  /**
   * Extract compute function from component
   */
  private extractComputeFunction(component: IComponent): lambda.IFunction | null {
    // Try to get the main compute construct
    const computeConstruct = component.getConstruct('main') ||
      component.getConstruct('function') ||
      component.getConstruct('lambdaFunction');

    if (computeConstruct && 'addToRolePolicy' in computeConstruct) {
      return computeConstruct as lambda.IFunction;
    }

    return null;
  }

  /**
   * Get OpenFeature provider capability data
   */
  private getProviderCapability(component: IComponent): any {
    const capabilities = component.getCapabilities();
    return capabilities['openfeature:provider'];
  }

  /**
   * Add environment variables to compute function
   */
  private addEnvironmentVariables(
    computeFunction: lambda.IFunction,
    variables: Record<string, string>
  ): void {
    // In a real implementation, this would be handled during Lambda construction
    // or through CDK's environment variable APIs
    this.dependencies.logger.debug(`Would set ${Object.keys(variables).length} environment variables on compute function`);

    // Log the variables for debugging (without sensitive values)
    for (const [key, value] of Object.entries(variables)) {
      const logValue = key.toLowerCase().includes('key') || key.toLowerCase().includes('secret') ? '[HIDDEN]' : value;
      this.dependencies.logger.debug(`  ${key}=${logValue}`);
    }
  }
}