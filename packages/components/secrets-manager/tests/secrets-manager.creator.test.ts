/**
 * SecretsManagerComponent Creator Test Suite
 * Tests component creator validation logic
 */

import { describe, it, expect } from 'vitest';
import { App, Stack, Environment } from 'aws-cdk-lib';
import { SecretsManagerComponentCreator } from '../secrets-manager.creator.js';
import { SecretsManagerConfig } from '../secrets-manager.builder.js';
import { ComponentContext, ComponentSpec } from '@shinobi/core';

const createMockContext = (
  complianceFramework: 'commercial' | 'fedramp-moderate' | 'fedramp-high' = 'commercial',
  environment: string = 'dev'
): ComponentContext => {
  const app = new App();
  const stack = new Stack(app, 'TestStack', {
    env: {
      account: '123456789012',
      region: 'us-east-1'
    } as Environment
  });
  
  return {
    serviceName: 'test-service',
    owner: 'test-team',
    environment,
    complianceFramework,
    region: 'us-east-1',
    accountId: '123456789012',
    scope: stack,
    serviceLabels: {
      'service-name': 'test-service',
      'owner': 'test-team',
      'environment': environment,
      'compliance-framework': complianceFramework
    },
    tags: {
      'service-name': 'test-service',
      'owner': 'test-team',
      'environment': environment,
      'compliance-framework': complianceFramework
    }
  };
};

const createMockSpec = (config: Partial<SecretsManagerConfig> = {}): ComponentSpec => ({
  name: 'test-secrets-manager',
  type: 'secrets-manager',
  config
});

describe('SecretsManagerComponentCreator', () => {
  const creator = new SecretsManagerComponentCreator();

  describe('validateSpec', () => {
    it('should validate component name', () => {
      const context = createMockContext();
      const spec = createMockSpec();
      
      const result = creator.validateSpec(spec, context);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid component name', () => {
      const context = createMockContext();
      const spec: ComponentSpec = {
        name: '123-invalid-name',
        type: 'secrets-manager',
        config: {}
      };
      
      const result = creator.validateSpec(spec, context);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Component name must start with a letter');
    });

    it('should detect conflicting secretValue options', () => {
      const context = createMockContext();
      const spec = createMockSpec({
        secretValue: {
          secretArn: 'arn:aws:secretsmanager:us-east-1:123456789012:secret:existing-secret',
          generateSecret: true,
          secretStringValue: 'conflicting-value'
        }
      });
      
      const result = creator.validateSpec(spec, context);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.includes('Conflicting secretValue options'))).toBe(true);
    });

    it('should detect conflict between generateSecret.enabled and secretValue.generateSecret', () => {
      const context = createMockContext();
      const spec = createMockSpec({
        generateSecret: {
          enabled: true
        },
        secretValue: {
          generateSecret: true
        }
      });
      
      const result = creator.validateSpec(spec, context);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.includes('Conflicting generateSecret options'))).toBe(true);
    });

    it('should require allowUnsafePlainText for direct secretStringValue', () => {
      const context = createMockContext();
      const spec = createMockSpec({
        secretValue: {
          secretStringValue: 'sensitive-value'
          // Missing allowUnsafePlainText: true
        }
      });
      
      const result = creator.validateSpec(spec, context);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.includes('allowUnsafePlainText'))).toBe(true);
    });

    it('should allow secretStringValue with allowUnsafePlainText', () => {
      const context = createMockContext();
      const spec = createMockSpec({
        secretValue: {
          secretStringValue: 'non-sensitive-config-value',
          allowUnsafePlainText: true
        }
      });
      
      const result = creator.validateSpec(spec, context);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should require monitoring in production environment', () => {
      const context = createMockContext('commercial', 'prod');
      const spec = createMockSpec({
        monitoring: {
          enabled: false
        }
      });
      
      const result = creator.validateSpec(spec, context);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.includes('Monitoring must be enabled'))).toBe(true);
    });

    it('should allow monitoring disabled in non-production', () => {
      const context = createMockContext('commercial', 'dev');
      const spec = createMockSpec({
        monitoring: {
          enabled: false
        }
      });
      
      const result = creator.validateSpec(spec, context);
      expect(result.valid).toBe(true);
    });
  });

  describe('getProvidedCapabilities', () => {
    it('should return correct capability types', () => {
      const capabilities = creator.getProvidedCapabilities();
      expect(capabilities).toContain('security:secrets-manager');
      expect(capabilities).toContain('monitoring:secrets-manager');
    });
  });

  describe('getConstructHandles', () => {
    it('should return correct construct handles', () => {
      const handles = creator.getConstructHandles();
      expect(handles).toContain('main');
      expect(handles).toContain('secret');
      expect(handles).toContain('kmsKey');
      expect(handles).toContain('rotationLambda');
    });
  });
});

