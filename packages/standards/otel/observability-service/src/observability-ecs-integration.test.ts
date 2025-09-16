/**
 * ObservabilityService ECS Integration Test Suite
 * 
 * Comprehensive tests following Platform Testing Standard v1.0
 * Tests the Service Injector Pattern integration between ObservabilityService and ECS components
 */

import * as cdk from 'aws-cdk-lib';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { ObservabilityService } from './observability.service';
import { EcsClusterComponent } from '../components/ecs-cluster/ecs-cluster.component';
import { EcsFargateServiceComponent } from '../components/ecs-fargate-service/ecs-fargate-service.component';
import { EcsEc2ServiceComponent } from '../components/ecs-ec2-service/ecs-ec2-service.component';
import { ComponentContext } from '../platform/contracts/component-interfaces';
import { PlatformServiceContext } from '../platform/contracts/platform-services';
import { 
  TestFixtureFactory,
  PerformanceTestHelpers,
  TEST_CONTEXTS,
  TEST_SPECS 
} from '../components/ecs-cluster/test-fixtures';

/*
 * Test Metadata: TP-OBSERVABILITY-ECS-001
 * {
 *   "id": "TP-OBSERVABILITY-ECS-001",
 *   "level": "integration",
 *   "capability": "ObservabilityService ECS component support and service recognition",
 *   "oracle": "exact",
 *   "invariants": ["Component type recognition", "Service application success", "No unsupported type errors"],
 *   "fixtures": ["TestFixtureFactory", "ECS components", "ObservabilityService"],
 *   "inputs": { "shape": "ObservabilityService with ECS component instances", "notes": "Tests component type detection and handling" },
 *   "risks": [],
 *   "dependencies": ["ObservabilityService", "ECS components"],
 *   "evidence": ["Service application results", "Component type handling"],
 *   "complianceRefs": ["std://service-injector", "std://observability"],
 *   "aiGenerated": true,
 *   "humanReviewedBy": "platform-team"
 * }
 */
describe('ObservabilityService__EcsComponentSupport__ServiceInjectorPattern', () => {
  let testEnv: ReturnType<typeof TestFixtureFactory.createTestEnvironment>;
  let observabilityService: ObservabilityService;
  let serviceContext: PlatformServiceContext;

  beforeEach(() => {
    testEnv = TestFixtureFactory.createTestEnvironment();
    
    serviceContext = {
      serviceName: 'test-service',
      environment: 'test',
      complianceFramework: 'commercial',
      region: 'us-east-1',
      serviceRegistry: {} as any // Mock registry for testing
    };

    observabilityService = new ObservabilityService(serviceContext);
  });

  afterEach(() => {
    TestFixtureFactory.cleanup();
  });

  it('ServiceRecognition__EcsClusterComponent__RecognizedAsSupported', async () => {
    const clusterComponent = new EcsClusterComponent(
      testEnv.stack,
      'TestCluster',
      testEnv.contexts.commercial,
      testEnv.specs.minimalCluster
    );
    clusterComponent.synth();

    // Capture console output to verify no "unsupported type" messages
    const consoleDebugSpy = jest.spyOn(console, 'debug').mockImplementation();

    // Apply observability service
    observabilityService.apply(clusterComponent);

    // Verify the component type was recognized (no debug message about unsupported type)
    const debugCalls = consoleDebugSpy.mock.calls.filter(call => 
      call.some(arg => typeof arg === 'string' && arg.includes('No OpenTelemetry instrumentation'))
    );
    expect(debugCalls).toHaveLength(0);

    consoleDebugSpy.mockRestore();
  });

  it('ServiceRecognition__EcsFargateService__RecognizedAsSupported', async () => {
    // Create cluster first
    const clusterComponent = new EcsClusterComponent(
      testEnv.stack,
      'TestCluster',
      testEnv.contexts.commercial,
      testEnv.specs.minimalCluster
    );
    clusterComponent.synth();

    const fargateComponent = new EcsFargateServiceComponent(
      testEnv.stack,
      'TestFargateService',
      testEnv.contexts.commercial,
      testEnv.specs.fargateService
    );
    fargateComponent.synth();

    const consoleDebugSpy = jest.spyOn(console, 'debug').mockImplementation();

    observabilityService.apply(fargateComponent);

    // Verify no unsupported type messages
    const debugCalls = consoleDebugSpy.mock.calls.filter(call => 
      call.some(arg => typeof arg === 'string' && arg.includes('No OpenTelemetry instrumentation'))
    );
    expect(debugCalls).toHaveLength(0);

    consoleDebugSpy.mockRestore();
  });

  it('ServiceRecognition__EcsEc2Service__RecognizedAsSupported', async () => {
    // Create cluster with EC2 capacity
    const clusterComponent = new EcsClusterComponent(
      testEnv.stack,
      'TestEc2Cluster',
      testEnv.contexts.commercial,
      testEnv.specs.ec2Cluster
    );
    clusterComponent.synth();

    const ec2Component = new EcsEc2ServiceComponent(
      testEnv.stack,
      'TestEc2Service',
      testEnv.contexts.commercial,
      testEnv.specs.ec2Service
    );
    ec2Component.synth();

    const consoleDebugSpy = jest.spyOn(console, 'debug').mockImplementation();

    observabilityService.apply(ec2Component);

    // Verify no unsupported type messages
    const debugCalls = consoleDebugSpy.mock.calls.filter(call => 
      call.some(arg => typeof arg === 'string' && arg.includes('No OpenTelemetry instrumentation'))
    );
    expect(debugCalls).toHaveLength(0);

    consoleDebugSpy.mockRestore();
  });
});

