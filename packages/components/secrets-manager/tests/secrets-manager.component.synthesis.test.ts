/**
 * SecretsManagerComponent Component Synthesis Test Suite
 * Implements Platform Testing Standard v1.0 - Component Synthesis Testing
 */

import { Template, Match } from 'aws-cdk-lib/assertions';
import { App, Stack } from 'aws-cdk-lib';
import { SecretsManagerComponentComponent } from '../secrets-manager.component.js';
import { SecretsManagerComponentConfigBuilder, SecretsManagerConfig } from '../secrets-manager.builder.js';
import { ComponentContext, ComponentSpec } from '../../../platform/contracts/component-interfaces.js';

jest.mock('@platform/logger', () => ({
  Logger: {
    setGlobalContext: jest.fn(),
    getLogger: jest.fn(() => ({
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn()
    }))
  }
}), { virtual: true });

beforeEach(() => {
  jest
    .spyOn(SecretsManagerComponentConfigBuilder.prototype as any, '_loadPlatformConfiguration')
    .mockReturnValue({});
});

afterEach(() => {
  jest.restoreAllMocks();
});

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

const createMockSpec = (config: Partial<SecretsManagerConfig> = {}): ComponentSpec => ({
  name: 'test-secrets-manager',
  type: 'secrets-manager',
  config
});

const synthesizeComponent = (
  context: ComponentContext,
  spec: ComponentSpec
): { component: SecretsManagerComponentComponent; template: Template } => {
  const app = new App();
  const stack = new Stack(app, 'TestStack');
  
  const component = new SecretsManagerComponentComponent(stack, spec.name, context, spec);
  component.synth();
  
  const template = Template.fromStack(stack);
  return { component, template };
};

describe('SecretsManagerComponentComponent Synthesis', () => {
  
  describe('Default Happy Path Synthesis', () => {
    
    it('should synthesize basic secrets-manager with commercial compliance', () => {
      const context = createMockContext('commercial');
      const spec = createMockSpec();
      
      const { template, component } = synthesizeComponent(context, spec);
      
      // TODO: Add specific CloudFormation resource assertions
      // Verify component was created
      expect(component).toBeDefined();
      expect(component.getType()).toBe('secrets-manager');
    });
    
  });
  
  describe('Component Capabilities and Constructs', () => {
    
    it('should register correct capabilities after synthesis', () => {
      const context = createMockContext('commercial');
      const spec = createMockSpec();
      
      const { component } = synthesizeComponent(context, spec);
      
      const capabilities = component.getCapabilities();
      
      // Verify component-specific capabilities
      expect(capabilities).toBeDefined();
    });
    
    it('should register construct handles for patches.ts access', () => {
      const context = createMockContext('commercial');
      const spec = createMockSpec();
      
      const { component } = synthesizeComponent(context, spec);
      
      // Verify main construct is registered
      expect(component.getConstruct('main')).toBeDefined();
    });
    
  });

  describe('Configuration-driven behaviour', () => {
    it('creates a customer managed key when requested via config', () => {
      const context = createMockContext('commercial');
      const spec = createMockSpec({
        encryption: {
          createCustomerManagedKey: true,
          enableKeyRotation: true
        }
      });

      const { template } = synthesizeComponent(context, spec);

      template.hasResourceProperties('AWS::KMS::Key', {
        EnableKeyRotation: true
      });
    });

    it('synthesises monitoring alarms when enabled in config', () => {
      const context = createMockContext('commercial');
      const spec = createMockSpec({
        automaticRotation: {
          enabled: true
        },
        monitoring: {
          enabled: true,
          rotationFailureThreshold: 2,
          unusualAccessThresholdMs: 4000
        }
      });

      const { template } = synthesizeComponent(context, spec);

      template.hasResourceProperties('AWS::CloudWatch::Alarm', Match.objectLike({
        Threshold: 2
      }));

      template.hasResourceProperties('AWS::CloudWatch::Alarm', Match.objectLike({
        Threshold: 4000
      }));
    });
  });
  
});
