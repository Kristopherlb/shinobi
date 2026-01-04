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
} from '../../security/__tests__/unified-strategy-test-helpers.js';
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

  describe('BackupBind__CustomActionsOverride__ReplacesCoarseActions', () => {
    const metadata = {
      id: 'TP-binders-governance-backup-003',
      level: 'unit' as const,
      capability: 'Custom actions override replaces default Backup vault actions',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'BackupBind__Condition__Outcome', example: 'BackupBind__CustomActionsOverride__ReplacesCoarseActions' },
      invariants: [
        'IAM policy actions match provided custom actions array',
        'Default Backup actions are not included when custom actions provided',
        'Actions array is used directly (replaces coarse access)'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with governance:backup-vault capability and directive.actions array',
        notes: 'Granular actions override test'
      },
      risks: [],
      dependencies: ['action-resolver'],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('BackupBind__CustomActionsOverride__ReplacesCoarseActions', async () => {
      const strategy = new BackupBinderStrategy();
      const customActions = ['backup:DescribeBackupVault', 'backup:ListBackupVaults'];
      const target = createMockTargetComponent('backup', {
        'governance:backup-vault': {
          backupVaultArn: 'arn:aws:backup:us-east-1:123456789012:backup-vault:test-vault',
          backupVaultName: 'test-vault'
        },
      });

      const context = createBindingContext({
        source: createMockSourceComponent('lambda-backup', 'test-source'),
        target,
        capability: 'governance:backup-vault',
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
      expect(actions).not.toContain('backup:ListRecoveryPointsByBackupVault');
      expect(actions).not.toContain('backup:GetRecoveryPointRestoreMetadata');
    });
  });

  describe('BackupBind__VaultWriteAccess__GrantsWriteActions', () => {
    const metadata = {
      id: 'TP-binders-governance-backup-004',
      level: 'unit' as const,
      capability: 'Vault write access grants Backup write actions',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'BackupBind__Condition__Outcome', example: 'BackupBind__VaultWriteAccess__GrantsWriteActions' },
      invariants: [
        'IAM policies include Backup write actions',
        'Write actions include CreateBackupVault and PutBackupVaultAccessPolicy'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with governance:backup-vault capability and write access',
        notes: 'Vault write access test'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('BackupBind__VaultWriteAccess__GrantsWriteActions', async () => {
      const strategy = new BackupBinderStrategy();
      const target = createMockTargetComponent('backup', {
        'governance:backup-vault': {
          backupVaultArn: 'arn:aws:backup:us-east-1:123456789012:backup-vault:test-vault'
        }
      });

      const context = createBindingContext({
        source: createMockSourceComponent('lambda-backup', 'test-source'),
        target,
        capability: 'governance:backup-vault',
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

      expect(actions).toContain('backup:CreateBackupVault');
      expect(actions).toContain('backup:PutBackupVaultAccessPolicy');
      expect(actions).toContain('backup:DeleteBackupVault');
    });
  });

  describe('BackupBind__VaultWithKMSKey__GrantsKMSPermissions', () => {
    const metadata = {
      id: 'TP-binders-governance-backup-005',
      level: 'unit' as const,
      capability: 'Vault with KMS key grants KMS permissions',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'BackupBind__Condition__Outcome', example: 'BackupBind__VaultWithKMSKey__GrantsKMSPermissions' },
      invariants: [
        'IAM policies include KMS permissions when kmsKeyId is provided',
        'Environment variables include AWS_BACKUP_VAULT_KMS_KEY_ID'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with governance:backup-vault capability and kmsKeyId',
        notes: 'KMS permissions test'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('BackupBind__VaultWithKMSKey__GrantsKMSPermissions', async () => {
      const strategy = new BackupBinderStrategy();
      const kmsKeyId = 'arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012';
      const target = createMockTargetComponent('backup', {
        'governance:backup-vault': {
          backupVaultArn: 'arn:aws:backup:us-east-1:123456789012:backup-vault:test-vault',
          kmsKeyId
        }
      });

      const context = createBindingContext({
        source: createMockSourceComponent('lambda-backup', 'test-source'),
        target,
        capability: 'governance:backup-vault',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      expect(result.environmentVariables.AWS_BACKUP_VAULT_KMS_KEY_ID).toBe(kmsKeyId);

      const policy = result.iamPolicies.find(p => p.description.includes('KMS encryption'));
      expect(policy).toBeDefined();
      
      const statementJson = policy!.statement.toStatementJson();
      const actions = Array.isArray(statementJson.Action)
        ? statementJson.Action
        : [statementJson.Action];

      expect(actions).toContain('kms:Decrypt');
      expect(actions).toContain('kms:GenerateDataKey');
    });
  });

  describe('BackupBind__VaultMissingBackupVaultArn__ThrowsError', () => {
    const metadata = {
      id: 'TP-binders-governance-backup-006',
      level: 'unit' as const,
      capability: 'Missing backupVaultArn throws error',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'BackupBind__Condition__Outcome', example: 'BackupBind__VaultMissingBackupVaultArn__ThrowsError' },
      invariants: [
        'Error message indicates missing backupVaultArn',
        'Error is thrown before binding completes'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with governance:backup-vault capability but missing backupVaultArn',
        notes: 'Error case test'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('BackupBind__VaultMissingBackupVaultArn__ThrowsError', async () => {
      const strategy = new BackupBinderStrategy();
      const target = createMockTargetComponent('backup', {
        'governance:backup-vault': {
          // Missing backupVaultArn
        } as any
      });

      const context = createBindingContext({
        source: createMockSourceComponent('lambda-backup', 'test-source'),
        target,
        capability: 'governance:backup-vault',
        access: 'read'
      });

      await expect(executeUnifiedBinding(strategy, context)).rejects.toThrow(
        'missing required backupVaultArn property'
      );
    });
  });

  describe('BackupBind__PlanReadAccess__ReturnsEnhancedResult', () => {
    const metadata = {
      id: 'TP-binders-governance-backup-007',
      level: 'unit' as const,
      capability: 'Backup plan read access returns enhanced result',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'BackupBind__Condition__Outcome', example: 'BackupBind__PlanReadAccess__ReturnsEnhancedResult' },
      invariants: [
        'Environment variables are set correctly',
        'IAM policies include Backup plan read actions'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with governance:backup-plan capability and read access',
        notes: 'Backup plan read access test'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('BackupBind__PlanReadAccess__ReturnsEnhancedResult', async () => {
      const strategy = new BackupBinderStrategy();
      const backupPlanArn = 'arn:aws:backup:us-east-1:123456789012:backup-plan:test-plan';
      const target = createMockTargetComponent('backup', {
        'governance:backup-plan': {
          backupPlanArn,
          backupPlanId: 'test-plan-id',
          backupPlanName: 'test-plan'
        }
      });

      const context = createBindingContext({
        source: createMockSourceComponent('lambda-backup', 'test-source'),
        target,
        capability: 'governance:backup-plan',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      expect(result.environmentVariables.AWS_BACKUP_PLAN_ARN).toBe(backupPlanArn);
      expect(result.environmentVariables.AWS_BACKUP_PLAN_ID).toBe('test-plan-id');
      expect(result.environmentVariables.AWS_BACKUP_PLAN_NAME).toBe('test-plan');

      const policy = result.iamPolicies.find(p => p.description.includes('read access'));
      expect(policy).toBeDefined();
      
      const statementJson = policy!.statement.toStatementJson();
      const actions = Array.isArray(statementJson.Action)
        ? statementJson.Action
        : [statementJson.Action];

      expect(actions).toContain('backup:GetBackupPlan');
      expect(actions).toContain('backup:ListBackupPlans');
    });
  });

  describe('BackupBind__PlanWriteAccess__GrantsWriteActions', () => {
    const metadata = {
      id: 'TP-binders-governance-backup-008',
      level: 'unit' as const,
      capability: 'Backup plan write access grants write actions',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'BackupBind__Condition__Outcome', example: 'BackupBind__PlanWriteAccess__GrantsWriteActions' },
      invariants: [
        'IAM policies include Backup plan write actions',
        'Write actions include CreateBackupPlan and UpdateBackupPlan'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with governance:backup-plan capability and write access',
        notes: 'Backup plan write access test'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('BackupBind__PlanWriteAccess__GrantsWriteActions', async () => {
      const strategy = new BackupBinderStrategy();
      const target = createMockTargetComponent('backup', {
        'governance:backup-plan': {
          backupPlanArn: 'arn:aws:backup:us-east-1:123456789012:backup-plan:test-plan'
        }
      });

      const context = createBindingContext({
        source: createMockSourceComponent('lambda-backup', 'test-source'),
        target,
        capability: 'governance:backup-plan',
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

      expect(actions).toContain('backup:CreateBackupPlan');
      expect(actions).toContain('backup:UpdateBackupPlan');
      expect(actions).toContain('backup:DeleteBackupPlan');
    });
  });

  describe('BackupBind__PlanMissingBackupPlanArn__ThrowsError', () => {
    const metadata = {
      id: 'TP-binders-governance-backup-009',
      level: 'unit' as const,
      capability: 'Backup plan missing backupPlanArn throws error',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'BackupBind__Condition__Outcome', example: 'BackupBind__PlanMissingBackupPlanArn__ThrowsError' },
      invariants: [
        'Error message indicates missing backupPlanArn',
        'Error is thrown before binding completes'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with governance:backup-plan capability but missing backupPlanArn',
        notes: 'Error case test for backup-plan'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('BackupBind__PlanMissingBackupPlanArn__ThrowsError', async () => {
      const strategy = new BackupBinderStrategy();
      const target = createMockTargetComponent('backup', {
        'governance:backup-plan': {
          // Missing backupPlanArn
        } as any
      });

      const context = createBindingContext({
        source: createMockSourceComponent('lambda-backup', 'test-source'),
        target,
        capability: 'governance:backup-plan',
        access: 'read'
      });

      await expect(executeUnifiedBinding(strategy, context)).rejects.toThrow(
        'missing required backupPlanArn property'
      );
    });
  });

  describe('BackupBind__UnsupportedCapability__ThrowsError', () => {
    const metadata = {
      id: 'TP-binders-governance-backup-010',
      level: 'unit' as const,
      capability: 'Unsupported capability throws error',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'BackupBind__Condition__Outcome', example: 'BackupBind__UnsupportedCapability__ThrowsError' },
      invariants: [
        'Error message indicates unsupported capability',
        'Error lists supported capabilities'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with unsupported capability',
        notes: 'Error case test'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('BackupBind__UnsupportedCapability__ThrowsError', async () => {
      const strategy = new BackupBinderStrategy();
      const target = createMockTargetComponent('backup', {
        'backup:invalid': {
          backupVaultArn: 'arn:aws:backup:us-east-1:123456789012:backup-vault:test-vault'
        }
      });

      const context = createBindingContext({
        source: createMockSourceComponent('lambda-backup', 'test-source'),
        target,
        capability: 'backup:invalid',
        access: 'read'
      });

      await expect(executeUnifiedBinding(strategy, context)).rejects.toThrow(
        'Unsupported Backup capability'
      );
    });
  });
});

