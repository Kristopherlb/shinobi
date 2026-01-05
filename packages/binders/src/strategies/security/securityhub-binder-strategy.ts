/**
 * SecurityHubBinderStrategy (Unified)
 * Handles Security Hub bindings with mandatory compliance enforcement
 * 
 * Multi-capability strategy supporting:
 * - security:securityhub-hub - Security Hub enablement and management
 * - security:securityhub-standard - Security standards (CIS, PCI DSS, NIST, etc.)
 */

import { UnifiedBinderStrategyBase, resolveActions } from '@shinobi/core';
import type { BindingContext, EnhancedBindingResult, CompatibilityEntry } from '@shinobi/core';
import type { IamPolicy } from '@shinobi/core';
import { PolicyStatement, Effect } from 'aws-cdk-lib/aws-iam';

export class SecurityHubBinderStrategy extends UnifiedBinderStrategyBase {
  readonly supportedCapabilities = [
    'security:securityhub-hub',
    'security:securityhub-standard'
  ];

  getStrategyName(): string {
    return 'SecurityHubBinderStrategy';
  }

  canHandle(sourceType: string, targetCapability: string): boolean {
    return this.supportedCapabilities.includes(targetCapability);
  }

  getCompatibilityMatrix(): CompatibilityEntry[] {
    return [
      {
        sourceType: '*',
        targetType: '*',
        capability: 'security:securityhub-hub',
        supportedAccess: ['read', 'write', 'admin'],
        description: 'Bind to Security Hub for centralized security findings and compliance',
        examples: ['lambda-security -> security:securityhub-hub (read)', 'lambda-governance -> security:securityhub-hub (admin)']
      },
      {
        sourceType: '*',
        targetType: '*',
        capability: 'security:securityhub-standard',
        supportedAccess: ['read', 'write', 'admin'],
        description: 'Bind to Security Hub standards for compliance monitoring (CIS, PCI DSS, NIST)',
        examples: ['lambda-compliance -> security:securityhub-standard (read)']
      }
    ];
  }

  protected async doBind(context: BindingContext): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    const { source, target, directive } = context;
    const { capability } = directive;

