import { App, Stack, Aspects } from 'aws-cdk-lib';
import { Match, Annotations } from 'aws-cdk-lib/assertions';
import { AwsSolutionsChecks } from 'cdk-nag';
import { ApiGatewayHttpComponent } from '../../src/api-gateway-http.component.ts';
import { ComponentContext, ComponentSpec } from '@shinobi/core';

describe('AwsSolutionsChecks', () => {
  it('synthesizes without AwsSolutions findings', () => {
    const app = new App();
    const stack = new Stack(app, 'HttpNagStack', {
      env: { account: '123456789012', region: 'us-east-1' }
    });

    const context: ComponentContext = {
      serviceName: 'test-service',
      environment: 'dev',
      complianceFramework: 'commercial',
      owner: 'platform-team',
      region: 'us-east-1',
      account: '123456789012',
      tags: {
        'service-name': 'test-service',
        owner: 'platform-team',
        environment: 'dev',
        'compliance-framework': 'commercial'
      }
    };

    const spec: ComponentSpec = {
      name: 'test-http-api',
      type: 'api-gateway-http',
      config: {}
    };

    const component = new ApiGatewayHttpComponent(stack, 'TestHttpApi', context, spec);

    Aspects.of(stack).add(new AwsSolutionsChecks({ verbose: true }));
    component.synth();
    app.synth();

    const errors = Annotations.fromStack(stack).findError('*', Match.stringLikeRegexp('AwsSolutions-'));
    expect(errors).toHaveLength(0);
  });
});
