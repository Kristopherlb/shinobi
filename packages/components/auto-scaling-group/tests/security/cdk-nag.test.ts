import { App, Stack, Aspects } from 'aws-cdk-lib';
import { Match, Annotations } from 'aws-cdk-lib/assertions';
import { AwsSolutionsChecks } from 'cdk-nag';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as logs from 'aws-cdk-lib/aws-logs';
import { AutoScalingGroupComponent } from '../../src/auto-scaling-group.component.js';
import type { ComponentContext, ComponentSpec } from '@shinobi/core';

const createContext = (stack: Stack, vpc: ec2.IVpc): ComponentContext => ({
  serviceName: 'test-service',
  owner: 'platform-team',
  environment: 'dev',
  complianceFramework: 'commercial',
  region: 'us-east-1',
  account: '123456789012',
  scope: stack,
  vpc,
  tags: {
    'service-name': 'test-service',
    owner: 'platform-team',
    environment: 'dev',
    'compliance-framework': 'commercial'
  }
}) as ComponentContext;

const createSpec = (overrides: Record<string, unknown> = {}): ComponentSpec => ({
  name: 'asg-test',
  type: 'auto-scaling-group',
  config: overrides
}) as ComponentSpec;

describe('AwsSolutionsChecks', () => {
  it('synthesizes without AwsSolutions findings', () => {
    const app = new App();
    const stack = new Stack(app, 'AutoScalingGroupNagStack', {
      env: { account: '123456789012', region: 'us-east-1' }
    });

    const vpc = new ec2.Vpc(stack, 'TestVpc', { maxAzs: 2 });
    const flowLogGroup = new logs.LogGroup(stack, 'TestVpcFlowLogs');
    vpc.addFlowLog('TestVpcFlowLog', {
      destination: ec2.FlowLogDestination.toCloudWatchLogs(flowLogGroup)
    });

    const component = new AutoScalingGroupComponent(
      stack,
      'TestAutoScalingGroup',
      createContext(stack, vpc),
      createSpec()
    );

    Aspects.of(stack).add(new AwsSolutionsChecks({ verbose: true }));
    component.synth();
    app.synth();

    const errors = Annotations.fromStack(stack).findError('*', Match.stringLikeRegexp('AwsSolutions-'));
    expect(errors).toHaveLength(0);
  });
});
