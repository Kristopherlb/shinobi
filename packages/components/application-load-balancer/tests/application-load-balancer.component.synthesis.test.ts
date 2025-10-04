import { Template, Match } from 'aws-cdk-lib/assertions';
import { App, Stack } from 'aws-cdk-lib';
import { ApplicationLoadBalancerComponent } from '../src/application-load-balancer.component.ts';
import { ApplicationLoadBalancerConfig } from '../src/application-load-balancer.builder.ts';
import { ComponentContext, ComponentSpec } from '@shinobi/core';

const VPC_ID = 'vpc-0123456789abcdef0';

const createContext = (framework: string = 'commercial'): ComponentContext => ({
  serviceName: 'checkout-service',
  owner: 'payments',
  environment: 'dev',
  complianceFramework: framework,
  region: 'us-east-1',
  account: '123456789012',
  tags: {
    'service-name': 'checkout-service',
    environment: 'dev',
    'compliance-framework': framework
  }
});

const createSpec = (config: Partial<ApplicationLoadBalancerConfig> = {}): ComponentSpec => ({
  name: 'checkout-alb',
  type: 'application-load-balancer',
  config
});

const synthesizeComponent = (context: ComponentContext, spec: ComponentSpec) => {
  const app = new App();
  const stack = new Stack(app, 'TestStack', {
    env: {
      account: context.account,
      region: context.region
    }
  });

  const component = new ApplicationLoadBalancerComponent(stack, spec.name, context, spec);
  component.synth();

  return {
    component,
    template: Template.fromStack(stack)
  };
};

describe('ApplicationLoadBalancerComponent synthesis', () => {
  const originalContextJson = process.env.CDK_CONTEXT_JSON;

  beforeAll(() => {
    process.env.CDK_CONTEXT_JSON = JSON.stringify({
      [`vpcProvider:account=123456789012:filter.vpcId=${VPC_ID}:region=us-east-1`]: {
        vpcId: VPC_ID,
        availabilityZones: ['us-east-1a', 'us-east-1b'],
        publicSubnetIds: ['subnet-public-a', 'subnet-public-b'],
        privateSubnetIds: ['subnet-private-a', 'subnet-private-b'],
        isolatedSubnetIds: [],
        publicSubnetRouteTableIds: ['rtb-public-a', 'rtb-public-b'],
        privateSubnetRouteTableIds: ['rtb-private-a', 'rtb-private-b'],
        isolatedSubnetRouteTableIds: [],
        ownerAccountId: '123456789012'
      }
    });
  });

  afterAll(() => {
    if (originalContextJson === undefined) {
      delete process.env.CDK_CONTEXT_JSON;
    } else {
      process.env.CDK_CONTEXT_JSON = originalContextJson;
    }
  });

  it('synthesizes a commercial load balancer with defaults', () => {
    const context = createContext('commercial');
    const spec = createSpec({
      vpc: {
        vpcId: VPC_ID
      }
    });

    const { component, template } = synthesizeComponent(context, spec);

    template.hasResourceProperties('AWS::ElasticLoadBalancingV2::LoadBalancer', {
      Scheme: 'internet-facing',
      Type: 'application'
    });

    template.resourceCountIs('AWS::EC2::SecurityGroup', 1);

    expect(component.getType()).toBe('application-load-balancer');
    expect(component.getCapabilities()['net:load-balancer']).toBeDefined();
  });

  it('enables monitoring and deletion protection for fedramp-high', () => {
    const context = createContext('fedramp-high');
    const spec = createSpec({
      vpc: {
        vpcId: VPC_ID
      },
      listeners: [
        {
          port: 443,
          protocol: 'HTTPS',
          certificateArn: 'arn:aws:acm:us-east-1:123456789012:certificate/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
        }
      ]
    });

    const { template, component } = synthesizeComponent(context, spec);

    template.hasResourceProperties('AWS::ElasticLoadBalancingV2::LoadBalancer', {
      LoadBalancerAttributes: Match.arrayWith([
        Match.objectLike({ Key: 'deletion_protection.enabled', Value: 'true' })
      ])
    });

    const observabilityCapability = component.getCapabilities()['observability:application-load-balancer'];
    expect(observabilityCapability).toBeDefined();
    expect(observabilityCapability.monitoring?.enabled).toBe(true);
    expect(observabilityCapability.telemetry?.metrics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ metricName: 'HTTPCode_ELB_5XX_Count' })
      ])
    );
    expect(observabilityCapability.telemetry?.logging).toEqual(
      expect.objectContaining({
        enabled: true,
        destination: 's3'
      })
    );
  });
});
