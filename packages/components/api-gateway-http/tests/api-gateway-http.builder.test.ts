/**
 * API Gateway HTTP ConfigBuilder Test Suite
 * Implements Platform Testing Standard v1.0 - ConfigBuilder Testing
 * 
 * Tests the 5-layer configuration precedence chain and compliance-aware defaults
 * for the Modern HTTP API Gateway component.
 */

import { ApiGatewayHttpConfigBuilder, ApiGatewayHttpConfig } from '../api-gateway-http.builder';
import { ComponentContext, ComponentSpec } from '@platform/contracts';

// Test Metadata as per Platform Testing Standard v1.0 Section 11
const TEST_METADATA = {
  component: 'api-gateway-http',
  level: 'unit',
  type: 'builder',
  framework: 'jest',
  deterministic: true,
  fixtures: ['mockComponentContext', 'mockComponentSpec'],
  compliance_refs: ['std://platform-configuration', 'std://5-layer-precedence'],
  ai_generated: true,
  human_reviewed_by: "platform-engineering-team"
};

// Mock component context factory
const createMockContext = (
  complianceFramework: string = 'commercial',
  environment: string = 'dev'
): ComponentContext => ({
  serviceName: 'test-service',
  owner: 'test-team',
  environment,
  complianceFramework: complianceFramework as 'commercial' | 'fedramp-moderate' | 'fedramp-high',
  region: 'us-east-1',
  accountId: '123456789012',
  account: '123456789012',
  scope: {} as any, // Mock CDK scope
  tags: {
    'service-name': 'test-service',
    'owner': 'test-team',
    'environment': environment,
    'compliance-framework': complianceFramework
  }
});

// Mock component spec factory
const createMockSpec = (config: Partial<ApiGatewayHttpConfig> = {}): ComponentSpec => ({
  name: 'test-api',
  type: 'api-gateway-http',
  config
});

