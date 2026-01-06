/**
 * SqsQueue ConfigBuilder Test Suite
 * Implements Platform Testing Standard v1.0 - ConfigBuilder Testing
 * 
 * @author Platform Team
 */

import { SqsQueueConfigBuilder, SqsQueueConfig } from '../sqs-queue.builder.js';
import { ComponentContext, ComponentSpec } from '@shinobi/core';
import { App, Stack } from 'aws-cdk-lib';

// Mock platform configuration loading to avoid requiring config files in tests
import { vi, beforeEach, afterEach } from 'vitest';

let platformConfigSpy: any;

beforeEach(() => {
  platformConfigSpy = vi
    .spyOn(SqsQueueConfigBuilder.prototype as any, '_loadPlatformConfiguration')
    .mockImplementation(() => ({}));
});

afterEach(() => {
  platformConfigSpy?.mockRestore();
});

const createMockContext = (
  complianceFramework: 'commercial' | 'fedramp-moderate' | 'fedramp-high' = 'commercial',
  environment: string = 'dev'
): ComponentContext => {
  const stack = new Stack(new App(), 'TestStack');
  return {
    serviceName: 'test-service',
    owner: 'test-team',
    environment,
    complianceFramework,
    region: 'us-east-1',
    accountId: '123456789012',
    scope: stack,
    tags: {
      'service-name': 'test-service',
      'owner': 'test-team',
      'environment': environment,
      'compliance-framework': complianceFramework
    }
  };
};

const createMockSpec = (config: Partial<SqsQueueConfig> = {}): ComponentSpec => ({
  name: 'test-sqs-queue',
  type: 'sqs-queue',
  config
});

describe('SqsQueueConfigBuilder', () => {
  
  describe('Hardcoded Fallbacks (Layer 1)', () => {
    
    it('should provide ultra-safe baseline configuration', () => {
      const context = createMockContext();
      const spec = createMockSpec();
      
      const builder = new SqsQueueConfigBuilder(context, spec);
      const config = builder.buildSync();
      
      // Verify hardcoded fallbacks are applied
      expect(config.monitoring?.enabled).toBe(true);
      expect(config.monitoring?.detailedMetrics).toBe(false);
      expect(config.tags).toBeDefined();
    });
    
  });
  
  describe('High Risk Environment Defaults (Layer 2)', () => {
    
    it('should apply standard defaults when highRiskEnvironment is false', () => {
      const context = createMockContext('commercial');
      const spec = createMockSpec({
        highRiskEnvironment: false
      });
      
      const builder = new SqsQueueConfigBuilder(context, spec);
      const config = builder.buildSync();
      
      // Should use hardcoded fallbacks (encryption disabled, DLQ disabled)
      expect(config.encryption?.enabled).toBe(false);
      expect(config.deadLetterQueue?.enabled).toBe(false);
      expect(config.monitoring?.enabled).toBe(true);
      expect(config.monitoring?.detailedMetrics).toBe(false);
    });
    
    it('should apply enhanced security defaults when highRiskEnvironment is true', () => {
      const context = createMockContext('commercial');
      const spec = createMockSpec({
        highRiskEnvironment: true
      });
      
      const builder = new SqsQueueConfigBuilder(context, spec);
      const config = builder.buildSync();
      
      // High-risk environment should enable all security features
      expect(config.encryption?.enabled).toBe(true);
      expect(config.deadLetterQueue?.enabled).toBe(true);
      expect(config.monitoring?.enabled).toBe(true);
      expect(config.monitoring?.detailedMetrics).toBe(true);
    });
    
    it('should work with any compliance framework when highRiskEnvironment is set', () => {
      // Test that highRiskEnvironment works regardless of framework
      const frameworks: Array<'commercial' | 'fedramp-moderate' | 'fedramp-high'> = ['commercial', 'fedramp-moderate', 'fedramp-high'];
      
      frameworks.forEach(framework => {
        const context = createMockContext(framework);
        const spec = createMockSpec({
          highRiskEnvironment: true
        });
        
        const builder = new SqsQueueConfigBuilder(context, spec);
        const config = builder.buildSync();
        
        // All frameworks should get same high-risk defaults
        expect(config.encryption?.enabled).toBe(true);
        expect(config.deadLetterQueue?.enabled).toBe(true);
        expect(config.monitoring?.detailedMetrics).toBe(true);
      });
    });
    
    it('should allow component overrides to disable high-risk defaults', () => {
      const context = createMockContext('commercial');
      const spec = createMockSpec({
        highRiskEnvironment: true,
        encryption: {
          enabled: false // Explicit override
        }
      });
      
      const builder = new SqsQueueConfigBuilder(context, spec);
      const config = builder.buildSync();
      
      // Component override should win
      expect(config.encryption?.enabled).toBe(false);
      // But DLQ and monitoring should still be enabled from high-risk defaults
      expect(config.deadLetterQueue?.enabled).toBe(true);
      expect(config.monitoring?.detailedMetrics).toBe(true);
    });
    
  });
  
  describe('5-Layer Precedence Chain', () => {
    
    it('should apply component overrides over platform defaults', () => {
      const context = createMockContext('commercial');
      const spec = createMockSpec({
        monitoring: {
          enabled: false,
          detailedMetrics: false
        }
      });
      
      const builder = new SqsQueueConfigBuilder(context, spec);
      const config = builder.buildSync();
      
      // Verify component config overrides platform defaults
      expect(config.monitoring?.enabled).toBe(false);
      expect(config.monitoring?.detailedMetrics).toBe(false);
    });
    
    it('should merge nested configuration objects correctly', () => {
      const context = createMockContext('commercial');
      const spec = createMockSpec({
        monitoring: {
          enabled: false
          // detailedMetrics not specified - should come from hardcoded fallbacks
        }
      });
      
      const builder = new SqsQueueConfigBuilder(context, spec);
      const config = builder.buildSync();
      
      // Component override should win for enabled
      expect(config.monitoring?.enabled).toBe(false);
      // Hardcoded fallback should win for detailedMetrics (false by default)
      expect(config.monitoring?.detailedMetrics).toBe(false);
    });
    
    it('should respect highRiskEnvironment flag in precedence chain', () => {
      const context = createMockContext('commercial');
      const spec = createMockSpec({
        highRiskEnvironment: true,
        monitoring: {
          enabled: true,
          // detailedMetrics not specified - should come from high-risk defaults (true)
        }
      });
      
      const builder = new SqsQueueConfigBuilder(context, spec);
      const config = builder.buildSync();
      
      // Component config enabled should win
      expect(config.monitoring?.enabled).toBe(true);
      // High-risk default should win for detailedMetrics
      expect(config.monitoring?.detailedMetrics).toBe(true);
    });
    
  });
  
  describe('Schema Validation', () => {
    
    it('should return the component schema', () => {
      const context = createMockContext();
      const spec = createMockSpec();
      
      const builder = new SqsQueueConfigBuilder(context, spec);
      const schema = builder.getSchema();
      
      expect(schema).toBeDefined();
      expect(schema.type).toBe('object');
      expect(schema.properties).toBeDefined();
    });
    
  });
  
});