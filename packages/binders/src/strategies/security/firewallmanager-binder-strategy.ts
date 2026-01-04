/**
 * FirewallManagerBinderStrategy (Unified)
 * Handles Firewall Manager bindings with mandatory compliance enforcement
 * 
 * Multi-capability strategy supporting:
 * - security:firewall-manager-policy - Firewall Manager policy creation (WAF, Shield Advanced, VPC security groups)
 * - security:waf-rule - WAF rule groups and web ACLs
 */

import { UnifiedBinderStrategyBase, resolveActions } from '@shinobi/core';
import type { BindingContext, EnhancedBindingResult, CompatibilityEntry } from '@shinobi/core';
import type { IamPolicy } from '@shinobi/core';
import { PolicyStatement, Effect } from 'aws-cdk-lib/aws-iam';

export class FirewallManagerBinderStrategy extends UnifiedBinderStrategyBase {
  readonly supportedCapabilities = [
    'security:firewall-manager-policy',
    'security:waf-rule'
  ];

  getStrategyName(): string {
    return 'FirewallManagerBinderStrategy';
  }

  canHandle(sourceType: string, targetCapability: string): boolean {
    return this.supportedCapabilities.includes(targetCapability);
  }

  getCompatibilityMatrix(): CompatibilityEntry[] {
    return [
      {
        sourceType: '*',
        targetType: '*',
        capability: 'security:firewall-manager-policy',
        supportedAccess: ['read', 'write', 'admin'],
        description: 'Bind to Firewall Manager for policy creation (WAF, Shield Advanced, VPC security groups)',
        examples: ['lambda-security -> security:firewall-manager-policy (read)', 'lambda-governance -> security:firewall-manager-policy (admin)']
      },
      {
        sourceType: '*',
        targetType: '*',
        capability: 'security:waf-rule',
        supportedAccess: ['read', 'write', 'admin'],
        description: 'Bind to WAF rule groups and web ACLs via Firewall Manager',
        examples: ['lambda-security -> security:waf-rule (read)']
      }
    ];
  }

  protected async doBind(context: BindingContext): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    const { source, target, directive } = context;
    const { capability } = directive;

