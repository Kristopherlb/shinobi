import { ComponentRegistry, ManifestResolver, BinderRegistry } from '@platform/core-engine';
// Import components to ensure they are registered or synthesized (if needed)
import { LambdaApiComponent, LambdaApiBuilder } from '@platform/lambda-api';
import { RdsPostgresComponent, RdsPostgresBuilder } from '@platform/rds-postgres';
import { SqsQueueComponent, SqsQueueBuilder } from '@platform/sqs-queue';

// Example usage: register components and (in real case, synthesize CDK stacks)
const registry = new ComponentRegistry();
const binderRegistry = new BinderRegistry();

// Register components
registry.register(new LambdaApiComponent());
registry.register(new RdsPostgresComponent());
registry.register(new SqsQueueComponent());

console.log('Registered components count:', registry.getComponents().length);

// Example: Build components using their builders
const lambdaBuilder = new LambdaApiBuilder();
const rdsBuilder = new RdsPostgresBuilder();
const sqsBuilder = new SqsQueueBuilder();

const lambdaComponent = new LambdaApiComponent({ runtime: 'nodejs20.x', timeout: 60 });
const rdsComponent = new RdsPostgresComponent({ instanceClass: 'db.t3.small' });
const sqsComponent = new SqsQueueComponent({ visibilityTimeoutSeconds: 60 });

console.log('Lambda API built:', lambdaBuilder.build(lambdaComponent));
console.log('RDS Postgres built:', rdsBuilder.build(rdsComponent));
console.log('SQS Queue built:', sqsBuilder.build(sqsComponent));

// Example: Add bindings
binderRegistry.addBinding({
  from: 'lambda-api',
  to: 'rds-postgres',
  capability: 'database:read'
});

binderRegistry.addBinding({
  from: 'lambda-api',
  to: 'sqs-queue',
  capability: 'queue:send'
});

console.log('Bindings:', binderRegistry.getBindings());

// TODO: Use AWS CDK App to synthesize infrastructure using the registered components
