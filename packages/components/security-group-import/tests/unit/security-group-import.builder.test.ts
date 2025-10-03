/**
 * Unit tests for SecurityGroupImportConfigBuilder
 * 
 * Tests the 5-layer configuration precedence chain and validation.
 */

import { SecurityGroupImportConfigBuilder, SecurityGroupImportConfig } from '../../src/security-group-import.builder.ts';
import { ComponentContext, ComponentSpec } from '@shinobi/core';

describe('SecurityGroupImportConfigBuilder', () => {
  let mockContext: ComponentContext;
  let mockSpec: ComponentSpec;

  beforeEach(() => {
    mockContext = {
      serviceName: 'test-service',
      environment: 'test',
      complianceFramework: 'commercial',
      scope: {} as any,
      region: 'us-east-1',
      accountId: '123456789012'
    };

    mockSpec = {
      name: 'test-sg-import',
      type: 'security-group-import',
      config: {}
    };
  });

  describe('5-Layer Configuration Precedence', () => {
    it('should use hardcoded fallbacks when no other configuration is provided', () => {
      const builder = new SecurityGroupImportConfigBuilder({ context: mockContext, spec: mockSpec });
      const config = builder.buildSync();

      expect(config.securityGroup.ssmParameterName).toBe('/platform/security-groups/default');
      expect(config.securityGroup.region).toBeUndefined();
      expect(config.securityGroup.accountId).toBeUndefined();
      expect(config.validation?.validateExistence).toBe(true);
      expect(config.validation?.validateVpc).toBe(false);
      expect(config.validation?.validationTimeout).toBe(30);
      expect(config.tags?.Component).toBe('security-group-import');
    });

    it('should override hardcoded fallbacks with component spec configuration', () => {
      mockSpec.config = {
        securityGroup: {
          ssmParameterName: '/shared/security-groups/web-servers',
          region: 'us-west-2',
          accountId: '987654321098',
          vpcId: 'vpc-12345678',
          securityGroupName: 'web-servers-sg'
        },
        validation: {
          validateExistence: false,
          validateVpc: true,
          validationTimeout: 60
        }
      };

      const builder = new SecurityGroupImportConfigBuilder({ context: mockContext, spec: mockSpec });
      const config = builder.buildSync();

      expect(config.securityGroup.ssmParameterName).toBe('/shared/security-groups/web-servers');
      expect(config.securityGroup.region).toBe('us-west-2');
      expect(config.securityGroup.accountId).toBe('987654321098');
      expect(config.securityGroup.vpcId).toBe('vpc-12345678');
      expect(config.securityGroup.securityGroupName).toBe('web-servers-sg');
      expect(config.validation?.validateExistence).toBe(false);
      expect(config.validation?.validateVpc).toBe(true);
      expect(config.validation?.validationTimeout).toBe(60);
    });

    it('should apply environment variables in configuration', () => {
      process.env.SECURITY_GROUP_IMPORT_VALIDATION_TIMEOUT = '120';
      process.env.SECURITY_GROUP_IMPORT_VALIDATE_VPC = 'true';

      const builder = new SecurityGroupImportConfigBuilder({ context: mockContext, spec: mockSpec });
      const config = builder.buildSync();

      expect(config.validation?.validationTimeout).toBe(120);
      expect(config.validation?.validateVpc).toBe(true);

      // Cleanup
      delete process.env.SECURITY_GROUP_IMPORT_VALIDATION_TIMEOUT;
      delete process.env.SECURITY_GROUP_IMPORT_VALIDATE_VPC;
    });
  });

  describe('Configuration Validation', () => {
    it('should validate required securityGroup.ssmParameterName field', () => {
      mockSpec.config = {
        securityGroup: {} // Missing ssmParameterName
      };

      const builder = new SecurityGroupImportConfigBuilder({ context: mockContext, spec: mockSpec });
      
      expect(() => builder.buildSync()).toThrow();
    });

    it('should validate SSM parameter name format', () => {
      mockSpec.config = {
        securityGroup: {
          ssmParameterName: 'invalid-parameter-name' // Invalid format (missing leading slash)
        }
      };

      const builder = new SecurityGroupImportConfigBuilder({ context: mockContext, spec: mockSpec });
      
      expect(() => builder.buildSync()).toThrow();
    });

    it('should validate region format', () => {
      mockSpec.config = {
        securityGroup: {
          ssmParameterName: '/valid/parameter',
          region: 'invalid-region-format' // Invalid format
        }
      };

      const builder = new SecurityGroupImportConfigBuilder({ context: mockContext, spec: mockSpec });
      
      expect(() => builder.buildSync()).toThrow();
    });

    it('should validate account ID format', () => {
      mockSpec.config = {
        securityGroup: {
          ssmParameterName: '/valid/parameter',
          accountId: 'invalid-account-id' // Invalid format
        }
      };

      const builder = new SecurityGroupImportConfigBuilder({ context: mockContext, spec: mockSpec });
      
      expect(() => builder.buildSync()).toThrow();
    });

    it('should validate VPC ID format', () => {
      mockSpec.config = {
        securityGroup: {
          ssmParameterName: '/valid/parameter',
          vpcId: 'invalid-vpc-id' // Invalid format
        }
      };

      const builder = new SecurityGroupImportConfigBuilder({ context: mockContext, spec: mockSpec });
      
      expect(() => builder.buildSync()).toThrow();
    });

    it('should validate validation timeout range', () => {
      mockSpec.config = {
        securityGroup: {
          ssmParameterName: '/valid/parameter'
        },
        validation: {
          validationTimeout: 1 // Too low
        }
      };

      const builder = new SecurityGroupImportConfigBuilder({ context: mockContext, spec: mockSpec });
      
      expect(() => builder.buildSync()).toThrow();
    });
  });

  describe('Complex Configuration Scenarios', () => {
    it('should handle cross-region security group import', () => {
      mockSpec.config = {
        securityGroup: {
          ssmParameterName: '/shared/security-groups/cross-region-sg',
          region: 'eu-west-1',
          accountId: '111111111111'
        }
      };

      const builder = new SecurityGroupImportConfigBuilder({ context: mockContext, spec: mockSpec });
      const config = builder.buildSync();

      expect(config.securityGroup.region).toBe('eu-west-1');
      expect(config.securityGroup.accountId).toBe('111111111111');
    });

    it('should handle VPC-specific validation', () => {
      mockSpec.config = {
        securityGroup: {
          ssmParameterName: '/vpc-specific/security-groups/app-sg',
          vpcId: 'vpc-abcdef12',
          securityGroupName: 'app-security-group'
        },
        validation: {
          validateExistence: true,
          validateVpc: true,
          validationTimeout: 45
        }
      };

      const builder = new SecurityGroupImportConfigBuilder({ context: mockContext, spec: mockSpec });
      const config = builder.buildSync();

      expect(config.securityGroup.vpcId).toBe('vpc-abcdef12');
      expect(config.securityGroup.securityGroupName).toBe('app-security-group');
      expect(config.validation?.validateVpc).toBe(true);
      expect(config.validation?.validationTimeout).toBe(45);
    });

    it('should handle minimal configuration with only required fields', () => {
      mockSpec.config = {
        securityGroup: {
          ssmParameterName: '/minimal/config/sg'
        }
      };

      const builder = new SecurityGroupImportConfigBuilder({ context: mockContext, spec: mockSpec });
      const config = builder.buildSync();

      expect(config.securityGroup.ssmParameterName).toBe('/minimal/config/sg');
      expect(config.securityGroup.region).toBeUndefined();
      expect(config.securityGroup.accountId).toBeUndefined();
      expect(config.validation?.validateExistence).toBe(true); // Default from fallbacks
    });
  });

  describe('Compliance Framework Integration', () => {
    it('should apply FedRAMP Moderate settings', () => {
      mockContext.complianceFramework = 'fedramp-moderate';
      
      const builder = new SecurityGroupImportConfigBuilder({ context: mockContext, spec: mockSpec });
      const config = builder.buildSync();

      // FedRAMP Moderate should have stricter validation
      expect(config.validation?.validateExistence).toBe(true);
      expect(config.validation?.validationTimeout).toBe(30);
    });

    it('should apply FedRAMP High settings', () => {
      mockContext.complianceFramework = 'fedramp-high';
      
      const builder = new SecurityGroupImportConfigBuilder({ context: mockContext, spec: mockSpec });
      const config = builder.buildSync();

      // FedRAMP High should have the strictest validation
      expect(config.validation?.validateExistence).toBe(true);
      expect(config.validation?.validateVpc).toBe(true); // Stricter validation
      expect(config.validation?.validationTimeout).toBe(30);
    });
  });
});
