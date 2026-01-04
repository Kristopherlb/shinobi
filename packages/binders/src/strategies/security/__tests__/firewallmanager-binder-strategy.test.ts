/**
 * FirewallManagerBinderStrategy Tests (Unified)
 * 
 * Tests for FirewallManagerBinderStrategy following Platform Testing Standard v1.0
 * All tests assert EnhancedBindingResult structure (return-based, not mutation-based)
 */

import { FirewallManagerBinderStrategy } from '../firewallmanager-binder-strategy.js';
import {
  createMockSourceComponent,
  createMockTargetComponent,
  createBindingContext,
  executeUnifiedBinding,
  assertEnhancedBindingResult,
  TEST_CONSTANTS
} from './unified-strategy-test-helpers.js';
import type { EnhancedBindingResult } from '@shinobi/core';

describe('FirewallManagerBinderStrategy', () => {
  describe('FirewallManagerBind__PolicyReadAccess__ReturnsEnhancedResult', () => {
    const metadata = {
      id: 'TP-binders-security-firewallmanager-001',
      level: 'unit' as const,
      capability: 'Returns EnhancedBindingResult with all required fields including compliance block',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'FirewallManagerBind__Condition__Outcome', example: 'FirewallManagerBind__PolicyReadAccess__ReturnsEnhancedResult' },
      invariants: [
        'result.compliance.status exists and is one of compliant|non-compliant|partially-compliant',
        'result.environmentVariables contains AWS_FIREWALL_MANAGER_POLICY_ARN',
        'result.iamPolicies is an array with read actions',
        'result.securityGroupRules is an array'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'security:firewall-manager-policyCapabilityData'],
      inputs: {
        shape: 'BindingContext with security:firewall-manager-policy capability and read access',
        notes: 'Basic valid binding with read access'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('FirewallManagerBind__PolicyReadAccess__ReturnsEnhancedResult', async () => {
      const strategy = new FirewallManagerBinderStrategy();
      const source = createMockSourceComponent('lambda-security', 'test-source');
      
      const target = createMockTargetComponent('firewall-manager', {
        'security:firewall-manager-policy': {
          policyArn: 'arn:aws:fms:us-east-1:123456789012:policy/policy-123',
          coverageStatus: 'compliant',
          policyType: 'WAF'
        },
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'security:firewall-manager-policy',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      expect(result.environmentVariables.AWS_FIREWALL_MANAGER_POLICY_ARN).toBe('arn:aws:fms:us-east-1:123456789012:policy/policy-123');
      expect(result.environmentVariables.AWS_FIREWALL_MANAGER_COVERAGE_STATUS).toBe('compliant');
      expect(result.environmentVariables.AWS_FIREWALL_MANAGER_POLICY_TYPE).toBe('WAF');
      expect(result.iamPolicies.length).toBeGreaterThan(0);
      expect(['compliant', 'non-compliant', 'partially-compliant']).toContain(result.compliance.status);
    });
  });

  describe('FirewallManagerBind__PolicyWithAllFields__ExposesAllEnvironmentVariables', () => {
    const metadata = {
      id: 'TP-binders-security-firewallmanager-007',
      level: 'unit' as const,
      capability: 'Exposes all optional environment variables when provided in target data',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'FirewallManagerBind__Condition__Outcome', example: 'FirewallManagerBind__PolicyWithAllFields__ExposesAllEnvironmentVariables' },
      invariants: [
        'Environment variables include policy ID and status',
        'Environment variables include compliance detail and remediation enabled flag'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'security:firewall-manager-policyCapabilityData'],
      inputs: {
        shape: 'BindingContext with security:firewall-manager-policy capability with all optional fields',
        notes: 'Tests comprehensive field exposure'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('FirewallManagerBind__PolicyWithAllFields__ExposesAllEnvironmentVariables', async () => {
      const strategy = new FirewallManagerBinderStrategy();
      const source = createMockSourceComponent('lambda-security', 'test-source');
      
      const target = createMockTargetComponent('firewall-manager', {
        'security:firewall-manager-policy': {
          policyArn: 'arn:aws:fms:us-east-1:123456789012:policy/policy-123',
          policyId: 'policy-123',
          policyStatus: 'ACTIVE',
          coverageStatus: 'compliant',
          policyType: 'SHIELD_ADVANCED',
          complianceDetail: { compliantResources: 10, nonCompliantResources: 2 },
          remediationEnabled: true
        },
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'security:firewall-manager-policy',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      expect(result.environmentVariables.AWS_FIREWALL_MANAGER_POLICY_ID).toBe('policy-123');
      expect(result.environmentVariables.AWS_FIREWALL_MANAGER_POLICY_STATUS).toBe('ACTIVE');
      expect(result.environmentVariables.AWS_FIREWALL_MANAGER_COMPLIANCE_DETAIL).toBeDefined();
      expect(result.environmentVariables.AWS_FIREWALL_MANAGER_REMEDIATION_ENABLED).toBe('true');
    });
  });

  describe('FirewallManagerBind__WafRuleReadAccess__ReturnsEnhancedResult', () => {
    const metadata = {
      id: 'TP-binders-security-firewallmanager-002',
      level: 'unit' as const,
      capability: 'Returns EnhancedBindingResult for security:waf-rule capability',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'FirewallManagerBind__Condition__Outcome', example: 'FirewallManagerBind__WafRuleReadAccess__ReturnsEnhancedResult' },
      invariants: [
        'result.environmentVariables contains AWS_WAF_WEB_ACL_ARN',
        'IAM policies include wafv2:GetWebACL'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'security:waf-ruleCapabilityData'],
      inputs: {
        shape: 'BindingContext with security:waf-rule capability and read access',
        notes: 'Tests multi-capability support for WAF rules'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('FirewallManagerBind__WafRuleReadAccess__ReturnsEnhancedResult', async () => {
      const strategy = new FirewallManagerBinderStrategy();
      const source = createMockSourceComponent('lambda-security', 'test-source');
      
      const target = createMockTargetComponent('waf', {
        'security:waf-rule': {
          webAclArn: 'arn:aws:wafv2:us-east-1:123456789012:global/webacl/test-webacl',
          ruleGroupArn: 'arn:aws:wafv2:us-east-1:123456789012:global/rulegroup/test-rule-group',
          scope: 'CLOUDFRONT'
        },
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'security:waf-rule',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      expect(result.environmentVariables.AWS_WAF_WEB_ACL_ARN).toBe('arn:aws:wafv2:us-east-1:123456789012:global/webacl/test-webacl');
      expect(result.environmentVariables.AWS_WAF_RULE_GROUP_ARN).toBe('arn:aws:wafv2:us-east-1:123456789012:global/rulegroup/test-rule-group');
      expect(result.environmentVariables.AWS_WAF_SCOPE).toBe('CLOUDFRONT');
      
      const wafPolicy = result.iamPolicies.find(p => 
        p.description.includes('WAF')
      );
      expect(wafPolicy).toBeDefined();
      expect(wafPolicy?.statement.actions).toContain('wafv2:GetWebACL');
    });
  });

  describe('FirewallManagerBind__PolicyWriteAccess__ReturnsWritePolicies', () => {
    const metadata = {
      id: 'TP-binders-security-firewallmanager-003',
      level: 'unit' as const,
      capability: 'Returns IAM policies with write actions for write access',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'FirewallManagerBind__Condition__Outcome', example: 'FirewallManagerBind__PolicyWriteAccess__ReturnsWritePolicies' },
      invariants: [
        'IAM policies include fms:PutPolicy',
        'IAM policies include fms:DeletePolicy'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'security:firewall-manager-policyCapabilityData'],
      inputs: {
        shape: 'BindingContext with security:firewall-manager-policy capability and write access',
        notes: 'Tests write access IAM policy generation'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('FirewallManagerBind__PolicyWriteAccess__ReturnsWritePolicies', async () => {
      const strategy = new FirewallManagerBinderStrategy();
      const source = createMockSourceComponent('lambda-security', 'test-source');
      
      const target = createMockTargetComponent('firewall-manager', {
        'security:firewall-manager-policy': {
          policyArn: 'arn:aws:fms:us-east-1:123456789012:policy/policy-123'
        },
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'security:firewall-manager-policy',
        access: 'write'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);
      
      const writePolicy = result.iamPolicies.find(p => 
        p.description.includes('write')
      );
      expect(writePolicy).toBeDefined();
      expect(writePolicy?.statement.actions).toContain('fms:PutPolicy');
    });
  });

  describe('FirewallManagerBind__WithSecureAccess__AddsSecurityHubPolicies', () => {
    const metadata = {
      id: 'TP-binders-security-firewallmanager-004',
      level: 'unit' as const,
      capability: 'Adds Security Hub IAM policies when requireSecureAccess option is provided',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'FirewallManagerBind__Condition__Outcome', example: 'FirewallManagerBind__WithSecureAccess__AddsSecurityHubPolicies' },
      invariants: [
        'IAM policies include securityhub:BatchImportFindings',
        'IAM policies include CloudWatch Logs integration'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'security:firewall-manager-policyCapabilityData'],
      inputs: {
        shape: 'BindingContext with security:firewall-manager-policy capability and requireSecureAccess option',
        notes: 'Tests secure hooks support'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('FirewallManagerBind__WithSecureAccess__AddsSecurityHubPolicies', async () => {
      const strategy = new FirewallManagerBinderStrategy();
      const source = createMockSourceComponent('lambda-security', 'test-source');
      
      const target = createMockTargetComponent('firewall-manager', {
        'security:firewall-manager-policy': {
          policyArn: 'arn:aws:fms:us-east-1:123456789012:policy/policy-123'
        },
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'security:firewall-manager-policy',
        access: 'read',
        options: {
          requireSecureAccess: true
        }
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);
      
      const securityHubPolicy = result.iamPolicies.find(p => 
        p.description.includes('Security Hub')
      );
      expect(securityHubPolicy).toBeDefined();
      expect(securityHubPolicy?.statement.actions).toContain('securityhub:BatchImportFindings');
    });
  });

  describe('FirewallManagerBind__MissingPolicyArn__ThrowsError', () => {
    const metadata = {
      id: 'TP-binders-security-firewallmanager-005',
      level: 'unit' as const,
      capability: 'Throws error when required policyArn property is missing',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'FirewallManagerBind__Condition__Outcome', example: 'FirewallManagerBind__MissingPolicyArn__ThrowsError' },
      invariants: [
        'Error message includes "missing required policyArn"',
        'Error is thrown before binding completes'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with security:firewall-manager-policy capability but missing policyArn',
        notes: 'Tests validation error handling'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('FirewallManagerBind__MissingPolicyArn__ThrowsError', async () => {
      const strategy = new FirewallManagerBinderStrategy();
      const source = createMockSourceComponent('lambda-security', 'test-source');
      
      const target = createMockTargetComponent('firewall-manager', {
        'security:firewall-manager-policy': {
          // Missing policyArn
        },
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'security:firewall-manager-policy',
        access: 'read'
      });

      await expect(executeUnifiedBinding(strategy, context)).rejects.toThrow('missing required policyArn');
    });
  });

  describe('FirewallManagerBind__MissingWebAclArn__ThrowsError', () => {
    const metadata = {
      id: 'TP-binders-security-firewallmanager-006',
      level: 'unit' as const,
      capability: 'Throws error when required webAclArn property is missing for WAF rule',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'FirewallManagerBind__Condition__Outcome', example: 'FirewallManagerBind__MissingWebAclArn__ThrowsError' },
      invariants: [
        'Error message includes "missing required webAclArn"',
        'Error is thrown before binding completes'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with security:waf-rule capability but missing webAclArn',
        notes: 'Tests validation error handling for WAF rule capability'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('FirewallManagerBind__MissingWebAclArn__ThrowsError', async () => {
      const strategy = new FirewallManagerBinderStrategy();
      const source = createMockSourceComponent('lambda-security', 'test-source');
      
      const target = createMockTargetComponent('waf', {
        'security:waf-rule': {
          // Missing webAclArn
        },
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'security:waf-rule',
        access: 'read'
      });

      await expect(executeUnifiedBinding(strategy, context)).rejects.toThrow('missing required webAclArn');
    });
  });

  describe('FirewallManagerBind__CustomActionsOverride__ReplacesCoarseActions', () => {
    const metadata = {
      id: 'TP-binders-firewallmanager-015',
      level: 'unit' as const,
      capability: 'Custom actions override replaces default coarse-grained actions',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'FirewallManagerBind__Condition__Outcome', example: 'FirewallManagerBind__CustomActionsOverride__ReplacesCoarseActions' },
      invariants: [
        'IAM policy actions match provided custom actions',
        'Default coarse access actions are not present',
        'Single policy statement is generated'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with security:firewall-manager-policy capability and directive.actions array',
        notes: 'Granular actions override test'
      },
      risks: [],
      dependencies: ['action-resolver'],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('FirewallManagerBind__CustomActionsOverride__ReplacesCoarseActions', async () => {
      const strategy = new FirewallManagerBinderStrategy();
      const target = createMockTargetComponent('firewall-manager-policy', {
        'security:firewall-manager-policy': {
          policyArn: 'arn:aws:fms:us-east-1:123456789012:policy/policy-12345678'
        }
      });

      const customActions = ['fms:GetPolicy', 'fms:ListPolicies'];
      const context = createBindingContext({
        source: createMockSourceComponent(),
        target,
        capability: 'security:firewall-manager-policy',
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

  describe('FirewallManagerBind__InvalidActionPrefix__ThrowsPrefixMismatchError', () => {
    const metadata = {
      id: 'TP-binders-firewallmanager-016',
      level: 'unit' as const,
      capability: 'Throws error when custom actions have mismatched service prefix',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'FirewallManagerBind__Condition__Outcome', example: 'FirewallManagerBind__InvalidActionPrefix__ThrowsPrefixMismatchError' },
      invariants: [
        'Error message indicates mismatched prefix',
        'Error is thrown by action-resolver'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with security:firewall-manager-policy capability and directive.actions with invalid prefix',
        notes: 'Error case - invalid action prefix'
      },
      risks: ['Incorrect IAM policy generation'],
      dependencies: ['action-resolver'],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('FirewallManagerBind__InvalidActionPrefix__ThrowsPrefixMismatchError', async () => {
      const strategy = new FirewallManagerBinderStrategy();
      const target = createMockTargetComponent('firewall-manager-policy', {
        'security:firewall-manager-policy': {
          policyArn: 'arn:aws:fms:us-east-1:123456789012:policy/policy-12345678'
        }
      });

      const invalidActions = ['s3:GetObject']; // Invalid prefix for Firewall Manager
      const context = createBindingContext({
        source: createMockSourceComponent(),
        target,
        capability: 'security:firewall-manager-policy',
        access: 'read',
        actions: invalidActions
      });

      await expect(executeUnifiedBinding(strategy, context)).rejects.toThrow(
        "Actions must match service prefix 'fms:'"
      );
    });
  });
});

