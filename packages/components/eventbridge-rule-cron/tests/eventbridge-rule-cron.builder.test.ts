import { Construct } from 'constructs';
import {
  EventBridgeRuleCronComponentConfigBuilder,
  EventBridgeRuleCronConfig
} from '../eventbridge-rule-cron.builder';
import { ComponentContext, ComponentSpec } from '@shinobi/core';

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
    schedule: 'rate(5 minutes)',
    ...config
  }
});

describe('EventBridgeRuleCronComponentConfigBuilder', () => {
  it('applies commercial defaults', () => {
    const builder = new EventBridgeRuleCronComponentConfigBuilder(baseContext('commercial'), spec());
    const config = builder.buildSync();

    expect(config.state).toBe('enabled');
    expect(config.deadLetterQueue.enabled).toBe(false);
    expect(config.monitoring.enabled).toBe(false);
    expect(config.monitoring.cloudWatchLogs.enabled).toBe(false);
  });

  it('enables monitoring and DLQ for fedramp-high defaults', () => {
    const builder = new EventBridgeRuleCronComponentConfigBuilder(baseContext('fedramp-high'), spec());
    const config = builder.buildSync();

    expect(config.deadLetterQueue.enabled).toBe(true);
    expect(config.deadLetterQueue.maxRetryAttempts).toBeGreaterThan(0);
    expect(config.monitoring.enabled).toBe(true);
    expect(config.monitoring.cloudWatchLogs.enabled).toBe(true);
  });

  it('honours manifest overrides', () => {
    const builder = new EventBridgeRuleCronComponentConfigBuilder(baseContext('commercial'), spec({
      ruleName: 'custom-rule',
      description: 'Custom cron rule',
      state: 'disabled',
      eventBus: { name: 'custom-bus' },
      deadLetterQueue: {
        enabled: true,
        maxRetryAttempts: 10,
        retentionDays: 7
      },
      monitoring: {
        enabled: true,
        alarms: {
          failedInvocations: {
            enabled: true,
            threshold: 5,
            evaluationPeriods: 2,
            periodMinutes: 10,
            comparisonOperator: 'gte',
            treatMissingData: 'ignore',
            statistic: 'Sum'
          },
          invocationRate: {
            enabled: true,
            threshold: 200,
            evaluationPeriods: 1,
            periodMinutes: 1,
            comparisonOperator: 'gt',
            treatMissingData: 'breaching',
            statistic: 'Average'
          }
        },
        cloudWatchLogs: {
          enabled: true,
          logGroupName: '/aws/events/custom',
          retentionDays: 60,
          removalPolicy: 'retain'
        }
      }
    }));

    const config = builder.buildSync();

    expect(config.ruleName).toBe('custom-rule');
    expect(config.state).toBe('disabled');
    expect(config.eventBus?.name).toBe('custom-bus');
    expect(config.deadLetterQueue.enabled).toBe(true);
    expect(config.monitoring.alarms.failedInvocations.threshold).toBe(5);
    expect(config.monitoring.cloudWatchLogs.retentionDays).toBe(60);
  });

  it('throws when transformer input missing template', () => {
    const builder = new EventBridgeRuleCronComponentConfigBuilder(baseContext(), spec({
      input: {
        type: 'transformer',
        transformer: {}
      }
    }));

    expect(() => builder.buildSync()).toThrow();
  });
});
