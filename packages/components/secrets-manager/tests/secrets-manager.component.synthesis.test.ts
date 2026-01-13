/**
 * SecretsManagerComponent Component Synthesis Test Suite
 * Implements Platform Testing Standard v1.0 - Component Synthesis Testing
 */

import { Template, Match } from 'aws-cdk-lib/assertions';
import { App, Stack, Environment } from 'aws-cdk-lib';
import { SecretsManagerComponentComponent } from '../secrets-manager.component';
import { SecretsManagerComponentConfigBuilder, SecretsManagerConfig } from '../secrets-manager.builder';
import { ComponentContext, ComponentSpec } from '@shinobi/core';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock platform configuration loading to avoid requiring config files in tests
let platformConfigSpy: any;

beforeEach(() => {
  platformConfigSpy = vi
    .spyOn(SecretsManagerComponentConfigBuilder.prototype as any, '_loadPlatformConfiguration')
    .mockImplementation(() => ({}));
});

afterEach(() => {
  platformConfigSpy?.mockRestore();
});

const createMockContext = (
  complianceFramework: 'commercial' | 'fedramp-moderate' | 'fedramp-high' = 'commercial',
  environment: string = 'dev',
  app?: App
): ComponentContext => {
  const testApp = app || new App();
  const stack = new Stack(testApp, 'TestStack', {
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

const synthesizeComponent = (
  context: ComponentContext,
  spec: ComponentSpec
): { component: SecretsManagerComponentComponent; template: Template; app: App } => {
  const stack = context.scope as Stack;
  const app = stack.node.root as App;
  
  const component = new SecretsManagerComponentComponent(stack, spec.name, context, spec);
  component.synth();
  
  app.synth();
  
  const template = Template.fromStack(stack);
  return { component, template, app };
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
      expect(capabilities['secret:secretsmanager']).toBeDefined();
      
      // Verify enhanced capability structure includes secretFullArn
      const secretCapability = capabilities['secret:secretsmanager'];
      expect(secretCapability.secretArn).toBeDefined();
      expect(secretCapability.secretName).toBeDefined();
      expect(secretCapability.secretFullArn).toBeDefined();
      expect(secretCapability.secretFullArn).toBe(secretCapability.secretArn);
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

      // Rotation failure alarm
      template.hasResourceProperties('AWS::CloudWatch::Alarm', Match.objectLike({
        Threshold: 2
      }));

      // Unusual access latency alarm
      template.hasResourceProperties('AWS::CloudWatch::Alarm', Match.objectLike({
        Threshold: 4000
      }));

      // SecretNotFound alarm (new)
      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        AlarmName: Match.stringLikeRegexp('secret-not-found'),
        MetricName: 'SecretNotFound'
      });

      // AccessDenied alarm (new)
      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        AlarmName: Match.stringLikeRegexp('access-denied'),
        MetricName: 'AccessDenied'
      });
    });
  });

  describe('Validation - Conflicting secretValue Options', () => {
    it('should throw error when multiple secretValue options are specified', () => {
      const context = createMockContext('commercial');
      const spec = createMockSpec({
        secretValue: {
          secretArn: 'arn:aws:secretsmanager:us-east-1:123456789012:secret:existing-secret',
          generateSecret: true,
          secretStringValue: 'conflicting-value'
        }
      });

      expect(() => {
        synthesizeComponent(context, spec);
      }).toThrow(/Conflicting secretValue options detected/);
    });

    it('should throw error when both generateSecret.enabled and secretValue.generateSecret are specified', () => {
      const context = createMockContext('commercial');
      const spec = createMockSpec({
        generateSecret: {
          enabled: true
        },
        secretValue: {
          generateSecret: true
        }
      });

      expect(() => {
        synthesizeComponent(context, spec);
      }).toThrow(/Conflicting generateSecret options detected/);
    });

    it('should allow unsafePlainText with explicit allowUnsafePlainText flag', () => {
      const context = createMockContext('commercial');
      const spec = createMockSpec({
        secretValue: {
          secretStringValue: 'non-sensitive-config-value',
          allowUnsafePlainText: true
        }
      });

      // Should not throw - unsafePlainText is allowed with explicit flag
      expect(() => {
        const { template } = synthesizeComponent(context, spec);
        template.hasResourceProperties('AWS::SecretsManager::Secret', Match.anyValue());
      }).not.toThrow();
    });

    it('should throw error when secretStringValue is provided without allowUnsafePlainText', () => {
      const context = createMockContext('commercial');
      const spec = createMockSpec({
        secretValue: {
          secretStringValue: 'sensitive-value'
          // Missing allowUnsafePlainText: true
        }
      });

      expect(() => {
        synthesizeComponent(context, spec);
      }).toThrow(/Direct secret string values are not allowed for security/);
    });
  });

  describe('Monitoring - New Alarms', () => {
    it('should create SecretNotFound alarm when monitoring is enabled', () => {
      const context = createMockContext('commercial');
      const spec = createMockSpec({
        monitoring: {
          enabled: true
        }
      });

      const { template } = synthesizeComponent(context, spec);

      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        AlarmName: Match.stringLikeRegexp('secret-not-found'),
        MetricName: 'SecretNotFound',
        Namespace: 'AWS/SecretsManager',
        Threshold: 1
      });
    });

    it('should create AccessDenied alarm when monitoring is enabled', () => {
      const context = createMockContext('commercial');
      const spec = createMockSpec({
        monitoring: {
          enabled: true
        }
      });

      const { template } = synthesizeComponent(context, spec);

      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        AlarmName: Match.stringLikeRegexp('access-denied'),
        MetricName: 'AccessDenied',
        Namespace: 'AWS/SecretsManager',
        Threshold: 1
      });
    });

    it('should tag new alarms with appropriate metadata', () => {
      const context = createMockContext('commercial');
      const spec = createMockSpec({
        monitoring: {
          enabled: true
        }
      });

      const { template } = synthesizeComponent(context, spec);

      // Verify SecretNotFound alarm tags
      template.hasResourceProperties('AWS::CloudWatch::Alarm', Match.objectLike({
        AlarmName: Match.stringLikeRegexp('secret-not-found'),
        Tags: Match.arrayWith([
          Match.objectLike({ Key: 'alarm-type', Value: 'secret-not-found' }),
          Match.objectLike({ Key: 'severity', Value: 'critical' })
        ])
      }));

      // Verify AccessDenied alarm tags
      template.hasResourceProperties('AWS::CloudWatch::Alarm', Match.objectLike({
        AlarmName: Match.stringLikeRegexp('access-denied'),
        Tags: Match.arrayWith([
          Match.objectLike({ Key: 'alarm-type', Value: 'access-denied' }),
          Match.objectLike({ Key: 'severity', Value: 'high' })
        ])
      }));
    });
  });
  
});
