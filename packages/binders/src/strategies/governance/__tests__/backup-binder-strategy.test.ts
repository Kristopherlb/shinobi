/**
 * BackupBinderStrategy Tests (Unified)
 * 
 * Tests for BackupBinderStrategy following Platform Testing Standard v1.0
 * All tests assert EnhancedBindingResult structure (return-based, not mutation-based)
 */

import { BackupBinderStrategy } from '../backup-binder-strategy.js';
import {
  createMockSourceComponent,
  createMockTargetComponent,
  createBindingContext,
  executeUnifiedBinding,
  assertEnhancedBindingResult,
  TEST_CONSTANTS
} from '@shinobi/binders/security/__tests__/unified-strategy-test-helpers';
import type { EnhancedBindingResult } from '@shinobi/core';

describe('BackupBinderStrategy', () => {
  describe('BackupBind__ValidAccess__ReturnsEnhancedResult', () => {
    const metadata = {
      id: 'TP-binders-governance-backup-001',
      level: 'unit' as const,
      capability: 'Returns EnhancedBindingResult with all required fields including compliance block',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'BackupBind__Condition__Outcome', example: 'BackupBind__ValidAccess__ReturnsEnhancedResult' },
      invariants: [
        'result.compliance.status exists and is one of compliant|non-compliant|partially-compliant',
        'result.environmentVariables contains expected keys',
        'result.iamPolicies is an array',
        'result.securityGroupRules is an array'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'governance:backup-vaultCapabilityData'],
      inputs: {
        shape: 'BindingContext with governance:backup-vault capability',
        notes: 'Basic valid binding with read access'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('BackupBind__ValidAccess__ReturnsEnhancedResult', async () => {
      const strategy = new BackupBinderStrategy();
      const source = createMockSourceComponent('lambda-backup', 'test-source');
      
      const target = createMockTargetComponent('backup', {
        'governance:backup-vault': {
          backupVaultArn: 'arn:aws:backup:us-east-1:123456789012:backup-vault:test-vault',
          backupVaultName: 'test-vault',
          kmsKeyId: 'arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012',
          lockMode: 'COMPLIANCE'
        },
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'governance:backup-vault',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      expect(result.environmentVariables.AWS_BACKUP_VAULT_ARN).toBe('arn:aws:backup:us-east-1:123456789012:backup-vault:test-vault');
      expect(result.environmentVariables.AWS_BACKUP_VAULT_NAME).toBe('test-vault');
      expect(result.environmentVariables.AWS_BACKUP_VAULT_KMS_KEY_ID).toBe('arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012');
      expect(result.environmentVariables.AWS_BACKUP_VAULT_LOCK_MODE).toBe('COMPLIANCE');
      expect(result.iamPolicies.length).toBeGreaterThan(0);
      expect(['compliant', 'non-compliant', 'partially-compliant']).toContain(result.compliance.status);
    });
  });

  describe('BackupBind__WithReportPlanAndRecoveryPoint__ExposesReportPlanAndRecoveryPoint', () => {
    const metadata = {
      id: 'TP-binders-governance-backup-002',
      level: 'unit' as const,
      capability: 'Exposes report plan and recovery point ARNs when provided',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'BackupBind__Condition__Outcome', example: 'BackupBind__WithReportPlanAndRecoveryPoint__ExposesReportPlanAndRecoveryPoint' },
      invariants: [
        'Environment variables include AWS_BACKUP_REPORT_PLAN_ARN and AWS_BACKUP_RECOVERY_POINT_ARN when provided'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'governance:backup-vaultCapabilityData'],
      inputs: {
        shape: 'BindingContext with governance:backup-vault capability including report plan and recovery point',
        notes: 'Tests report plan and recovery point exposure'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('BackupBind__WithReportPlanAndRecoveryPoint__ExposesReportPlanAndRecoveryPoint', async () => {
      const strategy = new BackupBinderStrategy();
      const source = createMockSourceComponent('lambda-backup', 'test-source');
      
      const target = createMockTargetComponent('backup', {
        'governance:backup-vault': {
          backupVaultArn: 'arn:aws:backup:us-east-1:123456789012:backup-vault:test-vault',
          reportPlanArn: 'arn:aws:backup:us-east-1:123456789012:backup-report-plan:test-report-plan',
          recoveryPointArn: 'arn:aws:backup:us-east-1:123456789012:recovery-point:test-recovery-point',
          copyJobId: 'test-copy-job-id',
          backupSelectionId: 'test-selection-id',
          backupRuleId: 'test-rule-id'
        },
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'governance:backup-vault',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      expect(result.environmentVariables.AWS_BACKUP_REPORT_PLAN_ARN).toBe('arn:aws:backup:us-east-1:123456789012:backup-report-plan:test-report-plan');
      expect(result.environmentVariables.AWS_BACKUP_RECOVERY_POINT_ARN).toBe('arn:aws:backup:us-east-1:123456789012:recovery-point:test-recovery-point');
      expect(result.environmentVariables.AWS_BACKUP_COPY_JOB_ID).toBe('test-copy-job-id');
      expect(result.environmentVariables.AWS_BACKUP_SELECTION_ID).toBe('test-selection-id');
      expect(result.environmentVariables.AWS_BACKUP_RULE_ID).toBe('test-rule-id');
    });
  });
});

