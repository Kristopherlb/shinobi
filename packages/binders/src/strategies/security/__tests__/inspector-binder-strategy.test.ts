/**
 * InspectorBinderStrategy Tests (Unified)
 * 
 * Tests for InspectorBinderStrategy following Platform Testing Standard v1.0
 * All tests assert EnhancedBindingResult structure (return-based, not mutation-based)
 */

import { InspectorBinderStrategy } from '../inspector-binder-strategy.js';
import {
  createMockSourceComponent,
  createMockTargetComponent,
  createBindingContext,
  executeUnifiedBinding,
  assertEnhancedBindingResult,
  TEST_CONSTANTS
} from './unified-strategy-test-helpers.js';
import type { EnhancedBindingResult } from '@shinobi/core';

describe('InspectorBinderStrategy', () => {
  describe('InspectorBind__ScanReadAccess__ReturnsEnhancedResult', () => {
    const metadata = {
      id: 'TP-binders-security-inspector-001',
      level: 'unit' as const,
      capability: 'Returns EnhancedBindingResult with all required fields including compliance block',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'InspectorBind__Condition__Outcome', example: 'InspectorBind__ScanReadAccess__ReturnsEnhancedResult' },
      invariants: [
        'result.compliance.status exists and is one of compliant|non-compliant|partially-compliant',
        'result.environmentVariables contains AWS_INSPECTOR_SCAN_ARN',
        'result.iamPolicies is an array with read actions',
        'result.securityGroupRules is an array'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'security:inspector-scanCapabilityData'],
      inputs: {
        shape: 'BindingContext with security:inspector-scan capability and read access',
        notes: 'Basic valid binding with read access'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('InspectorBind__ScanReadAccess__ReturnsEnhancedResult', async () => {
      const strategy = new InspectorBinderStrategy();
      const source = createMockSourceComponent('lambda-security', 'test-source');
      
      const target = createMockTargetComponent('inspector', {
        'security:inspector-scan': {
          scanArn: 'arn:aws:inspector2:us-east-1:123456789012:scan/test-scan',
          findingsBucket: 'inspector-findings-bucket',
          scanTargetArn: 'arn:aws:ec2:us-east-1:123456789012:instance/i-1234567890abcdef0',
          scanType: 'EC2',
          scanStatus: 'COMPLETED'
        },
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'security:inspector-scan',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      expect(result.environmentVariables.AWS_INSPECTOR_SCAN_ARN).toBe('arn:aws:inspector2:us-east-1:123456789012:scan/test-scan');
      expect(result.environmentVariables.AWS_INSPECTOR_FINDINGS_BUCKET).toBe('inspector-findings-bucket');
      expect(result.environmentVariables.AWS_INSPECTOR_SCAN_TARGET_ARN).toBe('arn:aws:ec2:us-east-1:123456789012:instance/i-1234567890abcdef0');
      expect(result.environmentVariables.AWS_INSPECTOR_SCAN_TYPE).toBe('EC2');
      expect(result.environmentVariables.AWS_INSPECTOR_SCAN_STATUS).toBe('COMPLETED');
      expect(result.iamPolicies.length).toBeGreaterThan(0);
      expect(['compliant', 'non-compliant', 'partially-compliant']).toContain(result.compliance.status);
    });
  });

  describe('InspectorBind__ScanWithAllFields__ExposesAllEnvironmentVariables', () => {
    const metadata = {
      id: 'TP-binders-security-inspector-005',
      level: 'unit' as const,
      capability: 'Exposes all optional environment variables when provided in target data',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'InspectorBind__Condition__Outcome', example: 'InspectorBind__ScanWithAllFields__ExposesAllEnvironmentVariables' },
      invariants: [
        'Environment variables include scan filter and schedule',
        'Environment variables include finding severity and count'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'security:inspector-scanCapabilityData'],
      inputs: {
        shape: 'BindingContext with security:inspector-scan capability with all optional fields',
        notes: 'Tests comprehensive field exposure'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('InspectorBind__ScanWithAllFields__ExposesAllEnvironmentVariables', async () => {
      const strategy = new InspectorBinderStrategy();
      const source = createMockSourceComponent('lambda-security', 'test-source');
      
      const target = createMockTargetComponent('inspector', {
        'security:inspector-scan': {
          scanArn: 'arn:aws:inspector2:us-east-1:123456789012:scan/test-scan',
          scanFilter: { severity: ['CRITICAL', 'HIGH'] },
          scanSchedule: 'cron(0 0 * * ? *)',
          findingSeverity: 'CRITICAL',
          findingCount: 15
        },
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'security:inspector-scan',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      expect(result.environmentVariables.AWS_INSPECTOR_SCAN_FILTER).toBeDefined();
      expect(result.environmentVariables.AWS_INSPECTOR_SCAN_SCHEDULE).toBe('cron(0 0 * * ? *)');
      expect(result.environmentVariables.AWS_INSPECTOR_FINDING_SEVERITY).toBe('CRITICAL');
      expect(result.environmentVariables.AWS_INSPECTOR_FINDING_COUNT).toBe('15');
    });
  });

  describe('InspectorBind__ScanWriteAccess__ReturnsWritePolicies', () => {
    const metadata = {
      id: 'TP-binders-security-inspector-002',
      level: 'unit' as const,
      capability: 'Returns IAM policies with write actions for write access',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'InspectorBind__Condition__Outcome', example: 'InspectorBind__ScanWriteAccess__ReturnsWritePolicies' },
      invariants: [
        'IAM policies include inspector2:StartScan',
        'IAM policies include inspector2:UpdateFindings'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'security:inspector-scanCapabilityData'],
      inputs: {
        shape: 'BindingContext with security:inspector-scan capability and write access',
        notes: 'Tests write access IAM policy generation'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('InspectorBind__ScanWriteAccess__ReturnsWritePolicies', async () => {
      const strategy = new InspectorBinderStrategy();
      const source = createMockSourceComponent('lambda-security', 'test-source');
      
      const target = createMockTargetComponent('inspector', {
        'security:inspector-scan': {
          scanArn: 'arn:aws:inspector2:us-east-1:123456789012:scan/test-scan'
        },
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'security:inspector-scan',
        access: 'write'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);
      
      const writePolicy = result.iamPolicies.find(p => 
        p.description.includes('write')
      );
      expect(writePolicy).toBeDefined();
      expect(writePolicy?.statement.actions).toContain('inspector2:StartScan');
    });
  });

  describe('InspectorBind__WithSecureAccess__AddsAutoRemediationPolicies', () => {
    const metadata = {
      id: 'TP-binders-security-inspector-003',
      level: 'unit' as const,
      capability: 'Adds auto-remediation IAM policies when requireSecureAccess option is provided',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'InspectorBind__Condition__Outcome', example: 'InspectorBind__WithSecureAccess__AddsAutoRemediationPolicies' },
      invariants: [
        'IAM policies include lambda:InvokeFunction',
        'IAM policies include Security Hub integration'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'security:inspector-scanCapabilityData'],
      inputs: {
        shape: 'BindingContext with security:inspector-scan capability and requireSecureAccess option',
        notes: 'Tests secure hooks support'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('InspectorBind__WithSecureAccess__AddsAutoRemediationPolicies', async () => {
      const strategy = new InspectorBinderStrategy();
      const source = createMockSourceComponent('lambda-security', 'test-source');
      
      const target = createMockTargetComponent('inspector', {
        'security:inspector-scan': {
          scanArn: 'arn:aws:inspector2:us-east-1:123456789012:scan/test-scan'
        },
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'security:inspector-scan',
        access: 'read',
        options: {
          requireSecureAccess: true
        }
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);
      
      const autoRemediationPolicy = result.iamPolicies.find(p => 
        p.description.includes('Auto-remediation')
      );
      expect(autoRemediationPolicy).toBeDefined();
      expect(autoRemediationPolicy?.statement.actions).toContain('lambda:InvokeFunction');
      
      const securityHubPolicy = result.iamPolicies.find(p => 
        p.description.includes('Security Hub')
      );
      expect(securityHubPolicy).toBeDefined();
    });
  });

  describe('InspectorBind__MissingScanArn__ThrowsError', () => {
    const metadata = {
      id: 'TP-binders-security-inspector-004',
      level: 'unit' as const,
      capability: 'Throws error when required scanArn property is missing',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'InspectorBind__Condition__Outcome', example: 'InspectorBind__MissingScanArn__ThrowsError' },
      invariants: [
        'Error message includes "missing required scanArn"',
        'Error is thrown before binding completes'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with security:inspector-scan capability but missing scanArn',
        notes: 'Tests validation error handling'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('InspectorBind__MissingScanArn__ThrowsError', async () => {
      const strategy = new InspectorBinderStrategy();
      const source = createMockSourceComponent('lambda-security', 'test-source');
      
      const target = createMockTargetComponent('inspector', {
        'security:inspector-scan': {
          // Missing scanArn
        },
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'security:inspector-scan',
        access: 'read'
      });

      await expect(executeUnifiedBinding(strategy, context)).rejects.toThrow('missing required scanArn');
    });
  });

  describe('InspectorBind__CustomActionsOverride__ReplacesCoarseActions', () => {
    const metadata = {
      id: 'TP-binders-security-inspector-010',
      level: 'unit' as const,
      capability: 'Custom actions override replaces default Inspector actions',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'InspectorBind__Condition__Outcome', example: 'InspectorBind__CustomActionsOverride__ReplacesCoarseActions' },
      invariants: [
        'IAM policy actions match provided custom actions array',
        'Default Inspector actions are not included when custom actions provided',
        'Actions array is used directly (replaces coarse access)'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'InspectorScanCapabilityData'],
      inputs: {
        shape: 'BindingContext with security:inspector-scan capability and directive.actions array',
        notes: 'Granular actions override test'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('InspectorBind__CustomActionsOverride__ReplacesCoarseActions', async () => {
      const strategy = new InspectorBinderStrategy();
      const target = createMockTargetComponent('inspector-scan', {
        'security:inspector-scan': {
          scanArn: 'arn:aws:inspector2:us-east-1:123456789012:scan/test-scan-id'
        }
      });

      const customActions = ['inspector2:GetFindings', 'inspector2:ListFindings'];
      const context = createBindingContext({
        source: createMockSourceComponent(),
        target,
        capability: 'security:inspector-scan',
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

  describe('InspectorBind__InvalidActionPrefix__ThrowsPrefixMismatchError', () => {
    const metadata = {
      id: 'TP-binders-security-inspector-011',
      level: 'unit' as const,
      capability: 'Throws error when actions array contains actions with wrong service prefix',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'InspectorBind__Condition__Outcome', example: 'InspectorBind__InvalidActionPrefix__ThrowsPrefixMismatchError' },
      invariants: [
        'Error message indicates service prefix mismatch',
        'Error specifies which actions are mismatched',
        'Binding fails before IAM policy generation'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'InspectorScanCapabilityData'],
      inputs: {
        shape: 'BindingContext with security:inspector-scan capability and directive.actions containing non-inspector2 actions',
        notes: 'Error case - invalid action prefix for Inspector binder'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('InspectorBind__InvalidActionPrefix__ThrowsPrefixMismatchError', async () => {
      const strategy = new InspectorBinderStrategy();
      const target = createMockTargetComponent('inspector-scan', {
        'security:inspector-scan': {
          scanArn: 'arn:aws:inspector2:us-east-1:123456789012:scan/test-scan-id'
        }
      });

      const invalidActions = ['s3:GetObject']; // Wrong service prefix
      const context = createBindingContext({
        source: createMockSourceComponent(),
        target,
        capability: 'security:inspector-scan',
        access: 'read',
        actions: invalidActions
      });

      await expect(executeUnifiedBinding(strategy, context)).rejects.toThrow(
        "Actions must match service prefix 'inspector2:'"
      );
    });
  });
});

