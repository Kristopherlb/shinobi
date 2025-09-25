/**
 * WAF Web ACL Component Synthesis Test Suite
 * Implements Platform Testing Standard v1.0 - Component Synthesis Testing
 */

import { Template, Match } from 'aws-cdk-lib/assertions';
import { App, Stack } from 'aws-cdk-lib';
import { WafWebAclComponent } from '../waf-web-acl.component';
import { WafWebAclConfig } from '../waf-web-acl.builder';
import { ComponentContext, ComponentSpec } from '../../@shinobi/core/component-interfaces';

const createMockContext = (
  complianceFramework: 'commercial' | 'fedramp-moderate' | 'fedramp-high' = 'commercial',
  environment: string = 'dev'
): ComponentContext => ({
  serviceName: 'test-service',
  environment,
  complianceFramework,
  scope: {} as any, // Mock scope
  region: 'us-east-1',
  accountId: '123456789012',
  serviceLabels: {
    'owner': 'test-team',
    'version': '1.0.0'
  }
});

const createMockSpec = (config: Partial<WafWebAclConfig> = {}): ComponentSpec => ({
  name: 'test-waf-web-acl',
  type: 'waf-web-acl',
  config
});

const synthesizeComponent = (
  context: ComponentContext,
  spec: ComponentSpec
): { component: WafWebAclComponent; template: Template } => {
  const app = new App();
  const stack = new Stack(app, 'TestStack');
  
  const component = new WafWebAclComponent(stack, spec, context);
  component.synth();
  
  const template = Template.fromStack(stack);
  return { component, template };
};