    // Validate inputs
    if (!target) {
      throw new Error('Target component is required for Security Hub binding');
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
      case 'security:securityhub-hub':
        return await this.bindToSecurityHubHub(context, targetCapabilityData);
      case 'security:securityhub-standard':
        return await this.bindToSecurityHubStandard(context, targetCapabilityData);
      default:
        throw new Error(`Unsupported Security Hub capability: ${capability}. Supported capabilities: ${this.supportedCapabilities.join(', ')}`);
    }
  }

  /**
   * Bind to security:securityhub-hub
   * 
   * @param context - Binding context
   * @param targetData - Expected structure:
   *   - hubArn (required): string - Security Hub ARN
   *   - aggregatorArn (optional): string - Cross-account aggregator ARN
   *   - insightArns (optional): string[] - List of insight ARNs
   *   - controlStatuses (optional): object - Control status mapping
   * @returns Enhanced binding result (without compliance block)
   */
  private async bindToSecurityHubHub(
    context: BindingContext,
    targetData: any
  ): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    const { directive } = context;
    const { access, options } = directive;

    if (!targetData?.hubArn) {
      throw new Error('Target component missing required hubArn property for security:securityhub-hub binding');
    }

    const iamPolicies: IamPolicy[] = [];
    const environmentVariables: Record<string, string> = {
      AWS_SECURITYHUB_HUB_ARN: targetData.hubArn
    };

    if (targetData.aggregatorArn) {
      environmentVariables.AWS_SECURITYHUB_AGGREGATOR_ARN = targetData.aggregatorArn;
    }

    if (targetData.insightArns && Array.isArray(targetData.insightArns)) {
      environmentVariables.AWS_SECURITYHUB_INSIGHT_ARNS = targetData.insightArns.join(',');
    }

    if (targetData.controlStatuses) {
      environmentVariables.AWS_SECURITYHUB_CONTROL_STATUSES = JSON.stringify(targetData.controlStatuses);
    }

    // Handle granular actions override or use multi-statement approach
    if (context.directive.actions) {
      const resolvedActions = resolveActions(
        context.directive,
        context,
        (acc: string) => this.getSecurityHubActionsForAccess(acc),
        'securityhub'
      );

      iamPolicies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: resolvedActions,
          resources: ['*']
        }),
        description: 'Security Hub access (granular actions)',
        complianceRequirement: 'Least privilege IAM access for Security Hub operations'
      });
    } else {
      // Coarse access levels: use multi-statement approach (backward compatible)
      // IAM policies for Security Hub operations
      if (access === 'read' || access === 'readwrite') {
        iamPolicies.push({
          statement: new PolicyStatement({
            effect: Effect.ALLOW,
            actions: [
              'securityhub:GetFindings',
              'securityhub:BatchGetFindings',
              'securityhub:ListFindings',
              'securityhub:DescribeHub',
              'securityhub:DescribeProducts',
              'securityhub:DescribeStandards',
              'securityhub:DescribeStandardsControls',
              'securityhub:GetEnabledStandards',
              'securityhub:GetInsights'
            ],
            resources: ['*']
          }),
          description: 'Security Hub read access',
          complianceRequirement: 'Least privilege IAM access for Security Hub read operations'
        });
      }

      if (access === 'write' || access === 'readwrite' || access === 'admin') {
        iamPolicies.push({
          statement: new PolicyStatement({
            effect: Effect.ALLOW,
            actions: [
              'securityhub:EnableSecurityHub',
              'securityhub:DisableSecurityHub',
              'securityhub:UpdateSecurityHubConfiguration',
              'securityhub:BatchUpdateFindings',
              'securityhub:BatchImportFindings',
              'securityhub:CreateInsight',
              'securityhub:UpdateInsight',
              'securityhub:DeleteInsight'
            ],
            resources: ['*']
          }),
          description: 'Security Hub write access',
          complianceRequirement: 'Least privilege IAM access for Security Hub write operations'
        });
      }
    }

    // Findings suppression support
    if (options?.enableFindingsSuppression || targetData.suppressionRules) {
      if (access === 'write' || access === 'readwrite' || access === 'admin') {
        iamPolicies.push({
          statement: new PolicyStatement({
            effect: Effect.ALLOW,
            actions: [
              'securityhub:BatchUpdateFindings',
              'securityhub:UpdateFindings',
              'securityhub:UpdateFindingAggregator'
            ],
            resources: ['*']
          }),
          description: 'Security Hub findings suppression access',
          complianceRequirement: 'Least privilege IAM access for findings suppression'
        });
      }
    }

    // Automation support (EventBridge rules, Lambda triggers)
    if (options?.enableAutomation) {
      iamPolicies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
            'events:PutRule',
            'events:PutTargets',
            'events:PutEvents',
            'lambda:InvokeFunction'
          ],
          resources: ['*']
        }),
        description: 'Security Hub automation access',
        complianceRequirement: 'Least privilege IAM access for Security Hub automation'
      });
      environmentVariables.AWS_SECURITYHUB_AUTOMATION_ENABLED = 'true';
    }

    // Delegated admin support
    if (options?.delegatedAdminAccountId) {
      iamPolicies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
            'securityhub:EnableOrganizationAdminAccount',
            'securityhub:DisableOrganizationAdminAccount',
            'securityhub:ListOrganizationAdminAccounts'
          ],
          resources: ['*']
        }),
        description: 'Security Hub delegated admin access',
        complianceRequirement: 'Least privilege IAM access for delegated admin operations'
      });
      environmentVariables.AWS_SECURITYHUB_DELEGATED_ADMIN_ACCOUNT_ID = options.delegatedAdminAccountId;
    }

    // Org-wide aggregator support
    if (options?.orgWideAggregator || targetData.aggregatorArn) {
      if (access === 'write' || access === 'readwrite' || access === 'admin') {
        iamPolicies.push({
          statement: new PolicyStatement({
            effect: Effect.ALLOW,
            actions: [
              'securityhub:CreateFindingAggregator',
              'securityhub:UpdateFindingAggregator',
              'securityhub:DeleteFindingAggregator',
              'securityhub:GetFindingAggregator'
            ],
            resources: ['*']
          }),
          description: 'Security Hub aggregator management access',
          complianceRequirement: 'Least privilege IAM access for aggregator management'
        });
      }
      environmentVariables.AWS_SECURITYHUB_ORG_WIDE_AGGREGATOR_ENABLED = 'true';
    }

    // Gate admin access behind explicit option
    if (access === 'admin' && options?.requireFullAdminAccess) {
      iamPolicies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ['securityhub:*'],
          resources: ['*']
        }),
        description: 'Security Hub admin access',
        complianceRequirement: 'Full Security Hub access for admin operations (explicitly requested)'
      });
    }

    return {
      iamPolicies,
      environmentVariables,
      securityGroupRules: []
    };
  }

  /**
   * Bind to security:securityhub-standard
   * 
   * @param context - Binding context
   * @param targetData - Expected structure:
   *   - hubArn (required): string - Security Hub ARN
   *   - enabledStandards (optional): string[] - List of enabled standard ARNs (e.g., CIS, PCI DSS, NIST)
   *   - aggregatorArn (optional): string - Cross-account aggregator ARN
   * @returns Enhanced binding result (without compliance block)
   */
  private async bindToSecurityHubStandard(
    context: BindingContext,
    targetData: any
  ): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    const { directive } = context;
    const { access } = directive;

    if (!targetData?.hubArn) {
      throw new Error('Target component missing required hubArn property for security:securityhub-standard binding');
    }

    const iamPolicies: IamPolicy[] = [];
    const environmentVariables: Record<string, string> = {
      AWS_SECURITYHUB_HUB_ARN: targetData.hubArn
    };

    if (targetData.enabledStandards && Array.isArray(targetData.enabledStandards)) {
      environmentVariables.AWS_SECURITYHUB_ENABLED_STANDARDS = targetData.enabledStandards.join(',');
    }

    if (targetData.aggregatorArn) {
      environmentVariables.AWS_SECURITYHUB_AGGREGATOR_ARN = targetData.aggregatorArn;
    }

    if (access === 'read' || access === 'readwrite') {
      iamPolicies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
            'securityhub:DescribeStandards',
            'securityhub:DescribeStandardsControls',
            'securityhub:GetEnabledStandards',
            'securityhub:DescribeProducts',
            'securityhub:GetFindings'
          ],
          resources: ['*']
        }),
        description: 'Security Hub standards read access',
        complianceRequirement: 'Least privilege IAM access for Security Hub standards read operations'
      });
    }

    if (access === 'write' || access === 'readwrite' || access === 'admin') {
      iamPolicies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
            'securityhub:BatchEnableStandards',
            'securityhub:BatchDisableStandards',
            'securityhub:UpdateStandardsControl'
          ],
          resources: ['*']
        }),
        description: 'Security Hub standards write access',
        complianceRequirement: 'Least privilege IAM access for Security Hub standards write operations'
      });
    }

    return {
      iamPolicies,
      environmentVariables,
      securityGroupRules: []
    };
  }

  /**
   * Get Security Hub actions based on access level
   * Used by resolveActions to compute base actions from coarse access level
   * 
   * @param access - Access level (read, write, admin, readwrite)
   * @returns Array of IAM action strings
   */
  private getSecurityHubActionsForAccess(access: string): string[] {
    switch (access) {
      case 'read':
        return [
          'securityhub:GetFindings',
          'securityhub:BatchGetFindings',
          'securityhub:ListFindings',
          'securityhub:DescribeHub',
          'securityhub:DescribeProducts',
          'securityhub:DescribeStandards',
          'securityhub:DescribeStandardsControls',
          'securityhub:GetEnabledStandards',
          'securityhub:GetInsights'
        ];
      case 'write':
        return [
          'securityhub:EnableSecurityHub',
          'securityhub:DisableSecurityHub',
          'securityhub:UpdateSecurityHubConfiguration',
          'securityhub:BatchUpdateFindings',
          'securityhub:BatchImportFindings',
          'securityhub:CreateInsight',
          'securityhub:UpdateInsight',
          'securityhub:DeleteInsight'
        ];
      case 'admin':
        return [
          'securityhub:EnableSecurityHub',
          'securityhub:DisableSecurityHub',
          'securityhub:UpdateSecurityHubConfiguration',
          'securityhub:BatchUpdateFindings',
          'securityhub:BatchImportFindings',
          'securityhub:CreateInsight',
          'securityhub:UpdateInsight',
          'securityhub:DeleteInsight',
          'securityhub:EnableOrganizationAdminAccount',
          'securityhub:DisableOrganizationAdminAccount'
        ];
      case 'readwrite':
        return [
          'securityhub:GetFindings',
          'securityhub:BatchGetFindings',
          'securityhub:ListFindings',
          'securityhub:DescribeHub',
          'securityhub:DescribeProducts',
          'securityhub:DescribeStandards',
          'securityhub:DescribeStandardsControls',
          'securityhub:GetEnabledStandards',
          'securityhub:GetInsights',
          'securityhub:EnableSecurityHub',
          'securityhub:DisableSecurityHub',
          'securityhub:UpdateSecurityHubConfiguration',
          'securityhub:BatchUpdateFindings',
          'securityhub:BatchImportFindings',
          'securityhub:CreateInsight',
          'securityhub:UpdateInsight',
          'securityhub:DeleteInsight'
        ];
      default:
        throw new Error(`Unsupported Security Hub access level: ${access}`);
    }
  }
}

