/**
 * ECS Cluster Component Test Suite
 * 
 * Comprehensive tests following Platform Testing Standard v1.0
 * Tests the foundational ECS Service Connect component with full compliance validation
 */

import * as cdk from 'aws-cdk-lib';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as servicediscovery from 'aws-cdk-lib/aws-servicediscovery';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { ComponentSpec } from '@shinobi/core/component-interfaces';
import { EcsClusterComponent } from '../src/ecs-cluster.component.js';
import { EcsClusterComponentConfigBuilder } from '../src/ecs-cluster.builder.js';
import { 
  TestFixtureFactory, 
  TestAssertions, 
  PerformanceTestHelpers,
  TEST_CONTEXTS,
  TEST_SPECS 
} from '../test-fixtures.js';

let platformConfigSpy: jest.SpyInstance;

beforeEach(() => {
  platformConfigSpy = jest
    .spyOn(EcsClusterComponentConfigBuilder.prototype, '_loadPlatformConfiguration')
    .mockImplementation(() => ({}));
});

afterEach(() => {
  platformConfigSpy.mockRestore();
});

/*
 * Test Metadata: TP-ECS-CLUSTER-001
 * {
 *   "id": "TP-ECS-CLUSTER-001",
 *   "level": "unit",
 *   "capability": "ECS Cluster configuration validation with 5-layer precedence",
 *   "oracle": "exact",
 *   "invariants": ["Configuration precedence order", "Compliance framework defaults", "JSON schema validation"],
 *   "fixtures": ["TestFixtureFactory", "TEST_CONTEXTS", "TEST_SPECS"],
 *   "inputs": { "shape": "ComponentContext + ComponentSpec variations", "notes": "Deterministic compliance framework contexts" },
 *   "risks": [],
 *   "dependencies": ["aws-cdk-lib"],
 *   "evidence": ["Configuration object property validation", "Compliance-specific defaults"],
 *   "complianceRefs": ["std://configuration", "std://compliance-frameworks"],
 *   "aiGenerated": true,
 *   "humanReviewedBy": "platform-team"
 * }
 */
describe('EcsClusterConfigBuilder__PrecedenceChain__ConfigurationMerging', () => {
  let testEnv: ReturnType<typeof TestFixtureFactory.createTestEnvironment>;

  beforeEach(() => {
    testEnv = TestFixtureFactory.createTestEnvironment();
  });

  afterEach(() => {
    TestFixtureFactory.cleanup();
  });

  it('ConfigBuilder__MinimalConfiguration__UsesHardcodedFallbacks', async () => {
    const builder = new EcsClusterComponentConfigBuilder({ 
      context: testEnv.contexts.commercial, 
      spec: {
        name: 'minimal-cluster',
        type: 'ecs-cluster',
        config: {}
      }
    });

    const config = builder.buildSync();

    // Layer 1: Hardcoded fallbacks should be applied
    expect(config.serviceConnect.namespace).toBe('internal');
    expect(config.containerInsights).toBe(true);
    expect(config.capacity).toBeUndefined(); // Should not have capacity by default
  });

  it('ConfigBuilder__ComplianceFrameworks__AppliesCorrectDefaults', async () => {
    const frameworks: Array<keyof typeof TEST_CONTEXTS> = ['commercial', 'fedrampModerate', 'fedrampHigh'];

    for (const framework of frameworks) {
      const builder = new EcsClusterComponentConfigBuilder({ 
        context: testEnv.contexts[framework], 
        spec: testEnv.specs.minimalCluster
      });
      const config = builder.buildSync();

      TestAssertions.assertComplianceConfiguration(config, testEnv.contexts[framework].complianceFramework);

      // Compliance-specific validations
      if (framework === 'fedrampHigh') {
        expect(config.containerInsights).toBe(true);
        // FedRAMP High should have more conservative defaults for capacity if provided
        if (config.capacity) {
          expect(config.capacity.instanceType).toMatch(/^(m5|c5|r5)\.(large|xlarge)/);
          expect(config.capacity.minSize).toBeGreaterThanOrEqual(2);
          expect(config.capacity.enableMonitoring).toBe(true);
        }
      }
    }
  });

  it('ConfigBuilder__UserConfiguration__OverridesPlatformDefaults', async () => {
    const customSpec: ComponentSpec = {
      name: 'custom-cluster',
      type: 'ecs-cluster',
      config: {
        serviceConnect: {
          namespace: 'custom-namespace'
        },
        containerInsights: false, // Override platform default
        capacity: {
          instanceType: 't3.small',
          minSize: 1,
          maxSize: 5
        }
      }
    };

    const builder = new EcsClusterComponentConfigBuilder({ 
      context: testEnv.contexts.commercial, 
      spec: customSpec
    });
    const config = builder.buildSync();

    // User configuration should take precedence
    expect(config.serviceConnect.namespace).toBe('custom-namespace');
    expect(config.containerInsights).toBe(false);
    expect(config.capacity?.instanceType).toBe('t3.small');
    expect(config.capacity?.minSize).toBe(1);
    expect(config.capacity?.maxSize).toBe(5);
  });
});

