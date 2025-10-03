/**
 * Path: packages/core/src/platform/binders/strategies/compute/__tests__/eks-binder-strategy.test.ts
 */

import { EksBinderStrategy } from '../eks-binder-strategy.ts';
import type { BindingContext } from '../../../binding-context.ts';
import type { ComponentBinding } from '../../../component-binding.ts';

class MockComponent {
  public env: Record<string, string> = {};
  public policies: any[] = [];
  addEnvironment(k: string, v: string) { this.env[k] = v; }
  addToRolePolicy(stmt: any) { this.policies.push(stmt); }
}

describe('EksBinderStrategy config-driven behavior', () => {
  test('EksCluster__BindCluster__SetsKubeEnvAndPolicies', async () => {
    const metadata = {
      id: 'TP-binders-eks-001',
      level: 'unit',
      capability: 'eks:cluster',
      oracle: 'exact',
      invariants: ['envs set for cluster name/endpoint/ca; policies added'],
      fixtures: ['MockComponent', 'MockEksCluster'],
      inputs: { shape: 'ComponentBinding', notes: 'basic cluster binding' },
      risks: [], dependencies: [], evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: false, human_reviewed_by: ''
    };

    const strategy = new EksBinderStrategy();
    const source = new MockComponent();
    const target = {
      clusterArn: 'arn:aws:eks:us-east-1:123456789012:cluster/eks1',
      clusterName: 'eks1',
      clusterEndpoint: 'https://ABC.gr7.us-east-1.eks.amazonaws.com',
      clusterCertificateAuthority: 'BASE64CACERT'
    } as any;

    const binding: ComponentBinding = {
      from: 'svc', to: 'eks1', capability: 'eks:cluster', access: ['read', 'write'], env: {}
    } as any;
    const context: BindingContext = { region: 'us-east-1', accountId: '123456789012', environment: 'test' } as any;

    await strategy.bind(source as any, target as any, binding, context);

    expect(source.env.EKS_CLUSTER_NAME).toBe('eks1');
    expect(source.env.EKS_CLUSTER_ENDPOINT).toBe(target.clusterEndpoint);
    expect(source.env.KUBECONFIG).toContain('kubeconfig-eks1');
    expect(source.policies.length).toBeGreaterThan(0);
  });
});


