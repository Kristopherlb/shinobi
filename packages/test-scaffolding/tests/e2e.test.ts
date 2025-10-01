import { ComponentRegistry } from '@platform/core-engine';
import { LambdaApiComponent } from '@platform/lambda-api';
import { TestHarness } from '../src/index.js';

test('LambdaApiComponent can be registered in ComponentRegistry', () => {
  const registry = new ComponentRegistry();
  registry.register(new LambdaApiComponent());
  expect(registry.getComponents().length).toBe(1);
});

test('TestHarness can manage components', () => {
  const harness = new TestHarness();
  const component = new LambdaApiComponent();

  harness.addComponent(component);
  expect(harness.getComponents().length).toBe(1);

  harness.clear();
  expect(harness.getComponents().length).toBe(0);
});

test('End-to-end component integration works', () => {
  const registry = new ComponentRegistry();
  const lambdaComponent = new LambdaApiComponent({
    runtime: 'nodejs20.x',
    timeout: 30
  });

  registry.register(lambdaComponent);

  const foundComponent = registry.findComponent('lambda-api');
  expect(foundComponent).toBeDefined();
  expect(foundComponent?.name).toBe('lambda-api');
});
