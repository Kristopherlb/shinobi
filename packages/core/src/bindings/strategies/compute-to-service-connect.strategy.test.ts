/**
 * ComputeToServiceConnectBinder Strategy Test Suite
 * 
 * Comprehensive tests following Platform Testing Standard v1.0
 * Tests the binding strategy for connecting compute resources to Service Connect services
 */

import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { ComputeToServiceConnectBinder } from './compute-to-service-connect.strategy';
// Mock ECS components for testing
class EcsClusterComponent {
  constructor(
    public stack: cdk.Stack,
    public id: string,
    public context: ComponentContext,
    public spec: ComponentSpec
  ) { }

  synth(): void {
    // Mock implementation
  }

  getConstruct(name: string): any {
    return {
      securityGroupId: 'sg-cluster-123',
      clusterArn: 'arn:aws:ecs:us-east-1:123456789012:cluster/test-cluster'
    };
  }

  getType(): string {
    return 'ecs-cluster';
  }

  getCapabilities(): Record<string, any> {
    return {
      'service:connect': {
        serviceName: 'test-cluster',
        dnsName: 'test-cluster.internal',
        internalEndpoint: 'test-cluster.internal:80',
        port: 80
      }
    };
  }
}

class EcsFargateServiceComponent {
  constructor(
    public stack: cdk.Stack,
    public id: string,
    public context: ComponentContext,
    public spec: ComponentSpec
  ) { }

  synth(): void {
    // Mock implementation
  }

  getConstruct(name: string): any {
    return {
      securityGroupId: 'sg-fargate-123',
      serviceArn: 'arn:aws:ecs:us-east-1:123456789012:service/test-cluster/fargate-service'
    };
  }

  getType(): string {
    return 'ecs-fargate-service';
  }

  getCapabilities(): Record<string, any> {
    return {
      'service:connect': {
        serviceName: 'fargate-service',
        dnsName: 'fargate-service.internal',
        internalEndpoint: 'fargate-service.internal:80',
        port: 80
      }
    };
  }
}

class EcsEc2ServiceComponent {
  constructor(
    public stack: cdk.Stack,
    public id: string,
    public context: ComponentContext,
    public spec: ComponentSpec
  ) { }

  synth(): void {
    // Mock implementation
  }

  getConstruct(name: string): any {
    return {
      securityGroupId: 'sg-ec2-123',
      serviceArn: 'arn:aws:ecs:us-east-1:123456789012:service/test-cluster/ec2-service'
    };
  }

  getType(): string {
    return 'ecs-ec2-service';
  }

  getCapabilities(): Record<string, any> {
    return {
      'service:connect': {
        serviceName: 'ec2-service',
        dnsName: 'ec2-service.internal',
        internalEndpoint: 'ec2-service.internal:80',
        port: 80
      }
    };
  }
}
import { ComponentContext, ComponentSpec, BindingDirective } from '@shinobi/core';
import {
  TestFixtureFactory,
  TestAssertions,
  TEST_CONTEXTS,
  TEST_SPECS
} from '../../@shinobi/components/ecs-cluster/test-fixtures';

// Mock Lambda component for testing compute-to-service binding
class MockLambdaComponent {
  public node: { id: string };
  private securityGroup?: ec2.SecurityGroup;
  private role?: iam.Role;
  private synthesized: boolean = false;

  constructor(
    private stack: cdk.Stack,
    id: string,
    private mockContext: ComponentContext,
    private mockSpec: ComponentSpec
  ) {
    this.node = { id };
  }

  public synth(): void {
    // Create mock security group for Lambda
    this.securityGroup = new ec2.SecurityGroup(this.stack, `${this.node.id}SecurityGroup`, {
      vpc: ec2.Vpc.fromLookup(this.stack, `${this.node.id}DefaultVpc`, { isDefault: true }),
      description: `Security group for ${this.node.id} Lambda function`
    });

    // Create mock IAM role
    this.role = new iam.Role(this.stack, `${this.node.id}Role`, {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      description: `Execution role for ${this.node.id} Lambda function`
    });

    this.synthesized = true;
  }

  public getConstruct(name: string): any {
    if (!this.synthesized) {
      throw new Error('Component must be synthesized before accessing constructs');
    }

    switch (name) {
      case 'securityGroup':
        return this.securityGroup;
      case 'role':
        return this.role;
      default:
        return undefined;
    }
  }

