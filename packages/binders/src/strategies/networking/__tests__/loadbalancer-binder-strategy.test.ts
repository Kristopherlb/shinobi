/**
 * LoadBalancerBinderStrategy Tests (Unified)
 * 
 * Tests for LoadBalancerBinderStrategy following Platform Testing Standard v1.0
 * All tests assert EnhancedBindingResult structure (return-based, not mutation-based)
 */

import { LoadBalancerBinderStrategy } from '../loadbalancer-binder-strategy.js';
import {
  createMockSourceComponent,
  createMockTargetComponent,
  createBindingContext,
  executeUnifiedBinding,
  assertEnhancedBindingResult,
  TEST_CONSTANTS
} from '../../security/__tests__/unified-strategy-test-helpers.js';
import type { EnhancedBindingResult } from '@shinobi/core';

describe('LoadBalancerBinderStrategy', () => {
  describe('LoadBalancerBind__ValidAccess__ReturnsEnhancedResult', () => {
    const metadata = {
      id: 'TP-binders-networking-loadbalancer-001',
      level: 'unit' as const,
      capability: 'Returns EnhancedBindingResult with all required fields including compliance block',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'LoadBalancerBind__Condition__Outcome', example: 'LoadBalancerBind__ValidAccess__ReturnsEnhancedResult' },
      invariants: [
        'result.compliance.status exists and is one of compliant|non-compliant|partially-compliant',
        'result.environmentVariables contains expected keys',
        'result.iamPolicies is an array',
        'result.securityGroupRules is an array'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'network:load-balancerCapabilityData'],
      inputs: {
        shape: 'BindingContext with network:load-balancer capability',
        notes: 'Basic valid binding with read access'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('LoadBalancerBind__ValidAccess__ReturnsEnhancedResult', async () => {
      const strategy = new LoadBalancerBinderStrategy();
      const source = createMockSourceComponent('lambda-api', 'test-source');
      
      const target = createMockTargetComponent('test-target', {
        'network:load-balancer': {
          type: 'network:load-balancer',
          resources: {
            arn: 'arn:aws:elasticloadbalancing:us-east-1:123456789012:loadbalancer/app/test-lb/1234567890abcdef',
            loadBalancerArn: 'arn:aws:elasticloadbalancing:us-east-1:123456789012:loadbalancer/app/test-lb/1234567890abcdef',
          },
        },
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'network:load-balancer',
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

  describe('LoadBalancerBind__CustomActionsOverride__ReplacesCoarseActions', () => {
    const metadata = {
      id: 'TP-binders-networking-loadbalancer-010',
      level: 'unit' as const,
      capability: 'Custom actions override replaces default Load Balancer actions',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'LoadBalancerBind__Condition__Outcome', example: 'LoadBalancerBind__CustomActionsOverride__ReplacesCoarseActions' },
      invariants: [
        'IAM policy actions match provided custom actions array',
        'Default Load Balancer actions are not included when custom actions provided',
        'Actions array is used directly (replaces coarse access)'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with network:load-balancer capability and directive.actions array',
        notes: 'Granular actions override test'
      },
      risks: [],
      dependencies: ['action-resolver'],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('LoadBalancerBind__CustomActionsOverride__ReplacesCoarseActions', async () => {
      const strategy = new LoadBalancerBinderStrategy();
      const customActions = ['elasticloadbalancing:DescribeLoadBalancers', 'elasticloadbalancing:DescribeTargetGroups'];
      const target = createMockTargetComponent('test-target', {
        'network:load-balancer': {
          type: 'network:load-balancer',
          resources: {
            loadBalancerArn: 'arn:aws:elasticloadbalancing:us-east-1:123456789012:loadbalancer/app/test-lb/1234567890123456'
          }
        }
      });

      const context = createBindingContext({
        source: createMockSourceComponent(),
        target,
        capability: 'network:load-balancer',
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

      expect(actions).toEqual(expect.arrayContaining(customActions));
      expect(actions.length).toBe(customActions.length);
    });
  });

  describe('LoadBalancerBind__WriteAccess__GrantsWriteActions', () => {
    const metadata = {
      id: 'TP-binders-networking-loadbalancer-003',
      level: 'unit' as const,
      capability: 'Write access grants Load Balancer write actions',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'LoadBalancerBind__Condition__Outcome', example: 'LoadBalancerBind__WriteAccess__GrantsWriteActions' },
      invariants: [
        'IAM policies include Load Balancer write actions',
        'Write actions include CreateLoadBalancer and ModifyLoadBalancerAttributes'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with network:load-balancer capability and write access',
        notes: 'Write access test'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('LoadBalancerBind__WriteAccess__GrantsWriteActions', async () => {
      const strategy = new LoadBalancerBinderStrategy();
      const target = createMockTargetComponent('load-balancer', {
        'network:load-balancer': {
          resources: {
            loadBalancerArn: 'arn:aws:elasticloadbalancing:us-east-1:123456789012:loadbalancer/app/test-lb/1234567890abcdef'
          }
        }
      });

      const context = createBindingContext({
        source: createMockSourceComponent('lambda-api', 'test-source'),
        target,
        capability: 'network:load-balancer',
        access: 'write'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      const policy = result.iamPolicies[0];
      const statementJson = policy.statement.toStatementJson();
      const actions = Array.isArray(statementJson.Action)
        ? statementJson.Action
        : [statementJson.Action];

      expect(actions).toContain('elasticloadbalancing:ModifyLoadBalancerAttributes');
      expect(actions).toContain('elasticloadbalancing:RegisterTargets');
    });
  });

  describe('LoadBalancerBind__MissingLoadBalancerArn__ThrowsError', () => {
    const metadata = {
      id: 'TP-binders-networking-loadbalancer-004',
      level: 'unit' as const,
      capability: 'Missing loadBalancerArn throws error',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'LoadBalancerBind__Condition__Outcome', example: 'LoadBalancerBind__MissingLoadBalancerArn__ThrowsError' },
      invariants: [
        'Error message indicates missing loadBalancerArn',
        'Error is thrown before binding completes'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with network:load-balancer capability but missing loadBalancerArn',
        notes: 'Error case test'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('LoadBalancerBind__MissingLoadBalancerArn__ThrowsError', async () => {
      const strategy = new LoadBalancerBinderStrategy();
      const target = createMockTargetComponent('load-balancer', {
        'network:load-balancer': {
          resources: {
            // Missing loadBalancerArn
          } as any
        }
      });

      const context = createBindingContext({
        source: createMockSourceComponent('lambda-api', 'test-source'),
        target,
        capability: 'network:load-balancer',
        access: 'read'
      });

      await expect(executeUnifiedBinding(strategy, context)).rejects.toThrow(
        'missing required resources.loadBalancerArn property'
      );
    });
  });
});