/*
 * Test Metadata: TP-ECS-CLUSTER-002
 * {
 *   "id": "TP-ECS-CLUSTER-002", 
 *   "level": "integration",
 *   "capability": "ECS Cluster AWS resource synthesis with Service Connect",
 *   "oracle": "contract",
 *   "invariants": ["AWS resource creation", "Service Connect namespace setup", "Tag inheritance"],
 *   "fixtures": ["TestFixtureFactory", "MockVpc"],
 *   "inputs": { "shape": "Component synthesis with CloudFormation template validation", "notes": "Mocked VPC dependencies" },
 *   "risks": ["CDK version compatibility"],
 *   "dependencies": ["aws-cdk-lib/assertions", "Template matching"],
 *   "evidence": ["CloudFormation template structure", "Resource property validation"],
 *   "complianceRefs": ["std://tagging", "std://resource-creation"],
 *   "aiGenerated": true,
 *   "humanReviewedBy": "platform-team"
 * }
 */
describe('EcsClusterComponent__ResourceSynthesis__CloudFormationGeneration', () => {
  let testEnv: ReturnType<typeof TestFixtureFactory.createTestEnvironment>;
  let mockVpc: ec2.IVpc;

  beforeEach(() => {
    testEnv = TestFixtureFactory.createTestEnvironment();
    mockVpc = TestFixtureFactory.createMockVpc(testEnv.stack);
    Object.values(testEnv.contexts).forEach((context) => {
      context.vpc = mockVpc;
    });
  });

  afterEach(() => {
    TestFixtureFactory.cleanup();
  });

  it('Synthesis__MinimalCluster__CreatesBasicResources', async () => {
    const component = new EcsClusterComponent(
      testEnv.stack,
      'TestCluster',
      testEnv.contexts.commercial,
      testEnv.specs.minimalCluster
    );

    const { executionTime } = await PerformanceTestHelpers.measureSynthesisTime(() => {
      component.synth();
      return Template.fromStack(testEnv.stack);
    }, 5000); // Max 5 seconds

    const template = Template.fromStack(testEnv.stack);

    // Verify core ECS resources
    TestAssertions.assertEcsClusterResources(template, 'test-service-minimal-cluster');

    // Verify Service Connect namespace
    template.hasResourceProperties('AWS::ServiceDiscovery::PrivateDnsNamespace', {
      Name: 'internal',
      Vpc: Match.anyValue()
    });

    // Verify Container Insights is enabled
    template.hasResourceProperties('AWS::ECS::Cluster', {
      ClusterSettings: Match.arrayWith([
        Match.objectLike({
          Name: 'containerInsights',
          Value: 'enabled'
        })
      ])
    });

    // Performance requirement: synthesis should be fast
    expect(executionTime).toBeLessThan(3000);
  });

  it('Synthesis__Ec2Cluster__CreatesCapacityResources', async () => {
    const component = new EcsClusterComponent(
      testEnv.stack,
      'TestEc2Cluster',
      testEnv.contexts.commercial,
      testEnv.specs.ec2Cluster
    );

    component.synth();
    const template = Template.fromStack(testEnv.stack);

    // Verify Auto Scaling Group is created with IMDSv2 enforcement and scale-in protection
    template.hasResourceProperties('AWS::AutoScaling::AutoScalingGroup', Match.objectLike({
      MinSize: '2',
      MaxSize: '10',
      DesiredCapacity: '3',
      NewInstancesProtectedFromScaleIn: true
    }));

    // Verify Capacity Provider
    template.hasResourceProperties('AWS::ECS::CapacityProvider', {
      AutoScalingGroupProvider: Match.anyValue()
    });

    // Verify Launch Configuration with ECS optimised AMI, IMDSv2 requirement and encrypted volume
    template.hasResource('AWS::AutoScaling::LaunchConfiguration', {
      Properties: Match.objectLike({
        InstanceType: 'm5.large',
        MetadataOptions: Match.objectLike({
          HttpTokens: 'required'
        }),
        BlockDeviceMappings: Match.arrayWith([
          Match.objectLike({
            Ebs: Match.objectLike({
              Encrypted: true,
              VolumeType: 'gp3'
            })
          })
        ])
      })
    });

    // Verify security group restricts outbound traffic to HTTPS
    template.hasResourceProperties('AWS::EC2::SecurityGroup', Match.objectLike({
      SecurityGroupEgress: Match.arrayWith([
        Match.objectLike({
          FromPort: 443,
          ToPort: 443
        })
      ])
    }));

    // Verify IAM role includes SSM access for patching/management
    template.hasResourceProperties('AWS::IAM::Role', Match.objectLike({
      ManagedPolicyArns: Match.arrayWith([
        Match.stringLikeRegexp('AmazonSSMManagedInstanceCore')
      ])
    }));

    // Verify log retention custom resource exists for Container Insights
    template.resourceCountIs('Custom::LogRetention', 2);

    // Count total resources to ensure no resource explosion
    const resourceCounts = PerformanceTestHelpers.countResources(template);
    expect(resourceCounts['AWS::ECS::Cluster']).toBe(1);
    expect(resourceCounts['AWS::ServiceDiscovery::PrivateDnsNamespace']).toBe(1);
    expect(resourceCounts['AWS::AutoScaling::AutoScalingGroup']).toBe(1);
    expect(resourceCounts['AWS::ECS::CapacityProvider']).toBe(1);

    expect(Object.keys(template.findResources('AWS::CloudWatch::Alarm'))).not.toHaveLength(0);
    expect(Object.keys(template.findResources('AWS::CloudWatch::Dashboard'))).not.toHaveLength(0);
  });

  it('Observability__ExtendedRetention__SupportsTenYearWindow', async () => {
    const env = TestFixtureFactory.createTestEnvironment();
    const stack = env.stack;
    const vpc = TestFixtureFactory.createMockVpc(stack);
    const context = {
      ...env.contexts.commercial,
      scope: stack,
      vpc
    };

    const spec: ComponentSpec = {
      ...env.specs.minimalCluster,
      config: {
        ...env.specs.minimalCluster.config,
        observability: {
          logging: {
            retentionInDays: 3650
          }
        }
      }
    };

    const component = new EcsClusterComponent(stack, 'HighRetentionCluster', context, spec);
    component.synth();

    const template = Template.fromStack(stack);
    const retentionResources = template.findResources('Custom::LogRetention');
    const retentionValues = Object.values(retentionResources).map((resource: any) => resource.Properties?.RetentionInDays);

    expect(retentionValues).toContain(3653);
  });

  it('FedRamp__Capacity__CreatesManagedKmsKey', async () => {
    const env = TestFixtureFactory.createTestEnvironment({
      region: TEST_CONTEXTS.fedrampHigh.region
    });
    const stack = env.stack;
    const vpc = TestFixtureFactory.createMockVpc(stack);
    const context = {
      ...env.contexts.fedrampHigh,
      scope: stack,
      vpc
    };

    const component = new EcsClusterComponent(
      stack,
      'FedrampCluster',
      context,
      env.specs.ec2Cluster
    );

    component.synth();
    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::KMS::Key', Match.objectLike({
      EnableKeyRotation: true
    }));

    template.hasResourceProperties('AWS::AutoScaling::LaunchConfiguration', Match.objectLike({
      BlockDeviceMappings: Match.arrayWith([
        Match.objectLike({
          Ebs: Match.objectLike({
            Encrypted: true,
            KmsKeyId: Match.anyValue()
          })
        })
      ])
    }));
  });

  it('Synthesis__ComplianceFrameworks__CreatesCorrectResources', async () => {
    const frameworks: Array<keyof typeof TEST_CONTEXTS> = ['commercial', 'fedrampModerate', 'fedrampHigh'];
    
    for (const framework of frameworks) {
      const frameworkEnv = TestFixtureFactory.createTestEnvironment({
        region: TEST_CONTEXTS[framework].region
      });
      const frameworkStack = frameworkEnv.stack;
      const frameworkVpc = TestFixtureFactory.createMockVpc(
        frameworkStack,
        `FrameworkVpc-${String(framework)}`
      );
      const context = {
        ...frameworkEnv.contexts[framework],
        scope: frameworkStack,
        vpc: frameworkVpc
      };

      const component = new EcsClusterComponent(
        frameworkStack,
        `TestCluster-${String(framework)}`,
        context,
        testEnv.specs.ec2Cluster
      );

      component.synth();
      const template = Template.fromStack(frameworkStack);

      // All frameworks should have Container Insights enabled
      template.hasResourceProperties('AWS::ECS::Cluster', {
        ClusterSettings: Match.arrayWith([
          Match.objectLike({
            Name: 'containerInsights',
            Value: 'enabled'
          })
        ])
      });

      // FedRAMP frameworks should have enhanced monitoring
      if (framework === 'fedrampModerate' || framework === 'fedrampHigh') {
        // Should use larger, more resilient instance types
        template.hasResourceProperties('AWS::AutoScaling::LaunchConfiguration', {
          InstanceType: Match.stringLikeRegexp('(m5|c5|r5)\\.(large|xlarge)')
        });
      }

      const associations = template.findResources('AWS::ECS::ClusterCapacityProviderAssociations');
      const association = Object.values(associations)[0] as {
        Properties?: {
          DefaultCapacityProviderStrategy?: Array<{ CapacityProvider: string }>;
        };
      };
      const strategyProviders = (association?.Properties?.DefaultCapacityProviderStrategy ?? []).map(
        (item) => item.CapacityProvider
      );

      expect(strategyProviders.length).toBeGreaterThan(0);
      if (framework === 'fedrampModerate' || framework === 'fedrampHigh') {
        expect(strategyProviders).not.toContain('FARGATE_SPOT');
      }

      TestFixtureFactory.cleanup();
    }
  });

  /*
   * Test Metadata: TP-ECS-CLUSTER-003
   * {
   *   "id": "TP-ECS-CLUSTER-003",
   *   "level": "unit",
   *   "capability": "Capabilities include observability metadata",
   *   "oracle": "contract",
   *   "invariants": ["observability capability registered", "otel environment exported"],
   *   "fixtures": ["cdk.App", "cdk.Stack", "EcsClusterComponent"],
   *   "inputs": { "shape": "Commercial cluster with defaults", "notes": "Observability enabled" },
   *   "risks": ["Downstream telemetry binders missing data"],
   *   "dependencies": [],
   *   "evidence": ["component.getCapabilities()"],
   *   "complianceRefs": ["std://platform-observability-standard"],
   *   "aiGenerated": false,
   *   "humanReviewedBy": ""
   * }
   */
  it('Capabilities__AfterSynthesis__RegistersObservabilityMetadata', () => {
    const component = new EcsClusterComponent(
      testEnv.stack,
      'ObservabilityCluster',
      testEnv.contexts.commercial,
      testEnv.specs.minimalCluster
    );

    component.synth();

    const capabilities = component.getCapabilities();
    expect(capabilities['ecs:cluster']).toBeDefined();
    expect(capabilities['observability:ecs-cluster']).toBeDefined();
    const observabilityCapability = capabilities['observability:ecs-cluster'];
    expect(observabilityCapability.otelEnvironment).toBeDefined();
    expect(observabilityCapability.logging.retentionInDays).toBeGreaterThan(0);
    expect(observabilityCapability.logging.appliedRetentionInDays).toBeGreaterThan(0);
    expect(observabilityCapability.tracing.adotSidecar).toBe(true);
    expect(capabilities['otel:environment']).toBeDefined();
    expect(Array.isArray(observabilityCapability.alarms.alarmNames)).toBe(true);
    expect(observabilityCapability.alarms.alarmNames.length).toBeGreaterThan(0);
    expect(observabilityCapability.dashboard.name).toBeTruthy();
  });

  /*
   * Test Metadata: TP-ECS-CLUSTER-004
   * {
   *   "id": "TP-ECS-CLUSTER-004",
   *   "level": "unit",
   *   "capability": "Monitoring disabled skips observability capability",
   *   "oracle": "contract",
   *   "invariants": ["No observability capability", "No otel environment"],
   *   "fixtures": ["cdk.App", "cdk.Stack", "EcsClusterComponent"],
   *   "inputs": { "shape": "Cluster with monitoring disabled", "notes": "Validates opt-out" },
   *   "risks": ["Telemetry provisioned when not requested"],
   *   "dependencies": [],
   *   "evidence": ["component.getCapabilities()"],
   *   "complianceRefs": ["std://platform-observability-standard"],
   *   "aiGenerated": false,
   *   "humanReviewedBy": ""
   * }
   */
  it('Observability__MonitoringDisabled__ThrowsValidationError', () => {
    expect(() => new EcsClusterComponent(
      testEnv.stack,
      'NoObservabilityCluster',
      testEnv.contexts.commercial,
      {
        ...testEnv.specs.minimalCluster,
        config: {
          ...testEnv.specs.minimalCluster.config,
          monitoring: {
            enabled: false
          }
        }
      }
    )).toThrow('monitoring.enabled');
  });

  /*
   * Test Metadata: TP-ECS-CLUSTER-005
   * {
   *   "id": "TP-ECS-CLUSTER-005",
   *   "level": "unit",
   *   "capability": "User tags propagate to all cluster resources",
   *   "oracle": "contract",
   *   "invariants": ["Tag present on namespace", "Tag present on ASG"],
   *   "fixtures": ["cdk.App", "cdk.Stack", "EcsClusterComponent"],
   *   "inputs": { "shape": "Cluster with custom tags", "notes": "Ensures tagging standard compliance" },
   *   "risks": ["Missing cost allocation tags"],
   *   "dependencies": [],
   *   "evidence": ["CloudFormation template"],
   *   "complianceRefs": ["std://platform-tagging-standard"],
   *   "aiGenerated": false,
   *   "humanReviewedBy": ""
   * }
   */
  it('Tagging__CustomTags__PropagateToResources', () => {
    const component = new EcsClusterComponent(
      testEnv.stack,
      'TaggedCluster',
      testEnv.contexts.commercial,
      {
        ...testEnv.specs.ec2Cluster,
        config: {
          ...testEnv.specs.ec2Cluster.config,
          tags: {
            'cost-center': 'eng-42'
          }
        }
      }
    );

    component.synth();
    const template = Template.fromStack(testEnv.stack);

    template.hasResourceProperties('AWS::ServiceDiscovery::PrivateDnsNamespace', {
      Tags: Match.arrayWith([
        Match.objectLike({ Key: 'cost-center', Value: 'eng-42' })
      ])
    });

    template.hasResourceProperties('AWS::AutoScaling::AutoScalingGroup', {
      Tags: Match.arrayWith([
        Match.objectLike({ Key: 'cost-center', Value: 'eng-42' })
      ])
    });

    template.hasResourceProperties('AWS::EC2::SecurityGroup', {
      Tags: Match.arrayWith([
        Match.objectLike({ Key: 'cost-center', Value: 'eng-42' })
      ])
    });
  });

  /*
   * Test Metadata: TP-ECS-CLUSTER-006
   * {
   *   "id": "TP-ECS-CLUSTER-006",
   *   "level": "unit",
   *   "capability": "Component enforces VPC context requirement",
   *   "oracle": "contract",
   *   "invariants": ["Synth throws meaningful error"],
   *   "fixtures": ["cdk.App", "cdk.Stack", "EcsClusterComponent"],
   *   "inputs": { "shape": "Context without VPC", "notes": "Ensures secure-by-default network configuration" },
   *   "risks": ["Resources deployed to unintended network"],
   *   "dependencies": [],
   *   "evidence": ["component.synth()"],
   *   "complianceRefs": ["std://platform-networking-standard"],
   *   "aiGenerated": false,
   *   "humanReviewedBy": ""
   * }
   */
  it('Networking__MissingVpc__ThrowsExplicitError', () => {
    const contextWithoutVpc = {
      ...testEnv.contexts.commercial,
      vpc: undefined
    };

    const component = new EcsClusterComponent(
      testEnv.stack,
      'MissingVpcCluster',
      contextWithoutVpc,
      testEnv.specs.minimalCluster
    );

    expect(() => component.synth()).toThrow('requires a VPC');
  });
});