/*
 * Test Metadata: TP-OBSERVABILITY-ECS-002
 * {
 *   "id": "TP-OBSERVABILITY-ECS-002",
 *   "level": "integration",
 *   "capability": "ECS Cluster observability with CloudWatch alarms creation",
 *   "oracle": "contract",
 *   "invariants": ["Alarm resource creation", "Compliance-aware thresholds", "Metric configuration"],
 *   "fixtures": ["TestFixtureFactory", "ECS Cluster", "ObservabilityService"],
 *   "inputs": { "shape": "ECS Cluster with observability service application", "notes": "CloudFormation alarm validation" },
 *   "risks": ["CDK CloudWatch constructs"],
 *   "dependencies": ["aws-cdk-lib/assertions", "CloudWatch alarms"],
 *   "evidence": ["CloudFormation alarm resources", "Alarm threshold validation"],
 *   "complianceRefs": ["std://observability", "std://cloudwatch-alarms"],
 *   "aiGenerated": true,
 *   "humanReviewedBy": "platform-team"
 * }
 */
describe('ObservabilityService__EcsClusterMonitoring__CloudWatchAlarms', () => {
  let testEnv: ReturnType<typeof TestFixtureFactory.createTestEnvironment>;
  let observabilityService: ObservabilityService;

  beforeEach(() => {
    testEnv = TestFixtureFactory.createTestEnvironment();
    
    const serviceContext: PlatformServiceContext = {
      serviceName: 'test-service',
      environment: 'test',
      complianceFramework: 'commercial',
      region: 'us-east-1',
      serviceRegistry: {} as any
    };

    observabilityService = new ObservabilityService(serviceContext);
  });

  afterEach(() => {
    TestFixtureFactory.cleanup();
  });

  it('ClusterMonitoring__BasicCluster__CreatesServiceCountAlarm', async () => {
    const clusterComponent = new EcsClusterComponent(
      testEnv.stack,
      'TestCluster',
      testEnv.contexts.commercial,
      testEnv.specs.minimalCluster
    );
    clusterComponent.synth();

    observabilityService.apply(clusterComponent);
    
    const template = Template.fromStack(testEnv.stack);

    // Verify ECS Service Count alarm is created
    template.hasResourceProperties('AWS::CloudWatch::Alarm', {
      AlarmName: Match.stringLikeRegexp('.*service-count.*'),
      AlarmDescription: Match.stringLikeRegexp('.*too many or too few services.*'),
      MetricName: 'ServiceCount',
      Namespace: 'AWS/ECS',
      Statistic: 'Average',
      Threshold: 100, // Commercial framework threshold
      ComparisonOperator: 'GreaterThanThreshold'
    });
  });

  it('ClusterMonitoring__ComplianceFrameworks__AppliesCorrectThresholds', async () => {
    const frameworks: Array<keyof typeof TEST_CONTEXTS> = ['commercial', 'fedrampModerate', 'fedrampHigh'];
    
    for (const framework of frameworks) {
      const frameworkStack = new cdk.Stack(testEnv.app, `ObsTestStack-${framework}`);
      const context = { ...testEnv.contexts[framework], scope: frameworkStack };
      
      const serviceContext: PlatformServiceContext = {
        serviceName: 'test-service',
        environment: 'test',
        complianceFramework: context.complianceFramework,
        region: 'us-east-1'
      };

      const frameworkObservabilityService = new ObservabilityService(serviceContext);

      const clusterComponent = new EcsClusterComponent(
        frameworkStack,
        'TestCluster',
        context,
        testEnv.specs.ec2Cluster
      );
      clusterComponent.synth();

      frameworkObservabilityService.apply(clusterComponent);
      
      const template = Template.fromStack(frameworkStack);

      // Check service count threshold based on compliance framework
      const expectedThreshold = framework === 'fedrampHigh' ? 50 : 100;
      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        AlarmName: Match.stringLikeRegexp('.*service-count.*'),
        Threshold: expectedThreshold
      });

      // FedRAMP frameworks should also have CPU reservation alarm
      if (framework === 'fedrampModerate' || framework === 'fedrampHigh') {
        template.hasResourceProperties('AWS::CloudWatch::Alarm', {
          AlarmName: Match.stringLikeRegexp('.*cpu-reservation.*'),
          MetricName: 'CPUReservation',
          Threshold: framework === 'fedrampHigh' ? 70 : 80
        });
      }
    }
  });
});

