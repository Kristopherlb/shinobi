import { App, Stack } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { ComponentContext, ComponentSpec } from '@shinobi/core';

import { SsmParameterComponent } from '../ssm-parameter.component.js';

const createContext = (
  framework: 'commercial' | 'fedramp-moderate' | 'fedramp-high' = 'commercial'
): ComponentContext => ({
  serviceName: 'orders',
  environment: 'dev',
  complianceFramework: framework,
  scope: new Stack(),
  region: 'us-east-1',
  accountId: '123456789012'
});

describe('SsmParameterComponent synthesis', () => {
  it('creates a basic string parameter', () => {
    const app = new App();
    const stack = new Stack(app, 'Basic');
    const context = createContext('commercial');
    const spec: ComponentSpec = {
      name: 'orders-config',
      type: 'ssm-parameter',
      config: {
        name: '/orders/dev/config/url',
        kind: 'string',
        value: 'https://example.com'
      }
    };

    const component = new SsmParameterComponent(stack, spec.name, context, spec);
    component.synth();

    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::SSM::Parameter', Match.objectLike({
      Name: '/orders/dev/config/url',
      Type: 'String',
      Value: 'https://example.com'
    }));

    expect(component.getCapabilities()['configuration:parameter'].kind).toBe('string');
  });

  it('creates a string list parameter from values array', () => {
    const app = new App();
    const stack = new Stack(app, 'List');
    const context = createContext('commercial');
    const spec: ComponentSpec = {
      name: 'orders-features',
      type: 'ssm-parameter',
      config: {
        name: '/orders/dev/features',
        kind: 'stringList',
        values: ['feature-a', 'feature-b']
      }
    };

    const component = new SsmParameterComponent(stack, spec.name, context, spec);
    component.synth();

    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::SSM::Parameter', Match.objectLike({
      Name: '/orders/dev/features',
      Type: 'StringList',
      Value: 'feature-a,feature-b'
    }));

    expect(component.getCapabilities()['configuration:parameter'].kind).toBe('stringList');
  });

  it('creates secure string parameter with customer-managed key when requested', () => {
    const app = new App();
    const stack = new Stack(app, 'Secure');
    const context = createContext('fedramp-high');
    const spec: ComponentSpec = {
      name: 'orders-secret',
      type: 'ssm-parameter',
      config: {
        name: '/orders/prod/db/password',
        kind: 'secureString',
        value: 'super-secret',
        encryption: {
          customerManagedKey: {
            enabled: true,
            rotationEnabled: true,
            allowSsmService: true
          }
        }
      }
    };

    const component = new SsmParameterComponent(stack, spec.name, context, spec);
    component.synth();

    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::SSM::Parameter', Match.objectLike({
      Name: '/orders/prod/db/password',
      Type: 'SecureString'
    }));

    template.resourceCountIs('AWS::KMS::Key', 1);

    const capability = component.getCapabilities()['configuration:parameter'];
    expect(capability.customerManagedKeyArn).toBeDefined();
  });
});
