/**
 * BackupBinderStrategy (Unified)
 * Handles AWS Backup bindings with mandatory compliance enforcement
 * 
 * Multi-capability strategy supporting:
 * - governance:backup-vault - Backup vaults for recovery point storage
 * - governance:backup-plan - Backup plans (schedule, lifecycle, rules)
 */

import { UnifiedBinderStrategyBase, resolveActions } from '@shinobi/core';
import type { BindingContext, EnhancedBindingResult, CompatibilityEntry } from '@shinobi/core';
import type { IamPolicy } from '@shinobi/core';
import { PolicyStatement, Effect } from 'aws-cdk-lib/aws-iam';

export class BackupBinderStrategy extends UnifiedBinderStrategyBase {
  readonly supportedCapabilities = [
    'governance:backup-vault',
    'governance:backup-plan'
  ];

  getStrategyName(): string {
    return 'BackupBinderStrategy';
  }

  canHandle(sourceType: string, targetCapability: string): boolean {
    return this.supportedCapabilities.includes(targetCapability);
  }

  getCompatibilityMatrix(): CompatibilityEntry[] {
    return [
      {
        sourceType: '*',
        targetType: '*',
        capability: 'governance:backup-vault',
        supportedAccess: ['read', 'write', 'admin'],
        description: 'Bind to AWS Backup vaults for recovery point storage',
        examples: ['lambda-backup -> governance:backup-vault (read)', 'lambda-governance -> governance:backup-vault (write)']
      },
      {
        sourceType: '*',
        targetType: '*',
        capability: 'governance:backup-plan',
        supportedAccess: ['read', 'write', 'admin'],
        description: 'Bind to AWS Backup plans for backup scheduling and lifecycle management',
        examples: ['lambda-backup -> governance:backup-plan (read)', 'lambda-governance -> governance:backup-plan (write)']
      }
    ];
  }

  protected async doBind(context: BindingContext): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    const { source, target, directive } = context;
    const { capability } = directive;

    // Validate inputs
    if (!target) {
      throw new Error('Target component is required for AWS Backup binding');
    }
    if (!capability) {
      throw new Error('Binding capability is required');
    }

    // Get target capability data
    const targetCapabilities = target.getCapabilities();
    const targetCapabilityData = targetCapabilities[capability];
    if (!targetCapabilityData) {
      throw new Error(`Target component does not provide capability '${capability}'`);
    }

