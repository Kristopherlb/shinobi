import { BindingDirectiveValidator } from '../binding-directive-validator.js';
import { UnifiedBinderRegistry } from '../../platform/binders/registry/unified-binder-registry.js';
import type { IUnifiedBinderStrategy } from '../../platform/contracts/platform-binding-trigger-spec.js';

const createStrategy = (capability: string): IUnifiedBinderStrategy => ({
  supportedCapabilities: [capability],
  canHandle: () => true,
  bind: async () => ({
    environmentVariables: {},
    iamPolicies: [],
    securityGroupRules: [],
    compliance: { status: 'compliant', framework: 'commercial', actionsTaken: [] }
  }),
  getCompatibilityMatrix: () => []
});

describe('BindingDirectiveValidator__RequiredCapabilities', () => {
  it('RequiredCapabilities__MissingCapability__PreSynthesisError', async () => {
    const registry = new UnifiedBinderRegistry([createStrategy('api:rest')]);
    const validator = new BindingDirectiveValidator({
      binderRegistry: registry,
      complianceFramework: 'commercial'
    });

    const manifest = {
      components: [
        { name: 'lambda', type: 'lambda-api', binds: [{ to: 'missing-api', capability: 'api:rest', access: 'read' }] }
      ]
    };

    const errors = await validator.validateBindingDirectives(manifest);
    expect(errors.some(error => error.message.includes("Target component 'missing-api' not found"))).toBe(true);
  });

  it('RequiredCapabilities__CapabilityRegistry__Validation', async () => {
    const registry = new UnifiedBinderRegistry([]);
    const validator = new BindingDirectiveValidator({
      binderRegistry: registry,
      complianceFramework: 'commercial'
    });

    const manifest = {
      components: [
        { name: 'lambda', type: 'lambda-api', binds: [{ to: 'api', capability: 'api:rest', access: 'read' }] },
        { name: 'api', type: 'api-gateway-rest' }
      ]
    };

    const errors = await validator.validateBindingDirectives(manifest);
    expect(errors.some(error => error.message.includes('No binder found'))).toBe(true);
  });

  it('RequiredCapabilities__ComponentRequiresVpc__Validation', async () => {
    const registry = new UnifiedBinderRegistry([createStrategy('networking:vpc')]);
    const validator = new BindingDirectiveValidator({
      binderRegistry: registry,
      complianceFramework: 'commercial'
    });

    const manifest = {
      components: [
        { name: 'rds', type: 'rds-postgres', binds: [{ to: 'vpc', capability: 'networking:vpc', access: 'read' }] }
      ]
    };

    const errors = await validator.validateBindingDirectives(manifest);
    expect(errors.some(error => error.message.includes("Target component 'vpc' not found"))).toBe(true);
  });
});
