import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import { Template } from 'aws-cdk-lib/assertions';
import { ComponentContext, ComponentSpec } from '@platform/contracts';
import { EcsFargateServiceComponent } from '../ecs-fargate-service.component.ts';

describe('EcsFargateServiceComponent synthesis', () => {
  let app: cdk.App;
  let stack: cdk.Stack;
  let vpc: ec2.Vpc;
  let cluster: ecs.Cluster;
  let context: ComponentContext;

  beforeEach(() => {
    app = new cdk.App();
    stack = new cdk.Stack(app, 'TestStack', {
      env: { account: '123456789012', region: 'us-east-1' }
    });
    vpc = new ec2.Vpc(stack, 'TestVpc', { maxAzs: 2 });
    cluster = new ecs.Cluster(stack, 'TestCluster', { vpc });
    cluster.addDefaultCloudMapNamespace({ name: 'internal.local' });

    context = {
      serviceName: 'orders',
      environment: 'dev',
      complianceFramework: 'commercial',
      accountId: '123456789012',
      region: 'us-east-1',
      scope: stack,
      vpc
    } as ComponentContext;
  });

  it('creates service, task definition, log group, and alarms using defaults', () => {
    const spec: ComponentSpec = {
      name: 'orders-api',
      type: 'ecs-fargate-service',
      config: {
        cluster: cluster.clusterName,
        image: {
          repository: 'nginx',
          tag: 'latest'
        },
        cpu: 512,
        memory: 1024,
        port: 8080,
        serviceConnect: {
          portMappingName: 'api',
          namespace: 'internal.local'
        },
        autoScaling: {
          minCapacity: 2,
          maxCapacity: 4,
          targetCpuUtilization: 65
        },
        diagnostics: {
          enableExecuteCommand: true
        }
      }
    };

    const component = new EcsFargateServiceComponent(stack, 'OrdersFargateService', context, spec);
    component.synth();

    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::ECS::Service', {
      ServiceName: 'orders-orders-api',
      LaunchType: 'FARGATE',
      EnableExecuteCommand: true
    });

    template.hasResourceProperties('AWS::Logs::LogGroup', {
      RetentionInDays: 30
    });

    const alarmMap = template.findResources('AWS::CloudWatch::Alarm');
    const alarms = Object.values(alarmMap) as Array<{ Properties: any }>;
    expect(alarms).toHaveLength(3);

    const alarmNames = alarms.map(alarm => alarm.Properties?.AlarmName);
    expect(alarmNames).toEqual(expect.arrayContaining([
      expect.stringContaining('cpu-high'),
      expect.stringContaining('memory-high'),
      expect.stringContaining('tasks-low')
    ]));
  });
});
