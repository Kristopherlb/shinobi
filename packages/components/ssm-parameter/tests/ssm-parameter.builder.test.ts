/**
 * Unit tests for SsmParameterConfigBuilder
 * 
 * Tests the 5-layer configuration precedence chain and compliance framework defaults
 */

import { SsmParameterConfigBuilder, SsmParameterConfig } from '../ssm-parameter.builder';
import { ComponentContext, ComponentSpec } from '../../../../src/platform/contracts/component-interfaces';

// Mock context helper
function createMockContext(complianceFramework: string = 'commercial'): ComponentContext {
  return {
    serviceName: 'test-service',
    environment: 'test',
    region: 'us-east-1',
    complianceFramework: complianceFramework as any,
    scope: {} as any
  };
}

// Mock spec helper
function createMockSpec(config: Partial<SsmParameterConfig> = {}): ComponentSpec {
  return {
    name: 'test-parameter',
    type: 'ssm-parameter',
    config: {
      parameterName: '/test/parameter',
      ...config
    }
  };
}

describe('SsmParameterConfigBuilder', () => {
  describe('Compliance Framework Defaults', () => {
    it('should apply commercial defaults', () => {
      const context = createMockContext('commercial');
      const spec = createMockSpec();
      const builder = new SsmParameterConfigBuilder({ context, spec });

      const config = builder.buildSync();

      expect(config.parameterType).toBe('configuration');
      expect(config.sensitivityLevel).toBe('internal');
      expect(config.validationPattern).toBe('custom');
      expect(config.tags?.['platform-managed']).toBe('true');
    });

    it('should apply fedramp-moderate defaults', () => {
      const context = createMockContext('fedramp-moderate');
      const spec = createMockSpec();
      const builder = new SsmParameterConfigBuilder({ context, spec });

      const config = builder.buildSync();

      expect(config.parameterType).toBe('secret'); // Required for sensitive configuration
      expect(config.sensitivityLevel).toBe('confidential'); // Advanced features for compliance
      expect(config.tags?.['compliance-framework']).toBe('fedramp-moderate');
      expect(config.tags?.['data-classification']).toBe('sensitive');
    });

    it('should apply fedramp-high defaults', () => {
      const context = createMockContext('fedramp-high');
      const spec = createMockSpec();
      const builder = new SsmParameterConfigBuilder({ context, spec });

      const config = builder.buildSync();

      expect(config.parameterType).toBe('secret'); // Mandatory for high compliance
      expect(config.sensitivityLevel).toBe('confidential'); // Required features
      expect(config.tags?.['compliance-framework']).toBe('fedramp-high');
      expect(config.tags?.['data-classification']).toBe('confidential');
      expect(config.tags?.['retention-period']).toBe('indefinite');
    });
  });

  describe('Configuration Precedence Chain', () => {
    it('should apply hardcoded fallbacks as baseline', () => {
      const context = createMockContext('commercial');
      const spec = createMockSpec({});
      const builder = new SsmParameterConfigBuilder({ context, spec });

      const config = builder.buildSync();

      expect(config.parameterType).toBe('configuration');
      expect(config.sensitivityLevel).toBe('internal');
      expect(config.validationPattern).toBe('custom');
      expect(config.tags?.['platform-managed']).toBe('true');
    });

    it('should allow component overrides to win over compliance defaults', () => {
      const context = createMockContext('fedramp-moderate');
      const spec = createMockSpec({
        parameterType: 'configuration', // Override compliance requirement
        sensitivityLevel: 'internal', // Override compliance requirement
        description: 'Custom parameter description'
      });
      const builder = new SsmParameterConfigBuilder({ context, spec });

      const config = builder.buildSync();

      expect(config.parameterType).toBe('configuration'); // Component override wins
      expect(config.sensitivityLevel).toBe('internal'); // Component override wins
      expect(config.description).toBe('Custom parameter description');
    });

    it('should merge nested configuration objects correctly', () => {
      const context = createMockContext('commercial');
      const spec = createMockSpec({
        encryption: {
          kmsKeyArn: 'arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012'
        },
        tags: {
          'custom-tag': 'custom-value'
        }
      });
      const builder = new SsmParameterConfigBuilder({ context, spec });

      const config = builder.buildSync();

      expect(config.encryption?.kmsKeyArn).toBe('arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012');
      expect(config.tags?.['custom-tag']).toBe('custom-value');
      expect(config.tags?.['platform-managed']).toBe('true'); // Default should still be there
    });

    it('should handle complex configuration overrides', () => {
      const context = createMockContext('fedramp-high');
      const spec = createMockSpec({
        description: 'Production database password',
        value: 'super-secret-password',
        validationPattern: 'custom',
        customValidationPattern: '^[a-zA-Z0-9!@#$%^&*()_+=-]{12,}$',
        tags: {
          'environment': 'production',
          'team': 'platform'
        }
      });
      const builder = new SsmParameterConfigBuilder({ context, spec });

      const config = builder.buildSync();

      expect(config.description).toBe('Production database password');
      expect(config.value).toBe('super-secret-password');
      expect(config.validationPattern).toBe('custom');
      expect(config.customValidationPattern).toBe('^[a-zA-Z0-9!@#$%^&*()_+=-]{12,}$');
      expect(config.tags?.['environment']).toBe('production');
      expect(config.tags?.['team']).toBe('platform');
      // Compliance defaults should still apply
      expect(config.parameterType).toBe('secret');
      expect(config.sensitivityLevel).toBe('confidential');
      expect(config.tags?.['compliance-framework']).toBe('fedramp-high');
    });

    it('should preserve parameter name from spec', () => {
      const context = createMockContext('commercial');
      const spec = createMockSpec({
        parameterName: '/my/custom/parameter/path'
      });
      const builder = new SsmParameterConfigBuilder({ context, spec });

      const config = builder.buildSync();

      expect(config.parameterName).toBe('/my/custom/parameter/path');
    });
  });

  describe('Schema Validation', () => {
    it('should return the correct JSON schema', () => {
      const context = createMockContext();
      const spec = createMockSpec();
      const builder = new SsmParameterConfigBuilder({ context, spec });

      const schema = builder.getSchema();

      expect(schema).toBeDefined();
      expect(schema.type).toBe('object');
      expect(schema.title).toBe('SSM Parameter Configuration');
      expect(schema.required).toContain('parameterName');
      expect(schema.properties.parameterName).toBeDefined();
      expect(schema.properties.parameterType).toBeDefined();
      expect(schema.properties.sensitivityLevel).toBeDefined();
      expect(schema.properties.validationPattern).toBeDefined();
      expect(schema.properties.encryption).toBeDefined();
      expect(schema.properties.tags).toBeDefined();
    });

    it('should validate parameter name pattern', () => {
      const context = createMockContext();
      const spec = createMockSpec();
      const builder = new SsmParameterConfigBuilder({ context, spec });

      const schema = builder.getSchema();

      expect(schema.properties.parameterName.pattern).toBe('^/[a-zA-Z0-9_.-/]+$');
      expect(schema.properties.parameterName.minLength).toBe(1);
      expect(schema.properties.parameterName.maxLength).toBe(2048);
    });

    it('should define correct parameter type enums', () => {
      const context = createMockContext();
      const spec = createMockSpec();
      const builder = new SsmParameterConfigBuilder({ context, spec });

      const schema = builder.getSchema();

      expect(schema.properties.parameterType.enum).toEqual(['configuration', 'secret', 'feature-flag', 'connection-string']);
      expect(schema.properties.sensitivityLevel.enum).toEqual(['public', 'internal', 'confidential']);
      expect(schema.properties.validationPattern.enum).toEqual(['url', 'email', 'json', 'base64', 'custom']);
    });
  });
});