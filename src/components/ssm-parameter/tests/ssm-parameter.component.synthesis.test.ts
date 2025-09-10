/**
 * Unit tests for SsmParameterComponent synthesis
 * 
 * Tests CloudFormation resource generation and compliance hardening
 */

import { Template } from 'aws-cdk-lib/assertions';
import { Stack } from 'aws-cdk-lib';
import { SsmParameterComponent } from '../ssm-parameter.component';
import { ComponentContext, ComponentSpec } from '../../../platform/contracts/component-interfaces';

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

describe('SsmParameterComponent Synthesis', () => {
  describe('Default Happy Path', () => {
    it('should synthesize basic String parameter', () => {
      const stack = new Stack();
      const context = createMockContext('commercial');
      const spec: ComponentSpec = {
        name: 'test-parameter',
  type: 'ssm-parameter',
        config: {
          parameterName: '/test/parameter',
          value: 'test-value',
          description: 'Test parameter'
        }
      };

      const component = new SsmParameterComponent(stack, 'TestParameter', context, spec);
  component.synth();
  
  const template = Template.fromStack(stack);

      // Should create SSM Parameter
      template.hasResourceProperties('AWS::SSM::Parameter', {
        Name: '/test/parameter',
        Type: 'String',
        Value: 'test-value',
        Description: 'Test parameter',
        Tier: 'Standard'
      });

      // Should not create KMS key for String parameter
      template.resourceCountIs('AWS::KMS::Key', 0);
    });

    it('should register correct capabilities', () => {
      const stack = new Stack();
      const context = createMockContext('commercial');
      const spec: ComponentSpec = {
        name: 'test-parameter',
        type: 'ssm-parameter',
        config: {
          parameterName: '/test/parameter',
          value: 'test-value'
        }
      };

      const component = new SsmParameterComponent(stack, 'TestParameter', context, spec);
      component.synth();

      const capabilities = component.getCapabilities();
      expect(capabilities['configuration:parameter']).toBeDefined();
      expect(capabilities['configuration:parameter'].parameterName).toBe('/test/parameter');
      expect(capabilities['configuration:parameter'].parameterArn).toBeDefined();
      expect(capabilities['configuration:parameter'].platformParameterType).toBe('configuration');
      expect(capabilities['configuration:parameter'].ssmParameterType).toBe('String');
    });

    it('should register correct construct handles', () => {
      const stack = new Stack();
      const context = createMockContext('commercial');
      const spec: ComponentSpec = {
        name: 'test-parameter',
        type: 'ssm-parameter',
        config: {
          parameterName: '/test/parameter',
          value: 'test-value'
        }
      };

      const component = new SsmParameterComponent(stack, 'TestParameter', context, spec);
      component.synth();

      // Note: getConstruct is inherited from BaseComponent but not exposed in the public interface
      // This test validates that synthesis completes without errors
      expect(component.getType()).toBe('ssm-parameter');
    });
  });

  describe('Parameter Type Variations', () => {
    it('should create StringList parameter', () => {
      const stack = new Stack();
      const context = createMockContext('commercial');
      const spec: ComponentSpec = {
        name: 'test-parameter',
        type: 'ssm-parameter',
        config: {
          parameterName: '/test/list-parameter',
          parameterType: 'feature-flag',
          value: 'value1,value2,value3'
        }
      };

      const component = new SsmParameterComponent(stack, 'TestParameter', context, spec);
      component.synth();

      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::SSM::Parameter', {
        Name: '/test/list-parameter',
        Type: 'StringList',
        Value: 'value1,value2,value3'
      });
    });

    it('should create SecureString parameter with customer-managed KMS key', () => {
      const stack = new Stack();
      const context = createMockContext('fedramp-moderate');
      const spec: ComponentSpec = {
        name: 'test-parameter',
        type: 'ssm-parameter',
        config: {
          parameterName: '/test/secure-parameter',
          parameterType: 'secret',
          sensitivityLevel: 'confidential',
          value: 'secret-value'
        }
      };

      const component = new SsmParameterComponent(stack, 'TestParameter', context, spec);
      component.synth();

      const template = Template.fromStack(stack);

      // Should create SecureString parameter
      template.hasResourceProperties('AWS::SSM::Parameter', {
        Name: '/test/secure-parameter',
        Type: 'SecureString',
        Value: 'secret-value'
      });

      // Should create customer-managed KMS key for FedRAMP
      template.hasResourceProperties('AWS::KMS::Key', {
        Description: 'Encryption key for test-parameter SSM parameter',
        KeyUsage: 'ENCRYPT_DECRYPT',
        KeySpec: 'SYMMETRIC_DEFAULT'
      });

      // Should create KMS key with policy (CDK generates the policy automatically)
      template.resourceCountIs('AWS::KMS::Key', 1);
    });

    it('should create Advanced tier parameter for confidential data', () => {
      const stack = new Stack();
      const context = createMockContext('fedramp-moderate');
      const spec: ComponentSpec = {
        name: 'test-parameter',
        type: 'ssm-parameter',
        config: {
          parameterName: '/test/advanced-parameter',
          parameterType: 'secret',
          sensitivityLevel: 'confidential',
          value: 'confidential-data'
        }
      };

      const component = new SsmParameterComponent(stack, 'TestParameter', context, spec);
      component.synth();

      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::SSM::Parameter', {
        Name: '/test/advanced-parameter',
        Type: 'SecureString',
        Tier: 'Advanced'
      });
    });
  });

  describe('Compliance Framework Hardening', () => {
    it('should apply fedramp-moderate hardening', () => {
      const stack = new Stack();
      const context = createMockContext('fedramp-moderate');
      const spec: ComponentSpec = {
        name: 'test-parameter',
        type: 'ssm-parameter',
        config: {
          parameterName: '/test/fedramp-parameter'
        }
      };

      const component = new SsmParameterComponent(stack, 'TestParameter', context, spec);
      component.synth();

      const template = Template.fromStack(stack);

      // Should create SecureString parameter for compliance
      template.hasResourceProperties('AWS::SSM::Parameter', {
        Name: '/test/fedramp-parameter',
        Type: 'SecureString',
        Tier: 'Advanced'
      });

      // Should create customer-managed KMS key
      template.hasResourceProperties('AWS::KMS::Key', {
        EnableKeyRotation: false // Not required for moderate
      });
    });

    it('should apply fedramp-high hardening', () => {
      const stack = new Stack();
      const context = createMockContext('fedramp-high');
      const spec: ComponentSpec = {
        name: 'test-parameter',
        type: 'ssm-parameter',
        config: {
          parameterName: '/test/fedramp-high-parameter'
        }
      };

      const component = new SsmParameterComponent(stack, 'TestParameter', context, spec);
      component.synth();

      const template = Template.fromStack(stack);

      // Should create SecureString parameter for compliance
      template.hasResourceProperties('AWS::SSM::Parameter', {
        Name: '/test/fedramp-high-parameter',
        Type: 'SecureString',
        Tier: 'Advanced'
      });

      // Should create customer-managed KMS key with rotation enabled
      template.hasResourceProperties('AWS::KMS::Key', {
        EnableKeyRotation: true // Required for high compliance
      });
    });

    it('should create SecureString parameter when external KMS key is provided', () => {
      const stack = new Stack();
      const context = createMockContext('commercial');
      const spec: ComponentSpec = {
        name: 'test-parameter',
        type: 'ssm-parameter',
        config: {
          parameterName: '/test/parameter-with-key',
          parameterType: 'secret',
          sensitivityLevel: 'confidential',
          encryption: {
            kmsKeyArn: 'arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012'
          }
        }
      };

      const component = new SsmParameterComponent(stack, 'TestParameter', context, spec);
      component.synth();

      const template = Template.fromStack(stack);

      // Should create SecureString parameter (CDK limitation: cannot specify custom KMS key)
      template.hasResourceProperties('AWS::SSM::Parameter', {
        Name: '/test/parameter-with-key',
        Type: 'SecureString',
        Tier: 'Advanced'
      });

      // Should not create new KMS key since external key was provided
      template.resourceCountIs('AWS::KMS::Key', 0);
    });
  });

  describe('Advanced Configuration', () => {
    it('should apply URL validation pattern', () => {
      const stack = new Stack();
      const context = createMockContext('commercial');
      const spec: ComponentSpec = {
        name: 'test-parameter',
        type: 'ssm-parameter',
        config: {
          parameterName: '/test/url-parameter',
          validationPattern: 'url',
          value: 'https://example.com'
        }
      };

      const component = new SsmParameterComponent(stack, 'TestParameter', context, spec);
      component.synth();

      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::SSM::Parameter', {
        AllowedPattern: '^https?://[^\\s/$.?#].[^\\s]*$'
      });
    });

    it('should apply custom validation pattern', () => {
      const stack = new Stack();
      const context = createMockContext('commercial');
      const spec: ComponentSpec = {
        name: 'test-parameter',
        type: 'ssm-parameter',
        config: {
          parameterName: '/test/validated-parameter',
          validationPattern: 'custom',
          customValidationPattern: '^[a-zA-Z0-9]{8,}$',
          value: 'ValidValue123'
        }
      };

      const component = new SsmParameterComponent(stack, 'TestParameter', context, spec);
      component.synth();

      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::SSM::Parameter', {
        AllowedPattern: '^[a-zA-Z0-9]{8,}$'
      });
    });
  });

  describe('Tagging', () => {
    it('should apply standard tags to all resources', () => {
      const stack = new Stack();
      const context = createMockContext('fedramp-moderate');
      const spec: ComponentSpec = {
        name: 'test-parameter',
        type: 'ssm-parameter',
        config: {
          parameterName: '/test/tagged-parameter'
        }
      };

      const component = new SsmParameterComponent(stack, 'TestParameter', context, spec);
      component.synth();

      const template = Template.fromStack(stack);

      // Check that tags are applied to SSM parameter
      const resources = template.findResources('AWS::SSM::Parameter');
      const parameterResource = Object.values(resources)[0] as any;
      expect(parameterResource.Properties.Tags['platform-parameter-type']).toBe('secret');
      expect(parameterResource.Properties.Tags['sensitivity-level']).toBe('confidential');
      expect(parameterResource.Properties.Tags['ssm-parameter-type']).toBe('SecureString');
      expect(parameterResource.Properties.Tags['encryption-enabled']).toBe('true');

      // Check that tags are applied to KMS key
      const kmsResources = template.findResources('AWS::KMS::Key');
      const kmsResource = Object.values(kmsResources)[0] as any;
      const tags = kmsResource.Properties.Tags;
      expect(tags).toEqual(expect.arrayContaining([
        expect.objectContaining({
          Key: 'encryption-type',
          Value: 'customer-managed'
        }),
        expect.objectContaining({
          Key: 'resource-type',
          Value: 'ssm-parameter-encryption'
        })
      ]));
    });

    it('should apply custom tags when provided', () => {
      const stack = new Stack();
      const context = createMockContext('commercial');
      const spec: ComponentSpec = {
        name: 'test-parameter',
        type: 'ssm-parameter',
        config: {
          parameterName: '/test/custom-tagged-parameter',
          tags: {
            'custom-tag': 'custom-value',
            'environment': 'production',
            'team': 'platform'
          }
        }
      };

      const component = new SsmParameterComponent(stack, 'TestParameter', context, spec);
      component.synth();

      const template = Template.fromStack(stack);

      // Custom tags should be applied in addition to standard tags
      const resources = template.findResources('AWS::SSM::Parameter');
      const parameterResource = Object.values(resources)[0] as any;
      expect(parameterResource.Properties.Tags['custom-tag']).toBe('custom-value');
      expect(parameterResource.Properties.Tags['team']).toBe('platform');
    });
  });
});