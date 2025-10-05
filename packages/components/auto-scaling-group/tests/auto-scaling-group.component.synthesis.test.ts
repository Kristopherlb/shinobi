import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { App, Stack } from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { AutoScalingGroupComponent } from '../src/auto-scaling-group.component.ts';
import { AutoScalingGroupConfig } from '../src/auto-scaling-group.builder.ts';
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

  /*
   * Test Metadata: TP-auto-scaling-group-component-001
   * {
   *   "id": "TP-auto-scaling-group-component-001",
   *   "level": "integration",
   *   "capability": "Commercial synthesis emits baseline ASG and launch template configuration",
   *   "oracle": "exact",
   *   "invariants": ["Desired capacity equals 2", "Launch template uses t3.micro"],
   *   "fixtures": ["CDK App", "Test stack", "VPC fixture"],
   *   "inputs": { "shape": "Commercial context without overrides", "notes": "Uses default manifest" },
   *   "risks": ["Incorrect baseline capacity", "Missing observability capability"],
   *   "dependencies": ["aws-cdk-lib/assertions"],
   *   "evidence": ["AWS::AutoScaling::AutoScalingGroup", "observability capability telemetry"],
   *   "compliance_refs": ["std://platform-testing-standard"],
   *   "ai_generated": false,
   *   "human_reviewed_by": ""
   * }
   */
  it('CommercialSynthesis__DefaultConfig__ProducesBaselineAsg', () => {
    const { template, component } = synthesize();

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

    const observabilityCapability = component.getCapabilities()['observability:auto-scaling-group'];
    expect(observabilityCapability).toBeDefined();
    expect(observabilityCapability.telemetry?.metrics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ metricName: 'GroupDesiredCapacity' }),
        expect.objectContaining({ metricName: 'CPUUtilization' })
      ])
    );
    expect(observabilityCapability.telemetry?.logging).toEqual(
      expect.objectContaining({ destination: 'otel-collector' })
    );
  });

  /*
   * Test Metadata: TP-auto-scaling-group-component-002
   * {
   *   "id": "TP-auto-scaling-group-component-002",
   *   "level": "integration",
   *   "capability": "FedRAMP High synthesis enables hardened launch template and key rotation",
   *   "oracle": "exact",
   *   "invariants": ["IMDSv2 required", "Detailed monitoring enabled"],
   *   "fixtures": ["CDK App", "Test stack", "VPC fixture"],
   *   "inputs": { "shape": "FedRAMP High context without overrides", "notes": "Prod environment" },
   *   "risks": ["Missing FedRAMP key rotation", "Relaxed security group egress"],
   *   "dependencies": ["aws-cdk-lib/assertions"],
   *   "evidence": ["AWS::EC2::LaunchTemplate", "AWS::KMS::Key"],
   *   "compliance_refs": ["std://platform-testing-standard"],
   *   "ai_generated": false,
   *   "human_reviewed_by": ""
   * }
   */
  it('FedrampHighSynthesis__PlatformBaseline__EnablesHardenedControls', () => {
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