/*
 * Test Metadata: TP-OBSERVABILITY-ECS-003
 * {
 *   "id": "TP-OBSERVABILITY-ECS-003",
 *   "level": "integration",
 *   "capability": "ECS Service observability with OpenTelemetry instrumentation and monitoring",
 *   "oracle": "contract",
 *   "invariants": ["OTel configuration", "Service-level alarms", "Task and memory monitoring"],
 *   "fixtures": ["TestFixtureFactory", "ECS Services", "ObservabilityService"],
 *   "inputs": { "shape": "ECS Fargate and EC2 services with observability", "notes": "Both service types with monitoring" },
 *   "risks": ["Service type differences"],
 *   "dependencies": ["ECS components", "CloudWatch alarms"],
 *   "evidence": ["OTel environment variables", "Service monitoring alarms"],
 *   "complianceRefs": ["std://observability", "std://opentelemetry"],
 *   "aiGenerated": true,
 *   "humanReviewedBy": "platform-team"
 * }
 */
describe('ObservabilityService__EcsServiceMonitoring__OpenTelemetryAndAlarms', () => {
  let testEnv: ReturnType<typeof TestFixtureFactory.createTestEnvironment>;
  let observabilityService: ObservabilityService;
  let clusterComponent: EcsClusterComponent;

  beforeEach(() => {
    testEnv = TestFixtureFactory.createTestEnvironment();
    
    const serviceContext: PlatformServiceContext = {
      serviceName: 'test-service',
      environment: 'test',
      complianceFramework: 'commercial',
      region: 'us-east-1',
      serviceRegistry: {} as any
    };

    observabilityService = new ObservabilityService(serviceContext);

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

  it('ServiceMonitoring__FargateService__CreatesComprehensiveAlarms', async () => {
    const fargateComponent = new EcsFargateServiceComponent(
      testEnv.stack,
      'TestFargateService',
      testEnv.contexts.commercial,
      testEnv.specs.fargateService
    );
    fargateComponent.synth();

    const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

    observabilityService.apply(fargateComponent);

    const template = Template.fromStack(testEnv.stack);

    // Verify service-level alarms are created
    template.hasResourceProperties('AWS::CloudWatch::Alarm', {
      AlarmName: Match.stringLikeRegexp('.*running-tasks.*'),
      MetricName: 'RunningTaskCount',
      Namespace: 'AWS/ECS',
      Threshold: 0, // Commercial framework threshold
      ComparisonOperator: 'LessThanOrEqualToThreshold'
    });

    template.hasResourceProperties('AWS::CloudWatch::Alarm', {
      AlarmName: Match.stringLikeRegexp('.*cpu-utilization.*'),
      MetricName: 'CPUUtilization',
      Threshold: 80 // Commercial framework threshold
    });

    template.hasResourceProperties('AWS::CloudWatch::Alarm', {
      AlarmName: Match.stringLikeRegexp('.*memory-utilization.*'),
      MetricName: 'MemoryUtilization',
      Threshold: 85 // Commercial framework threshold
    });

    // Verify OTel instrumentation logging
    const logCalls = consoleLogSpy.mock.calls.filter(call => 
      call.some(arg => typeof arg === 'string' && arg.includes('ECS Service OpenTelemetry instrumentation'))
    );
    expect(logCalls.length).toBeGreaterThan(0);

    consoleLogSpy.mockRestore();
  });

  it('ServiceMonitoring__Ec2Service__CreatesComprehensiveAlarms', async () => {
    // Create cluster with EC2 capacity
    const ec2ClusterComponent = new EcsClusterComponent(
      testEnv.stack,
      'TestEc2Cluster',
      testEnv.contexts.commercial,
      testEnv.specs.ec2Cluster
    );
    ec2ClusterComponent.synth();

    const ec2Component = new EcsEc2ServiceComponent(
      testEnv.stack,
      'TestEc2Service',
      testEnv.contexts.commercial,
      testEnv.specs.ec2Service
    );
    ec2Component.synth();

    const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

    observabilityService.apply(ec2Component);

    const template = Template.fromStack(testEnv.stack);

    // Verify EC2 service also gets the same monitoring alarms
    template.hasResourceProperties('AWS::CloudWatch::Alarm', {
      AlarmName: Match.stringLikeRegexp('.*running-tasks.*'),
      MetricName: 'RunningTaskCount'
    });

    template.hasResourceProperties('AWS::CloudWatch::Alarm', {
      AlarmName: Match.stringLikeRegexp('.*cpu-utilization.*'),
      MetricName: 'CPUUtilization'
    });

    template.hasResourceProperties('AWS::CloudWatch::Alarm', {
      AlarmName: Match.stringLikeRegexp('.*memory-utilization.*'),
      MetricName: 'MemoryUtilization'
    });

    // Verify OTel instrumentation is also applied to EC2 services
    const logCalls = consoleLogSpy.mock.calls.filter(call => 
      call.some(arg => typeof arg === 'string' && arg.includes('ECS Service OpenTelemetry instrumentation'))
    );
    expect(logCalls.length).toBeGreaterThan(0);

    consoleLogSpy.mockRestore();
  });

  it('ServiceMonitoring__ComplianceFrameworks__AppliesStricterThresholds', async () => {
    const fedrampHighContext: PlatformServiceContext = {
      serviceName: 'secure-service',
      environment: 'production',
      complianceFramework: 'fedramp-high',
      region: 'us-gov-east-1',
      serviceRegistry: {} as any
    };

    const fedrampObservabilityService = new ObservabilityService(fedrampHighContext);

    const fedrampStack = new cdk.Stack(testEnv.app, 'FedrampTestStack');
    const fedrampServiceContext = { ...testEnv.contexts.fedrampHigh, scope: fedrampStack };

    const fedrampCluster = new EcsClusterComponent(
      fedrampStack,
      'SecureCluster',
      fedrampServiceContext,
      testEnv.specs.minimalCluster
    );
    fedrampCluster.synth();

    const fargateComponent = new EcsFargateServiceComponent(
      fedrampStack,
      'SecureFargateService',
      fedrampServiceContext,
      testEnv.specs.fargateService
    );
    fargateComponent.synth();

    fedrampObservabilityService.apply(fargateComponent);

    const template = Template.fromStack(fedrampStack);

    // Verify FedRAMP High uses stricter thresholds
    template.hasResourceProperties('AWS::CloudWatch::Alarm', {
      AlarmName: Match.stringLikeRegexp('.*running-tasks.*'),
      Threshold: 1 // FedRAMP High requires minimum 1 task always running
    });

    template.hasResourceProperties('AWS::CloudWatch::Alarm', {
      AlarmName: Match.stringLikeRegexp('.*cpu-utilization.*'),
      Threshold: 70 // Stricter CPU threshold for FedRAMP High
    });

    template.hasResourceProperties('AWS::CloudWatch::Alarm', {
      AlarmName: Match.stringLikeRegexp('.*memory-utilization.*'),
      Threshold: 75 // Stricter memory threshold for FedRAMP High
    });
  });
});

/*
 * Test Metadata: TP-OBSERVABILITY-ECS-004
 * {
 *   "id": "TP-OBSERVABILITY-ECS-004",
 *   "level": "integration",
 *   "capability": "Performance and efficiency of ObservabilityService with ECS components",
 *   "oracle": "exact",
 *   "invariants": ["Service application performance", "Resource creation limits", "Memory usage"],
 *   "fixtures": ["TestFixtureFactory", "PerformanceTestHelpers"],
 *   "inputs": { "shape": "Multiple ECS components with observability service", "notes": "Performance under load" },
 *   "risks": ["CDK resource creation performance"],
 *   "dependencies": ["Performance measurement utilities"],
 *   "evidence": ["Execution time measurements", "Resource count validation"],
 *   "complianceRefs": ["std://performance"],
 *   "aiGenerated": true,
 *   "humanReviewedBy": "platform-team"
 * }
 */
describe('ObservabilityService__Performance__EcsIntegration', () => {
  let testEnv: ReturnType<typeof TestFixtureFactory.createTestEnvironment>;
  let observabilityService: ObservabilityService;

  beforeEach(() => {
    testEnv = TestFixtureFactory.createTestEnvironment();
    
    const serviceContext: PlatformServiceContext = {
      serviceName: 'performance-test-service',
      environment: 'test',
      complianceFramework: 'commercial',
      region: 'us-east-1'
    };

    observabilityService = new ObservabilityService(serviceContext);
  });

  afterEach(() => {
    TestFixtureFactory.cleanup();
  });

  it('Performance__ServiceApplication__CompletesWithinTimeLimit', async () => {
    // Create cluster
    const clusterComponent = new EcsClusterComponent(
      testEnv.stack,
      'PerfTestCluster',
      testEnv.contexts.commercial,
      testEnv.specs.minimalCluster
    );
    clusterComponent.synth();

    // Create multiple services
    const fargateService = new EcsFargateServiceComponent(
      testEnv.stack,
      'PerfTestFargateService',
      testEnv.contexts.commercial,
      testEnv.specs.fargateService
    );
    fargateService.synth();

    const ec2Service = new EcsEc2ServiceComponent(
      testEnv.stack,
      'PerfTestEc2Service',
      testEnv.contexts.commercial,
      testEnv.specs.ec2Service
    );
    ec2Service.synth();

    // Measure observability service application performance
    const { executionTime } = await PerformanceTestHelpers.measureSynthesisTime(() => {
      observabilityService.apply(clusterComponent);
      observabilityService.apply(fargateService);
      observabilityService.apply(ec2Service);
    }, 2000); // Max 2 seconds for all three applications

    // Performance requirement: service application should be fast
    expect(executionTime).toBeLessThan(1500); // 1.5 seconds
  });

  it('Performance__AlarmCreation__DoesNotCreateExcessiveResources', async () => {
    const clusterComponent = new EcsClusterComponent(
      testEnv.stack,
      'ResourceTestCluster',
      testEnv.contexts.commercial,
      testEnv.specs.minimalCluster
    );
    clusterComponent.synth();

    const fargateService = new EcsFargateServiceComponent(
      testEnv.stack,
      'ResourceTestFargateService',
      testEnv.contexts.commercial,
      testEnv.specs.fargateService
    );
    fargateService.synth();

    // Apply observability
    observabilityService.apply(clusterComponent);
    observabilityService.apply(fargateService);

    const template = Template.fromStack(testEnv.stack);
    const resourceCounts = PerformanceTestHelpers.countResources(template);

    // Verify reasonable number of alarms are created (not excessive)
    expect(resourceCounts['AWS::CloudWatch::Alarm']).toBeLessThanOrEqual(10); // Reasonable limit
    expect(resourceCounts['AWS::CloudWatch::Alarm']).toBeGreaterThan(0); // At least some alarms created

    // Verify cluster gets 1 alarm (service count)
    // Verify Fargate service gets 3 alarms (running tasks, CPU, memory)
    expect(resourceCounts['AWS::CloudWatch::Alarm']).toBe(4); // Exactly what we expect
  });

  it('Performance__LoggingOutput__StructuredAndMeasurable', async () => {
    const clusterComponent = new EcsClusterComponent(
      testEnv.stack,
      'LogTestCluster',
      testEnv.contexts.commercial,
      testEnv.specs.minimalCluster
    );
    clusterComponent.synth();

    const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

    observabilityService.apply(clusterComponent);

    // Verify structured logging output
    const logCalls = consoleLogSpy.mock.calls.filter(call => 
      call.some(arg => typeof arg === 'string' && arg.includes('Applied OpenTelemetry observability'))
    );

    expect(logCalls.length).toBe(1); // One log per component application

    // Verify log contains performance information
    const performanceLogCall = logCalls[0];
    const logMessage = performanceLogCall.find(arg => typeof arg === 'string' && arg.includes('Applied OpenTelemetry'));
    expect(logMessage).toMatch(/\d+ms/); // Should include execution time

    consoleLogSpy.mockRestore();
  });
});
