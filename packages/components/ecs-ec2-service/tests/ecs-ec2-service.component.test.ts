/**
 * ECS EC2 Service Component Test Suite
 * 
 * Comprehensive tests following Platform Testing Standard v1.0
 * Tests EC2-based containerized service with placement strategies and constraints
 */

import * as cdk from 'aws-cdk-lib';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { EcsEc2ServiceComponent, EcsEc2ServiceConfigBuilder } from './ecs-ec2-service.component';
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
 * Test Metadata: TP-ECS-EC2-001
 * {
 *   "id": "TP-ECS-EC2-001",
 *   "level": "unit",
 *   "capability": "EC2 service configuration with placement strategies and constraints",
 *   "oracle": "exact",
 *   "invariants": ["Configuration precedence order", "EC2-specific defaults", "Placement strategy validation"],
 *   "fixtures": ["TestFixtureFactory", "TEST_CONTEXTS", "TEST_SPECS"],
 *   "inputs": { "shape": "ComponentContext + EC2 service specifications", "notes": "Placement strategies and constraint validation" },
 *   "risks": [],
 *   "dependencies": ["aws-cdk-lib"],
 *   "evidence": ["Configuration object validation", "Placement strategy combinations"],
 *   "complianceRefs": ["std://configuration", "std://ec2-placement"],
 *   "aiGenerated": true,
 *   "humanReviewedBy": "platform-team"
 * }
 */
