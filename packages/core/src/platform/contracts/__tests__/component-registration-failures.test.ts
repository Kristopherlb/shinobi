import { ComponentFactoryBuilder } from '../components/component-factory.js';
import { ComponentRegistry } from '../components/component-registry.js';
import type { ComponentContext } from '../components/component-context.js';

class ValidComponent {
  constructor() {}
  getName() { return 'valid'; }
  getId() { return 'valid'; }
  getType() { return 'valid'; }
  getCapabilityData() { return { type: 'test', resources: {} }; }
  getServiceName() { return 'service'; }
  synth() { return undefined; }
}

describe('ComponentRegistry__Failures', () => {
  it('ComponentRegistration__MissingDist__ClearError', () => {
    const factory = new ComponentFactoryBuilder().build();
    const context = { scope: {} } as ComponentContext;
    expect(() => factory.create('missing-component', context, { name: 'missing', type: 'missing-component', config: {} }))
      .toThrow('Unsupported component type');
  });

  it('ComponentRegistration__ModuleResolutionFailure__ClearError', () => {
    const registry = new ComponentRegistry();
    expect(() => registry.register('invalid', null as any)).toThrow('Component class must be a constructor function');
  });

  it('ComponentRegistration__DiscoveryRobustness__Fallbacks', () => {
    const registry = new ComponentRegistry();
    registry.register('valid', ValidComponent as any);
    expect(registry.hasComponent('valid')).toBe(true);
    expect(() => registry.register('', ValidComponent as any)).toThrow('Component type must be a non-empty string');
    expect(registry.hasComponent('valid')).toBe(true);
  });
});
