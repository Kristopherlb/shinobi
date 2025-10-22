import { App, Stack, Aspects } from 'aws-cdk-lib';
import { Annotations, Match } from 'aws-cdk-lib/assertions';
import { AwsSolutionsChecks } from 'cdk-nag';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as logs from 'aws-cdk-lib/aws-logs';
import { EcsClusterComponent } from '../../src/ecs-cluster.component.ts';
import { EcsClusterComponentConfigBuilder } from '../../src/ecs-cluster.builder.ts';
import { ComponentContext, ComponentSpec } from '@shinobi/core/component-interfaces';

const createContext = (stack: Stack, vpc: ec2.IVpc): ComponentContext => ({
  serviceName: 'test-service',
  environment: 'dev',
  complianceFramework: 'commercial',
  region: 'us-east-1',
  accountId: '123456789012',
  scope: stack,
  vpc,
  tags: {
    'service-name': 'test-service',
    environment: 'dev'
  }
});

describe('AwsSolutionsChecks__EcsCluster', () => {
  let platformConfigSpy: jest.SpyInstance;

  beforeEach(() => {
    platformConfigSpy = jest
      .spyOn(EcsClusterComponentConfigBuilder.prototype, '_loadPlatformConfiguration')
      .mockImplementation(() => ({
        monitoring: { enabled: true, detailedMetrics: false }
      }));
  });

  afterEach(() => {
    platformConfigSpy.mockRestore();
  });

  /*
   * Test Metadata: TP-ecs-cluster-security-001
   * {
   *   "id": "TP-ecs-cluster-security-001",
   *   "level": "integration",
   *   "capability": "ECS cluster synthesizes without AwsSolutions findings",
   *   "oracle": "contract",
   *   "invariants": ["No AwsSolutions- prefixed findings"],
   *   "fixtures": ["cdk.App", "cdk.Stack", "AwsSolutionsChecks"],
   *   "inputs": { "shape": "Commercial defaults with required VPC", "notes": "Validates secure-by-default posture" },
   *   "risks": ["Security regression undetected"],
   *   "dependencies": ["cdk-nag"],
   *   "evidence": ["Annotations.fromStack"],
   *   "compliance_refs": ["std://platform-testing-standard", "std://platform-security-standard"],
   *   "ai_generated": false,
   *   "human_reviewed_by": ""
   * }
   */
  it('AwsSolutionsChecks__CommercialDefaults__NoFindings', () => {
    const app = new App();
    const stack = new Stack(app, 'EcsClusterNagStack', {
      env: { account: '123456789012', region: 'us-east-1' }
    });

    const vpc = new ec2.Vpc(stack, 'TestVpc', {
      ipAddresses: ec2.IpAddresses.cidr('10.2.0.0/16'),
      maxAzs: 2
    });
    const flowLogGroup = new logs.LogGroup(stack, 'VpcFlowLogs');
    vpc.addFlowLog('VpcFlowLogs', {
      destination: ec2.FlowLogDestination.toCloudWatchLogs(flowLogGroup),
      trafficType: ec2.FlowLogTrafficType.ALL
    });

    const context = createContext(stack, vpc);

    const spec: ComponentSpec = {
      name: 'test-ecs-cluster',
      type: 'ecs-cluster',
      config: {
        serviceConnect: {
          namespace: 'internal'
        }
      }
    };

    const component = new EcsClusterComponent(stack, spec.name, context, spec);

    Aspects.of(stack).add(new AwsSolutionsChecks({ verbose: true }));
    component.synth();

    const findings = Annotations.fromStack(stack).findError('*', Match.stringLikeRegexp('AwsSolutions-'));
    expect(findings).toEqual([]);
  });
});
