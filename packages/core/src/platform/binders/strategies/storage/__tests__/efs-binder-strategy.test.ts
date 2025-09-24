/**
 * Path: packages/core/src/platform/binders/strategies/storage/__tests__/efs-binder-strategy.test.ts
 */

import { EfsBinderStrategy } from '../efs-binder-strategy';
import type { BindingContext } from '../../../binding-context';
import type { ComponentBinding } from '../../../component-binding';

class MockComponent {
  public env: Record<string, string> = {};
  public policies: any[] = [];
  addEnvironment(k: string, v: string) { this.env[k] = v; }
  addToRolePolicy(stmt: any) { this.policies.push(stmt); }
}

describe('EfsBinderStrategy config-driven behavior', () => {
  test('EfsFileSystem__RequireSecureAccess__AppliesEncryptionAndBackupPolicy', async () => {
    const metadata = {
      id: 'TP-binders-efs-001',
      level: 'unit',
      capability: 'efs:file-system',
      oracle: 'exact',
      invariants: ['encryption envs set when encrypted', 'backup policy enabled when requested'],
      fixtures: ['MockComponent', 'MockEfs'],
      inputs: { shape: 'ComponentBinding', notes: 'requireSecureAccess true; backupPolicyEnabled true' },
      risks: [], dependencies: [], evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: false, human_reviewed_by: ''
    };

    const strategy = new EfsBinderStrategy();
    const source = new MockComponent();
    const target = {
      fileSystemArn: 'arn:aws:elasticfilesystem:us-east-1:123456789012:file-system/fs-1234',
      fileSystemId: 'fs-1234',
      dnsName: 'fs-1234.efs.us-east-1.amazonaws.com',
      lifeCycleState: 'available',
      performanceMode: 'generalPurpose',
      throughputMode: 'bursting',
      encrypted: true,
      kmsKeyId: 'arn:aws:kms:us-east-1:123456789012:key/efs',
      backupPolicyEnabled: true
    } as any;

    const binding: ComponentBinding = {
      from: 'app', to: 'efs', capability: 'efs:file-system', access: ['read', 'write'], env: {},
      options: { requireSecureAccess: true }
    } as any;
    const context: BindingContext = { region: 'us-east-1', accountId: '123456789012', environment: 'test' } as any;

    await strategy.bind(source as any, target as any, binding, context);

    expect(source.env.EFS_FILE_SYSTEM_ID).toBe('fs-1234');
    expect(source.env.EFS_ENCRYPTION_ENABLED).toBe('true');
    expect(source.env.EFS_KMS_KEY_ID).toBe('arn:aws:kms:us-east-1:123456789012:key/efs');
    expect(source.env.EFS_BACKUP_POLICY_ENABLED).toBe('true');
    expect(source.policies.length).toBeGreaterThan(0);
  });
});