    // Validate inputs
    if (!target) {
      throw new Error('Target component is required for Firewall Manager binding');
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
      case 'security:firewall-manager-policy':
        return await this.bindToFirewallManagerPolicy(context, targetCapabilityData);
      case 'security:waf-rule':
        return await this.bindToWafRule(context, targetCapabilityData);
      default:
        throw new Error(`Unsupported Firewall Manager capability: ${capability}. Supported capabilities: ${this.supportedCapabilities.join(', ')}`);
    }
  }

  /**
   * Bind to security:firewall-manager-policy
   * 
   * @param context - Binding context
   * @param targetData - Expected structure:
   *   - policyArn (required): string - Firewall Manager policy ARN
   *   - policyId (optional): string - Firewall Manager policy ID
   *   - policyStatus (optional): string - Policy status (ACTIVE, OUT_OF_ADMIN_SCOPE, etc.)
   *   - coverageStatus (optional): string - Coverage status (compliant/non-compliant)
   *   - policyType (optional): string - Policy type (WAF, SHIELD_ADVANCED, SECURITY_GROUP)
   *   - complianceDetail (optional): object - Compliance detail with remediation information
   *   - remediationEnabled (optional): boolean - Whether remediation is enabled
   * @returns Enhanced binding result (without compliance block)
   */
  private async bindToFirewallManagerPolicy(
    context: BindingContext,
    targetData: any
  ): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    const { directive } = context;
    const { access, options } = directive;

    if (!targetData?.policyArn) {
      throw new Error('Target component missing required policyArn property for security:firewall-manager-policy binding');
    }

    const iamPolicies: IamPolicy[] = [];
    const environmentVariables: Record<string, string> = {
      AWS_FIREWALL_MANAGER_POLICY_ARN: targetData.policyArn
    };

    if (targetData.policyId) {
      environmentVariables.AWS_FIREWALL_MANAGER_POLICY_ID = targetData.policyId;
    }

    if (targetData.policyStatus) {
      environmentVariables.AWS_FIREWALL_MANAGER_POLICY_STATUS = targetData.policyStatus;
    }

    if (targetData.coverageStatus) {
      environmentVariables.AWS_FIREWALL_MANAGER_COVERAGE_STATUS = targetData.coverageStatus;
    }

    if (targetData.policyType) {
      environmentVariables.AWS_FIREWALL_MANAGER_POLICY_TYPE = targetData.policyType;
    }

    if (targetData.complianceDetail) {
      environmentVariables.AWS_FIREWALL_MANAGER_COMPLIANCE_DETAIL = JSON.stringify(targetData.complianceDetail);
    }

    if (targetData.remediationEnabled !== undefined) {
      environmentVariables.AWS_FIREWALL_MANAGER_REMEDIATION_ENABLED = String(targetData.remediationEnabled);
    }

    // Handle granular actions override or use multi-statement approach
    if (context.directive.actions) {
      const resolvedActions = resolveActions(
        context.directive,
        context,
        (acc) => this.getFirewallManagerActionsForAccess(acc, options),
        'fms'
      );

      iamPolicies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: resolvedActions,
          resources: ['*']
        }),
        description: 'Firewall Manager access (granular actions)',
        complianceRequirement: 'Least privilege IAM access for Firewall Manager operations'
      });
    } else {
      // Coarse access levels: use multi-statement approach (backward compatible)
      // IAM policies for Firewall Manager operations
      if (access === 'read' || access === 'readwrite') {
        iamPolicies.push({
          statement: new PolicyStatement({
            effect: Effect.ALLOW,
            actions: [
              'fms:GetPolicy',
              'fms:ListPolicies',
              'fms:GetComplianceDetail',
              'fms:ListComplianceStatus',
              'fms:GetProtectionStatus'
            ],
            resources: ['*']
          }),
          description: 'Firewall Manager policy read access',
          complianceRequirement: 'Least privilege IAM access for Firewall Manager read operations'
        });
      }

      if (access === 'write' || access === 'readwrite' || access === 'admin') {
        iamPolicies.push({
          statement: new PolicyStatement({
            effect: Effect.ALLOW,
            actions: [
              'fms:PutPolicy',
              'fms:DeletePolicy',
              'fms:AssociateAdminAccount',
              'fms:DisassociateAdminAccount'
            ],
            resources: ['*']
          }),
          description: 'Firewall Manager policy write access',
          complianceRequirement: 'Least privilege IAM access for Firewall Manager write operations'
        });
      }

      // Admin access (full FMS permissions)
      if (access === 'admin') {
        if (options?.requireFullAdminAccess) {
          iamPolicies.push({
            statement: new PolicyStatement({
              effect: Effect.ALLOW,
              actions: ['fms:*'],
              resources: ['*']
            }),
            description: 'Full Firewall Manager admin access',
            complianceRequirement: 'Admin access: Full Firewall Manager permissions (requires requireFullAdminAccess option)'
          });
        }
      }
    }

    // Org-wide patterns: Admin account delegation
    if (options?.delegatedAdminAccountId) {
      environmentVariables.AWS_FIREWALL_MANAGER_DELEGATED_ADMIN_ACCOUNT_ID = options.delegatedAdminAccountId;
      
      if (access === 'admin') {
        iamPolicies.push({
          statement: new PolicyStatement({
            effect: Effect.ALLOW,
            actions: [
              'fms:AssociateAdminAccount',
              'fms:DisassociateAdminAccount',
              'fms:GetAdminAccount'
            ],
            resources: ['*']
          }),
          description: 'Firewall Manager delegated admin operations',
          complianceRequirement: 'Org-wide: Delegated admin for Firewall Manager'
        });
      }
    }

    // Secure hooks: CloudWatch Logs integration
    if (options?.requireSecureAccess) {
      iamPolicies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
            'logs:CreateLogGroup',
            'logs:CreateLogStream',
            'logs:PutLogEvents'
          ],
          resources: ['*']
        }),
        description: 'CloudWatch Logs integration for Firewall Manager',
        complianceRequirement: 'Secure access: CloudWatch Logs integration for Firewall Manager'
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
        description: 'Security Hub integration for Firewall Manager',
        complianceRequirement: 'Secure access: Security Hub integration for Firewall Manager'
      });
    }

    return {
      iamPolicies,
      environmentVariables,
      securityGroupRules: []
    };
  }

  /**
   * Bind to security:waf-rule
   * 
   * @param context - Binding context
   * @param targetData - Expected structure:
   *   - webAclArn (required): string - WAF web ACL ARN
   *   - ruleGroupArn (optional): string - WAF rule group ARN
   *   - scope (optional): string - WAF scope (CLOUDFRONT, REGIONAL)
   * @returns Enhanced binding result (without compliance block)
   */
  private async bindToWafRule(
    context: BindingContext,
    targetData: any
  ): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    const { directive } = context;
    const { access, options } = directive;

    if (!targetData?.webAclArn) {
      throw new Error('Target component missing required webAclArn property for security:waf-rule binding');
    }

    const iamPolicies: IamPolicy[] = [];
    const environmentVariables: Record<string, string> = {
      AWS_WAF_WEB_ACL_ARN: targetData.webAclArn
    };

    if (targetData.ruleGroupArn) {
      environmentVariables.AWS_WAF_RULE_GROUP_ARN = targetData.ruleGroupArn;
    }

    if (targetData.scope) {
      environmentVariables.AWS_WAF_SCOPE = targetData.scope;
    }

    // IAM policies for WAF operations
    if (access === 'read' || access === 'readwrite') {
      iamPolicies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
            'wafv2:GetWebACL',
            'wafv2:ListWebACLs',
            'wafv2:GetRuleGroup',
            'wafv2:ListRuleGroups',
            'wafv2:GetLoggingConfiguration'
          ],
          resources: ['*']
        }),
        description: 'WAF rule read access',
        complianceRequirement: 'Least privilege IAM access for WAF read operations'
      });
    }

    if (access === 'write' || access === 'readwrite' || access === 'admin') {
      iamPolicies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
            'wafv2:UpdateWebACL',
            'wafv2:CreateWebACL',
            'wafv2:DeleteWebACL',
            'wafv2:CreateRuleGroup',
            'wafv2:UpdateRuleGroup',
            'wafv2:DeleteRuleGroup',
            'wafv2:PutLoggingConfiguration',
            'wafv2:DeleteLoggingConfiguration'
          ],
          resources: ['*']
        }),
        description: 'WAF rule write access',
        complianceRequirement: 'Least privilege IAM access for WAF write operations'
      });
    }

    // Admin access (full WAF permissions)
    if (access === 'admin') {
      if (options?.requireFullAdminAccess) {
        iamPolicies.push({
          statement: new PolicyStatement({
            effect: Effect.ALLOW,
            actions: ['wafv2:*'],
            resources: ['*']
          }),
          description: 'Full WAF admin access',
          complianceRequirement: 'Admin access: Full WAF permissions (requires requireFullAdminAccess option)'
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
   * Get Firewall Manager actions based on access level
   * Used by resolveActions to compute base actions from coarse access level
   */
  private getFirewallManagerActionsForAccess(access: string, options?: Record<string, any>): string[] {
    const actions: string[] = [];

    switch (access) {
      case 'read':
      case 'readwrite':
        actions.push(
          'fms:GetPolicy',
          'fms:ListPolicies',
          'fms:GetComplianceDetail',
          'fms:ListComplianceStatus',
          'fms:GetProtectionStatus'
        );
        break;
      case 'write':
      case 'admin':
        actions.push(
          'fms:PutPolicy',
          'fms:DeletePolicy',
          'fms:AssociateAdminAccount',
          'fms:DisassociateAdminAccount'
        );
        break;
    }

    // For readwrite, combine read and write
    if (access === 'readwrite') {
      actions.push(
        'fms:PutPolicy',
        'fms:DeletePolicy',
        'fms:AssociateAdminAccount',
        'fms:DisassociateAdminAccount'
      );
    }

    // For admin with requireFullAdminAccess, add wildcard (but this would fail validation in FedRAMP)
    if (access === 'admin' && options?.requireFullAdminAccess) {
      actions.push('fms:*');
    }

    if (actions.length === 0) {
      throw new Error(`Unsupported Firewall Manager access level: ${access}`);
    }

    return actions;
  }
}