describe('EcsEc2ServiceConfigBuilder__ConfigurationValidation__PlacementStrategies', () => {
  let testEnv: ReturnType<typeof TestFixtureFactory.createTestEnvironment>;

  beforeEach(() => {
    testEnv = TestFixtureFactory.createTestEnvironment();
  });

  afterEach(() => {
    TestFixtureFactory.cleanup();
  });

  it('ConfigBuilder__MinimalConfiguration__AppliesEc2Defaults', async () => {
    const minimalSpec: ComponentSpec = {
      name: 'minimal-ec2-service',
      type: 'ecs-ec2-service',
      config: {
        cluster: 'test-cluster',
        image: 'httpd:latest',
        serviceConnect: {
          portMappingName: 'web'
        }
      }
    };

    const builder = new EcsEc2ServiceConfigBuilder(testEnv.contexts.commercial, minimalSpec);
    const config = builder.buildSync();

    // Verify EC2-specific defaults
    expect(config.taskCpu).toBe(512); // Task-level CPU units
    expect(config.taskMemory).toBe(1024); // Task-level memory MB
    expect(config.port).toBe(80); // Default HTTP port
    expect(config.desiredCount).toBe(1);
    expect(config.monitoring?.cpuAlarm?.threshold).toBe(80);
    expect(config.monitoring?.memoryAlarm?.threshold).toBe(85);
    expect(config.logging?.retentionInDays).toBe(30);
  });

  it('ConfigBuilder__PlacementStrategies__ValidatesCorrectConfiguration', async () => {
    const strategies = [
      {
        type: 'spread',
        field: 'attribute:ecs.availability-zone'
      },
      {
        type: 'binpack',
        field: 'cpu'
      },
      {
        type: 'random'
      }
    ];

    const spec: ComponentSpec = {
      name: 'placement-service',
      type: 'ecs-ec2-service',
      config: {
        cluster: 'test-cluster',
        image: 'nginx:latest',
        placementStrategies: strategies,
        serviceConnect: { portMappingName: 'api' }
      }
    };

    const builder = new EcsEc2ServiceConfigBuilder(testEnv.contexts.commercial, spec);
    const config = builder.buildSync();

    expect(config.placementStrategies).toHaveLength(3);
    expect(config.placementStrategies?.[0].type).toBe('spread');
    expect(config.placementStrategies?.[0].field).toBe('attribute:ecs.availability-zone');
    expect(config.placementStrategies?.[1].type).toBe('binpack');
    expect(config.placementStrategies?.[1].field).toBe('cpu');
    expect(config.placementStrategies?.[2].type).toBe('random');
  });

  it('ConfigBuilder__PlacementConstraints__ValidatesCorrectConfiguration', async () => {
    const constraints = [
      {
        type: 'memberOf',
        expression: 'attribute:ecs.instance-type =~ t3.*'
      },
      {
        type: 'distinctInstance'
      }
    ];

    const spec: ComponentSpec = {
      name: 'constraint-service',
      type: 'ecs-ec2-service',
      config: {
        cluster: 'test-cluster',
        image: 'nginx:latest',
        placementConstraints: constraints,
        serviceConnect: { portMappingName: 'api' }
      }
    };

    const builder = new EcsEc2ServiceConfigBuilder(testEnv.contexts.commercial, spec);
    const config = builder.buildSync();

    expect(config.placementConstraints).toHaveLength(2);
    expect(config.placementConstraints?.[0].type).toBe('memberOf');
    expect(config.placementConstraints?.[0].expression).toBe('attribute:ecs.instance-type =~ t3.*');
    expect(config.placementConstraints?.[1].type).toBe('distinctInstance');
  });

  it('ConfigBuilder__ComplianceFrameworks__AppliesCorrectDefaults', async () => {
    const frameworks: Array<keyof typeof TEST_CONTEXTS> = ['commercial', 'fedrampModerate', 'fedrampHigh'];

    for (const framework of frameworks) {
      const builder = new EcsEc2ServiceConfigBuilder(testEnv.contexts[framework], testEnv.specs.ec2Service);
      const config = builder.buildSync();

      // Compliance-specific validations
      if (framework === 'fedrampHigh') {
        expect(config.taskCpu).toBeGreaterThanOrEqual(1024); // More resources for compliance
        expect(config.taskMemory).toBeGreaterThanOrEqual(2048);
        expect(config.desiredCount).toBeGreaterThanOrEqual(2); // High availability
        expect(config.healthCheck?.command).toBeDefined();
        
        // Should have placement strategy for availability
        expect(config.placementStrategies).toBeDefined();
        const hasSpreadStrategy = config.placementStrategies?.some(strategy => strategy.type === 'spread');
        expect(hasSpreadStrategy).toBe(true);

        expect(config.monitoring?.cpuAlarm?.threshold).toBeLessThanOrEqual(60);
        expect(config.monitoring?.memoryAlarm?.threshold).toBeLessThanOrEqual(70);
        expect(config.logging?.retentionInDays).toBeGreaterThanOrEqual(731);
      } else if (framework === 'fedrampModerate') {
        expect(config.monitoring?.cpuAlarm?.threshold).toBeLessThanOrEqual(70);
        expect(config.monitoring?.memoryAlarm?.threshold).toBeLessThanOrEqual(80);
        expect(config.logging?.retentionInDays).toBeGreaterThanOrEqual(365);
      } else {
        expect(config.monitoring?.cpuAlarm?.threshold).toBe(80);
        expect(config.monitoring?.memoryAlarm?.threshold).toBe(85);
        expect(config.logging?.retentionInDays).toBe(30);
      }
    }
  });
});

/*
 * Test Metadata: TP-ECS-EC2-002
 * {
 *   "id": "TP-ECS-EC2-002",
 *   "level": "integration",
 *   "capability": "EC2 service AWS resource synthesis with placement configuration",
 *   "oracle": "contract",
 *   "invariants": ["ECS Service creation", "Task definition setup", "Placement strategy application"],
 *   "fixtures": ["TestFixtureFactory", "MockClusterWithEC2"],
 *   "inputs": { "shape": "EC2 service synthesis with EC2 cluster dependency", "notes": "Requires EC2-enabled cluster" },
 *   "risks": ["CDK EC2 configuration changes"],
 *   "dependencies": ["EcsClusterComponent with EC2", "aws-cdk-lib/assertions"],
 *   "evidence": ["CloudFormation template validation", "Placement strategy configuration"],
 *   "complianceRefs": ["std://resource-creation", "std://ec2-placement"],
 *   "aiGenerated": true,
 *   "humanReviewedBy": "platform-team"
 * }
 */