  public getType(): string {
    return 'lambda-api';
  }
}

/*
 * Test Metadata: TP-SERVICE-CONNECT-BINDER-001
 * {
 *   "id": "TP-SERVICE-CONNECT-BINDER-001",
 *   "level": "unit",
 *   "capability": "Service Connect binding strategy pattern matching and execution",
 *   "oracle": "exact",
 *   "invariants": ["Strategy key matching", "Binding directive validation", "Component type compatibility"],
 *   "fixtures": ["TestFixtureFactory", "MockLambdaComponent"],
 *   "inputs": { "shape": "BindingDirective with compute and service components", "notes": "Various compute types to Service Connect services" },
 *   "risks": [],
 *   "dependencies": ["Platform binding framework"],
 *   "evidence": ["Strategy key validation", "Binding execution results"],
 *   "complianceRefs": ["std://component-binding"],
 *   "aiGenerated": true,
 *   "humanReviewedBy": "platform-team"
 * }
 */
describe('ComputeToServiceConnectBinder__StrategyMatching__BindingExecution', () => {
  let testEnv: ReturnType<typeof TestFixtureFactory.createTestEnvironment>;
  let binder: ComputeToServiceConnectBinder;

  beforeEach(() => {
    testEnv = TestFixtureFactory.createTestEnvironment();
    binder = new ComputeToServiceConnectBinder();
  });

  afterEach(() => {
    TestFixtureFactory.cleanup();
  });

  it('StrategyKey__ServiceConnectTarget__MatchesCorrectly', async () => {
    // Test the strategy key concept through canHandle method
    expect(binder.canHandle('lambda-api', 'service:connect')).toBe(true);
    expect(binder.canHandle('ecs-fargate-service', 'service:connect')).toBe(true);
    expect(binder.canHandle('ecs-ec2-service', 'service:connect')).toBe(true);

    // Should match the *:service:connect pattern conceptually
    expect(binder.canHandle('any-type', 'service:connect')).toBe(true);
  });

  it('CanHandle__ServiceConnectCapability__ReturnsTrueForValidDirectives', async () => {
    const mockDirective: BindingDirective = {
      to: 'target-service',
      capability: 'service:connect',
      access: 'read'
    };

    // Test with different source component types
    const canHandleLambda = binder.canHandle('lambda-api', 'service:connect');
    const canHandleFargate = binder.canHandle('ecs-fargate-service', 'service:connect');
    const canHandleEc2 = binder.canHandle('ecs-ec2-service', 'service:connect');

    expect(canHandleLambda).toBe(true);
    expect(canHandleFargate).toBe(true);
    expect(canHandleEc2).toBe(true);
  });

  it('CanHandle__NonServiceConnectCapability__ReturnsFalseForInvalidDirectives', async () => {
    const invalidDirective: BindingDirective = {
      to: 'target-database',
      capability: 'database:connection',
      access: 'readwrite'
    };

    const canHandle = binder.canHandle('lambda-api', 'database:connection');
    expect(canHandle).toBe(false);
  });
});

/*
 * Test Metadata: TP-SERVICE-CONNECT-BINDER-002
 * {
 *   "id": "TP-SERVICE-CONNECT-BINDER-002",
 *   "level": "integration",
 *   "capability": "End-to-end binding between compute and Service Connect services",
 *   "oracle": "contract",
 *   "invariants": ["Security group rule creation", "Environment variable injection", "IAM permission grants"],
 *   "fixtures": ["TestFixtureFactory", "MockLambdaComponent", "ECS Service components"],
 *   "inputs": { "shape": "Full component binding with resource creation", "notes": "Lambda to Fargate/EC2 service binding" },
 *   "risks": ["CDK resource creation timing"],
 *   "dependencies": ["ECS Service components", "aws-cdk-lib/assertions"],
 *   "evidence": ["CloudFormation template validation", "Security group ingress rules", "Environment variables"],
 *   "complianceRefs": ["std://security-group-rules", "std://service-discovery"],
 *   "aiGenerated": true,
 *   "humanReviewedBy": "platform-team"
 * }
 */
