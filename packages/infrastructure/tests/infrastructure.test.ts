test('Infrastructure app runs without errors', () => {
  require('../src/app');
});

test('Infrastructure can import all components', () => {
  const { ComponentRegistry } = require('@platform/core-engine');
  const { LambdaApiComponent } = require('@platform/lambda-api');
  const { RdsPostgresComponent } = require('@platform/rds-postgres');
  const { SqsQueueComponent } = require('@platform/sqs-queue');

  const registry = new ComponentRegistry();
  registry.register(new LambdaApiComponent());
  registry.register(new RdsPostgresComponent());
  registry.register(new SqsQueueComponent());

  expect(registry.getComponents().length).toBe(3);
});
