import { Construct } from 'constructs';
import { Stack } from 'aws-cdk-lib';
import { LambdaApiComponent, LambdaApiConfigBuilder, LambdaApiComponentCreator } from '../index';
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

test('LambdaApiComponent supports custom code path configuration', () => {
  const context = createTestContext();
  const spec = createTestSpec({
    handler: 'custom.handler',
    codePath: './custom-lambda-code',
    useInlineFallback: true
  });
  const comp = new LambdaApiComponent(new Stack(), 'TestLambda', context, spec);

  // Test that component can be synthesized with custom code path
  expect(() => comp.synth()).not.toThrow();
  expect(comp.getType()).toBe('lambda-api');
});

test('LambdaApiComponent falls back to inline code when path not found', () => {
  const context = createTestContext();
  const spec = createTestSpec({
    handler: 'fallback.handler',
    codePath: './non-existent-path',
    useInlineFallback: true
  });
  const comp = new LambdaApiComponent(new Stack(), 'TestLambda', context, spec);

  // Test that component can be synthesized even with non-existent path
  expect(() => comp.synth()).not.toThrow();
  expect(comp.getType()).toBe('lambda-api');
});

test('LambdaApiComponent handles observability configuration', () => {
  const context = createTestContext();
  context.observability = {
    collectorEndpoint: 'https://collector.example.com',
    adotLayerArn: 'arn:aws:lambda:us-east-1:123456789012:layer:adot-layer:1',
    enableTracing: true,
    enableMetrics: true,
    enableLogs: true
  };

  const spec = createTestSpec();
  const comp = new LambdaApiComponent(new Stack(), 'TestLambda', context, spec);

  // Test that component can be synthesized with observability config
  expect(() => comp.synth()).not.toThrow();
  expect(comp.getType()).toBe('lambda-api');
});

test('LambdaApiComponent handles observability with region-specific ARN', () => {
  const context = createTestContext();
  context.observability = {
    collectorEndpoint: 'https://collector.example.com',
    adotLayerArnMap: {
      'us-east-1': 'arn:aws:lambda:us-east-1:123456789012:layer:adot-layer:1',
      'us-west-2': 'arn:aws:lambda:us-west-2:123456789012:layer:adot-layer:1'
    },
    enableTracing: true
  };

  const spec = createTestSpec();
  const comp = new LambdaApiComponent(new Stack(), 'TestLambda', context, spec);

  // Test that component can be synthesized with region-specific observability
  expect(() => comp.synth()).not.toThrow();
  expect(comp.getType()).toBe('lambda-api');
});

test('LambdaApiComponent handles disabled observability', () => {
  const context = createTestContext();
  context.observability = {
    collectorEndpoint: 'https://collector.example.com',
    adotLayerArn: 'arn:aws:lambda:us-east-1:123456789012:layer:adot-layer:1',
    enableTracing: false,
    enableMetrics: false,
    enableLogs: false
  };

  const spec = createTestSpec();
  const comp = new LambdaApiComponent(new Stack(), 'TestLambda', context, spec);

  // Test that component can be synthesized with disabled observability
  expect(() => comp.synth()).not.toThrow();
  expect(comp.getType()).toBe('lambda-api');
});

// Validation tests
test('LambdaApiComponentCreator validates handler format', () => {
  const creator = new LambdaApiComponentCreator();
  const context = createTestContext();

  // Test invalid handler format
  const invalidSpec = createTestSpec({ handler: 'invalid-handler' });
  const result = creator.validateSpec(invalidSpec, context);

  expect(result.valid).toBe(false);
  expect(result.errors).toContain('Handler must be in format "filename.functionName" (e.g., "index.handler", "src/api.lambda_handler")');
});

test('LambdaApiComponentCreator validates memory bounds', () => {
  const creator = new LambdaApiComponentCreator();
  const context = createTestContext();

  // Test memory too small
  const smallMemorySpec = createTestSpec({ memorySize: 64 });
  const smallResult = creator.validateSpec(smallMemorySpec, context);
  expect(smallResult.valid).toBe(false);
  expect(smallResult.errors).toContain('Memory size must be at least 128 MB');

  // Test memory too large
  const largeMemorySpec = createTestSpec({ memorySize: 11264 });
  const largeResult = creator.validateSpec(largeMemorySpec, context);
  expect(largeResult.valid).toBe(false);
  expect(largeResult.errors).toContain('Memory size cannot exceed 10240 MB (10 GB)');

  // Test memory not multiple of 64
  const invalidMemorySpec = createTestSpec({ memorySize: 150 });
  const invalidResult = creator.validateSpec(invalidMemorySpec, context);
  expect(invalidResult.valid).toBe(false);
  expect(invalidResult.errors).toContain('Memory size must be a multiple of 64 MB');
});

