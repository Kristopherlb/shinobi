/**
 * MacieBinderStrategy (Unified)
 * Handles security:macie-job bindings with mandatory compliance enforcement
 * 
 * Supports S3 discovery jobs for sensitive data classification, findings export,
 * and org-wide discovery patterns with delegated admin support.
 */

import { UnifiedBinderStrategyBase } from '@shinobi/core';
import type { BindingContext, EnhancedBindingResult, CompatibilityEntry } from '@shinobi/core';
import type { IamPolicy } from '@shinobi/core';
import { PolicyStatement, Effect } from 'aws-cdk-lib/aws-iam';

export class MacieBinderStrategy extends UnifiedBinderStrategyBase {
  readonly supportedCapabilities = ['security:macie-job'];

  getStrategyName(): string {
    return 'MacieBinderStrategy';
  }

  canHandle(sourceType: string, targetCapability: string): boolean {
    return this.supportedCapabilities.includes(targetCapability);
  }

  getCompatibilityMatrix(): CompatibilityEntry[] {
    return [
      {
        sourceType: '*',
        targetType: '*',
        capability: 'security:macie-job',
        supportedAccess: ['read', 'write', 'admin'],
        description: 'Bind to Macie for S3 discovery jobs, sensitive data classification, and findings export',
        examples: ['lambda-security -> security:macie-job (read)', 'lambda-governance -> security:macie-job (admin)']
      }
    ];
  }

  protected async doBind(context: BindingContext): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    const { source, target, directive } = context;
    const { capability } = directive;

    // Validate inputs
    if (!target) {
      throw new Error('Target component is required for security:macie-job binding');
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

    return await this.bindToMacieJob(context, targetCapabilityData);
  }

  /**
   * Bind to security:macie-job
   * 
   * @param context - Binding context
   * @param targetData - Expected structure:
   *   - jobId (required): string - Macie classification job ID
   *   - findingsBucket (optional): string - S3 bucket for findings export
   *   - s3BucketArn (optional): string - Target S3 bucket ARN for scanning
   *   - jobStatus (optional): string - Job status (RUNNING, COMPLETE, etc.)
   *   - customDataIdentifiers (optional): string[] - Custom data identifier names
   *   - managedDataIdentifiers (optional): string[] - Managed data identifier names
   *   - classificationExportFormat (optional): string - Export format (CSV, JSON)
   *   - classificationSchedule (optional): string - Classification schedule (cron expression)
   *   - findingStatistics (optional): object - Finding statistics (total, critical, high, medium, low)
   *   - findingSeverity (optional): string - Finding severity level (CRITICAL, HIGH, MEDIUM, LOW)
   * @returns Enhanced binding result (without compliance block)
   */
  private async bindToMacieJob(
    context: BindingContext,
    targetData: any
  ): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    const { directive } = context;
    const { access, options } = directive;

    if (!targetData?.jobId) {
      throw new Error('Target component missing required jobId property for security:macie-job binding');
    }

    const iamPolicies: IamPolicy[] = [];
    const environmentVariables: Record<string, string> = {
      AWS_MACIE_JOB_ID: targetData.jobId
    };

    if (targetData.findingsBucket) {
      environmentVariables.AWS_MACIE_FINDINGS_BUCKET = targetData.findingsBucket;
    }

    if (targetData.s3BucketArn) {
      environmentVariables.AWS_MACIE_S3_BUCKET_ARN = targetData.s3BucketArn;
    }

    if (targetData.jobStatus) {
      environmentVariables.AWS_MACIE_JOB_STATUS = targetData.jobStatus;
    }

    if (targetData.customDataIdentifiers && Array.isArray(targetData.customDataIdentifiers)) {
      environmentVariables.AWS_MACIE_CUSTOM_DATA_IDENTIFIERS = targetData.customDataIdentifiers.join(',');
    }

    if (targetData.managedDataIdentifiers && Array.isArray(targetData.managedDataIdentifiers)) {
      environmentVariables.AWS_MACIE_MANAGED_DATA_IDENTIFIERS = targetData.managedDataIdentifiers.join(',');
    }

    if (targetData.classificationExportFormat) {
      environmentVariables.AWS_MACIE_CLASSIFICATION_EXPORT_FORMAT = targetData.classificationExportFormat;
    }

    if (targetData.classificationSchedule) {
      environmentVariables.AWS_MACIE_CLASSIFICATION_SCHEDULE = targetData.classificationSchedule;
    }

    if (targetData.findingStatistics) {
      environmentVariables.AWS_MACIE_FINDING_STATISTICS = JSON.stringify(targetData.findingStatistics);
    }

