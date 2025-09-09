/**
 * CloudFrontDistributionComponent ConfigBuilder Test Suite
 * Implements Platform Testing Standard v1.0 - ConfigBuilder Testing
 */

import { CloudFrontDistributionComponentConfigBuilder, CloudFrontDistributionConfig } from '../cloudfront-distribution.builder';
import { ComponentContext, ComponentSpec } from '../../../platform/contracts/component-interfaces';

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

const createMockSpec = (config: Partial<CloudFrontDistributionConfig> = {}): ComponentSpec => ({
  name: 'test-cloudfront-distribution',
  type: 'cloudfront-distribution',
  config
});

describe('CloudFrontDistributionComponentConfigBuilder', () => {
  
  describe('Hardcoded Fallbacks (Layer 1)', () => {
    
    it('should provide ultra-safe baseline configuration', () => {
      const context = createMockContext();
      const spec = createMockSpec();
      
      const builder = new CloudFrontDistributionComponentConfigBuilder(context, spec);
      const config = builder.buildSync();
      
      // Verify hardcoded fallbacks are applied
      expect(config.monitoring?.enabled).toBe(true);
      expect(config.monitoring?.detailedMetrics).toBe(false);
      expect(config.tags).toBeDefined();
    });
    
  });
  
  describe('Compliance Framework Defaults (Layer 2)', () => {
    
    it('should apply commercial compliance defaults', () => {
      const context = createMockContext('commercial');
      const spec = createMockSpec();
      
      const builder = new CloudFrontDistributionComponentConfigBuilder(context, spec);
      const config = builder.buildSync();
      
      expect(config.monitoring?.enabled).toBe(true);
      expect(config.monitoring?.detailedMetrics).toBe(true);
    });
    
    it('should apply FedRAMP compliance defaults', () => {
      const context = createMockContext('fedramp-moderate');
      const spec = createMockSpec();
      
      const builder = new CloudFrontDistributionComponentConfigBuilder(context, spec);
      const config = builder.buildSync();
      
      expect(config.monitoring?.enabled).toBe(true);
      expect(config.monitoring?.detailedMetrics).toBe(true); // Mandatory for FedRAMP
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
      
      const builder = new CloudFrontDistributionComponentConfigBuilder(context, spec);
      const config = builder.buildSync();
      
      // Verify component config overrides platform defaults
      expect(config.monitoring?.enabled).toBe(false);
      expect(config.monitoring?.detailedMetrics).toBe(false);
    });
    
  });
  
});