import { Construct } from 'constructs';
import {
  ElastiCacheRedisComponentConfigBuilder,
  ElastiCacheRedisConfig
} from '../elasticache-redis.builder.js';
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
    expect(config.encryption.atRest).toBe(false);
    expect(config.encryption.authToken.enabled).toBe(false);
    expect(config.monitoring.enabled).toBe(false);
    expect(config.monitoring.logDelivery).toHaveLength(0);
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
    expect(config.monitoring.logDelivery).toHaveLength(1);
    expect(config.monitoring.logDelivery[0]).toMatchObject({ logType: 'slow-log', destinationType: 'cloudwatch-logs' });
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
            destinationName: '/aws/elasticache/redis/engine/test-service-test-redis'
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

    expect(config.monitoring.logDelivery).toHaveLength(1);
    expect(config.monitoring.logDelivery[0].logType).toBe('engine-log');
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
});
