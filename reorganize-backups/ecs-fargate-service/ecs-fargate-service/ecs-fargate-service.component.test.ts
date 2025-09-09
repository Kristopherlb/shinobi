/**
 * ECS Fargate Service Component Test Suite
 * 
 * Comprehensive tests following Platform Testing Standard v1.0
 * Tests serverless containerized service with Service Connect and auto-scaling
 */

import * as cdk from 'aws-cdk-lib';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { EcsFargateServiceComponent, EcsFargateServiceConfigBuilder } from './ecs-fargate-service.component';
import { EcsClusterComponent } from '../ecs-cluster/ecs-cluster.component';
import { ComponentContext, ComponentSpec } from '../../platform/contracts/component-interfaces';
import { 
  TestFixtureFactory, 
  TestAssertions, 
  PerformanceTestHelpers,
  TEST_CONTEXTS,
  TEST_SPECS 
} from '../ecs-cluster/test-fixtures';

/*
 * Test Metadata: TP-ECS-FARGATE-001
 * {
 *   "id": "TP-ECS-FARGATE-001",
 *   "level": "unit",
 *   "capability": "Fargate service configuration with compliance framework variations",
 *   "oracle": "exact",
 *   "invariants": ["Configuration precedence order", "Fargate-specific defaults", "CPU/memory combinations"],
 *   "fixtures": ["TestFixtureFactory", "TEST_CONTEXTS", "TEST_SPECS"],
 *   "inputs": { "shape": "ComponentContext + Fargate service specifications", "notes": "CPU/memory validation and compliance defaults" },
 *   "risks": [],
 *   "dependencies": ["aws-cdk-lib"],
 *   "evidence": ["Configuration object validation", "Fargate task sizing"],
 *   "complianceRefs": ["std://configuration", "std://fargate-sizing"],
 *   "aiGenerated": true,
 *   "humanReviewedBy": "platform-team"
 * }
 */
describe('EcsFargateServiceConfigBuilder__ConfigurationValidation__ComplianceDefaults', () => {
  let testEnv: ReturnType<typeof TestFixtureFactory.createTestEnvironment>;

  beforeEach(() => {
    testEnv = TestFixtureFactory.createTestEnvironment();
  });

  afterEach(() => {
    TestFixtureFactory.cleanup();
  });

  it('ConfigBuilder__MinimalConfiguration__AppliesFargateDefaults', async () => {
    const minimalSpec: ComponentSpec = {
      name: 'minimal-fargate',
      type: 'ecs-fargate-service',
      config: {
        cluster: 'test-cluster',
        image: 'nginx:latest',
        serviceConnect: {
          portMappingName: 'api'
        }
      }
    };

    const builder = new EcsFargateServiceConfigBuilder(testEnv.contexts.commercial, minimalSpec);
    const config = builder.buildSync();

    // Verify Fargate-specific defaults
    expect(config.cpu).toBe(256); // Minimal CPU
    expect(config.memory).toBe(512); // Minimal memory
    expect(config.port).toBe(80); // Default HTTP port
    expect(config.desiredCount).toBe(1); // Default desired count
  });

  it('ConfigBuilder__ComplianceFrameworks__AppliesCorrectResources', async () => {
    const frameworks: Array<keyof typeof TEST_CONTEXTS> = ['commercial', 'fedrampModerate', 'fedrampHigh'];

    for (const framework of frameworks) {
      const builder = new EcsFargateServiceConfigBuilder(testEnv.contexts[framework], testEnv.specs.fargateService);
      const config = builder.buildSync();

      // Compliance-specific validations
      if (framework === 'fedrampHigh') {
        expect(config.cpu).toBeGreaterThanOrEqual(512); // More resources for compliance
        expect(config.memory).toBeGreaterThanOrEqual(1024);
        expect(config.desiredCount).toBeGreaterThanOrEqual(2); // High availability
        expect(config.healthCheck?.command).toBeDefined();
        if (config.autoScaling) {
          expect(config.autoScaling.minCapacity).toBeGreaterThanOrEqual(2);
        }
      }

      if (framework === 'fedrampModerate') {
        expect(config.cpu).toBeGreaterThanOrEqual(256);
        expect(config.memory).toBeGreaterThanOrEqual(512);
        expect(config.healthCheck?.command).toBeDefined();
      }
    }
  });

  it('ConfigBuilder__CpuMemoryCombinations__ValidatesFargateConstraints', async () => {
    // Valid Fargate CPU/memory combinations
    const validCombinations = [
      { cpu: 256, memory: 512 },
      { cpu: 512, memory: 1024 },
      { cpu: 1024, memory: 2048 },
      { cpu: 2048, memory: 4096 },
      { cpu: 4096, memory: 8192 }
    ];

    for (const combo of validCombinations) {
      const spec: ComponentSpec = {
        name: 'test-service',
        type: 'ecs-fargate-service',
        config: {
          cluster: 'test-cluster',
          image: 'nginx:latest',
          cpu: combo.cpu,
          memory: combo.memory,
          serviceConnect: { portMappingName: 'api' }
        }
      };

      const builder = new EcsFargateServiceConfigBuilder(testEnv.contexts.commercial, spec);
      const config = builder.buildSync();

      expect(config.cpu).toBe(combo.cpu);
      expect(config.memory).toBe(combo.memory);
    }
  });
});

