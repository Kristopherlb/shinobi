/**
 * API Gateway HTTP ConfigBuilder Test Suite
 * Implements Platform Testing Standard v1.0 - ConfigBuilder Testing
 */

import { ApiGatewayHttpConfigBuilder, ApiGatewayHttpConfig } from '../src/api-gateway-http.builder.js';
import { ComponentContext, ComponentSpec } from '@shinobi/core';

// Helper factories
const createContext = (
  complianceFramework: ComponentContext['complianceFramework'] = 'commercial',
  environment: ComponentContext['environment'] = 'dev'
): ComponentContext => ({
  serviceName: 'test-service',
  owner: 'test-team',
  environment,
  complianceFramework,
  region: 'us-east-1',
  accountId: '123456789012',
  account: '123456789012',
  scope: {} as any,
  serviceLabels: { version: '1.0.0' },
  tags: {
    'service-name': 'test-service',
    owner: 'test-team',
    environment,
    'compliance-framework': complianceFramework
  }
});

const createSpec = (config: Partial<ApiGatewayHttpConfig> = {}): ComponentSpec => ({
  name: 'test-api',
  type: 'api-gateway-http',
  config
});

describe('ApiGatewayHttpConfigBuilder__HardcodedFallbacks__SecureBaseline', () => {
  it('HardcodedFallbacks__Commercial__OutputsSecureBaseline', () => {
    const builder = new ApiGatewayHttpConfigBuilder({
      context: createContext(),
      spec: createSpec()
    });
    const config = builder.buildSync();

    expect(config.protocolType).toBe('HTTP');
    expect(config.description).toBe('HTTP API for test-api');
    expect(config.cors?.allowOrigins).toEqual([]);
    expect(config.throttling).toEqual({ rateLimit: 1000, burstLimit: 2000 });
    expect(config.accessLogging?.enabled).toBe(true);
    expect(config.accessLogging?.retentionInDays).toBe(90);
    expect(config.accessLogging?.retainOnDelete).toBe(false);
    expect(config.monitoring?.alarms?.highLatency).toBe(5000);
    expect(config.monitoring?.alarms?.lowThroughput).toBe(10);
    expect(config.apiSettings?.disableExecuteApiEndpoint).toBe(false);
  });
});

describe('ApiGatewayHttpConfigBuilder__ComplianceDefaults__ApplyPlatformProfiles', () => {
  it('ComplianceDefaults__Commercial__MatchesPlatformDefaults', () => {
    const config = new ApiGatewayHttpConfigBuilder({
      context: createContext('commercial'),
      spec: createSpec()
    }).buildSync();
    expect(config.monitoring?.alarms?.lowThroughput).toBe(10);
    expect(config.accessLogging?.retentionInDays).toBe(90);
    expect(config.accessLogging?.retainOnDelete).toBe(false);
  });

  it('ComplianceDefaults__FedRampModerate__MatchesPlatformDefaults', () => {
    const config = new ApiGatewayHttpConfigBuilder({
      context: createContext('fedramp-moderate', 'stage'),
      spec: createSpec()
    }).buildSync();
    expect(config.throttling).toEqual({ rateLimit: 50, burstLimit: 100 });
    expect(config.monitoring?.alarms?.errorRate4xx).toBe(2.0);
    expect(config.monitoring?.alarms?.highLatency).toBe(3000);
    expect(config.monitoring?.alarms?.lowThroughput).toBe(5);
    expect(config.accessLogging?.retainOnDelete).toBe(true);
  });

  it('ComplianceDefaults__FedRampHigh__MatchesPlatformDefaults', () => {
    const config = new ApiGatewayHttpConfigBuilder({
      context: createContext('fedramp-high', 'prod'),
      spec: createSpec()
    }).buildSync();
    expect(config.accessLogging?.retentionInDays).toBe(365);
    expect(config.accessLogging?.retainOnDelete).toBe(true);
    expect(config.monitoring?.alarms?.errorRate4xx).toBe(1.0);
    expect(config.monitoring?.alarms?.highLatency).toBe(2000);
    expect(config.monitoring?.alarms?.lowThroughput).toBe(2);
  });
});

describe('ApiGatewayHttpConfigBuilder__Precedence__ManifestOverrides', () => {
  it('Precedence__ManifestOverrides__ReplacePlatformValues', () => {
    const config = new ApiGatewayHttpConfigBuilder({
      context: createContext('commercial'),
      spec: createSpec({
        protocolType: 'WEBSOCKET',
        throttling: { rateLimit: 2000, burstLimit: 4000 },
        accessLogging: { enabled: false },
        monitoring: {
          detailedMetrics: false,
          tracingEnabled: false,
          alarms: { errorRate4xx: 25, lowThroughput: 1 }
        }
      })
    }).buildSync();

    expect(config.protocolType).toBe('WEBSOCKET');
    expect(config.throttling).toEqual({ rateLimit: 2000, burstLimit: 4000 });
    expect(config.accessLogging?.enabled).toBe(false);
    expect(config.monitoring?.detailedMetrics).toBe(false);
    expect(config.monitoring?.alarms?.errorRate4xx).toBe(25);
    expect(config.monitoring?.alarms?.lowThroughput).toBe(1);
  });
});
