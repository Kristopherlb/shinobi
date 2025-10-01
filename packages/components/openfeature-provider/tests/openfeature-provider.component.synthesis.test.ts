/**
 * OpenFeature provider synthesis tests.
 */

import { App, Stack } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { OpenFeatureProviderComponent } from '../openfeature-provider.component.js';
import { OpenFeatureProviderComponentConfig } from '../openfeature-provider.builder.js';
import { ComponentContext, ComponentSpec } from '@shinobi/core';

const createContext = (
  stack: Stack,
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
  scope: stack,
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

describe('OpenFeatureProviderComponent synthesis', () => {
  it('creates AppConfig resources when provider is aws-appconfig', () => {
    const app = new App();
    const stack = new Stack(app, 'AppConfigStack');
    const context = createContext(stack, 'commercial');
    const spec = createSpec();

    const component = new OpenFeatureProviderComponent(stack, spec.name, context, spec);
    component.synth();

    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::AppConfig::Application', Match.objectLike({
      Name: 'test-service-features'
    }));

    template.hasResourceProperties('AWS::AppConfig::Environment', Match.objectLike({
      Name: 'dev'
    }));

    template.hasResourceProperties('AWS::AppConfig::ConfigurationProfile', Match.objectLike({
      Type: 'AWS.AppConfig.FeatureFlags'
    }));

    template.hasResourceProperties('AWS::AppConfig::DeploymentStrategy', Match.objectLike({
      GrowthFactor: 20
    }));
  });

  it('registers LaunchDarkly placeholder when configured', () => {
    const app = new App();
    const stack = new Stack(app, 'LaunchDarklyStack');
    const context = createContext(stack);
    const spec = createSpec({
      provider: 'launchdarkly',
      launchDarkly: {
        projectKey: 'proj',
        environmentKey: 'env',
        clientSideId: 'client'
      }
    });

    const component = new OpenFeatureProviderComponent(stack, spec.name, context, spec);
    component.synth();

    expect(component.getConstruct('providerConfig')).toBeDefined();
    const capabilities = component.getCapabilities();
    expect(capabilities['openfeature:provider'].providerType).toBe('launchdarkly');
  });

  it('exposes flagsmith configuration when selected', () => {
    const app = new App();
    const stack = new Stack(app, 'FlagsmithStack');
    const context = createContext(stack);
    const spec = createSpec({
      provider: 'flagsmith',
      flagsmith: {
        environmentKey: 'env-key',
        apiUrl: 'https://flags'
      }
    });

    const component = new OpenFeatureProviderComponent(stack, spec.name, context, spec);
    component.synth();

    const capability = component.getCapabilities()['openfeature:provider'];
    expect(capability.providerType).toBe('flagsmith');
    expect(capability.connectionConfig).toMatchObject({
      environmentKey: 'env-key',
      apiUrl: 'https://flags'
    });
  });
});