/*
 * Test Metadata: TP-ECS-CLUSTER-003
 * {
 *   "id": "TP-ECS-CLUSTER-003",
 *   "level": "unit", 
 *   "capability": "Platform tagging standard compliance verification",
 *   "oracle": "contract",
 *   "invariants": ["All mandatory tags present", "Tag value correctness", "Tag inheritance"],
 *   "fixtures": ["TestFixtureFactory", "TestAssertions"],
 *   "inputs": { "shape": "Component with various tag configurations", "notes": "Tests standard and custom tags" },
 *   "risks": [],
 *   "dependencies": ["Template assertions"],
 *   "evidence": ["CloudFormation tag properties", "Tag key-value validation"],
 *   "complianceRefs": ["std://tagging"],
 *   "aiGenerated": true,
 *   "humanReviewedBy": "platform-team"
 * }
 */
describe('EcsClusterComponent__TaggingCompliance__MandatoryTags', () => {
  let testEnv: ReturnType<typeof TestFixtureFactory.createTestEnvironment>;

  beforeEach(() => {
    testEnv = TestFixtureFactory.createTestEnvironment();
  });

  afterEach(() => {
    TestFixtureFactory.cleanup();
  });

  it('Tagging__MandatoryTags__AppliedToAllResources', async () => {
    const component = new EcsClusterComponent(
      testEnv.stack,
      'TestCluster',
      testEnv.contexts.commercial,
      testEnv.specs.ec2Cluster
    );

    component.synth();
    const template = Template.fromStack(testEnv.stack);


    // Debug output for tag structure

    // Verify mandatory tags on ECS Cluster
    TestAssertions.assertMandatoryTags(template, 'AWS::ECS::Cluster');

    // Verify mandatory tags on Service Discovery Namespace
    TestAssertions.assertMandatoryTags(template, 'AWS::ServiceDiscovery::PrivateDnsNamespace');

    // Verify mandatory tags on Auto Scaling Group (if present)
        TestAssertions.assertMandatoryTags(template, 'AWS::AutoScaling::AutoScalingGroup');

    // Verify component-specific tags
    template.hasResourceProperties('AWS::ECS::Cluster', {
      Tags: Match.arrayWith([
        Match.objectLike({ Key: 'component-type', Value: 'ecs-cluster' }),
        Match.objectLike({ Key: 'service-connect-namespace', Value: 'production' })
      ])
    });

    template.hasResourceProperties('AWS::IAM::Role', Match.objectLike({
      Tags: Match.arrayWith([
        Match.objectLike({ Key: 'component-type', Value: 'ecs-asg-role' })
      ])
    }));
  });

  it('Tagging__UserDefinedTags__PreservedAndApplied', async () => {
    const component = new EcsClusterComponent(
      testEnv.stack,
      'TestCluster',
      testEnv.contexts.commercial,
      testEnv.specs.ec2Cluster // Contains custom tags
    );

    component.synth();
    const template = Template.fromStack(testEnv.stack);

    const clusters = template.findResources('AWS::ECS::Cluster');
    const cluster = Object.values(clusters)[0] as { Properties?: { Tags?: Array<{ Key: string; Value: string }> } };
    const tags = cluster?.Properties?.Tags ?? [];

    expect(tags.find((tag) => tag.Key === 'test-tag' && tag.Value === 'test-value')).toBeDefined();
    expect(tags.find((tag) => tag.Key === 'environment' && tag.Value === 'testing')).toBeDefined();
  });
});

