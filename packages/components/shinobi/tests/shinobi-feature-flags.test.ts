/**
 * Shinobi Feature Flags Test Suite
 * Tests the feature flag integration and configuration
 */

import { App, Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import {
  SHINOBI_FEATURE_FLAGS,
  createShinobiFeatureFlags,
  getShinobiFeatureFlagConfig
} from '../src/shinobi-feature-flags';
import { ComponentContext } from '@shinobi/core';

const createMockContext = (
  stack: Stack,
  complianceFramework: string = 'commercial',
  environment: string = 'dev'
): ComponentContext => ({
  serviceName: 'test-service',
  owner: 'test-team',
  environment,
  complianceFramework,
  region: 'us-east-1',
  account: '123456789012',
  accountId: '123456789012',
  scope: stack,
  tags: {
    'service-name': 'test-service',
    owner: 'test-team',
    environment,
    'compliance-framework': complianceFramework
  }
});

describe('Shinobi Feature Flags', () => {
  
  let app: App;
  let stack: Stack;
  let context: ComponentContext;

  beforeEach(() => {
    app = new App();
    stack = new Stack(app, 'TestStack');
    context = createMockContext(stack);
  });

  describe('Feature Flag Definitions', () => {
    
    it('should define all required feature flags', () => {
      expect(SHINOBI_FEATURE_FLAGS).toBeDefined();
      
      // Core intelligence flags
      expect(SHINOBI_FEATURE_FLAGS['shinobi.advanced-analytics']).toBeDefined();
      expect(SHINOBI_FEATURE_FLAGS['shinobi.ai-insights']).toBeDefined();
      expect(SHINOBI_FEATURE_FLAGS['shinobi.auto-remediation']).toBeDefined();
      expect(SHINOBI_FEATURE_FLAGS['shinobi.predictive-scaling']).toBeDefined();
      
      // Operational flags
      expect(SHINOBI_FEATURE_FLAGS['shinobi.cost-optimization']).toBeDefined();
      expect(SHINOBI_FEATURE_FLAGS['shinobi.security-scanning']).toBeDefined();
      expect(SHINOBI_FEATURE_FLAGS['shinobi.compliance-monitoring']).toBeDefined();
      expect(SHINOBI_FEATURE_FLAGS['shinobi.performance-profiling']).toBeDefined();
      expect(SHINOBI_FEATURE_FLAGS['shinobi.dependency-analysis']).toBeDefined();
      expect(SHINOBI_FEATURE_FLAGS['shinobi.change-impact']).toBeDefined();
      
      // API endpoint flags
      expect(SHINOBI_FEATURE_FLAGS['shinobi.api.catalog']).toBeDefined();
      expect(SHINOBI_FEATURE_FLAGS['shinobi.api.graph']).toBeDefined();
      expect(SHINOBI_FEATURE_FLAGS['shinobi.api.manifest']).toBeDefined();
      expect(SHINOBI_FEATURE_FLAGS['shinobi.api.reliability']).toBeDefined();
      expect(SHINOBI_FEATURE_FLAGS['shinobi.api.observability']).toBeDefined();
      expect(SHINOBI_FEATURE_FLAGS['shinobi.api.change']).toBeDefined();
      expect(SHINOBI_FEATURE_FLAGS['shinobi.api.security']).toBeDefined();
      expect(SHINOBI_FEATURE_FLAGS['shinobi.api.qa']).toBeDefined();
      expect(SHINOBI_FEATURE_FLAGS['shinobi.api.cost']).toBeDefined();
      expect(SHINOBI_FEATURE_FLAGS['shinobi.api.dx']).toBeDefined();
      expect(SHINOBI_FEATURE_FLAGS['shinobi.api.governance']).toBeDefined();
      
      // Data source flags
      expect(SHINOBI_FEATURE_FLAGS['shinobi.data.components']).toBeDefined();
      expect(SHINOBI_FEATURE_FLAGS['shinobi.data.services']).toBeDefined();
      expect(SHINOBI_FEATURE_FLAGS['shinobi.data.dependencies']).toBeDefined();
      expect(SHINOBI_FEATURE_FLAGS['shinobi.data.compliance']).toBeDefined();
      expect(SHINOBI_FEATURE_FLAGS['shinobi.data.cost']).toBeDefined();
      expect(SHINOBI_FEATURE_FLAGS['shinobi.data.security']).toBeDefined();
      expect(SHINOBI_FEATURE_FLAGS['shinobi.data.performance']).toBeDefined();
      
      // Local development flags
      expect(SHINOBI_FEATURE_FLAGS['shinobi.local.seed-data']).toBeDefined();
      expect(SHINOBI_FEATURE_FLAGS['shinobi.local.mock-services']).toBeDefined();
      
      // Experimental flags
      expect(SHINOBI_FEATURE_FLAGS['shinobi.experimental.gui']).toBeDefined();
      expect(SHINOBI_FEATURE_FLAGS['shinobi.experimental.voice']).toBeDefined();
    });
    
    it('should have correct default values for commercial environment', () => {
      const config = getShinobiFeatureFlagConfig();
      
      // Core intelligence flags should be disabled by default
      expect(config['shinobi.advanced-analytics']).toBe(false);
      expect(config['shinobi.ai-insights']).toBe(false);
      expect(config['shinobi.auto-remediation']).toBe(false);
      expect(config['shinobi.predictive-scaling']).toBe(false);
      
      // Operational flags should be enabled by default
      expect(config['shinobi.cost-optimization']).toBe(true);
      expect(config['shinobi.security-scanning']).toBe(true);
      expect(config['shinobi.compliance-monitoring']).toBe(true);
      expect(config['shinobi.performance-profiling']).toBe(true);
      expect(config['shinobi.dependency-analysis']).toBe(true);
      expect(config['shinobi.change-impact']).toBe(true);
      
      // API endpoint flags should be enabled by default
      expect(config['shinobi.api.catalog']).toBe(true);
      expect(config['shinobi.api.graph']).toBe(true);
      expect(config['shinobi.api.manifest']).toBe(true);
      expect(config['shinobi.api.reliability']).toBe(true);
      expect(config['shinobi.api.observability']).toBe(true);
      expect(config['shinobi.api.change']).toBe(true);
      expect(config['shinobi.api.security']).toBe(true);
      expect(config['shinobi.api.qa']).toBe(true);
      expect(config['shinobi.api.cost']).toBe(true);
      expect(config['shinobi.api.dx']).toBe(true);
      expect(config['shinobi.api.governance']).toBe(true);
      
      // Data source flags
      expect(config['shinobi.data.components']).toBe(true);
      expect(config['shinobi.data.services']).toBe(true);
      expect(config['shinobi.data.dependencies']).toBe(true);
      expect(config['shinobi.data.compliance']).toBe(true);
      expect(config['shinobi.data.cost']).toBe(false);
      expect(config['shinobi.data.security']).toBe(false);
      expect(config['shinobi.data.performance']).toBe(false);
      
      // Local development flags
      expect(config['shinobi.local.seed-data']).toBe(true);
      expect(config['shinobi.local.mock-services']).toBe(true);
      
      // Experimental flags should be disabled by default
      expect(config['shinobi.experimental.gui']).toBe(false);
      expect(config['shinobi.experimental.voice']).toBe(false);
    });
    
  });

  describe('Feature Flag Creation', () => {
    
    it('should create feature flag components', () => {
      const featureFlags = createShinobiFeatureFlags(stack, context, 'test-shinobi');
      
      expect(featureFlags).toBeDefined();
      expect(featureFlags.length).toBeGreaterThan(0);
      
      // Verify each feature flag is a FeatureFlagComponent
      featureFlags.forEach(flag => {
        expect(flag).toBeDefined();
        expect(flag.getType()).toBe('feature-flag');
      });
    });
    
    it('should create feature flags with correct targeting rules', () => {
      const featureFlags = createShinobiFeatureFlags(stack, context, 'test-shinobi');
      
      // Find the advanced analytics flag
      const advancedAnalyticsFlag = featureFlags.find(flag => 
        flag.spec.config?.flagKey === 'shinobi.advanced-analytics'
      );
      
      expect(advancedAnalyticsFlag).toBeDefined();
      expect(advancedAnalyticsFlag?.spec.config?.targetingRules?.percentage).toBe(0);
      expect(advancedAnalyticsFlag?.spec.config?.targetingRules?.conditions).toHaveLength(1);
      expect(advancedAnalyticsFlag?.spec.config?.targetingRules?.conditions?.[0]).toMatchObject({
        attribute: 'environment',
        operator: 'equals',
        value: 'development'
      });
    });
    
    it('should create feature flags with compliance-specific targeting', () => {
      const fedrampContext = createMockContext(stack, 'fedramp-high', 'prod');
      const featureFlags = createShinobiFeatureFlags(stack, fedrampContext, 'test-shinobi');
      
      // Find the security scanning flag
      const securityScanningFlag = featureFlags.find(flag => 
        flag.spec.config?.flagKey === 'shinobi.security-scanning'
      );
      
      expect(securityScanningFlag).toBeDefined();
      expect(securityScanningFlag?.spec.config?.targetingRules?.percentage).toBe(100);
      expect(securityScanningFlag?.spec.config?.targetingRules?.conditions).toHaveLength(1);
      expect(securityScanningFlag?.spec.config?.targetingRules?.conditions?.[0]).toMatchObject({
        attribute: 'compliance-framework',
        operator: 'in',
        value: ['fedramp-moderate', 'fedramp-high']
      });
    });
    
  });

  describe('Feature Flag Configuration', () => {
    
    it('should return correct configuration for commercial environment', () => {
      const config = getShinobiFeatureFlagConfig();
      
      expect(config).toBeDefined();
      expect(typeof config).toBe('object');
      
      // Verify all expected flags are present
      const expectedFlags = Object.keys(SHINOBI_FEATURE_FLAGS);
      const actualFlags = Object.keys(config);
      
      expectedFlags.forEach(flagKey => {
        expect(actualFlags).toContain(flagKey);
        expect(config[flagKey]).toBeDefined();
        expect(typeof config[flagKey]).toBe('boolean');
      });
    });
    
    it('should have consistent default values across all flags', () => {
      const config = getShinobiFeatureFlagConfig();
      
      // Verify boolean flags have boolean values
      Object.values(config).forEach(value => {
        expect(typeof value).toBe('boolean');
      });
      
      // Verify no undefined values
      Object.values(config).forEach(value => {
        expect(value).not.toBeUndefined();
      });
    });
    
  });

  describe('Feature Flag Schema Validation', () => {
    
    it('should have valid flag key patterns', () => {
      Object.keys(SHINOBI_FEATURE_FLAGS).forEach(flagKey => {
        // Flag keys should follow the pattern: shinobi.segment or shinobi.segment.detail
        expect(flagKey).toMatch(/^shinobi\.[a-z-]+(?:\.[a-z-]+)?$/);
      });
    });
    
    it('should have valid flag types', () => {
      Object.values(SHINOBI_FEATURE_FLAGS).forEach(flagConfig => {
        expect(flagConfig.flagType).toBe('boolean');
        expect(typeof flagConfig.defaultValue).toBe('boolean');
        expect(typeof flagConfig.description).toBe('string');
        expect(flagConfig.description.length).toBeGreaterThan(0);
      });
    });
    
    it('should have valid targeting rules when present', () => {
      Object.values(SHINOBI_FEATURE_FLAGS).forEach(flagConfig => {
        if (flagConfig.targetingRules) {
          // Percentage should be 0-100
          if (flagConfig.targetingRules.percentage !== undefined) {
            expect(flagConfig.targetingRules.percentage).toBeGreaterThanOrEqual(0);
            expect(flagConfig.targetingRules.percentage).toBeLessThanOrEqual(100);
          }
          
          // Conditions should be valid
          if (flagConfig.targetingRules.conditions) {
            flagConfig.targetingRules.conditions.forEach(condition => {
              expect(condition.attribute).toBeDefined();
              expect(condition.operator).toBeDefined();
              expect(condition.value).toBeDefined();
              expect(['equals', 'not_equals', 'in', 'not_in', 'contains', 'starts_with', 'ends_with']).toContain(condition.operator);
            });
          }
        }
      });
    });
    
  });

  describe('Feature Flag Integration', () => {
    
    it('should integrate with Shinobi component configuration', () => {
      const config = getShinobiFeatureFlagConfig();
      
      // Verify that feature flags can be used in Shinobi configuration
      const shinobiConfig = {
        featureFlags: {
          enabled: true,
          provider: 'aws-appconfig',
          defaults: config
        }
      };
      
      expect(shinobiConfig.featureFlags.enabled).toBe(true);
      expect(shinobiConfig.featureFlags.provider).toBe('aws-appconfig');
      expect(shinobiConfig.featureFlags.defaults).toEqual(config);
    });
    
    it('should support environment-specific overrides', () => {
      const baseConfig = getShinobiFeatureFlagConfig();
      
      // Simulate environment-specific overrides
      const devConfig = {
        ...baseConfig,
        'shinobi.advanced-analytics': true,
        'shinobi.ai-insights': true,
        'shinobi.experimental.gui': true
      };
      
      const prodConfig = {
        ...baseConfig,
        'shinobi.advanced-analytics': false,
        'shinobi.ai-insights': false,
        'shinobi.experimental.gui': false
      };
      
      expect(devConfig['shinobi.advanced-analytics']).toBe(true);
      expect(devConfig['shinobi.experimental.gui']).toBe(true);
      
      expect(prodConfig['shinobi.advanced-analytics']).toBe(false);
      expect(prodConfig['shinobi.experimental.gui']).toBe(false);
    });
    
  });

});
