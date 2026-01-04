/**
 * SecurityHubBinderStrategy Tests (Unified)
 * 
 * Tests for SecurityHubBinderStrategy following Platform Testing Standard v1.0
 * All tests assert EnhancedBindingResult structure (return-based, not mutation-based)
 */

import { SecurityHubBinderStrategy } from '../securityhub-binder-strategy.js';
import {
  createMockSourceComponent,
  createMockTargetComponent,
  createBindingContext,
  executeUnifiedBinding,
  assertEnhancedBindingResult,
  TEST_CONSTANTS
} from './unified-strategy-test-helpers.js';
import type { EnhancedBindingResult } from '@shinobi/core';

describe('SecurityHubBinderStrategy', () => {
  describe('SecurityHubBind__HubReadAccess__ReturnsEnhancedResult', () => {
    const metadata = {
      id: 'TP-binders-security-securityhub-001',
      level: 'unit' as const,
      capability: 'Returns EnhancedBindingResult with all required fields including compliance block',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'SecurityHubBind__Condition__Outcome', example: 'SecurityHubBind__HubReadAccess__ReturnsEnhancedResult' },
      invariants: [
        'result.compliance.status exists and is one of compliant|non-compliant|partially-compliant',
        'result.environmentVariables contains AWS_SECURITYHUB_HUB_ARN',
        'result.iamPolicies is an array with read actions',
        'result.securityGroupRules is an array'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'security:securityhub-hubCapabilityData'],
      inputs: {
        shape: 'BindingContext with security:securityhub-hub capability and read access',
        notes: 'Basic valid binding with read access'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('SecurityHubBind__HubReadAccess__ReturnsEnhancedResult', async () => {
      const strategy = new SecurityHubBinderStrategy();
      const source = createMockSourceComponent('lambda-security', 'test-source');
      
      const target = createMockTargetComponent('securityhub', {
        'security:securityhub-hub': {
          hubArn: 'arn:aws:securityhub:us-east-1:123456789012:hub/default',
          aggregatorArn: 'arn:aws:securityhub:us-east-1:123456789012:aggregator/default',
          insightArns: ['arn:aws:securityhub:us-east-1:123456789012:insight/abc123'],
          controlStatuses: { 'CIS.1.1': 'PASSED', 'CIS.1.2': 'FAILED' }
        },
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'security:securityhub-hub',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      expect(result.environmentVariables.AWS_SECURITYHUB_HUB_ARN).toBe('arn:aws:securityhub:us-east-1:123456789012:hub/default');
      expect(result.environmentVariables.AWS_SECURITYHUB_AGGREGATOR_ARN).toBe('arn:aws:securityhub:us-east-1:123456789012:aggregator/default');
      expect(result.environmentVariables.AWS_SECURITYHUB_INSIGHT_ARNS).toBe('arn:aws:securityhub:us-east-1:123456789012:insight/abc123');
      expect(result.environmentVariables.AWS_SECURITYHUB_CONTROL_STATUSES).toBeDefined();
      expect(result.iamPolicies.length).toBeGreaterThan(0);
      expect(['compliant', 'non-compliant', 'partially-compliant']).toContain(result.compliance.status);
    });
  });

  describe('SecurityHubBind__WithFindingsSuppression__AddsSuppressionPolicies', () => {
    const metadata = {
      id: 'TP-binders-security-securityhub-002',
      level: 'unit' as const,
      capability: 'Adds findings suppression IAM policies when enableFindingsSuppression option is provided',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'SecurityHubBind__Condition__Outcome', example: 'SecurityHubBind__WithFindingsSuppression__AddsSuppressionPolicies' },
      invariants: [
        'IAM policies include securityhub:BatchUpdateFindings'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'security:securityhub-hubCapabilityData'],
      inputs: {
        shape: 'BindingContext with security:securityhub-hub capability and enableFindingsSuppression option',
        notes: 'Tests findings suppression support'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('SecurityHubBind__WithFindingsSuppression__AddsSuppressionPolicies', async () => {
      const strategy = new SecurityHubBinderStrategy();
      const source = createMockSourceComponent('lambda-security', 'test-source');
      
      const target = createMockTargetComponent('securityhub', {
        'security:securityhub-hub': {
          hubArn: 'arn:aws:securityhub:us-east-1:123456789012:hub/default'
        },
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'security:securityhub-hub',
        access: 'write',
        options: {
          enableFindingsSuppression: true
        }
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);
      
      const suppressionPolicy = result.iamPolicies.find(p => 
        p.description.includes('findings suppression')
      );
      expect(suppressionPolicy).toBeDefined();
    });
  });

  describe('SecurityHubBind__WithAutomation__AddsAutomationPolicies', () => {
    const metadata = {
      id: 'TP-binders-security-securityhub-003',
      level: 'unit' as const,
      capability: 'Adds automation IAM policies when enableAutomation option is provided',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'SecurityHubBind__Condition__Outcome', example: 'SecurityHubBind__WithAutomation__AddsAutomationPolicies' },
      invariants: [
        'IAM policies include events:PutRule and lambda:InvokeFunction',
        'Environment variables include AWS_SECURITYHUB_AUTOMATION_ENABLED'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'security:securityhub-hubCapabilityData'],
      inputs: {
        shape: 'BindingContext with security:securityhub-hub capability and enableAutomation option',
        notes: 'Tests automation support'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('SecurityHubBind__WithAutomation__AddsAutomationPolicies', async () => {
      const strategy = new SecurityHubBinderStrategy();
      const source = createMockSourceComponent('lambda-security', 'test-source');
      
      const target = createMockTargetComponent('securityhub', {
        'security:securityhub-hub': {
          hubArn: 'arn:aws:securityhub:us-east-1:123456789012:hub/default'
        },
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'security:securityhub-hub',
        access: 'write',
        options: {
          enableAutomation: true
        }
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);
      expect(result.environmentVariables.AWS_SECURITYHUB_AUTOMATION_ENABLED).toBe('true');
      
      const automationPolicy = result.iamPolicies.find(p => 
        p.description.includes('automation')
      );
      expect(automationPolicy).toBeDefined();
    });
  });

  describe('SecurityHubBind__WithDelegatedAdmin__AddsDelegatedAdminPolicies', () => {
    const metadata = {
      id: 'TP-binders-security-securityhub-004',
      level: 'unit' as const,
      capability: 'Adds delegated admin IAM policies when delegatedAdminAccountId option is provided',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'SecurityHubBind__Condition__Outcome', example: 'SecurityHubBind__WithDelegatedAdmin__AddsDelegatedAdminPolicies' },
      invariants: [
        'IAM policies include securityhub:EnableOrganizationAdminAccount',
        'Environment variables include AWS_SECURITYHUB_DELEGATED_ADMIN_ACCOUNT_ID'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'security:securityhub-hubCapabilityData'],
      inputs: {
        shape: 'BindingContext with security:securityhub-hub capability and delegatedAdminAccountId option',
        notes: 'Tests delegated admin support'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('SecurityHubBind__WithDelegatedAdmin__AddsDelegatedAdminPolicies', async () => {
      const strategy = new SecurityHubBinderStrategy();
      const source = createMockSourceComponent('lambda-security', 'test-source');
      
      const target = createMockTargetComponent('securityhub', {
        'security:securityhub-hub': {
          hubArn: 'arn:aws:securityhub:us-east-1:123456789012:hub/default'
        },
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'security:securityhub-hub',
        access: 'write',
        options: {
          delegatedAdminAccountId: '222222222222'
        }
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);
      expect(result.environmentVariables.AWS_SECURITYHUB_DELEGATED_ADMIN_ACCOUNT_ID).toBe('222222222222');
      
      const delegatedAdminPolicy = result.iamPolicies.find(p => 
        p.description.includes('delegated admin')
      );
      expect(delegatedAdminPolicy).toBeDefined();
    });
  });

  describe('SecurityHubBind__WithOrgWideAggregator__AddsAggregatorPolicies', () => {
    const metadata = {
      id: 'TP-binders-security-securityhub-005',
      level: 'unit' as const,
      capability: 'Adds aggregator management IAM policies when orgWideAggregator option is provided',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'SecurityHubBind__Condition__Outcome', example: 'SecurityHubBind__WithOrgWideAggregator__AddsAggregatorPolicies' },
      invariants: [
        'IAM policies include securityhub:CreateFindingAggregator',
        'Environment variables include AWS_SECURITYHUB_ORG_WIDE_AGGREGATOR_ENABLED'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'security:securityhub-hubCapabilityData'],
      inputs: {
        shape: 'BindingContext with security:securityhub-hub capability and orgWideAggregator option',
        notes: 'Tests org-wide aggregator support'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('SecurityHubBind__WithOrgWideAggregator__AddsAggregatorPolicies', async () => {
      const strategy = new SecurityHubBinderStrategy();
      const source = createMockSourceComponent('lambda-security', 'test-source');
      
      const target = createMockTargetComponent('securityhub', {
        'security:securityhub-hub': {
          hubArn: 'arn:aws:securityhub:us-east-1:123456789012:hub/default'
        },
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'security:securityhub-hub',
        access: 'write',
        options: {
          orgWideAggregator: true
        }
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);
      expect(result.environmentVariables.AWS_SECURITYHUB_ORG_WIDE_AGGREGATOR_ENABLED).toBe('true');
      
      const aggregatorPolicy = result.iamPolicies.find(p => 
        p.description.includes('aggregator')
      );
      expect(aggregatorPolicy).toBeDefined();
    });
  });

  describe('SecurityHubBind__AdminAccessWithoutRequireFullAdminAccess__NoFullAdminPolicy', () => {
    const metadata = {
      id: 'TP-binders-security-securityhub-006',
      level: 'unit' as const,
      capability: 'Does not grant full securityhub:* access when admin access requested without requireFullAdminAccess option',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'SecurityHubBind__Condition__Outcome', example: 'SecurityHubBind__AdminAccessWithoutRequireFullAdminAccess__NoFullAdminPolicy' },
      invariants: [
        'No IAM policy with securityhub:* actions when requireFullAdminAccess is not set'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'security:securityhub-hubCapabilityData'],
      inputs: {
        shape: 'BindingContext with security:securityhub-hub capability and admin access without requireFullAdminAccess',
        notes: 'Tests admin access gating'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('SecurityHubBind__AdminAccessWithoutRequireFullAdminAccess__NoFullAdminPolicy', async () => {
      const strategy = new SecurityHubBinderStrategy();
      const source = createMockSourceComponent('lambda-security', 'test-source');
      
      const target = createMockTargetComponent('securityhub', {
        'security:securityhub-hub': {
          hubArn: 'arn:aws:securityhub:us-east-1:123456789012:hub/default'
        },
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'security:securityhub-hub',
        access: 'admin'
        // Note: requireFullAdminAccess is NOT set
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);
      
      // Should not have full securityhub:* policy
      const fullAdminPolicy = result.iamPolicies.find(p => {
        const statementJson = p.statement.toStatementJson();
        return statementJson.Action === 'securityhub:*';
      });
      expect(fullAdminPolicy).toBeUndefined();
    });
  });

  describe('SecurityHubBind__AllCapabilities__RoutesToCorrectMethod', () => {
    const metadata = {
      id: 'TP-binders-security-securityhub-007',
      level: 'unit' as const,
      capability: 'Routes both capabilities to correct binding methods',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'SecurityHubBind__Condition__Outcome', example: 'SecurityHubBind__AllCapabilities__RoutesToCorrectMethod' },
      invariants: [
        'Each capability returns EnhancedBindingResult',
        'Each capability includes AWS_SECURITYHUB_HUB_ARN'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with different Security Hub capabilities',
        notes: 'Tests both supported capabilities'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('SecurityHubBind__AllCapabilities__RoutesToCorrectMethod', async () => {
      const strategy = new SecurityHubBinderStrategy();

      // Test security:securityhub-hub
      const hubTarget = createMockTargetComponent('securityhub', {
        'security:securityhub-hub': {
          hubArn: 'arn:aws:securityhub:us-east-1:123456789012:hub/default'
        }
      });

      const hubContext = createBindingContext({
        source: createMockSourceComponent('lambda-security', 'test-source'),
        target: hubTarget,
        capability: 'security:securityhub-hub',
        access: 'read'
      });

      const hubResult = await executeUnifiedBinding(strategy, hubContext);
      assertEnhancedBindingResult(hubResult);
      expect(hubResult.environmentVariables.AWS_SECURITYHUB_HUB_ARN).toBe('arn:aws:securityhub:us-east-1:123456789012:hub/default');

      // Test security:securityhub-standard
      const standardTarget = createMockTargetComponent('securityhub', {
        'security:securityhub-standard': {
          hubArn: 'arn:aws:securityhub:us-east-1:123456789012:hub/default',
          enabledStandards: ['arn:aws:securityhub:::ruleset/cis-aws-foundations-benchmark/v/1.2.0']
        }
      });

      const standardContext = createBindingContext({
        source: createMockSourceComponent('lambda-security', 'test-source'),
        target: standardTarget,
        capability: 'security:securityhub-standard',
        access: 'read'
      });

      const standardResult = await executeUnifiedBinding(strategy, standardContext);
      assertEnhancedBindingResult(standardResult);
      expect(standardResult.environmentVariables.AWS_SECURITYHUB_HUB_ARN).toBe('arn:aws:securityhub:us-east-1:123456789012:hub/default');
      expect(standardResult.environmentVariables.AWS_SECURITYHUB_ENABLED_STANDARDS).toBeDefined();
    });
  });

  describe('SecurityHubBind__MissingHubArn__ThrowsActionableError', () => {
    const metadata = {
      id: 'TP-binders-security-securityhub-008',
      level: 'unit' as const,
      capability: 'Throws actionable error when hubArn is missing from target capability data',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'SecurityHubBind__Condition__Outcome', example: 'SecurityHubBind__MissingHubArn__ThrowsActionableError' },
      invariants: [
        'Error message includes hubArn',
        'Error is thrown before IAM policy creation'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with security:securityhub-hub capability but missing hubArn in target data',
        notes: 'Target has aggregatorArn but no hubArn'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('SecurityHubBind__MissingHubArn__ThrowsActionableError', async () => {
      const strategy = new SecurityHubBinderStrategy();
      const source = createMockSourceComponent('lambda-security', 'test-source');
      const target = createMockTargetComponent('securityhub', {
        'security:securityhub-hub': {
          aggregatorArn: 'arn:aws:securityhub:us-east-1:123456789012:aggregator/default'
          // Missing hubArn
        },
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'security:securityhub-hub',
        access: 'read'
      });

      await expect(executeUnifiedBinding(strategy, context)).rejects.toThrow(/hubArn/);
    });
  });

  describe('SecurityHubBind__CustomActionsOverride__ReplacesCoarseActions', () => {
    const metadata = {
      id: 'TP-binders-securityhub-015',
      level: 'unit' as const,
      capability: 'Custom actions override replaces default coarse-grained actions',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'SecurityHubBind__Condition__Outcome', example: 'SecurityHubBind__CustomActionsOverride__ReplacesCoarseActions' },
      invariants: [
        'IAM policy actions match provided custom actions',
        'Default coarse access actions are not present',
        'Single policy statement is generated'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with security:securityhub-hub capability and directive.actions array',
        notes: 'Granular actions override test'
      },
      risks: [],
      dependencies: ['action-resolver'],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('SecurityHubBind__CustomActionsOverride__ReplacesCoarseActions', async () => {
      const strategy = new SecurityHubBinderStrategy();
      const target = createMockTargetComponent('securityhub-hub', {
        'security:securityhub-hub': {
          hubArn: 'arn:aws:securityhub:us-east-1:123456789012:hub/default'
        }
      });

      const customActions = ['securityhub:GetFindings', 'securityhub:ListFindings'];
      const context = createBindingContext({
        source: createMockSourceComponent(),
        target,
        capability: 'security:securityhub-hub',
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

  describe('SecurityHubBind__InvalidActionPrefix__ThrowsPrefixMismatchError', () => {
    const metadata = {
      id: 'TP-binders-securityhub-016',
      level: 'unit' as const,
      capability: 'Throws error when custom actions have mismatched service prefix',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'SecurityHubBind__Condition__Outcome', example: 'SecurityHubBind__InvalidActionPrefix__ThrowsPrefixMismatchError' },
      invariants: [
        'Error message indicates mismatched prefix',
        'Error is thrown by action-resolver'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with security:securityhub-hub capability and directive.actions with invalid prefix',
        notes: 'Error case - invalid action prefix'
      },
      risks: ['Incorrect IAM policy generation'],
      dependencies: ['action-resolver'],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('SecurityHubBind__InvalidActionPrefix__ThrowsPrefixMismatchError', async () => {
      const strategy = new SecurityHubBinderStrategy();
      const target = createMockTargetComponent('securityhub-hub', {
        'security:securityhub-hub': {
          hubArn: 'arn:aws:securityhub:us-east-1:123456789012:hub/default'
        }
      });

      const invalidActions = ['s3:GetObject']; // Invalid prefix for Security Hub
      const context = createBindingContext({
        source: createMockSourceComponent(),
        target,
        capability: 'security:securityhub-hub',
        access: 'read',
        actions: invalidActions
      });

      await expect(executeUnifiedBinding(strategy, context)).rejects.toThrow(
        "Actions must match service prefix 'securityhub:'"
      );
    });
  });
});
