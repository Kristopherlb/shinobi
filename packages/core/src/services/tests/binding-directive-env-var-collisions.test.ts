import { ResolverEngine } from '../../resolver/resolver-engine.js';
import { UnifiedBinderRegistry } from '../../platform/binders/registry/unified-binder-registry.js';
import { createOutputsMap, createTestLogger, createTestStack, MockComponent } from '../../resolver/__tests__/test-helpers.js';
import type { IUnifiedBinderStrategy } from '../../platform/contracts/platform-binding-trigger-spec.js';

const createEnvVarStrategy = (): IUnifiedBinderStrategy => ({
  supportedCapabilities: ['networking:vpc'],
  canHandle: () => true,
  bind: async (context) => ({
    environmentVariables: context.directive.env ?? {},
    iamPolicies: [],
    securityGroupRules: [],
    compliance: { status: 'compliant', framework: 'commercial', actionsTaken: [] }
  }),
  getCompatibilityMatrix: () => []
});

describe('BindingDirective__EnvVarCollisions', () => {
  it('EnvVarCollisions__SameNameDifferentMeanings__Detected', async () => {
    const stack = createTestStack();
    const source = new MockComponent(stack, 'Lambda', { name: 'lambda', type: 'lambda-api' });
    const vpcA = new MockComponent(stack, 'VpcA', { name: 'vpc-a', type: 'vpc' });
    const vpcB = new MockComponent(stack, 'VpcB', { name: 'vpc-b', type: 'vpc' });
    source.spec.binds = [
      { to: 'vpc-a', capability: 'networking:vpc', access: 'read', env: { VPC_ID: 'vpc-a' } },
      { to: 'vpc-b', capability: 'networking:vpc', access: 'read', env: { VPC_ID: 'vpc-b' } }
    ];

    const logger = createTestLogger();
    const resolver = new ResolverEngine({
      logger,
      binderRegistry: new UnifiedBinderRegistry([createEnvVarStrategy()])
    });

    await (resolver as any).bindComponents([source, vpcA, vpcB], createOutputsMap([source, vpcA, vpcB]), {});

    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Environment variable conflict for VPC_ID'));
  });

  it('EnvVarCollisions__NamespacedVariables__NoCollision', async () => {
    const stack = createTestStack();
    const source = new MockComponent(stack, 'Lambda', { name: 'lambda', type: 'lambda-api' });
    const vpcA = new MockComponent(stack, 'VpcA', { name: 'vpc-a', type: 'vpc' });
    const vpcB = new MockComponent(stack, 'VpcB', { name: 'vpc-b', type: 'vpc' });
    source.spec.binds = [
      { to: 'vpc-a', capability: 'networking:vpc', access: 'read', env: { VPC_A_ID: 'vpc-a' } },
      { to: 'vpc-b', capability: 'networking:vpc', access: 'read', env: { VPC_B_ID: 'vpc-b' } }
    ];

    const logger = createTestLogger();
    const resolver = new ResolverEngine({
      logger,
      binderRegistry: new UnifiedBinderRegistry([createEnvVarStrategy()])
    });

    await (resolver as any).bindComponents([source, vpcA, vpcB], createOutputsMap([source, vpcA, vpcB]), {});

    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('EnvVarCollisions__VariableRegistry__Tracking', async () => {
    const stack = createTestStack();
    const source = new MockComponent(stack, 'Lambda', { name: 'lambda', type: 'lambda-api' });
    const vpcA = new MockComponent(stack, 'VpcA', { name: 'vpc-a', type: 'vpc' });
    const vpcB = new MockComponent(stack, 'VpcB', { name: 'vpc-b', type: 'vpc' });
    source.spec.binds = [
      { to: 'vpc-a', capability: 'networking:vpc', access: 'read', env: { VPC_ID: 'vpc-a' } },
      { to: 'vpc-b', capability: 'networking:vpc', access: 'read', env: { VPC_ID: 'vpc-b' } }
    ];

    const logger = createTestLogger();
    const resolver = new ResolverEngine({
      logger,
      binderRegistry: new UnifiedBinderRegistry([createEnvVarStrategy()])
    });

    await (resolver as any).bindComponents([source, vpcA, vpcB], createOutputsMap([source, vpcA, vpcB]), {});

    const warningCalls = (
      logger.warn as unknown as { mock: { calls: Array<Array<unknown>> } }
    ).mock.calls.flat().join(' ');
    expect(warningCalls).toContain('Environment variable conflict');
  });
});
