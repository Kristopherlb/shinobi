import { createMockBinderRegistry, createMockBinderStrategy, createOutputsMap, createTestLogger, createTestResolverEngine, createTestStack, MockComponent } from './test-helpers.js';

describe('ResolverEngine__EnvVarConflicts', () => {
  const createEnvVarStrategy = () => createMockBinderStrategy({
    supportedCapabilities: ['networking:vpc'],
    bind: async (context) => ({
      environmentVariables: context.directive.env ?? {},
      iamPolicies: [],
      securityGroupRules: [],
      compliance: { status: 'compliant', framework: 'commercial', actionsTaken: [] }
    })
  });

  it('EnvVarConflicts__DuplicateVariables__Detected', async () => {
    const stack = createTestStack();
    const source = new MockComponent(stack, 'Lambda', { name: 'lambda', type: 'lambda-api' });
    const targetA = new MockComponent(stack, 'VpcA', { name: 'vpc-a', type: 'vpc' });
    const targetB = new MockComponent(stack, 'VpcB', { name: 'vpc-b', type: 'vpc' });
    source.spec.binds = [
      { to: 'vpc-a', capability: 'networking:vpc', access: 'read', env: { VPC_ID: 'vpc-a' } },
      { to: 'vpc-b', capability: 'networking:vpc', access: 'read', env: { VPC_ID: 'vpc-b' } }
    ];

    const logger = createTestLogger();
    const resolver = createTestResolverEngine({
      binderRegistry: createMockBinderRegistry([createEnvVarStrategy()]),
      logger
    });

    await (resolver as any).bindComponents([source, targetA, targetB], createOutputsMap([source, targetA, targetB]), {});

    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Environment variable conflict for VPC_ID'));
  });

  it('EnvVarConflicts__LastBindingWins__Logged', async () => {
    const stack = createTestStack();
    const source = new MockComponent(stack, 'Lambda', { name: 'lambda', type: 'lambda-api' });
    const targetA = new MockComponent(stack, 'VpcA', { name: 'vpc-a', type: 'vpc' });
    const targetB = new MockComponent(stack, 'VpcB', { name: 'vpc-b', type: 'vpc' });
    source.spec.binds = [
      { to: 'vpc-a', capability: 'networking:vpc', access: 'read', env: { VPC_ID: 'vpc-a' } },
      { to: 'vpc-b', capability: 'networking:vpc', access: 'read', env: { VPC_ID: 'vpc-b' } }
    ];

    const logger = createTestLogger();
    const resolver = createTestResolverEngine({
      binderRegistry: createMockBinderRegistry([createEnvVarStrategy()]),
      logger
    });

    await (resolver as any).bindComponents([source, targetA, targetB], createOutputsMap([source, targetA, targetB]), {});

    const warningCalls = (
      logger.warn as unknown as { mock: { calls: Array<Array<unknown>> } }
    ).mock.calls.flat().join(' ');
    expect(warningCalls).toContain('overwritten');
    expect(warningCalls).toContain('vpc-a');
    expect(warningCalls).toContain('vpc-b');
  });

  it('EnvVarConflicts__NamespacedVariables__NoConflict', async () => {
    const stack = createTestStack();
    const source = new MockComponent(stack, 'Lambda', { name: 'lambda', type: 'lambda-api' });
    const targetA = new MockComponent(stack, 'VpcA', { name: 'vpc-a', type: 'vpc' });
    const targetB = new MockComponent(stack, 'VpcB', { name: 'vpc-b', type: 'vpc' });
    source.spec.binds = [
      { to: 'vpc-a', capability: 'networking:vpc', access: 'read', env: { VPC_A_ID: 'vpc-a' } },
      { to: 'vpc-b', capability: 'networking:vpc', access: 'read', env: { VPC_B_ID: 'vpc-b' } }
    ];

    const logger = createTestLogger();
    const resolver = createTestResolverEngine({
      binderRegistry: createMockBinderRegistry([createEnvVarStrategy()]),
      logger
    });

    await (resolver as any).bindComponents([source, targetA, targetB], createOutputsMap([source, targetA, targetB]), {});

    expect(logger.warn).not.toHaveBeenCalled();
  });
});