/*
 * Test Metadata: TP-ECS-CLUSTER-004
 * {
 *   "id": "TP-ECS-CLUSTER-004",
 *   "level": "integration",
 *   "capability": "Component capability registration and contract validation", 
 *   "oracle": "contract",
 *   "invariants": ["Capability presence after synthesis", "Capability data structure", "Service Connect information"],
 *   "fixtures": ["TestFixtureFactory"],
 *   "inputs": { "shape": "Synthesized component with capability inspection", "notes": "Post-synthesis capability validation" },
 *   "risks": ["Capability registration timing"],
 *   "dependencies": ["Component synthesis"],
 *   "evidence": ["Capability object structure", "Service Connect metadata"],
 *   "complianceRefs": ["std://component-contracts"],
 *   "aiGenerated": true,
 *   "humanReviewedBy": "platform-team"
 * }
 */
describe('EcsClusterComponent__CapabilityContract__ServiceConnectProvision', () => {
  let testEnv: ReturnType<typeof TestFixtureFactory.createTestEnvironment>;

  beforeEach(() => {
    testEnv = TestFixtureFactory.createTestEnvironment();
  });

  afterEach(() => {
    TestFixtureFactory.cleanup();
  });

  it('Capabilities__AfterSynthesis__ProvidesEcsClusterCapability', async () => {
    const component = new EcsClusterComponent(
      testEnv.stack,
      'TestCluster',
      testEnv.contexts.commercial,
      testEnv.specs.minimalCluster
    );

    component.synth();

    const capabilities = component.getCapabilities();
    expect(capabilities).toHaveProperty('ecs:cluster');

    const clusterCapability = capabilities['ecs:cluster'];
    expect(clusterCapability).toHaveProperty('clusterName');
    expect(clusterCapability).toHaveProperty('clusterArn');
    expect(clusterCapability).toHaveProperty('vpcId');
    expect(clusterCapability).toHaveProperty('serviceConnectNamespace');
    expect(clusterCapability).toHaveProperty('namespaceArn');
    expect(clusterCapability).toHaveProperty('namespaceId');
    expect(clusterCapability).toHaveProperty('hasEc2Capacity');
    expect(clusterCapability).toHaveProperty('capacityProviders');

    // Validate data types
    expect(typeof clusterCapability.clusterName).toBe('string');
    expect(typeof clusterCapability.serviceConnectNamespace).toBe('string');
    expect(typeof clusterCapability.hasEc2Capacity).toBe('boolean');
    expect(Array.isArray(clusterCapability.capacityProviders)).toBe(true);
  });

  it('Capabilities__Ec2Cluster__ReflectsCapacityConfiguration', async () => {
    const component = new EcsClusterComponent(
      testEnv.stack,
      'TestEc2Cluster',
      testEnv.contexts.commercial,
      testEnv.specs.ec2Cluster
    );

    component.synth();

    const capabilities = component.getCapabilities();
    const clusterCapability = capabilities['ecs:cluster'];

    expect(clusterCapability.hasEc2Capacity).toBe(true);
    expect(clusterCapability.capacityProviders).toEqual(expect.arrayContaining(['EC2', 'FARGATE', 'FARGATE_SPOT']));
  });

  it('Capabilities__FargateOnlyCluster__ReflectsServerlessConfiguration', async () => {
    const component = new EcsClusterComponent(
      testEnv.stack,
      'TestFargateCluster',
      testEnv.contexts.commercial,
      testEnv.specs.minimalCluster
    );

    component.synth();

    const capabilities = component.getCapabilities();
    const clusterCapability = capabilities['ecs:cluster'];

    expect(clusterCapability.hasEc2Capacity).toBe(false);
    expect(clusterCapability.capacityProviders).toEqual(['FARGATE', 'FARGATE_SPOT']);
  });

  it('Capabilities__FedrampCluster__OmitsSpotCapacity', async () => {
    const fedrampComponent = new EcsClusterComponent(
      testEnv.stack,
      'FedrampCluster',
      testEnv.contexts.fedrampHigh,
      testEnv.specs.minimalCluster
    );

    fedrampComponent.synth();

    const capabilities = fedrampComponent.getCapabilities();
    const clusterCapability = capabilities['ecs:cluster'];

    expect(clusterCapability.capacityProviders).toEqual(['FARGATE']);
  });
});

