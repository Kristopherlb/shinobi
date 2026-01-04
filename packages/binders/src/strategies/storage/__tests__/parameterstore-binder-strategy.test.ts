/**
 * ParameterStoreBinderStrategy Tests (Unified)
 * 
 * Tests for ParameterStoreBinderStrategy following Platform Testing Standard v1.0
 * All tests assert EnhancedBindingResult structure (return-based, not mutation-based)
 */

import { ParameterStoreBinderStrategy } from '../parameterstore-binder-strategy.js';
import {
  createMockSourceComponent,
  createMockTargetComponent,
  createBindingContext,
  executeUnifiedBinding,
  assertEnhancedBindingResult,
  TEST_CONSTANTS
} from '../../security/__tests__/unified-strategy-test-helpers.js';
import type { EnhancedBindingResult } from '@shinobi/core';

describe('ParameterStoreBinderStrategy', () => {
  describe('ParameterStoreBind__ValidAccess__ReturnsEnhancedResult', () => {
    const metadata = {
      id: 'TP-binders-storage-parameterstore-001',
      level: 'unit' as const,
      capability: 'Returns EnhancedBindingResult with all required fields including compliance block',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'ParameterStoreBind__Condition__Outcome', example: 'ParameterStoreBind__ValidAccess__ReturnsEnhancedResult' },
      invariants: [
        'result.compliance.status exists and is one of compliant|non-compliant|partially-compliant',
        'result.environmentVariables contains expected keys',
        'result.iamPolicies is an array',
        'result.securityGroupRules is an array'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'ssm:parameterCapabilityData'],
      inputs: {
        shape: 'BindingContext with ssm:parameter capability',
        notes: 'Basic valid binding with read access'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('ParameterStoreBind__ValidAccess__ReturnsEnhancedResult', async () => {
      const strategy = new ParameterStoreBinderStrategy();
      const source = createMockSourceComponent('lambda-api', 'test-source');
      
      const target = createMockTargetComponent('test-target', {
        'ssm:parameter': {
          type: 'ssm:parameter',
          resources: {
            arn: 'arn:aws:ssm:us-east-1:123456789012:parameter/test-param',
            parameterName: '/test-param',
          },
        },
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'ssm:parameter',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // TODO: Add specific assertions for this binder strategy
      expect(result.iamPolicies).toBeDefined();
      expect(result.environmentVariables).toBeDefined();
      expect(result.compliance).toBeDefined();
      expect(result.compliance.status).toBeDefined();
    });
  });

  describe('ParameterStoreBind__CustomActionsOverride__ReplacesCoarseActions', () => {
    const metadata = {
      id: 'TP-binders-storage-parameterstore-002',
      level: 'unit' as const,
      capability: 'Custom actions override replaces default Parameter Store actions',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'ParameterStoreBind__Condition__Outcome', example: 'ParameterStoreBind__CustomActionsOverride__ReplacesCoarseActions' },
      invariants: [
        'IAM policy actions match provided custom actions array',
        'Default Parameter Store actions are not included when custom actions provided',
        'Actions array is used directly (replaces coarse access)'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with ssm:parameter capability and directive.actions array',
        notes: 'Granular actions override test'
      },
      risks: [],
      dependencies: ['action-resolver'],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('ParameterStoreBind__CustomActionsOverride__ReplacesCoarseActions', async () => {
      const strategy = new ParameterStoreBinderStrategy();
      const customActions = ['ssm:GetParameter', 'ssm:DescribeParameters'];
      const target = createMockTargetComponent('test-target', {
        'ssm:parameter': {
          type: 'ssm:parameter',
          resources: {
            arn: 'arn:aws:ssm:us-east-1:123456789012:parameter/test-param',
            parameterName: '/test-param',
          },
        },
      });

      const context = createBindingContext({
        source: createMockSourceComponent('lambda-api', 'test-source'),
        target,
        capability: 'ssm:parameter',
        access: 'read',
        actions: customActions
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      expect(result.iamPolicies.length).toBeGreaterThan(0);
      const policy = result.iamPolicies[0];
      expect(policy).toBeDefined();
      
      const statementJson = policy!.statement.toStatementJson();
      const actions = Array.isArray(statementJson.Action)
        ? statementJson.Action
        : [statementJson.Action];

      // Primary assertion: Custom actions are used, default actions are not
      expect(actions).toEqual(customActions);
      expect(actions).not.toContain('ssm:GetParameters');
      expect(actions).not.toContain('ssm:GetParametersByPath');
      expect(actions).not.toContain('ssm:GetParameterHistory');
      expect(actions).not.toContain('ssm:ListTagsForResource');
    });
  });
});

