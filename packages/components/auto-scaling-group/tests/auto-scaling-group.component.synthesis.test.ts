import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { App, Stack } from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { AutoScalingGroupComponent } from '../src/auto-scaling-group.component.js';
import { AutoScalingGroupConfig } from '../src/auto-scaling-group.builder.js';
import { ComponentContext, ComponentSpec } from '@shinobi/core';

const createSpec = (config: Partial<AutoScalingGroupConfig> = {}): ComponentSpec => ({
  name: 'asg-test',
  type: 'auto-scaling-group',
  config
});

describe('AutoScalingGroupComponent synthesis', () => {
  const originalEnv = process.env.CDK_CONTEXT_JSON;

  beforeAll(() => {
    process.env.CDK_CONTEXT_JSON = JSON.stringify({});
  });

  afterAll(() => {
    if (originalEnv === undefined) {
      delete process.env.CDK_CONTEXT_JSON;
    } else {
      process.env.CDK_CONTEXT_JSON = originalEnv;
    }
  });

  const synthesize = (
    framework: 'commercial' | 'fedramp-moderate' | 'fedramp-high' = 'commercial',
    overrides: Partial<AutoScalingGroupConfig> = {}
  ) => {
    const app = new App();
    const stack = new Stack(app, 'TestStack');
    const vpc = new ec2.Vpc(stack, 'TestVpc', { maxAzs: 2 });

    const context: ComponentContext = {
      serviceName: 'test-service',
      owner: 'platform-team',
      environment: framework === 'fedramp-high' ? 'prod' : 'dev',
      complianceFramework: framework,
      region: 'us-east-1',
      account: '123456789012',
      scope: stack,
      vpc,
      tags: {
        'service-name': 'test-service',
        environment: framework === 'fedramp-high' ? 'prod' : 'dev',
        'compliance-framework': framework
      }
    };

    const component = new AutoScalingGroupComponent(stack, 'AutoScalingGroupComponent', context, createSpec(overrides));
    component.synth();

    return {
      template: Template.fromStack(stack),
      component
    };
  };

  it('synthesizes with commercial defaults', () => {
    const { template } = synthesize();

    template.hasResourceProperties('AWS::AutoScaling::AutoScalingGroup', {
      MinSize: '1',
      MaxSize: '3',
      DesiredCapacity: '2'
    });

    template.hasResourceProperties('AWS::EC2::LaunchTemplate', {
      LaunchTemplateData: Match.objectLike({
        InstanceType: 't3.micro'
      })
    });
  });

  it('enables hardened settings for fedramp-high', () => {
    const { template } = synthesize('fedramp-high');

    template.hasResourceProperties('AWS::EC2::LaunchTemplate', {
      LaunchTemplateData: Match.objectLike({
        InstanceType: 'm5.large',
        MetadataOptions: Match.objectLike({ HttpTokens: 'required' }),
        Monitoring: { Enabled: true }
      })
    });

    template.hasResourceProperties('AWS::EC2::SecurityGroup', {
      SecurityGroupEgress: Match.arrayWith([])
    });

    template.hasResourceProperties('AWS::KMS::Key', {
      EnableKeyRotation: true
    });
  });
});