test('LambdaApiComponentCreator validates timeout bounds', () => {
  const creator = new LambdaApiComponentCreator();
  const context = createTestContext();

  // Test timeout too small
  const smallTimeoutSpec = createTestSpec({ timeout: 0 });
  const smallResult = creator.validateSpec(smallTimeoutSpec, context);
  expect(smallResult.valid).toBe(false);
  expect(smallResult.errors).toContain('Timeout must be at least 1 second');

  // Test timeout too large
  const largeTimeoutSpec = createTestSpec({ timeout: 901 });
  const largeResult = creator.validateSpec(largeTimeoutSpec, context);
  expect(largeResult.valid).toBe(false);
  expect(largeResult.errors).toContain('Timeout cannot exceed 900 seconds (15 minutes)');
});

test('LambdaApiComponentCreator validates production requirements', () => {
  const creator = new LambdaApiComponentCreator();
  const context = createTestContext();
  context.environment = 'prod';

  // Test production with insufficient memory
  const prodSpec = createTestSpec({ memorySize: 256 });
  const result = creator.validateSpec(prodSpec, context);

  expect(result.valid).toBe(false);
  expect(result.errors).toContain('Production environments require at least 512 MB memory');
});

test('LambdaApiComponentCreator validates FedRAMP requirements', () => {
  const creator = new LambdaApiComponentCreator();
  const context = createTestContext();
  context.complianceFramework = 'fedramp-moderate';

  // Test FedRAMP with insufficient memory
  const fedrampSpec = createTestSpec({ memorySize: 512 });
  const result = creator.validateSpec(fedrampSpec, context);

  expect(result.valid).toBe(false);
  expect(result.errors).toContain('FedRAMP compliance requires at least 768 MB memory');
});

test('LambdaApiComponentCreator validates environment variables', () => {
  const creator = new LambdaApiComponentCreator();
  const context = createTestContext();

  // Test reserved environment variable
  const reservedSpec = createTestSpec({
    environmentVariables: {
      'AWS_LAMBDA_FUNCTION_NAME': 'test'
    }
  });
  const result = creator.validateSpec(reservedSpec, context);

  expect(result.valid).toBe(false);
  expect(result.errors).toContain('Environment variable "AWS_LAMBDA_FUNCTION_NAME" is reserved by AWS Lambda');
});

// Capability dependency tests
test('LambdaApiComponentCreator returns core required capabilities', () => {
  const creator = new LambdaApiComponentCreator();
  const capabilities = creator.getRequiredCapabilities();

  expect(capabilities).toContain('iam:role:lambda-execution');
  expect(capabilities).toContain('iam:policy:lambda-basic-execution');
  expect(capabilities).toContain('iam:policy:cloudwatch-logs');
  expect(capabilities).toContain('iam:policy:xray-tracing');
  expect(capabilities).toContain('monitoring:cloudwatch-logs');
  expect(capabilities).toContain('monitoring:cloudwatch-metrics');
  expect(capabilities).toContain('monitoring:xray-tracing');
  expect(capabilities).toContain('api:apigateway-rest');
  expect(capabilities).toContain('security:compliance-tags');
});

test('LambdaApiComponentCreator returns dynamic capabilities for observability', () => {
  const creator = new LambdaApiComponentCreator();
  const context = createTestContext();
  context.observability = {
    collectorEndpoint: 'https://collector.example.com',
    adotLayerArn: 'arn:aws:lambda:us-east-1:123456789012:layer:adot-layer:1'
  };

  const spec = createTestSpec();
  const capabilities = creator.getRequiredCapabilitiesForSpec(spec, context);

  expect(capabilities).toContain('monitoring:adot-layer');
  expect(capabilities).toContain('monitoring:otel-collector');
});

test('LambdaApiComponentCreator returns dynamic capabilities for VPC', () => {
  const creator = new LambdaApiComponentCreator();
  const context = createTestContext();
  context.vpc = {} as any; // Mock VPC object

  const spec = createTestSpec();
  const capabilities = creator.getRequiredCapabilitiesForSpec(spec, context);

  expect(capabilities).toContain('network:vpc');
  expect(capabilities).toContain('network:security-group');
  expect(capabilities).toContain('network:subnet');
});

