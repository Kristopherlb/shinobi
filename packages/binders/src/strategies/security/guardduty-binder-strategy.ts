/**
 * GuardDutyBinderStrategy (Unified)
 * Handles GuardDuty bindings with mandatory compliance enforcement
 * 
 * Multi-capability strategy supporting:
 * - security:guardduty-detector - GuardDuty detector enablement and management
 * - security:guardduty-malware-protection - Malware protection for EBS volumes and S3
 */

import { UnifiedBinderStrategyBase, resolveActions } from '@shinobi/core';
import type { BindingContext, EnhancedBindingResult, CompatibilityEntry } from '@shinobi/core';
import type { IamPolicy } from '@shinobi/core';
import { PolicyStatement, Effect } from 'aws-cdk-lib/aws-iam';

export class GuardDutyBinderStrategy extends UnifiedBinderStrategyBase {
  readonly supportedCapabilities = [
    'security:guardduty-detector',
    'security:guardduty-malware-protection'
  ];

  getStrategyName(): string {
    return 'GuardDutyBinderStrategy';
  }

  canHandle(sourceType: string, targetCapability: string): boolean {
    return this.supportedCapabilities.includes(targetCapability);
  }

  getCompatibilityMatrix(): CompatibilityEntry[] {
    return [
      {
        sourceType: '*',
        targetType: '*',
        capability: 'security:guardduty-detector',
        supportedAccess: ['read', 'write', 'admin'],
        description: 'Bind to GuardDuty detector for threat detection and security monitoring',
        examples: ['lambda-security -> security:guardduty-detector (read)', 'lambda-governance -> security:guardduty-detector (admin)']
      },
      {
        sourceType: '*',
        targetType: '*',
        capability: 'security:guardduty-malware-protection',
        supportedAccess: ['read', 'write', 'admin'],
        description: 'Bind to GuardDuty malware protection for EBS volumes and S3',
        examples: ['lambda-security -> security:guardduty-malware-protection (read)']
      }
    ];
  }

  protected async doBind(context: BindingContext): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    const { source, target, directive } = context;
    const { capability } = directive;