    // Route to appropriate binding method
    switch (capability) {
      case 'governance:backup-vault':
        return await this.bindToBackupVault(context, targetCapabilityData);
      case 'governance:backup-plan':
        return await this.bindToBackupPlan(context, targetCapabilityData);
      default:
        throw new Error(`Unsupported Backup capability: ${capability}. Supported capabilities: ${this.supportedCapabilities.join(', ')}`);
    }
  }

  /**
   * Bind to governance:backup-vault
   * 
   * @param context - Binding context
   * @param targetData - Expected structure:
   *   - backupVaultArn (required): string - Backup vault ARN
   *   - backupVaultName (optional): string - Backup vault name
   *   - kmsKeyId (optional): string - KMS key ID for encryption
   *   - lockMode (optional): string - Lock mode (COMPLIANCE, GOVERNANCE) for immutability
   *   - reportPlanArn (optional): string - Backup report plan ARN
   *   - recoveryPointArn (optional): string - Recovery point ARN
   *   - backupSelectionId (optional): string - Backup selection ID
   *   - backupRuleId (optional): string - Backup rule ID
   *   - copyJobId (optional): string - Cross-region copy job ID
   * @returns Enhanced binding result (without compliance block)
   */
  private async bindToBackupVault(
    context: BindingContext,
    targetData: any
  ): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    const { directive } = context;
    const { access, options } = directive;

    if (!targetData?.backupVaultArn) {
      throw new Error('Target component missing required backupVaultArn property for governance:backup-vault binding');
    }

    const iamPolicies: IamPolicy[] = [];
    const environmentVariables: Record<string, string> = {
      AWS_BACKUP_VAULT_ARN: targetData.backupVaultArn
    };

    if (targetData.backupVaultName) {
      environmentVariables.AWS_BACKUP_VAULT_NAME = targetData.backupVaultName;
    }

    if (targetData.kmsKeyId) {
      environmentVariables.AWS_BACKUP_VAULT_KMS_KEY_ID = targetData.kmsKeyId;
    }

    if (targetData.lockMode) {
      environmentVariables.AWS_BACKUP_VAULT_LOCK_MODE = targetData.lockMode;
    }

    if (targetData.reportPlanArn) {
      environmentVariables.AWS_BACKUP_REPORT_PLAN_ARN = targetData.reportPlanArn;
    }

    if (targetData.recoveryPointArn) {
      environmentVariables.AWS_BACKUP_RECOVERY_POINT_ARN = targetData.recoveryPointArn;
    }

    if (targetData.backupSelectionId) {
      environmentVariables.AWS_BACKUP_SELECTION_ID = targetData.backupSelectionId;
    }

    if (targetData.backupRuleId) {
      environmentVariables.AWS_BACKUP_RULE_ID = targetData.backupRuleId;
    }

    if (targetData.copyJobId) {
      environmentVariables.AWS_BACKUP_COPY_JOB_ID = targetData.copyJobId;
    }

    // Handle granular actions override or use multi-statement approach
    if (context.directive.actions) {
      // Granular actions provided: create single statement with resolved actions
      const resolvedActions = resolveActions(
        context.directive,
        context,
        (acc: string) => this.getBackupVaultActionsForAccess(acc),
        'backup'
      );

      const statement = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: resolvedActions,
        resources: [targetData.backupVaultArn]
      });
      iamPolicies.push({
        statement,
        description: 'AWS Backup vault access permissions (granular actions)',
        complianceRequirement: 'Least privilege IAM access'
      });
    } else {
      // Coarse access levels: use multi-statement approach (backward compatible)
      if (access === 'read' || access === 'readwrite') {
        iamPolicies.push({
          statement: new PolicyStatement({
            effect: Effect.ALLOW,
            actions: [
              'backup:DescribeBackupVault',
              'backup:ListBackupVaults',
              'backup:ListRecoveryPointsByBackupVault',
              'backup:GetRecoveryPointRestoreMetadata',
              'backup:GetBackupVaultAccessPolicy',
              'backup:GetBackupVaultNotifications'
            ],
            resources: [targetData.backupVaultArn]
          }),
          description: 'AWS Backup vault read access',
          complianceRequirement: 'Least privilege IAM access for AWS Backup vault read operations'
        });
      }

      if (access === 'write' || access === 'readwrite' || access === 'admin') {
        iamPolicies.push({
          statement: new PolicyStatement({
            effect: Effect.ALLOW,
            actions: [
              'backup:CreateBackupVault',
              'backup:UpdateBackupVault',
              'backup:DeleteBackupVault',
              'backup:PutBackupVaultAccessPolicy',
              'backup:DeleteBackupVaultAccessPolicy',
              'backup:PutBackupVaultNotifications',
              'backup:DeleteBackupVaultNotifications',
              'backup:StartBackupJob',
              'backup:StartRestoreJob',
              'backup:StartCopyJob',
              'backup:StopBackupJob'
            ],
            resources: [targetData.backupVaultArn]
          }),
          description: 'AWS Backup vault write access',
          complianceRequirement: 'Least privilege IAM access for AWS Backup vault write operations'
        });
      }

      // Admin access (full Backup permissions)
      if (access === 'admin' && options?.requireFullAdminAccess) {
        iamPolicies.push({
          statement: new PolicyStatement({
            effect: Effect.ALLOW,
            actions: ['backup:*'],
            resources: ['*']
          }),
          description: 'AWS Backup admin access',
          complianceRequirement: 'Full admin access to AWS Backup (requires explicit requireFullAdminAccess option)'
        });
      }
    }

    // KMS encryption for backup vault
    if (targetData.kmsKeyId) {
      iamPolicies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
            'kms:Decrypt',
            'kms:DescribeKey',
            'kms:Encrypt',
            'kms:GenerateDataKey',
            'kms:CreateGrant'
          ],
          resources: [targetData.kmsKeyId]
        }),
        description: 'KMS encryption for backup vault',
        complianceRequirement: 'Least privilege IAM access for KMS encryption'
      });
    }

    // Cross-region copy support
    if (options?.requireSecureAccess || targetData.copyJobId) {
      iamPolicies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
            'backup:CopyIntoBackupVault',
            'backup:DescribeCopyJob',
            'backup:ListCopyJobs',
            'backup:GetRecoveryPointRestoreMetadata'
          ],
          resources: ['*']
        }),
        description: 'Cross-region backup copy access',
        complianceRequirement: 'Least privilege IAM access for cross-region backup copy'
      });
    }

    // Backup report plan access
    if (targetData.reportPlanArn) {
      if (access === 'read' || access === 'readwrite') {
        iamPolicies.push({
          statement: new PolicyStatement({
            effect: Effect.ALLOW,
            actions: [
              'backup:GetBackupReportPlan',
              'backup:DescribeBackupReportPlan'
            ],
            resources: [targetData.reportPlanArn]
          }),
          description: 'Backup report plan read access',
          complianceRequirement: 'Least privilege IAM access for backup report plan read operations'
        });
      }
    }

    // Recovery point access
    if (targetData.recoveryPointArn) {
      if (access === 'read' || access === 'readwrite') {
        iamPolicies.push({
          statement: new PolicyStatement({
            effect: Effect.ALLOW,
            actions: [
              'backup:GetRecoveryPoint',
              'backup:DescribeRecoveryPoint',
              'backup:GetRecoveryPointRestoreMetadata'
            ],
            resources: [targetData.recoveryPointArn]
          }),
          description: 'Recovery point read access',
          complianceRequirement: 'Least privilege IAM access for recovery point read operations'
        });
      }
    }

    // Backup selection and rule details
    if (targetData.backupSelectionId || targetData.backupRuleId) {
      if (access === 'read' || access === 'readwrite') {
        iamPolicies.push({
          statement: new PolicyStatement({
            effect: Effect.ALLOW,
            actions: [
              'backup:GetBackupSelection',
              'backup:DescribeBackupSelection',
              'backup:ListBackupSelections'
            ],
            resources: [targetData.backupVaultArn]
          }),
          description: 'Backup selection and rule read access',
          complianceRequirement: 'Least privilege IAM access for backup selection and rule read operations'
        });
      }
    }

    return {
      iamPolicies,
      environmentVariables,
      securityGroupRules: []
    };
  }

  /**
   * Bind to governance:backup-plan
   * 
   * @param context - Binding context
   * @param targetData - Expected structure:
   *   - backupPlanArn (required): string - Backup plan ARN
   *   - backupPlanId (optional): string - Backup plan ID
   *   - backupPlanName (optional): string - Backup plan name
   *   - reportArn (optional): string - Backup report ARN
   *   - recoveryPointArn (optional): string - Recovery point ARN (if applicable)
   * @returns Enhanced binding result (without compliance block)
   */
  private async bindToBackupPlan(
    context: BindingContext,
    targetData: any
  ): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    const { directive } = context;
    const { access, options } = directive;

    if (!targetData?.backupPlanArn) {
      throw new Error('Target component missing required backupPlanArn property for governance:backup-plan binding');
    }

    const iamPolicies: IamPolicy[] = [];
    const environmentVariables: Record<string, string> = {
      AWS_BACKUP_PLAN_ARN: targetData.backupPlanArn
    };

    if (targetData.backupPlanId) {
      environmentVariables.AWS_BACKUP_PLAN_ID = targetData.backupPlanId;
    }

    if (targetData.backupPlanName) {
      environmentVariables.AWS_BACKUP_PLAN_NAME = targetData.backupPlanName;
    }

    if (targetData.reportArn) {
      environmentVariables.AWS_BACKUP_REPORT_ARN = targetData.reportArn;
    }

    if (targetData.recoveryPointArn) {
      environmentVariables.AWS_BACKUP_RECOVERY_POINT_ARN = targetData.recoveryPointArn;
    }

    // Handle granular actions override or use multi-statement approach
    if (context.directive.actions) {
      // Granular actions provided: create single statement with resolved actions
      const resolvedActions = resolveActions(
        context.directive,
        context,
        (acc: string) => this.getBackupPlanActionsForAccess(acc),
        'backup'
      );

      const statement = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: resolvedActions,
        resources: [targetData.backupPlanArn]
      });
      iamPolicies.push({
        statement,
        description: 'AWS Backup plan access permissions (granular actions)',
        complianceRequirement: 'Least privilege IAM access'
      });
    } else {
      // Coarse access levels: use multi-statement approach (backward compatible)
      if (access === 'read' || access === 'readwrite') {
        iamPolicies.push({
          statement: new PolicyStatement({
            effect: Effect.ALLOW,
            actions: [
              'backup:GetBackupPlan',
              'backup:ListBackupPlans',
              'backup:DescribeBackupPlan',
              'backup:ListBackupSelections',
              'backup:GetBackupSelection',
              'backup:DescribeBackupJob',
              'backup:ListBackupJobs',
              'backup:GetBackupReportPlan',
              'backup:ListBackupReportPlans'
            ],
            resources: [targetData.backupPlanArn]
          }),
          description: 'AWS Backup plan read access',
          complianceRequirement: 'Least privilege IAM access for AWS Backup plan read operations'
        });
      }

      if (access === 'write' || access === 'readwrite' || access === 'admin') {
        iamPolicies.push({
          statement: new PolicyStatement({
            effect: Effect.ALLOW,
            actions: [
              'backup:CreateBackupPlan',
              'backup:UpdateBackupPlan',
              'backup:DeleteBackupPlan',
              'backup:CreateBackupSelection',
              'backup:UpdateBackupSelection',
              'backup:DeleteBackupSelection',
              'backup:StartBackupJob',
              'backup:StartRestoreJob',
              'backup:CreateBackupReportPlan',
              'backup:UpdateBackupReportPlan',
              'backup:DeleteBackupReportPlan'
            ],
            resources: [targetData.backupPlanArn]
          }),
          description: 'AWS Backup plan write access',
          complianceRequirement: 'Least privilege IAM access for AWS Backup plan write operations'
        });
      }

      // Admin access (full Backup permissions)
      if (access === 'admin' && options?.requireFullAdminAccess) {
        iamPolicies.push({
          statement: new PolicyStatement({
            effect: Effect.ALLOW,
            actions: ['backup:*'],
            resources: ['*']
          }),
          description: 'AWS Backup admin access',
          complianceRequirement: 'Full admin access to AWS Backup (requires explicit requireFullAdminAccess option)'
        });
      }
    }

    // Org-wide backup policies integration (via OrganizationsBinderStrategy)
    if (options?.requireSecureAccess) {
      iamPolicies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
            'organizations:DescribeOrganization',
            'organizations:ListAccounts',
            'organizations:ListOrganizationalUnitsForParent'
          ],
          resources: ['*']
        }),
        description: 'Organizations access for org-wide backup policies',
        complianceRequirement: 'Least privilege IAM access for Organizations integration'
      });
    }

    return {
      iamPolicies,
      environmentVariables,
      securityGroupRules: []
    };
  }

  /**
   * Get Backup vault actions based on access level
   * Used by resolveActions to compute base actions from coarse access level
   * 
   * @param access - Access level (read, write, readwrite, admin)
   * @returns Array of IAM action strings
   */
  private getBackupVaultActionsForAccess(access: string): string[] {
    switch (access) {
      case 'read':
        return [
          'backup:DescribeBackupVault',
          'backup:ListBackupVaults',
          'backup:ListRecoveryPointsByBackupVault',
          'backup:GetRecoveryPointRestoreMetadata',
          'backup:GetBackupVaultAccessPolicy',
          'backup:GetBackupVaultNotifications'
        ];
      case 'write':
        return [
          'backup:CreateBackupVault',
          'backup:UpdateBackupVault',
          'backup:DeleteBackupVault',
          'backup:PutBackupVaultAccessPolicy',
          'backup:DeleteBackupVaultAccessPolicy',
          'backup:PutBackupVaultNotifications',
          'backup:DeleteBackupVaultNotifications',
          'backup:StartBackupJob',
          'backup:StartRestoreJob',
          'backup:StartCopyJob',
          'backup:StopBackupJob'
        ];
      case 'readwrite':
        return [
          'backup:DescribeBackupVault',
          'backup:ListBackupVaults',
          'backup:ListRecoveryPointsByBackupVault',
          'backup:GetRecoveryPointRestoreMetadata',
          'backup:GetBackupVaultAccessPolicy',
          'backup:GetBackupVaultNotifications',
          'backup:CreateBackupVault',
          'backup:UpdateBackupVault',
          'backup:DeleteBackupVault',
          'backup:PutBackupVaultAccessPolicy',
          'backup:DeleteBackupVaultAccessPolicy',
          'backup:PutBackupVaultNotifications',
          'backup:DeleteBackupVaultNotifications',
          'backup:StartBackupJob',
          'backup:StartRestoreJob',
          'backup:StartCopyJob',
          'backup:StopBackupJob'
        ];
      case 'admin':
        return [
          'backup:*'
        ];
      default:
        throw new Error(`Unsupported Backup vault access level: ${access}`);
    }
  }

  /**
   * Get Backup plan actions based on access level
   * Used by resolveActions to compute base actions from coarse access level
   * 
   * @param access - Access level (read, write, readwrite, admin)
   * @returns Array of IAM action strings
   */
  private getBackupPlanActionsForAccess(access: string): string[] {
    switch (access) {
      case 'read':
        return [
          'backup:GetBackupPlan',
          'backup:ListBackupPlans',
          'backup:DescribeBackupPlan',
          'backup:ListBackupSelections',
          'backup:GetBackupSelection',
          'backup:DescribeBackupJob',
          'backup:ListBackupJobs',
          'backup:GetBackupReportPlan',
          'backup:ListBackupReportPlans'
        ];
      case 'write':
        return [
          'backup:CreateBackupPlan',
          'backup:UpdateBackupPlan',
          'backup:DeleteBackupPlan',
          'backup:CreateBackupSelection',
          'backup:UpdateBackupSelection',
          'backup:DeleteBackupSelection',
          'backup:StartBackupJob',
          'backup:StartRestoreJob',
          'backup:CreateBackupReportPlan',
          'backup:UpdateBackupReportPlan',
          'backup:DeleteBackupReportPlan'
        ];
      case 'readwrite':
        return [
          'backup:GetBackupPlan',
          'backup:ListBackupPlans',
          'backup:DescribeBackupPlan',
          'backup:ListBackupSelections',
          'backup:GetBackupSelection',
          'backup:DescribeBackupJob',
          'backup:ListBackupJobs',
          'backup:GetBackupReportPlan',
          'backup:ListBackupReportPlans',
          'backup:CreateBackupPlan',
          'backup:UpdateBackupPlan',
          'backup:DeleteBackupPlan',
          'backup:CreateBackupSelection',
          'backup:UpdateBackupSelection',
          'backup:DeleteBackupSelection',
          'backup:StartBackupJob',
          'backup:StartRestoreJob',
          'backup:CreateBackupReportPlan',
          'backup:UpdateBackupReportPlan',
          'backup:DeleteBackupReportPlan'
        ];
      case 'admin':
        return [
          'backup:*'
        ];
      default:
        throw new Error(`Unsupported Backup plan access level: ${access}`);
    }
  }
}