describe('WafWebAclComponent Synthesis', () => {
  
  describe('Default Happy Path Synthesis', () => {
    
    it('should synthesize basic waf-web-acl with commercial compliance', () => {
      const context = createMockContext('commercial');
      const spec = createMockSpec();
      
      const { template, component } = synthesizeComponent(context, spec);
      
      // Verify WAF Web ACL is created
      template.hasResourceProperties('AWS::WAFv2::WebACL', {
        Name: spec.name,
        Scope: 'REGIONAL',
        DefaultAction: {
          Allow: {}
        },
        VisibilityConfig: {
          SampledRequestsEnabled: true,
          CloudWatchMetricsEnabled: true,
          MetricName: `${spec.name}WebAcl`
        }
      });
      
      // Verify component was created
      expect(component).toBeDefined();
      expect(component.getType()).toBe('waf-web-acl');
    });
    
    it('should create managed rule groups', () => {
      const context = createMockContext('commercial');
      const spec = createMockSpec();
      
      const { template } = synthesizeComponent(context, spec);
      
      // Verify managed rule groups are included in rules
      template.hasResourceProperties('AWS::WAFv2::WebACL', {
        Rules: Match.arrayWith([
          Match.objectLike({
            Name: 'AWSManagedRulesCommonRuleSet',
            Priority: 1,
            OverrideAction: {
              None: {}
            },
            Statement: {
              ManagedRuleGroupStatement: {
                VendorName: 'AWS',
                Name: 'AWSManagedRulesCommonRuleSet'
              }
            }
          }),
          Match.objectLike({
            Name: 'AWSManagedRulesKnownBadInputsRuleSet',
            Priority: 2,
            Statement: {
              ManagedRuleGroupStatement: {
                VendorName: 'AWS',
                Name: 'AWSManagedRulesKnownBadInputsRuleSet'
              }
            }
          })
        ])
      });
    });
    
    it('should create CloudWatch log group for logging', () => {
      const context = createMockContext('commercial');
      const spec = createMockSpec({
        logging: {
          enabled: true,
          logDestinationType: 'cloudwatch'
        }
      });
      
      const { template } = synthesizeComponent(context, spec);
      
      // Verify CloudWatch log group is created
      template.hasResourceProperties('AWS::Logs::LogGroup', {
        LogGroupName: `/aws/wafv2/${spec.name}`,
        RetentionInDays: 365 // 1 year for commercial
      });
      
      // Verify logging configuration
      template.hasResourceProperties('AWS::WAFv2::LoggingConfiguration', {
        LogDestinationConfigs: Match.arrayWith([
          Match.objectLike({
            'Fn::GetAtt': Match.arrayWith(['testwafwebaclWafLogGroupEA8FAA54', 'Arn'])
          })
        ])
      });
    });
    
    it('should apply standard platform tags', () => {
      const context = createMockContext('commercial');
      const spec = createMockSpec();
      
      const { template } = synthesizeComponent(context, spec);
      
      // Verify standard tags are applied to WAF Web ACL
      template.hasResourceProperties('AWS::WAFv2::WebACL', {
        Tags: Match.arrayWith([
          Match.objectLike({ Key: 'service-name', Value: 'test-service' })
        ])
      });
    });
    
  });
  
  describe('Compliance Framework Hardening', () => {
    
    it('should apply FedRAMP moderate compliance hardening', () => {
      const context = createMockContext('fedramp-moderate');
      const spec = createMockSpec();
      
      const { template } = synthesizeComponent(context, spec);
      
      // Verify more restrictive default action
      template.hasResourceProperties('AWS::WAFv2::WebACL', {
        DefaultAction: {
          Block: {}
        }
      });
      
      // Verify additional managed rule groups for FedRAMP
      template.hasResourceProperties('AWS::WAFv2::WebACL', {
        Rules: Match.arrayWith([
          Match.objectLike({
            Name: 'AWSManagedRulesSQLiRuleSet',
            Priority: 3
          }),
          Match.objectLike({
            Name: 'AWSManagedRulesLinuxRuleSet',
            Priority: 4
          }),
          Match.objectLike({
            Name: 'AWSManagedRulesUnixRuleSet',
            Priority: 5
          })
        ])
      });
      
      // Verify longer log retention for compliance
      template.hasResourceProperties('AWS::Logs::LogGroup', {
        RetentionInDays: 1095 // 3 years for FedRAMP moderate
      });
    });
    
    it('should apply FedRAMP high compliance hardening', () => {
      const context = createMockContext('fedramp-high');
      const spec = createMockSpec();
      
      const { template } = synthesizeComponent(context, spec);
      
      // Verify block default action for highest security
      template.hasResourceProperties('AWS::WAFv2::WebACL', {
        DefaultAction: {
          Block: {}
        }
      });
      
      // Verify extended log retention for FedRAMP High
      template.hasResourceProperties('AWS::Logs::LogGroup', {
        RetentionInDays: 2555 // 7 years for FedRAMP high
      });
      
      // Verify resources have RETAIN removal policy
      template.hasResource('AWS::Logs::LogGroup', {
        DeletionPolicy: 'Retain'
      });
    });
    
  });
  
  describe('Custom Configuration', () => {
    
    it('should handle CloudFront scope configuration', () => {
      const context = createMockContext('commercial');
      const spec = createMockSpec({
        scope: 'CLOUDFRONT'
      });
      
      const { template } = synthesizeComponent(context, spec);
      
      template.hasResourceProperties('AWS::WAFv2::WebACL', {
        Scope: 'CLOUDFRONT'
      });
    });
    
    it('should create custom rules when specified', () => {
      const context = createMockContext('commercial');
      const spec = createMockSpec({
        customRules: [{
          name: 'GeoBlockRule',
          priority: 100,
          action: 'block',
          statement: {
            type: 'geo-match',
            countries: ['CN', 'RU']
          }
        }]
      });
      
      const { template } = synthesizeComponent(context, spec);
      
      template.hasResourceProperties('AWS::WAFv2::WebACL', {
        Rules: Match.arrayWith([
          Match.objectLike({
            Name: 'GeoBlockRule',
            Priority: 100,
            Action: {
              Block: {}
            },
            Statement: {
              GeoMatchStatement: {
                CountryCodes: ['CN', 'RU']
              }
            }
          })
        ])
      });
    });
    
    it('should create monitoring alarms when enabled', () => {
      const context = createMockContext('commercial');
      const spec = createMockSpec({
        monitoring: {
          enabled: true,
          alarms: {
            blockedRequestsThreshold: 500
          }
        }
      });
      
      const { template } = synthesizeComponent(context, spec);
      
      // Verify blocked requests alarm
      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        MetricName: 'BlockedRequests',
        Namespace: 'AWS/WAFV2',
        Threshold: 500,
        ComparisonOperator: 'GreaterThanOrEqualToThreshold'
      });
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
      expect(capabilities['security:waf-web-acl']).toBeDefined();
      expect(capabilities['monitoring:waf-web-acl']).toBeDefined();
      expect(capabilities['waf:web-acl']).toBeDefined();
      expect(capabilities['protection:web-application']).toBeDefined();
      
      // Verify capability data structure
      const wafCapability = capabilities['waf:web-acl'];
      expect(wafCapability.id).toBeDefined();
      expect(wafCapability.arn).toBeDefined();
      expect(wafCapability.name).toBeDefined();
      expect(wafCapability.scope).toBe('REGIONAL');
    });
    
    it('should register construct handles for patches.ts access', () => {
      const context = createMockContext('commercial');
      const spec = createMockSpec({
        logging: {
          enabled: true,
          logDestinationType: 'cloudwatch'
        }
      });
      
      const { component } = synthesizeComponent(context, spec);
      
      // Verify main construct is registered
      expect(component.getConstruct('main')).toBeDefined();
      expect(component.getConstruct('webAcl')).toBeDefined();
      expect(component.getConstruct('logGroup')).toBeDefined();
    });
    
  });
  
  describe('Error Handling', () => {
    
    it('should handle invalid configuration gracefully', () => {
      const context = createMockContext('commercial');
      const spec = createMockSpec({
        managedRuleGroups: [] // Empty rule groups should still work
      });
      
      // Should not throw error
      expect(() => {
        synthesizeComponent(context, spec);
      }).not.toThrow();
    });
    
    it('should handle missing logging configuration', () => {
      const context = createMockContext('commercial');
      const spec = createMockSpec({
        logging: {
          enabled: false
        }
      });
      
      const { template } = synthesizeComponent(context, spec);
      
      // Should not create logging configuration
      template.resourceCountIs('AWS::WAFv2::LoggingConfiguration', 0);
      template.resourceCountIs('AWS::Logs::LogGroup', 0);
    });
    
  });
  
});