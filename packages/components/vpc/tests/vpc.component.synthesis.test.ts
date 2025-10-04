import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { VpcComponent } from '../vpc.component.ts';
import { VpcConfig } from '../vpc.builder.ts';
import { ComponentContext, ComponentSpec } from '../../@shinobi/core/component-interfaces.ts';

const createContext = (framework: 'commercial' | 'fedramp-moderate' | 'fedramp-high'): ComponentContext => ({
  serviceName: 'orders',
  environment: 'dev',
  complianceFramework: framework,
  accountId: '123456789012',
  region: 'us-east-1',
  scope: {} as any,
  serviceLabels: {
    owner: 'platform-team',
    version: '1.0.0'
  }
});

const createSpec = (config: Partial<VpcConfig> = {}): ComponentSpec => ({
  name: 'network',
  type: 'vpc',
  config
});

const synthesize = (framework: 'commercial' | 'fedramp-moderate' | 'fedramp-high', config: Partial<VpcConfig> = {}) => {
  const app = new cdk.App();
  const stack = new cdk.Stack(app, 'TestStack');
  const context = { ...createContext(framework), scope: stack };
  const component = new VpcComponent(stack, 'Network', context, createSpec(config));
  component.synth();
  return Template.fromStack(stack);
};

describe('VpcComponent synthesis', () => {
  it('creates a baseline commercial VPC with configured flow logs and endpoints', () => {
    const template = synthesize('commercial');

    template.hasResourceProperties('AWS::EC2::VPC', {
      CidrBlock: '10.0.0.0/16'
    });

    template.hasResourceProperties('AWS::EC2::FlowLog', {
      TrafficType: 'ALL'
    });

    template.resourceCountIs('AWS::EC2::VPCEndpoint', 2);
    template.resourceCountIs('AWS::EC2::NatGateway', 1);
  });

  it('enables compliance NACLs and extended retention for FedRAMP Moderate', () => {
    const template = synthesize('fedramp-moderate');

    template.hasResourceProperties('AWS::Logs::LogGroup', {
      RetentionInDays: 1827
    });

    template.resourceCountIs('AWS::EC2::NatGateway', 2);
    template.resourceCountIs('AWS::EC2::NetworkAcl', 1);
    template.resourceCountIs('AWS::EC2::VPCEndpoint', 4);
  });

  it('enables high-compliance endpoints and controls for FedRAMP High', () => {
    const template = synthesize('fedramp-high');

    template.hasResourceProperties('AWS::Logs::LogGroup', {
      RetentionInDays: 3653
    });

    template.resourceCountIs('AWS::EC2::VPCEndpoint', 5);
  });

  it('honours manifest overrides for endpoints and flow logs', () => {
    const template = synthesize('commercial', {
      flowLogs: {
        enabled: false,
        retentionInDays: 30,
        removalPolicy: 'destroy'
      },
      vpcEndpoints: {
        s3: false,
        dynamodb: false,
        secretsManager: false,
        kms: false,
        lambda: false
      }
    } as Partial<VpcConfig>);

    template.resourceCountIs('AWS::EC2::FlowLog', 0);
    template.resourceCountIs('AWS::EC2::VPCEndpoint', 0);
  });
});
