/**
 * Path: packages/core/src/platform/binders/strategies/messaging/__tests__/step-functions-binder-strategy.test.ts
 */

import { StepFunctionsBinderStrategy } from '../step-functions-binder-strategy';
import type { BindingContext } from '../../../binding-context';
import type { ComponentBinding } from '../../../component-binding';

class MockComponent {
  public env: Record<string, string> = {};
  public policies: any[] = [];
  addEnvironment(k: string, v: string) { this.env[k] = v; }
  addToRolePolicy(stmt: any) { this.policies.push(stmt); }
}

describe('StepFunctionsBinderStrategy config-driven behavior', () => {
  test('StepFunctions__RequireSecureAccessEnabled__AppliesLoggingTracingAndDlq', async () => {
    const metadata = {
      id: 'TP-binders-stepfunctions-001',
      level: 'unit',
      capability: 'states:state-machine',
      oracle: 'exact',
      invariants: ['logging/tracing enabled when configured', 'IAM policies resource-scoped'],
      fixtures: ['MockComponent', 'MockStateMachine'],
      inputs: { shape: 'ComponentBinding', notes: 'requireSecureAccess true; logging+tracing+dlq configured' },
      risks: [], dependencies: [], evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: false, human_reviewed_by: ''
    };

    const strategy = new StepFunctionsBinderStrategy();
    const source = new MockComponent();
    const target = {
      stateMachineArn: 'arn:aws:states:us-east-1:123456789012:stateMachine:sm',
      stateMachineName: 'sm',
      status: 'ACTIVE',
      loggingConfiguration: { level: 'INFO', includeExecutionData: true },
      tracingConfiguration: { enabled: true },
      definition: '...DeadLetterConfig...',
      deadLetterQueueArn: 'arn:aws:sqs:us-east-1:123456789012:dlq'
    } as any;

    const binding: ComponentBinding = {
      from: 'api', to: 'sm', capability: 'states:state-machine', access: ['read', 'execute'], env: {}, options: { requireSecureAccess: true }
    } as any;
    const context: BindingContext = { region: 'us-east-1', accountId: '123456789012', environment: 'test' } as any;

    await strategy.bind(source as any, target as any, binding, context);

    expect(source.env.STEP_FUNCTIONS_STATE_MACHINE_NAME).toBe('sm');
    expect(source.env.STEP_FUNCTIONS_LOGGING_ENABLED).toBe('true');
    expect(source.env.STEP_FUNCTIONS_XRAY_TRACING_ENABLED).toBe('true');
    expect(source.env.STEP_FUNCTIONS_DEAD_LETTER_QUEUE_ENABLED).toBe('true');
    expect(source.policies.length).toBeGreaterThan(0);
  });
});


