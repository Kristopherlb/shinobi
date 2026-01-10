import { createMockBinderRegistry, createMockBinderStrategy, createOutputsMap, createTestResolverEngine, createTestStack, MockComponent } from './test-helpers.js';

describe('ResolverEngine__BindingTargetFailure', () => {
  it('BindingTarget__TargetSynthesisFails__ClearError', async () => {
    const stack = createTestStack();
    const failingComponent = new MockComponent(stack, 'Api', {
      name: 'api',
      type: 'api-gateway-rest',
      onSynth: () => {
        throw new Error('Invalid config');
      }
    });

    const resolver = createTestResolverEngine({
      binderRegistry: createMockBinderRegistry([])
    });

    await expect((resolver as any).synthesizeComponents([failingComponent]))
      .rejects
      .toThrow("Failed to synthesize component 'api': Invalid config");
  });

  it('BindingTarget__TargetMissingFromOutputs__ClearError', async () => {
    const stack = createTestStack();
    const source = new MockComponent(stack, 'Lambda', {
      name: 'lambda',
      type: 'lambda-api'
    });
    source.spec.binds = [{ to: 'missing-api', capability: 'api:rest', access: 'read' }];

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

    await expect((resolver as any).bindComponents([source], createOutputsMap([source]), {}))
      .rejects
      .toThrow('Cannot resolve binding target for directive');
  });

  it('BindingTarget__PreBindingValidation__CatchesEarly', async () => {
    const stack = createTestStack();
    const source = new MockComponent(stack, 'Lambda', {
      name: 'lambda',
      type: 'lambda-api'
    });
    source.spec.binds = [{ to: 'missing-api', capability: 'api:rest', access: 'read' }];

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

    await expect((resolver as any).bindComponents([source], createOutputsMap([source]), {}))
      .rejects
      .toThrow('Cannot resolve binding target');
    expect(bindSpy).not.toHaveBeenCalled();
  });
});
