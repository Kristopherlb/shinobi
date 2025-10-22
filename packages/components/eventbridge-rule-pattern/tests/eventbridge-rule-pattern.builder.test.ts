import { Construct } from 'constructs';
import {
  EventBridgeRulePatternComponentConfigBuilder,
  EventBridgeRulePatternConfig
} from '../src/eventbridge-rule-pattern.builder';
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
    deadLetterQueue: { enabled: true },
    monitoring: { enabled: true, cloudWatchLogs: { enabled: true } },
    ...config
  }
});

describe('EventBridgeRulePatternComponentConfigBuilder', () => {
  it('applies commercial defaults with mandatory monitoring and DLQ', () => {
    const builder = new EventBridgeRulePatternComponentConfigBuilder(createContext('commercial'), createSpec());
    const config = builder.buildSync();

    expect(config.state).toBe('enabled');
    // Monitoring and DLQ are now mandatory
    expect(config.monitoring.enabled).toBe(true);
    expect(config.deadLetterQueue.enabled).toBe(true);
    expect(config.monitoring.cloudWatchLogs.enabled).toBe(true);
    // Commercial defaults: 1 year retention, retain policy
    expect(config.monitoring.cloudWatchLogs.retentionDays).toBe(365);
    expect(config.monitoring.cloudWatchLogs.removalPolicy).toBe('retain');
    expect(config.ruleName).toMatch(/^test-service-test-rule/);
  });

  it('applies fedramp-moderate defaults with 3-year retention', () => {
    const builder = new EventBridgeRulePatternComponentConfigBuilder(createContext('fedramp-moderate'), createSpec());
    const config = builder.buildSync();

    expect(config.monitoring.enabled).toBe(true);
    expect(config.monitoring.cloudWatchLogs.enabled).toBe(true);
    // FedRAMP Moderate default elevated to 5 years (1827 days)
    expect(config.monitoring.cloudWatchLogs.retentionDays).toBe(1827);
    expect(config.monitoring.cloudWatchLogs.removalPolicy).toBe('retain');
    expect(config.deadLetterQueue.enabled).toBe(true);
    expect(config.deadLetterQueue.maxRetryAttempts).toBe(3);
  });

  it('applies fedramp-high defaults with 7-year retention', () => {
    const builder = new EventBridgeRulePatternComponentConfigBuilder(createContext('fedramp-high'), createSpec());
    const config = builder.buildSync();

    expect(config.monitoring.enabled).toBe(true);
    expect(config.monitoring.cloudWatchLogs.enabled).toBe(true);
    // FedRAMP High default elevated to 10 years (3653 days)
    expect(config.monitoring.cloudWatchLogs.retentionDays).toBe(3653);
    expect(config.monitoring.cloudWatchLogs.removalPolicy).toBe('retain');
    expect(config.deadLetterQueue.enabled).toBe(true);
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
      config: {
        deadLetterQueue: { enabled: true },
        monitoring: { enabled: true, cloudWatchLogs: { enabled: true } }
      }
    });

    expect(() => builder.buildSync()).toThrow(/eventPattern/);
  });

  it('rejects config with monitoring.enabled=false', () => {
    const builder = new EventBridgeRulePatternComponentConfigBuilder(createContext(), createSpec({
      monitoring: {
        enabled: false,
        cloudWatchLogs: { enabled: true }
      }
    }));

    expect(() => builder.buildSync()).toThrow(/Monitoring cannot be disabled/);
  });

  it('rejects config with deadLetterQueue.enabled=false', () => {
    const builder = new EventBridgeRulePatternComponentConfigBuilder(createContext(), createSpec({
      deadLetterQueue: { enabled: false }
    }));

    expect(() => builder.buildSync()).toThrow(/Dead letter queue cannot be disabled/);
  });

  it('sanitizes rule names with invalid characters', () => {
    const builder = new EventBridgeRulePatternComponentConfigBuilder(createContext(), createSpec({
      ruleName: 'my@rule#with$special%chars!'
    }));

    const config = builder.buildSync();
    expect(config.ruleName).toBe('my-rule-with-special-chars-');
    expect(config.ruleName).toMatch(/^[a-zA-Z0-9._-]+$/);
  });
});
