/**
 * IamRoleComponent ConfigBuilder Test Suite
 * Implements Platform Testing Standard v1.0 - ConfigBuilder Testing
 */

import { IamRoleConfigBuilder, IamRoleConfig } from '../src/iam-role.builder';
import { ComponentContext, ComponentSpec } from '../../../../src/platform/contracts/component-interfaces';
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
      
      const builder = new IamRoleConfigBuilder({ context, spec });
      const config = builder.buildSync();
      
      // Verify hardcoded fallbacks are applied
      expect(config.role.assumedBy.service).toBe('ec2.amazonaws.com');
      expect(config.role.maxSessionDuration).toBe(3600);
      expect(config.role.path).toBe('/');
      expect(config.compliance?.leastPrivilege).toBe(true);
      expect(config.tags).toBeDefined();
    });
    
  });
  
  describe('Compliance Framework Defaults (Layer 2)', () => {
    
    it('should apply commercial compliance defaults', () => {
      const context = createMockContext('commercial');
      const spec = createMockSpec();
      
      const builder = new IamRoleConfigBuilder({ context, spec });
      const config = builder.buildSync();
      
      expect(config.compliance?.permissionsBoundary).toBe(false);
      expect(config.compliance?.requireMfa).toBe(false);
    });
    
    it('should apply FedRAMP compliance defaults', () => {
      const context = createMockContext('fedramp-moderate');
      const spec = createMockSpec();
      
      const builder = new IamRoleConfigBuilder({ context, spec });
      const config = builder.buildSync();
      
      expect(config.compliance?.permissionsBoundary).toBe(true);
      expect(config.compliance?.requireMfa).toBe(true);
    });
    
  });
  
  describe('5-Layer Precedence Chain', () => {
    
    it('should apply component overrides over platform defaults', () => {
      const context = createMockContext('commercial');
      const spec = createMockSpec({
        role: {
          assumedBy: {
            service: 'lambda.amazonaws.com'
          },
          maxSessionDuration: 7200
        }
      });
      
      const builder = new IamRoleConfigBuilder({ context, spec });
      const config = builder.buildSync();
      
      // Verify component config overrides platform defaults
      expect(config.role.assumedBy.service).toBe('lambda.amazonaws.com');
      expect(config.role.maxSessionDuration).toBe(7200);
    });
    
  });
  
});