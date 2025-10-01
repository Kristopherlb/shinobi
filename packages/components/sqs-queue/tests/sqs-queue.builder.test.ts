/**
 * SqsQueueNew ConfigBuilder Test Suite
 * Implements Platform Testing Standard v1.0 - ConfigBuilder Testing
 * 
 * @author Platform Team
 */

import { SqsQueueNewConfigBuilder, SqsQueueNewConfig } from '../sqs-queue-new.builder.js';
import { ComponentContext, ComponentSpec } from '../../../platform/contracts/component-interfaces.js';

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

const createMockSpec = (config: Partial<SqsQueueNewConfig> = {}): ComponentSpec => ({
  name: 'test-sqs-queue-new',
  type: 'sqs-queue-new',
  config
});

describe('SqsQueueNewConfigBuilder', () => {
  
  describe('Hardcoded Fallbacks (Layer 1)', () => {
    
    it('should provide ultra-safe baseline configuration', () => {
      const context = createMockContext();
      const spec = createMockSpec();
      
      const builder = new SqsQueueNewConfigBuilder(context, spec);
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
      
      const builder = new SqsQueueNewConfigBuilder(context, spec);
      const config = builder.buildSync();
      
      expect(config.monitoring?.enabled).toBe(true);
      expect(config.monitoring?.detailedMetrics).toBe(true);
    });
    
    it('should apply FedRAMP moderate compliance defaults', () => {
      const context = createMockContext('fedramp-moderate');
      const spec = createMockSpec();
      
      const builder = new SqsQueueNewConfigBuilder(context, spec);
      const config = builder.buildSync();
      
      expect(config.monitoring?.enabled).toBe(true);
      expect(config.monitoring?.detailedMetrics).toBe(true); // Mandatory for FedRAMP
    });
    
    it('should apply FedRAMP high compliance defaults', () => {
      const context = createMockContext('fedramp-high');
      const spec = createMockSpec();
      
      const builder = new SqsQueueNewConfigBuilder(context, spec);
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
      
      const builder = new SqsQueueNewConfigBuilder(context, spec);
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
          // detailedMetrics not specified - should come from defaults
        }
      });
      
      const builder = new SqsQueueNewConfigBuilder(context, spec);
      const config = builder.buildSync();
      
      // Component override should win for enabled
      expect(config.monitoring?.enabled).toBe(false);
      // Default should win for detailedMetrics
      expect(config.monitoring?.detailedMetrics).toBe(true);
    });
    
  });
  
  describe('Schema Validation', () => {
    
    it('should return the component schema', () => {
      const context = createMockContext();
      const spec = createMockSpec();
      
      const builder = new SqsQueueNewConfigBuilder(context, spec);
      const schema = builder.getSchema();
      
      expect(schema).toBeDefined();
      expect(schema.type).toBe('object');
      expect(schema.properties).toBeDefined();
    });
    
  });
  
});