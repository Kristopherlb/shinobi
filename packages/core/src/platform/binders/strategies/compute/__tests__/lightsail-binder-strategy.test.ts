/**
 * Path: packages/core/src/platform/binders/strategies/compute/__tests__/lightsail-binder-strategy.test.ts
 */

import { LightsailBinderStrategy } from '../lightsail-binder-strategy.ts';
import type { BindingContext } from '../../../binding-context.ts';
import type { ComponentBinding } from '../../../component-binding.ts';

class MockComponent {
  public env: Record<string, string> = {};
  public policies: any[] = [];
  addEnvironment(k: string, v: string) { this.env[k] = v; }
  addToRolePolicy(stmt: any) { this.policies.push(stmt); }
}

describe('LightsailBinderStrategy config-driven behavior', () => {
  test('LightsailDatabase__RequireSecureAccess__AppliesSslBackupRetention', async () => {
    const metadata = {
      id: 'TP-binders-lightsail-001',
      level: 'unit',
      capability: 'lightsail:database',
      oracle: 'exact',
      invariants: ['envs set for SSL and backup retention days'],
      fixtures: ['MockComponent', 'MockLightsailDatabase'],
      inputs: { shape: 'ComponentBinding', notes: 'requireSecureAccess true; backupRetentionDays set' },
      risks: [], dependencies: [], evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: false, human_reviewed_by: ''
    };

    const strategy = new LightsailBinderStrategy();
    const source = new MockComponent();
    const target = {
      databaseArn: 'arn:aws:lightsail:us-east-1:123456789012:RelationalDatabase/db1',
      relationalDatabaseName: 'db1',
      relationalDatabaseBlueprintId: 'mysql',
      relationalDatabaseBundleId: 'micro',
      masterEndpoint: { address: 'db1.aws', port: 3306 },
      masterUsername: 'admin',
      backupRetentionEnabled: true,
      parameterApplyStatus: 'in-sync',
      preferredMaintenanceWindow: 'Sun:23:00-Sun:23:30'
    } as any;

    const binding: ComponentBinding = {
      from: 'svc', to: 'db1', capability: 'lightsail:database', access: ['read', 'write'], env: {},
      options: { requireSecureAccess: true, backupRetentionDays: 14 }
    } as any;
    const context: BindingContext = { region: 'us-east-1', accountId: '123456789012', environment: 'test' } as any;

    await strategy.bind(source as any, target as any, binding, context);

    expect(source.env.LIGHTSAIL_DATABASE_SSL_ENABLED).toBe('true');
    expect(source.env.LIGHTSAIL_BACKUP_RETENTION_ENABLED).toBe('true');
    expect(source.env.LIGHTSAIL_BACKUP_RETENTION_DAYS).toBe('14');
    expect(source.env.LIGHTSAIL_PARAMETER_APPLY_STATUS).toBe('in-sync');
    expect(source.env.LIGHTSAIL_MAINTENANCE_WINDOW).toBe('Sun:23:00-Sun:23:30');
  });
});


