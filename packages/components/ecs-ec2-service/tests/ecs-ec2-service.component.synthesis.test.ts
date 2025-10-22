import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import { Template } from 'aws-cdk-lib/assertions';
import { ComponentContext, ComponentSpec } from '@platform/contracts';
import { EcsEc2ServiceComponent } from '../src/ecs-ec2-service.component';

const createContext = (): ComponentContext => ({
  serviceName: 'orders',
  environment: 'dev',
  complianceFramework: 'commercial',
  accountId: '123456789012',
  region: 'us-east-1',
  scope: {} as any
} as ComponentContext);

const createSpec = (config: Partial<ReturnType<typeof createBaseConfig>>): ComponentSpec => ({
  name: 'orders-ec2',
  type: 'ecs-ec2-service',
  config
});

const createBaseConfig = () => ({
  cluster: 'TestCluster',
  image: { repository: 'nginx', tag: 'latest' },
  taskCpu: 256,
  taskMemory: 512,
  port: 8080,
  serviceConnect: { portMappingName: 'api', namespace: 'internal.local' }
});

describe('EcsEc2ServiceComponent synthesis', () => {
  const synthesize = (configOverrides: Partial<ReturnType<typeof createBaseConfig>> = {}) => {
    const app = new cdk.App();
    const stack = new cdk.Stack(app, 'TestStack');

    const vpc = new ec2.Vpc(stack, 'TestVpc');
    const cluster = new ecs.Cluster(stack, 'TestCluster', { vpc });
    cluster.addDefaultCloudMapNamespace({ name: 'internal.local' });

    const context = { ...createContext(), scope: stack, vpc } as ComponentContext;
    const spec = createSpec({ ...createBaseConfig(), ...configOverrides });

    const component = new EcsEc2ServiceComponent(stack, 'OrdersEc2', context, spec);
    component.synth();

    return Template.fromStack(stack);
  };

  /*
   * Test Metadata: TP-ecs-ec2-component-001
   * {
   *   "id": "TP-ecs-ec2-component-001",
   *   "level": "integration",
   *   "capability": "Component synthesizes core ECS resources",
   *   "oracle": "contract",
   *   "invariants": ["Service launch type EC2", "Log retention applied"],
   *   "fixtures": ["cdk.App", "cdk.Stack", "EcsEc2ServiceComponent"],
   *   "inputs": { "shape": "Default config with Service Connect namespace", "notes": "Commercial baseline" },
   *   "risks": ["Missing service resources", "Logging misconfiguration"],
   *   "dependencies": ["aws-cdk-lib"],
   *   "evidence": ["Template.fromStack"],
   *   "compliance_refs": ["std://platform-testing-standard", "std://platform-logging-standard"],
   *   "ai_generated": false,
   *   "human_reviewed_by": ""
   * }
   */
  it('ComponentSynthesis__DefaultConfig__CreatesCoreResources', () => {
    const template = synthesize();

    template.hasResourceProperties('AWS::ECS::Service', {
      LaunchType: 'EC2'
    });

    template.hasResourceProperties('AWS::Logs::LogGroup', {
      RetentionInDays: 30
    });
  });

  /*
   * Test Metadata: TP-ecs-ec2-component-002
   * {
   *   "id": "TP-ecs-ec2-component-002",
   *   "level": "integration",
   *   "capability": "Component honours logging and diagnostics overrides",
   *   "oracle": "contract",
   *   "invariants": ["Custom retention applied", "ExecuteCommand flag enabled"],
   *   "fixtures": ["cdk.App", "cdk.Stack", "EcsEc2ServiceComponent"],
   *   "inputs": { "shape": "Overrides for logging and diagnostics", "notes": "Retention 365 / exec on" },
   *   "risks": ["Overrides ignored", "Compliance drift"],
   *   "dependencies": ["aws-cdk-lib"],
   *   "evidence": ["Template.fromStack"],
   *   "compliance_refs": ["std://platform-testing-standard", "std://platform-logging-standard"],
   *   "ai_generated": false,
   *   "human_reviewed_by": ""
   * }
   */
  it('ComponentSynthesis__OverrideLoggingAndDiagnostics__AppliesCustomSettings', () => {
    const template = synthesize({
      logging: {
        createLogGroup: true,
        retentionInDays: 365,
        removalPolicy: 'retain'
      },
      diagnostics: {
        enableExecuteCommand: true
      }
    });

    template.hasResourceProperties('AWS::Logs::LogGroup', {
      RetentionInDays: 365
    });

    template.hasResourceProperties('AWS::ECS::Service', {
      EnableExecuteCommand: true
    });
  });
});
