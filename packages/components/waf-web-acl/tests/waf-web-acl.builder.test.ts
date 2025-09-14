/**
 * WAF Web ACL ConfigBuilder Test Suite
 * Implements Platform Testing Standard v1.0 - ConfigBuilder Testing
 */

import { WafWebAclConfigBuilder, WafWebAclConfig } from '../waf-web-acl.builder';
import { ComponentContext, ComponentSpec } from '../../../../src/platform/contracts/component-interfaces';

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

describe('WafWebAclConfigBuilder', () => {

  describe('Hardcoded Fallbacks (Layer 1)', () => {

    it('should provide ultra-safe baseline configuration', () => {
      const context = createMockContext();
      const spec = createMockSpec();

      const builder = new WafWebAclConfigBuilder(context, spec);
      const config = builder.buildSync();

      // Verify hardcoded fallbacks are applied
      expect(config.scope).toBe('REGIONAL');
      expect(config.defaultAction).toBe('allow');
      expect(config.managedRuleGroups).toBeDefined();
      expect(config.managedRuleGroups?.length).toBe(2); // Common rules + Known bad inputs
      expect(config.logging?.enabled).toBe(true);
      expect(config.logging?.logDestinationType).toBe('cloudwatch');
      expect(config.monitoring?.enabled).toBe(true);
      expect(config.monitoring?.detailedMetrics).toBe(true); // Commercial framework enables detailed metrics
      expect(config.tags).toBeDefined();
    });

    it('should include essential managed rule groups by default', () => {
      const context = createMockContext();
      const spec = createMockSpec();

      const builder = new WafWebAclConfigBuilder(context, spec);
      const config = builder.buildSync();

      expect(config.managedRuleGroups).toContainEqual({
        name: 'AWSManagedRulesCommonRuleSet',
        vendorName: 'AWS',
        priority: 1,
        overrideAction: 'none'
      });

      expect(config.managedRuleGroups).toContainEqual({
        name: 'AWSManagedRulesKnownBadInputsRuleSet',
        vendorName: 'AWS',
        priority: 2,
        overrideAction: 'none'
      });
    });

  });

  describe('Compliance Framework Defaults (Layer 2)', () => {

    it('should apply commercial compliance defaults', () => {
      const context = createMockContext('commercial');
      const spec = createMockSpec();

      const builder = new WafWebAclConfigBuilder(context, spec);
      const config = builder.buildSync();

      expect(config.monitoring?.enabled).toBe(true);
      expect(config.monitoring?.detailedMetrics).toBe(true); // Compliance defaults apply when platform config doesn't specify
      expect(config.logging?.enabled).toBe(true);
      expect(config.managedRuleGroups?.length).toBe(2); // Commercial has 2 rules from platform config
      expect(config.monitoring?.alarms?.blockedRequestsThreshold).toBe(500); // From compliance framework (overrides platform config)
    });

    it('should apply FedRAMP moderate compliance defaults', () => {
      const context = createMockContext('fedramp-moderate');
      const spec = createMockSpec();

      const builder = new WafWebAclConfigBuilder(context, spec);
      const config = builder.buildSync();

      expect(config.monitoring?.enabled).toBe(true);
      expect(config.monitoring?.detailedMetrics).toBe(true); // Mandatory for FedRAMP
      expect(config.defaultAction).toBe('block'); // More restrictive for FedRAMP
      expect(config.logging?.enabled).toBe(true); // Mandatory for FedRAMP
      expect(config.managedRuleGroups?.length).toBe(6); // 4 from platform config + 2 from compliance defaults
      expect(config.monitoring?.alarms?.blockedRequestsThreshold).toBe(250);
    });

    it('should apply FedRAMP high compliance defaults', () => {
      const context = createMockContext('fedramp-high');
      const spec = createMockSpec();

      const builder = new WafWebAclConfigBuilder(context, spec);
      const config = builder.buildSync();

      expect(config.monitoring?.enabled).toBe(true);
      expect(config.monitoring?.detailedMetrics).toBe(true); // Mandatory for FedRAMP
      expect(config.defaultAction).toBe('block'); // More restrictive for FedRAMP
      expect(config.logging?.enabled).toBe(true); // Mandatory for FedRAMP
      expect(config.managedRuleGroups?.length).toBe(7); // 5 from platform config + 2 from compliance defaults
      expect(config.monitoring?.alarms?.blockedRequestsThreshold).toBe(100); // Stricter threshold
      expect(config.monitoring?.alarms?.allowedRequestsThreshold).toBe(2000); // Stricter threshold
    });

  });

  describe('5-Layer Precedence Chain', () => {

    it('should apply component overrides over platform defaults', () => {
      const context = createMockContext('commercial');
      const spec = createMockSpec({
        scope: 'CLOUDFRONT',
        defaultAction: 'block',
        monitoring: {
          enabled: false,
          detailedMetrics: false
        }
      });

      const builder = new WafWebAclConfigBuilder(context, spec);
      const config = builder.buildSync();

      // Verify component config overrides platform defaults
      expect(config.scope).toBe('CLOUDFRONT');
      expect(config.defaultAction).toBe('block');
      expect(config.monitoring?.enabled).toBe(false);
      expect(config.monitoring?.detailedMetrics).toBe(false);
    });

    it('should merge nested configuration objects correctly', () => {
      const context = createMockContext('commercial');
      const spec = createMockSpec({
        monitoring: {
          enabled: false
          // detailedMetrics not specified - should come from defaults
        },
        logging: {
          enabled: true,
          logDestinationType: 's3'
          // redactedFields not specified - should come from defaults
        }
      });

      const builder = new WafWebAclConfigBuilder(context, spec);
      const config = builder.buildSync();

      // Component override should win for enabled
      expect(config.monitoring?.enabled).toBe(false);
      // Compliance framework defaults should win for detailedMetrics since component didn't override it
      expect(config.monitoring?.detailedMetrics).toBe(true);

      // Component override should win for logDestinationType
      expect(config.logging?.logDestinationType).toBe('s3');
      // Default should win for redactedFields
      expect(config.logging?.redactedFields).toEqual([]);
    });

    it('should handle custom rules and managed rule groups', () => {
      const context = createMockContext('commercial');
      const spec = createMockSpec({
        customRules: [{
          name: 'IPBlockRule',
          priority: 100,
          action: 'block',
          statement: {
            type: 'ip-set',
            ipSet: ['192.168.1.0/24']
          }
        }],
        managedRuleGroups: [{
          name: 'AWSManagedRulesAmazonIpReputationList',
          vendorName: 'AWS',
          priority: 50,
          overrideAction: 'count'
        }]
      });

      const builder = new WafWebAclConfigBuilder(context, spec);
      const config = builder.buildSync();

      // Should have custom rules
      expect(config.customRules).toBeDefined();
      expect(config.customRules?.length).toBe(1);
      expect(config.customRules?.[0].name).toBe('IPBlockRule');

      // Should have the custom managed rule group
      expect(config.managedRuleGroups).toContainEqual({
        name: 'AWSManagedRulesAmazonIpReputationList',
        vendorName: 'AWS',
        priority: 50,
        overrideAction: 'count'
      });
    });

  });

  describe('Schema Validation', () => {

    it('should return the component schema', () => {
      const context = createMockContext();
      const spec = createMockSpec();

      const builder = new WafWebAclConfigBuilder(context, spec);
      const schema = builder.getSchema();

      expect(schema).toBeDefined();
      expect(schema.type).toBe('object');
      expect(schema.properties).toBeDefined();
      expect(schema.properties.scope).toBeDefined();
      expect(schema.properties.defaultAction).toBeDefined();
      expect(schema.properties.managedRuleGroups).toBeDefined();
      expect(schema.properties.customRules).toBeDefined();
      expect(schema.properties.logging).toBeDefined();
      expect(schema.properties.monitoring).toBeDefined();
    });

    it('should validate scope enum values', () => {
      const schema = new WafWebAclConfigBuilder(createMockContext(), createMockSpec()).getSchema();

      expect(schema.properties.scope.enum).toContain('REGIONAL');
      expect(schema.properties.scope.enum).toContain('CLOUDFRONT');
    });

    it('should validate defaultAction enum values', () => {
      const schema = new WafWebAclConfigBuilder(createMockContext(), createMockSpec()).getSchema();

      expect(schema.properties.defaultAction.enum).toContain('allow');
      expect(schema.properties.defaultAction.enum).toContain('block');
    });

  });

});