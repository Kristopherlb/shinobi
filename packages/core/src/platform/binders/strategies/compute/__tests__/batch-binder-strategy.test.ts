/**
 * Path: packages/core/src/platform/binders/strategies/compute/__tests__/batch-binder-strategy.test.ts
 */

import { BatchBinderStrategy } from '../batch-binder-strategy';
import type { BindingContext } from '../../../binding-context';
import type { ComponentBinding } from '../../../component-binding';

class MockComponent {
  public env: Record<string, string> = {};
  public policies: any[] = [];
  addEnvironment(k: string, v: string) { this.env[k] = v; }
  addToRolePolicy(stmt: any) { this.policies.push(stmt); }
}

describe('BatchBinderStrategy config-driven behavior', () => {
  test('BatchJob__RequireSecureNetworkingAndEncryption__AppliesVpcAndKms', async () => {
    const metadata = {
      id: 'TP-binders-batch-001',
      level: 'unit',
      capability: 'batch:job',
      oracle: 'exact',
      invariants: ['envs set for VPC and KMS key when enabled'],
      fixtures: ['MockComponent', 'MockBatchJob'],
      inputs: { shape: 'ComponentBinding', notes: 'requireSecureNetworking true; enableEncryption true' },
      risks: [], dependencies: [], evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: false, human_reviewed_by: ''
    };

    const strategy = new BatchBinderStrategy();
    const source = new MockComponent();
    const target = {
      jobArn: 'arn:aws:batch:us-east-1:123456789012:job/foo',
      jobName: 'foo',
      jobId: '1234',
      jobQueue: 'queue',
      jobDefinition: 'jobdef:1',
      status: 'SUCCEEDED',
      logStreamName: 'job/foo/stream',
      networkConfiguration: { subnets: ['subnet-1', 'subnet-2'], securityGroups: ['sg-1'] },
      encryptionKeyArn: 'arn:aws:kms:us-east-1:123456789012:key/abc',
      secrets: [{ secretArn: 'arn:aws:secretsmanager:us-east-1:123456789012:secret:my' }]
    } as any;

    const binding: ComponentBinding = {
      from: 'producer', to: 'job', capability: 'batch:job', access: ['read', 'write'], env: {},
      options: { requireSecureNetworking: true, enableEncryption: true }
    } as any;
    const context: BindingContext = { region: 'us-east-1', accountId: '123456789012', environment: 'test' } as any;

    await strategy.bind(source as any, target as any, binding, context);

    expect(source.env.BATCH_SUBNETS).toBe('subnet-1,subnet-2');
    expect(source.env.BATCH_SECURITY_GROUPS).toBe('sg-1');
    expect(source.env.BATCH_ENCRYPTION_ENABLED).toBe('true');
    expect(source.env.BATCH_ENCRYPTION_KEY_ARN).toBe(target.encryptionKeyArn);
    expect(source.env.BATCH_SECRETS_ARN).toBe('arn:aws:secretsmanager:us-east-1:123456789012:secret:my');
    expect(source.policies.length).toBeGreaterThan(0);
  });
});