describe('ComputeToServiceConnectBinder__EndToEndBinding__SecurityAndDiscovery', () => {
  let testEnv: ReturnType<typeof TestFixtureFactory.createTestEnvironment>;
  let mockVpc: ec2.IVpc;
  let binder: ComputeToServiceConnectBinder;
  let clusterComponent: EcsClusterComponent;

  beforeEach(() => {
    testEnv = TestFixtureFactory.createTestEnvironment();
    mockVpc = TestFixtureFactory.createMockVpc(testEnv.stack);
    binder = new ComputeToServiceConnectBinder();

    // Create cluster for services
    clusterComponent = new EcsClusterComponent(
      testEnv.stack,
      'TestCluster',
      testEnv.contexts.commercial,
      testEnv.specs.minimalCluster
    );
    clusterComponent.synth();
  });

  afterEach(() => {
    TestFixtureFactory.cleanup();
  });

  it('Bind__LambdaToFargateService__CreatesSecurityGroupRules', async () => {
    // Create Fargate service component
    const fargateService = new EcsFargateServiceComponent(
      testEnv.stack,
      'TestFargateService',
      testEnv.contexts.commercial,
      testEnv.specs.fargateService
    );
    fargateService.synth();

    // Create mock Lambda component
    const lambdaComponent = new MockLambdaComponent(
      testEnv.stack,
      'TestLambda',
      testEnv.contexts.commercial,
      {
        name: 'test-lambda',
        type: 'lambda-api',
        config: {}
      }
    );
    lambdaComponent.synth();

    const directive: BindingDirective = {
      to: 'TestFargateService',
      capability: 'service:connect',
      access: 'read',
      env: {
        SERVICE_ENDPOINT: 'internalEndpoint'
      }
    };

    // Execute binding
    const bindingContext = {
      source: lambdaComponent as any,
      target: fargateService,
      directive,
      environment: 'test',
      complianceFramework: 'commercial'
    };
    const result = binder.bind(bindingContext);

    // Validate binding result structure
    expect(result).toHaveProperty('environmentVariables');
    expect(result).toHaveProperty('iamPolicies');
    expect(result).toHaveProperty('networkConfiguration');
    expect(result).toHaveProperty('metadata');

    // Validate environment variables
    expect(result.environmentVariables).toHaveProperty('SERVICE_ENDPOINT');
    expect(result.environmentVariables.SERVICE_ENDPOINT).toMatch(/fargate-service\.internal:\d+/);

    // Validate network configuration
    expect(result.networkConfiguration).toHaveProperty('securityGroups');
    expect(Array.isArray(result.networkConfiguration.securityGroups)).toBe(true);

    // Validate metadata
    expect(result.metadata).toHaveProperty('targetServiceName');
    expect(result.metadata).toHaveProperty('securityRulesCreated');
    expect(result.metadata.targetServiceName).toBe('fargate-service');
  });

  it('Bind__LambdaToEc2Service__CreatesSecurityGroupRules', async () => {
    // Create EC2 service component
    const ec2Service = new EcsEc2ServiceComponent(
      testEnv.stack,
      'TestEc2Service',
      testEnv.contexts.commercial,
      testEnv.specs.ec2Service
    );
    ec2Service.synth();

    // Create mock Lambda component
    const lambdaComponent = new MockLambdaComponent(
      testEnv.stack,
      'TestLambda',
      testEnv.contexts.commercial,
      {
        name: 'test-lambda',
        type: 'lambda-api',
        config: {}
      }
    );
    lambdaComponent.synth();

    const directive: BindingDirective = {
      to: 'TestEc2Service',
      capability: 'service:connect',
      access: 'write',
      env: {
        EC2_SERVICE_URL: 'internalEndpoint',
        EC2_SERVICE_PORT: 'port'
      }
    };

    // Execute binding
    const bindingContext = {
      source: lambdaComponent as any,
      target: ec2Service,
      directive,
      environment: 'test',
      complianceFramework: 'commercial'
    };
    const result = binder.bind(bindingContext);

    // Validate binding result
    expect(result.environmentVariables).toHaveProperty('EC2_SERVICE_URL');
    expect(result.environmentVariables).toHaveProperty('EC2_SERVICE_PORT');
    expect(result.environmentVariables.EC2_SERVICE_URL).toBe('ec2-service.internal:80');
    expect(result.environmentVariables.EC2_SERVICE_PORT).toBe('80');

    // Validate metadata for EC2 service
    expect(result.metadata.targetServiceName).toBe('ec2-service');
    expect(result.metadata).toHaveProperty('targetDnsName');
    expect(result.metadata.targetDnsName).toBe('ec2-service.internal');
  });

  it('Bind__ServiceToServiceBinding__CreatesCorrectRules', async () => {
    // Create two services for service-to-service communication
    const producerService = new EcsFargateServiceComponent(
      testEnv.stack,
      'ProducerService',
      testEnv.contexts.commercial,
      {
        name: 'producer-service',
        type: 'ecs-fargate-service',
        config: {
          cluster: 'test-cluster',
          image: 'nginx:latest',
          port: 8080,
          serviceConnect: { portMappingName: 'api' }
        }
      }
    );
    producerService.synth();

    const consumerService = new EcsFargateServiceComponent(
      testEnv.stack,
      'ConsumerService',
      testEnv.contexts.commercial,
      {
        name: 'consumer-service',
        type: 'ecs-fargate-service',
        config: {
          cluster: 'test-cluster',
          image: 'httpd:latest',
          port: 80,
          serviceConnect: { portMappingName: 'web' }
        }
      }
    );
    consumerService.synth();

    const directive: BindingDirective = {
      to: 'ProducerService',
      capability: 'service:connect',
      access: 'read',
      env: {
        PRODUCER_ENDPOINT: 'internalEndpoint'
      }
    };

    // Execute service-to-service binding
    const bindingContext = {
      source: consumerService,
      target: producerService,
      directive,
      environment: 'test',
      complianceFramework: 'commercial'
    };
    const result = binder.bind(bindingContext);

    expect(result.environmentVariables.PRODUCER_ENDPOINT).toBe('producer-service.internal:8080');
    expect(result.metadata.targetServiceName).toBe('producer-service');
    expect(result.metadata.targetPort).toBe(8080);
  });
});

