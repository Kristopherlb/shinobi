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

  it('creates service, task definition, log group, alarms, and X-Ray sidecar', () => {
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

    // Verify service properties
    template.hasResourceProperties('AWS::ECS::Service', {
      ServiceName: 'orders-orders-api',
      LaunchType: 'FARGATE',
      EnableExecuteCommand: true
    });

    // Verify log group with retention
    template.hasResourceProperties('AWS::Logs::LogGroup', {
      RetentionInDays: 30
    });

    // Verify CloudWatch alarms
    const alarmMap = template.findResources('AWS::CloudWatch::Alarm');
    const alarms = Object.values(alarmMap) as Array<{ Properties: any }>;
    expect(alarms).toHaveLength(3);

    const alarmNames = alarms.map(alarm => alarm.Properties?.AlarmName);
    expect(alarmNames).toEqual(expect.arrayContaining([
      expect.stringContaining('cpu-high'),
      expect.stringContaining('memory-high'),
      expect.stringContaining('tasks-low')
    ]));

    // Verify X-Ray daemon sidecar is added
    template.hasResourceProperties('AWS::ECS::TaskDefinition', {
      ContainerDefinitions: expect.arrayContaining([
        expect.objectContaining({
          Name: 'xray-daemon',
          Image: expect.stringContaining('xray')
        })
      ])
    });

    // Verify OTEL environment variables are injected
    template.hasResourceProperties('AWS::ECS::TaskDefinition', {
      ContainerDefinitions: expect.arrayContaining([
        expect.objectContaining({
          Name: 'Container',
          Environment: expect.arrayContaining([
            expect.objectContaining({
              Name: 'OTEL_SERVICE_NAME',
              Value: 'orders'
            }),
            expect.objectContaining({
              Name: 'AWS_XRAY_DAEMON_ADDRESS',
              Value: 'localhost:2000'
            })
          ])
        })
      ])
    });

    // Verify ephemeral storage is configured
    template.hasResourceProperties('AWS::ECS::TaskDefinition', {
      EphemeralStorage: {
        SizeInGiB: 30 // Commercial default
      }
    });
  });

  it('creates KMS encryption for FedRAMP environments', () => {
    const fedrampContext: ComponentContext = {
      ...context,
      complianceFramework: 'fedramp-moderate'
    } as ComponentContext;

    const spec: ComponentSpec = {
      name: 'fedramp-api',
      type: 'ecs-fargate-service',
      config: {
        cluster: cluster.clusterName,
        image: {
          repository: 'fedramp-api',
          tag: 'v1.0.0'
        },
        serviceConnect: {
          portMappingName: 'api',
          namespace: 'internal.local'
        }
      }
    };

    const component = new EcsFargateServiceComponent(stack, 'FedRampService', fedrampContext, spec);
    component.synth();

    const template = Template.fromStack(stack);

    // Verify KMS key is created
    template.resourceCountIs('AWS::KMS::Key', 1);
    template.hasResourceProperties('AWS::KMS::Key', {
      EnableKeyRotation: true
    });

    // Verify log group uses KMS encryption
    template.hasResourceProperties('AWS::Logs::LogGroup', {
      KmsKeyId: expect.any(Object)
    });

    // Verify higher resource allocations
    template.hasResourceProperties('AWS::ECS::TaskDefinition', {
      Cpu: '512',
      Memory: '1024',
      EphemeralStorage: {
        SizeInGiB: 50 // FedRAMP default
      }
    });

    // Verify high availability
    template.hasResourceProperties('AWS::ECS::Service', {
      DesiredCount: 2
    });
  });

  it('does not add default security group ingress rules', () => {
    const spec: ComponentSpec = {
      name: 'secure-api',
      type: 'ecs-fargate-service',
      config: {
        cluster: cluster.clusterName,
        image: {
          repository: 'secure-api',
          tag: 'latest'
        },
        serviceConnect: {
          portMappingName: 'api',
          namespace: 'internal.local'
        }
      }
    };

    const component = new EcsFargateServiceComponent(stack, 'SecureService', context, spec);
    component.synth();

    const template = Template.fromStack(stack);

    // Verify security group exists
    template.resourceCountIs('AWS::EC2::SecurityGroup', 1);

    // Verify no ingress rules are added by default
    // (ingress rules should be added by binder strategies only)
    const sgResources = template.findResources('AWS::EC2::SecurityGroup');
    const sg = Object.values(sgResources)[0] as any;

    // SecurityGroupIngress should either not exist or be empty
    expect(sg.Properties.SecurityGroupIngress || []).toHaveLength(0);
  });
});
