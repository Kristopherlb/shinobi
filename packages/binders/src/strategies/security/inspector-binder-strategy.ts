/**
 * InspectorBinderStrategy (Unified)
 * Handles security:inspector-scan bindings with mandatory compliance enforcement
 * 
 * Supports ECR image scanning, EC2 instance scanning, Lambda function scanning,
 * and findings export with org-wide delegated admin support.
 */

import { UnifiedBinderStrategyBase, resolveActions } from '@shinobi/core';
import type { BindingContext, EnhancedBindingResult, CompatibilityEntry } from '@shinobi/core';
import type { IamPolicy } from '@shinobi/core';
import { PolicyStatement, Effect } from 'aws-cdk-lib/aws-iam';

export class InspectorBinderStrategy extends UnifiedBinderStrategyBase {
  readonly supportedCapabilities = ['security:inspector-scan'];

  getStrategyName(): string {
    return 'InspectorBinderStrategy';
  }

  canHandle(sourceType: string, targetCapability: string): boolean {
    return this.supportedCapabilities.includes(targetCapability);
  }

  getCompatibilityMatrix(): CompatibilityEntry[] {
    return [
      {
        sourceType: '*',
        targetType: '*',
        capability: 'security:inspector-scan',
        supportedAccess: ['read', 'write', 'admin'],
        description: 'Bind to Inspector for ECR/EC2/Lambda vulnerability scanning and findings export',
        examples: ['lambda-security -> security:inspector-scan (read)', 'lambda-governance -> security:inspector-scan (admin)']
      }
    ];
  }

  protected async doBind(context: BindingContext): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    const { source, target, directive } = context;
    const { capability } = directive;

    // Validate inputs
    if (!target) {
      throw new Error('Target component is required for security:inspector-scan binding');
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

    return await this.bindToInspectorScan(context, targetCapabilityData);
  }

  /**
   * Bind to security:inspector-scan
   * 
   * @param context - Binding context
   * @param targetData - Expected structure:
   *   - scanArn (required): string - Inspector scan ARN
   *   - findingsBucket (optional): string - S3 bucket for findings export
   *   - scanTargetArn (optional): string - Target resource ARN (EC2 instance, Lambda function, ECR repository)
   *   - scanType (optional): string - Scan type (EC2, ECR, LAMBDA)
   *   - scanStatus (optional): string - Scan status (IN_PROGRESS, COMPLETED, etc.)
   *   - scanFilter (optional): object - Scan filter configuration
   *   - scanSchedule (optional): string - Scan schedule (cron expression)
   *   - findingSeverity (optional): string - Finding severity level (CRITICAL, HIGH, MEDIUM, LOW, INFORMATIONAL)
   *   - findingCount (optional): number - Total number of findings
   * @returns Enhanced binding result (without compliance block)
   */
  private async bindToInspectorScan(
    context: BindingContext,
    targetData: any
  ): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    const { directive } = context;
    const { access, options } = directive;

    if (!targetData?.scanArn) {
      throw new Error('Target component missing required scanArn property for security:inspector-scan binding');
    }

    const iamPolicies: IamPolicy[] = [];
    const environmentVariables: Record<string, string> = {
      AWS_INSPECTOR_SCAN_ARN: targetData.scanArn
    };

    if (targetData.findingsBucket) {
      environmentVariables.AWS_INSPECTOR_FINDINGS_BUCKET = targetData.findingsBucket;
    }

    if (targetData.scanTargetArn) {
      environmentVariables.AWS_INSPECTOR_SCAN_TARGET_ARN = targetData.scanTargetArn;
    }

    if (targetData.scanType) {
      environmentVariables.AWS_INSPECTOR_SCAN_TYPE = targetData.scanType;
    }

    if (targetData.scanStatus) {
      environmentVariables.AWS_INSPECTOR_SCAN_STATUS = targetData.scanStatus;
    }

    if (targetData.scanFilter) {
      environmentVariables.AWS_INSPECTOR_SCAN_FILTER = JSON.stringify(targetData.scanFilter);
    }

    if (targetData.scanSchedule) {
      environmentVariables.AWS_INSPECTOR_SCAN_SCHEDULE = targetData.scanSchedule;
    }

    if (targetData.findingSeverity) {
      environmentVariables.AWS_INSPECTOR_FINDING_SEVERITY = targetData.findingSeverity;
    }

    if (targetData.findingCount !== undefined) {
      environmentVariables.AWS_INSPECTOR_FINDING_COUNT = String(targetData.findingCount);
    }

