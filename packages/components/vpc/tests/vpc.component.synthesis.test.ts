import * as cdk from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { VpcComponent } from '../vpc.component.js';
import { VpcConfig } from '../vpc.builder.js';
import { ComponentContext, ComponentSpec } from '@platform/contracts';

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

  it('applies required security group tags to all tier security groups (SG-009)', () => {
    const template = synthesize('commercial');

    // VPC component creates three tier-based security groups: Web, App, Database
    template.resourceCountIs('AWS::EC2::SecurityGroup', 3);

    // Verify all security groups have required tags
    // Required tags: resource-type, ingress-policy
    // Extract tags from all security groups and verify required tags
    const sgResources = template.findResources('AWS::EC2::SecurityGroup');
    const sgs = Object.values(sgResources) as Array<{ Properties?: { Tags?: Array<{ Key: string; Value: string }> } }>;
    
    // Verify each security group has required tags
    for (const sg of sgs) {
      const tags = sg.Properties?.Tags || [];
      const tagMap = tags.reduce((acc: Record<string, string>, tag: { Key: string; Value: string }) => {
        acc[tag.Key] = tag.Value;
        return acc;
      }, {});
      
      expect(tagMap['resource-type']).toBe('security-group');
      expect(tagMap['ingress-policy']).toBeDefined();
      expect(['binder-managed', 'manual', 'tier-based']).toContain(tagMap['ingress-policy']);
    }

    // At least one SG should have a tier tag
    const hasTierTag = sgs.some(sg => {
      const tags = sg.Properties?.Tags || [];
      return tags.some(tag => ['web', 'app', 'db', 'database'].includes(tag.Value.toLowerCase()));
    });
    expect(hasTierTag).toBe(true);
  });
});
