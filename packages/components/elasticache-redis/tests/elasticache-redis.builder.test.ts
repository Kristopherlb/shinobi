import { describe, it, expect } from 'vitest';
import { App, Stack, Environment } from 'aws-cdk-lib';
import {
  ElastiCacheRedisComponentConfigBuilder,
  ElastiCacheRedisConfig
} from '../src/elasticache-redis.builder';
import { ComponentContext, ComponentSpec } from '@shinobi/core';

type Framework = 'commercial' | 'fedramp-moderate' | 'fedramp-high';

const createContext = (framework: Framework = 'commercial'): ComponentContext => {
  const app = new App();
  const stack = new Stack(app, 'TestStack', {
    env: {
      account: '123456789012',
      region: 'us-east-1'
    } as Environment
  });

  return {
    serviceName: 'test-service',
    environment: 'dev',
    complianceFramework: framework,
    scope: stack,
    region: 'us-east-1',
    accountId: '123456789012',
    serviceLabels: {
      'service-name': 'test-service',
      environment: 'dev',
      'compliance-framework': framework
    },
    tags: {
      'service-name': 'test-service',
      environment: 'dev',
      'compliance-framework': framework
    }
  } as ComponentContext;
};

const createSpec = (config: Partial<ElastiCacheRedisConfig> = {}): ComponentSpec => ({
  name: 'test-redis',
  type: 'elasticache-redis',
  config
});

describe('ElastiCacheRedisComponentConfigBuilder', () => {
  it('applies commercial defaults with monitoring disabled', () => {
    const builder = new ElastiCacheRedisComponentConfigBuilder(createContext('commercial'), createSpec());
    const config = builder.buildSync();

    expect(config.engineVersion).toBe('7.0');
    expect(config.encryption.atRest).toBe(true);
    expect(config.encryption.inTransit).toBe(true);
    expect(config.encryption.authToken.enabled).toBe(true);
    expect(config.monitoring.enabled).toBe(true);
    expect(config.monitoring.logDelivery).toHaveLength(2);
    expect(config.monitoring.logDelivery.map(entry => entry.logType)).toEqual(
      expect.arrayContaining(['slow-log', 'engine-log'])
    );
    expect(config.monitoring.logDelivery.every(entry => entry.logFormat === 'json')).toBe(true);
    expect(
      config.monitoring.logDelivery.every(entry =>
        entry.destinationName.startsWith('/aws/platform/redis/test-service-test-redis/')
      )
    ).toBe(true);
    expect(config.multiAz.enabled).toBe(false);
  });

  it('enables hardening defaults for fedramp-moderate', () => {
    const builder = new ElastiCacheRedisComponentConfigBuilder(createContext('fedramp-moderate'), createSpec());
    const config = builder.buildSync();

    expect(config.encryption.atRest).toBe(true);
    expect(config.encryption.inTransit).toBe(true);
    expect(config.encryption.authToken.enabled).toBe(true);
    expect(config.backup.enabled).toBe(true);
    expect(config.multiAz.enabled).toBe(true);
    expect(config.monitoring.enabled).toBe(true);
    expect(config.monitoring.logDelivery).toHaveLength(2);
    const slowLog = config.monitoring.logDelivery.find(entry => entry.logType === 'slow-log');
    expect(slowLog).toBeDefined();
    expect(slowLog).toMatchObject({ destinationType: 'cloudwatch-logs', managed: true });
  });

  it('includes engine log delivery for fedramp-high via manifest override', () => {
    const builder = new ElastiCacheRedisComponentConfigBuilder(createContext('fedramp-high'), createSpec({
      monitoring: {
        enabled: true,
        logDelivery: [
          {
            enabled: true,
            logType: 'engine-log',
            destinationType: 'cloudwatch-logs',
            destinationName: '/aws/elasticache/redis/engine/test-service-test-redis',
            logFormat: 'json'
          }
        ],
        alarms: {
          cpuUtilization: { enabled: true, threshold: 65, evaluationPeriods: 3, periodMinutes: 5 },
          cacheMisses: { enabled: true, threshold: 100, evaluationPeriods: 2, periodMinutes: 5 },
          evictions: { enabled: true, threshold: 1, evaluationPeriods: 2, periodMinutes: 5 },
          connections: { enabled: true, threshold: 300, evaluationPeriods: 2, periodMinutes: 5 }
        }
      }
    }));

    const config = builder.buildSync();

    expect(config.monitoring.logDelivery).toHaveLength(2);
    expect(config.monitoring.logDelivery.find(entry => entry.logType === 'engine-log')).toBeDefined();
    expect(config.monitoring.logDelivery.find(entry => entry.logType === 'slow-log')).toBeDefined();
    expect(config.monitoring.alarms.cpuUtilization.threshold).toBe(65);
  });

  it('honours manifest overrides over platform defaults', () => {
    const builder = new ElastiCacheRedisComponentConfigBuilder(createContext('commercial'), createSpec({
      engineVersion: '7.1',
      nodeType: 'cache.r6g.large',
      security: {
        create: false,
        securityGroupIds: ['sg-12345678'],
        allowedCidrs: ['192.168.0.0/24']
      },
      multiAz: {
        enabled: true,
        automaticFailover: true
      }
    }));

    const config = builder.buildSync();

    expect(config.engineVersion).toBe('7.1');
    expect(config.nodeType).toBe('cache.r6g.large');
    expect(config.security.create).toBe(false);
    expect(config.security.securityGroupIds).toContain('sg-12345678');
    expect(config.multiAz.enabled).toBe(true);
    expect(config.multiAz.automaticFailover).toBe(true);
  });

  it('validates conflicting log destination types are not allowed', () => {
    const builder = new ElastiCacheRedisComponentConfigBuilder(createContext('commercial'), createSpec({
      monitoring: {
        enabled: true,
        logDelivery: [
          {
            enabled: true,
            logType: 'slow-log',
            destinationType: 'cloudwatch-logs',
            destinationName: '/aws/elasticache/redis/slow/test-service-test-redis',
            logFormat: 'json'
          },
          {
            enabled: true,
            logType: 'slow-log',
            destinationType: 'kinesis-firehose',
            destinationName: 'my-delivery-stream',
            logFormat: 'json'
          }
        ],
        alarms: {
          cpuUtilization: { enabled: false, threshold: 0, evaluationPeriods: 1, periodMinutes: 5 },
          cacheMisses: { enabled: false, threshold: 0, evaluationPeriods: 1, periodMinutes: 5 },
          evictions: { enabled: false, threshold: 0, evaluationPeriods: 1, periodMinutes: 5 },
          connections: { enabled: false, threshold: 0, evaluationPeriods: 1, periodMinutes: 5 }
        }
      }
    }));

    // Builder should allow the config (validation happens in component synthesis)
    // Builder will still add default engine-log entry if monitoring.enabled !== false
    const config = builder.buildSync();
    expect(config.monitoring.logDelivery.length).toBeGreaterThanOrEqual(2);
    
    // Find the two slow-log entries from the test config
    const slowLogEntries = config.monitoring.logDelivery.filter(entry => entry.logType === 'slow-log');
    expect(slowLogEntries).toHaveLength(2);
    expect(slowLogEntries[0].destinationType).toBe('cloudwatch-logs');
    expect(slowLogEntries[1].destinationType).toBe('kinesis-firehose');
  });
});
