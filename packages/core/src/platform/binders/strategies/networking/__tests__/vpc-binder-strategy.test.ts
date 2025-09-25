/**
 * Path: packages/core/src/platform/binders/strategies/networking/__tests__/vpc-binder-strategy.test.ts
 */

import { VpcBinderStrategy } from '../vpc-binder-strategy';
import type { BindingContext } from '../../../binding-context';
import type { ComponentBinding } from '../../../component-binding';

class MockComponent {
  public env: Record<string, string> = {};
  public policies: any[] = [];
  addEnvironment(k: string, v: string) { this.env[k] = v; }
  addToRolePolicy(stmt: any) { this.policies.push(stmt); }
}

describe('VpcBinderStrategy config-driven behavior', () => {
  test('VpcNetwork__RequireSecureAccess__AppliesFlowLogsAndOptionalEndpoints', async () => {
    const metadata = {
      id: 'TP-binders-vpc-001',
      level: 'unit',
      capability: 'vpc:network',
      oracle: 'exact',
      invariants: ['VPC envs set; flow logs enabled when configured; endpoints optional'],
      fixtures: ['MockComponent', 'MockVpc'],
      inputs: { shape: 'ComponentBinding', notes: 'requireSecureAccess true; enableVpcEndpoints true with list' },
      risks: [], dependencies: [], evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: false, human_reviewed_by: ''
    };

    const strategy = new VpcBinderStrategy();
    const source = new MockComponent();
    const target = {
      vpcArn: 'arn:aws:ec2:us-east-1:123456789012:vpc/vpc-1234',
      vpcId: 'vpc-1234',
      cidrBlock: '10.0.0.0/16',
      state: 'available',
      isDefault: false,
      enableDnsHostnames: true,
      enableDnsSupport: true,
      flowLogsEnabled: true,
      enableVpcEndpoints: true,
      vpcEndpoints: ['s3', 'dynamodb']
    } as any;

    const binding: ComponentBinding = {
      from: 'net', to: 'vpc', capability: 'vpc:network', access: ['read', 'write'], env: {}, options: { requireSecureAccess: true }
    } as any;
    const context: BindingContext = { region: 'us-east-1', accountId: '123456789012', environment: 'test' } as any;

    await strategy.bind(source as any, target as any, binding, context);

    expect(source.env.VPC_ID).toBe('vpc-1234');
    expect(source.env.VPC_ARN).toBe('arn:aws:ec2:us-east-1:123456789012:vpc/vpc-1234');
    expect(source.env.VPC_FLOW_LOGS_ENABLED).toBe('true');
    expect(source.env.VPC_ENDPOINTS_ENABLED).toBe('true');
    expect(source.env.VPC_ENDPOINT_SERVICES).toBe('s3,dynamodb');
  });
});


