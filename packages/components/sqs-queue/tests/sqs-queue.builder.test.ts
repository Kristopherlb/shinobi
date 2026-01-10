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

// Determinism controls (PTS-301, PTS-303)
let rngSeed: number;
let randomSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  // Freeze clock for deterministic tests (PTS-301)
  vi.useFakeTimers();
  
  // Seed RNG for reproducibility (PTS-303)
  rngSeed = 12345;
  randomSpy = vi.spyOn(Math, 'random').mockImplementation(() => {
    // Simple LCG for deterministic randomness
    const a = 1664525;
    const c = 1013904223;
    const m = 2 ** 32;
    rngSeed = (a * rngSeed + c) % m;
    return rngSeed / m;
  });
  
  platformConfigSpy = vi
    .spyOn(SqsQueueConfigBuilder.prototype as any, '_loadPlatformConfiguration')
    .mockImplementation(() => ({}));
});

afterEach(() => {
  vi.useRealTimers();
  randomSpy?.mockRestore();
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
    
    it('HardcodedFallbacks__EmptyConfig__ProvidesUltraSafeBaseline', () => {
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
    
    it('HighRiskDefaults__FlagFalse__AppliesStandardDefaults', () => {
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
    
    it('HighRiskDefaults__FlagTrue__AppliesEnhancedSecurityDefaults', () => {
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
    
    it('HighRiskDefaults__AnyComplianceFramework__AppliesSameDefaults', () => {
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
    
    it('PrecedenceChain__ComponentOverride__DisablesHighRiskDefaults', () => {
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
    
    it('PrecedenceChain__ComponentOverride__TakesPrecedenceOverPlatformDefaults', () => {
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
    
    it('PrecedenceChain__NestedConfig__MergesCorrectly', () => {
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
    
    it('PrecedenceChain__HighRiskFlag__RespectsInPrecedenceChain', () => {
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
    
    it('SchemaValidation__GetSchema__ReturnsValidSchema', () => {
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