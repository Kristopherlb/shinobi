/**
 * OpenFeatureProviderComponent ConfigBuilder Test Suite
 */

import {
  OpenFeatureProviderComponentConfigBuilder,
  OpenFeatureProviderComponentConfig
} from '../src/openfeature-provider.builder.js';
import { ComponentContext, ComponentSpec } from '@shinobi/core';

const createContext = (
  complianceFramework: string = 'commercial',
  environment: string = 'dev'
): ComponentContext => ({
  serviceName: 'test-service',
  owner: 'test-team',
  environment,
  complianceFramework,
  region: 'us-east-1',
  account: '123456789012',
  accountId: '123456789012',
  scope: undefined as any,
  tags: {
    'service-name': 'test-service',
    owner: 'test-team',
    environment,
    'compliance-framework': complianceFramework
  }
});

const createSpec = (config: Partial<OpenFeatureProviderComponentConfig> = {}): ComponentSpec => ({
  name: 'openfeature',
  type: 'openfeature-provider',
  config
});

describe('OpenFeatureProviderComponentConfigBuilder', () => {
  it('ConfigBuilder__MinimalConfig__AppliesPlatformDefaults', () => {
    const context = createContext();
    const spec = createSpec();

    const config = new OpenFeatureProviderComponentConfigBuilder({ context, spec }).buildSync();

    expect(config.provider).toBe('aws-appconfig');
    expect(config.awsAppConfig).toMatchObject({
      applicationName: 'test-service-features',
      environmentName: 'dev',
      configurationProfileName: 'feature-flags',
      deploymentStrategy: expect.objectContaining({
        name: 'progressive-rollout',
        deploymentDurationMinutes: 10,
        growthFactor: 20
      }),
      retrieverServicePrincipal: 'lambda.amazonaws.com'
    });
  });

  it('ConfigBuilder__ProviderOverride__AllowsComponentOverrides', () => {
    const context = createContext();
    const spec = createSpec({
      provider: 'launchdarkly',
      launchDarkly: {
        projectKey: 'project',
        environmentKey: 'env',
        clientSideId: 'client'
      },
      tags: {
        owner: 'platform'
      }
    });

    const config = new OpenFeatureProviderComponentConfigBuilder({ context, spec }).buildSync();

    expect(config.provider).toBe('launchdarkly');
    expect(config.launchDarkly).toMatchObject({
      projectKey: 'project',
      environmentKey: 'env',
      clientSideId: 'client'
    });
    expect(config.tags.owner).toBe('platform');
  });

  it('ConfigBuilder__FedRAMPModerate__PullsPlatformOverrides', () => {
    const context = createContext('fedramp-moderate');
    const spec = createSpec();

    const config = new OpenFeatureProviderComponentConfigBuilder({ context, spec }).buildSync();

    expect(config.provider).toBe('aws-appconfig');
    expect(config.awsAppConfig?.deploymentStrategy.deploymentDurationMinutes).toBe(15);
    expect(config.awsAppConfig?.deploymentStrategy.growthFactor).toBe(15);
    expect(config.awsAppConfig?.retrieverServicePrincipal).toBe('lambda.amazonaws.com');
  });
});
