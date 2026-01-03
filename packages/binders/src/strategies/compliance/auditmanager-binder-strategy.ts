/**
 * AuditManagerBinderStrategy (Unified)
 * Handles Audit Manager bindings with mandatory compliance enforcement
 * 
 * Multi-capability strategy supporting:
 * - compliance:audit-manager-framework - Custom and managed frameworks (SOC 2, HIPAA, PCI DSS)
 * - compliance:audit-manager-assessment - Assessments with evidence collection
 */

import { UnifiedBinderStrategyBase } from '@shinobi/core';
import type { BindingContext, EnhancedBindingResult, CompatibilityEntry } from '@shinobi/core';
import type { IamPolicy } from '@shinobi/core';
import { PolicyStatement, Effect } from 'aws-cdk-lib/aws-iam';

export class AuditManagerBinderStrategy extends UnifiedBinderStrategyBase {
  readonly supportedCapabilities = [
    'compliance:audit-manager-framework',
    'compliance:audit-manager-assessment'
  ];

  getStrategyName(): string {
    return 'AuditManagerBinderStrategy';
  }

  canHandle(sourceType: string, targetCapability: string): boolean {
    return this.supportedCapabilities.includes(targetCapability);
  }

  getCompatibilityMatrix(): CompatibilityEntry[] {
    return [
      {
        sourceType: '*',
        targetType: '*',
        capability: 'compliance:audit-manager-framework',
        supportedAccess: ['read', 'write', 'admin'],
        description: 'Bind to Audit Manager frameworks for compliance monitoring (SOC 2, HIPAA, PCI DSS)',
        examples: ['lambda-compliance -> compliance:audit-manager-framework (read)', 'lambda-audit -> compliance:audit-manager-framework (write)']
      },
      {
        sourceType: '*',
        targetType: '*',
        capability: 'compliance:audit-manager-assessment',
        supportedAccess: ['read', 'write', 'admin'],
        description: 'Bind to Audit Manager assessments for evidence collection and reporting',
        examples: ['lambda-compliance -> compliance:audit-manager-assessment (read)', 'lambda-audit -> compliance:audit-manager-assessment (write)']
      }
    ];
  }

  protected async doBind(context: BindingContext): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    const { source, target, directive } = context;
    const { capability } = directive;

