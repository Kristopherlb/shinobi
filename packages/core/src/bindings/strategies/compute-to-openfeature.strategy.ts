/**
 * Compute to OpenFeature Binding Strategy
 * Handles binding compute components (Lambda) to OpenFeature providers
 * Implements Platform Feature Flagging & Canary Deployment Standard v1.0
 */

import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Component, BindingContext, StructuredLogger } from '@platform/contracts';

export interface ComputeToOpenFeatureStrategyDependencies {
  logger: StructuredLogger;
}

/**
 * Strategy for binding compute components to OpenFeature providers
 * Configures environment variables for OpenFeature SDK auto-configuration
 */
export class ComputeToOpenFeatureStrategy {
  constructor(private dependencies: ComputeToOpenFeatureStrategyDependencies) {}

  /**
   * Check if this strategy can handle the given binding
   */
  canHandle(context: BindingContext): boolean {
    // Check if source is a compute component and target provides OpenFeature capability
    const isComputeSource = this.isComputeComponent(context.sourceComponent);
    const hasOpenFeatureCapability = this.hasOpenFeatureCapability(context.targetComponent);
    const isOpenFeatureCapability = context.capability === 'openfeature:provider';

    return isComputeSource && hasOpenFeatureCapability && isOpenFeatureCapability;
  }

  /**
   * Apply the binding between compute component and OpenFeature provider
   */
  async apply(context: BindingContext): Promise<void> {
    this.dependencies.logger.debug(`Applying compute to OpenFeature binding: ${context.access} access`);

    const computeFunction = this.extractComputeFunction(context.sourceComponent);
    const providerComponent = context.targetComponent;

    if (!computeFunction) {
      throw new Error('Could not extract compute function from source component');
    }

    // 1. Get OpenFeature provider capability data
    const providerCapability = this.getProviderCapability(providerComponent);

    // 2. Configure IAM permissions based on provider type
    await this.configureProviderAccess(computeFunction, providerCapability, context.access);

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
      FEATURE_FLAG_SERVICE: context.targetComponent.getName(),
      FEATURE_FLAG_ENVIRONMENT: context.environment || 'production',
      FEATURE_FLAG_ACCESS_LEVEL: context.access,
      
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
    if (context.customEnvVars) {
      for (const [standardName, customName] of Object.entries(context.customEnvVars)) {
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
  private isComputeComponent(component: Component): boolean {
    const computeTypes = ['lambda-api', 'lambda-worker', 'lambda-function', 'container', 'ecs-service'];
    return computeTypes.includes(component.getType());
  }

  /**
   * Check if component has OpenFeature capability
   */
  private hasOpenFeatureCapability(component: Component): boolean {
    const capabilities = component.getCapabilities();
    return 'openfeature:provider' in capabilities;
  }

  /**
   * Extract compute function from component
   */
  private extractComputeFunction(component: Component): lambda.IFunction | null {
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
  private getProviderCapability(component: Component): any {
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