    // Handle granular actions override or use multi-statement approach
    if (context.directive.actions) {
      const resolvedActions = resolveActions(
        context.directive,
        context,
        (acc) => this.getInspectorActionsForAccess(acc),
        'inspector2'
      );

      iamPolicies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: resolvedActions,
          resources: ['*']
        }),
        description: 'Inspector scan access (granular actions)',
        complianceRequirement: 'Least privilege IAM access for Inspector operations'
      });
    } else {
      // Coarse access levels: use multi-statement approach (backward compatible)
      // IAM policies for Inspector scan operations
      if (access === 'read' || access === 'readwrite') {
        iamPolicies.push({
          statement: new PolicyStatement({
            effect: Effect.ALLOW,
            actions: [
              'inspector2:GetFindings',
              'inspector2:ListFindings',
              'inspector2:GetScan',
              'inspector2:ListScans',
              'inspector2:DescribeFindings',
              'inspector2:GetFindingsReportStatus'
            ],
            resources: ['*']
          }),
          description: 'Inspector scan read access',
          complianceRequirement: 'Least privilege IAM access for Inspector read operations'
        });
      }

      if (access === 'write' || access === 'readwrite' || access === 'admin') {
        iamPolicies.push({
          statement: new PolicyStatement({
            effect: Effect.ALLOW,
            actions: [
              'inspector2:StartScan',
              'inspector2:StopScan',
              'inspector2:UpdateFilter',
              'inspector2:CreateFilter',
              'inspector2:DeleteFilter',
              'inspector2:UpdateFindings',
              'inspector2:BatchGetAccountStatus',
              'inspector2:BatchGetCodeSnippet'
            ],
            resources: ['*']
          }),
          description: 'Inspector scan write access',
          complianceRequirement: 'Least privilege IAM access for Inspector write operations'
        });
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
          description: 'S3 write access for Inspector findings export',
          complianceRequirement: 'Least privilege IAM access for exporting Inspector findings'
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
          description: 'S3 read access for Inspector findings',
          complianceRequirement: 'Least privilege IAM access for reading Inspector findings'
        });
      }
    }

    // Secure hooks: Auto-remediation via Lambda triggers
    if (options?.requireSecureAccess) {
      iamPolicies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
            'lambda:InvokeFunction',
            'events:PutEvents',
            'events:PutRule',
            'events:PutTargets'
          ],
          resources: ['*']
        }),
        description: 'Auto-remediation integration for Inspector findings',
        complianceRequirement: 'Secure access: Auto-remediation for Inspector findings'
      });
    }

    // Secure hooks: Security Hub integration
    if (options?.requireSecureAccess) {
      iamPolicies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
            'securityhub:BatchImportFindings',
            'securityhub:BatchUpdateFindings'
          ],
          resources: ['*']
        }),
        description: 'Security Hub integration for Inspector findings',
        complianceRequirement: 'Secure access: Security Hub integration for Inspector findings'
      });
    }

    // Admin access (full Inspector permissions)
    if (access === 'admin') {
      if (options?.requireFullAdminAccess) {
        iamPolicies.push({
          statement: new PolicyStatement({
            effect: Effect.ALLOW,
            actions: ['inspector2:*'],
            resources: ['*']
          }),
          description: 'Full Inspector admin access',
          complianceRequirement: 'Admin access: Full Inspector permissions (requires requireFullAdminAccess option)'
        });
      }
    }

    // Org-wide patterns: Delegated admin support
    if (options?.delegatedAdminAccountId) {
      environmentVariables.AWS_INSPECTOR_DELEGATED_ADMIN_ACCOUNT_ID = options.delegatedAdminAccountId;
      
      if (access === 'admin') {
        iamPolicies.push({
          statement: new PolicyStatement({
            effect: Effect.ALLOW,
            actions: [
              'inspector2:EnableDelegatedAdminAccount',
              'inspector2:DisableDelegatedAdminAccount',
              'inspector2:ListDelegatedAdminAccounts'
            ],
            resources: ['*']
          }),
          description: 'Inspector delegated admin operations',
          complianceRequirement: 'Org-wide: Delegated admin for Inspector'
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
   * Get Inspector actions based on access level
   * Used by resolveActions to compute base actions from coarse access level
   */
  private getInspectorActionsForAccess(access: string): string[] {
    switch (access) {
      case 'read':
      case 'readwrite':
        return [
          'inspector2:GetFindings',
          'inspector2:ListFindings',
          'inspector2:GetScan',
          'inspector2:ListScans',
          'inspector2:DescribeFindings',
          'inspector2:GetFindingsReportStatus'
        ];
      case 'write':
      case 'admin':
        return [
          'inspector2:StartScan',
          'inspector2:StopScan',
          'inspector2:UpdateFilter',
          'inspector2:CreateFilter',
          'inspector2:DeleteFilter',
          'inspector2:UpdateFindings',
          'inspector2:BatchGetAccountStatus',
          'inspector2:BatchGetCodeSnippet'
        ];
      default:
        throw new Error(`Unsupported Inspector access level: ${access}`);
    }
  }
}

