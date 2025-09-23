import { LambdaApiComponent, LambdaApiConfigBuilder } from '../index';

test('LambdaApiComponent has correct name', () => {
  const comp = new LambdaApiComponent();
  expect(comp.name).toBe('lambda-api');
});

test('LambdaApiComponent uses default configuration', () => {
  const comp = new LambdaApiComponent();
  expect(comp.getRuntime()).toBe('nodejs18.x');
  expect(comp.getHandler()).toBe('index.handler');
  expect(comp.getTimeout()).toBe(30);
  expect(comp.getMemorySize()).toBe(128);
});

test('LambdaApiComponent accepts custom configuration', () => {
  const config = {
    runtime: 'nodejs20.x',
    handler: 'custom.handler',
    timeout: 60,
    memorySize: 256
  };
  const comp = new LambdaApiComponent(config);
  expect(comp.getRuntime()).toBe('nodejs20.x');
  expect(comp.getHandler()).toBe('custom.handler');
  expect(comp.getTimeout()).toBe(60);
  expect(comp.getMemorySize()).toBe(256);
});

test('LambdaApiBuilder can build component', () => {
  const comp = new LambdaApiComponent();
  const builder = new LambdaApiConfigBuilder();
  const result = builder.build(comp);
  expect(result.functionName).toBe('lambda-lambda-api');
  expect(result.runtime).toBe('nodejs18.x');
});

test('LambdaApiBuilder can generate CloudFormation', () => {
  const comp = new LambdaApiComponent();
  const builder = new LambdaApiConfigBuilder();
  const cf = builder.generateCloudFormation(comp);
  expect(cf.Type).toBe('AWS::Lambda::Function');
  expect(cf.Properties.FunctionName).toBe('lambda-lambda-api');
});