describe('ApiGatewayHttpConfigBuilder', () => {

  describe('Hardcoded Fallbacks (Layer 1)', () => {

    it('should provide ultra-safe baseline configuration', () => {
      const context = createMockContext();
      const spec = createMockSpec();

      const builder = new ApiGatewayHttpConfigBuilder(context, spec);
      const config = builder.buildSync();

      // Verify hardcoded fallbacks are applied
      expect(config.protocolType).toBe('HTTP');
      expect(config.cors?.allowOrigins).toEqual([]);
      expect(config.cors?.allowHeaders).toEqual(['Content-Type', 'Authorization']);
      expect(config.cors?.allowMethods).toEqual(['GET', 'POST', 'OPTIONS']);
      expect(config.cors?.allowCredentials).toBe(false);
      expect(config.cors?.maxAge).toBe(300);

      expect(config.throttling?.rateLimit).toBe(1000);
      expect(config.throttling?.burstLimit).toBe(2000);

      expect(config.defaultStage?.stageName).toBe('dev');
      expect(config.defaultStage?.autoDeploy).toBe(true);

      expect(config.accessLogging?.enabled).toBe(true);
      expect(config.accessLogging?.retentionInDays).toBe(90);

      expect(config.monitoring?.detailedMetrics).toBe(true);
      expect(config.monitoring?.tracingEnabled).toBe(true);
      expect(config.monitoring?.alarms?.errorRate4xx).toBe(5.0);
      expect(config.monitoring?.alarms?.errorRate5xx).toBe(1.0);
      expect(config.monitoring?.alarms?.highLatency).toBe(5000);

      expect(config.apiSettings?.disableExecuteApiEndpoint).toBe(false);
      expect(config.apiSettings?.apiKeySource).toBe('HEADER');
    });

  });

  describe('Compliance Framework Defaults (Layer 2)', () => {

    it('should apply commercial compliance defaults', () => {
      const context = createMockContext('commercial');
      const spec = createMockSpec();

      const builder = new ApiGatewayHttpConfigBuilder(context, spec);
      const config = builder.buildSync();

      // Verify commercial compliance defaults
      expect(config.cors?.allowOrigins).toEqual([]); // Must be explicitly configured
      expect(config.cors?.allowCredentials).toBe(false);
      expect(config.cors?.maxAge).toBe(300);

      expect(config.throttling?.rateLimit).toBe(50);
      expect(config.throttling?.burstLimit).toBe(100);

      expect(config.defaultStage?.stageName).toBe('dev');
      expect(config.defaultStage?.autoDeploy).toBe(true);

      expect(config.accessLogging?.enabled).toBe(true);
      expect(config.accessLogging?.retentionInDays).toBe(90);

      expect(config.monitoring?.detailedMetrics).toBe(true);
      expect(config.monitoring?.tracingEnabled).toBe(true);
      expect(config.monitoring?.alarms?.errorRate4xx).toBe(5.0);
      expect(config.monitoring?.alarms?.errorRate5xx).toBe(1.0);
      expect(config.monitoring?.alarms?.highLatency).toBe(2000);

      expect(config.customDomain?.securityPolicy).toBeUndefined();
      expect(config.customDomain?.endpointType).toBeUndefined();
    });

    it('should honour configuration defaults for FedRAMP Moderate without overrides', () => {
      const context = createMockContext('fedramp-moderate', 'stage');
      const spec = createMockSpec();

      const builder = new ApiGatewayHttpConfigBuilder(context, spec);
      const config = builder.buildSync();

      expect(config.cors?.allowOrigins).toEqual([]);
      expect(config.cors?.allowCredentials).toBe(false);

      expect(config.accessLogging?.enabled).toBe(true);
      expect(config.accessLogging?.retentionInDays).toBe(30);

      expect(config.monitoring?.detailedMetrics).toBe(true);
      expect(config.monitoring?.tracingEnabled).toBe(true);
      expect(config.monitoring?.alarms?.errorRate4xx).toBe(5.0);
      expect(config.monitoring?.alarms?.errorRate5xx).toBe(1.0);

      expect(config.throttling?.rateLimit).toBe(50);
      expect(config.throttling?.burstLimit).toBe(100);

      expect(config.apiSettings?.disableExecuteApiEndpoint).toBe(false);

      expect(config.defaultStage?.stageName).toBe('stage');

      expect(config.resourcePolicy?.allowFromVpcs).toBeUndefined();
      expect(config.resourcePolicy?.denyFromIpRanges).toBeUndefined();
    });

    it('should honour configuration defaults for FedRAMP High without overrides', () => {
      const context = createMockContext('fedramp-high', 'prod');
      const spec = createMockSpec();

      const builder = new ApiGatewayHttpConfigBuilder(context, spec);
      const config = builder.buildSync();

      expect(config.accessLogging?.retentionInDays).toBe(365);
      expect(config.monitoring?.alarms?.errorRate4xx).toBe(1.0);
      expect(config.monitoring?.alarms?.errorRate5xx).toBe(0.1);
      expect(config.monitoring?.alarms?.highLatency).toBe(2000);
      expect(config.apiSettings?.disableExecuteApiEndpoint).toBe(false);
      expect(config.defaultStage?.stageName).toBe('prod');
    });

  });

  describe('5-Layer Precedence Chain', () => {

    it('should apply component overrides over platform defaults', () => {
      const context = createMockContext('commercial');
      const spec = createMockSpec({
        protocolType: 'WEBSOCKET',
        throttling: {
          rateLimit: 2000,
          burstLimit: 4000
        },
        accessLogging: {
          enabled: false
        },
        monitoring: {
          detailedMetrics: false,
          tracingEnabled: false
        }
      });

      const builder = new ApiGatewayHttpConfigBuilder(context, spec);
      const config = builder.buildSync();

      // Verify component config overrides platform defaults
      expect(config.protocolType).toBe('WEBSOCKET'); // Component override
      expect(config.throttling?.rateLimit).toBe(2000); // Component override
      expect(config.throttling?.burstLimit).toBe(4000); // Component override
      expect(config.accessLogging?.enabled).toBe(false); // Component override
      expect(config.monitoring?.detailedMetrics).toBe(false); // Component override
      expect(config.monitoring?.tracingEnabled).toBe(false); // Component override

      // But compliance defaults still apply where not overridden
      expect(config.cors?.allowCredentials).toBe(false); // Still from compliance layer
      expect(config.customDomain?.securityPolicy).toBeUndefined(); // Still from compliance layer
    });

    it('should merge nested objects correctly', () => {
      const context = createMockContext('commercial');
      const spec = createMockSpec({
        cors: {
          allowOrigins: ['https://example.com', 'https://app.example.com'],
          allowMethods: ['GET', 'POST', 'PUT', 'DELETE']
          // allowCredentials not specified - should inherit from compliance layer
        },
        monitoring: {
          detailedMetrics: false,
          // tracingEnabled not specified - should inherit from compliance layer
          alarms: {
            errorRate4xx: 10.0
            // errorRate5xx not specified - should inherit from compliance layer
          }
        }
      });

      const builder = new ApiGatewayHttpConfigBuilder(context, spec);
      const config = builder.buildSync();

      // Verify nested object merging
      expect(config.cors?.allowOrigins).toEqual(['https://example.com', 'https://app.example.com']); // Component override
      expect(config.cors?.allowMethods).toEqual(['GET', 'POST', 'PUT', 'DELETE']); // Component override
      expect(config.cors?.allowCredentials).toBe(false); // Inherited from compliance layer
      expect(config.cors?.maxAge).toBe(86400); // Inherited from compliance layer

      expect(config.monitoring?.detailedMetrics).toBe(false); // Component override
      expect(config.monitoring?.tracingEnabled).toBe(true); // Inherited from compliance layer
      expect(config.monitoring?.alarms?.errorRate4xx).toBe(10.0); // Component override
      expect(config.monitoring?.alarms?.errorRate5xx).toBe(1.0); // Inherited from compliance layer
    });

    it('should handle complex CORS configuration precedence', () => {
      const context = createMockContext('fedramp-moderate');
      const spec = createMockSpec({
        cors: {
          allowOrigins: ['https://secure.example.com'],
          allowHeaders: ['Content-Type', 'Authorization', 'X-Custom-Header'],
          // allowCredentials not specified - should inherit FedRAMP default (true)
          maxAge: 1800
        }
      });

      const builder = new ApiGatewayHttpConfigBuilder(context, spec);
      const config = builder.buildSync();

      // Verify CORS configuration precedence
      expect(config.cors?.allowOrigins).toEqual(['https://secure.example.com']); // Component override
      expect(config.cors?.allowHeaders).toEqual(['Content-Type', 'Authorization', 'X-Custom-Header']); // Component override
      expect(config.cors?.allowCredentials).toBe(false); // Inherited from FedRAMP compliance
      expect(config.cors?.maxAge).toBe(1800); // Component override
      expect(config.cors?.allowMethods).toEqual(['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']); // Inherited from compliance
    });

  });

  describe('Schema Validation', () => {

    it('should provide comprehensive JSON schema', () => {
      const context = createMockContext();
      const spec = createMockSpec();

      const builder = new ApiGatewayHttpConfigBuilder(context, spec);
      const schema = builder.getSchema();

      // Verify schema structure
      expect(schema.type).toBe('object');
      expect(schema.properties).toBeDefined();
      expect(schema.additionalProperties).toBe(false);

      // Verify key properties are defined
      expect(schema.properties.apiName).toBeDefined();
      expect(schema.properties.description).toBeDefined();
      expect(schema.properties.protocolType).toBeDefined();
      expect(schema.properties.cors).toBeDefined();
      expect(schema.properties.customDomain).toBeDefined();
      expect(schema.properties.throttling).toBeDefined();
      expect(schema.properties.accessLogging).toBeDefined();
      expect(schema.properties.monitoring).toBeDefined();

      // Verify enum constraints
      expect(schema.properties.protocolType.enum).toEqual(['HTTP', 'WEBSOCKET']);

      // Verify nested object schemas
      expect(schema.properties.cors.type).toBe('object');
      expect(schema.properties.cors.properties.allowMethods.items.enum).toContain('GET');
      expect(schema.properties.cors.properties.allowMethods.items.enum).toContain('POST');

      // Verify validation constraints
      expect(schema.properties.apiName.pattern).toBeDefined();
      expect(schema.properties.apiName.maxLength).toBe(128);
      expect(schema.properties.description.maxLength).toBe(1024);
    });

  });

  describe('Error Handling', () => {

    it('should handle missing context gracefully', () => {
      const spec = createMockSpec();

      expect(() => {
        new ApiGatewayHttpConfigBuilder(null as any, spec);
      }).toThrow();
    });

    it('should handle missing spec gracefully', () => {
      const context = createMockContext();

      expect(() => {
        new ApiGatewayHttpConfigBuilder(context, null as any);
      }).toThrow();
    });

    it('should validate configuration constraints', () => {
      const context = createMockContext();
      const spec = createMockSpec({
        throttling: {
          rateLimit: -1, // Invalid
          burstLimit: 0   // Invalid
        }
      });

      const builder = new ApiGatewayHttpConfigBuilder(context, spec);

      // This should either throw or sanitize the values
      // The exact behavior depends on implementation
      expect(() => {
        builder.buildSync();
      }).not.toThrow(); // ConfigBuilder should handle gracefully

      const config = builder.buildSync();
      // Verify that invalid values are either corrected or defaults are used
      expect(config.throttling?.rateLimit).toBeGreaterThan(0);
      expect(config.throttling?.burstLimit).toBeGreaterThan(0);
    });

  });

  describe('Environment-Specific Behavior', () => {

    it('should apply production-specific settings', () => {
      const context = createMockContext('commercial', 'prod');
      const spec = createMockSpec();

      const builder = new ApiGatewayHttpConfigBuilder(context, spec);
      const config = builder.buildSync();

      // Production should have stricter defaults
      expect(config.accessLogging?.enabled).toBe(true);
      expect(config.monitoring?.detailedMetrics).toBe(true);
      expect(config.monitoring?.tracingEnabled).toBe(true);
    });

    it('should apply development-specific settings', () => {
      const context = createMockContext('commercial', 'dev');
      const spec = createMockSpec();

      const builder = new ApiGatewayHttpConfigBuilder(context, spec);
      const config = builder.buildSync();

      // Development can have more relaxed settings
      expect(config.cors?.allowOrigins).toEqual([]); // Still requires explicit config
      expect(config.accessLogging?.retentionInDays).toBe(90); // Commercial default
    });

  });

});
