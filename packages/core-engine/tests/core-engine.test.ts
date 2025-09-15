import { ComponentRegistry, ManifestResolver, ComponentValidator, BinderRegistry } from '../src/index';
import { ComponentSpec, ComponentConfig, ComponentBinding } from '@platform/contracts';

class DummyComponent implements ComponentSpec {
  name = 'dummy';
}

test('ComponentRegistry can register a component', () => {
  const registry = new ComponentRegistry();
  registry.register(new DummyComponent());
  expect(registry.getComponents().length).toBe(1);
});

test('ComponentRegistry can find a component by name', () => {
  const registry = new ComponentRegistry();
  const component = new DummyComponent();
  registry.register(component);
  expect(registry.findComponent('dummy')).toBe(component);
});

test('ManifestResolver can be created with registry', () => {
  const registry = new ComponentRegistry();
  const resolver = new ManifestResolver(registry);
  expect(resolver).toBeInstanceOf(ManifestResolver);
});

test('ComponentValidator validates components', () => {
  const validator = new ComponentValidator();
  const component = new DummyComponent();
  const config: ComponentConfig = { test: true };
  expect(validator.validate(component, config)).toBe(true);
});

test('BinderRegistry can add and retrieve bindings', () => {
  const binderRegistry = new BinderRegistry();
  const binding: ComponentBinding = {
    from: 'lambda-api',
    to: 'rds-postgres',
    capability: 'database:read'
  };
  binderRegistry.addBinding(binding);
  expect(binderRegistry.getBindings().length).toBe(1);
  expect(binderRegistry.getBindings()[0]).toBe(binding);
});
