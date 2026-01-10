import { createMockBinderRegistry, createMockBinderStrategy, createOutputsMap, createTestResolverEngine, createTestStack, MockComponent } from './test-helpers.js';

describe('ResolverEngine__CapabilityMismatches', () => {
  const createCapabilityValidatingStrategy = () => createMockBinderStrategy({
    supportedCapabilities: ['api:rest'],
    bind: async (context) => {
      const capability = context.target.getCapabilities()['api:rest'];
      if (!capability || typeof capability !== 'object') {
        throw new Error('Capability data must be an object');
      }
      if (!capability.resources?.apiId) {
        throw new Error('Missing required field: resources.apiId');
      }
      return {
        environmentVariables: {},
        iamPolicies: [],
        securityGroupRules: [],
        compliance: { status: 'compliant', framework: 'commercial', actionsTaken: [] }
      };
    }
  });

  it('CapabilityMismatch__MissingRequiredFields__ClearError', async () => {
    const stack = createTestStack();
    const source = new MockComponent(stack, 'Lambda', { name: 'lambda', type: 'lambda-api' });
    const target = new MockComponent(stack, 'Api', {
      name: 'api',
      type: 'api-gateway-rest',
      capabilities: { 'api:rest': { resources: {} } }
    });
    source.spec.binds = [{ to: 'api', capability: 'api:rest', access: 'read' }];

    const resolver = createTestResolverEngine({
      binderRegistry: createMockBinderRegistry([createCapabilityValidatingStrategy()])
    });

    await expect((resolver as any).bindComponents([source, target], createOutputsMap([source, target]), {}))
      .rejects
      .toThrow('Missing required field: resources.apiId');
  });

  it('CapabilityMismatch__WrongStructure__ClearError', async () => {
    const stack = createTestStack();
    const source = new MockComponent(stack, 'Lambda', { name: 'lambda', type: 'lambda-api' });
    const target = new MockComponent(stack, 'Api', {
      name: 'api',
      type: 'api-gateway-rest',
      capabilities: { 'api:rest': 'invalid' as any }
    });
    source.spec.binds = [{ to: 'api', capability: 'api:rest', access: 'read' }];

    const resolver = createTestResolverEngine({
      binderRegistry: createMockBinderRegistry([createCapabilityValidatingStrategy()])
    });

    await expect((resolver as any).bindComponents([source, target], createOutputsMap([source, target]), {}))
      .rejects
      .toThrow('Capability data must be an object');
  });

  it('CapabilityMismatch__SchemaValidation__PreBinding', async () => {
    const stack = createTestStack();
    const source = new MockComponent(stack, 'Lambda', { name: 'lambda', type: 'lambda-api' });
    const target = new MockComponent(stack, 'Api', {
      name: 'api',
      type: 'api-gateway-rest',
      capabilities: { 'api:rest': { resources: {} } }
    });
    source.spec.binds = [{ to: 'api', capability: 'api:rest', access: 'read' }];

    const resolver = createTestResolverEngine({
      binderRegistry: createMockBinderRegistry([createCapabilityValidatingStrategy()])
    });

    await expect((resolver as any).bindComponents([source, target], createOutputsMap([source, target]), {}))
      .rejects
      .toThrow('Missing required field');
  });
});
