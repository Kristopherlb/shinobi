/**
 * IamRoleComponent ConfigBuilder Test Suite
 * Implements Platform Testing Standard v1.0 - ConfigBuilder Testing
 */

import { IamRoleComponentConfigBuilder, IamRoleConfig } from '../src/iam-role.builder';
import { ComponentContext, ComponentSpec } from '@shinobi/core';
import { Stack } from 'aws-cdk-lib';

const createMockContext = (
  complianceFramework: 'commercial' | 'fedramp-moderate' | 'fedramp-high' = 'commercial',
  environment: string = 'dev'
): ComponentContext => {
  const stack = new Stack();
  return {
    serviceName: 'test-service',
    environment,
    complianceFramework,
    scope: stack,
    region: 'us-east-1',
    accountId: '123456789012',
    serviceLabels: {
      'service-name': 'test-service',
      'environment': environment,
      'compliance-framework': complianceFramework
    }
  };
};

const createMockSpec = (config: Partial<IamRoleConfig> = {}): ComponentSpec => ({
  name: 'test-iam-role',
  type: 'iam-role',
  config
});

describe('IamRoleConfigBuilder', () => {
  
  describe('Hardcoded Fallbacks (Layer 1)', () => {
    
    it('should provide ultra-safe baseline configuration', () => {
      const context = createMockContext();
      const spec = createMockSpec();
      
      const builder = new IamRoleComponentConfigBuilder(context, spec);
      const config = builder.buildSync();
      
      // Verify hardcoded fallbacks are applied
      expect(config.assumedBy).toEqual([]);
      expect(config.maxSessionDuration).toBe(3600);
      expect(config.path).toBe('/');
      expect(config.tags).toBeDefined();
    });
    
  });
  
  describe('Compliance Framework Defaults (Layer 2)', () => {
    
    it('should apply commercial compliance defaults', () => {
      const context = createMockContext('commercial');
      const spec = createMockSpec();
      
      const builder = new IamRoleComponentConfigBuilder(context, spec);
      const config = builder.buildSync();
      
      expect(config.controls?.enforceBoundary).toBe(false);
      expect(config.controls?.trustPolicies?.enforceMfa).toBe(false);
    });
    
    it('should apply FedRAMP compliance defaults', () => {
      const context = createMockContext('fedramp-moderate');
      const spec = createMockSpec();
      
      const builder = new IamRoleComponentConfigBuilder(context, spec);
      const config = builder.buildSync();
      
      expect(config.controls?.enforceBoundary).toBe(true);
      expect(config.controls?.trustPolicies?.enforceMfa).toBe(true);
    });
    
  });
  
  describe('5-Layer Precedence Chain', () => {
    
    it('should apply component overrides over platform defaults', () => {
      const context = createMockContext('commercial');
      const spec = createMockSpec({
        assumedBy: [
          {
            service: 'lambda.amazonaws.com'
          }
        ],
        maxSessionDuration: 7200
      });
      
      const builder = new IamRoleComponentConfigBuilder(context, spec);
      const config = builder.buildSync();
      
      // Verify component config overrides platform defaults
      expect(config.assumedBy?.[0]?.service).toBe('lambda.amazonaws.com');
      expect(config.maxSessionDuration).toBe(7200);
    });
    
  });
  
});