test('LambdaApiComponentCreator returns dynamic capabilities for secrets', () => {
  const creator = new LambdaApiComponentCreator();
  const context = createTestContext();

  const spec = createTestSpec({
    environmentVariables: {
      'DB_PASSWORD': 'arn:aws:secretsmanager:us-east-1:123456789012:secret:db-password'
    }
  });
  const capabilities = creator.getRequiredCapabilitiesForSpec(spec, context);

  expect(capabilities).toContain('config:secrets-manager');
  expect(capabilities).toContain('iam:policy:secrets-manager');
});

test('LambdaApiComponentCreator returns dynamic capabilities for FedRAMP', () => {
  const creator = new LambdaApiComponentCreator();
  const context = createTestContext();
  context.complianceFramework = 'fedramp-moderate';

  const spec = createTestSpec();
  const capabilities = creator.getRequiredCapabilitiesForSpec(spec, context);

  expect(capabilities).toContain('security:kms-encryption');
  expect(capabilities).toContain('iam:policy:kms');
});

test('LambdaApiComponentCreator returns dynamic capabilities for production', () => {
  const creator = new LambdaApiComponentCreator();
  const context = createTestContext();
  context.environment = 'prod';

  const spec = createTestSpec();
  const capabilities = creator.getRequiredCapabilitiesForSpec(spec, context);

  expect(capabilities).toContain('monitoring:alarms');
  expect(capabilities).toContain('monitoring:dashboards');
});

test('LambdaApiComponentCreator returns dynamic capabilities for HTTP API', () => {
  const creator = new LambdaApiComponentCreator();
  const context = createTestContext();

  const spec = createTestSpec({ apiType: 'http' });
  const capabilities = creator.getRequiredCapabilitiesForSpec(spec, context);

  expect(capabilities).toContain('api:apigateway-http');
});

test('LambdaApiComponentCreator returns dynamic capabilities for parameter store', () => {
  const creator = new LambdaApiComponentCreator();
  const context = createTestContext();

  const spec = createTestSpec({
    environmentVariables: {
      'DB_HOST': 'ssm:/myapp/database/host'
    }
  });
  const capabilities = creator.getRequiredCapabilitiesForSpec(spec, context);

  expect(capabilities).toContain('config:parameter-store');
  expect(capabilities).toContain('iam:policy:parameter-store');
});

// Construct handle tests
test('LambdaApiComponentCreator returns correct construct handles', () => {
  const creator = new LambdaApiComponentCreator();
  const handles = creator.getConstructHandles();

  expect(handles).toContain('lambdaFunction');
  expect(handles).toContain('api');
  expect(handles).toContain('logGroup');
  expect(handles).toHaveLength(3);
});

test('LambdaApiComponent registers constructs with correct handles', () => {
  const context = createTestContext();
  const spec = createTestSpec();
  const comp = new LambdaApiComponent(new Stack(), 'TestLambda', context, spec);

  // Synthesize the component to register constructs
  comp.synth();

  // Verify constructs are registered with expected handles
  expect(comp.constructs.has('lambdaFunction')).toBe(true);
  expect(comp.constructs.has('api')).toBe(true);
  expect(comp.constructs.has('logGroup')).toBe(true);

  // Verify construct types
  expect(comp.constructs.get('lambdaFunction')).toBeDefined();
  expect(comp.constructs.get('api')).toBeDefined();
  expect(comp.constructs.get('logGroup')).toBeDefined();
});

test('LambdaApiComponent provides correct capabilities', () => {
  const context = createTestContext();
  const spec = createTestSpec();
  const comp = new LambdaApiComponent(new Stack(), 'TestLambda', context, spec);

  // Synthesize the component to register capabilities
  comp.synth();

  // Verify capabilities are registered
  expect(comp.capabilities['lambda:function']).toBeDefined();
  expect(comp.capabilities['api:rest']).toBeDefined();

  // Verify capability structure
  const lambdaCapability = comp.capabilities['lambda:function'];
  expect(lambdaCapability.functionArn).toBeDefined();
  expect(lambdaCapability.functionName).toBeDefined();
  expect(lambdaCapability.roleArn).toBeDefined();

  const apiCapability = comp.capabilities['api:rest'];
  expect(apiCapability.url).toBeDefined();
  expect(apiCapability.apiId).toBeDefined();
  expect(apiCapability.rootResourceId).toBeDefined();
});
