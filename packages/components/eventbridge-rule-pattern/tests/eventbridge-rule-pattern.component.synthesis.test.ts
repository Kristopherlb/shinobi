import { App, Stack } from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { Construct } from 'constructs';
import { ComponentContext, ComponentSpec } from '@shinobi/core';
import { EventBridgeRulePatternComponent } from '../eventbridge-rule-pattern.component.js';
import { EventBridgeRulePatternConfig } from '../eventbridge-rule-pattern.builder.js';

type Framework = 'commercial' | 'fedramp-moderate' | 'fedramp-high';

const baseContext = (framework: Framework = 'commercial'): ComponentContext => ({
  serviceName: 'test-service',
  environment: 'dev',
  complianceFramework: framework,
  scope: {} as Construct,
  region: 'us-east-1',
  accountId: '123456789012'
} as ComponentContext);

const spec = (config: Partial<EventBridgeRulePatternConfig> = {}): ComponentSpec => ({
  name: 'test-rule',
  type: 'eventbridge-rule-pattern',
  config: {
    eventPattern: { source: ['aws.ec2'] },
    ...config
  }
});

const synthesize = (framework: Framework, config?: Partial<EventBridgeRulePatternConfig>) => {
  const app = new App();
  const stack = new Stack(app, `TestStack-${framework}`);
  const context = baseContext(framework);
  const component = new EventBridgeRulePatternComponent(stack, `Rule-${framework}`, context, spec(config));
  component.synth();
  return {
    component,
    template: Template.fromStack(stack)
  };
};

describe('EventBridgeRulePatternComponent synthesis', () => {
  it('creates a commercial rule without DLQ or logging by default', () => {
    const { template, component } = synthesize('commercial');

    template.hasResourceProperties('AWS::Events::Rule', Match.objectLike({
      State: 'ENABLED'
    }));

    template.resourceCountIs('AWS::SQS::Queue', 0);
    template.resourceCountIs('AWS::Logs::LogGroup', 0);

    expect(component.getCapabilityData()['eventbridge:rule-pattern'].state).toBe('enabled');
  });

  it('enables DLQ and logging for fedramp-high defaults', () => {
    const { template, component } = synthesize('fedramp-high');

    template.resourceCountIs('AWS::SQS::Queue', 1);
    template.hasResourceProperties('AWS::Logs::LogGroup', Match.objectLike({
      RetentionInDays: 365
    }));

    const capability = component.getCapabilityData()['eventbridge:rule-pattern'];
    expect(capability.deadLetterQueue).toBeDefined();
  });

  it('honours manifest overrides for monitoring alarms', () => {
    const { template } = synthesize('commercial', {
      monitoring: {
        enabled: true,
        failedInvocations: {
          enabled: true,
          threshold: 10,
          evaluationPeriods: 4,
          periodMinutes: 10,
          comparisonOperator: 'gte',
          treatMissingData: 'ignore',
          statistic: 'Sum'
        },
        invocations: {
          enabled: true,
          threshold: 1,
          evaluationPeriods: 2,
          periodMinutes: 5,
          comparisonOperator: 'lte',
          treatMissingData: 'breaching',
          statistic: 'Sum'
        },
        matchedEvents: {
          enabled: false,
          threshold: 0,
          evaluationPeriods: 1,
          periodMinutes: 5,
          comparisonOperator: 'lte',
          treatMissingData: 'breaching',
          statistic: 'Sum'
        },
        deadLetterQueueMessages: {
          enabled: false,
          threshold: 1,
          evaluationPeriods: 1,
          periodMinutes: 5,
          comparisonOperator: 'gte',
          treatMissingData: 'not-breaching',
          statistic: 'Sum'
        },
        cloudWatchLogs: {
          enabled: true,
          retentionDays: 60,
          removalPolicy: 'retain'
        }
      }
    });

    template.resourceCountIs('AWS::CloudWatch::Alarm', 2);
    template.hasResourceProperties('AWS::Logs::LogGroup', Match.objectLike({
      RetentionInDays: 60
    }));
  });
});
