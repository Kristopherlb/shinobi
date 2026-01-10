import { createMockBinderRegistry, createMockBinderStrategy, createOutputsMap, createTestResolverEngine, createTestStack, MockComponent } from './test-helpers.js';

describe('ResolverEngine__CircularBindings', () => {
  it('CircularBindings__DirectCycle__DetectedEarly', async () => {
    const stack = createTestStack();
    const componentA = new MockComponent(stack, 'ServiceA', { name: 'service-a', type: 'lambda-api' });
    const componentB = new MockComponent(stack, 'ServiceB', { name: 'service-b', type: 'lambda-api' });
    componentA.spec.binds = [{ to: 'service-b', capability: 'api:rest', access: 'read' }];
    componentB.spec.binds = [{ to: 'service-a', capability: 'api:rest', access: 'read' }];

    const registry = createMockBinderRegistry([createMockBinderStrategy({
      supportedCapabilities: ['api:rest'],
      bind: async () => ({
        environmentVariables: {},
        iamPolicies: [],
        securityGroupRules: [],
        compliance: { status: 'compliant', framework: 'commercial', actionsTaken: [] }
      })
    })]);
    const resolver = createTestResolverEngine({ binderRegistry: registry });

    await expect((resolver as any).bindComponents([componentA, componentB], createOutputsMap([componentA, componentB]), {}))
      .rejects
      .toThrow('Circular binding dependency detected');
  });

  it('CircularBindings__IndirectCycle__DetectedEarly', async () => {
    const stack = createTestStack();
    const componentA = new MockComponent(stack, 'ServiceA', { name: 'service-a', type: 'lambda-api' });
    const componentB = new MockComponent(stack, 'ServiceB', { name: 'service-b', type: 'lambda-api' });
    const componentC = new MockComponent(stack, 'ServiceC', { name: 'service-c', type: 'lambda-api' });
    componentA.spec.binds = [{ to: 'service-b', capability: 'api:rest', access: 'read' }];
    componentB.spec.binds = [{ to: 'service-c', capability: 'api:rest', access: 'read' }];
    componentC.spec.binds = [{ to: 'service-a', capability: 'api:rest', access: 'read' }];

    const registry = createMockBinderRegistry([createMockBinderStrategy({
      supportedCapabilities: ['api:rest'],
      bind: async () => ({
        environmentVariables: {},
        iamPolicies: [],
        securityGroupRules: [],
        compliance: { status: 'compliant', framework: 'commercial', actionsTaken: [] }
      })
    })]);
    const resolver = createTestResolverEngine({ binderRegistry: registry });

    await expect((resolver as any).bindComponents([componentA, componentB, componentC], createOutputsMap([componentA, componentB, componentC]), {}))
      .rejects
      .toThrow('Circular binding dependency detected');
  });

  it('CircularBindings__BindingGraphValidation__PreSynthesis', async () => {
    const stack = createTestStack();
    const componentA = new MockComponent(stack, 'ServiceA', { name: 'service-a', type: 'lambda-api' });
    const componentB = new MockComponent(stack, 'ServiceB', { name: 'service-b', type: 'lambda-api' });
    componentA.spec.binds = [{ to: 'service-b', capability: 'api:rest', access: 'read' }];
    componentB.spec.binds = [{ to: 'service-a', capability: 'api:rest', access: 'read' }];

    const bindSpy = jest.fn(async () => ({
      environmentVariables: {},
      iamPolicies: [],
      securityGroupRules: [],
      compliance: { status: 'compliant', framework: 'commercial', actionsTaken: [] }
    }));

    const registry = createMockBinderRegistry([createMockBinderStrategy({
      supportedCapabilities: ['api:rest'],
      bind: bindSpy
    })]);
    const resolver = createTestResolverEngine({ binderRegistry: registry });

    await expect((resolver as any).bindComponents([componentA, componentB], createOutputsMap([componentA, componentB]), {}))
      .rejects
      .toThrow('Circular binding dependency detected');
    expect(bindSpy).not.toHaveBeenCalled();
  });
});
