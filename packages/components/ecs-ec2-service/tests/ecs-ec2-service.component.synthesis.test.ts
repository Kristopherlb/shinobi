import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import { Template } from 'aws-cdk-lib/assertions';
import { ComponentContext, ComponentSpec } from '@platform/contracts';
import { EcsEc2ServiceComponent } from '../ecs-ec2-service.component.ts';

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

  it('creates service, task definition, and log group', () => {
    const template = synthesize();

    template.hasResourceProperties('AWS::ECS::Service', {
      LaunchType: 'EC2'
    });

    template.hasResourceProperties('AWS::Logs::LogGroup', {
      RetentionInDays: 30
    });
  });

  it('respects logging retention and diagnostics overrides', () => {
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
