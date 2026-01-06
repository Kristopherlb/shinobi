/**
 * Creator for the OpenFeature provider component.
 */

import { Construct } from 'constructs';
import {
  ComponentSpec,
  ComponentContext,
  IComponent,
  IComponentCreator
} from '@shinobi/core';
import { OpenFeatureProviderComponent } from './openfeature-provider.component.js';
import {
  OpenFeatureProviderComponentConfig,
  OpenFeatureProviderComponentConfigBuilder,
  OPENFEATURE_PROVIDER_CONFIG_SCHEMA
} from './openfeature-provider.builder.js';

export class OpenFeatureProviderComponentCreator implements IComponentCreator {
  public readonly componentType = 'openfeature-provider';
  public readonly displayName = 'OpenFeature Provider';
  public readonly description = 'Provisions feature flag provider infrastructure (AppConfig, LaunchDarkly, Flagsmith).';
  public readonly category = 'integration';
  public readonly awsService = 'AppConfig';
  public readonly tags = ['openfeature', 'feature-flags', 'appconfig'];
  public readonly configSchema = OPENFEATURE_PROVIDER_CONFIG_SCHEMA;

  public createComponent(
    scope: Construct,
    spec: ComponentSpec,
    context: ComponentContext
  ): IComponent {
    return new OpenFeatureProviderComponent(scope, spec.name, context, spec);
  }

  public validateSpec(
    spec: ComponentSpec,
    context: ComponentContext
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const config = spec.config as Partial<OpenFeatureProviderComponentConfig> | undefined;

    if (!spec.name || !/^[a-zA-Z][a-zA-Z0-9-_]*$/.test(spec.name)) {
      errors.push('Component name must start with a letter and contain only alphanumeric characters, hyphens, or underscores.');
    }

    let resolvedConfig: OpenFeatureProviderComponentConfig | undefined;
    try {
      resolvedConfig = new OpenFeatureProviderComponentConfigBuilder({ context, spec }).buildSync();
    } catch (error) {
      errors.push(`Unable to resolve OpenFeature provider configuration: ${(error as Error).message}`);
    }

    if (resolvedConfig?.provider === 'aws-appconfig') {
      const appConfig = resolvedConfig.awsAppConfig!;
      if (!appConfig.applicationName) {
        errors.push('awsAppConfig.applicationName is required when provider is aws-appconfig.');
      }
      if (!appConfig.environmentName) {
        errors.push('awsAppConfig.environmentName is required when provider is aws-appconfig.');
      }
    }

    if (context.environment === 'prod') {
      const monitors = resolvedConfig?.awsAppConfig?.monitors ?? config?.awsAppConfig?.monitors ?? [];
      if (resolvedConfig?.provider === 'aws-appconfig' && monitors.length === 0) {
        errors.push('At least one monitor must be configured for AppConfig deployments in production.');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  public getProvidedCapabilities(): string[] {
    return ['openfeature:provider'];
  }

  public getRequiredCapabilities(): string[] {
    return [];
  }

  public getConstructHandles(): string[] {
    return ['main', 'application', 'environment', 'configurationProfile', 'deploymentStrategy', 'retrieverRole', 'providerConfig'];
  }
}
