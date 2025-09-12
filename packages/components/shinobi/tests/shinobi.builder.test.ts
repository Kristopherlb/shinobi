/**
 * ShinobiComponent ConfigBuilder Test Suite
 * Implements Platform Testing Standard v1.0 - ConfigBuilder Testing
 */

import { ShinobiComponentConfigBuilder, ShinobiConfig } from '../src/shinobi.builder';
import { ComponentContext, ComponentSpec } from '../../../../src/platform/contracts/component-interfaces';

const createMockContext = (
  complianceFramework: string = 'commercial',
  environment: string = 'dev'
): ComponentContext => ({
  serviceName: 'test-service',
  owner: 'test-team',
  environment,
  complianceFramework,
  region: 'us-east-1',
  account: '123456789012',
  tags: {
    'service-name': 'test-service',
    'owner': 'test-team',
    'environment': environment,
    'compliance-framework': complianceFramework
  }
});

const createMockSpec = (config: Partial<ShinobiConfig> = {}): ComponentSpec => ({
  name: 'test-shinobi',
  type: 'shinobi',
  config
});

describe('ShinobiComponentConfigBuilder', () => {
  
  describe('Hardcoded Fallbacks (Layer 1)', () => {
    
    it('should provide ultra-safe baseline configuration', () => {
      const context = createMockContext();
      const spec = createMockSpec();
      
      const builder = new ShinobiComponentConfigBuilder(context, spec);
      const config = builder.buildSync();
      
      // Verify hardcoded fallbacks are applied
      expect(config.compute?.mode).toBe('ecs');
      expect(config.compute?.cpu).toBe(256);
      expect(config.compute?.memory).toBe(512);
      expect(config.compute?.taskCount).toBe(1);
      expect(config.compute?.containerPort).toBe(3000);
      
      expect(config.dataStore?.type).toBe('dynamodb');
      expect(config.dataStore?.dynamodb?.billingMode).toBe('PAY_PER_REQUEST');
      
      expect(config.api?.exposure).toBe('internal');
      expect(config.api?.loadBalancer?.enabled).toBe(true);
      expect(config.api?.version).toBe('1.0');
      
      expect(config.featureFlags?.enabled).toBe(true);
      expect(config.featureFlags?.provider).toBe('aws-appconfig');
      expect(config.featureFlags?.defaults).toBeDefined();
      
      expect(config.dataSources?.components).toBe(true);
      expect(config.dataSources?.services).toBe(true);
      expect(config.dataSources?.dependencies).toBe(true);
      expect(config.dataSources?.compliance).toBe(true);
      expect(config.dataSources?.cost).toBe(false);
      expect(config.dataSources?.security).toBe(false);
      expect(config.dataSources?.performance).toBe(false);
      
      expect(config.observability?.provider).toBe('cloudwatch');
      expect(config.observability?.alerts?.enabled).toBe(true);
      
      expect(config.compliance?.securityLevel).toBe('standard');
      expect(config.compliance?.auditLogging).toBe(false);
      
      expect(config.localDev?.enabled).toBe(false);
      expect(config.localDev?.seedData?.sampleComponents).toBe(true);
      expect(config.localDev?.mockServices).toBe(true);
      
      expect(config.logging?.retentionDays).toBe(30);
      expect(config.logging?.logLevel).toBe('info');
      expect(config.logging?.structuredLogging).toBe(true);
      
      expect(config.tags).toBeDefined();
    });
    
  });

  describe('Compliance Framework Defaults (Layer 2)', () => {
    
    it('should apply FedRAMP Moderate defaults', () => {
      const context = createMockContext('fedramp-moderate', 'prod');
      const spec = createMockSpec();
      
      const builder = new ShinobiComponentConfigBuilder(context, spec);
      const config = builder.buildSync();
      
      // Verify FedRAMP Moderate specific defaults
      expect(config.compute?.cpu).toBe(512);
      expect(config.compute?.memory).toBe(1024);
      expect(config.compute?.taskCount).toBe(2);
      
      expect(config.api?.exposure).toBe('internal');
      
      expect(config.featureFlags?.defaults?.['shinobi.advanced-analytics']).toBe(true);
      expect(config.featureFlags?.defaults?.['shinobi.ai-insights']).toBe(false);
      expect(config.featureFlags?.defaults?.['shinobi.auto-remediation']).toBe(false);
      expect(config.featureFlags?.defaults?.['shinobi.predictive-scaling']).toBe(false);
      expect(config.featureFlags?.defaults?.['shinobi.cost-optimization']).toBe(true);
      expect(config.featureFlags?.defaults?.['shinobi.security-scanning']).toBe(true);
      expect(config.featureFlags?.defaults?.['shinobi.compliance-monitoring']).toBe(true);
      
      expect(config.dataSources?.cost).toBe(true);
      expect(config.dataSources?.security).toBe(true);
      expect(config.dataSources?.performance).toBe(true);
      
      expect(config.observability?.dashboards).toContain('security');
      expect(config.observability?.alerts?.thresholds?.cpuUtilization).toBe(70);
      expect(config.observability?.alerts?.thresholds?.memoryUtilization).toBe(70);
      expect(config.observability?.alerts?.thresholds?.responseTime).toBe(1.5);
      
      expect(config.compliance?.securityLevel).toBe('enhanced');
      expect(config.compliance?.auditLogging).toBe(true);
      
      expect(config.logging?.retentionDays).toBe(90);
    });
    
    it('should apply FedRAMP High defaults', () => {
      const context = createMockContext('fedramp-high', 'prod');
      const spec = createMockSpec();
      
      const builder = new ShinobiComponentConfigBuilder(context, spec);
      const config = builder.buildSync();
      
      // Verify FedRAMP High specific defaults
      expect(config.compute?.cpu).toBe(1024);
      expect(config.compute?.memory).toBe(2048);
      expect(config.compute?.taskCount).toBe(3);
      
      expect(config.api?.exposure).toBe('internal');
      
      expect(config.featureFlags?.defaults?.['shinobi.advanced-analytics']).toBe(true);
      expect(config.featureFlags?.defaults?.['shinobi.ai-insights']).toBe(true);
      expect(config.featureFlags?.defaults?.['shinobi.auto-remediation']).toBe(true);
      expect(config.featureFlags?.defaults?.['shinobi.predictive-scaling']).toBe(true);
      expect(config.featureFlags?.defaults?.['shinobi.cost-optimization']).toBe(true);
      expect(config.featureFlags?.defaults?.['shinobi.security-scanning']).toBe(true);
      expect(config.featureFlags?.defaults?.['shinobi.compliance-monitoring']).toBe(true);
      
      expect(config.dataSources?.cost).toBe(true);
      expect(config.dataSources?.security).toBe(true);
      expect(config.dataSources?.performance).toBe(true);
      
      expect(config.observability?.dashboards).toContain('compliance');
      expect(config.observability?.alerts?.thresholds?.cpuUtilization).toBe(60);
      expect(config.observability?.alerts?.thresholds?.memoryUtilization).toBe(60);
      expect(config.observability?.alerts?.thresholds?.responseTime).toBe(1);
      
      expect(config.compliance?.securityLevel).toBe('maximum');
      expect(config.compliance?.auditLogging).toBe(true);
      
      expect(config.logging?.retentionDays).toBe(2555); // 7 years
    });
    
  });

  describe('Configuration Merging', () => {
    
    it('should merge user configuration with defaults', () => {
      const context = createMockContext();
      const spec = createMockSpec({
        compute: {
          cpu: 1024,
          memory: 2048
        },
        api: {
          exposure: 'public',
          loadBalancer: {
            enabled: false
          }
        },
        featureFlags: {
          enabled: false
        }
      });
      
      const builder = new ShinobiComponentConfigBuilder(context, spec);
      const config = builder.buildSync();
      
      // Verify user overrides are applied
      expect(config.compute?.cpu).toBe(1024);
      expect(config.compute?.memory).toBe(2048);
      expect(config.compute?.taskCount).toBe(1); // Default preserved
      
      expect(config.api?.exposure).toBe('public');
      expect(config.api?.loadBalancer?.enabled).toBe(false);
      expect(config.api?.version).toBe('1.0'); // Default preserved
      
      expect(config.featureFlags?.enabled).toBe(false);
      expect(config.featureFlags?.provider).toBe('aws-appconfig'); // Default preserved
    });
    
    it('should handle partial configuration objects', () => {
      const context = createMockContext();
      const spec = createMockSpec({
        compute: {
          cpu: 512
        },
        observability: {
          provider: 'newrelic'
        }
      });
      
      const builder = new ShinobiComponentConfigBuilder(context, spec);
      const config = builder.buildSync();
      
      // Verify partial overrides work correctly
      expect(config.compute?.cpu).toBe(512);
      expect(config.compute?.memory).toBe(512); // Default preserved
      expect(config.compute?.taskCount).toBe(1); // Default preserved
      
      expect(config.observability?.provider).toBe('newrelic');
      expect(config.observability?.alerts?.enabled).toBe(true); // Default preserved
    });
    
  });

  describe('Schema Validation', () => {
    
    it('should return valid JSON schema', () => {
      const context = createMockContext();
      const spec = createMockSpec();
      
      const builder = new ShinobiComponentConfigBuilder(context, spec);
      const schema = builder.getSchema();
      
      expect(schema).toBeDefined();
      expect(schema.type).toBe('object');
      expect(schema.properties).toBeDefined();
      expect(schema.properties.compute).toBeDefined();
      expect(schema.properties.dataStore).toBeDefined();
      expect(schema.properties.api).toBeDefined();
      expect(schema.properties.featureFlags).toBeDefined();
      expect(schema.properties.dataSources).toBeDefined();
      expect(schema.properties.observability).toBeDefined();
      expect(schema.properties.compliance).toBeDefined();
      expect(schema.properties.localDev).toBeDefined();
      expect(schema.properties.logging).toBeDefined();
      expect(schema.properties.tags).toBeDefined();
    });
    
  });

  describe('Environment Variable Interpolation', () => {
    
    it('should resolve environment variable interpolations in configuration', () => {
      process.env.SHINOBI_CPU = '1024';
      process.env.SHINOBI_MEMORY = '2048';
      process.env.SHINOBI_TASK_COUNT = '3';
      
      const context = createMockContext();
      const spec = createMockSpec({
        compute: {
          cpu: '${env:SHINOBI_CPU}',
          memory: '${env:SHINOBI_MEMORY}',
          taskCount: '${env:SHINOBI_TASK_COUNT}'
        }
      });
      
      const builder = new ShinobiComponentConfigBuilder(context, spec);
      const config = builder.buildSync();
      
      expect(config.compute?.cpu).toBe(1024);
      expect(config.compute?.memory).toBe(2048);
      expect(config.compute?.taskCount).toBe(3);
      
      // Cleanup
      delete process.env.SHINOBI_CPU;
      delete process.env.SHINOBI_MEMORY;
      delete process.env.SHINOBI_TASK_COUNT;
    });
    
  });

  describe('Error Handling', () => {
    
    it('should handle invalid configuration gracefully', () => {
      const context = createMockContext();
      const spec = createMockSpec({
        compute: {
          cpu: -1, // Invalid CPU value
          memory: 0 // Invalid memory value
        }
      });
      
      const builder = new ShinobiComponentConfigBuilder(context, spec);
      
      // Should not throw, but use fallback values
      expect(() => builder.buildSync()).not.toThrow();
      
      const config = builder.buildSync();
      expect(config.compute?.cpu).toBe(256); // Fallback value
      expect(config.compute?.memory).toBe(512); // Fallback value
    });
    
  });

});
