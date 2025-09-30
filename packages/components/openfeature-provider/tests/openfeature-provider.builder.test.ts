/**
 * OpenFeatureProviderComponent ConfigBuilder Test Suite
 */

import {
  OpenFeatureProviderComponentConfigBuilder,
  OpenFeatureProviderComponentConfig
} from '../openfeature-provider.builder';
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
  it('applies hardcoded fallbacks', () => {
    const context = createContext();
    const spec = createSpec();

    const config = new OpenFeatureProviderComponentConfigBuilder({ context, spec }).buildSync();

    expect(config.provider).toBe('aws-appconfig');
    expect(config.awsAppConfig?.configurationProfileName).toBe('feature-flags');
    expect(config.monitoring?.enabled).toBe(true);
    expect(config.monitoring?.detailedMetrics).toBe(true);
  });

  it('honours component overrides', () => {
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
    expect(config.tags?.owner).toBe('platform');
  });

  it('applies FedRAMP Moderate defaults from platform config', () => {
    const context = createContext('fedramp-moderate');
    const spec = createSpec();

    const config = new OpenFeatureProviderComponentConfigBuilder({ context, spec }).buildSync();

    expect(config.provider).toBe('aws-appconfig');
    expect(config.awsAppConfig?.deploymentStrategy.growthType).toBe('LINEAR');
    expect(config.monitoring?.detailedMetrics).toBe(true);
    expect(config.monitoring?.alarms?.cpuUtilization).toBeDefined();
  });
});