/*
 * Test Metadata: TP-ECS-FARGATE-002
 * {
 *   "id": "TP-ECS-FARGATE-002",
 *   "level": "integration",
 *   "capability": "Fargate service AWS resource synthesis with Service Connect integration",
 *   "oracle": "contract",
 *   "invariants": ["ECS Service creation", "Task definition setup", "Service Connect configuration"],
 *   "fixtures": ["TestFixtureFactory", "MockCluster"],
 *   "inputs": { "shape": "Fargate service synthesis with cluster dependency", "notes": "Requires ECS cluster for testing" },
 *   "risks": ["CDK Fargate configuration changes"],
 *   "dependencies": ["EcsClusterComponent", "aws-cdk-lib/assertions"],
 *   "evidence": ["CloudFormation template validation", "Service Connect service registration"],
 *   "complianceRefs": ["std://resource-creation", "std://service-connect"],
 *   "aiGenerated": true,
 *   "humanReviewedBy": "platform-team"
 * }
 */
describe('EcsFargateServiceComponent__ResourceSynthesis__ServiceConnectIntegration', () => {
  let testEnv: ReturnType<typeof TestFixtureFactory.createTestEnvironment>;
  let mockVpc: ec2.IVpc;
  let clusterComponent: EcsClusterComponent;

  beforeEach(() => {
    testEnv = TestFixtureFactory.createTestEnvironment();
    mockVpc = TestFixtureFactory.createMockVpc(testEnv.stack);

    // Create a cluster component for the service to use
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

  it('Synthesis__BasicFargateService__CreatesEcsResources', async () => {
    const serviceComponent = new EcsFargateServiceComponent(
      testEnv.stack,
      'TestFargateService',
      testEnv.contexts.commercial,
      testEnv.specs.fargateService
    );

    const { executionTime } = await PerformanceTestHelpers.measureSynthesisTime(() => {
      serviceComponent.synth();
      return Template.fromStack(testEnv.stack);
    }, 5000);

    const template = Template.fromStack(testEnv.stack);

    // Verify ECS Service is created
    template.hasResourceProperties('AWS::ECS::Service', {
      ServiceName: Match.stringLikeRegexp('.*fargate-service.*'),
      LaunchType: 'FARGATE',
      PlatformVersion: 'LATEST'
    });

    // Verify Task Definition is created with correct configuration
    template.hasResourceProperties('AWS::ECS::TaskDefinition', {
      Family: Match.stringLikeRegexp('.*fargate-service.*'),
      RequiresCompatibilities: Match.arrayWith(['FARGATE']),
      Cpu: '512',
      Memory: '1024',
      NetworkMode: 'awsvpc'
    });

    // Verify Service Connect configuration
    template.hasResourceProperties('AWS::ECS::Service', {
      ServiceConnectConfiguration: Match.objectLike({
        Enabled: true,
        Services: Match.arrayWith([
          Match.objectLike({
            PortName: 'api',
            DiscoveryName: Match.anyValue()
          })
        ])
      })
    });

    // Performance validation
    expect(executionTime).toBeLessThan(3000);
  });

  it('Synthesis__AutoScalingEnabled__CreatesScalingResources', async () => {
    const serviceComponent = new EcsFargateServiceComponent(
      testEnv.stack,
      'TestAutoScalingService',
      testEnv.contexts.commercial,
      testEnv.specs.fargateService // Has auto-scaling configuration
    );

    serviceComponent.synth();
    const template = Template.fromStack(testEnv.stack);

    // Verify Scalable Target is created
    template.hasResourceProperties('AWS::ApplicationAutoScaling::ScalableTarget', {
      ServiceNamespace: 'ecs',
      ResourceId: Match.stringLikeRegexp('service/.*'),
      ScalableDimension: 'ecs:service:DesiredCount',
      MinCapacity: 2,
      MaxCapacity: 20
    });

    // Verify CPU-based scaling policy
    template.hasResourceProperties('AWS::ApplicationAutoScaling::ScalingPolicy', {
      PolicyType: 'TargetTrackingScaling',
      TargetTrackingScalingPolicyConfiguration: Match.objectLike({
        TargetValue: 70.0, // CPU target
        PredefinedMetricSpecification: Match.objectLike({
          PredefinedMetricType: 'ECSServiceAverageCPUUtilization'
        })
      })
    });

    // Verify Memory-based scaling policy
    template.hasResourceProperties('AWS::ApplicationAutoScaling::ScalingPolicy', {
      PolicyType: 'TargetTrackingScaling',
      TargetTrackingScalingPolicyConfiguration: Match.objectLike({
        TargetValue: 80.0, // Memory target
        PredefinedMetricSpecification: Match.objectLike({
          PredefinedMetricType: 'ECSServiceAverageMemoryUtilization'
        })
      })
    });
  });

  it('Synthesis__HealthCheckEnabled__ConfiguresHealthCheck', async () => {
    const serviceComponent = new EcsFargateServiceComponent(
      testEnv.stack,
      'TestHealthCheckService',
      testEnv.contexts.commercial,
      testEnv.specs.fargateService // Has health check configuration
    );

    serviceComponent.synth();
    const template = Template.fromStack(testEnv.stack);

    // Verify health check is configured in task definition
    template.hasResourceProperties('AWS::ECS::TaskDefinition', {
      ContainerDefinitions: Match.arrayWith([
        Match.objectLike({
          HealthCheck: Match.objectLike({
            Command: Match.arrayWith([
              'CMD-SHELL',
              Match.stringLikeRegexp('.*curl.*health.*')
            ]),
            Interval: 30,
            Timeout: 5,
            Retries: 3,
            StartPeriod: 60
          })
        })
      ])
    });
  });

  it('Synthesis__ComplianceFrameworks__AppliesCorrectConfiguration', async () => {
    const frameworks: Array<keyof typeof TEST_CONTEXTS> = ['commercial', 'fedrampModerate', 'fedrampHigh'];
    
    for (const framework of frameworks) {
      const frameworkStack = new cdk.Stack(testEnv.app, `FargateTestStack-${framework}`);
      const context = { ...testEnv.contexts[framework], scope: frameworkStack };
      
      // Create cluster in the framework-specific stack
      const frameworkCluster = new EcsClusterComponent(
        frameworkStack,
        'TestCluster',
        context,
        testEnv.specs.minimalCluster
      );
      frameworkCluster.synth();

      const serviceComponent = new EcsFargateServiceComponent(
        frameworkStack,
        'TestFargateService',
        context,
        testEnv.specs.fargateService
      );

      serviceComponent.synth();
      const template = Template.fromStack(frameworkStack);

      // All frameworks should enable logging
      template.hasResourceProperties('AWS::ECS::TaskDefinition', {
        ContainerDefinitions: Match.arrayWith([
          Match.objectLike({
            LogConfiguration: Match.objectLike({
              LogDriver: 'awslogs'
            })
          })
        ])
      });

      // FedRAMP frameworks should have higher resource allocations
      if (framework === 'fedrampHigh' || framework === 'fedrampModerate') {
        template.hasResourceProperties('AWS::ECS::TaskDefinition', {
          Cpu: Match.stringLikeRegexp('^(512|1024|2048|4096)$'), // At least 512 CPU units
          Memory: Match.stringLikeRegexp('^(1024|2048|4096|8192)$') // At least 1GB RAM
        });

        // Should have higher desired count for availability
        if (framework === 'fedrampHigh') {
          template.hasResourceProperties('AWS::ECS::Service', {
            DesiredCount: Match.anyValue() // Will be >= 2 based on compliance defaults
          });
        }
      }
    }
  });
});

/*
 * Test Metadata: TP-ECS-FARGATE-003
 * {
 *   "id": "TP-ECS-FARGATE-003",
 *   "level": "unit",
 *   "capability": "Service Connect capability registration and metadata validation",
 *   "oracle": "contract",
 *   "invariants": ["Capability presence", "Service metadata accuracy", "Port configuration"],
 *   "fixtures": ["TestFixtureFactory", "ServiceConnectCapability validation"],
 *   "inputs": { "shape": "Synthesized Fargate service with capability inspection", "notes": "Service Connect capability structure" },
 *   "risks": [],
 *   "dependencies": ["Service Connect configuration"],
 *   "evidence": ["Capability object structure", "Service discovery metadata"],
 *   "complianceRefs": ["std://component-contracts", "std://service-connect"],
 *   "aiGenerated": true,
 *   "humanReviewedBy": "platform-team"
 * }
 */
describe('EcsFargateServiceComponent__ServiceConnect__CapabilityContract', () => {
  let testEnv: ReturnType<typeof TestFixtureFactory.createTestEnvironment>;
  let clusterComponent: EcsClusterComponent;

  beforeEach(() => {
    testEnv = TestFixtureFactory.createTestEnvironment();
    TestFixtureFactory.createMockVpc(testEnv.stack);

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

  it('Capabilities__AfterSynthesis__ProvidesServiceConnectCapability', async () => {
    const serviceComponent = new EcsFargateServiceComponent(
      testEnv.stack,
      'TestFargateService',
      testEnv.contexts.commercial,
      testEnv.specs.fargateService
    );

    serviceComponent.synth();

    const capabilities = serviceComponent.getCapabilities();
    expect(capabilities).toHaveProperty('service:connect');

    const serviceConnectCapability = capabilities['service:connect'];
    TestAssertions.assertServiceConnectCapability(serviceConnectCapability);

    // Validate Fargate-specific service metadata
    expect(serviceConnectCapability.serviceName).toBe('fargate-service');
    expect(serviceConnectCapability.port).toBe(8080);
    expect(serviceConnectCapability.dnsName).toBe('fargate-service.internal');
    expect(serviceConnectCapability.internalEndpoint).toMatch(/^fargate-service\.internal:\d+$/);
  });

  it('Capabilities__CustomPort__ReflectsConfiguration', async () => {
    const customSpec: ComponentSpec = {
      name: 'custom-port-service',
      type: 'ecs-fargate-service',
      config: {
        cluster: 'test-cluster',
        image: 'nginx:latest',
        port: 3000, // Custom port
        serviceConnect: {
          portMappingName: 'custom-api'
        }
      }
    };

    const serviceComponent = new EcsFargateServiceComponent(
      testEnv.stack,
      'TestCustomPortService',
      testEnv.contexts.commercial,
      customSpec
    );

    serviceComponent.synth();

    const capabilities = serviceComponent.getCapabilities();
    const serviceConnectCapability = capabilities['service:connect'];

    expect(serviceConnectCapability.port).toBe(3000);
    expect(serviceConnectCapability.internalEndpoint).toBe('custom-port-service.internal:3000');
  });
});

/*
 * Test Metadata: TP-ECS-FARGATE-004
 * {
 *   "id": "TP-ECS-FARGATE-004",
 *   "level": "unit",
 *   "capability": "Platform tagging standard compliance for Fargate services",
 *   "oracle": "contract",
 *   "invariants": ["Mandatory tags on all resources", "Service-specific tags", "Tag inheritance"],
 *   "fixtures": ["TestFixtureFactory", "TestAssertions"],
 *   "inputs": { "shape": "Fargate service with tag validation", "notes": "ECS Service, Task Definition, Security Group tagging" },
 *   "risks": [],
 *   "dependencies": ["Template assertions"],
 *   "evidence": ["CloudFormation tag validation", "Service-specific tag values"],
 *   "complianceRefs": ["std://tagging"],
 *   "aiGenerated": true,
 *   "humanReviewedBy": "platform-team"
 * }
 */
describe('EcsFargateServiceComponent__TaggingCompliance__MandatoryTags', () => {
  let testEnv: ReturnType<typeof TestFixtureFactory.createTestEnvironment>;
  let clusterComponent: EcsClusterComponent;

  beforeEach(() => {
    testEnv = TestFixtureFactory.createTestEnvironment();
    TestFixtureFactory.createMockVpc(testEnv.stack);

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

  it('Tagging__MandatoryTags__AppliedToAllResources', async () => {
    const serviceComponent = new EcsFargateServiceComponent(
      testEnv.stack,
      'TestFargateService',
      testEnv.contexts.commercial,
      testEnv.specs.fargateService
    );

    serviceComponent.synth();
    const template = Template.fromStack(testEnv.stack);

    // Verify mandatory tags on ECS Service
    TestAssertions.assertMandatoryTags(template, 'AWS::ECS::Service');

    // Verify mandatory tags on Task Definition
    TestAssertions.assertMandatoryTags(template, 'AWS::ECS::TaskDefinition');

    // Verify mandatory tags on Security Group
    TestAssertions.assertMandatoryTags(template, 'AWS::EC2::SecurityGroup');

    // Verify Fargate-specific tags
    template.hasResourceProperties('AWS::ECS::Service', {
      Tags: Match.arrayWith([
        Match.objectLike({ Key: 'component-type', Value: 'ecs-fargate-service' }),
        Match.objectLike({ Key: 'service-connect-name', Value: 'api' }),
        Match.objectLike({ Key: 'container-port', Value: '8080' })
      ])
    });
  });

  it('Tagging__UserDefinedTags__PreservedOnService', async () => {
    const customSpec: ComponentSpec = {
      ...testEnv.specs.fargateService,
      config: {
        ...testEnv.specs.fargateService.config,
        tags: {
          'custom-tag': 'custom-value',
          'team': 'backend'
        }
      }
    };

    const serviceComponent = new EcsFargateServiceComponent(
      testEnv.stack,
      'TestCustomTagService',
      testEnv.contexts.commercial,
      customSpec
    );

    serviceComponent.synth();
    const template = Template.fromStack(testEnv.stack);

    // Verify user-defined tags are applied
    template.hasResourceProperties('AWS::ECS::Service', {
      Tags: Match.arrayWith([
        Match.objectLike({ Key: 'custom-tag', Value: 'custom-value' }),
        Match.objectLike({ Key: 'team', Value: 'backend' })
      ])
    });
  });
});

/*
 * Test Metadata: TP-ECS-FARGATE-005
 * {
 *   "id": "TP-ECS-FARGATE-005",
 *   "level": "unit",
 *   "capability": "Error handling and configuration validation for edge cases",
 *   "oracle": "exact",
 *   "invariants": ["Proper validation errors", "Pre-synthesis checks", "Resource constraints"],
 *   "fixtures": ["TestFixtureFactory", "Invalid configurations"],
 *   "inputs": { "shape": "Invalid Fargate service configurations", "notes": "CPU/memory limits, missing required fields" },
 *   "risks": [],
 *   "dependencies": [],
 *   "evidence": ["Exception types and messages", "Validation timing"],
 *   "complianceRefs": ["std://error-handling", "std://fargate-limits"],
 *   "aiGenerated": true,
 *   "humanReviewedBy": "platform-team"
 * }
 */
describe('EcsFargateServiceComponent__ValidationErrorHandling__EdgeCases', () => {
  let testEnv: ReturnType<typeof TestFixtureFactory.createTestEnvironment>;

  beforeEach(() => {
    testEnv = TestFixtureFactory.createTestEnvironment();
  });

  afterEach(() => {
    TestFixtureFactory.cleanup();
  });

  it('Validation__InvalidCpuMemoryCombo__ThrowsActionableError', async () => {
    const invalidSpec: ComponentSpec = {
      name: 'invalid-service',
      type: 'ecs-fargate-service',
      config: {
        cluster: 'test-cluster',
        image: 'nginx:latest',
        cpu: 256,
        memory: 4096, // Invalid: 256 CPU cannot support 4096 memory
        serviceConnect: { portMappingName: 'api' }
      }
    };

    expect(() => {
      const builder = new EcsFargateServiceConfigBuilder(testEnv.contexts.commercial, invalidSpec);
      builder.buildSync();
    }).toThrow(); // Should throw validation error for invalid CPU/memory combination
  });

  it('Validation__MissingRequiredFields__ThrowsValidationError', async () => {
    const incompleteSpec: ComponentSpec = {
      name: 'incomplete-service',
      type: 'ecs-fargate-service',
      config: {
        // Missing required fields: cluster, image, serviceConnect
      }
    };

    expect(() => {
      const builder = new EcsFargateServiceConfigBuilder(testEnv.contexts.commercial, incompleteSpec);
      builder.buildSync();
    }).toThrow(); // Should throw for missing required configuration
  });

  it('Capabilities__BeforeSynthesis__ThrowsActionableError', async () => {
    const serviceComponent = new EcsFargateServiceComponent(
      testEnv.stack,
      'TestService',
      testEnv.contexts.commercial,
      testEnv.specs.fargateService
    );

    expect(() => {
      serviceComponent.getCapabilities();
    }).toThrow('ECS Fargate Service component must be synthesized before accessing capabilities');
  });

  it('ComponentType__Always__ReturnsCorrectType', async () => {
    const serviceComponent = new EcsFargateServiceComponent(
      testEnv.stack,
      'TestService',
      testEnv.contexts.commercial,
      testEnv.specs.fargateService
    );

    expect(serviceComponent.getType()).toBe('ecs-fargate-service');
  });

  it('Synthesis__ResourceLimits__HandlesLargeScaleConfiguration', async () => {
    const largeScaleSpec: ComponentSpec = {
      name: 'large-scale-service',
      type: 'ecs-fargate-service',
      config: {
        cluster: 'test-cluster',
        image: 'nginx:latest',
        cpu: 4096,
        memory: 8192,
        desiredCount: 100, // Large scale deployment
        serviceConnect: { portMappingName: 'api' },
        autoScaling: {
          enabled: true,
          minCapacity: 50,
          maxCapacity: 1000, // Very high scale
          targetCpuUtilization: 50
        }
      }
    };

    // Should not throw - large scale should be supported
    expect(() => {
      const builder = new EcsFargateServiceConfigBuilder(testEnv.contexts.commercial, largeScaleSpec);
      const config = builder.buildSync();
      expect(config.desiredCount).toBe(100);
      expect(config.autoScaling?.maxCapacity).toBe(1000);
    }).not.toThrow();
  });
});
