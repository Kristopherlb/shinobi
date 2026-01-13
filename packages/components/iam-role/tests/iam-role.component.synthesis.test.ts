/**
 * IamRoleComponent Component Synthesis Test Suite
 * Implements Platform Testing Standard v1.0 - Component Synthesis Testing
 */

import { Template, Match } from 'aws-cdk-lib/assertions';
import { App, Stack } from 'aws-cdk-lib';
import { IamRoleComponent } from '../src/iam-role.component';
import { IamRoleConfig } from '../src/iam-role.builder';
import { ComponentContext, ComponentSpec } from '@shinobi/core';

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

const synthesizeComponent = (
  context: ComponentContext,
  spec: ComponentSpec
): { component: IamRoleComponent; template: Template } => {
  const app = new App();
  const stack = new Stack(app, 'TestStack');
  
  const component = new IamRoleComponent(stack, spec.name, context, spec);
  component.synth();
  
  const template = Template.fromStack(stack);
  return { component, template };
};

describe('IamRoleComponent Synthesis', () => {
  
  describe('Default Happy Path Synthesis', () => {
    
    it('should synthesize basic iam-role with commercial compliance', () => {
      const context = createMockContext('commercial');
      const spec = createMockSpec();
      
      const { template, component } = synthesizeComponent(context, spec);
      
      expect(component).toBeDefined();
      expect(component.getType()).toBe('iam-role');
      const templateJson = template.toJSON();
      expect(templateJson.Resources).toBeDefined();
    });
    
  });
  
  describe('Component Capabilities and Constructs', () => {
    
    it('should register correct capabilities after synthesis', () => {
      const context = createMockContext('commercial');
      const spec = createMockSpec();
      
      const { component } = synthesizeComponent(context, spec);
      
      const capabilities = component.getCapabilities();
      
      expect(capabilities['iam:assumeRole']).toBeDefined();
      expect(capabilities['iam:assumeRole'].roleArn).toBeDefined();
    });
    
    it('should register construct handles for patches.ts access', () => {
      const context = createMockContext('commercial');
      const spec = createMockSpec();
      
      const { component } = synthesizeComponent(context, spec);
      
      expect(component.getConstruct('role')).toBeDefined();
    });
    
  });
  
});
  describe('Logging and Monitoring Configuration', () => {
    it('should create audit log group when enabled', () => {
      const context = createMockContext('commercial');
      const spec = createMockSpec({
        logging: {
          audit: {
            enabled: true,
            retentionInDays: 365,
            removalPolicy: 'retain'
          }
        }
      });

      const { template } = synthesizeComponent(context, spec);

      template.hasResourceProperties('AWS::Logs::LogGroup', {
        LogGroupName: Match.stringLikeRegexp('/aws/iam/role/'),
        RetentionInDays: 365
      });
    });

    it('should create session alarm when monitoring enabled', () => {
      const context = createMockContext('commercial');
      const spec = createMockSpec({
        monitoring: {
          enabled: true,
          sessionAlarm: {
            enabled: true,
            thresholdMinutes: 10
          }
        }
      });

      const { template } = synthesizeComponent(context, spec);

      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        AlarmDescription: 'IAM role session duration threshold exceeded'
      });
    });
  });
