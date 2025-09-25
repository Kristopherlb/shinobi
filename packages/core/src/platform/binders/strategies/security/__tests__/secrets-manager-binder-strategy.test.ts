/**
 * Path: packages/core/src/platform/binders/strategies/security/__tests__/secrets-manager-binder-strategy.test.ts
 */

import { SecretsManagerBinderStrategy } from '../secrets-manager-binder-strategy';
import type { BindingContext } from '../../../binding-context';
import type { ComponentBinding } from '../../../component-binding';

class MockComponent {
  public env: Record<string, string> = {};
  public policies: any[] = [];
  addEnvironment(k: string, v: string) { this.env[k] = v; }
  addToRolePolicy(stmt: any) { this.policies.push(stmt); }
}

describe('SecretsManagerBinderStrategy config-driven behavior', () => {
  test('SecretsManager__RequireSecureAccessEnabled__AppliesKmsAndAudit', async () => {
    const metadata = {
      id: 'TP-binders-secrets-001',
      level: 'unit',
      capability: 'secretsmanager:secret',
      oracle: 'exact',
      invariants: ['KMS key id set when provided', 'audit logging enabled'],
      fixtures: ['MockComponent', 'MockSecret'],
      inputs: { shape: 'ComponentBinding', notes: 'requireSecureAccess true' },
      risks: [], dependencies: [], evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: false, human_reviewed_by: ''
    };

    const strategy = new SecretsManagerBinderStrategy();
    const source = new MockComponent();
    const target = {
      secretArn: 'arn:aws:secretsmanager:us-east-1:123456789012:secret:db',
      name: 'db',
      description: 'creds',
      kmsKeyId: 'arn:aws:kms:us-east-1:123456789012:key/sec'
    } as any;

    const binding: ComponentBinding = {
      from: 'api', to: 'secret', capability: 'secretsmanager:secret', access: ['read', 'write'], env: {},
      options: { requireSecureAccess: true }
    } as any;
    const context: BindingContext = { region: 'us-east-1', accountId: '123456789012', environment: 'test' } as any;

    await strategy.bind(source as any, target as any, binding, context);

    expect(source.env.SECRETS_MANAGER_SECRET_ARN).toBe(target.secretArn);
    expect(source.env.SECRETS_MANAGER_SECRET_NAME).toBe('db');
    expect(source.env.SECRETS_MANAGER_KMS_KEY_ID).toBe('arn:aws:kms:us-east-1:123456789012:key/sec');
    expect(source.env.SECRETS_MANAGER_AUDIT_LOGGING_ENABLED).toBe('true');
    expect(source.policies.length).toBeGreaterThan(0);
  });

  test('SecretsManager__AutoRotationDaysSet__AppliesRotationEnvs', async () => {
    const metadata = {
      id: 'TP-binders-secrets-002',
      level: 'unit',
      capability: 'secretsmanager:secret',
      oracle: 'exact',
      invariants: ['auto rotation flags reflect target config'],
      fixtures: ['MockComponent', 'MockSecret'],
      inputs: { shape: 'ComponentBinding', notes: 'autoRotationDays set on target' },
      risks: [], dependencies: [], evidence: [],
      compliance_refs: ['docs/platform-standards/platform-testing-standard.md'],
      ai_generated: false, human_reviewed_by: ''
    };

    const strategy = new SecretsManagerBinderStrategy();
    const source = new MockComponent();
    const target = {
      secretArn: 'arn:aws:secretsmanager:us-east-1:123456789012:secret:db',
      name: 'db',
      autoRotationDays: 45
    } as any;

    const binding: ComponentBinding = {
      from: 'api', to: 'secret', capability: 'secretsmanager:secret', access: ['read'], env: {},
      options: { requireSecureAccess: true }
    } as any;
    const context: BindingContext = { region: 'us-east-1', accountId: '123456789012', environment: 'test' } as any;

    await strategy.bind(source as any, target as any, binding, context);

    expect(source.env.SECRETS_MANAGER_AUTO_ROTATION_REQUIRED).toBe('true');
    expect(source.env.SECRETS_MANAGER_ROTATION_INTERVAL_DAYS).toBe('45');
  });
});