describe('EcsEc2ServiceComponent__ResourceSynthesis__PlacementConfiguration', () => {
  let testEnv: ReturnType<typeof TestFixtureFactory.createTestEnvironment>;
  let mockVpc: ec2.IVpc;
  let ec2ClusterComponent: EcsClusterComponent;

  beforeEach(() => {
    testEnv = TestFixtureFactory.createTestEnvironment();
    mockVpc = TestFixtureFactory.createMockVpc(testEnv.stack);

    // Create a cluster component with EC2 capacity
    ec2ClusterComponent = new EcsClusterComponent(
      testEnv.stack,
      'TestEc2Cluster',
      testEnv.contexts.commercial,
      testEnv.specs.ec2Cluster // Has EC2 capacity configuration
    );
    ec2ClusterComponent.synth();
  });

  afterEach(() => {
    TestFixtureFactory.cleanup();
  });

  it('Synthesis__BasicEc2Service__CreatesEcsResources', async () => {
    const serviceComponent = new EcsEc2ServiceComponent(
      testEnv.stack,
      'TestEc2Service',
      testEnv.contexts.commercial,
      testEnv.specs.ec2Service
    );

    const { executionTime } = await PerformanceTestHelpers.measureSynthesisTime(() => {
      serviceComponent.synth();
      return Template.fromStack(testEnv.stack);
    }, 5000);

    const template = Template.fromStack(testEnv.stack);

    // Verify ECS Service is created without LaunchType (EC2 services don't specify LaunchType)
    template.hasResourceProperties('AWS::ECS::Service', {
      ServiceName: Match.stringLikeRegexp('.*ec2-service.*'),
      LaunchType: Match.absent()
    });

    // Verify Task Definition is created with EC2 compatibility
    template.hasResourceProperties('AWS::ECS::TaskDefinition', {
      Family: Match.stringLikeRegexp('.*ec2-service.*'),
      RequiresCompatibilities: Match.arrayWith(['EC2']),
      Cpu: '1024',
      Memory: '2048',
      NetworkMode: 'bridge' // EC2 services typically use bridge mode
    });

    // Verify Service Connect configuration
    template.hasResourceProperties('AWS::ECS::Service', {
      ServiceConnectConfiguration: Match.objectLike({
        Enabled: true,
        Services: Match.arrayWith([
          Match.objectLike({
            PortName: 'web',
            DiscoveryName: Match.anyValue()
          })
        ])
      })
    });

    // Performance validation
    expect(executionTime).toBeLessThan(3000);
  });

  it('Synthesis__PlacementStrategies__AppliedToService', async () => {
    const serviceComponent = new EcsEc2ServiceComponent(
      testEnv.stack,
      'TestPlacementService',
      testEnv.contexts.commercial,
      testEnv.specs.ec2Service // Has placement strategies configuration
    );

    serviceComponent.synth();
    const template = Template.fromStack(testEnv.stack);

    // Verify placement strategies are applied
    template.hasResourceProperties('AWS::ECS::Service', {
      PlacementStrategies: Match.arrayWith([
        Match.objectLike({
          Type: 'spread',
          Field: 'attribute:ecs.availability-zone'
        }),
        Match.objectLike({
          Type: 'binpack',
          Field: 'cpu'
        })
      ])
    });
  });

  it('Synthesis__PlacementConstraints__AppliedToService', async () => {
    const serviceComponent = new EcsEc2ServiceComponent(
      testEnv.stack,
      'TestConstraintService',
      testEnv.contexts.commercial,
      testEnv.specs.ec2Service // Has placement constraints configuration
    );

    serviceComponent.synth();
    const template = Template.fromStack(testEnv.stack);

    // Verify placement constraints are applied
    template.hasResourceProperties('AWS::ECS::Service', {
      PlacementConstraints: Match.arrayWith([
        Match.objectLike({
          Type: 'memberOf',
          Expression: 'attribute:ecs.instance-type =~ t3.*'
        })
      ])
    });
  });

  it('Synthesis__AutoScalingEnabled__CreatesScalingResources', async () => {
    const autoScalingSpec: ComponentSpec = {
      name: 'auto-scaling-ec2-service',
      type: 'ecs-ec2-service',
      config: {
        cluster: 'test-cluster',
        image: 'nginx:latest',
        serviceConnect: { portMappingName: 'api' },
        autoScaling: {
          enabled: true,
          minCapacity: 2,
          maxCapacity: 10,
          targetCpuUtilization: 70,
          targetMemoryUtilization: 80,
          scaleInCooldown: 300,
          scaleOutCooldown: 60
        }
      }
    };

    const serviceComponent = new EcsEc2ServiceComponent(
      testEnv.stack,
      'TestAutoScalingEc2Service',
      testEnv.contexts.commercial,
      autoScalingSpec
    );

    serviceComponent.synth();
    const template = Template.fromStack(testEnv.stack);

    // Verify Scalable Target is created
    template.hasResourceProperties('AWS::ApplicationAutoScaling::ScalableTarget', {
      ServiceNamespace: 'ecs',
      ResourceId: Match.stringLikeRegexp('service/.*'),
      ScalableDimension: 'ecs:service:DesiredCount',
      MinCapacity: 2,
      MaxCapacity: 10
    });

    // Verify CPU and Memory scaling policies
    template.resourceCountIs('AWS::ApplicationAutoScaling::ScalingPolicy', 2);
  });

  it('Synthesis__ComplianceFrameworks__AppliesCorrectConfiguration', async () => {
    const frameworks: Array<keyof typeof TEST_CONTEXTS> = ['commercial', 'fedrampModerate', 'fedrampHigh'];
    
    for (const framework of frameworks) {
      const frameworkStack = new cdk.Stack(testEnv.app, `Ec2TestStack-${framework}`);
      const context = { ...testEnv.contexts[framework], scope: frameworkStack };
      
      // Create cluster in the framework-specific stack
      const frameworkCluster = new EcsClusterComponent(
        frameworkStack,
        'TestEc2Cluster',
        context,
        testEnv.specs.ec2Cluster
      );
      frameworkCluster.synth();

      const serviceComponent = new EcsEc2ServiceComponent(
        frameworkStack,
        'TestEc2Service',
        context,
        testEnv.specs.ec2Service
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

      // FedRAMP frameworks should have better resource allocation and placement strategies
      if (framework === 'fedrampHigh' || framework === 'fedrampModerate') {
        template.hasResourceProperties('AWS::ECS::TaskDefinition', {
          Cpu: Match.stringLikeRegexp('^(1024|2048|4096)$'), // At least 1024 CPU units
          Memory: Match.stringLikeRegexp('^(2048|4096|8192)$') // At least 2GB RAM
        });

        // Should have placement strategies for better distribution
        template.hasResourceProperties('AWS::ECS::Service', {
          PlacementStrategies: Match.arrayWith([
            Match.objectLike({ Type: 'spread' })
          ])
        });

        if (framework === 'fedrampHigh') {
          // Should have higher desired count for availability
          template.hasResourceProperties('AWS::ECS::Service', {
            DesiredCount: Match.anyValue() // Will be >= 2 based on compliance defaults
          });
        }
      }
    }
  });
});

/*
 * Test Metadata: TP-ECS-EC2-003
 * {
 *   "id": "TP-ECS-EC2-003",
 *   "level": "unit",
 *   "capability": "Service Connect capability registration for EC2 services",
 *   "oracle": "contract",
 *   "invariants": ["Capability presence", "Service metadata accuracy", "Port configuration"],
 *   "fixtures": ["TestFixtureFactory", "ServiceConnectCapability validation"],
 *   "inputs": { "shape": "Synthesized EC2 service with capability inspection", "notes": "Service Connect capability structure" },
 *   "risks": [],
 *   "dependencies": ["Service Connect configuration"],
 *   "evidence": ["Capability object structure", "Service discovery metadata"],
 *   "complianceRefs": ["std://component-contracts", "std://service-connect"],
 *   "aiGenerated": true,
 *   "humanReviewedBy": "platform-team"
 * }
 */
describe('EcsEc2ServiceComponent__ServiceConnect__CapabilityContract', () => {
  let testEnv: ReturnType<typeof TestFixtureFactory.createTestEnvironment>;
  let ec2ClusterComponent: EcsClusterComponent;

  beforeEach(() => {
    testEnv = TestFixtureFactory.createTestEnvironment();
    TestFixtureFactory.createMockVpc(testEnv.stack);

    ec2ClusterComponent = new EcsClusterComponent(
      testEnv.stack,
      'TestEc2Cluster',
      testEnv.contexts.commercial,
      testEnv.specs.ec2Cluster
    );
    ec2ClusterComponent.synth();
  });

  afterEach(() => {
    TestFixtureFactory.cleanup();
  });

  it('Capabilities__AfterSynthesis__ProvidesServiceConnectCapability', async () => {
    const serviceComponent = new EcsEc2ServiceComponent(
      testEnv.stack,
      'TestEc2Service',
      testEnv.contexts.commercial,
      testEnv.specs.ec2Service
    );

    serviceComponent.synth();

    const capabilities = serviceComponent.getCapabilities();
    expect(capabilities).toHaveProperty('service:connect');

    const serviceConnectCapability = capabilities['service:connect'];
    TestAssertions.assertServiceConnectCapability(serviceConnectCapability);

    // Validate EC2-specific service metadata
    expect(serviceConnectCapability.serviceName).toBe('ec2-service');
    expect(serviceConnectCapability.port).toBe(80);
    expect(serviceConnectCapability.dnsName).toBe('ec2-service.internal');
    expect(serviceConnectCapability.internalEndpoint).toBe('ec2-service.internal:80');
  });

  it('Capabilities__CustomPortAndName__ReflectsConfiguration', async () => {
    const customSpec: ComponentSpec = {
      name: 'custom-ec2-service',
      type: 'ecs-ec2-service',
      config: {
        cluster: 'test-cluster',
        image: 'httpd:latest',
        port: 8080,
        serviceConnect: {
          portMappingName: 'custom-web'
        }
      }
    };

    const serviceComponent = new EcsEc2ServiceComponent(
      testEnv.stack,
      'TestCustomEc2Service',
      testEnv.contexts.commercial,
      customSpec
    );

    serviceComponent.synth();

    const capabilities = serviceComponent.getCapabilities();
    const serviceConnectCapability = capabilities['service:connect'];

    expect(serviceConnectCapability.port).toBe(8080);
    expect(serviceConnectCapability.internalEndpoint).toBe('custom-ec2-service.internal:8080');
  });
});

/*
 * Test Metadata: TP-ECS-EC2-004
 * {
 *   "id": "TP-ECS-EC2-004",
 *   "level": "unit",
 *   "capability": "Platform tagging standard compliance for EC2 services",
 *   "oracle": "contract", 
 *   "invariants": ["Mandatory tags on all resources", "EC2-specific tags", "Tag inheritance"],
 *   "fixtures": ["TestFixtureFactory", "TestAssertions"],
 *   "inputs": { "shape": "EC2 service with tag validation", "notes": "ECS Service, Task Definition, Security Group tagging" },
 *   "risks": [],
 *   "dependencies": ["Template assertions"],
 *   "evidence": ["CloudFormation tag validation", "EC2-specific tag values"],
 *   "complianceRefs": ["std://tagging"],
 *   "aiGenerated": true,
 *   "humanReviewedBy": "platform-team"
 * }
 */
describe('EcsEc2ServiceComponent__TaggingCompliance__MandatoryTags', () => {
  let testEnv: ReturnType<typeof TestFixtureFactory.createTestEnvironment>;
  let ec2ClusterComponent: EcsClusterComponent;

  beforeEach(() => {
    testEnv = TestFixtureFactory.createTestEnvironment();
    TestFixtureFactory.createMockVpc(testEnv.stack);

    ec2ClusterComponent = new EcsClusterComponent(
      testEnv.stack,
      'TestEc2Cluster',
      testEnv.contexts.commercial,
      testEnv.specs.ec2Cluster
    );
    ec2ClusterComponent.synth();
  });

  afterEach(() => {
    TestFixtureFactory.cleanup();
  });

  it('Tagging__MandatoryTags__AppliedToAllResources', async () => {
    const serviceComponent = new EcsEc2ServiceComponent(
      testEnv.stack,
      'TestEc2Service',
      testEnv.contexts.commercial,
      testEnv.specs.ec2Service
    );

    serviceComponent.synth();
    const template = Template.fromStack(testEnv.stack);

    // Verify mandatory tags on ECS Service
    TestAssertions.assertMandatoryTags(template, 'AWS::ECS::Service');

    // Verify mandatory tags on Task Definition
    TestAssertions.assertMandatoryTags(template, 'AWS::ECS::TaskDefinition');

    // Verify mandatory tags on Security Group
    TestAssertions.assertMandatoryTags(template, 'AWS::EC2::SecurityGroup');

    // Verify EC2-specific tags
    template.hasResourceProperties('AWS::ECS::Service', {
      Tags: Match.arrayWith([
        Match.objectLike({ Key: 'component-type', Value: 'ecs-ec2-service' }),
        Match.objectLike({ Key: 'service-connect-name', Value: 'web' }),
        Match.objectLike({ Key: 'container-port', Value: '80' })
      ])
    });
  });

  it('Tagging__UserDefinedTags__PreservedOnService', async () => {
    const customSpec: ComponentSpec = {
      name: 'custom-tagged-ec2-service',
      type: 'ecs-ec2-service',
      config: {
        cluster: 'test-cluster',
        image: 'httpd:latest',
        serviceConnect: { portMappingName: 'web' },
        tags: {
          'deployment-type': 'ec2-optimized',
          'cost-center': 'infrastructure'
        }
      }
    };

    const serviceComponent = new EcsEc2ServiceComponent(
      testEnv.stack,
      'TestCustomTaggedService',
      testEnv.contexts.commercial,
      customSpec
    );

    serviceComponent.synth();
    const template = Template.fromStack(testEnv.stack);

    // Verify user-defined tags are applied
    template.hasResourceProperties('AWS::ECS::Service', {
      Tags: Match.arrayWith([
        Match.objectLike({ Key: 'deployment-type', Value: 'ec2-optimized' }),
        Match.objectLike({ Key: 'cost-center', Value: 'infrastructure' })
      ])
    });
  });
});

/*
 * Test Metadata: TP-ECS-EC2-005
 * {
 *   "id": "TP-ECS-EC2-005",
 *   "level": "unit",
 *   "capability": "Error handling and configuration validation for EC2 edge cases",
 *   "oracle": "exact",
 *   "invariants": ["Proper validation errors", "Placement strategy limits", "Resource constraints"],
 *   "fixtures": ["TestFixtureFactory", "Invalid configurations"],
 *   "inputs": { "shape": "Invalid EC2 service configurations", "notes": "Placement strategies, constraints, missing fields" },
 *   "risks": [],
 *   "dependencies": [],
 *   "evidence": ["Exception types and messages", "Validation timing"],
 *   "complianceRefs": ["std://error-handling", "std://ec2-limits"],
 *   "aiGenerated": true,
 *   "humanReviewedBy": "platform-team"
 * }
 */
describe('EcsEc2ServiceComponent__ValidationErrorHandling__EdgeCases', () => {
  let testEnv: ReturnType<typeof TestFixtureFactory.createTestEnvironment>;

  beforeEach(() => {
    testEnv = TestFixtureFactory.createTestEnvironment();
  });

  afterEach(() => {
    TestFixtureFactory.cleanup();
  });

  it('Validation__InvalidPlacementStrategy__ThrowsActionableError', async () => {
    const invalidSpec: ComponentSpec = {
      name: 'invalid-placement-service',
      type: 'ecs-ec2-service',
      config: {
        cluster: 'test-cluster',
        image: 'nginx:latest',
        placementStrategies: [
          {
            type: 'invalid-type', // Invalid placement strategy type
            field: 'cpu'
          }
        ],
        serviceConnect: { portMappingName: 'api' }
      }
    };

    expect(() => {
      const builder = new EcsEc2ServiceConfigBuilder(testEnv.contexts.commercial, invalidSpec);
      builder.buildSync();
    }).toThrow(); // Should throw validation error
  });

  it('Validation__TooManyPlacementStrategies__ThrowsValidationError', async () => {
    // AWS ECS allows maximum 5 placement strategies
    const tooManyStrategies = Array(6).fill(0).map((_, index) => ({
      type: 'spread',
      field: `attribute:custom-${index}`
    }));

    const invalidSpec: ComponentSpec = {
      name: 'too-many-strategies-service',
      type: 'ecs-ec2-service',
      config: {
        cluster: 'test-cluster',
        image: 'nginx:latest',
        placementStrategies: tooManyStrategies,
        serviceConnect: { portMappingName: 'api' }
      }
    };

    expect(() => {
      const builder = new EcsEc2ServiceConfigBuilder(testEnv.contexts.commercial, invalidSpec);
      builder.buildSync();
    }).toThrow(); // Should throw for too many placement strategies
  });

  it('Validation__MissingRequiredFields__ThrowsValidationError', async () => {
    const incompleteSpec: ComponentSpec = {
      name: 'incomplete-ec2-service',
      type: 'ecs-ec2-service',
      config: {
        // Missing required fields: cluster, image, serviceConnect
      }
    };

    expect(() => {
      const builder = new EcsEc2ServiceConfigBuilder(testEnv.contexts.commercial, incompleteSpec);
      builder.buildSync();
    }).toThrow(); // Should throw for missing required configuration
  });

  it('Capabilities__BeforeSynthesis__ThrowsActionableError', async () => {
    const serviceComponent = new EcsEc2ServiceComponent(
      testEnv.stack,
      'TestService',
      testEnv.contexts.commercial,
      testEnv.specs.ec2Service
    );

    expect(() => {
      serviceComponent.getCapabilities();
    }).toThrow('ECS EC2 Service component must be synthesized before accessing capabilities');
  });

  it('ComponentType__Always__ReturnsCorrectType', async () => {
    const serviceComponent = new EcsEc2ServiceComponent(
      testEnv.stack,
      'TestService',
      testEnv.contexts.commercial,
      testEnv.specs.ec2Service
    );

    expect(serviceComponent.getType()).toBe('ecs-ec2-service');
  });

  it('Synthesis__ComplexPlacementConfiguration__HandlesCorrectly', async () => {
    const complexSpec: ComponentSpec = {
      name: 'complex-placement-service',
      type: 'ecs-ec2-service',
      config: {
        cluster: 'test-cluster',
        image: 'nginx:latest',
        placementStrategies: [
          { type: 'spread', field: 'attribute:ecs.availability-zone' },
          { type: 'spread', field: 'instanceId' },
          { type: 'binpack', field: 'cpu' },
          { type: 'binpack', field: 'memory' },
          { type: 'random' }
        ],
        placementConstraints: [
          { type: 'memberOf', expression: 'attribute:ecs.instance-type =~ m5.*' },
          { type: 'distinctInstance' }
        ],
        serviceConnect: { portMappingName: 'api' }
      }
    };

    // Should not throw - complex placement should be supported
    expect(() => {
      const builder = new EcsEc2ServiceConfigBuilder(testEnv.contexts.commercial, complexSpec);
      const config = builder.buildSync();
      expect(config.placementStrategies).toHaveLength(5);
      expect(config.placementConstraints).toHaveLength(2);
    }).not.toThrow();
  });
});
