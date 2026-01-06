/**
 * Unit tests for SecurityGroupImportComponent
 * 
 * Tests component synthesis, construct creation, and capability exposure.
 */

import { Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { SecurityGroupImportComponent } from '../../src/security-group-import.component.js';
import { ComponentContext, ComponentSpec } from '@shinobi/core';

describe('SecurityGroupImportComponent', () => {
  let stack: Stack;
  let mockContext: ComponentContext;
  let mockSpec: ComponentSpec;

  beforeEach(() => {
    stack = new Stack();
    mockContext = {
      serviceName: 'test-service',
      environment: 'test',
      complianceFramework: 'commercial',
      scope: stack,
      region: 'us-east-1',
      accountId: '123456789012'
    };

    mockSpec = {
      name: 'test-sg-import',
      type: 'security-group-import',
      config: {
        securityGroup: {
          ssmParameterName: '/test/security-groups/web-servers'
        }
      }
    };
  });

  describe('Component Synthesis', () => {
    it('should import security group with basic configuration', () => {
      const component = new SecurityGroupImportComponent(stack, 'TestSgImport', mockContext, mockSpec);
      const template = Template.fromStack(stack);

      // Should not create any new AWS resources (it's an import)
      template.resourceCountIs('AWS::EC2::SecurityGroup', 0);

      // Should create SSM parameter reference
      template.hasResourceProperties('AWS::SSM::Parameter', {
        Name: '/test/security-groups/web-servers'
      });
    });

    it('should import security group with cross-region configuration', () => {
      mockSpec.config = {
        securityGroup: {
          ssmParameterName: '/cross-region/security-groups/app-sg',
          region: 'us-west-2',
          accountId: '987654321098'
        }
      };

      const component = new SecurityGroupImportComponent(stack, 'TestSgImport', mockContext, mockSpec);
      const template = Template.fromStack(stack);

      // Should not create any new AWS resources
      template.resourceCountIs('AWS::EC2::SecurityGroup', 0);
    });

    it('should import security group with VPC validation', () => {
      mockSpec.config = {
        securityGroup: {
          ssmParameterName: '/vpc-validated/security-groups/db-sg',
          vpcId: 'vpc-12345678',
          securityGroupName: 'database-security-group'
        },
        validation: {
          validateExistence: true,
          validateVpc: true,
          validationTimeout: 60
        }
      };

      const component = new SecurityGroupImportComponent(stack, 'TestSgImport', mockContext, mockSpec);
      const template = Template.fromStack(stack);

      // Should not create any new AWS resources
      template.resourceCountIs('AWS::EC2::SecurityGroup', 0);
    });

    it('should import security group without validation', () => {
      mockSpec.config = {
        securityGroup: {
          ssmParameterName: '/no-validation/security-groups/simple-sg'
        },
        validation: {
          validateExistence: false,
          validateVpc: false
        }
      };

      const component = new SecurityGroupImportComponent(stack, 'TestSgImport', mockContext, mockSpec);
      const template = Template.fromStack(stack);

      // Should not create any new AWS resources
      template.resourceCountIs('AWS::EC2::SecurityGroup', 0);
    });
  });

  describe('Component Interface', () => {
    it('should expose security group construct via getConstruct', () => {
      const component = new SecurityGroupImportComponent(stack, 'TestSgImport', mockContext, mockSpec);
      const securityGroup = component.getConstruct('securityGroup');

      expect(securityGroup).toBeDefined();
      expect(securityGroup.securityGroupId).toBeDefined();
    });

    it('should expose SSM parameter construct via getConstruct', () => {
      const component = new SecurityGroupImportComponent(stack, 'TestSgImport', mockContext, mockSpec);
      const ssmParameter = component.getConstruct('ssmParameter');

      expect(ssmParameter).toBeDefined();
      expect(ssmParameter.parameterName).toBe('/test/security-groups/web-servers');
    });

    it('should throw error for unknown construct handle', () => {
      const component = new SecurityGroupImportComponent(stack, 'TestSgImport', mockContext, mockSpec);

      expect(() => component.getConstruct('unknown')).toThrow('Unknown construct handle: unknown');
    });

    it('should expose security-group:import capability', () => {
      const component = new SecurityGroupImportComponent(stack, 'TestSgImport', mockContext, mockSpec);
      const capabilities = component.getCapabilities();

      expect(capabilities['security-group:import']).toBeDefined();
      expect(capabilities['security-group:import'].securityGroupId).toBeDefined();
      expect(capabilities['security-group:import'].ssmParameterName).toBe('/test/security-groups/web-servers');
      expect(capabilities['security-group:import'].region).toBe('us-east-1');
      expect(capabilities['security-group:import'].accountId).toBe('123456789012');
    });

    it('should expose component outputs', () => {
      const component = new SecurityGroupImportComponent(stack, 'TestSgImport', mockContext, mockSpec);
      const outputs = component.getOutputs();

      expect(outputs.securityGroupId).toBeDefined();
      expect(outputs.securityGroupArn).toBeDefined();
      expect(outputs.ssmParameterName).toBe('/test/security-groups/web-servers');
      expect(outputs.ssmParameterValue).toBeDefined();
    });
  });

  describe('Cross-Region Configuration', () => {
    it('should handle cross-region security group import', () => {
      mockSpec.config = {
        securityGroup: {
          ssmParameterName: '/cross-region/security-groups/app-sg',
          region: 'eu-west-1',
          accountId: '111111111111'
        }
      };

      const component = new SecurityGroupImportComponent(stack, 'TestSgImport', mockContext, mockSpec);
      const capabilities = component.getCapabilities();

      expect(capabilities['security-group:import'].region).toBe('eu-west-1');
      expect(capabilities['security-group:import'].accountId).toBe('111111111111');
    });

    it('should use current region and account when not specified', () => {
      const component = new SecurityGroupImportComponent(stack, 'TestSgImport', mockContext, mockSpec);
      const capabilities = component.getCapabilities();

      expect(capabilities['security-group:import'].region).toBe('us-east-1');
      expect(capabilities['security-group:import'].accountId).toBe('123456789012');
    });
  });

  describe('Validation Configuration', () => {
    it('should create validation resources when validation is enabled', () => {
      mockSpec.config = {
        securityGroup: {
          ssmParameterName: '/validated/security-groups/app-sg'
        },
        validation: {
          validateExistence: true,
          validateVpc: true,
          validationTimeout: 45
        }
      };

      const component = new SecurityGroupImportComponent(stack, 'TestSgImport', mockContext, mockSpec);
      const template = Template.fromStack(stack);

      // Should create custom resource for validation
      template.hasResourceProperties('AWS::CloudFormation::CustomResource', {
        SecurityGroupId: { Ref: expect.any(String) },
        VpcId: undefined,
        ValidateVpc: true,
        Timeout: 45
      });
    });

    it('should not create validation resources when validation is disabled', () => {
      mockSpec.config = {
        securityGroup: {
          ssmParameterName: '/no-validation/security-groups/app-sg'
        },
        validation: {
          validateExistence: false
        }
      };

      const component = new SecurityGroupImportComponent(stack, 'TestSgImport', mockContext, mockSpec);
      const template = Template.fromStack(stack);

      // Should not create custom resource for validation
      template.resourceCountIs('AWS::CloudFormation::CustomResource', 0);
    });
  });

  describe('Component Type and Synthesis', () => {
    it('should return correct component type', () => {
      const component = new SecurityGroupImportComponent(stack, 'TestSgImport', mockContext, mockSpec);

      expect(component.getType()).toBe('security-group-import');
    });

    it('should complete synthesis without errors', () => {
      const component = new SecurityGroupImportComponent(stack, 'TestSgImport', mockContext, mockSpec);

      expect(() => component.synth()).not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle missing SSM parameter name gracefully', () => {
      mockSpec.config = {
        securityGroup: {} // Missing ssmParameterName
      };

      expect(() => {
        new SecurityGroupImportComponent(stack, 'TestSgImport', mockContext, mockSpec);
      }).toThrow();
    });

    it('should handle invalid SSM parameter name format', () => {
      mockSpec.config = {
        securityGroup: {
          ssmParameterName: 'invalid-parameter-name' // Invalid format
        }
      };

      expect(() => {
        new SecurityGroupImportComponent(stack, 'TestSgImport', mockContext, mockSpec);
      }).toThrow();
    });
  });
});