/*
 * Test Metadata: TP-SERVICE-CONNECT-BINDER-003
 * {
 *   "id": "TP-SERVICE-CONNECT-BINDER-003",
 *   "level": "unit",
 *   "capability": "Environment variable mapping and service discovery configuration",
 *   "oracle": "exact",
 *   "invariants": ["Correct variable mapping", "Service discovery URL format", "Port number accuracy"],
 *   "fixtures": ["TestFixtureFactory", "ServiceConnect capabilities"],
 *   "inputs": { "shape": "BindingDirective with env mapping configurations", "notes": "Various environment variable mapping patterns" },
 *   "risks": [],
 *   "dependencies": [],
 *   "evidence": ["Environment variable values", "Service discovery URLs"],
 *   "complianceRefs": ["std://service-discovery", "std://environment-variables"],
 *   "aiGenerated": true,
 *   "humanReviewedBy": "platform-team"
 * }
 */
describe('ComputeToServiceConnectBinder__EnvironmentVariables__ServiceDiscovery', () => {
  let testEnv: ReturnType<typeof TestFixtureFactory.createTestEnvironment>;
  let binder: ComputeToServiceConnectBinder;

  beforeEach(() => {
    testEnv = TestFixtureFactory.createTestEnvironment();
    binder = new ComputeToServiceConnectBinder();
  });

  afterEach(() => {
    TestFixtureFactory.cleanup();
  });

  it('EnvironmentVariables__StandardMappings__GeneratesCorrectValues', async () => {
    const serviceConnectCapability = {
      serviceName: 'payment-service',
      dnsName: 'payment-service.production',
      internalEndpoint: 'payment-service.production:3000',
      port: 3000
    };

    const directive: BindingDirective = {
      to: 'payment-service',
      capability: 'service:connect',
      access: 'read',
      env: {
        PAYMENT_SERVICE_URL: 'internalEndpoint',
        PAYMENT_SERVICE_HOST: 'dnsName',
        PAYMENT_SERVICE_PORT: 'port',
        PAYMENT_SERVICE_NAME: 'serviceName'
      }
    };

    const result = (binder as any).buildServiceDiscoveryEnvironmentVariables(
      serviceConnectCapability,
      directive,
      'consumer-service'
    );

    expect(result).toEqual({
      PAYMENT_SERVICE_URL: 'payment-service.production:3000',
      PAYMENT_SERVICE_HOST: 'payment-service.production',
      PAYMENT_SERVICE_PORT: '3000',
      PAYMENT_SERVICE_NAME: 'payment-service'
    });
  });

  it('EnvironmentVariables__CustomMappings__HandlesArbitraryNames', async () => {
    const serviceConnectCapability = {
      serviceName: 'auth-service',
      dnsName: 'auth-service.internal',
      internalEndpoint: 'auth-service.internal:8080',
      port: 8080
    };

    const directive: BindingDirective = {
      to: 'auth-service',
      capability: 'service:connect',
      access: 'read',
      env: {
        AUTH_ENDPOINT: 'internalEndpoint',
        CUSTOM_VARIABLE_NAME: 'dnsName'
      }
    };

    const result = (binder as any).buildServiceDiscoveryEnvironmentVariables(
      serviceConnectCapability,
      directive,
      'client-service'
    );

    expect(result).toEqual({
      AUTH_ENDPOINT: 'auth-service.internal:8080',
      CUSTOM_VARIABLE_NAME: 'auth-service.internal'
    });
  });

  it('EnvironmentVariables__EmptyEnvMapping__ReturnsEmptyObject', async () => {
    const serviceConnectCapability = {
      serviceName: 'test-service',
      dnsName: 'test-service.internal',
      internalEndpoint: 'test-service.internal:80',
      port: 80
    };

    const directive: BindingDirective = {
      to: 'test-service',
      capability: 'service:connect',
      access: 'read'
      // No env mapping provided
    };

    const result = (binder as any).buildServiceDiscoveryEnvironmentVariables(
      serviceConnectCapability,
      directive,
      'client-service'
    );

    expect(result).toEqual({});
  });

  it('EnvironmentVariables__InvalidCapabilityField__ThrowsError', async () => {
    const serviceConnectCapability = {
      serviceName: 'test-service',
      dnsName: 'test-service.internal',
      internalEndpoint: 'test-service.internal:80',
      port: 80
    };

    const directive: BindingDirective = {
      to: 'test-service',
      capability: 'service:connect',
      access: 'read',
      env: {
        INVALID_FIELD: 'nonExistentField' // Invalid field reference
      }
    };

    expect(() => {
      (binder as any).buildServiceDiscoveryEnvironmentVariables(
        serviceConnectCapability,
        directive,
        'client-service'
      );
    }).toThrow('Invalid Service Connect capability field: nonExistentField');
  });
});

