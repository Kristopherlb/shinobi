import { Construct } from 'constructs';
import {
  SnsTopicComponentConfigBuilder,
  SnsTopicConfig
} from '../sns-topic.builder';
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

const createSpec = (config: Partial<SnsTopicConfig> = {}): ComponentSpec => ({
  name: 'test-topic',
  type: 'sns-topic',
  config
});

describe('SnsTopicComponentConfigBuilder', () => {
  it('applies commercial defaults with encryption disabled', () => {
    const builder = new SnsTopicComponentConfigBuilder(createContext('commercial'), createSpec());
    const config = builder.buildSync();

    expect(config.fifo.enabled).toBe(false);
    expect(config.encryption.enabled).toBe(false);
    expect(config.monitoring.enabled).toBe(false);
    expect(config.topicName).toBeUndefined();
  });

  it('enables encryption and alarms for fedramp-high', () => {
    const builder = new SnsTopicComponentConfigBuilder(createContext('fedramp-high'), createSpec());
    const config = builder.buildSync();

    expect(config.encryption.enabled).toBe(true);
    expect(config.encryption.customerManagedKey.create || config.encryption.kmsKeyArn).toBe(true);
    expect(config.monitoring.enabled).toBe(true);
    expect(config.monitoring.alarms.failedNotifications.enabled).toBe(true);
  });

  it('honours manifest overrides', () => {
    const builder = new SnsTopicComponentConfigBuilder(createContext('commercial'), createSpec({
      topicName: 'custom-topic',
      fifo: {
        enabled: true,
        contentBasedDeduplication: true
      },
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
            threshold: 10,
            evaluationPeriods: 3,
            periodMinutes: 10,
            comparisonOperator: 'gte',
            treatMissingData: 'ignore',
            statistic: 'Sum'
          },
          messageRate: {
            enabled: true,
            threshold: 1000,
            evaluationPeriods: 1,
            periodMinutes: 1,
            comparisonOperator: 'gt',
            treatMissingData: 'breaching',
            statistic: 'Average'
          }
        }
      },
      policies: [
        {
          sid: 'AllowPublish',
          actions: ['sns:Publish'],
          principals: [{ type: 'service', identifiers: ['events.amazonaws.com'] }]
        }
      ]
    }));

    const config = builder.buildSync();

    expect(config.topicName).toBe('custom-topic');
    expect(config.fifo.enabled).toBe(true);
    expect(config.encryption.kmsKeyArn).toContain('arn:aws:kms');
    expect(config.policies).toHaveLength(1);
    expect(config.monitoring.alarms.failedNotifications.threshold).toBe(10);
  });

  it('throws when encryption enabled without key configuration', () => {
    const builder = new SnsTopicComponentConfigBuilder(createContext(), createSpec({
      encryption: {
        enabled: true,
        customerManagedKey: { create: false, enableRotation: true }
      }
    }));

    expect(() => builder.buildSync()).toThrow();
  });
});
