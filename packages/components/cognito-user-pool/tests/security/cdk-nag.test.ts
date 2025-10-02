import { App, Stack, Annotations } from 'aws-cdk-lib';
import { AwsSolutionsChecks } from 'cdk-nag';
import { CognitoUserPoolComponent } from '../../src/cognito-user-pool.component.js';
import { ComponentContext, ComponentSpec } from '../../../platform/contracts/component-interfaces.js';
import { Match } from 'aws-cdk-lib/assertions';

describe('CDK Nag — Cognito User Pool', () => {
  const createContext = (framework: ComponentContext['complianceFramework'] = 'commercial'): ComponentContext => ({
    serviceName: 'identity-service',
    owner: 'identity-team',
    environment: 'prod',
    complianceFramework: framework,
    region: 'us-east-1',
    account: '123456789012',
    tags: {
      'service-name': 'identity-service',
      owner: 'identity-team',
      environment: 'prod',
      'compliance-framework': framework
    }
  });

  const createSpec = (): ComponentSpec => ({
    name: 'user-pool',
    type: 'cognito-user-pool',
    config: {}
  });

  test('passes AwsSolutions checks without findings', () => {
    const app = new App();
    const stack = new Stack(app, 'NagStack');

    const context = createContext();
    const spec = createSpec();

    const component = new CognitoUserPoolComponent(stack, spec.name, context, spec);
    component.synth();

    AwsSolutionsChecks.check(stack);

    const errors = Annotations.fromStack(stack).findError('*', Match.stringLikeRegexp('AwsSolutions-'));
    expect(errors).toHaveLength(0);
  });
});
