import { App, Stack } from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { Construct } from 'constructs';
import { ComponentContext, ComponentSpec } from '@shinobi/core';
import { EventBridgeRuleCronComponent } from '../eventbridge-rule-cron.component';
import { EventBridgeRuleCronConfig } from '../eventbridge-rule-cron.builder';

type Framework = 'commercial' | 'fedramp-moderate' | 'fedramp-high';

const baseContext = (framework: Framework = 'commercial'): ComponentContext => ({
  serviceName: 'test-service',
  environment: 'dev',
  complianceFramework: framework,
  scope: {} as Construct,
  region: 'us-east-1',
  accountId: '123456789012'
} as ComponentContext);

const spec = (config: Partial<EventBridgeRuleCronConfig> = {}): ComponentSpec => ({
  name: 'test-cron',
  type: 'eventbridge-rule-cron',
  config: {
    schedule: 'rate(10 minutes)',
    ...config
  }
});

const synthesize = (framework: Framework, config?: Partial<EventBridgeRuleCronConfig>) => {
  const app = new App();
  const stack = new Stack(app, `TestStack-${framework}`);
  const context = baseContext(framework);
  const component = new EventBridgeRuleCronComponent(stack, `Cron-${framework}`, context, spec(config));
  component.synth();
  return {
    component,
    template: Template.fromStack(stack)
  };
};

describe('EventBridgeRuleCronComponent synthesis', () => {
  it('creates a commercial cron rule without monitoring or DLQ by default', () => {
    const { template, component } = synthesize('commercial');

    template.hasResourceProperties('AWS::Events::Rule', Match.objectLike({
      ScheduleExpression: 'rate(10 minutes)',
      State: 'ENABLED'
    }));

    template.resourceCountIs('AWS::Logs::LogGroup', 0);
    template.resourceCountIs('AWS::CloudWatch::Alarm', 0);

    expect(component.getCapabilityData()['eventbridge:rule-cron'].deadLetterQueue.enabled).toBe(false);
  });

  it('enables monitoring and logging for fedramp-high defaults', () => {
    const { template, component } = synthesize('fedramp-high');

    template.resourceCountIs('AWS::CloudWatch::Alarm', 2);
    template.hasResourceProperties('AWS::Logs::LogGroup', Match.objectLike({
      RetentionInDays: 365
    }));

    const capability = component.getCapabilityData()['eventbridge:rule-cron'];
    expect(capability.monitoring.enabled).toBe(true);
  });

  it('respects manifest overrides for event bus and alarms', () => {
    const { template } = synthesize('commercial', {
      eventBus: { name: 'custom-bus' },
      monitoring: {
        enabled: true,
        alarms: {
          failedInvocations: {
            enabled: true,
            threshold: 5,
            evaluationPeriods: 2,
            periodMinutes: 15,
            comparisonOperator: 'gte',
            treatMissingData: 'not-breaching',
            statistic: 'Sum'
          },
          invocationRate: {
            enabled: true,
            threshold: 200,
            evaluationPeriods: 1,
            periodMinutes: 5,
            comparisonOperator: 'gt',
            treatMissingData: 'breaching',
            statistic: 'Average'
          }
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