    // Validate inputs
    if (!target) {
      throw new Error('Target component is required for GuardDuty binding');
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
      case 'security:guardduty-detector':
        return await this.bindToGuardDutyDetector(context, targetCapabilityData);
      case 'security:guardduty-malware-protection':
        return await this.bindToMalwareProtection(context, targetCapabilityData);
      default:
        throw new Error(`Unsupported GuardDuty capability: ${capability}. Supported capabilities: ${this.supportedCapabilities.join(', ')}`);
    }
  }

  /**
   * Bind to security:guardduty-detector
   * 
   * @param context - Binding context
   * @param targetData - Expected structure:
   *   - detectorId (required): string - GuardDuty detector ID
   *   - detectorArn (optional): string - GuardDuty detector ARN
   *   - status (optional): string - Detector status (enabled/disabled)
   *   - findingsBucket (optional): string - S3 bucket for findings export
   *   - findingTypes (optional): string[] - Finding types to filter (e.g., ["Recon:EC2/PortProbeUnprotectedPort"])
   *   - severityFilters (optional): object - Severity filter configuration
   * @returns Enhanced binding result (without compliance block)
   */
  private async bindToGuardDutyDetector(
    context: BindingContext,
    targetData: any
  ): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    const { directive } = context;
    const { access, options } = directive;

    if (!targetData?.detectorId) {
      throw new Error('Target component missing required detectorId property for security:guardduty-detector binding');
    }

    const iamPolicies: IamPolicy[] = [];
    const environmentVariables: Record<string, string> = {
      AWS_GUARDDUTY_DETECTOR_ID: targetData.detectorId
    };

    if (targetData.detectorArn) {
      environmentVariables.AWS_GUARDDUTY_DETECTOR_ARN = targetData.detectorArn;
    }

    if (targetData.status) {
      environmentVariables.AWS_GUARDDUTY_STATUS = targetData.status;
    }

    if (targetData.findingsBucket) {
      environmentVariables.AWS_GUARDDUTY_FINDINGS_BUCKET = targetData.findingsBucket;
    }

    if (targetData.findingTypes && Array.isArray(targetData.findingTypes)) {
      environmentVariables.AWS_GUARDDUTY_FINDING_TYPES = targetData.findingTypes.join(',');
    }

    // Handle granular actions override or use multi-statement approach
    if (context.directive.actions) {
      const resolvedActions = resolveActions(
        context.directive,
        context,
        (acc) => this.getGuardDutyActionsForAccess(acc),
        'guardduty'
      );

      iamPolicies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: resolvedActions,
          resources: [`arn:aws:guardduty:*:*:detector/${targetData.detectorId}`]
        }),
        description: 'GuardDuty detector access (granular actions)',
        complianceRequirement: 'Least privilege IAM access for GuardDuty operations'
      });
    } else {
      // Coarse access levels: use multi-statement approach (backward compatible)
      // IAM policies for GuardDuty detector operations
      if (access === 'read' || access === 'readwrite') {
        iamPolicies.push({
          statement: new PolicyStatement({
            effect: Effect.ALLOW,
            actions: [
              'guardduty:GetDetector',
              'guardduty:ListDetectors',
              'guardduty:ListFindings',
              'guardduty:GetFindings',
              'guardduty:DescribeOrganizationConfiguration',
              'guardduty:ListMembers'
            ],
            resources: [`arn:aws:guardduty:*:*:detector/${targetData.detectorId}`]
          }),
          description: 'GuardDuty detector read access',
          complianceRequirement: 'Least privilege IAM access for GuardDuty read operations'
        });
      }

      if (access === 'write' || access === 'readwrite' || access === 'admin') {
        iamPolicies.push({
          statement: new PolicyStatement({
            effect: Effect.ALLOW,
            actions: [
              'guardduty:CreateDetector',
              'guardduty:UpdateDetector',
              'guardduty:DeleteDetector',
              'guardduty:UpdateOrganizationConfiguration',
              'guardduty:CreateMembers',
              'guardduty:InviteMembers',
              'guardduty:DisassociateMembers',
              'guardduty:DeleteMembers',
              'guardduty:ArchiveFindings',
              'guardduty:UnarchiveFindings'
            ],
            resources: [`arn:aws:guardduty:*:*:detector/${targetData.detectorId}`]
          }),
          description: 'GuardDuty detector write access',
          complianceRequirement: 'Least privilege IAM access for GuardDuty write operations'
        });
      }
    }

    // S3 access for findings export
    if (targetData.findingsBucket) {
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
          description: 'S3 read access for GuardDuty findings export',
          complianceRequirement: 'Least privilege IAM access for reading GuardDuty findings'
        });
      }

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
          description: 'S3 write access for GuardDuty findings export',
          complianceRequirement: 'Least privilege IAM access for exporting GuardDuty findings'
        });
      }
    }

    // EventBridge integration for findings
    if (options?.enableEventBridgeIntegration) {
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
        description: 'EventBridge integration for GuardDuty findings',
        complianceRequirement: 'Least privilege IAM access for EventBridge integration'
      });
      environmentVariables.AWS_GUARDDUTY_EVENTBRIDGE_ENABLED = 'true';
    }

    // Delegated admin support
    if (options?.delegatedAdminAccountId) {
      iamPolicies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
            'guardduty:EnableOrganizationAdminAccount',
            'guardduty:DisableOrganizationAdminAccount',
            'guardduty:ListOrganizationAdminAccounts'
          ],
          resources: ['*']
        }),
        description: 'GuardDuty delegated admin access',
        complianceRequirement: 'Least privilege IAM access for delegated admin operations'
      });
      environmentVariables.AWS_GUARDDUTY_DELEGATED_ADMIN_ACCOUNT_ID = options.delegatedAdminAccountId;
    }

    // Org-wide enablement support
    if (options?.orgWideEnablement) {
      iamPolicies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
            'guardduty:CreateMembers',
            'guardduty:InviteMembers',
            'guardduty:CreateDetector'
          ],
          resources: ['*']
        }),
        description: 'GuardDuty org-wide enablement access',
        complianceRequirement: 'Least privilege IAM access for org-wide enablement'
      });
      environmentVariables.AWS_GUARDDUTY_ORG_WIDE_ENABLED = 'true';
    }

    // Finding filters support
    if (targetData.findingTypes || targetData.severityFilters || options?.manageFindingFilters) {
      if (access === 'write' || access === 'readwrite' || access === 'admin') {
        iamPolicies.push({
          statement: new PolicyStatement({
            effect: Effect.ALLOW,
            actions: [
              'guardduty:CreateFilter',
              'guardduty:UpdateFilter',
              'guardduty:DeleteFilter',
              'guardduty:GetFilter',
              'guardduty:ListFilters'
            ],
            resources: [`arn:aws:guardduty:*:*:detector/${targetData.detectorId}`]
          }),
          description: 'GuardDuty finding filter management access',
          complianceRequirement: 'Least privilege IAM access for finding filter management'
        });
      }
    }

    // Gate admin access behind explicit option
    if (access === 'admin' && options?.requireFullAdminAccess) {
      iamPolicies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ['guardduty:*'],
          resources: ['*']
        }),
        description: 'GuardDuty admin access',
        complianceRequirement: 'Full GuardDuty access for admin operations (explicitly requested)'
      });
    }

    return {
      iamPolicies,
      environmentVariables,
      securityGroupRules: []
    };
  }

  /**
   * Bind to security:guardduty-malware-protection
   * 
   * @param context - Binding context
   * @param targetData - Expected structure:
   *   - detectorId (required): string - GuardDuty detector ID
   *   - detectorArn (optional): string - GuardDuty detector ARN
   *   - ebsVolumeProtectionEnabled (optional): boolean - EBS volume protection status
   *   - s3ProtectionEnabled (optional): boolean - S3 protection status
   * @returns Enhanced binding result (without compliance block)
   */
  private async bindToMalwareProtection(
    context: BindingContext,
    targetData: any
  ): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    const { directive } = context;
    const { access } = directive;

    if (!targetData?.detectorId) {
      throw new Error('Target component missing required detectorId property for security:guardduty-malware-protection binding');
    }

    const iamPolicies: IamPolicy[] = [];
    const environmentVariables: Record<string, string> = {
      AWS_GUARDDUTY_DETECTOR_ID: targetData.detectorId
    };

    if (targetData.detectorArn) {
      environmentVariables.AWS_GUARDDUTY_DETECTOR_ARN = targetData.detectorArn;
    }

    if (access === 'read' || access === 'readwrite') {
      iamPolicies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
            'guardduty:GetMalwareScanSettings',
            'guardduty:GetDetector'
          ],
          resources: [`arn:aws:guardduty:*:*:detector/${targetData.detectorId}`]
        }),
        description: 'GuardDuty malware protection read access',
        complianceRequirement: 'Least privilege IAM access for malware protection read operations'
      });
    }

    if (access === 'write' || access === 'readwrite' || access === 'admin') {
      iamPolicies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
            'guardduty:UpdateMalwareScanSettings',
            'guardduty:UpdateDetector'
          ],
          resources: [`arn:aws:guardduty:*:*:detector/${targetData.detectorId}`]
        }),
        description: 'GuardDuty malware protection write access',
        complianceRequirement: 'Least privilege IAM access for malware protection write operations'
      });
    }

    return {
      iamPolicies,
      environmentVariables,
      securityGroupRules: []
    };
  }

  /**
   * Get GuardDuty actions based on access level
   * Used by resolveActions to compute base actions from coarse access level
   */
  private getGuardDutyActionsForAccess(access: string): string[] {
    switch (access) {
      case 'read':
      case 'readwrite':
        return [
          'guardduty:GetDetector',
          'guardduty:ListDetectors',
          'guardduty:ListFindings',
          'guardduty:GetFindings',
          'guardduty:DescribeOrganizationConfiguration',
          'guardduty:ListMembers'
        ];
      case 'write':
      case 'admin':
        return [
          'guardduty:CreateDetector',
          'guardduty:UpdateDetector',
          'guardduty:DeleteDetector',
          'guardduty:UpdateOrganizationConfiguration',
          'guardduty:CreateMembers',
          'guardduty:InviteMembers',
          'guardduty:DisassociateMembers',
          'guardduty:DeleteMembers',
          'guardduty:ArchiveFindings',
          'guardduty:UnarchiveFindings'
        ];
      default:
        throw new Error(`Unsupported GuardDuty access level: ${access}`);
    }
  }
}

