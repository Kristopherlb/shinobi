/**
 * BudgetsBinderStrategy Tests (Unified)
 * 
 * Tests for BudgetsBinderStrategy following Platform Testing Standard v1.0
 * All tests assert EnhancedBindingResult structure (return-based, not mutation-based)
 */

import { BudgetsBinderStrategy } from '../budgets-binder-strategy.js';
import {
  createMockSourceComponent,
  createMockTargetComponent,
  createBindingContext,
  executeUnifiedBinding,
  assertEnhancedBindingResult,
  TEST_CONSTANTS
} from '../../security/__tests__/unified-strategy-test-helpers.js';
import type { EnhancedBindingResult } from '@shinobi/core';

describe('BudgetsBinderStrategy', () => {
  describe('BudgetsBind__ValidAccess__ReturnsEnhancedResult', () => {
    const metadata = {
      id: 'TP-binders-governance-budgets-001',
      level: 'unit' as const,
      capability: 'Returns EnhancedBindingResult with all required fields including compliance block',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'BudgetsBind__Condition__Outcome', example: 'BudgetsBind__ValidAccess__ReturnsEnhancedResult' },
      invariants: [
        'result.compliance.status exists and is one of compliant|non-compliant|partially-compliant',
        'result.environmentVariables contains expected keys',
        'result.iamPolicies is an array',
        'result.securityGroupRules is an array'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'governance:budgets-budgetCapabilityData'],
      inputs: {
        shape: 'BindingContext with governance:budgets-budget capability',
        notes: 'Basic valid binding with read access'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('BudgetsBind__ValidAccess__ReturnsEnhancedResult', async () => {
      const strategy = new BudgetsBinderStrategy();
      const source = createMockSourceComponent('lambda-governance', 'test-source');
      
      const target = createMockTargetComponent('budgets', {
        'governance:budgets-budget': {
          budgetArn: 'arn:aws:budgets::123456789012:budget/test-budget',
          budgetName: 'test-budget',
          budgetType: 'COST',
          budgetAmount: 1000,
          timeUnit: 'MONTHLY',
          alertThreshold: 80
        },
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'governance:budgets-budget',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      expect(result.environmentVariables.AWS_BUDGETS_BUDGET_ARN).toBe('arn:aws:budgets::123456789012:budget/test-budget');
      expect(result.environmentVariables.AWS_BUDGETS_BUDGET_NAME).toBe('test-budget');
      expect(result.environmentVariables.AWS_BUDGETS_BUDGET_TYPE).toBe('COST');
      expect(result.environmentVariables.AWS_BUDGETS_BUDGET_AMOUNT).toBe('1000');
      expect(result.environmentVariables.AWS_BUDGETS_TIME_UNIT).toBe('MONTHLY');
      expect(result.environmentVariables.AWS_BUDGETS_ALERT_THRESHOLD).toBe('80');
      expect(result.iamPolicies.length).toBeGreaterThan(0);
      expect(['compliant', 'non-compliant', 'partially-compliant']).toContain(result.compliance.status);
    });
  });

  describe('BudgetsBind__WithNotificationAndReport__ExposesNotificationAndReport', () => {
    const metadata = {
      id: 'TP-binders-governance-budgets-002',
      level: 'unit' as const,
      capability: 'Exposes budget notification and report ARNs when provided',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'BudgetsBind__Condition__Outcome', example: 'BudgetsBind__WithNotificationAndReport__ExposesNotificationAndReport' },
      invariants: [
        'Environment variables include AWS_BUDGETS_NOTIFICATION_ARN and AWS_BUDGETS_REPORT_ARN when provided'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'governance:budgets-budgetCapabilityData'],
      inputs: {
        shape: 'BindingContext with governance:budgets-budget capability including notification and report ARNs',
        notes: 'Tests notification and report exposure'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('BudgetsBind__WithNotificationAndReport__ExposesNotificationAndReport', async () => {
      const strategy = new BudgetsBinderStrategy();
      const source = createMockSourceComponent('lambda-governance', 'test-source');
      
      const target = createMockTargetComponent('budgets', {
        'governance:budgets-budget': {
          budgetArn: 'arn:aws:budgets::123456789012:budget/test-budget',
          notificationArn: 'arn:aws:sns:us-east-1:123456789012:budget-notification',
          reportArn: 'arn:aws:budgets::123456789012:report/test-report',
          snsTopicArn: 'arn:aws:sns:us-east-1:123456789012:budget-alerts'
        },
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'governance:budgets-budget',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      expect(result.environmentVariables.AWS_BUDGETS_NOTIFICATION_ARN).toBe('arn:aws:sns:us-east-1:123456789012:budget-notification');
      expect(result.environmentVariables.AWS_BUDGETS_REPORT_ARN).toBe('arn:aws:budgets::123456789012:report/test-report');
    });
  });

  describe('BudgetsBind__WithOrgWideBudget__AddsOrgWidePolicies', () => {
    const metadata = {
      id: 'TP-binders-governance-budgets-003',
      level: 'unit' as const,
      capability: 'Adds Organizations IAM policies when orgWideBudget option is provided',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'BudgetsBind__Condition__Outcome', example: 'BudgetsBind__WithOrgWideBudget__AddsOrgWidePolicies' },
      invariants: [
        'IAM policies include Organizations actions when orgWideBudget option is set'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'governance:budgets-budgetCapabilityData'],
      inputs: {
        shape: 'BindingContext with governance:budgets-budget capability and orgWideBudget option',
        notes: 'Tests org-wide budget support'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('BudgetsBind__WithOrgWideBudget__AddsOrgWidePolicies', async () => {
      const strategy = new BudgetsBinderStrategy();
      const source = createMockSourceComponent('lambda-governance', 'test-source');
      
      const target = createMockTargetComponent('budgets', {
        'governance:budgets-budget': {
          budgetArn: 'arn:aws:budgets::123456789012:budget/test-budget',
          orgId: 'o-1234567890'
        },
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'governance:budgets-budget',
        access: 'read',
        options: { orgWideBudget: true }
      });

      const result = await executeUnifiedBinding(strategy, context);

      const orgPolicy = result.iamPolicies.find(p => {
        const statementJson = p.statement.toStatementJson();
        const actions = Array.isArray(statementJson.Action) ? statementJson.Action : [statementJson.Action];
        return actions.some((a: string) => a.includes('organizations:'));
      });
      expect(orgPolicy).toBeDefined();
      expect(result.environmentVariables.AWS_ORGANIZATIONS_ID).toBe('o-1234567890');
    });
  });

  describe('BudgetsBind__CustomActionsOverride__ReplacesCoarseActions', () => {
    const metadata = {
      id: 'TP-binders-governance-budgets-004',
      level: 'unit' as const,
      capability: 'Custom actions override replaces default Budgets actions',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'BudgetsBind__Condition__Outcome', example: 'BudgetsBind__CustomActionsOverride__ReplacesCoarseActions' },
      invariants: [
        'IAM policy actions match provided custom actions array',
        'Default Budgets actions are not included when custom actions provided',
        'Actions array is used directly (replaces coarse access)'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with governance:budgets-budget capability and directive.actions array',
        notes: 'Granular actions override test'
      },
      risks: [],
      dependencies: ['action-resolver'],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('BudgetsBind__CustomActionsOverride__ReplacesCoarseActions', async () => {
      const strategy = new BudgetsBinderStrategy();
      const customActions = ['budgets:ViewBudget', 'budgets:DescribeBudget'];
      const target = createMockTargetComponent('budgets', {
        'governance:budgets-budget': {
          budgetArn: 'arn:aws:budgets::123456789012:budget/test-budget'
        },
      });

      const context = createBindingContext({
        source: createMockSourceComponent('lambda-governance', 'test-source'),
        target,
        capability: 'governance:budgets-budget',
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

      // Primary assertion: Custom actions are used, default actions are not
      expect(actions).toEqual(customActions);
      expect(actions).not.toContain('budgets:DescribeBudgets');
      expect(actions).not.toContain('budgets:DescribeBudgetPerformanceHistory');
    });
  });

  describe('BudgetsBind__WriteAccess__GrantsWriteActions', () => {
    const metadata = {
      id: 'TP-binders-governance-budgets-005',
      level: 'unit' as const,
      capability: 'Write access grants Budgets write actions',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'BudgetsBind__Condition__Outcome', example: 'BudgetsBind__WriteAccess__GrantsWriteActions' },
      invariants: [
        'IAM policies include Budgets write actions',
        'Write actions are present for write access level'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with governance:budgets-budget capability and write access',
        notes: 'Write access test'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('BudgetsBind__WriteAccess__GrantsWriteActions', async () => {
      const strategy = new BudgetsBinderStrategy();
      const target = createMockTargetComponent('budgets', {
        'governance:budgets-budget': {
          budgetArn: 'arn:aws:budgets::123456789012:budget/test-budget'
        }
      });

      const context = createBindingContext({
        source: createMockSourceComponent('lambda-governance', 'test-source'),
        target,
        capability: 'governance:budgets-budget',
        access: 'write'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      const policy = result.iamPolicies.find(p => p.description.includes('write access'));
      expect(policy).toBeDefined();
      
      const statementJson = policy!.statement.toStatementJson();
      const actions = Array.isArray(statementJson.Action)
        ? statementJson.Action
        : [statementJson.Action];

      expect(actions).toContain('budgets:CreateBudget');
      expect(actions).toContain('budgets:ModifyBudget');
      expect(actions).toContain('budgets:DeleteBudget');
    });
  });

  describe('BudgetsBind__AdminAccessWithFullAdminOption__GrantsAdminActions', () => {
    const metadata = {
      id: 'TP-binders-governance-budgets-006',
      level: 'unit' as const,
      capability: 'Admin access with requireFullAdminAccess option grants admin actions',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'BudgetsBind__Condition__Outcome', example: 'BudgetsBind__AdminAccessWithFullAdminOption__GrantsAdminActions' },
      invariants: [
        'IAM policies include Budgets admin actions when requireFullAdminAccess option is set',
        'Admin actions include budgets:*'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with governance:budgets-budget capability, admin access, and requireFullAdminAccess option',
        notes: 'Admin access with option test'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('BudgetsBind__AdminAccessWithFullAdminOption__GrantsAdminActions', async () => {
      const strategy = new BudgetsBinderStrategy();
      const target = createMockTargetComponent('budgets', {
        'governance:budgets-budget': {
          budgetArn: 'arn:aws:budgets::123456789012:budget/test-budget'
        }
      });

      const context = createBindingContext({
        source: createMockSourceComponent('lambda-governance', 'test-source'),
        target,
        capability: 'governance:budgets-budget',
        access: 'admin',
        options: { requireFullAdminAccess: true }
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      const policy = result.iamPolicies.find(p => p.description.includes('admin access'));
      expect(policy).toBeDefined();
      
      const statementJson = policy!.statement.toStatementJson();
      const actions = Array.isArray(statementJson.Action)
        ? statementJson.Action
        : [statementJson.Action];

      expect(actions).toContain('budgets:*');
    });
  });

  describe('BudgetsBind__SNSTopicArn__GrantsSNSPublishPermissions', () => {
    const metadata = {
      id: 'TP-binders-governance-budgets-007',
      level: 'unit' as const,
      capability: 'SNS topic ARN grants SNS publish permissions',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'BudgetsBind__Condition__Outcome', example: 'BudgetsBind__SNSTopicArn__GrantsSNSPublishPermissions' },
      invariants: [
        'IAM policies include SNS publish actions when snsTopicArn is provided',
        'SNS policy references the correct topic ARN'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with governance:budgets-budget capability and snsTopicArn',
        notes: 'SNS permissions test'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('BudgetsBind__SNSTopicArn__GrantsSNSPublishPermissions', async () => {
      const strategy = new BudgetsBinderStrategy();
      const snsTopicArn = 'arn:aws:sns:us-east-1:123456789012:budget-alerts';
      const target = createMockTargetComponent('budgets', {
        'governance:budgets-budget': {
          budgetArn: 'arn:aws:budgets::123456789012:budget/test-budget',
          snsTopicArn
        }
      });

      const context = createBindingContext({
        source: createMockSourceComponent('lambda-governance', 'test-source'),
        target,
        capability: 'governance:budgets-budget',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      const policy = result.iamPolicies.find(p => p.description.includes('SNS publish'));
      expect(policy).toBeDefined();
      
      const statementJson = policy!.statement.toStatementJson();
      const actions = Array.isArray(statementJson.Action)
        ? statementJson.Action
        : [statementJson.Action];

      expect(actions).toContain('sns:Publish');
      
      const resources = Array.isArray(statementJson.Resource)
        ? statementJson.Resource
        : [statementJson.Resource];
      expect(resources).toContain(snsTopicArn);
    });
  });

  describe('BudgetsBind__NotificationAccessWithReadAccess__GrantsNotificationReadActions', () => {
    const metadata = {
      id: 'TP-binders-governance-budgets-008',
      level: 'unit' as const,
      capability: 'Notification ARN with read access grants notification read actions',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'BudgetsBind__Condition__Outcome', example: 'BudgetsBind__NotificationAccessWithReadAccess__GrantsNotificationReadActions' },
      invariants: [
        'IAM policies include notification read actions when notificationArn is provided with read access',
        'Notification read actions include DescribeNotificationsForBudget'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with governance:budgets-budget capability, read access, and notificationArn',
        notes: 'Notification read access test'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('BudgetsBind__NotificationAccessWithReadAccess__GrantsNotificationReadActions', async () => {
      const strategy = new BudgetsBinderStrategy();
      const notificationArn = 'arn:aws:sns:us-east-1:123456789012:budget-notification';
      const target = createMockTargetComponent('budgets', {
        'governance:budgets-budget': {
          budgetArn: 'arn:aws:budgets::123456789012:budget/test-budget',
          notificationArn
        }
      });

      const context = createBindingContext({
        source: createMockSourceComponent('lambda-governance', 'test-source'),
        target,
        capability: 'governance:budgets-budget',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      const policy = result.iamPolicies.find(p => p.description.includes('notification read'));
      expect(policy).toBeDefined();
      
      const statementJson = policy!.statement.toStatementJson();
      const actions = Array.isArray(statementJson.Action)
        ? statementJson.Action
        : [statementJson.Action];

      expect(actions).toContain('budgets:DescribeNotificationsForBudget');
      expect(actions).toContain('sns:GetTopicAttributes');
    });
  });

  describe('BudgetsBind__MissingBudgetArn__ThrowsError', () => {
    const metadata = {
      id: 'TP-binders-governance-budgets-009',
      level: 'unit' as const,
      capability: 'Missing required budgetArn throws error',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'BudgetsBind__Condition__Outcome', example: 'BudgetsBind__MissingBudgetArn__ThrowsError' },
      invariants: [
        'Error message indicates missing budgetArn',
        'Error is thrown before binding completes'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with governance:budgets-budget capability but missing budgetArn',
        notes: 'Error case test'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('BudgetsBind__MissingBudgetArn__ThrowsError', async () => {
      const strategy = new BudgetsBinderStrategy();
      const target = createMockTargetComponent('budgets', {
        'governance:budgets-budget': {
          // Missing budgetArn
        } as any
      });

      const context = createBindingContext({
        source: createMockSourceComponent('lambda-governance', 'test-source'),
        target,
        capability: 'governance:budgets-budget',
        access: 'read'
      });

      await expect(executeUnifiedBinding(strategy, context)).rejects.toThrow(
        'missing required budgetArn property'
      );
    });
  });

  describe('BudgetsBind__BudgetsActionReadAccess__ReturnsEnhancedResult', () => {
    const metadata = {
      id: 'TP-binders-governance-budgets-010',
      level: 'unit' as const,
      capability: 'governance:budgets-action read access returns enhanced result',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'BudgetsBind__Condition__Outcome', example: 'BudgetsBind__BudgetsActionReadAccess__ReturnsEnhancedResult' },
      invariants: [
        'Environment variables are set correctly',
        'IAM policies include budgets action read actions'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with governance:budgets-action capability and read access',
        notes: 'budgets-action capability test'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('BudgetsBind__BudgetsActionReadAccess__ReturnsEnhancedResult', async () => {
      const strategy = new BudgetsBinderStrategy();
      const target = createMockTargetComponent('budgets', {
        'governance:budgets-action': {
          actionArn: 'arn:aws:budgets::123456789012:budget/test-budget/action/test-action',
          actionId: 'test-action-id',
          actionType: 'APPLY_IAM_POLICY',
          actionThreshold: 90,
          budgetArn: 'arn:aws:budgets::123456789012:budget/test-budget'
        }
      });

      const context = createBindingContext({
        source: createMockSourceComponent('lambda-governance', 'test-source'),
        target,
        capability: 'governance:budgets-action',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      expect(result.environmentVariables.AWS_BUDGETS_ACTION_ARN).toBe('arn:aws:budgets::123456789012:budget/test-budget/action/test-action');
      expect(result.environmentVariables.AWS_BUDGETS_ACTION_ID).toBe('test-action-id');
      expect(result.environmentVariables.AWS_BUDGETS_ACTION_TYPE).toBe('APPLY_IAM_POLICY');
      expect(result.environmentVariables.AWS_BUDGETS_ACTION_THRESHOLD).toBe('90');
      expect(result.environmentVariables.AWS_BUDGETS_BUDGET_ARN).toBe('arn:aws:budgets::123456789012:budget/test-budget');

      const policy = result.iamPolicies.find(p => p.description.includes('action read access'));
      expect(policy).toBeDefined();
      
      const statementJson = policy!.statement.toStatementJson();
      const actions = Array.isArray(statementJson.Action)
        ? statementJson.Action
        : [statementJson.Action];

      expect(actions).toContain('budgets:ViewBudgetAction');
      expect(actions).toContain('budgets:DescribeBudgetAction');
    });
  });

  describe('BudgetsBind__BudgetsActionWriteAccess__GrantsWriteActions', () => {
    const metadata = {
      id: 'TP-binders-governance-budgets-011',
      level: 'unit' as const,
      capability: 'governance:budgets-action write access grants write actions',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'BudgetsBind__Condition__Outcome', example: 'BudgetsBind__BudgetsActionWriteAccess__GrantsWriteActions' },
      invariants: [
        'IAM policies include budgets action write actions',
        'Write actions include CreateBudgetAction and ExecuteBudgetAction'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with governance:budgets-action capability and write access',
        notes: 'budgets-action write access test'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('BudgetsBind__BudgetsActionWriteAccess__GrantsWriteActions', async () => {
      const strategy = new BudgetsBinderStrategy();
      const target = createMockTargetComponent('budgets', {
        'governance:budgets-action': {
          actionArn: 'arn:aws:budgets::123456789012:budget/test-budget/action/test-action'
        }
      });

      const context = createBindingContext({
        source: createMockSourceComponent('lambda-governance', 'test-source'),
        target,
        capability: 'governance:budgets-action',
        access: 'write'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      const policy = result.iamPolicies.find(p => p.description.includes('action write access'));
      expect(policy).toBeDefined();
      
      const statementJson = policy!.statement.toStatementJson();
      const actions = Array.isArray(statementJson.Action)
        ? statementJson.Action
        : [statementJson.Action];

      expect(actions).toContain('budgets:CreateBudgetAction');
      expect(actions).toContain('budgets:ExecuteBudgetAction');
      expect(actions).toContain('budgets:ModifyBudgetAction');
    });
  });

  describe('BudgetsBind__BudgetsActionWithSecureAccessAndIAMPolicyType__GrantsIAMPermissions', () => {
    const metadata = {
      id: 'TP-binders-governance-budgets-012',
      level: 'unit' as const,
      capability: 'requireSecureAccess option with APPLY_IAM_POLICY action type grants IAM permissions',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'BudgetsBind__Condition__Outcome', example: 'BudgetsBind__BudgetsActionWithSecureAccessAndIAMPolicyType__GrantsIAMPermissions' },
      invariants: [
        'IAM policies include IAM policy application permissions when requireSecureAccess is set with APPLY_IAM_POLICY action type',
        'IAM permissions include PutUserPolicy and PutRolePolicy'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with governance:budgets-action capability, requireSecureAccess option, and APPLY_IAM_POLICY action type',
        notes: 'Secure access with IAM policy type test'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('BudgetsBind__BudgetsActionWithSecureAccessAndIAMPolicyType__GrantsIAMPermissions', async () => {
      const strategy = new BudgetsBinderStrategy();
      const target = createMockTargetComponent('budgets', {
        'governance:budgets-action': {
          actionArn: 'arn:aws:budgets::123456789012:budget/test-budget/action/test-action',
          actionType: 'APPLY_IAM_POLICY'
        }
      });

      const context = createBindingContext({
        source: createMockSourceComponent('lambda-governance', 'test-source'),
        target,
        capability: 'governance:budgets-action',
        access: 'write',
        options: { requireSecureAccess: true }
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      const policy = result.iamPolicies.find(p => p.description.includes('IAM policy application'));
      expect(policy).toBeDefined();
      
      const statementJson = policy!.statement.toStatementJson();
      const actions = Array.isArray(statementJson.Action)
        ? statementJson.Action
        : [statementJson.Action];

      expect(actions).toContain('iam:PutUserPolicy');
      expect(actions).toContain('iam:PutRolePolicy');
      expect(actions).toContain('iam:AttachUserPolicy');
    });
  });

  describe('BudgetsBind__BudgetsActionWithSecureAccessAndSSMDocumentType__GrantsSSMPermissions', () => {
    const metadata = {
      id: 'TP-binders-governance-budgets-013',
      level: 'unit' as const,
      capability: 'requireSecureAccess option with RUN_SSM_DOCUMENTS action type grants SSM permissions',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'BudgetsBind__Condition__Outcome', example: 'BudgetsBind__BudgetsActionWithSecureAccessAndSSMDocumentType__GrantsSSMPermissions' },
      invariants: [
        'IAM policies include SSM document execution permissions when requireSecureAccess is set with RUN_SSM_DOCUMENTS action type',
        'SSM permissions include SendCommand and GetCommandInvocation'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with governance:budgets-action capability, requireSecureAccess option, and RUN_SSM_DOCUMENTS action type',
        notes: 'Secure access with SSM document type test'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('BudgetsBind__BudgetsActionWithSecureAccessAndSSMDocumentType__GrantsSSMPermissions', async () => {
      const strategy = new BudgetsBinderStrategy();
      const target = createMockTargetComponent('budgets', {
        'governance:budgets-action': {
          actionArn: 'arn:aws:budgets::123456789012:budget/test-budget/action/test-action',
          actionType: 'RUN_SSM_DOCUMENTS'
        }
      });

      const context = createBindingContext({
        source: createMockSourceComponent('lambda-governance', 'test-source'),
        target,
        capability: 'governance:budgets-action',
        access: 'write',
        options: { requireSecureAccess: true }
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      const policy = result.iamPolicies.find(p => p.description.includes('SSM document execution'));
      expect(policy).toBeDefined();
      
      const statementJson = policy!.statement.toStatementJson();
      const actions = Array.isArray(statementJson.Action)
        ? statementJson.Action
        : [statementJson.Action];

      expect(actions).toContain('ssm:SendCommand');
      expect(actions).toContain('ssm:GetCommandInvocation');
    });
  });

  describe('BudgetsBind__BudgetsActionMissingActionArn__ThrowsError', () => {
    const metadata = {
      id: 'TP-binders-governance-budgets-014',
      level: 'unit' as const,
      capability: 'governance:budgets-action missing actionArn throws error',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'BudgetsBind__Condition__Outcome', example: 'BudgetsBind__BudgetsActionMissingActionArn__ThrowsError' },
      invariants: [
        'Error message indicates missing actionArn for governance:budgets-action',
        'Error is thrown before binding completes'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with governance:budgets-action capability but missing actionArn',
        notes: 'Error case test for budgets-action'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('BudgetsBind__BudgetsActionMissingActionArn__ThrowsError', async () => {
      const strategy = new BudgetsBinderStrategy();
      const target = createMockTargetComponent('budgets', {
        'governance:budgets-action': {
          // Missing actionArn
        } as any
      });

      const context = createBindingContext({
        source: createMockSourceComponent('lambda-governance', 'test-source'),
        target,
        capability: 'governance:budgets-action',
        access: 'read'
      });

      await expect(executeUnifiedBinding(strategy, context)).rejects.toThrow(
        'missing required actionArn property'
      );
    });
  });

  describe('BudgetsBind__UnsupportedCapability__ThrowsError', () => {
    const metadata = {
      id: 'TP-binders-governance-budgets-015',
      level: 'unit' as const,
      capability: 'Unsupported capability throws error',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'BudgetsBind__Condition__Outcome', example: 'BudgetsBind__UnsupportedCapability__ThrowsError' },
      invariants: [
        'Error message indicates unsupported capability',
        'Error lists supported capabilities'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with unsupported capability',
        notes: 'Error case test'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('BudgetsBind__UnsupportedCapability__ThrowsError', async () => {
      const strategy = new BudgetsBinderStrategy();
      const target = createMockTargetComponent('budgets', {
        'budgets:invalid': {
          budgetArn: 'arn:aws:budgets::123456789012:budget/test-budget'
        }
      });

      const context = createBindingContext({
        source: createMockSourceComponent('lambda-governance', 'test-source'),
        target,
        capability: 'budgets:invalid',
        access: 'read'
      });

      await expect(executeUnifiedBinding(strategy, context)).rejects.toThrow(
        'Unsupported Budgets capability'
      );
    });
  });
});

