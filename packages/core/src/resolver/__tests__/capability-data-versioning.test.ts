import { createMockBinderRegistry, createMockBinderStrategy, createOutputsMap, createTestResolverEngine, createTestStack, MockComponent } from './test-helpers.js';

describe('ResolverEngine__CapabilityVersioning', () => {
  it('CapabilityVersioning__VersionMismatch__Handled', async () => {
    const stack = createTestStack();
    const source = new MockComponent(stack, 'Lambda', { name: 'lambda', type: 'lambda-api' });
    const target = new MockComponent(stack, 'Api', {
      name: 'api',
      type: 'api-gateway-rest',
      capabilities: { 'api:rest': { version: 1, resources: { apiId: 'abc' } } }
    });
    source.spec.binds = [{ to: 'api', capability: 'api:rest', access: 'read', options: { expectedVersion: 2 } }];

    const registry = createMockBinderRegistry([createMockBinderStrategy({
      supportedCapabilities: ['api:rest'],
      bind: async (context) => {
        const capability = context.target.getCapabilities()['api:rest'];
        if (capability.version !== context.directive.options?.expectedVersion) {
          throw new Error(`Capability version mismatch: ${capability.version} != ${context.directive.options?.expectedVersion}`);
        }
        return {
          environmentVariables: {},
          iamPolicies: [],
          securityGroupRules: [],
          compliance: { status: 'compliant', framework: 'commercial', actionsTaken: [] }
        };
      }
    })]);
    const resolver = createTestResolverEngine({ binderRegistry: registry });

    await expect((resolver as any).bindComponents([source, target], createOutputsMap([source, target]), {}))
      .rejects
      .toThrow('Capability version mismatch');
  });

  it('CapabilityVersioning__BackwardCompatibility__Maintained', async () => {
    const stack = createTestStack();
    const source = new MockComponent(stack, 'Lambda', { name: 'lambda', type: 'lambda-api' });
    const target = new MockComponent(stack, 'Api', {
      name: 'api',
      type: 'api-gateway-rest',
      capabilities: { 'api:rest': { version: 1, resources: { apiId: 'abc' } } }
    });
    source.spec.binds = [{ to: 'api', capability: 'api:rest', access: 'read', options: { expectedVersion: 1 } }];

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

    await (resolver as any).bindComponents([source, target], createOutputsMap([source, target]), {});
  });

  it('CapabilityVersioning__VersionRegistry__Tracking', async () => {
    const stack = createTestStack();
    const source = new MockComponent(stack, 'Lambda', { name: 'lambda', type: 'lambda-api' });
    const target = new MockComponent(stack, 'Api', {
      name: 'api',
      type: 'api-gateway-rest',
      capabilities: { 'api:rest': { version: 2, resources: { apiId: 'abc' } } }
    });
    source.spec.binds = [{ to: 'api', capability: 'api:rest', access: 'read', options: { expectedVersion: 2 } }];

    const versionRegistry = new Map<string, number>();
    const registry = createMockBinderRegistry([createMockBinderStrategy({
      supportedCapabilities: ['api:rest'],
      bind: async (context) => {
        const capability = context.target.getCapabilities()['api:rest'];
        versionRegistry.set(context.target.spec.name, capability.version);
        return {
          environmentVariables: {},
          iamPolicies: [],
          securityGroupRules: [],
          compliance: { status: 'compliant', framework: 'commercial', actionsTaken: [] }
        };
      }
    })]);
    const resolver = createTestResolverEngine({ binderRegistry: registry });

    await (resolver as any).bindComponents([source, target], createOutputsMap([source, target]), {});

    expect(versionRegistry.get('api')).toBe(2);
  });
});
