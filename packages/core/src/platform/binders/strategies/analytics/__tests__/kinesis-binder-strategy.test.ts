/**
 * Path: packages/core/src/platform/binders/strategies/analytics/__tests__/kinesis-binder-strategy.test.ts
 */

import { KinesisBinderStrategy } from '../kinesis-binder-strategy';
import type { BindingContext } from '../../../binding-context';
import type { ComponentBinding } from '../../../component-binding';

class MockComponent {
  public env: Record<string, string> = {};
  public policies: any[] = [];
  addEnvironment(k: string, v: string) { this.env[k] = v; }
  addToRolePolicy(stmt: any) { this.policies.push(stmt); }
}

describe('KinesisBinderStrategy config-driven behavior', () => {
  test('KinesisStream__RequireSecureAccessWithRetention__SetsRetentionEnv', async () => {
    const metadata = {
      id: 'TP-binders-kinesis-001',
      level: 'unit',
      capability: 'kinesis:stream',
      oracle: 'exact',
      invariants: ['retention days env set when provided'],
      fixtures: ['MockComponent', 'MockStream'],
      inputs: { shape: 'ComponentBinding', notes: 'requireSecureAccess true; retentionDays 14' },
      risks: [], dependencies: [], evidence: [],
      compliance_refs: ['docs/platform-standards/platform-testing-standard.md'],
      ai_generated: false, human_reviewed_by: ''
    };

    const strategy = new KinesisBinderStrategy();
    const source = new MockComponent();
    const target = {
      streamArn: 'arn:aws:kinesis:us-east-1:123456789012:stream/app',
      streamName: 'app',
      shardCount: 2,
      retentionPeriodHours: 24,
      streamStatus: 'ACTIVE'
    } as any;

    const binding: ComponentBinding = {
      from: 'producer', to: 'stream', capability: 'kinesis:stream', access: ['read', 'write'], env: {},
      options: { requireSecureAccess: true, retentionDays: 14 }
    } as any;
    const context: BindingContext = { region: 'us-east-1', accountId: '123456789012', environment: 'test' } as any;

    await strategy.bind(source as any, target as any, binding, context);

    expect(source.env.KINESIS_STREAM_RETENTION_DAYS).toBe('14');
    expect(source.policies.length).toBeGreaterThan(0);
  });
});