/*
 * Test Metadata: TP-SERVICE-CONNECT-BINDER-004
 * {
 *   "id": "TP-SERVICE-CONNECT-BINDER-004",
 *   "level": "unit",
 *   "capability": "Error handling and validation for invalid binding scenarios",
 *   "oracle": "exact",
 *   "invariants": ["Proper error types", "Actionable error messages", "Component validation"],
 *   "fixtures": ["TestFixtureFactory", "Invalid component mocks"],
 *   "inputs": { "shape": "Invalid binding configurations and missing capabilities", "notes": "Edge cases and error conditions" },
 *   "risks": [],
 *   "dependencies": [],
 *   "evidence": ["Exception types and messages", "Validation timing"],
 *   "complianceRefs": ["std://error-handling"],
 *   "aiGenerated": true,
 *   "humanReviewedBy": "platform-team"
 * }
 */
describe('ComputeToServiceConnectBinder__ErrorHandling__ValidationFailures', () => {
  let testEnv: ReturnType<typeof TestFixtureFactory.createTestEnvironment>;
  let binder: ComputeToServiceConnectBinder;

  beforeEach(() => {
    testEnv = TestFixtureFactory.createTestEnvironment();
    binder = new ComputeToServiceConnectBinder();
  });

  afterEach(() => {
    TestFixtureFactory.cleanup();
  });

  it('Bind__MissingServiceConnectCapability__ThrowsActionableError', async () => {
    // Create mock components without Service Connect capability
    const mockSource = {
      node: { id: 'source-component' },
      getConstruct: jest.fn().mockReturnValue({
        securityGroupId: 'sg-source123'
      }),
      getType: () => 'lambda-api'
    };

    const mockTarget = {
      node: { id: 'target-component' },
      getCapabilities: jest.fn().mockReturnValue({}), // No service:connect capability
      getConstruct: jest.fn().mockReturnValue({
        securityGroupId: 'sg-target123'
      }),
      getType: () => 'ecs-fargate-service'
    };

    const directive: BindingDirective = {
      to: 'target-component',
      capability: 'service:connect',
      access: 'read'
    };

    expect(() => {
      const bindingContext = {
        source: mockSource as any,
        target: mockTarget as any,
        directive,
        environment: 'test',
        complianceFramework: 'commercial'
      };
      binder.bind(bindingContext);
    }).toThrow('Target component target-component does not provide service:connect capability');
  });

  it('Bind__MissingSecurityGroup__ThrowsActionableError', async () => {
    const mockSource = {
      node: { id: 'source-component' },
      getConstruct: jest.fn().mockReturnValue(undefined), // No security group
      getType: () => 'lambda-api'
    };

    const mockTarget = {
      node: { id: 'target-component' },
      getCapabilities: jest.fn().mockReturnValue({
        'service:connect': {
          serviceName: 'test-service',
          dnsName: 'test-service.internal',
          internalEndpoint: 'test-service.internal:80',
          port: 80
        }
      }),
      getConstruct: jest.fn().mockReturnValue({
        securityGroupId: 'sg-target123'
      }),
      getType: () => 'ecs-fargate-service'
    };

    const directive: BindingDirective = {
      to: 'target-component',
      capability: 'service:connect',
      access: 'read'
    };

    expect(() => {
      const bindingContext = {
        source: mockSource as any,
        target: mockTarget as any,
        directive,
        environment: 'test',
        complianceFramework: 'commercial'
      };
      binder.bind(bindingContext);
    }).toThrow(/source component.*does not have a security group construct/);
  });

  it('Bind__ComponentTypeMismatch__HandlesGracefully', async () => {
    // Test that the binder handles unknown component types gracefully
    const mockSource = {
      node: { id: 'unknown-component' },
      getConstruct: jest.fn().mockReturnValue({
        securityGroupId: 'sg-source123'
      }),
      getType: () => 'unknown-component-type'
    };

    const mockTarget = {
      node: { id: 'target-service' },
      getCapabilities: jest.fn().mockReturnValue({
        'service:connect': {
          serviceName: 'test-service',
          dnsName: 'test-service.internal',
          internalEndpoint: 'test-service.internal:80',
          port: 80
        }
      }),
      getConstruct: jest.fn().mockReturnValue({
        securityGroupId: 'sg-target123'
      }),
      getType: () => 'ecs-fargate-service'
    };

    const directive: BindingDirective = {
      to: 'target-service',
      capability: 'service:connect',
      access: 'read'
    };

    // Should not throw - the binder should handle unknown source types
    expect(() => {
      const bindingContext = {
        source: mockSource as any,
        target: mockTarget as any,
        directive,
        environment: 'test',
        complianceFramework: 'commercial'
      };
      const result = binder.bind(bindingContext);
      expect(result).toHaveProperty('environmentVariables');
      expect(result).toHaveProperty('metadata');
    }).not.toThrow();
  });

  it('Bind__NetworkingFailure__ThrowsDetailedError', async () => {
    const mockSource = {
      node: { id: 'source-component' },
      getConstruct: jest.fn().mockImplementation((name) => {
        if (name === 'securityGroup') {
          // Mock security group that throws on connections.allowFrom
          return {
            securityGroupId: 'sg-source123',
            connections: {
              allowFrom: jest.fn().mockImplementation(() => {
                throw new Error('VPC connection failed');
              })
            }
          };
        }
        return undefined;
      }),
      getType: () => 'lambda-api'
    };

    const mockTarget = {
      node: { id: 'target-service' },
      getCapabilities: jest.fn().mockReturnValue({
        'service:connect': {
          serviceName: 'test-service',
          dnsName: 'test-service.internal',
          internalEndpoint: 'test-service.internal:80',
          port: 80
        }
      }),
      getConstruct: jest.fn().mockReturnValue({
        securityGroupId: 'sg-target123',
        connections: {
          allowFrom: jest.fn()
        }
      }),
      getType: () => 'ecs-fargate-service'
    };

    const directive: BindingDirective = {
      to: 'target-service',
      capability: 'service:connect',
      access: 'read'
    };

    expect(() => {
      const bindingContext = {
        source: mockSource as any,
        target: mockTarget as any,
        directive,
        environment: 'test',
        complianceFramework: 'commercial'
      };
      binder.bind(bindingContext);
    }).toThrow(/Failed to bind source-component to Service Connect service target-service/);
  });
});