/*
 * Test Metadata: TP-ECS-CLUSTER-005
 * {
 *   "id": "TP-ECS-CLUSTER-005",
 *   "level": "unit",
 *   "capability": "Component error handling and validation",
 *   "oracle": "exact", 
 *   "invariants": ["Proper error types", "Actionable error messages", "Pre-synthesis validation"],
 *   "fixtures": ["TestFixtureFactory", "Invalid configurations"],
 *   "inputs": { "shape": "Invalid component specifications and contexts", "notes": "Edge cases and error conditions" },
 *   "risks": [],
 *   "dependencies": [],
 *   "evidence": ["Exception types and messages", "Validation timing"],
 *   "complianceRefs": ["std://error-handling"],
 *   "aiGenerated": true,
 *   "humanReviewedBy": "platform-team"
 * }
 */
describe('EcsClusterComponent__ErrorHandling__ValidationFailures', () => {
  let testEnv: ReturnType<typeof TestFixtureFactory.createTestEnvironment>;

  beforeEach(() => {
    testEnv = TestFixtureFactory.createTestEnvironment();
  });

  afterEach(() => {
    TestFixtureFactory.cleanup();
  });

  it('Validation__PreSynthesis__ThrowsOnInvalidConfiguration', async () => {
    const invalidSpec: ComponentSpec = {
      name: 'invalid-cluster',
      type: 'ecs-cluster',
      config: {
        serviceConnect: {
          namespace: '' // Invalid: empty namespace
        },
        capacity: {
          instanceType: 'invalid-type',
          minSize: -1, // Invalid: negative size
          maxSize: 0   // Invalid: zero max size
        }
      }
    };

    expect(() => {
      const builder = new EcsClusterComponentConfigBuilder({ 
        context: testEnv.contexts.commercial, 
        spec: invalidSpec
      });
      builder.buildSync(); // Should throw on validation
    }).toThrow();
  });

  it('Capabilities__BeforeSynthesis__ThrowsActionableError', async () => {
    const component = new EcsClusterComponent(
      testEnv.stack,
      'TestCluster',
      testEnv.contexts.commercial,
      testEnv.specs.minimalCluster
    );

    // Should throw when accessing capabilities before synthesis
    expect(() => {
      component.getCapabilities();
    }).toThrow('ECS Cluster component must be synthesized before accessing capabilities');
  });

  it('ComponentType__Always__ReturnsCorrectType', async () => {
    const component = new EcsClusterComponent(
      testEnv.stack,
      'TestCluster',
      testEnv.contexts.commercial,
      testEnv.specs.minimalCluster
    );

    expect(component.getType()).toBe('ecs-cluster');
  });
});

