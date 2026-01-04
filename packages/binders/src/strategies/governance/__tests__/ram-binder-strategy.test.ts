/**
 * RAMBinderStrategy Tests (Unified)
 * 
 * Tests for RAMBinderStrategy following Platform Testing Standard v1.0
 * All tests assert EnhancedBindingResult structure (return-based, not mutation-based)
 */

import { RAMBinderStrategy } from '../ram-binder-strategy.js';
import {
  createMockSourceComponent,
  createMockTargetComponent,
  createBindingContext,
  executeUnifiedBinding,
  assertEnhancedBindingResult,
  TEST_CONSTANTS
} from '@shinobi/binders/security/__tests__/unified-strategy-test-helpers';
import type { EnhancedBindingResult } from '@shinobi/core';

describe('RAMBinderStrategy', () => {
  describe('RAMBind__ValidAccess__ReturnsEnhancedResult', () => {
    const metadata = {
      id: 'TP-binders-governance-ram-001',
      level: 'unit' as const,
      capability: 'Returns EnhancedBindingResult with all required fields including compliance block',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'RAMBind__Condition__Outcome', example: 'RAMBind__ValidAccess__ReturnsEnhancedResult' },
      invariants: [
        'result.compliance.status exists and is one of compliant|non-compliant|partially-compliant',
        'result.environmentVariables contains expected keys',
        'result.iamPolicies is an array',
        'result.securityGroupRules is an array'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'governance:ram-resource-shareCapabilityData'],
      inputs: {
        shape: 'BindingContext with governance:ram-resource-share capability',
        notes: 'Basic valid binding with read access'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('RAMBind__ValidAccess__ReturnsEnhancedResult', async () => {
      const strategy = new RAMBinderStrategy();
      const source = createMockSourceComponent('lambda-networking', 'test-source');
      
      const target = createMockTargetComponent('ram', {
        'governance:ram-resource-share': {
          resourceShareArn: 'arn:aws:ram:us-east-1:123456789012:resource-share/test-share',
          resourceShareName: 'test-share',
          principalId: '123456789012',
          resourceArn: 'arn:aws:ec2:us-east-1:123456789012:subnet/subnet-12345678',
          permissionType: 'read-only'
        },
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'governance:ram-resource-share',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      expect(result.environmentVariables.AWS_RAM_RESOURCE_SHARE_ARN).toBe('arn:aws:ram:us-east-1:123456789012:resource-share/test-share');
      expect(result.environmentVariables.AWS_RAM_RESOURCE_SHARE_NAME).toBe('test-share');
      expect(result.environmentVariables.AWS_RAM_PRINCIPAL_ID).toBe('123456789012');
      expect(result.environmentVariables.AWS_RAM_RESOURCE_ARN).toBe('arn:aws:ec2:us-east-1:123456789012:subnet/subnet-12345678');
      expect(result.environmentVariables.AWS_RAM_PERMISSION_TYPE).toBe('read-only');
      expect(result.iamPolicies.length).toBeGreaterThan(0);
      expect(['compliant', 'non-compliant', 'partially-compliant']).toContain(result.compliance.status);
    });
  });

  describe('RAMBind__CustomActionsOverride__ReplacesCoarseActions', () => {
    const metadata = {
      id: 'TP-binders-governance-ram-002',
      level: 'unit' as const,
      capability: 'Custom actions override replaces default RAM resource share actions',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'RAMBind__Condition__Outcome', example: 'RAMBind__CustomActionsOverride__ReplacesCoarseActions' },
      invariants: [
        'IAM policy actions match provided custom actions array',
        'Default RAM actions are not included when custom actions provided',
        'Actions array is used directly (replaces coarse access)'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with governance:ram-resource-share capability and directive.actions array',
        notes: 'Granular actions override test'
      },
      risks: [],
      dependencies: ['action-resolver'],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('RAMBind__CustomActionsOverride__ReplacesCoarseActions', async () => {
      const strategy = new RAMBinderStrategy();
      const customActions = ['ram:GetResourceShare', 'ram:ListResourceShares'];
      const target = createMockTargetComponent('ram', {
        'governance:ram-resource-share': {
          resourceShareArn: 'arn:aws:ram:us-east-1:123456789012:resource-share/test-share'
        },
      });

      const context = createBindingContext({
        source: createMockSourceComponent('lambda-networking', 'test-source'),
        target,
        capability: 'governance:ram-resource-share',
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
      expect(actions).not.toContain('ram:GetResourceShareAssociations');
      expect(actions).not.toContain('ram:ListResourceShareAssociations');
    });
  });
});

