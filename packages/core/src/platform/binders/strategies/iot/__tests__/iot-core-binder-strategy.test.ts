/**
 * Path: packages/core/src/platform/binders/strategies/iot/__tests__/iot-core-binder-strategy.test.ts
 */

import { IoTCoreBinderStrategy } from '../iot-core-binder-strategy.ts';
import type { BindingContext } from '../../../binding-context.ts';
import type { ComponentBinding } from '../../../component-binding.ts';

class MockComponent {
  public env: Record<string, string> = {};
  public policies: any[] = [];
  addEnvironment(k: string, v: string) { this.env[k] = v; }
  addToRolePolicy(stmt: any) { this.policies.push(stmt); }
}

describe('IoTCoreBinderStrategy config-driven behavior', () => {
  test('IoTThing__RequireSecureAccessWithmTLSAndVpcEndpoint__AppliesSecurityEnvs', async () => {
    const metadata = {
      id: 'TP-binders-iot-001',
      level: 'unit',
      capability: 'iot:thing',
      oracle: 'exact',
      invariants: ['envs set for device auth, mTLS, VPC endpoint, audit logging'],
      fixtures: ['MockComponent', 'MockThing'],
      inputs: { shape: 'ComponentBinding', notes: 'requireSecureAccess true; requireMutualTls true; enableVpcEndpoint true' },
      risks: [], dependencies: [], evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: false, human_reviewed_by: ''
    };

    const strategy = new IoTCoreBinderStrategy();
    const source = new MockComponent();
    const target = {
      thingArn: 'arn:aws:iot:us-east-1:123456789012:thing/dev1',
      thingName: 'dev1',
      thingTypeName: 'sensor',
      version: 3,
      attributes: { location: 'lab' },
      requireMutualTls: true,
      enableVpcEndpoint: true
    } as any;

    const binding: ComponentBinding = {
      from: 'svc', to: 'dev1', capability: 'iot:thing', access: ['read', 'write', 'shadow'], env: {},
      options: { requireSecureAccess: true }
    } as any;
    const context: BindingContext = { region: 'us-east-1', accountId: '123456789012', environment: 'test' } as any;

    await strategy.bind(source as any, target as any, binding, context);

    expect(source.env.IOT_DEVICE_AUTHENTICATION_ENABLED).toBe('true');
    expect(source.env.IOT_MUTUAL_TLS_ENABLED).toBe('true');
    expect(source.env.IOT_VPC_ENDPOINT_ENABLED).toBe('true');
    expect(source.env.IOT_AUDIT_LOGGING_ENABLED).toBe('true');
    expect(source.env.IOT_THING_ATTR_location).toBe('lab');
    expect(source.policies.length).toBeGreaterThan(0);
  });
});


