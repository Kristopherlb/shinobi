/**
 * Path: packages/core/src/platform/binders/strategies/messaging/__tests__/eventbridge-binder-strategy.test.ts
 */

import { EventBridgeBinderStrategy } from '../eventbridge-binder-strategy.js';
import type { BindingContext } from '../../../binding-context.js';
import type { ComponentBinding } from '../../../component-binding.js';

class MockComponent {
  public env: Record<string, string> = {};
  public policies: any[] = [];
  addEnvironment(key: string, value: string) { this.env[key] = value; }
  addToRolePolicy(statement: any) { this.policies.push(statement); }
}

describe('EventBridgeBinderStrategy config-driven behavior', () => {
  test('EventBridge__RequireSecureAccessEnabled__AppliesSecureAccess', async () => {
    const metadata = {
      id: 'TP-binders-eventbridge-001',
      level: 'unit',
      capability: 'eventbridge:event-bus',
      oracle: 'exact',
      invariants: ['audit logging enabled', 'IAM resource ARNs scoped'],
      fixtures: ['MockComponent', 'MockEventBus'],
      inputs: { shape: 'ComponentBinding', notes: 'requireSecureAccess true' },
      risks: [], dependencies: [], evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: false, human_reviewed_by: ''
    };

    const strategy = new EventBridgeBinderStrategy();
    const source = new MockComponent();
    const target = {
      eventBusArn: 'arn:aws:events:us-east-1:123456789012:event-bus/app-bus',
      eventBusName: 'app-bus',
      policy: '{}',
      kmsKeyId: 'arn:aws:kms:us-east-1:123456789012:key/evt'
    } as any;

    const binding: ComponentBinding = {
      from: 'api',
      to: 'bus',
      capability: 'eventbridge:event-bus',
      access: ['read', 'write'],
      env: {},
      options: { requireSecureAccess: true }
    } as any;

    const context: BindingContext = { region: 'us-east-1', accountId: '123456789012', environment: 'test' } as any;

    await strategy.bind(source as any, target as any, binding, context);

    expect(source.env.EVENTBRIDGE_EVENT_BUS_NAME).toBe('app-bus');
    expect(source.env.EVENTBRIDGE_KMS_KEY_ID).toBe('arn:aws:kms:us-east-1:123456789012:key/evt');
    expect(source.env.EVENTBRIDGE_AUDIT_LOGGING_ENABLED).toBe('true');
    expect(source.policies.length).toBeGreaterThan(0);
  });

  test('EventBridge__EnableVpcAndFiltering__SetsFeatureFlags', async () => {
    const metadata = {
      id: 'TP-binders-eventbridge-002',
      level: 'unit',
      capability: 'eventbridge:event-bus',
      oracle: 'exact',
      invariants: ['vpc endpoint and filtering flags reflect target config'],
      fixtures: ['MockComponent', 'MockEventBus'],
      inputs: { shape: 'ComponentBinding', notes: 'enableVpcEndpoint + enableEventFiltering on target' },
      risks: [], dependencies: [], evidence: [],
      compliance_refs: ['docs/platform-standards/platform-testing-standard.md'],
      ai_generated: false, human_reviewed_by: ''
    };

    const strategy = new EventBridgeBinderStrategy();
    const source = new MockComponent();
    const target = {
      eventBusArn: 'arn:aws:events:us-east-1:123456789012:event-bus/app-bus',
      eventBusName: 'app-bus',
      enableVpcEndpoint: true,
      enableEventFiltering: true
    } as any;

    const binding: ComponentBinding = {
      from: 'api', to: 'bus', capability: 'eventbridge:event-bus', access: ['read'], env: {}, options: { requireSecureAccess: true }
    } as any;
    const context: BindingContext = { region: 'us-east-1', accountId: '123456789012', environment: 'test' } as any;

    await strategy.bind(source as any, target as any, binding, context);
    expect(source.env.EVENTBRIDGE_VPC_ENDPOINT_ENABLED).toBe('true');
    expect(source.env.EVENTBRIDGE_EVENT_FILTERING_ENABLED).toBe('true');
  });
});


