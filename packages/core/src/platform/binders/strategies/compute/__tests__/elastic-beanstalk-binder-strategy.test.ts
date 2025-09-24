/**
 * Path: packages/core/src/platform/binders/strategies/compute/__tests__/elastic-beanstalk-binder-strategy.test.ts
 */

import { ElasticBeanstalkBinderStrategy } from '../elastic-beanstalk-binder-strategy';
import type { BindingContext } from '../../../binding-context';
import type { ComponentBinding } from '../../../component-binding';

class MockComponent {
  public env: Record<string, string> = {};
  public policies: any[] = [];
  addEnvironment(k: string, v: string) { this.env[k] = v; }
  addToRolePolicy(stmt: any) { this.policies.push(stmt); }
}

describe('ElasticBeanstalkBinderStrategy config-driven behavior', () => {
  test('BeanstalkEnvironment__RequireSecureNetworkingAndEncryption__AppliesVpcLbSslKms', async () => {
    const metadata = {
      id: 'TP-binders-eb-001',
      level: 'unit',
      capability: 'elasticbeanstalk:environment',
      oracle: 'exact',
      invariants: ['envs set for VPC, LB, SSL, autoscaling, encryption'],
      fixtures: ['MockComponent', 'MockEnvironment'],
      inputs: { shape: 'ComponentBinding', notes: 'requireSecureNetworking true; enableEncryption true' },
      risks: [], dependencies: [], evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: false, human_reviewed_by: ''
    };

    const strategy = new ElasticBeanstalkBinderStrategy();
    const source = new MockComponent();
    const target = {
      environmentArn: 'arn:aws:elasticbeanstalk:us-east-1:123456789012:environment/app/env',
      environmentName: 'env',
      environmentId: 'e-ABCDEF',
      endpointUrl: 'http://env.elasticbeanstalk.com',
      status: 'Ready',
      health: 'Green',
      platformVersion: '64bit Amazon Linux 2 v5.6.4 running Node.js 18',
      solutionStackName: '64bit Amazon Linux 2 v5.6.4 running Node.js 18',
      tier: { name: 'WebServer', type: 'Standard', version: '1.0' },
      vpcId: 'vpc-12345',
      subnets: ['subnet-1', 'subnet-2'],
      securityGroups: ['sg-1', 'sg-2'],
      loadBalancerArn: 'arn:aws:elasticloadbalancing:us-east-1:123456789012:loadbalancer/app/xyz',
      loadBalancerType: 'application',
      sslCertificateArn: 'arn:aws:acm:us-east-1:123456789012:certificate/xyz',
      autoScalingGroups: ['asg-1', 'asg-2'],
      encryptionKeyArn: 'arn:aws:kms:us-east-1:123456789012:key/abc',
      healthCheckUrl: '/health',
      healthCheckTimeout: 30
    } as any;

    const binding: ComponentBinding = {
      from: 'svc', to: 'env', capability: 'elasticbeanstalk:environment', access: ['read', 'write'], env: {},
      options: { requireSecureNetworking: true, enableEncryption: true }
    } as any;
    const context: BindingContext = { region: 'us-east-1', accountId: '123456789012', environment: 'test' } as any;

    await strategy.bind(source as any, target as any, binding, context);

    expect(source.env.EB_VPC_ID).toBe('vpc-12345');
    expect(source.env.EB_LOAD_BALANCER_ARN).toBe(target.loadBalancerArn);
    expect(source.env.EB_SSL_CERTIFICATE_ARN).toBe(target.sslCertificateArn);
    expect(source.env.EB_AUTO_SCALING_GROUPS).toBe('asg-1,asg-2');
    expect(source.env.EB_ENCRYPTION_ENABLED).toBe('true');
    expect(source.env.EB_ENCRYPTION_KEY_ARN).toBe(target.encryptionKeyArn);
    expect(source.policies.length).toBeGreaterThan(0);
  });
});


