import { Stack } from 'aws-cdk-lib';
import {
  ComponentContext,
  ComponentSpec
} from '@shinobi/core';

import {
  LambdaApiComponentConfigBuilder,
  LambdaApiConfig
} from '../src/lambda-api.builder.js';

const createContext = (
  framework: 'commercial' | 'fedramp-moderate' | 'fedramp-high' = 'commercial'
): ComponentContext => ({
  serviceName: 'orders',
  environment: 'dev',
  complianceFramework: framework,
  scope: new Stack(),
  region: 'us-east-1',
  accountId: '123456789012'
});

const createSpec = (config: Partial<LambdaApiConfig> = {}): ComponentSpec => ({
  name: 'api',
  type: 'lambda-api',
  config: {
    handler: 'src/api.handler',
    ...config
  }
});

describe('LambdaApiComponentConfigBuilder', () => {
  it('applies commercial platform defaults', () => {
    const builder = new LambdaApiComponentConfigBuilder({
      context: createContext('commercial'),
      spec: createSpec()
    });

    const config = builder.buildSync();

    expect(config.runtime).toBe('nodejs20.x');
    expect(config.logging.logFormat).toBe('JSON');
    expect(config.api.apiKeyRequired).toBe(false);
    expect(config.api.logging.enabled).toBe(true);
    expect(config.monitoring.enabled).toBe(true);
    expect(config.api.cors.allowOrigins).toContain('*');
    expect(config.hardeningProfile).toBe('baseline');
  });

  it('pulls fedramp-high hardened configuration from platform defaults', () => {
    const builder = new LambdaApiComponentConfigBuilder({
      context: createContext('fedramp-high'),
      spec: createSpec()
    });

    const config = builder.buildSync();

    expect(config.vpc.enabled).toBe(true);
    expect(config.api.apiKeyRequired).toBe(true);
    expect(config.monitoring.alarms.api5xxErrors.threshold).toBeLessThanOrEqual(1);
    expect(config.securityTools.falco).toBe(true);
    expect(config.hardeningProfile).toBe('fedramp-high');
    expect(config.observability.otelEnabled).toBe(true);
  });

  it('honours manifest overrides above platform configuration', () => {
    const builder = new LambdaApiComponentConfigBuilder({
      context: createContext('commercial'),
      spec: createSpec({
        functionName: 'custom-api-fn',
        runtime: 'python3.11',
        memorySize: 1024,
        timeoutSeconds: 90,
        environment: {
          LOG_LEVEL: 'DEBUG'
        },
        vpc: {
          enabled: true,
          vpcId: 'vpc-override',
          subnetIds: ['subnet-a', 'subnet-a', 'subnet-b'],
          securityGroupIds: ['sg-a']
        },
        api: {
          stageName: 'staging',
          throttling: {
            burstLimit: 25,
            rateLimit: 15
          },
          cors: {
            enabled: true,
            allowOrigins: ['https://example.com', 'https://example.com'],
            allowHeaders: ['Content-Type'],
            allowMethods: ['GET'],
            allowCredentials: true
          }
        },
        monitoring: {
          enabled: true,
          alarms: {
            lambdaErrors: {
              enabled: true,
              threshold: 10,
              evaluationPeriods: 3,
              periodMinutes: 1,
              comparisonOperator: 'gt',
              treatMissingData: 'not-breaching',
              statistic: 'Sum',
              tags: {
                severity: 'high'
              }
            }
          }
        },
        tags: {
          team: 'platform'
        }
      })
    });

    const config = builder.buildSync();

    expect(config.functionName).toBe('custom-api-fn');
    expect(config.runtime).toBe('python3.11');
    expect(config.memorySize).toBe(1024);
    expect(config.timeoutSeconds).toBe(90);
    expect(config.environment.LOG_LEVEL).toBe('DEBUG');
    expect(config.vpc.subnetIds).toEqual(['subnet-a', 'subnet-b']);
    expect(config.api.stageName).toBe('staging');
    expect(config.api.throttling.rateLimit).toBe(15);
    expect(config.api.cors.allowOrigins).toEqual(['https://example.com']);
    expect(config.monitoring.alarms.lambdaErrors.threshold).toBe(10);
    expect(config.monitoring.alarms.lambdaErrors.tags?.severity).toBe('high');
    expect(config.tags.team).toBe('platform');
  });
});
