import { App, Stack, Aspects } from 'aws-cdk-lib';
import { Match, Annotations } from 'aws-cdk-lib/assertions';
import { AwsSolutionsChecks } from 'cdk-nag';
import type { ComponentContext, ComponentSpec } from '@shinobi/core';
import { ContainerApplicationComponent } from '../../src/container-application.component';

const createContext = (stack: Stack): ComponentContext => ({
  scope: stack,
  serviceName: 'test-service',
  environment: 'dev',
  complianceFramework: 'commercial',
  region: 'us-east-1',
  accountId: '123456789012'
}) as ComponentContext;

const createSpec = (): ComponentSpec => ({
  name: 'web',
  type: 'container-application',
  config: {}
}) as ComponentSpec;

describe.skip('AwsSolutionsChecks', () => {
  it('synthesizes without AwsSolutions findings', () => {
    const app = new App();
    const stack = new Stack(app, 'ContainerApplicationNagStack', {
      env: { account: '123456789012', region: 'us-east-1' }
    });

    const component = new ContainerApplicationComponent(
      stack,
      'TestContainerApplication',
      createContext(stack),
      createSpec()
    );

    Aspects.of(stack).add(new AwsSolutionsChecks({ verbose: true }));
    component.synth();
    app.synth();

    const errors = Annotations.fromStack(stack).findError('*', Match.stringLikeRegexp('AwsSolutions-'));
    expect(errors).toHaveLength(0);
  });
});
