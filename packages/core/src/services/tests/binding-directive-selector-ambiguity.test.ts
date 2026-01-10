import { ResolverEngine } from '../../resolver/resolver-engine.js';
import { UnifiedBinderRegistry } from '../../platform/binders/registry/unified-binder-registry.js';
import type { IUnifiedBinderStrategy } from '../../platform/contracts/platform-binding-trigger-spec.js';
import { createOutputsMap, createTestLogger, createTestStack, MockComponent } from '../../resolver/__tests__/test-helpers.js';

const createStrategy = (): IUnifiedBinderStrategy => ({
  supportedCapabilities: ['api:rest'],
  canHandle: () => true,
  bind: async () => ({
    environmentVariables: {},
    iamPolicies: [],
    securityGroupRules: [],
    compliance: { status: 'compliant', framework: 'commercial', actionsTaken: [] }
  }),
  getCompatibilityMatrix: () => []
});

describe('BindingDirectiveSelector__Ambiguity', () => {
  it('SelectorAmbiguity__MultipleMatches__ClearError', async () => {
    const stack = createTestStack();
    const source = new MockComponent(stack, 'Lambda', { name: 'lambda', type: 'lambda-api' });
    const apiA = new MockComponent(stack, 'ApiA', { name: 'api-a', type: 'api-gateway-rest' });
    const apiB = new MockComponent(stack, 'ApiB', { name: 'api-b', type: 'api-gateway-rest' });
    source.spec.binds = [{ select: { type: 'api-gateway-rest' }, capability: 'api:rest', access: 'read' }];

    const resolver = new ResolverEngine({
      logger: createTestLogger(),
      binderRegistry: new UnifiedBinderRegistry([createStrategy()])
    });

    await expect((resolver as any).bindComponents([source, apiA, apiB], createOutputsMap([source, apiA, apiB]), {}))
      .rejects
      .toThrow('Ambiguous selector');
  });

  it('SelectorAmbiguity__LabelDisambiguation__Works', async () => {
    const stack = createTestStack();
    const source = new MockComponent(stack, 'Lambda', { name: 'lambda', type: 'lambda-api' });
    const apiA = new MockComponent(stack, 'ApiA', { name: 'api-a', type: 'api-gateway-rest' });
    const apiB = new MockComponent(stack, 'ApiB', { name: 'api-b', type: 'api-gateway-rest' });
    apiA.spec.labels = { env: 'prod' };
    apiB.spec.labels = { env: 'staging' };
    source.spec.binds = [{ select: { type: 'api-gateway-rest', withLabels: { env: 'prod' } }, capability: 'api:rest', access: 'read' }];

    const resolver = new ResolverEngine({
      logger: createTestLogger(),
      binderRegistry: new UnifiedBinderRegistry([createStrategy()])
    });

    await (resolver as any).bindComponents([source, apiA, apiB], createOutputsMap([source, apiA, apiB]), {});
  });

  it('SelectorAmbiguity__PreValidation__CatchesEarly', async () => {
    const stack = createTestStack();
    const source = new MockComponent(stack, 'Lambda', { name: 'lambda', type: 'lambda-api' });
    const apiA = new MockComponent(stack, 'ApiA', { name: 'api-a', type: 'api-gateway-rest' });
    const apiB = new MockComponent(stack, 'ApiB', { name: 'api-b', type: 'api-gateway-rest' });
    source.spec.binds = [{ select: { type: 'api-gateway-rest' }, capability: 'api:rest', access: 'read' }];

    const bindSpy = jest.fn(async () => ({
      environmentVariables: {},
      iamPolicies: [],
      securityGroupRules: [],
      compliance: { status: 'compliant', framework: 'commercial', actionsTaken: [] }
    }));

    const resolver = new ResolverEngine({
      logger: createTestLogger(),
      binderRegistry: new UnifiedBinderRegistry([{
        supportedCapabilities: ['api:rest'],
        canHandle: () => true,
        bind: bindSpy,
        getCompatibilityMatrix: () => []
      }])
    });

    await expect((resolver as any).bindComponents([source, apiA, apiB], createOutputsMap([source, apiA, apiB]), {}))
      .rejects
      .toThrow('Ambiguous selector');
    expect(bindSpy).not.toHaveBeenCalled();
  });
});
