/**
 * Path: packages/core/src/platform/binders/strategies/analytics/__tests__/emr-binder-strategy.test.ts
 */

import { EmrBinderStrategy } from '../emr-binder-strategy';
import type { BindingContext } from '../../../binding-context';
import type { ComponentBinding } from '../../../component-binding';

class MockComponent {
  public env: Record<string, string> = {};
  public policies: any[] = [];
  addEnvironment(k: string, v: string) { this.env[k] = v; }
  addToRolePolicy(stmt: any) { this.policies.push(stmt); }
}

describe('EmrBinderStrategy config-driven behavior', () => {
  test('EmrCluster__RequireSecureAccessAndKerberos__AppliesSecurityEnvsAndPolicies', async () => {
    const metadata = {
      id: 'TP-binders-emr-001',
      level: 'unit',
      capability: 'emr:cluster',
      oracle: 'exact',
      invariants: [ 'envs set for encryption/vpc/kerberos/audit', 'IAM statements include KMS' ],
      fixtures: ['MockComponent', 'MockEmrCluster'],
      inputs: { shape: 'ComponentBinding', notes: 'requireSecureAccess true; enableKerberos true; enableAuditLogging true' },
      risks: [], dependencies: [], evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: false, human_reviewed_by: ''
    };

    const strategy = new EmrBinderStrategy();
    const source = new MockComponent();
    const target = {
      clusterArn: 'arn:aws:elasticmapreduce:us-east-1:123456789012:cluster/j-2AXXXXXXGAPLF',
      clusterId: 'j-2AXXXXXXGAPLF',
      name: 'analytics-cluster',
      status: { state: 'WAITING' },
      releaseLabel: 'emr-6.10.0',
      masterPublicDnsName: 'ec2-1-2-3-4.compute-1.amazonaws.com',
      logUri: 's3://emr-logs/bucket',
      applications: [{ name: 'Hadoop' }],
      encryptionConfiguration: { kmsKeyId: 'arn:aws:kms:us-east-1:123456789012:key/abc' },
      ec2SubnetId: 'subnet-12345',
      emrManagedMasterSecurityGroup: 'sg-master',
      emrManagedSlaveSecurityGroup: 'sg-slave',
      kerberosAttributes: { realm: 'EXAMPLE.COM', adDomainJoinUser: 'svc-join' }
    } as any;

    const binding: ComponentBinding = {
      from: 'etl', to: 'cluster', capability: 'emr:cluster', access: ['read','write'], env: {},
      options: { requireSecureAccess: true, enableKerberos: true, enableAuditLogging: true }
    } as any;
    const context: BindingContext = { region: 'us-east-1', accountId: '123456789012', environment: 'test' } as any;

    await strategy.bind(source as any, target as any, binding, context);

    expect(source.env.EMR_CLUSTER_ID).toBe('j-2AXXXXXXGAPLF');
    expect(source.env.EMR_ENCRYPTION_ENABLED).toBe('true');
    expect(source.env.EMR_KMS_KEY_ID).toBe('arn:aws:kms:us-east-1:123456789012:key/abc');
    expect(source.env.EMR_VPC_ENABLED).toBe('true');
    expect(source.env.EMR_KERBEROS_ENABLED).toBe('true');
    expect(source.env.EMR_AUDIT_LOGGING_ENABLED).toBe('true');
    expect(source.policies.length).toBeGreaterThan(0);
    const kmsPolicy = source.policies.find((p: any) => Array.isArray(p.Action) && p.Action.includes('kms:Decrypt'));
    expect(kmsPolicy).toBeDefined();
  });
});


