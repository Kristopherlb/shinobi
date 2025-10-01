/**
 * Path: packages/core/src/platform/binders/strategies/database/__tests__/neptune-binder-strategy.test.ts
 */

import { NeptuneBinderStrategy } from '../neptune-binder-strategy.js';
import type { BindingContext } from '../../../binding-context.js';
import type { ComponentBinding } from '../../../component-binding.js';

class MockComponent {
  public env: Record<string, string> = {};
  public policies: any[] = [];
  addEnvironment(k: string, v: string) { this.env[k] = v; }
  addToRolePolicy(stmt: any) { this.policies.push(stmt); }
}

describe('NeptuneBinderStrategy config-driven behavior', () => {
  test('NeptuneCluster__RequireSecureAccess__AppliesEncryptionBackupVpc', async () => {
    const metadata = {
      id: 'TP-binders-neptune-001',
      level: 'unit',
      capability: 'neptune:cluster',
      oracle: 'exact',
      invariants: ['envs set for encryption, backup, vpc sg and subnet group'],
      fixtures: ['MockComponent', 'MockNeptuneCluster'],
      inputs: { shape: 'ComponentBinding', notes: 'requireSecureAccess true; storageEncrypted true; kmsKeyId set' },
      risks: [], dependencies: [], evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: false, human_reviewed_by: ''
    };

    const strategy = new NeptuneBinderStrategy();
    const source = new MockComponent();
    const target = {
      clusterArn: 'arn:aws:rds:us-east-1:123456789012:cluster:graphdb',
      clusterIdentifier: 'graphdb',
      clusterEndpoint: 'graphdb.cluster-xyz.us-east-1.neptune.amazonaws.com',
      port: 8182,
      status: 'available',
      engine: 'neptune',
      storageEncrypted: true,
      kmsKeyId: 'arn:aws:kms:us-east-1:123456789012:key/abc',
      backupRetentionPeriod: 7,
      vpcSecurityGroupIds: ['sg-1', 'sg-2'],
      dbSubnetGroupName: 'neptune-subnet'
    } as any;

    const binding: ComponentBinding = {
      from: 'svc', to: 'graphdb', capability: 'neptune:cluster', access: ['read', 'write'], env: {},
      options: { requireSecureAccess: true }
    } as any;
    const context: BindingContext = { region: 'us-east-1', accountId: '123456789012', environment: 'test' } as any;

    await strategy.bind(source as any, target as any, binding, context);

    expect(source.env.NEPTUNE_ENCRYPTION_ENABLED).toBe('true');
    expect(source.env.NEPTUNE_KMS_KEY_ID).toBe(target.kmsKeyId);
    expect(source.env.NEPTUNE_BACKUP_RETENTION_DAYS).toBe('7');
    expect(source.env.NEPTUNE_SECURITY_GROUPS).toBe('sg-1,sg-2');
    expect(source.env.NEPTUNE_SUBNET_GROUP).toBe('neptune-subnet');
    expect(source.policies.length).toBeGreaterThan(0);
  });
});


