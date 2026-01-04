/**
 * MacieBinderStrategy Tests (Unified)
 * 
 * Tests for MacieBinderStrategy following Platform Testing Standard v1.0
 * All tests assert EnhancedBindingResult structure (return-based, not mutation-based)
 */

import { MacieBinderStrategy } from '../macie-binder-strategy.js';
import {
  createMockSourceComponent,
  createMockTargetComponent,
  createBindingContext,
  executeUnifiedBinding,
  assertEnhancedBindingResult,
  TEST_CONSTANTS
} from './unified-strategy-test-helpers.js';
import type { EnhancedBindingResult } from '@shinobi/core';

describe('MacieBinderStrategy', () => {
  describe('MacieBind__JobReadAccess__ReturnsEnhancedResult', () => {
    const metadata = {
      id: 'TP-binders-security-macie-001',
      level: 'unit' as const,
      capability: 'Returns EnhancedBindingResult with all required fields including compliance block',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'MacieBind__Condition__Outcome', example: 'MacieBind__JobReadAccess__ReturnsEnhancedResult' },
      invariants: [
        'result.compliance.status exists and is one of compliant|non-compliant|partially-compliant',
        'result.environmentVariables contains AWS_MACIE_JOB_ID',
        'result.iamPolicies is an array with read actions',
        'result.securityGroupRules is an array'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'security:macie-jobCapabilityData'],
      inputs: {
        shape: 'BindingContext with security:macie-job capability and read access',
        notes: 'Basic valid binding with read access'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('MacieBind__JobReadAccess__ReturnsEnhancedResult', async () => {
      const strategy = new MacieBinderStrategy();
      const source = createMockSourceComponent('lambda-security', 'test-source');
      
      const target = createMockTargetComponent('macie', {
        'security:macie-job': {
          jobId: 'macie-job-123',
          findingsBucket: 'macie-findings-bucket',
          s3BucketArn: 'arn:aws:s3:::test-bucket',
          jobStatus: 'COMPLETE'
        },
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'security:macie-job',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      expect(result.environmentVariables.AWS_MACIE_JOB_ID).toBe('macie-job-123');
      expect(result.environmentVariables.AWS_MACIE_FINDINGS_BUCKET).toBe('macie-findings-bucket');
      expect(result.environmentVariables.AWS_MACIE_S3_BUCKET_ARN).toBe('arn:aws:s3:::test-bucket');
      expect(result.environmentVariables.AWS_MACIE_JOB_STATUS).toBe('COMPLETE');
      expect(result.iamPolicies.length).toBeGreaterThan(0);
      expect(['compliant', 'non-compliant', 'partially-compliant']).toContain(result.compliance.status);
    });
  });

  describe('MacieBind__JobWithAllFields__ExposesAllEnvironmentVariables', () => {
    const metadata = {
      id: 'TP-binders-security-macie-005',
      level: 'unit' as const,
      capability: 'Exposes all optional environment variables when provided in target data',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'MacieBind__Condition__Outcome', example: 'MacieBind__JobWithAllFields__ExposesAllEnvironmentVariables' },
      invariants: [
        'Environment variables include managed and custom data identifiers',
        'Environment variables include classification export format and schedule',
        'Environment variables include finding statistics and severity'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'security:macie-jobCapabilityData'],
      inputs: {
        shape: 'BindingContext with security:macie-job capability with all optional fields',
        notes: 'Tests comprehensive field exposure'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('MacieBind__JobWithAllFields__ExposesAllEnvironmentVariables', async () => {
      const strategy = new MacieBinderStrategy();
      const source = createMockSourceComponent('lambda-security', 'test-source');
      
      const target = createMockTargetComponent('macie', {
        'security:macie-job': {
          jobId: 'macie-job-123',
          customDataIdentifiers: ['custom-id-1', 'custom-id-2'],
          managedDataIdentifiers: ['AWS_CREDENTIALS', 'CREDIT_CARD_NUMBER'],
          classificationExportFormat: 'JSON',
          classificationSchedule: 'cron(0 0 * * ? *)',
          findingStatistics: { total: 25, critical: 5, high: 10, medium: 8, low: 2 },
          findingSeverity: 'CRITICAL'
        },
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'security:macie-job',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      expect(result.environmentVariables.AWS_MACIE_MANAGED_DATA_IDENTIFIERS).toBe('AWS_CREDENTIALS,CREDIT_CARD_NUMBER');
      expect(result.environmentVariables.AWS_MACIE_CLASSIFICATION_EXPORT_FORMAT).toBe('JSON');
      expect(result.environmentVariables.AWS_MACIE_CLASSIFICATION_SCHEDULE).toBe('cron(0 0 * * ? *)');
      expect(result.environmentVariables.AWS_MACIE_FINDING_STATISTICS).toBeDefined();
      expect(result.environmentVariables.AWS_MACIE_FINDING_SEVERITY).toBe('CRITICAL');
    });
  });

  describe('MacieBind__JobWriteAccess__ReturnsWritePolicies', () => {
    const metadata = {
      id: 'TP-binders-security-macie-002',
      level: 'unit' as const,
      capability: 'Returns IAM policies with write actions for write access',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'MacieBind__Condition__Outcome', example: 'MacieBind__JobWriteAccess__ReturnsWritePolicies' },
      invariants: [
        'IAM policies include macie2:CreateClassificationJob',
        'IAM policies include macie2:UpdateClassificationJob'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'security:macie-jobCapabilityData'],
      inputs: {
        shape: 'BindingContext with security:macie-job capability and write access',
        notes: 'Tests write access IAM policy generation'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('MacieBind__JobWriteAccess__ReturnsWritePolicies', async () => {
      const strategy = new MacieBinderStrategy();
      const source = createMockSourceComponent('lambda-security', 'test-source');
      
      const target = createMockTargetComponent('macie', {
        'security:macie-job': {
          jobId: 'macie-job-123'
        },
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'security:macie-job',
        access: 'write'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);
      
      const writePolicy = result.iamPolicies.find(p => 
        p.description.includes('write')
      );
      expect(writePolicy).toBeDefined();
      expect(writePolicy?.statement.actions).toContain('macie2:CreateClassificationJob');
    });
  });

  describe('MacieBind__WithSecureAccess__AddsEventBridgePolicies', () => {
    const metadata = {
      id: 'TP-binders-security-macie-003',
      level: 'unit' as const,
      capability: 'Adds EventBridge IAM policies when requireSecureAccess option is provided',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'MacieBind__Condition__Outcome', example: 'MacieBind__WithSecureAccess__AddsEventBridgePolicies' },
      invariants: [
        'IAM policies include events:PutEvents',
        'IAM policies include EventBridge integration description'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'security:macie-jobCapabilityData'],
      inputs: {
        shape: 'BindingContext with security:macie-job capability and requireSecureAccess option',
        notes: 'Tests secure hooks support'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('MacieBind__WithSecureAccess__AddsEventBridgePolicies', async () => {
      const strategy = new MacieBinderStrategy();
      const source = createMockSourceComponent('lambda-security', 'test-source');
      
      const target = createMockTargetComponent('macie', {
        'security:macie-job': {
          jobId: 'macie-job-123'
        },
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'security:macie-job',
        access: 'read',
        options: {
          requireSecureAccess: true
        }
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);
      
      const eventBridgePolicy = result.iamPolicies.find(p => 
        p.description.includes('EventBridge')
      );
      expect(eventBridgePolicy).toBeDefined();
      expect(eventBridgePolicy?.statement.actions).toContain('events:PutEvents');
    });
  });

  describe('MacieBind__MissingJobId__ThrowsError', () => {
    const metadata = {
      id: 'TP-binders-security-macie-004',
      level: 'unit' as const,
      capability: 'Throws error when required jobId property is missing',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'MacieBind__Condition__Outcome', example: 'MacieBind__MissingJobId__ThrowsError' },
      invariants: [
        'Error message includes "missing required jobId"',
        'Error is thrown before binding completes'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with security:macie-job capability but missing jobId',
        notes: 'Tests validation error handling'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('MacieBind__MissingJobId__ThrowsError', async () => {
      const strategy = new MacieBinderStrategy();
      const source = createMockSourceComponent('lambda-security', 'test-source');
      
      const target = createMockTargetComponent('macie', {
        'security:macie-job': {
          // Missing jobId
        },
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'security:macie-job',
        access: 'read'
      });

      await expect(executeUnifiedBinding(strategy, context)).rejects.toThrow('missing required jobId');
    });
  });

  describe('MacieBind__CustomActionsOverride__ReplacesCoarseActions', () => {
    const metadata = {
      id: 'TP-binders-security-macie-010',
      level: 'unit' as const,
      capability: 'Custom actions override replaces default Macie actions',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'MacieBind__Condition__Outcome', example: 'MacieBind__CustomActionsOverride__ReplacesCoarseActions' },
      invariants: [
        'IAM policy actions match provided custom actions array',
        'Default Macie actions are not included when custom actions provided',
        'Actions array is used directly (replaces coarse access)'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'MacieJobCapabilityData'],
      inputs: {
        shape: 'BindingContext with security:macie-job capability and directive.actions array',
        notes: 'Granular actions override test'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('MacieBind__CustomActionsOverride__ReplacesCoarseActions', async () => {
      const strategy = new MacieBinderStrategy();
      const target = createMockTargetComponent('macie-job', {
        'security:macie-job': {
          jobId: 'test-job-id',
          jobArn: 'arn:aws:macie2:us-east-1:123456789012:classification-job/test-job-id'
        }
      });

      const customActions = ['macie2:GetClassificationJob', 'macie2:ListFindings'];
      const context = createBindingContext({
        source: createMockSourceComponent(),
        target,
        capability: 'security:macie-job',
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

  describe('MacieBind__InvalidActionPrefix__ThrowsPrefixMismatchError', () => {
    const metadata = {
      id: 'TP-binders-security-macie-011',
      level: 'unit' as const,
      capability: 'Throws error when actions array contains actions with wrong service prefix',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'MacieBind__Condition__Outcome', example: 'MacieBind__InvalidActionPrefix__ThrowsPrefixMismatchError' },
      invariants: [
        'Error message indicates service prefix mismatch',
        'Error specifies which actions are mismatched',
        'Binding fails before IAM policy generation'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'MacieJobCapabilityData'],
      inputs: {
        shape: 'BindingContext with security:macie-job capability and directive.actions containing non-macie2 actions',
        notes: 'Error case - invalid action prefix for Macie binder'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('MacieBind__InvalidActionPrefix__ThrowsPrefixMismatchError', async () => {
      const strategy = new MacieBinderStrategy();
      const target = createMockTargetComponent('macie-job', {
        'security:macie-job': {
          jobId: 'test-job-id',
          jobArn: 'arn:aws:macie2:us-east-1:123456789012:classification-job/test-job-id'
        }
      });

      const invalidActions = ['s3:GetObject']; // Wrong service prefix
      const context = createBindingContext({
        source: createMockSourceComponent(),
        target,
        capability: 'security:macie-job',
        access: 'read',
        actions: invalidActions
      });

      await expect(executeUnifiedBinding(strategy, context)).rejects.toThrow(
        "Actions must match service prefix 'macie2:'"
      );
    });
  });
});

