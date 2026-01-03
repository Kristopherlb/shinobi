/**
 * GuardDutyBinderStrategy Tests (Unified)
 * 
 * Tests for GuardDutyBinderStrategy following Platform Testing Standard v1.0
 * All tests assert EnhancedBindingResult structure (return-based, not mutation-based)
 */

import { GuardDutyBinderStrategy } from '../guardduty-binder-strategy.js';
import {
  createMockSourceComponent,
  createMockTargetComponent,
  createBindingContext,
  executeUnifiedBinding,
  assertEnhancedBindingResult,
  TEST_CONSTANTS
} from './unified-strategy-test-helpers.js';
import type { EnhancedBindingResult } from '@shinobi/core';

describe('GuardDutyBinderStrategy', () => {
  describe('GuardDutyBind__DetectorReadAccess__ReturnsEnhancedResult', () => {
    const metadata = {
      id: 'TP-binders-security-guardduty-001',
      level: 'unit' as const,
      capability: 'Returns EnhancedBindingResult with all required fields including compliance block',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'GuardDutyBind__Condition__Outcome', example: 'GuardDutyBind__DetectorReadAccess__ReturnsEnhancedResult' },
      invariants: [
        'result.compliance.status exists and is one of compliant|non-compliant|partially-compliant',
        'result.environmentVariables contains AWS_GUARDDUTY_DETECTOR_ID',
        'result.iamPolicies is an array with read actions',
        'result.securityGroupRules is an array'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'security:guardduty-detectorCapabilityData'],
      inputs: {
        shape: 'BindingContext with security:guardduty-detector capability and read access',
        notes: 'Basic valid binding with read access'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('GuardDutyBind__DetectorReadAccess__ReturnsEnhancedResult', async () => {
      const strategy = new GuardDutyBinderStrategy();
      const source = createMockSourceComponent('lambda-security', 'test-source');
      
      const target = createMockTargetComponent('guardduty', {
        'security:guardduty-detector': {
          detectorId: 'abc123def456',
          detectorArn: 'arn:aws:guardduty:us-east-1:123456789012:detector/abc123def456',
          status: 'ENABLED',
          findingsBucket: 'guardduty-findings-bucket'
        },
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'security:guardduty-detector',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      expect(result.environmentVariables.AWS_GUARDDUTY_DETECTOR_ID).toBe('abc123def456');
      expect(result.environmentVariables.AWS_GUARDDUTY_DETECTOR_ARN).toBe('arn:aws:guardduty:us-east-1:123456789012:detector/abc123def456');
      expect(result.environmentVariables.AWS_GUARDDUTY_STATUS).toBe('ENABLED');
      expect(result.environmentVariables.AWS_GUARDDUTY_FINDINGS_BUCKET).toBe('guardduty-findings-bucket');
      expect(result.iamPolicies.length).toBeGreaterThan(0);
      expect(['compliant', 'non-compliant', 'partially-compliant']).toContain(result.compliance.status);
    });
  });

  describe('GuardDutyBind__WithEventBridgeIntegration__AddsEventBridgePolicies', () => {
    const metadata = {
      id: 'TP-binders-security-guardduty-002',
      level: 'unit' as const,
      capability: 'Adds EventBridge IAM policies when enableEventBridgeIntegration option is provided',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'GuardDutyBind__Condition__Outcome', example: 'GuardDutyBind__WithEventBridgeIntegration__AddsEventBridgePolicies' },
      invariants: [
        'IAM policies include events:PutEvents',
        'Environment variables include AWS_GUARDDUTY_EVENTBRIDGE_ENABLED'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'security:guardduty-detectorCapabilityData'],
      inputs: {
        shape: 'BindingContext with security:guardduty-detector capability and enableEventBridgeIntegration option',
        notes: 'Tests EventBridge integration support'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('GuardDutyBind__WithEventBridgeIntegration__AddsEventBridgePolicies', async () => {
      const strategy = new GuardDutyBinderStrategy();
      const source = createMockSourceComponent('lambda-security', 'test-source');
      
      const target = createMockTargetComponent('guardduty', {
        'security:guardduty-detector': {
          detectorId: 'abc123def456'
        },
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'security:guardduty-detector',
        access: 'read',
        options: {
          enableEventBridgeIntegration: true
        }
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);
      expect(result.environmentVariables.AWS_GUARDDUTY_EVENTBRIDGE_ENABLED).toBe('true');
      
      const eventBridgePolicy = result.iamPolicies.find(p => 
        p.description.includes('EventBridge')
      );
      expect(eventBridgePolicy).toBeDefined();
    });
  });

  describe('GuardDutyBind__WithDelegatedAdmin__AddsDelegatedAdminPolicies', () => {
    const metadata = {
      id: 'TP-binders-security-guardduty-003',
      level: 'unit' as const,
      capability: 'Adds delegated admin IAM policies when delegatedAdminAccountId option is provided',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'GuardDutyBind__Condition__Outcome', example: 'GuardDutyBind__WithDelegatedAdmin__AddsDelegatedAdminPolicies' },
      invariants: [
        'IAM policies include guardduty:EnableOrganizationAdminAccount',
        'Environment variables include AWS_GUARDDUTY_DELEGATED_ADMIN_ACCOUNT_ID'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'security:guardduty-detectorCapabilityData'],
      inputs: {
        shape: 'BindingContext with security:guardduty-detector capability and delegatedAdminAccountId option',
        notes: 'Tests delegated admin support'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('GuardDutyBind__WithDelegatedAdmin__AddsDelegatedAdminPolicies', async () => {
      const strategy = new GuardDutyBinderStrategy();
      const source = createMockSourceComponent('lambda-security', 'test-source');
      
      const target = createMockTargetComponent('guardduty', {
        'security:guardduty-detector': {
          detectorId: 'abc123def456'
        },
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'security:guardduty-detector',
        access: 'write',
        options: {
          delegatedAdminAccountId: '222222222222'
        }
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);
      expect(result.environmentVariables.AWS_GUARDDUTY_DELEGATED_ADMIN_ACCOUNT_ID).toBe('222222222222');
      
      const delegatedAdminPolicy = result.iamPolicies.find(p => 
        p.description.includes('delegated admin')
      );
      expect(delegatedAdminPolicy).toBeDefined();
    });
  });

  describe('GuardDutyBind__WithFindingTypes__ExposesFindingTypes', () => {
    const metadata = {
      id: 'TP-binders-security-guardduty-004',
      level: 'unit' as const,
      capability: 'Exposes finding types in environment variables when provided',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'GuardDutyBind__Condition__Outcome', example: 'GuardDutyBind__WithFindingTypes__ExposesFindingTypes' },
      invariants: [
        'Environment variables include AWS_GUARDDUTY_FINDING_TYPES with comma-separated values'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'security:guardduty-detectorCapabilityData'],
      inputs: {
        shape: 'BindingContext with security:guardduty-detector capability including findingTypes',
        notes: 'Tests finding types exposure'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('GuardDutyBind__WithFindingTypes__ExposesFindingTypes', async () => {
      const strategy = new GuardDutyBinderStrategy();
      const source = createMockSourceComponent('lambda-security', 'test-source');
      
      const target = createMockTargetComponent('guardduty', {
        'security:guardduty-detector': {
          detectorId: 'abc123def456',
          findingTypes: ['Recon:EC2/PortProbeUnprotectedPort', 'Trojan:EC2/BlackholeTraffic']
        },
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'security:guardduty-detector',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);
      expect(result.environmentVariables.AWS_GUARDDUTY_FINDING_TYPES).toBe('Recon:EC2/PortProbeUnprotectedPort,Trojan:EC2/BlackholeTraffic');
    });
  });

  describe('GuardDutyBind__AdminAccessWithoutRequireFullAdminAccess__NoFullAdminPolicy', () => {
    const metadata = {
      id: 'TP-binders-security-guardduty-005',
      level: 'unit' as const,
      capability: 'Does not grant full guardduty:* access when admin access requested without requireFullAdminAccess option',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'GuardDutyBind__Condition__Outcome', example: 'GuardDutyBind__AdminAccessWithoutRequireFullAdminAccess__NoFullAdminPolicy' },
      invariants: [
        'No IAM policy with guardduty:* actions when requireFullAdminAccess is not set'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'security:guardduty-detectorCapabilityData'],
      inputs: {
        shape: 'BindingContext with security:guardduty-detector capability and admin access without requireFullAdminAccess',
        notes: 'Tests admin access gating'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('GuardDutyBind__AdminAccessWithoutRequireFullAdminAccess__NoFullAdminPolicy', async () => {
      const strategy = new GuardDutyBinderStrategy();
      const source = createMockSourceComponent('lambda-security', 'test-source');
      
      const target = createMockTargetComponent('guardduty', {
        'security:guardduty-detector': {
          detectorId: 'abc123def456'
        },
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'security:guardduty-detector',
        access: 'admin'
        // Note: requireFullAdminAccess is NOT set
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);
      
      // Should not have full guardduty:* policy
      const fullAdminPolicy = result.iamPolicies.find(p => {
        const statementJson = p.statement.toStatementJson();
        return statementJson.Action === 'guardduty:*';
      });
      expect(fullAdminPolicy).toBeUndefined();
    });
  });

  describe('GuardDutyBind__AllCapabilities__RoutesToCorrectMethod', () => {
    const metadata = {
      id: 'TP-binders-security-guardduty-006',
      level: 'unit' as const,
      capability: 'Routes both capabilities to correct binding methods',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'GuardDutyBind__Condition__Outcome', example: 'GuardDutyBind__AllCapabilities__RoutesToCorrectMethod' },
      invariants: [
        'Each capability returns EnhancedBindingResult',
        'Each capability includes AWS_GUARDDUTY_DETECTOR_ID'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with different GuardDuty capabilities',
        notes: 'Tests both supported capabilities'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('GuardDutyBind__AllCapabilities__RoutesToCorrectMethod', async () => {
      const strategy = new GuardDutyBinderStrategy();

      // Test security:guardduty-detector
      const detectorTarget = createMockTargetComponent('guardduty', {
        'security:guardduty-detector': {
          detectorId: 'abc123def456'
        }
      });

      const detectorContext = createBindingContext({
        source: createMockSourceComponent('lambda-security', 'test-source'),
        target: detectorTarget,
        capability: 'security:guardduty-detector',
        access: 'read'
      });

      const detectorResult = await executeUnifiedBinding(strategy, detectorContext);
      assertEnhancedBindingResult(detectorResult);
      expect(detectorResult.environmentVariables.AWS_GUARDDUTY_DETECTOR_ID).toBe('abc123def456');

      // Test security:guardduty-malware-protection
      const malwareTarget = createMockTargetComponent('guardduty', {
        'security:guardduty-malware-protection': {
          detectorId: 'abc123def456'
        }
      });

      const malwareContext = createBindingContext({
        source: createMockSourceComponent('lambda-security', 'test-source'),
        target: malwareTarget,
        capability: 'security:guardduty-malware-protection',
        access: 'read'
      });

      const malwareResult = await executeUnifiedBinding(strategy, malwareContext);
      assertEnhancedBindingResult(malwareResult);
      expect(malwareResult.environmentVariables.AWS_GUARDDUTY_DETECTOR_ID).toBe('abc123def456');
    });
  });

  describe('GuardDutyBind__MissingDetectorId__ThrowsActionableError', () => {
    const metadata = {
      id: 'TP-binders-security-guardduty-007',
      level: 'unit' as const,
      capability: 'Throws actionable error when detectorId is missing from target capability data',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'GuardDutyBind__Condition__Outcome', example: 'GuardDutyBind__MissingDetectorId__ThrowsActionableError' },
      invariants: [
        'Error message includes detectorId',
        'Error is thrown before IAM policy creation'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with security:guardduty-detector capability but missing detectorId in target data',
        notes: 'Target has detectorArn but no detectorId'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('GuardDutyBind__MissingDetectorId__ThrowsActionableError', async () => {
      const strategy = new GuardDutyBinderStrategy();
      const source = createMockSourceComponent('lambda-security', 'test-source');
      const target = createMockTargetComponent('guardduty', {
        'security:guardduty-detector': {
          detectorArn: 'arn:aws:guardduty:us-east-1:123456789012:detector/abc123def456'
          // Missing detectorId
        },
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'security:guardduty-detector',
        access: 'read'
      });

      await expect(executeUnifiedBinding(strategy, context)).rejects.toThrow(/detectorId/);
    });
  });
});
