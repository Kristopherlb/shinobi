import { Construct } from 'constructs';
import {
  EventBridgeRulePatternComponentConfigBuilder,
  EventBridgeRulePatternConfig
} from '../eventbridge-rule-pattern.builder';
import { ComponentContext, ComponentSpec } from '@shinobi/core';

type Framework = 'commercial' | 'fedramp-moderate' | 'fedramp-high';

const createContext = (framework: Framework = 'commercial'): ComponentContext => ({
  serviceName: 'test-service',
  environment: 'dev',
  complianceFramework: framework,
  scope: {} as Construct,
  region: 'us-east-1',
  accountId: '123456789012'
} as ComponentContext);

const createSpec = (config: Partial<EventBridgeRulePatternConfig> = {}): ComponentSpec => ({
  name: 'test-rule',
  type: 'eventbridge-rule-pattern',
  config: {
    eventPattern: { source: ['aws.ec2'] },
    ...config
  }
});

describe('EventBridgeRulePatternComponentConfigBuilder', () => {
  it('applies commercial defaults with monitoring disabled', () => {
    const builder = new EventBridgeRulePatternComponentConfigBuilder(createContext('commercial'), createSpec());
    const config = builder.buildSync();

    expect(config.state).toBe('enabled');
    expect(config.monitoring.enabled).toBe(false);
    expect(config.deadLetterQueue.enabled).toBe(false);
    expect(config.monitoring.cloudWatchLogs.enabled).toBe(false);
    expect(config.ruleName).toMatch(/^test-service-test-rule/);
  });

  it('enables logging and DLQ defaults for fedramp-moderate', () => {
    const builder = new EventBridgeRulePatternComponentConfigBuilder(createContext('fedramp-moderate'), createSpec());
    const config = builder.buildSync();

    expect(config.monitoring.enabled).toBe(true);
    expect(config.monitoring.cloudWatchLogs.enabled).toBe(true);
    expect(config.monitoring.cloudWatchLogs.retentionDays).toBe(90);
    expect(config.deadLetterQueue.enabled).toBe(true);
    expect(config.deadLetterQueue.maxRetryAttempts).toBe(3);
  });

  it('honours manifest overrides over platform defaults', () => {
    const builder = new EventBridgeRulePatternComponentConfigBuilder(createContext('commercial'), createSpec({
      state: 'disabled',
      deadLetterQueue: {
        enabled: true,
        maxRetryAttempts: 1,
        retentionDays: 7
      },
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
        cloudWatchLogs: {
          enabled: true,
          retentionDays: 60,
          removalPolicy: 'retain'
        }
      }
    }));

    const config = builder.buildSync();

    expect(config.state).toBe('disabled');
    expect(config.deadLetterQueue.enabled).toBe(true);
    expect(config.deadLetterQueue.retentionDays).toBe(7);
    expect(config.monitoring.failedInvocations.threshold).toBe(10);
    expect(config.monitoring.cloudWatchLogs.retentionDays).toBe(60);
    expect(config.monitoring.cloudWatchLogs.removalPolicy).toBe('retain');
  });

  it('requires an event pattern', () => {
    const builder = new EventBridgeRulePatternComponentConfigBuilder(createContext(), {
      name: 'missing-pattern',
      type: 'eventbridge-rule-pattern',
      config: {}
    });

    expect(() => builder.buildSync()).toThrow(/eventPattern/);
  });
});
