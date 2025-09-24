/**
 * Path: packages/core/src/platform/binders/strategies/compute/__tests__/app-runner-binder-strategy.test.ts
 */

import { AppRunnerBinderStrategy } from '../app-runner-binder-strategy';
import type { BindingContext } from '../../../binding-context';
import type { ComponentBinding } from '../../../component-binding';

class MockComponent {
  public env: Record<string, string> = {};
  public policies: any[] = [];
  addEnvironment(k: string, v: string) { this.env[k] = v; }
  addToRolePolicy(stmt: any) { this.policies.push(stmt); }
}

describe('AppRunnerBinderStrategy config-driven behavior', () => {
  test('AppRunnerService__RequireSecureNetworking__AppliesVpcConnectorAndSsl', async () => {
    const metadata = {
      id: 'TP-binders-apprunner-001',
      level: 'unit',
      capability: 'apprunner:service',
      oracle: 'exact',
      invariants: ['envs set for service; VPC connector/SSL honored'],
      fixtures: ['MockComponent', 'MockAppRunnerService'],
      inputs: { shape: 'ComponentBinding', notes: 'requireSecureNetworking true' },
      risks: [], dependencies: [], evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: false, human_reviewed_by: ''
    };

    const strategy = new AppRunnerBinderStrategy();
    const source = new MockComponent();
    const target = {
      serviceArn: 'arn:aws:apprunner:us-east-1:123456789012:service/app/abcd',
      serviceName: 'app',
      serviceUrl: 'https://app.awsapprunner.com',
      serviceId: 'abcd',
      ecrRepositoryArn: 'arn:aws:ecr:us-east-1:123456789012:repository/app',
      port: 3000,
      vpcConnectorArn: 'arn:aws:apprunner:us-east-1:123456789012:vpcconnector/vpc-conn',
      customDomain: 'app.example.com',
      sslCertificateArn: 'arn:aws:acm:us-east-1:123456789012:certificate/xyz',
      autoScalingConfigurationArn: 'arn:aws:apprunner:us-east-1:123456789012:autoscalingconfig/asc'
    } as any;

    const binding: ComponentBinding = {
      from: 'frontend', to: 'app', capability: 'apprunner:service', access: ['read', 'write'], env: {},
      options: { requireSecureNetworking: true }
    } as any;
    const context: BindingContext = { region: 'us-east-1', accountId: '123456789012', environment: 'test' } as any;

    await strategy.bind(source as any, target as any, binding, context);

    expect(source.env.APP_RUNNER_SERVICE_NAME).toBe('app');
    expect(source.env.PORT).toBe('3000');
    expect(source.env.VPC_CONNECTOR_ARN).toBe('arn:aws:apprunner:us-east-1:123456789012:vpcconnector/vpc-conn');
    expect(source.env.SSL_CERTIFICATE_ARN).toBe('arn:aws:acm:us-east-1:123456789012:certificate/xyz');
    expect(source.env.AUTO_SCALING_CONFIG_ARN).toBe('arn:aws:apprunner:us-east-1:123456789012:autoscalingconfig/asc');
    expect(source.policies.length).toBeGreaterThan(0);
  });
});


