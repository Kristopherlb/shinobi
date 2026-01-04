/**
 * ControlTowerBinderStrategy Tests (Unified)
 * 
 * Tests for ControlTowerBinderStrategy following Platform Testing Standard v1.0
 * All tests assert EnhancedBindingResult structure (return-based, not mutation-based)
 */

import { ControlTowerBinderStrategy } from '../controltower-binder-strategy.js';
import {
  createMockSourceComponent,
  createMockTargetComponent,
  createBindingContext,
  executeUnifiedBinding,
  assertEnhancedBindingResult,
  TEST_CONSTANTS
} from '../../security/__tests__/unified-strategy-test-helpers.js';
import type { EnhancedBindingResult } from '@shinobi/core';

describe('ControlTowerBinderStrategy', () => {
  describe('ControlTowerBind__ValidAccess__ReturnsEnhancedResult', () => {
    const metadata = {
      id: 'TP-binders-governance-controltower-001',
      level: 'unit' as const,
      capability: 'Returns EnhancedBindingResult with all required fields including compliance block',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'ControlTowerBind__Condition__Outcome', example: 'ControlTowerBind__ValidAccess__ReturnsEnhancedResult' },
      invariants: [
        'result.compliance.status exists and is one of compliant|non-compliant|partially-compliant',
        'result.environmentVariables contains expected keys',
        'result.iamPolicies is an array',
        'result.securityGroupRules is an array'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'governance:control-towerCapabilityData'],
      inputs: {
        shape: 'BindingContext with governance:control-tower capability',
        notes: 'Basic valid binding with read access'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('ControlTowerBind__ValidAccess__ReturnsEnhancedResult', async () => {
      const strategy = new ControlTowerBinderStrategy();
      const source = createMockSourceComponent('lambda-governance', 'test-source');
      
      const target = createMockTargetComponent('controltower', {
        'governance:control-tower': {
          landingZoneArn: 'arn:aws:controltower:us-east-1::landingzone/test-landing-zone',
          landingZoneId: 'test-landing-zone-id',
          baselineVersion: '3.0',
          orgId: 'o-1234567890'
        },
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'governance:control-tower',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      expect(result.environmentVariables.AWS_CONTROL_TOWER_LANDING_ZONE_ARN).toBe('arn:aws:controltower:us-east-1::landingzone/test-landing-zone');
      expect(result.environmentVariables.AWS_CONTROL_TOWER_LANDING_ZONE_ID).toBe('test-landing-zone-id');
      expect(result.environmentVariables.AWS_CONTROL_TOWER_BASELINE_VERSION).toBe('3.0');
      expect(result.environmentVariables.AWS_ORGANIZATIONS_ID).toBe('o-1234567890');
      expect(result.iamPolicies.length).toBeGreaterThan(0);
      expect(['compliant', 'non-compliant', 'partially-compliant']).toContain(result.compliance.status);
    });
  });

  describe('ControlTowerBind__CustomActionsOverride__ReplacesCoarseActions', () => {
    const metadata = {
      id: 'TP-binders-governance-controltower-002',
      level: 'unit' as const,
      capability: 'Custom actions override replaces default Control Tower actions',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'ControlTowerBind__Condition__Outcome', example: 'ControlTowerBind__CustomActionsOverride__ReplacesCoarseActions' },
      invariants: [
        'IAM policy actions match provided custom actions array',
        'Default Control Tower actions are not included when custom actions provided',
        'Actions array is used directly (replaces coarse access)'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with governance:control-tower capability and directive.actions array',
        notes: 'Granular actions override test'
      },
      risks: [],
      dependencies: ['action-resolver'],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('ControlTowerBind__CustomActionsOverride__ReplacesCoarseActions', async () => {
      const strategy = new ControlTowerBinderStrategy();
      const customActions = ['controltower:GetLandingZone', 'controltower:ListLandingZones'];
      const target = createMockTargetComponent('controltower', {
        'governance:control-tower': {
          landingZoneArn: 'arn:aws:controltower:us-east-1::landingzone/test-landing-zone'
        },
      });

      const context = createBindingContext({
        source: createMockSourceComponent('lambda-governance', 'test-source'),
        target,
        capability: 'governance:control-tower',
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
      expect(actions).not.toContain('controltower:GetControlOperation');
      expect(actions).not.toContain('controltower:ListEnabledControls');
    });
  });

  describe('ControlTowerBind__WriteAccess__GrantsWriteActions', () => {
    const metadata = {
      id: 'TP-binders-governance-controltower-003',
      level: 'unit' as const,
      capability: 'Write access grants Control Tower write actions',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'ControlTowerBind__Condition__Outcome', example: 'ControlTowerBind__WriteAccess__GrantsWriteActions' },
      invariants: [
        'IAM policies include Control Tower write actions',
        'Write actions include CreateLandingZone and UpdateLandingZone'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with governance:control-tower capability and write access',
        notes: 'Write access test'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('ControlTowerBind__WriteAccess__GrantsWriteActions', async () => {
      const strategy = new ControlTowerBinderStrategy();
      const target = createMockTargetComponent('controltower', {
        'governance:control-tower': {
          landingZoneArn: 'arn:aws:controltower:us-east-1::landingzone/test-lz'
        }
      });

      const context = createBindingContext({
        source: createMockSourceComponent('lambda-governance', 'test-source'),
        target,
        capability: 'governance:control-tower',
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

      expect(actions).toContain('controltower:CreateLandingZone');
      expect(actions).toContain('controltower:UpdateLandingZone');
    });
  });

  describe('ControlTowerBind__MissingLandingZoneArn__ThrowsError', () => {
    const metadata = {
      id: 'TP-binders-governance-controltower-004',
      level: 'unit' as const,
      capability: 'Missing landingZoneArn throws error',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'ControlTowerBind__Condition__Outcome', example: 'ControlTowerBind__MissingLandingZoneArn__ThrowsError' },
      invariants: [
        'Error message indicates missing landingZoneArn',
        'Error is thrown before binding completes'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with governance:control-tower capability but missing landingZoneArn',
        notes: 'Error case test'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('ControlTowerBind__MissingLandingZoneArn__ThrowsError', async () => {
      const strategy = new ControlTowerBinderStrategy();
      const target = createMockTargetComponent('controltower', {
        'governance:control-tower': {
          // Missing landingZoneArn
        } as any
      });

      const context = createBindingContext({
        source: createMockSourceComponent('lambda-governance', 'test-source'),
        target,
        capability: 'governance:control-tower',
        access: 'read'
      });

      await expect(executeUnifiedBinding(strategy, context)).rejects.toThrow(
        'missing required landingZoneArn property'
      );
    });
  });
});

