import { App, Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import type { ComponentContext, ComponentSpec } from '@shinobi/core';
import { ContainerApplicationComponent } from '../src/container-application.component.js';

const createContext = (stack: Stack, overrides: Partial<ComponentContext> = {}): ComponentContext => ({
  scope: stack,
  serviceName: 'demo-service',
  environment: 'dev',
  complianceFramework: 'commercial',
  region: 'us-east-1',
  accountId: '123456789012',
  ...overrides
}) as ComponentContext;

const createSpec = (config: Record<string, any> = {}): ComponentSpec => ({
  name: 'web',
  type: 'container-application',
  config
}) as ComponentSpec;

describe('ContainerApplicationComponent', () => {
  it('synthesises ECS service, ALB, and ECR repository with standard tags', () => {
    const app = new App();
    const stack = new Stack(app, 'ContainerApplicationStack');
    const component = new ContainerApplicationComponent(stack, 'ContainerApplication', createContext(stack), createSpec());

    component.synth();

    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::ECS::Service', {
      DesiredCount: 2,
      LaunchType: 'FARGATE'
    });

    template.hasResourceProperties('AWS::ApplicationAutoScaling::ScalableTarget', {
      MaxCapacity: 4
    });

    template.hasResourceProperties('AWS::ElasticLoadBalancingV2::LoadBalancer', {
      Scheme: 'internet-facing'
    });

    template.hasResourceProperties('AWS::ECR::Repository', {
      ImageScanningConfiguration: {
        ScanOnPush: true
      }
    });

    const capabilities = component.getCapabilities();
    expect(capabilities['service:connect']).toBeDefined();
    expect(capabilities['service:connect'].port).toBe(80);
    expect(capabilities['net:vpc']).toBeDefined();
    expect(capabilities['otel:environment']).toBeDefined();
  });

  it('reuses existing VPC and repository when specified in config', () => {
    const app = new App();
    const stack = new Stack(app, 'ExistingResourcesStack');

    const existingVpc = new ec2.Vpc(stack, 'ExistingVpc', {
      maxAzs: 2,
      natGateways: 0
    });

    const context = createContext(stack, { vpc: existingVpc });
    const spec = createSpec({
      application: {
        name: 'orders',
        port: 8080
      },
      service: {
        desiredCount: 3,
        autoScaling: {
          enabled: true,
          maxCapacity: 6,
          cpuTarget: 70,
          memoryTarget: 75
        }
      },
      ecr: {
        createRepository: false,
        repositoryArn: 'arn:aws:ecr:us-east-1:123456789012:repository/orders'
      },
      network: {
        vpcId: 'vpc-0123456789abcdef0',
        assignPublicIp: true,
        loadBalancerScheme: 'internal'
      }
    });

    const component = new ContainerApplicationComponent(stack, 'OrdersApplication', context, spec);
    component.synth();

    const template = Template.fromStack(stack);
    template.resourceCountIs('AWS::ECR::Repository', 0);
    template.hasResourceProperties('AWS::ElasticLoadBalancingV2::LoadBalancer', {
      Scheme: 'internal'
    });
    template.hasResourceProperties('AWS::ApplicationAutoScaling::ScalableTarget', {
      MaxCapacity: 6
    });
  });
});
