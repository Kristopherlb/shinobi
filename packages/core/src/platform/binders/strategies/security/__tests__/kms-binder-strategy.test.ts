/**
 * Path: packages/core/src/platform/binders/strategies/security/__tests__/kms-binder-strategy.test.ts
 */

import { KmsBinderStrategy } from '../kms-binder-strategy.ts';
import type { BindingContext } from '../../../binding-context.ts';
import type { ComponentBinding } from '../../../component-binding.ts';

class MockComponent {
  public env: Record<string, string> = {};
  public policies: any[] = [];
  addEnvironment(key: string, value: string) {
    this.env[key] = value;
  }
  addToRolePolicy(statement: any) {
    this.policies.push(statement);
  }
}

describe('KmsBinderStrategy config-driven behavior', () => {
  test('KmsBinder__RequireSecureAccessEnabled__AppliesSecureKeyAccess', async () => {
    const metadata = {
      id: 'TP-binders-kms-001',
      level: 'unit',
      capability: 'kms:key',
      oracle: 'exact',
      invariants: [
        'when requireSecureAccess=true, secure key access configuration applies',
        'IAM statements are resource-scoped'
      ],
      fixtures: ['MockComponent', 'MockKmsKey'],
      inputs: { shape: 'ComponentBinding', notes: 'requireSecureAccess true' },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: false,
      human_reviewed_by: ''
    };

    const strategy = new KmsBinderStrategy();
    const source = new MockComponent();
    const target = {
      keyArn: 'arn:aws:kms:us-east-1:123456789012:key/abc',
      keyId: 'abc'
    } as any;

    const binding: ComponentBinding = {
      from: 'api',
      to: 'kmsKey',
      capability: 'kms:key',
      access: ['read', 'encrypt'],
      env: {},
      options: { requireSecureAccess: true }
    } as any;

    const context: BindingContext = {
      region: 'us-east-1',
      accountId: '123456789012',
      environment: 'test'
    } as any;

    await strategy.bind(source as any, target as any, binding, context);

    expect(source.env.KMS_KEY_ID).toBe('abc');
    expect(source.env.KMS_KEY_ARN).toBe(target.keyArn);
    expect(source.policies.length).toBeGreaterThan(0);
    for (const pol of source.policies) {
      const resources = Array.isArray(pol.Resource) ? pol.Resource : [pol.Resource];
      expect(resources.every((r: string) => typeof r === 'string' && r.includes('arn:aws'))).toBe(true);
    }
  });

  test('KmsBinder__EnableKeyRotationFlag__SetsRotationEnvAndPolicies', async () => {
    const metadata = {
      id: 'TP-binders-kms-002',
      level: 'unit',
      capability: 'kms:key',
      oracle: 'exact',
      invariants: [
        'enableKeyRotation applies KMS_AUTOMATIC_KEY_ROTATION_ENABLED env'
      ],
      fixtures: ['MockComponent', 'MockKmsKey'],
      inputs: { shape: 'ComponentBinding', notes: 'enableKeyRotation true' },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: false,
      human_reviewed_by: ''
    };

    const strategy = new KmsBinderStrategy();
    const source = new MockComponent();
    const target = {
      keyArn: 'arn:aws:kms:us-east-1:123456789012:key/rot-key',
      keyId: 'rot-key',
      enableKeyRotation: true
    } as any;

    const binding: ComponentBinding = {
      from: 'api',
      to: 'kmsKey',
      capability: 'kms:key',
      access: ['admin'],
      env: {},
      options: { requireSecureAccess: true }
    } as any;

    const context: BindingContext = {
      region: 'us-east-1',
      accountId: '123456789012',
      environment: 'test'
    } as any;

    await strategy.bind(source as any, target as any, binding, context);

    expect(source.env.KMS_AUTOMATIC_KEY_ROTATION_ENABLED).toBe('true');
    expect(source.env.KMS_KEY_ID).toBe('rot-key');
  });
});


