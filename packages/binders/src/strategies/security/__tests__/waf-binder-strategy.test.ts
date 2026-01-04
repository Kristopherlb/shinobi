/**
 * WafBinderStrategy Tests (Unified)
 * 
 * Tests for WafBinderStrategy following Platform Testing Standard v1.0
 * All tests assert EnhancedBindingResult structure (return-based, not mutation-based)
 */

import { WafBinderStrategy } from '../waf-binder-strategy.js';
import {
  createMockSourceComponent,
  createMockTargetComponent,
  createBindingContext,
  executeUnifiedBinding,
  assertEnhancedBindingResult,
  TEST_CONSTANTS
} from './unified-strategy-test-helpers.js';

const WAF_WEB_ACL_ARN = 'arn:aws:wafv2:us-east-1:123456789012:regional/webacl/test-web-acl/abc123def456';
const WAF_WEB_ACL_ID = 'abc123def456';

describe('WafBinderStrategy', () => {
  describe('WafBind__ValidAccess__ReturnsEnhancedResult', () => {
    const metadata = {
      id: 'TP-binders-security-waf-001',
      level: 'unit' as const,
      capability: 'Returns EnhancedBindingResult with all required fields including compliance block',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'WafBind__Condition__Outcome', example: 'WafBind__ValidAccess__ReturnsEnhancedResult' },
      invariants: [
        'result.compliance.status exists and is one of compliant|non-compliant|partially-compliant',
        'result.environmentVariables.WAF_WEB_ACL_ARN matches input webAclArn',
        'result.iamPolicies is an array',
        'result.securityGroupRules is an array'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'WafWebAclCapabilityData'],
      inputs: {
        shape: 'BindingContext with security:waf capability, webAclArn',
        notes: 'Basic valid binding with read access'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('WafBind__ValidAccess__ReturnsEnhancedResult', async () => {
      const strategy = new WafBinderStrategy();
      const source = createMockSourceComponent('api-gateway', 'test-api');
      
      const target = createMockTargetComponent('waf-web-acl', {
        'security:waf': {
          webAclArn: WAF_WEB_ACL_ARN,
          webAclId: WAF_WEB_ACL_ID,
          scope: 'REGIONAL'
        },
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'security:waf',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Primary assertion: compliance block exists and has correct structure
      expect(['compliant', 'non-compliant', 'partially-compliant']).toContain(result.compliance.status);
      expect(result.compliance.framework).toBe(TEST_CONSTANTS.COMPLIANCE_FRAMEWORK);
      expect(Array.isArray(result.compliance.actionsTaken)).toBe(true);

      // Invariants
      expect(result.environmentVariables.WAF_WEB_ACL_ARN).toBe(WAF_WEB_ACL_ARN);
      expect(result.environmentVariables.WAF_WEB_ACL_ID).toBe(WAF_WEB_ACL_ID);
      expect(result.environmentVariables.WAF_WEB_ACL_SCOPE).toBe('REGIONAL');
      expect(Array.isArray(result.iamPolicies)).toBe(true);
      expect(Array.isArray(result.securityGroupRules)).toBe(true);
      expect(result.iamPolicies.length).toBeGreaterThan(0);
    });
  });

  describe('WafBind__ReadAccess__GrantsWafReadPermissions', () => {
    const metadata = {
      id: 'TP-binders-security-waf-002',
      level: 'unit' as const,
      capability: 'Grants wafv2:GetWebACL and related read actions for read access level',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'WafBind__Condition__Outcome', example: 'WafBind__ReadAccess__GrantsWafReadPermissions' },
      invariants: [
        'PolicyStatement resources match webAclArn',
        'PolicyStatement Effect is Allow',
        'Actions array includes wafv2:GetWebACL'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'WafWebAclCapabilityData'],
      inputs: {
        shape: 'BindingContext with security:waf capability and read access',
        notes: 'Standard AccessLevel read value'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('WafBind__ReadAccess__GrantsWafReadPermissions', async () => {
      const strategy = new WafBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('waf-web-acl', {
        'security:waf': {
          webAclArn: WAF_WEB_ACL_ARN,
          webAclId: WAF_WEB_ACL_ID
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'security:waf',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Check that WAF read permissions are granted
      const readPolicy = result.iamPolicies.find(p => 
        p.statement.actions?.includes('wafv2:GetWebACL')
      );
      expect(readPolicy).toBeDefined();
      expect(readPolicy?.statement.resources).toContain(WAF_WEB_ACL_ARN);
      expect(readPolicy?.statement.actions).toContain('wafv2:GetWebACLForResource');
    });
  });

  describe('WafBind__WriteAccessWithoutOption__DoesNotGrantUpdateWebACL', () => {
    const metadata = {
      id: 'TP-binders-security-waf-003',
      level: 'unit' as const,
      capability: 'Write access without allowWebAclUpdates option does not include UpdateWebACL',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'WafBind__Condition__Outcome', example: 'WafBind__WriteAccessWithoutOption__DoesNotGrantUpdateWebACL' },
      invariants: [
        'PolicyStatement includes wafv2:AssociateWebACL action',
        'PolicyStatement includes wafv2:DisassociateWebACL action',
        'PolicyStatement does not include wafv2:UpdateWebACL action',
        'All read permissions are also included'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'WafWebAclCapabilityData'],
      inputs: {
        shape: 'BindingContext with security:waf capability and write access (no allowWebAclUpdates option)',
        notes: 'Write access by default does not include UpdateWebACL for safety'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('WafBind__WriteAccessWithoutOption__DoesNotGrantUpdateWebACL', async () => {
      const strategy = new WafBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('waf-web-acl', {
        'security:waf': {
          webAclArn: WAF_WEB_ACL_ARN,
          webAclId: WAF_WEB_ACL_ID
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'security:waf',
        access: 'write'
        // No allowWebAclUpdates option
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Check that associate/disassociate permissions are granted
      const writePolicy = result.iamPolicies.find(p => 
        p.statement.actions?.includes('wafv2:AssociateWebACL')
      );
      expect(writePolicy).toBeDefined();
      expect(writePolicy?.statement.actions).toContain('wafv2:DisassociateWebACL');
      expect(writePolicy?.statement.actions).not.toContain('wafv2:UpdateWebACL');
    });
  });

  describe('WafBind__WriteAccessWithOption__GrantsUpdateWebACL', () => {
    const metadata = {
      id: 'TP-binders-security-waf-003b',
      level: 'unit' as const,
      capability: 'Grants wafv2:UpdateWebACL action when allowWebAclUpdates option is set',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'WafBind__Condition__Outcome', example: 'WafBind__WriteAccessWithOption__GrantsUpdateWebACL' },
      invariants: [
        'PolicyStatement includes wafv2:AssociateWebACL action',
        'PolicyStatement includes wafv2:UpdateWebACL action',
        'All read permissions are also included'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'WafWebAclCapabilityData'],
      inputs: {
        shape: 'BindingContext with security:waf capability, write access, and allowWebAclUpdates option',
        notes: 'Write access with allowWebAclUpdates option enables UpdateWebACL'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('WafBind__WriteAccessWithOption__GrantsUpdateWebACL', async () => {
      const strategy = new WafBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('waf-web-acl', {
        'security:waf': {
          webAclArn: WAF_WEB_ACL_ARN,
          webAclId: WAF_WEB_ACL_ID
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'security:waf',
        access: 'write',
        options: { allowWebAclUpdates: true }
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Check that UpdateWebACL permission is granted with option
      const writePolicy = result.iamPolicies.find(p => 
        p.statement.actions?.includes('wafv2:AssociateWebACL')
      );
      expect(writePolicy).toBeDefined();
      expect(writePolicy?.statement.actions).toContain('wafv2:UpdateWebACL');
    });
  });

  describe('WafBind__AdminAccessWithoutOption__DoesNotGrantCreateDelete', () => {
    const metadata = {
      id: 'TP-binders-security-waf-004',
      level: 'unit' as const,
      capability: 'Admin access without allowWebAclManagement option does not include CreateWebACL/DeleteWebACL',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'WafBind__Condition__Outcome', example: 'WafBind__AdminAccessWithoutOption__DoesNotGrantCreateDelete' },
      invariants: [
        'PolicyStatement does not include wafv2:CreateWebACL action',
        'PolicyStatement does not include wafv2:DeleteWebACL action',
        'All read and write permissions are still included'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'WafWebAclCapabilityData'],
      inputs: {
        shape: 'BindingContext with security:waf capability and admin access (no allowWebAclManagement option)',
        notes: 'Admin access by default does not include Create/Delete for safety'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('WafBind__AdminAccessWithoutOption__DoesNotGrantCreateDelete', async () => {
      const strategy = new WafBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('waf-web-acl', {
        'security:waf': {
          webAclArn: WAF_WEB_ACL_ARN,
          webAclId: WAF_WEB_ACL_ID
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'security:waf',
        access: 'admin'
        // No allowWebAclManagement option
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Check that admin permissions (Create/Delete) are NOT granted without option
      const createDeletePolicy = result.iamPolicies.find(p => 
        p.statement.actions?.includes('wafv2:CreateWebACL') || 
        p.statement.actions?.includes('wafv2:DeleteWebACL')
      );
      expect(createDeletePolicy).toBeUndefined();
    });
  });

  describe('WafBind__AdminAccessWithOption__GrantsCreateDelete', () => {
    const metadata = {
      id: 'TP-binders-security-waf-004b',
      level: 'unit' as const,
      capability: 'Grants wafv2:CreateWebACL and DeleteWebACL actions when allowWebAclManagement option is set',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'WafBind__Condition__Outcome', example: 'WafBind__AdminAccessWithOption__GrantsCreateDelete' },
      invariants: [
        'PolicyStatement includes wafv2:CreateWebACL action',
        'PolicyStatement includes wafv2:DeleteWebACL action',
        'All read and write permissions are also included'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'WafWebAclCapabilityData'],
      inputs: {
        shape: 'BindingContext with security:waf capability, admin access, and allowWebAclManagement option',
        notes: 'Admin access with allowWebAclManagement option enables Create/Delete'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('WafBind__AdminAccessWithOption__GrantsCreateDelete', async () => {
      const strategy = new WafBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('waf-web-acl', {
        'security:waf': {
          webAclArn: WAF_WEB_ACL_ARN,
          webAclId: WAF_WEB_ACL_ID
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'security:waf',
        access: 'admin',
        options: { allowWebAclManagement: true }
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Check that admin permissions are granted with option
      const adminPolicy = result.iamPolicies.find(p => 
        p.statement.actions?.includes('wafv2:CreateWebACL')
      );
      expect(adminPolicy).toBeDefined();
      expect(adminPolicy?.statement.actions).toContain('wafv2:DeleteWebACL');
    });
  });

  describe('WafBind__WithRuleGroups__ExposesRuleInfo', () => {
    const metadata = {
      id: 'TP-binders-security-waf-006',
      level: 'unit' as const,
      capability: 'Exposes managed rule groups and custom rules counts as environment variables',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'WafBind__Condition__Outcome', example: 'WafBind__WithRuleGroups__ExposesRuleInfo' },
      invariants: [
        'Environment variables include WAF_WEB_ACL_MANAGED_RULE_GROUPS_COUNT',
        'Environment variables include WAF_WEB_ACL_CUSTOM_RULES_COUNT',
        'Environment variables include WAF_WEB_ACL_TOTAL_RULES_COUNT'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'WafWebAclCapabilityDataWithRuleGroups'],
      inputs: {
        shape: 'BindingContext with security:waf capability including managedRuleGroups and customRules counts',
        notes: 'Rule group information exposed as env vars'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('WafBind__WithRuleGroups__ExposesRuleInfo', async () => {
      const strategy = new WafBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('waf-web-acl', {
        'security:waf': {
          webAclArn: WAF_WEB_ACL_ARN,
          webAclId: WAF_WEB_ACL_ID,
          managedRuleGroups: 3,
          customRules: 2
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'security:waf',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      expect(result.environmentVariables.WAF_WEB_ACL_MANAGED_RULE_GROUPS_COUNT).toBe('3');
      expect(result.environmentVariables.WAF_WEB_ACL_CUSTOM_RULES_COUNT).toBe('2');
      expect(result.environmentVariables.WAF_WEB_ACL_TOTAL_RULES_COUNT).toBe('5');
    });
  });

  describe('WafBind__WithLogging__GrantsLoggingPermissionsAndExposesConfig', () => {
    const metadata = {
      id: 'TP-binders-security-waf-007',
      level: 'unit' as const,
      capability: 'Grants logging permissions and exposes logging configuration as environment variables',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'WafBind__Condition__Outcome', example: 'WafBind__WithLogging__GrantsLoggingPermissionsAndExposesConfig' },
      invariants: [
        'Environment variables include WAF_WEB_ACL_LOGGING_ENABLED',
        'Environment variables include WAF_WEB_ACL_LOGGING_DESTINATION_ARN',
        'PolicyStatement includes wafv2:GetLoggingConfiguration action',
        'CloudWatch Logs permissions included for cloudwatch destination type'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'WafWebAclCapabilityDataWithLogging'],
      inputs: {
        shape: 'BindingContext with security:waf capability including logging configuration',
        notes: 'Logging configuration and permissions'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('WafBind__WithLogging__GrantsLoggingPermissionsAndExposesConfig', async () => {
      const strategy = new WafBinderStrategy();
      const source = createMockSourceComponent();
      const logDestinationArn = 'arn:aws:logs:us-east-1:123456789012:log-group:/aws/wafv2/test';
      const target = createMockTargetComponent('waf-web-acl', {
        'security:waf': {
          webAclArn: WAF_WEB_ACL_ARN,
          webAclId: WAF_WEB_ACL_ID,
          loggingEnabled: true,
          loggingDestinationArn: logDestinationArn,
          loggingDestinationType: 'cloudwatch'
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'security:waf',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      expect(result.environmentVariables.WAF_WEB_ACL_LOGGING_ENABLED).toBe('true');
      expect(result.environmentVariables.WAF_WEB_ACL_LOGGING_DESTINATION_ARN).toBe(logDestinationArn);
      expect(result.environmentVariables.WAF_WEB_ACL_LOGGING_DESTINATION_TYPE).toBe('cloudwatch');

      // Check that logging permissions are granted
      const loggingPolicy = result.iamPolicies.find(p => 
        p.statement.actions?.includes('wafv2:GetLoggingConfiguration')
      );
      expect(loggingPolicy).toBeDefined();

      // Check that CloudWatch Logs permissions are granted for cloudwatch destination
      const logsPolicy = result.iamPolicies.find(p => 
        p.statement.actions?.includes('logs:PutLogEvents')
      );
      expect(logsPolicy).toBeDefined();
      expect(logsPolicy?.statement.resources).toContain(logDestinationArn);
    });
  });

  describe('WafBind__MissingWebAclArn__ThrowsError', () => {
    const metadata = {
      id: 'TP-binders-security-waf-005',
      level: 'unit' as const,
      capability: 'Throws error when target data missing required webAclArn property',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'WafBind__Condition__Outcome', example: 'WafBind__MissingWebAclArn__ThrowsError' },
      invariants: [
        'Error message indicates missing webAclArn',
        'Error is thrown before binding completes'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with security:waf capability but missing webAclArn',
        notes: 'Error case for missing required field'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('WafBind__MissingWebAclArn__ThrowsError', async () => {
      const strategy = new WafBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('waf-web-acl', {
        'security:waf': {
          webAclId: WAF_WEB_ACL_ID
          // Missing webAclArn
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'security:waf',
        access: 'read'
      });

      await expect(executeUnifiedBinding(strategy, context)).rejects.toThrow(
        'Target component missing required webAclArn property for WAF binding'
      );
    });
  });

  describe('WafBind__CustomActionsOverride__ReplacesCoarseActions', () => {
    const metadata = {
      id: 'TP-binders-security-waf-010',
      level: 'unit' as const,
      capability: 'Custom actions override replaces default WAF actions',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'WafBind__Condition__Outcome', example: 'WafBind__CustomActionsOverride__ReplacesCoarseActions' },
      invariants: [
        'IAM policy actions match provided custom actions array',
        'Default WAF actions are not included when custom actions provided',
        'Actions array is used directly (replaces coarse access)'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'WafWebAclCapabilityData'],
      inputs: {
        shape: 'BindingContext with security:waf capability and directive.actions array',
        notes: 'Granular actions override test'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('WafBind__CustomActionsOverride__ReplacesCoarseActions', async () => {
      const strategy = new WafBinderStrategy();
      const target = createMockTargetComponent('waf-web-acl', {
        'security:waf': {
          webAclArn: WAF_WEB_ACL_ARN,
          webAclId: WAF_WEB_ACL_ID
        }
      });

      const customActions = ['wafv2:GetWebACL', 'wafv2:ListResourcesForWebACL'];
      const context = createBindingContext({
        source: createMockSourceComponent(),
        target,
        capability: 'security:waf',
        access: 'read',
        actions: customActions
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      expect(result.iamPolicies.length).toBeGreaterThan(0);
      const policy = result.iamPolicies.find(p => p.description.includes('granular actions'));
      expect(policy).toBeDefined();
      
      const statementJson = policy!.statement.toStatementJson();
      const actions = Array.isArray(statementJson.Action)
        ? statementJson.Action
        : [statementJson.Action];

      expect(actions).toEqual(expect.arrayContaining(customActions));
      expect(actions.length).toBe(customActions.length);
    });
  });

  describe('WafBind__InvalidActionPrefix__ThrowsPrefixMismatchError', () => {
    const metadata = {
      id: 'TP-binders-security-waf-011',
      level: 'unit' as const,
      capability: 'Throws error when actions array contains actions with wrong service prefix',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'WafBind__Condition__Outcome', example: 'WafBind__InvalidActionPrefix__ThrowsPrefixMismatchError' },
      invariants: [
        'Error message indicates service prefix mismatch',
        'Error specifies which actions are mismatched',
        'Binding fails before IAM policy generation'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'WafWebAclCapabilityData'],
      inputs: {
        shape: 'BindingContext with security:waf capability and directive.actions containing non-wafv2 actions',
        notes: 'Error case - invalid action prefix for WAF binder'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('WafBind__InvalidActionPrefix__ThrowsPrefixMismatchError', async () => {
      const strategy = new WafBinderStrategy();
      const target = createMockTargetComponent('waf-web-acl', {
        'security:waf': {
          webAclArn: WAF_WEB_ACL_ARN,
          webAclId: WAF_WEB_ACL_ID
        }
      });

      const invalidActions = ['s3:GetObject']; // Wrong service prefix
      const context = createBindingContext({
        source: createMockSourceComponent(),
        target,
        capability: 'security:waf',
        access: 'read',
        actions: invalidActions
      });

      await expect(executeUnifiedBinding(strategy, context)).rejects.toThrow(
        "Actions must match service prefix 'wafv2:'"
      );
    });
  });
});

