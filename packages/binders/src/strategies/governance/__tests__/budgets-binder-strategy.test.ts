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
} from '@shinobi/binders/security/__tests__/unified-strategy-test-helpers';
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
});

