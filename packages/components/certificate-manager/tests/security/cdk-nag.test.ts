import { App, Stack, Aspects } from 'aws-cdk-lib';
import { Match, Annotations } from 'aws-cdk-lib/assertions';
import { AwsSolutionsChecks } from 'cdk-nag';
import type { ComponentContext, ComponentSpec } from '@shinobi/core';
import { CertificateManagerComponent } from '../../src/certificate-manager.component.js';

const createContext = (stack: Stack): ComponentContext => ({
  serviceName: 'test-service',
  owner: 'platform-team',
  environment: 'dev',
  complianceFramework: 'commercial',
  region: 'us-east-1',
  account: '123456789012',
  scope: stack,
  tags: {
    'service-name': 'test-service',
    owner: 'platform-team',
    environment: 'dev',
    'compliance-framework': 'commercial'
  }
}) as ComponentContext;

const createSpec = (): ComponentSpec => ({
  name: 'test-certificate',
  type: 'certificate-manager',
  config: {
    domainName: 'example.com',
    validationMethod: 'dns'
  }
}) as ComponentSpec;

describe.skip('AwsSolutionsChecks', () => {
  it('synthesizes without AwsSolutions findings', () => {
    const app = new App();
    const stack = new Stack(app, 'CertificateManagerNagStack', {
      env: { account: '123456789012', region: 'us-east-1' }
    });

    const component = new CertificateManagerComponent(
      stack,
      'TestCertificate',
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