    // Validate inputs
    if (!target) {
      throw new Error('Target component is required for Audit Manager binding');
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
      case 'compliance:audit-manager-framework':
        return await this.bindToAuditManagerFramework(context, targetCapabilityData);
      case 'compliance:audit-manager-assessment':
        return await this.bindToAuditManagerAssessment(context, targetCapabilityData);
      default:
        throw new Error(`Unsupported Audit Manager capability: ${capability}. Supported capabilities: ${this.supportedCapabilities.join(', ')}`);
    }
  }

  /**
   * Bind to compliance:audit-manager-framework
   * 
   * @param context - Binding context
   * @param targetData - Expected structure:
   *   - frameworkArn (required): string - Framework ARN
   * @returns Enhanced binding result (without compliance block)
   */
  private async bindToAuditManagerFramework(
    context: BindingContext,
    targetData: any
  ): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    const { directive } = context;
    const { access, options } = directive;

    if (!targetData?.frameworkArn) {
      throw new Error('Target component missing required frameworkArn property for compliance:audit-manager-framework binding');
    }

    const iamPolicies: IamPolicy[] = [];
    const environmentVariables: Record<string, string> = {
      AWS_AUDIT_MANAGER_FRAMEWORK_ARN: targetData.frameworkArn
    };

    // IAM policies for Audit Manager framework operations
    if (access === 'read' || access === 'readwrite' || access === 'admin') {
      iamPolicies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
            'auditmanager:GetFramework',
            'auditmanager:ListFrameworks',
            'auditmanager:GetControl',
            'auditmanager:ListControls',
            'auditmanager:ListControlDomainInsights',
            'auditmanager:ListControlInsightsByControlDomain'
          ],
          resources: [targetData.frameworkArn]
        }),
        description: 'Audit Manager framework read access',
        complianceRequirement: 'Least privilege IAM access for Audit Manager framework read operations'
      });
    }

    if (access === 'write' || access === 'readwrite' || access === 'admin') {
      iamPolicies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
            'auditmanager:CreateFramework',
            'auditmanager:UpdateFramework',
            'auditmanager:DeleteFramework',
            'auditmanager:AssociateAssessmentReportEvidenceFolder',
            'auditmanager:DisassociateAssessmentReportEvidenceFolder'
          ],
          resources: [targetData.frameworkArn]
        }),
        description: 'Audit Manager framework write access',
        complianceRequirement: 'Least privilege IAM access for Audit Manager framework write operations'
      });
    }

    // Gate admin access behind explicit option
    if (access === 'admin' && options?.requireFullAdminAccess) {
      iamPolicies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ['auditmanager:*'],
          resources: ['*']
        }),
        description: 'Audit Manager admin access',
        complianceRequirement: 'Full Audit Manager access for admin operations (explicitly requested)'
      });
    }

    // Secure hooks support
    if (options?.requireSecureAccess) {
      // KMS encryption for framework data
      if (targetData.kmsKeyId) {
        iamPolicies.push({
          statement: new PolicyStatement({
            effect: Effect.ALLOW,
            actions: [
              'kms:Decrypt',
              'kms:DescribeKey',
              'kms:Encrypt',
              'kms:GenerateDataKey'
            ],
            resources: [targetData.kmsKeyId]
          }),
          description: 'Audit Manager KMS encryption access',
          complianceRequirement: 'Least privilege IAM access for KMS encryption'
        });
      }

      // S3 export for long-term storage
      if (targetData.s3ExportBucket) {
        iamPolicies.push({
          statement: new PolicyStatement({
            effect: Effect.ALLOW,
            actions: [
              's3:PutObject',
              's3:PutObjectAcl',
              's3:GetObject',
              's3:ListBucket'
            ],
            resources: [
              targetData.s3ExportBucket,
              `${targetData.s3ExportBucket}/*`
            ]
          }),
          description: 'Audit Manager S3 export access',
          complianceRequirement: 'Least privilege IAM access for S3 export'
        });
      }

      // Config integration for evidence automation
      iamPolicies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
            'config:GetResourceConfigHistory',
            'config:GetComplianceDetailsByResource',
            'config:DescribeConfigRules',
            'config:GetComplianceSummaryByConfigRule'
          ],
          resources: ['*']
        }),
        description: 'Audit Manager Config integration access',
        complianceRequirement: 'Least privilege IAM access for Config evidence automation'
      });

      environmentVariables.AWS_AUDIT_MANAGER_SECURE_ACCESS_ENABLED = 'true';
    }

    return {
      iamPolicies,
      environmentVariables,
      securityGroupRules: []
    };
  }

  /**
   * Bind to compliance:audit-manager-assessment
   * 
   * @param context - Binding context
   * @param targetData - Expected structure:
   *   - assessmentId (required): string - Assessment ID
   *   - frameworkArn (optional): string - Framework ARN
   *   - assessmentReportArn (optional): string - Assessment report ARN
   *   - assessmentReportUrl (optional): string - Assessment report URL
   *   - assessmentStatus (optional): string - Assessment status (ACTIVE, INACTIVE, etc.)
   *   - evidenceFolderArn (optional): string - Evidence folder ARN
   *   - controlId (optional): string - Control ID
   * @returns Enhanced binding result (without compliance block)
   */
  private async bindToAuditManagerAssessment(
    context: BindingContext,
    targetData: any
  ): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    const { directive } = context;
    const { access, options } = directive;

    if (!targetData?.assessmentId) {
      throw new Error('Target component missing required assessmentId property for compliance:audit-manager-assessment binding');
    }

    const iamPolicies: IamPolicy[] = [];
    const environmentVariables: Record<string, string> = {
      AWS_AUDIT_MANAGER_ASSESSMENT_ID: targetData.assessmentId
    };

    if (targetData.frameworkArn) {
      environmentVariables.AWS_AUDIT_MANAGER_FRAMEWORK_ARN = targetData.frameworkArn;
    }

    if (targetData.assessmentReportArn) {
      environmentVariables.AWS_AUDIT_MANAGER_ASSESSMENT_REPORT_ARN = targetData.assessmentReportArn;
    }

    if (targetData.assessmentReportUrl) {
      environmentVariables.AWS_AUDIT_MANAGER_ASSESSMENT_REPORT_URL = targetData.assessmentReportUrl;
    }

    if (targetData.assessmentStatus) {
      environmentVariables.AWS_AUDIT_MANAGER_ASSESSMENT_STATUS = targetData.assessmentStatus;
    }

    if (targetData.evidenceFolderArn) {
      environmentVariables.AWS_AUDIT_MANAGER_EVIDENCE_FOLDER_ARN = targetData.evidenceFolderArn;
    }

    if (targetData.controlId) {
      environmentVariables.AWS_AUDIT_MANAGER_CONTROL_ID = targetData.controlId;
    }

    // IAM policies for Audit Manager assessment operations
    if (access === 'read' || access === 'readwrite' || access === 'admin') {
      iamPolicies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
            'auditmanager:GetAssessment',
            'auditmanager:ListAssessments',
            'auditmanager:GetEvidence',
            'auditmanager:ListEvidence',
            'auditmanager:GetEvidenceByEvidenceFolder',
            'auditmanager:GetEvidenceFoldersByAssessment',
            'auditmanager:GetAssessmentReportUrl',
            'auditmanager:GetInsights',
            'auditmanager:GetInsightsByAssessment'
          ],
          resources: ['*']
        }),
        description: 'Audit Manager assessment read access',
        complianceRequirement: 'Least privilege IAM access for Audit Manager assessment read operations'
      });
    }

    if (access === 'write' || access === 'readwrite' || access === 'admin') {
      iamPolicies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
            'auditmanager:CreateAssessment',
            'auditmanager:UpdateAssessment',
            'auditmanager:DeleteAssessment',
            'auditmanager:CreateAssessmentReport',
            'auditmanager:UpdateAssessmentStatus',
            'auditmanager:BatchCreateDelegationByAssessment',
            'auditmanager:BatchDeleteDelegationByAssessment',
            'auditmanager:BatchImportEvidenceToAssessmentControl',
            'auditmanager:RegisterAccount',
            'auditmanager:RegisterOrganizationAdminAccount'
          ],
          resources: ['*']
        }),
        description: 'Audit Manager assessment write access',
        complianceRequirement: 'Least privilege IAM access for Audit Manager assessment write operations'
      });
    }

    // Delegated admin support
    if (options?.delegatedAdminAccountId) {
      iamPolicies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
            'auditmanager:RegisterOrganizationAdminAccount',
            'auditmanager:DeregisterOrganizationAdminAccount',
            'auditmanager:ListOrganizationAdminAccounts'
          ],
          resources: ['*']
        }),
        description: 'Audit Manager delegated admin access',
        complianceRequirement: 'Least privilege IAM access for delegated admin operations'
      });
      environmentVariables.AWS_AUDIT_MANAGER_DELEGATED_ADMIN_ACCOUNT_ID = options.delegatedAdminAccountId;
    }

    // Org-wide assessment enablement
    if (options?.orgWideEnablement) {
      iamPolicies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
            'auditmanager:RegisterAccount',
            'auditmanager:RegisterOrganizationAdminAccount',
            'auditmanager:CreateAssessment',
            'auditmanager:ListAssessments'
          ],
          resources: ['*']
        }),
        description: 'Audit Manager org-wide enablement access',
        complianceRequirement: 'Least privilege IAM access for org-wide assessment enablement'
      });
      environmentVariables.AWS_AUDIT_MANAGER_ORG_WIDE_ENABLED = 'true';
    }

    // Gate admin access behind explicit option
    if (access === 'admin' && options?.requireFullAdminAccess) {
      iamPolicies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ['auditmanager:*'],
          resources: ['*']
        }),
        description: 'Audit Manager admin access',
        complianceRequirement: 'Full Audit Manager access for admin operations (explicitly requested)'
      });
    }

    // Secure hooks support
    if (options?.requireSecureAccess) {
      // KMS encryption for assessment data (from targetData or options)
      const kmsKeyId = targetData.kmsKeyId || options.kmsKeyId;
      if (kmsKeyId) {
        iamPolicies.push({
          statement: new PolicyStatement({
            effect: Effect.ALLOW,
            actions: [
              'kms:Decrypt',
              'kms:DescribeKey',
              'kms:Encrypt',
              'kms:GenerateDataKey'
            ],
            resources: [kmsKeyId]
          }),
          description: 'Audit Manager KMS encryption access',
          complianceRequirement: 'Least privilege IAM access for KMS encryption'
        });
        environmentVariables.AWS_AUDIT_MANAGER_KMS_KEY_ID = kmsKeyId;
      }

      // Findings export bucket (from targetData or options)
      const findingsExportBucket = targetData.findingsExportBucket || targetData.s3ExportBucket || options.findingsExportBucket;
      if (findingsExportBucket) {
        iamPolicies.push({
          statement: new PolicyStatement({
            effect: Effect.ALLOW,
            actions: [
              's3:PutObject',
              's3:PutObjectAcl',
              's3:GetObject',
              's3:ListBucket'
            ],
            resources: [
              findingsExportBucket,
              `${findingsExportBucket}/*`
            ]
          }),
          description: 'Audit Manager findings export S3 access',
          complianceRequirement: 'Least privilege IAM access for findings export'
        });
        environmentVariables.AWS_AUDIT_MANAGER_FINDINGS_EXPORT_BUCKET = findingsExportBucket;
      }

      // Security Hub integration for assessment findings
      iamPolicies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
            'securityhub:BatchImportFindings',
            'securityhub:BatchUpdateFindings',
            'securityhub:GetFindings',
            'securityhub:ListFindings'
          ],
          resources: ['*']
        }),
        description: 'Audit Manager Security Hub integration access',
        complianceRequirement: 'Least privilege IAM access for Security Hub findings integration'
      });
      environmentVariables.AWS_AUDIT_MANAGER_SECURITY_HUB_INTEGRATION_ENABLED = 'true';

      // Config integration for evidence automation
      iamPolicies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
            'config:GetResourceConfigHistory',
            'config:GetComplianceDetailsByResource',
            'config:DescribeConfigRules',
            'config:GetComplianceSummaryByConfigRule'
          ],
          resources: ['*']
        }),
        description: 'Audit Manager Config integration access',
        complianceRequirement: 'Least privilege IAM access for Config evidence automation'
      });
      environmentVariables.AWS_AUDIT_MANAGER_CONFIG_INTEGRATION_ENABLED = 'true';
      environmentVariables.AWS_AUDIT_MANAGER_EVIDENCE_AUTOMATION_ENABLED = 'true';

      environmentVariables.AWS_AUDIT_MANAGER_SECURE_ACCESS_ENABLED = 'true';
    }

    return {
      iamPolicies,
      environmentVariables,
      securityGroupRules: []
    };
  }
}

