import { Construct } from 'constructs';
import { Stack } from 'aws-cdk-lib';
import { LambdaApiComponent, LambdaApiConfigBuilder } from '../index';
import { ComponentContext, ComponentSpec } from '@platform/contracts';

// Helper function to create test context
function createTestContext(): ComponentContext {
  return {
    serviceName: 'test-service',
    environment: 'test',
    complianceFramework: 'commercial',
    scope: new Stack(),
    region: 'us-east-1',
    accountId: '123456789012'
  };
}

// Helper function to create test spec
function createTestSpec(config: any = {}): ComponentSpec {
  return {
    name: 'test-lambda',
    type: 'lambda-api',
    config: {
      handler: 'index.handler',
      ...config
    }
  };
}

test('LambdaApiComponent has correct type', () => {
  const context = createTestContext();
  const spec = createTestSpec();
  const comp = new LambdaApiComponent(new Stack(), 'TestLambda', context, spec);
  expect(comp.getType()).toBe('lambda-api');
});

test('LambdaApiComponent uses default configuration', () => {
  const context = createTestContext();
  const spec = createTestSpec();
  const comp = new LambdaApiComponent(new Stack(), 'TestLambda', context, spec);

  // Test that component can be synthesized
  expect(() => comp.synth()).not.toThrow();

  // Test capabilities
  const capabilities = comp.getCapabilities();
  expect(capabilities).toHaveProperty('lambda:function');
  expect(capabilities).toHaveProperty('api:rest');
});

test('LambdaApiComponent accepts custom configuration', () => {
  const context = createTestContext();
  const spec = createTestSpec({
    handler: 'custom.handler',
    memorySize: 256,
    timeout: 60
  });
  const comp = new LambdaApiComponent(new Stack(), 'TestLambda', context, spec);

  expect(() => comp.synth()).not.toThrow();
  expect(comp.getType()).toBe('lambda-api');
});

test('LambdaApiBuilder can build configuration', () => {
  const builder = new LambdaApiConfigBuilder();
  const context = { complianceFramework: 'commercial', environment: 'test' };
  const input = { handler: 'test.handler', memorySize: 512 };

  const result = builder.build(context, input);
  expect(result.handler).toBe('test.handler');
  expect(result.memorySize).toBe(512);
});

test('LambdaApiBuilder applies compliance defaults', () => {
  const builder = new LambdaApiConfigBuilder();
  const context = { complianceFramework: 'fedramp-moderate', environment: 'prod' };
  const input = { handler: 'test.handler' };

  const result = builder.build(context, input);
  expect(result.handler).toBe('test.handler');
  expect(result.memorySize).toBe(768); // FedRAMP moderate default
  expect(result.timeout).toBe(45); // FedRAMP moderate default
});
