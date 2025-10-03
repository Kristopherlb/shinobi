import { App, Stack } from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { Construct } from 'constructs';
import { ComponentContext, ComponentSpec } from '@shinobi/core';
import { SnsTopicComponent } from '../sns-topic.component.ts';
import { SnsTopicConfig } from '../sns-topic.builder.ts';

type Framework = 'commercial' | 'fedramp-moderate' | 'fedramp-high';

const baseContext = (framework: Framework = 'commercial'): ComponentContext => ({
  serviceName: 'test-service',
  environment: 'dev',
  complianceFramework: framework,
  scope: {} as Construct,
  region: 'us-east-1',
  accountId: '123456789012'
} as ComponentContext);

const spec = (config: Partial<SnsTopicConfig> = {}): ComponentSpec => ({
  name: 'test-topic',
  type: 'sns-topic',
  config
});

const synthesize = (framework: Framework, config?: Partial<SnsTopicConfig>) => {
  const app = new App();
  const stack = new Stack(app, `TestStack-${framework}`);
  const context = baseContext(framework);
  const component = new SnsTopicComponent(stack, `Topic-${framework}`, context, spec(config));
  component.synth();
  return {
    component,
    template: Template.fromStack(stack)
  };
};

describe('SnsTopicComponent synthesis', () => {
  it('creates a commercial topic without encryption or alarms by default', () => {
    const { template, component } = synthesize('commercial');

    template.hasResourceProperties('AWS::SNS::Topic', Match.objectLike({
      FifoTopic: false,
      TracingConfig: 'PassThrough'
    }));

    template.resourceCountIs('AWS::KMS::Key', 0);
    template.resourceCountIs('AWS::CloudWatch::Alarm', 0);

    expect(component.getCapabilityData()['topic:sns'].encrypted).toBe(false);
  });

  it('enables customer managed key and alarms for fedramp-high defaults', () => {
    const { template, component } = synthesize('fedramp-high');

    template.resourceCountIs('AWS::KMS::Key', 1);
    template.resourceCountIs('AWS::CloudWatch::Alarm', 2);

    template.hasResourceProperties('AWS::SNS::Topic', Match.objectLike({
      TracingConfig: 'Active'
    }));

    const capability = component.getCapabilityData()['topic:sns'];
    expect(capability.encrypted).toBe(true);
    expect(capability.masterKeyArn).toBeDefined();
  });

  it('respects manifest overrides for FIFO and imported KMS key', () => {
    const { template, component } = synthesize('commercial', {
      fifo: {
        enabled: true,
        contentBasedDeduplication: true
      },
      topicName: 'custom.fifo',
      encryption: {
        enabled: true,
        kmsKeyArn: 'arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-1234567890ab',
        customerManagedKey: {
          create: false,
          enableRotation: true
        }
      },
      monitoring: {
        enabled: true,
        alarms: {
          failedNotifications: {
            enabled: true,
            threshold: 5,
            evaluationPeriods: 2,
            periodMinutes: 5,
            comparisonOperator: 'gte',
            treatMissingData: 'not-breaching',
            statistic: 'Sum'
          },
          messageRate: {
            enabled: false,
            threshold: 10000,
            evaluationPeriods: 1,
            periodMinutes: 5,
            comparisonOperator: 'gte',
            treatMissingData: 'not-breaching',
            statistic: 'Sum'
          }
        }
      }
    });

    template.hasResourceProperties('AWS::SNS::Topic', Match.objectLike({
      TopicName: 'custom.fifo',
      FifoTopic: true,
      ContentBasedDeduplication: true
    }));

    const capability = component.getCapabilityData()['topic:sns'];
    expect(capability.fifo).toBe(true);
    expect(capability.encrypted).toBe(true);
    expect(capability.masterKeyArn).toContain('arn:aws:kms');
    template.resourceCountIs('AWS::CloudWatch::Alarm', 1);
  });
});
