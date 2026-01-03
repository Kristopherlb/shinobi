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
} from '@shinobi/binders/security/__tests__/unified-strategy-test-helpers';
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

  // TODO: Add more test cases as needed
});

