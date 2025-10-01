/**
 * EcrRepositoryComponent ConfigBuilder Test Suite
 * Implements Platform Testing Standard v1.0 - ConfigBuilder Testing
 */

import { EcrRepositoryComponentConfigBuilder, EcrRepositoryConfig } from '../ecr-repository.builder.js';
import { ComponentContext, ComponentSpec } from '/Users/kristopherbowles/code/CDK-Lib/src/platform/contracts/component-interfaces';
import { Construct } from 'constructs';
import { Stack } from 'aws-cdk-lib';

// Test metadata for Platform Testing Standard compliance
const TEST_METADATA = {
  id: 'TP-ecr-repository-config-001',
  level: 'unit',
  capability: 'Configuration building with 5-layer precedence chain',
  oracle: 'exact',
  invariants: ['Configuration must be valid', 'Hardcoded fallbacks must be applied'],
  fixtures: ['MockComponentContext', 'MockComponentSpec'],
  inputs: { shape: 'ComponentContext and ComponentSpec objects', notes: 'Tests configuration building logic' },
  risks: ['Configuration mismatch', 'Invalid schema validation'],
  dependencies: ['ConfigBuilder base class'],
  evidence: ['Configuration precedence chain works correctly'],
  compliance_refs: ['Platform Configuration Standard v1.0'],
  ai_generated: true,
  human_reviewed_by: 'Platform Engineering Team'
};

// Determinism controls for Platform Testing Standard compliance
beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2025-01-01T00:00:00.000Z'));
  Math.random = jest.fn(() => 0.5);
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

const createMockContext = (
  complianceFramework: 'commercial' | 'fedramp-moderate' | 'fedramp-high' = 'commercial',
  environment: string = 'dev'
): ComponentContext => {
  const stack = new Stack();
  return {
    serviceName: 'test-service',
    accountId: '123456789012',
    environment,
    complianceFramework,
    region: 'us-east-1',
    scope: stack,
    serviceLabels: {
      'service-name': 'test-service',
      'environment': environment,
      'compliance-framework': complianceFramework
    }
  };
};

const createMockSpec = (config: Partial<EcrRepositoryConfig> = {}): ComponentSpec => ({
  name: 'test-ecr-repository',
  type: 'ecr-repository',
  config
});

describe('EcrRepositoryComponentConfigBuilder', () => {
  
  describe('HardcodedFallbacks__MinimalConfig__AppliesSafeDefaults', () => {
    
    it('should provide ultra-safe baseline configuration', () => {
      const context = createMockContext();
      const spec = createMockSpec();
      
      const builder = new EcrRepositoryComponentConfigBuilder({ context, spec });
      const config = builder.buildSync();
      
      // Verify hardcoded fallbacks are applied
      expect(config.imageScanningConfiguration?.scanOnPush).toBe(false); // Security-safe default
      expect(config.imageTagMutability).toBe('MUTABLE');
      expect(config.encryption?.encryptionType).toBe('AES256');
      expect(config.lifecyclePolicy?.maxImageCount).toBe(10); // Conservative default
      expect(config.monitoring?.enabled).toBe(true);
      expect(config.monitoring?.detailedMetrics).toBe(false);
      expect(config.compliance?.retentionPolicy).toBe('destroy');
      expect(config.tags).toBeDefined();
    });
    
  });
  
  describe('ComplianceFrameworkDefaults__CommercialFramework__AppliesCommercialDefaults', () => {
    
    it('should apply commercial compliance defaults', () => {
      const context = createMockContext('commercial');
      const spec = createMockSpec();
      
      const builder = new EcrRepositoryComponentConfigBuilder({ context, spec });
      const config = builder.buildSync();
      
      expect(config.monitoring?.enabled).toBe(true);
      expect(config.monitoring?.detailedMetrics).toBe(false);
    });
    
  });
  
  describe('ComplianceFrameworkDefaults__FedrampFramework__AppliesFedrampDefaults', () => {
    
    it('should apply FedRAMP compliance defaults', () => {
      const context = createMockContext('fedramp-moderate');
      const spec = createMockSpec();
      
      const builder = new EcrRepositoryComponentConfigBuilder({ context, spec });
      const config = builder.buildSync();
      
      expect(config.monitoring?.enabled).toBe(true);
      expect(config.monitoring?.detailedMetrics).toBe(true); // Overridden by FedRAMP platform config
    });
    
  });
  
  describe('ConfigurationPrecedence__ComponentOverrides__OverridesPlatformDefaults', () => {
    
    it('should apply component overrides over platform defaults', () => {
      const context = createMockContext('commercial');
      const spec = createMockSpec({
        monitoring: {
          enabled: false,
          detailedMetrics: false
        },
        imageScanningConfiguration: {
          scanOnPush: true
        }
      });
      
      const builder = new EcrRepositoryComponentConfigBuilder({ context, spec });
      const config = builder.buildSync();
      
      // Verify component config overrides platform defaults
      expect(config.monitoring?.enabled).toBe(false);
      expect(config.monitoring?.detailedMetrics).toBe(false);
      expect(config.imageScanningConfiguration?.scanOnPush).toBe(true);
    });
    
  });
  
  describe('ConfigurationValidation__InvalidInput__HandlesGracefully', () => {
    
    it('should handle invalid configuration gracefully', () => {
      const context = createMockContext();
      const spec = createMockSpec({
        repositoryName: '', // Invalid empty name
        lifecyclePolicy: {
          maxImageCount: -1, // Invalid negative value
          maxImageAge: 0 // Invalid zero value
        }
      });
      
      const builder = new EcrRepositoryComponentConfigBuilder({ context, spec });
      
      // Should not throw during construction, validation happens in buildSync
      expect(() => builder.buildSync()).not.toThrow();
    });
    
  });
  
});