/*
 * Test Metadata: TP-ECS-CLUSTER-006
 * {
 *   "id": "TP-ECS-CLUSTER-006",
 *   "level": "integration",
 *   "capability": "Platform structured logging compliance verification",
 *   "oracle": "trace",
 *   "invariants": ["Structured log events", "Lifecycle logging", "Error logging"],
 *   "fixtures": ["TestFixtureFactory", "Log capture"],
 *   "inputs": { "shape": "Component synthesis with log event monitoring", "notes": "Log output structure validation" },
 *   "risks": ["Log output format changes"],
 *   "dependencies": ["Component logging system"],
 *   "evidence": ["Log event structure", "Log timing and content"],
 *   "complianceRefs": ["std://structured-logging"],
 *   "aiGenerated": true,
 *   "humanReviewedBy": "platform-team"
 * }
 */
describe('EcsClusterComponent__LoggingCompliance__StructuredEvents', () => {
  let testEnv: ReturnType<typeof TestFixtureFactory.createTestEnvironment>;
  let consoleLogSpy: jest.SpyInstance;

  beforeEach(() => {
    testEnv = TestFixtureFactory.createTestEnvironment();
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    TestFixtureFactory.cleanup();
  });

  it('Logging__SynthesisLifecycle__EmitsStructuredEvents', async () => {
    const component = new EcsClusterComponent(
      testEnv.stack,
      'TestCluster',
      testEnv.contexts.commercial,
      testEnv.specs.minimalCluster
    );

    component.synth();

    // Verify structured logging calls were made
    expect(consoleLogSpy).toHaveBeenCalled();

    // Check for synthesis lifecycle events
    const logCalls = consoleLogSpy.mock.calls.flat();
    const hasStartEvent = logCalls.some(call => 
      typeof call === 'string' && call.includes('synthesis_start')
    );
    const hasCompleteEvent = logCalls.some(call => 
      typeof call === 'string' && call.includes('synthesis_complete')
    );

    expect(hasStartEvent).toBe(true);
    expect(hasCompleteEvent).toBe(true);
  });

  it('Logging__ResourceCreation__EmitsResourceEvents', async () => {
    const component = new EcsClusterComponent(
      testEnv.stack,
      'TestCluster',
      testEnv.contexts.commercial,
      testEnv.specs.ec2Cluster
    );

    component.synth();

    const logCalls = consoleLogSpy.mock.calls.flat();
    
    // Check for resource creation events
    const hasClusterEvent = logCalls.some(call => 
      typeof call === 'string' && call.includes('ecs-cluster')
    );
    const hasNamespaceEvent = logCalls.some(call => 
      typeof call === 'string' && call.includes('service-connect-namespace')
    );
    const hasCapacityEvent = logCalls.some(call => 
      typeof call === 'string' && call.includes('ec2-capacity')
    );

    expect(hasClusterEvent).toBe(true);
    expect(hasNamespaceEvent).toBe(true);
    expect(hasCapacityEvent).toBe(true);
  });
});