    if (targetData.findingSeverity) {
      environmentVariables.AWS_MACIE_FINDING_SEVERITY = targetData.findingSeverity;
    }

    // IAM policies for Macie job operations
    if (access === 'read' || access === 'readwrite') {
      iamPolicies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
            'macie2:GetClassificationJob',
            'macie2:ListClassificationJobs',
            'macie2:GetFindings',
            'macie2:ListFindings',
            'macie2:DescribeBuckets',
            'macie2:GetSensitiveDataOccurrences'
          ],
          resources: ['*']
        }),
        description: 'Macie job read access',
        complianceRequirement: 'Least privilege IAM access for Macie read operations'
      });
    }

    if (access === 'write' || access === 'readwrite' || access === 'admin') {
      iamPolicies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
            'macie2:CreateClassificationJob',
            'macie2:UpdateClassificationJob',
            'macie2:UpdateFindings',
            'macie2:ArchiveFindings',
            'macie2:UnarchiveFindings'
          ],
          resources: ['*']
        }),
        description: 'Macie job write access',
        complianceRequirement: 'Least privilege IAM access for Macie write operations'
      });
    }

    // S3 access for bucket scanning
    if (targetData.s3BucketArn) {
      const bucketName = targetData.s3BucketArn.split(':').pop()?.split('/')[0];
      if (bucketName) {
        if (access === 'read' || access === 'readwrite') {
          iamPolicies.push({
            statement: new PolicyStatement({
              effect: Effect.ALLOW,
              actions: [
                's3:GetObject',
                's3:ListBucket'
              ],
              resources: [
                `arn:aws:s3:::${bucketName}`,
                `arn:aws:s3:::${bucketName}/*`
              ]
            }),
            description: 'S3 read access for Macie bucket scanning',
            complianceRequirement: 'Least privilege IAM access for Macie S3 scanning'
          });
        }
      }
    }

    // S3 access for findings export
    if (targetData.findingsBucket) {
      if (access === 'write' || access === 'readwrite' || access === 'admin') {
        iamPolicies.push({
          statement: new PolicyStatement({
            effect: Effect.ALLOW,
            actions: [
              's3:PutObject',
              's3:PutObjectAcl'
            ],
            resources: [`arn:aws:s3:::${targetData.findingsBucket}/*`]
          }),
          description: 'S3 write access for Macie findings export',
          complianceRequirement: 'Least privilege IAM access for exporting Macie findings'
        });
      }

      if (access === 'read' || access === 'readwrite') {
        iamPolicies.push({
          statement: new PolicyStatement({
            effect: Effect.ALLOW,
            actions: [
              's3:GetObject',
              's3:ListBucket'
            ],
            resources: [
              `arn:aws:s3:::${targetData.findingsBucket}`,
              `arn:aws:s3:::${targetData.findingsBucket}/*`
            ]
          }),
          description: 'S3 read access for Macie findings',
          complianceRequirement: 'Least privilege IAM access for reading Macie findings'
        });
      }
    }

    // Secure hooks: EventBridge/Security Hub integration
    if (options?.requireSecureAccess) {
      iamPolicies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
            'events:PutEvents',
            'events:PutRule',
            'events:PutTargets'
          ],
          resources: ['*']
        }),
        description: 'EventBridge integration for Macie findings alerts',
        complianceRequirement: 'Secure access: EventBridge integration for Macie findings'
      });
    }

    // Admin access (full Macie permissions)
    if (access === 'admin') {
      if (options?.requireFullAdminAccess) {
        iamPolicies.push({
          statement: new PolicyStatement({
            effect: Effect.ALLOW,
            actions: ['macie2:*'],
            resources: ['*']
          }),
          description: 'Full Macie admin access',
          complianceRequirement: 'Admin access: Full Macie permissions (requires requireFullAdminAccess option)'
        });
      }
    }

    // Org-wide patterns: Delegated admin support
    if (options?.delegatedAdminAccountId) {
      environmentVariables.AWS_MACIE_DELEGATED_ADMIN_ACCOUNT_ID = options.delegatedAdminAccountId;
      
      if (access === 'admin') {
        iamPolicies.push({
          statement: new PolicyStatement({
            effect: Effect.ALLOW,
            actions: [
              'macie2:EnableOrganizationAdminAccount',
              'macie2:DisableOrganizationAdminAccount',
              'macie2:ListOrganizationAdminAccounts'
            ],
            resources: ['*']
          }),
          description: 'Macie delegated admin operations',
          complianceRequirement: 'Org-wide: Delegated admin for Macie'
        });
      }
    }

    return {
      iamPolicies,
      environmentVariables,
      securityGroupRules: []
    };
  }
}

