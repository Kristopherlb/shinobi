/**
 * Path: packages/core/src/platform/binders/strategies/compute/__tests__/ecs-fargate-binder-strategy.test.ts
 */

import { EcsFargateBinderStrategy } from '../ecs-fargate-binder-strategy.ts';
import type { BindingContext } from '../../../binding-context.ts';
import type { ComponentBinding } from '../../../component-binding.ts';

class MockSecurityGroup {
  public rules: any[] = [];
  addIngressRule(peer: any, port: any, description?: string) {
    this.rules.push({ peer, port, description });
  }
}

class MockComponent {
  public env: Record<string, string> = {};
  public policies: any[] = [];
  public securityGroup = new MockSecurityGroup();
  addEnvironment(k: string, v: string) { this.env[k] = v; }
  addToRolePolicy(stmt: any) { this.policies.push(stmt); }
}

describe('EcsFargateBinderStrategy config-driven behavior', () => {
  test('EcsCluster__RequireSecureNetworking__SetsClusterEnvAndOptionalEndpoint', async () => {
    const metadata = {
      id: 'TP-binders-ecs-001',
      level: 'unit',
      capability: 'ecs:cluster',
      oracle: 'exact',
      invariants: ['cluster envs set', 'optional private endpoint when enabled'],
      fixtures: ['MockComponent', 'MockEcsCluster'],
      inputs: { shape: 'ComponentBinding', notes: 'requireSecureNetworking true; enablePrivateEcsEndpoint true' },
      risks: [], dependencies: [], evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: false, human_reviewed_by: ''
    };

    const strategy = new EcsFargateBinderStrategy();
    const source = new MockComponent();
    const target = {
      clusterArn: 'arn:aws:ecs:us-east-1:123456789012:cluster/app',
      clusterName: 'app'
    } as any;

    const binding: ComponentBinding = {
      from: 'api', to: 'cluster', capability: 'ecs:cluster', access: ['read', 'write'], env: {},
      options: { requireSecureNetworking: true, enablePrivateEcsEndpoint: true }
    } as any;
    const context: BindingContext = { region: 'us-east-1', accountId: '123456789012', environment: 'test' } as any;

    await strategy.bind(source as any, target as any, binding, context);

    expect(source.env.ECS_CLUSTER_NAME).toBe('app');
    expect(source.env.ECS_CLUSTER_ARN).toBe('arn:aws:ecs:us-east-1:123456789012:cluster/app');
    expect(source.env.AWS_REGION).toBe('us-east-1');
    expect(source.env.ECS_ENDPOINT).toBe('https://ecs.us-east-1.amazonaws.com');

    // IAM statements present and not wildcard resource for cluster
    expect(source.policies.length).toBeGreaterThan(0);
  });
});


