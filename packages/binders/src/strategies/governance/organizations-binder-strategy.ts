/**
 * OrganizationsBinderStrategy (Unified)
 * Handles AWS Organizations bindings with mandatory compliance enforcement
 * 
 * Multi-capability strategy supporting:
 * - org:scp - Service Control Policies
 * - org:tag-policy - Tag policies for resource tagging compliance
 * - org:backup-policy - Backup policies for org-wide backup requirements
 * - org:ou - Organizational Unit creation and management
 * - org:account - Account creation/management
 * - org:ai-services-opt-out - AI services opt-out for privacy compliance
 * - org:service-linked-role - Service-linked roles for delegated admin
 */

import { UnifiedBinderStrategyBase, resolveActions } from '@shinobi/core';
import type { BindingContext, EnhancedBindingResult, CompatibilityEntry } from '@shinobi/core';
import type { IamPolicy } from '@shinobi/core';
import { PolicyStatement, Effect } from 'aws-cdk-lib/aws-iam';

export class OrganizationsBinderStrategy extends UnifiedBinderStrategyBase {
  readonly supportedCapabilities = [
    'org:scp',
    'org:tag-policy',
    'org:backup-policy',
    'org:ou',
    'org:account',
    'org:ai-services-opt-out',
    'org:service-linked-role'
  ];

  getStrategyName(): string {
    return 'OrganizationsBinderStrategy';
  }

  canHandle(sourceType: string, targetCapability: string): boolean {
    return this.supportedCapabilities.includes(targetCapability);
  }

  getCompatibilityMatrix(): CompatibilityEntry[] {
    return [
      {
        sourceType: '*',
        targetType: '*',
        capability: 'org:scp',
        supportedAccess: ['read', 'write', 'admin'],
        description: 'Bind to Service Control Policy (SCP) for org-wide policy enforcement',
        examples: ['lambda-governance -> org:scp (admin)']
      },
      {
        sourceType: '*',
        targetType: '*',
        capability: 'org:tag-policy',
        supportedAccess: ['read', 'write', 'admin'],
        description: 'Bind to tag policy for resource tagging compliance',
        examples: ['lambda-governance -> org:tag-policy (admin)']
      },
      {
        sourceType: '*',
        targetType: '*',
        capability: 'org:backup-policy',
        supportedAccess: ['read', 'write', 'admin'],
        description: 'Bind to backup policy for org-wide backup requirements',
        examples: ['lambda-governance -> org:backup-policy (admin)']
      },
      {
        sourceType: '*',
        targetType: '*',
        capability: 'org:ou',
        supportedAccess: ['read', 'write', 'admin'],
        description: 'Bind to Organizational Unit (OU) for account organization',
        examples: ['lambda-governance -> org:ou (admin)']
      },
      {
        sourceType: '*',
        targetType: '*',
        capability: 'org:account',
        supportedAccess: ['read', 'write', 'admin'],
        description: 'Bind to AWS account for account creation/management',
        examples: ['lambda-governance -> org:account (admin)']
      },
      {
        sourceType: '*',
        targetType: '*',
        capability: 'org:ai-services-opt-out',
        supportedAccess: ['read', 'write', 'admin'],
        description: 'Bind to AI services opt-out for privacy compliance',
        examples: ['lambda-governance -> org:ai-services-opt-out (admin)']
      },
      {
        sourceType: '*',
        targetType: '*',
        capability: 'org:service-linked-role',
        supportedAccess: ['read', 'write', 'admin'],
        description: 'Bind to service-linked role for delegated admin capabilities',
        examples: ['lambda-governance -> org:service-linked-role (admin)']
      }
    ];
  }

  protected async doBind(context: BindingContext): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    const { source, target, directive } = context;
    const { capability } = directive;

    // Validate inputs
    if (!target) {
      throw new Error('Target component is required for Organizations binding');
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
      case 'org:scp':
        return await this.bindToScp(context, targetCapabilityData);
      case 'org:tag-policy':
        return await this.bindToTagPolicy(context, targetCapabilityData);
      case 'org:backup-policy':
        return await this.bindToBackupPolicy(context, targetCapabilityData);
      case 'org:ou':
        return await this.bindToOu(context, targetCapabilityData);
      case 'org:account':
        return await this.bindToAccount(context, targetCapabilityData);
      case 'org:ai-services-opt-out':
        return await this.bindToAiServicesOptOut(context, targetCapabilityData);
      case 'org:service-linked-role':
        return await this.bindToServiceLinkedRole(context, targetCapabilityData);
      default:
        throw new Error(`Unsupported Organizations capability: ${capability}. Supported capabilities: ${this.supportedCapabilities.join(', ')}`);
    }
  }

  /**
   * Bind to org:scp (Service Control Policy)
   * 
   * @param context - Binding context
   * @param targetData - Expected structure:
   *   - orgId (required): string - Organization ID
   *   - masterAccountId (required): string - Management account ID
   *   - scpArn (optional): string - SCP ARN (if SCP exists)
   *   - rootId (optional): string - Root ID
   *   - ouPath (optional): string - OU path (e.g., "r-1234/ou-1234-567890ab/ou-1234-567890cd")
   *   - policyDocument (optional): object - SCP policy document JSON
   * @returns Enhanced binding result (without compliance block)
   */
  private async bindToScp(
    context: BindingContext,
    targetData: any
  ): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    const { directive } = context;
    const { access, options } = directive;

    if (!targetData?.orgId) {
      throw new Error('Target component missing required orgId property for org:scp binding');
    }
    if (!targetData?.masterAccountId) {
      throw new Error('Target component missing required masterAccountId property for org:scp binding');
    }

    const iamPolicies: IamPolicy[] = [];
    const environmentVariables: Record<string, string> = {
      AWS_ORGANIZATIONS_ID: targetData.orgId,
      AWS_ORGANIZATIONS_MASTER_ACCOUNT_ID: targetData.masterAccountId
    };

    if (targetData.scpArn) {
      environmentVariables.AWS_ORGANIZATIONS_SCP_ARN = targetData.scpArn;
    }

    if (targetData.rootId) {
      environmentVariables.AWS_ORGANIZATIONS_ROOT_ID = targetData.rootId;
    }

    if (targetData.ouPath) {
      environmentVariables.AWS_ORGANIZATIONS_OU_PATH = targetData.ouPath;
    }

    // Handle granular actions override or use multi-statement approach
    if (context.directive.actions) {
      // Granular actions provided: create single statement with resolved actions
      const resolvedActions = resolveActions(
        context.directive,
        context,
        (acc) => this.getScpActionsForAccess(acc),
        'organizations'
      );

      const statement = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: resolvedActions,
        resources: ['*']
      });
      iamPolicies.push({
        statement,
        description: 'Organizations SCP access permissions (granular actions)',
        complianceRequirement: 'Least privilege IAM access'
      });
    } else {
      // Coarse access levels: use multi-statement approach (backward compatible)
      if (access === 'read' || access === 'readwrite') {
        iamPolicies.push({
          statement: new PolicyStatement({
            effect: Effect.ALLOW,
            actions: [
              'organizations:DescribePolicy',
              'organizations:ListPolicies',
              'organizations:ListPoliciesForTarget',
              'organizations:DescribeOrganization',
              'organizations:ListRoots'
            ],
            resources: ['*']
          }),
          description: 'Organizations SCP read access',
          complianceRequirement: 'Least privilege IAM access for Organizations read operations'
        });
      }

      if (access === 'write' || access === 'readwrite' || access === 'admin') {
        iamPolicies.push({
          statement: new PolicyStatement({
            effect: Effect.ALLOW,
            actions: [
              'organizations:CreatePolicy',
              'organizations:UpdatePolicy',
              'organizations:DeletePolicy',
              'organizations:AttachPolicy',
              'organizations:DetachPolicy',
              'organizations:EnablePolicyType',
              'organizations:DisablePolicyType'
            ],
            resources: ['*']
          }),
          description: 'Organizations SCP write access',
          complianceRequirement: 'Least privilege IAM access for Organizations write operations'
        });
      }
    }

    // Delegated admin support
    if (options?.delegatedAdminAccountId) {
      iamPolicies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
            'organizations:RegisterDelegatedAdministrator',
            'organizations:DeregisterDelegatedAdministrator',
            'organizations:ListDelegatedAdministrators'
          ],
          resources: ['*']
        }),
        description: 'Organizations delegated admin access',
        complianceRequirement: 'Least privilege IAM access for delegated admin operations'
      });
      environmentVariables.AWS_ORGANIZATIONS_DELEGATED_ADMIN_ACCOUNT_ID = options.delegatedAdminAccountId;
    }

    // Auto-enablement support (for new accounts)
    if (options?.autoEnablement) {
      iamPolicies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
            'organizations:CreateAccount',
            'organizations:InviteAccountToOrganization',
            'organizations:EnableAWSServiceAccess'
          ],
          resources: ['*']
        }),
        description: 'Organizations auto-enablement access',
        complianceRequirement: 'Least privilege IAM access for auto-enablement operations'
      });
    }

    // Org-wide feature enablement
    if (options?.enableAllFeatures) {
      iamPolicies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
            'organizations:EnableAllFeatures',
            'organizations:EnableAWSServiceAccess'
          ],
          resources: ['*']
        }),
        description: 'Organizations feature enablement access',
        complianceRequirement: 'Least privilege IAM access for org-wide feature enablement'
      });
    }

    // Gate admin access behind explicit option
    if (access === 'admin' && options?.requireFullAdminAccess) {
      iamPolicies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ['organizations:*'],
          resources: ['*']
        }),
        description: 'Organizations SCP admin access',
        complianceRequirement: 'Full Organizations access for admin operations (explicitly requested)'
      });
    }

    return {
      iamPolicies,
      environmentVariables,
      securityGroupRules: []
    };
  }

  /**
   * Bind to org:tag-policy
   * 
   * @param context - Binding context
   * @param targetData - Expected structure:
   *   - orgId (required): string - Organization ID
   *   - masterAccountId (required): string - Management account ID
   *   - tagPolicyId (optional): string - Tag policy ID
   */
  private async bindToTagPolicy(
    context: BindingContext,
    targetData: any
  ): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    const { directive } = context;
    const { access } = directive;

    if (!targetData?.orgId) {
      throw new Error('Target component missing required orgId property for org:tag-policy binding');
    }
    if (!targetData?.masterAccountId) {
      throw new Error('Target component missing required masterAccountId property for org:tag-policy binding');
    }

    const iamPolicies: IamPolicy[] = [];
    const environmentVariables: Record<string, string> = {
      AWS_ORGANIZATIONS_ID: targetData.orgId,
      AWS_ORGANIZATIONS_MASTER_ACCOUNT_ID: targetData.masterAccountId
    };

    // Handle granular actions override or use multi-statement approach
    if (context.directive.actions) {
      const resolvedActions = resolveActions(
        context.directive,
        context,
        (acc) => this.getTagPolicyActionsForAccess(acc),
        'organizations'
      );
      const statement = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: resolvedActions,
        resources: ['*']
      });
      iamPolicies.push({
        statement,
        description: 'Organizations tag policy access permissions (granular actions)',
        complianceRequirement: 'Least privilege IAM access'
      });
    } else {
      if (access === 'read' || access === 'readwrite') {
        iamPolicies.push({
          statement: new PolicyStatement({
            effect: Effect.ALLOW,
            actions: [
              'organizations:DescribePolicy',
              'organizations:ListPolicies',
              'organizations:ListPoliciesForTarget'
            ],
            resources: ['*']
          }),
          description: 'Organizations tag policy read access',
          complianceRequirement: 'Least privilege IAM access for tag policy read operations'
        });
      }

      if (access === 'write' || access === 'readwrite' || access === 'admin') {
        iamPolicies.push({
          statement: new PolicyStatement({
            effect: Effect.ALLOW,
            actions: [
              'organizations:CreatePolicy',
              'organizations:UpdatePolicy',
              'organizations:DeletePolicy',
              'organizations:AttachPolicy',
              'organizations:DetachPolicy'
            ],
            resources: ['*']
          }),
          description: 'Organizations tag policy write access',
          complianceRequirement: 'Least privilege IAM access for tag policy write operations'
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
   * Bind to org:backup-policy
   * 
   * @param context - Binding context
   * @param targetData - Expected structure:
   *   - orgId (required): string - Organization ID
   *   - masterAccountId (required): string - Management account ID
   *   - backupPolicyId (optional): string - Backup policy ID
   */
  private async bindToBackupPolicy(
    context: BindingContext,
    targetData: any
  ): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    const { directive } = context;
    const { access } = directive;

    if (!targetData?.orgId) {
      throw new Error('Target component missing required orgId property for org:backup-policy binding');
    }
    if (!targetData?.masterAccountId) {
      throw new Error('Target component missing required masterAccountId property for org:backup-policy binding');
    }

    const iamPolicies: IamPolicy[] = [];
    const environmentVariables: Record<string, string> = {
      AWS_ORGANIZATIONS_ID: targetData.orgId,
      AWS_ORGANIZATIONS_MASTER_ACCOUNT_ID: targetData.masterAccountId
    };

    // Handle granular actions override or use multi-statement approach
    if (context.directive.actions) {
      const resolvedActions = resolveActions(
        context.directive,
        context,
        (acc) => this.getBackupPolicyActionsForAccess(acc),
        'organizations'
      );
      const statement = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: resolvedActions,
        resources: ['*']
      });
      iamPolicies.push({
        statement,
        description: 'Organizations backup policy access permissions (granular actions)',
        complianceRequirement: 'Least privilege IAM access'
      });
    } else {
      if (access === 'read' || access === 'readwrite') {
        iamPolicies.push({
          statement: new PolicyStatement({
            effect: Effect.ALLOW,
            actions: [
              'organizations:DescribePolicy',
              'organizations:ListPolicies',
              'organizations:ListPoliciesForTarget'
            ],
            resources: ['*']
          }),
          description: 'Organizations backup policy read access',
          complianceRequirement: 'Least privilege IAM access for backup policy read operations'
        });
      }

      if (access === 'write' || access === 'readwrite' || access === 'admin') {
        iamPolicies.push({
          statement: new PolicyStatement({
            effect: Effect.ALLOW,
            actions: [
              'organizations:CreatePolicy',
              'organizations:UpdatePolicy',
              'organizations:DeletePolicy',
              'organizations:AttachPolicy',
              'organizations:DetachPolicy'
            ],
            resources: ['*']
          }),
          description: 'Organizations backup policy write access',
          complianceRequirement: 'Least privilege IAM access for backup policy write operations'
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
   * Bind to org:ou (Organizational Unit)
   * 
   * @param context - Binding context
   * @param targetData - Expected structure:
   *   - orgId (required): string - Organization ID
   *   - masterAccountId (required): string - Management account ID
   *   - ouId (optional): string - OU ID
   *   - rootId (optional): string - Root ID
   *   - ouPath (optional): string - OU path (e.g., "r-1234/ou-1234-567890ab/ou-1234-567890cd")
   */
  private async bindToOu(
    context: BindingContext,
    targetData: any
  ): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    const { directive } = context;
    const { access, options } = directive;

    if (!targetData?.orgId) {
      throw new Error('Target component missing required orgId property for org:ou binding');
    }
    if (!targetData?.masterAccountId) {
      throw new Error('Target component missing required masterAccountId property for org:ou binding');
    }

    const iamPolicies: IamPolicy[] = [];
    const environmentVariables: Record<string, string> = {
      AWS_ORGANIZATIONS_ID: targetData.orgId,
      AWS_ORGANIZATIONS_MASTER_ACCOUNT_ID: targetData.masterAccountId
    };

    if (targetData.ouId) {
      environmentVariables.AWS_ORGANIZATIONS_OU_ID = targetData.ouId;
    }

    if (targetData.rootId) {
      environmentVariables.AWS_ORGANIZATIONS_ROOT_ID = targetData.rootId;
    }

    if (targetData.ouPath) {
      environmentVariables.AWS_ORGANIZATIONS_OU_PATH = targetData.ouPath;
    }

    // Handle granular actions override or use multi-statement approach
    if (context.directive.actions) {
      const resolvedActions = resolveActions(
        context.directive,
        context,
        (acc) => this.getOuActionsForAccess(acc),
        'organizations'
      );
      const statement = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: resolvedActions,
        resources: ['*']
      });
      iamPolicies.push({
        statement,
        description: 'Organizations OU access permissions (granular actions)',
        complianceRequirement: 'Least privilege IAM access'
      });
    } else {
      if (access === 'read' || access === 'readwrite') {
        iamPolicies.push({
          statement: new PolicyStatement({
            effect: Effect.ALLOW,
            actions: [
              'organizations:DescribeOrganizationalUnit',
              'organizations:ListOrganizationalUnitsForParent',
              'organizations:ListRoots',
              'organizations:ListChildren'
            ],
            resources: ['*']
          }),
          description: 'Organizations OU read access',
          complianceRequirement: 'Least privilege IAM access for OU read operations'
        });
      }

      if (access === 'write' || access === 'readwrite' || access === 'admin') {
        iamPolicies.push({
          statement: new PolicyStatement({
            effect: Effect.ALLOW,
            actions: [
              'organizations:CreateOrganizationalUnit',
              'organizations:UpdateOrganizationalUnit',
              'organizations:DeleteOrganizationalUnit',
              'organizations:MoveAccount'
            ],
            resources: ['*']
          }),
          description: 'Organizations OU write access',
          complianceRequirement: 'Least privilege IAM access for OU write operations'
        });
      }

      // Gate admin access behind explicit option
      if (access === 'admin' && options?.requireFullAdminAccess) {
        iamPolicies.push({
          statement: new PolicyStatement({
            effect: Effect.ALLOW,
            actions: ['organizations:*'],
            resources: ['*']
          }),
          description: 'Organizations OU admin access',
          complianceRequirement: 'Full Organizations access for admin operations (explicitly requested)'
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
   * Bind to org:account
   * 
   * @param context - Binding context
   * @param targetData - Expected structure:
   *   - orgId (required): string - Organization ID
   *   - masterAccountId (required): string - Management account ID
   *   - accountId (optional): string - Account ID
   *   - accountName (optional): string - Account name
   *   - accountEmail (optional): string - Account email
   */
  private async bindToAccount(
    context: BindingContext,
    targetData: any
  ): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    const { directive } = context;
    const { access } = directive;

    if (!targetData?.orgId) {
      throw new Error('Target component missing required orgId property for org:account binding');
    }
    if (!targetData?.masterAccountId) {
      throw new Error('Target component missing required masterAccountId property for org:account binding');
    }

    const iamPolicies: IamPolicy[] = [];
    const environmentVariables: Record<string, string> = {
      AWS_ORGANIZATIONS_ID: targetData.orgId,
      AWS_ORGANIZATIONS_MASTER_ACCOUNT_ID: targetData.masterAccountId
    };

    if (targetData.accountId) {
      environmentVariables.AWS_ORGANIZATIONS_ACCOUNT_ID = targetData.accountId;
    }

    if (targetData.accountName) {
      environmentVariables.AWS_ORGANIZATIONS_ACCOUNT_NAME = targetData.accountName;
    }

    if (targetData.accountEmail) {
      environmentVariables.AWS_ORGANIZATIONS_ACCOUNT_EMAIL = targetData.accountEmail;
    }

    // Handle granular actions override or use multi-statement approach
    if (context.directive.actions) {
      const resolvedActions = resolveActions(
        context.directive,
        context,
        (acc) => this.getAccountActionsForAccess(acc),
        'organizations'
      );
      const statement = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: resolvedActions,
        resources: ['*']
      });
      iamPolicies.push({
        statement,
        description: 'Organizations account access permissions (granular actions)',
        complianceRequirement: 'Least privilege IAM access'
      });
    } else {
      if (access === 'read' || access === 'readwrite') {
        iamPolicies.push({
          statement: new PolicyStatement({
            effect: Effect.ALLOW,
            actions: [
              'organizations:DescribeAccount',
              'organizations:ListAccounts',
              'organizations:ListAccountsForParent'
            ],
            resources: ['*']
          }),
          description: 'Organizations account read access',
          complianceRequirement: 'Least privilege IAM access for account read operations'
        });
      }

      if (access === 'write' || access === 'readwrite' || access === 'admin') {
        iamPolicies.push({
          statement: new PolicyStatement({
            effect: Effect.ALLOW,
            actions: [
              'organizations:CreateAccount',
              'organizations:CloseAccount',
              'organizations:MoveAccount',
              'organizations:UpdateAccount'
            ],
            resources: ['*']
          }),
          description: 'Organizations account write access',
          complianceRequirement: 'Least privilege IAM access for account write operations'
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
   * Bind to org:ai-services-opt-out
   * 
   * @param context - Binding context
   * @param targetData - Expected structure:
   *   - orgId (required): string - Organization ID
   *   - masterAccountId (required): string - Management account ID
   *   - optOutServices (optional): string[] - List of AI services to opt out
   */
  private async bindToAiServicesOptOut(
    context: BindingContext,
    targetData: any
  ): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    const { directive } = context;
    const { access } = directive;

    if (!targetData?.orgId) {
      throw new Error('Target component missing required orgId property for org:ai-services-opt-out binding');
    }
    if (!targetData?.masterAccountId) {
      throw new Error('Target component missing required masterAccountId property for org:ai-services-opt-out binding');
    }

    const iamPolicies: IamPolicy[] = [];
    const environmentVariables: Record<string, string> = {
      AWS_ORGANIZATIONS_ID: targetData.orgId,
      AWS_ORGANIZATIONS_MASTER_ACCOUNT_ID: targetData.masterAccountId
    };

    // Handle granular actions override or use multi-statement approach
    if (context.directive.actions) {
      const resolvedActions = resolveActions(
        context.directive,
        context,
        (acc) => this.getAiServicesOptOutActionsForAccess(acc),
        'organizations'
      );
      const statement = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: resolvedActions,
        resources: ['*']
      });
      iamPolicies.push({
        statement,
        description: 'Organizations AI services opt-out access permissions (granular actions)',
        complianceRequirement: 'Least privilege IAM access'
      });
    } else {
      if (access === 'read' || access === 'readwrite') {
        iamPolicies.push({
          statement: new PolicyStatement({
            effect: Effect.ALLOW,
            actions: [
              'organizations:ListAWSServiceAccessForOrganization',
              'organizations:DescribeOrganization'
            ],
            resources: ['*']
          }),
          description: 'Organizations AI services opt-out read access',
          complianceRequirement: 'Least privilege IAM access for AI services opt-out read operations'
        });
      }

      if (access === 'write' || access === 'readwrite' || access === 'admin') {
        iamPolicies.push({
          statement: new PolicyStatement({
            effect: Effect.ALLOW,
            actions: [
              'organizations:EnableAWSServiceAccess',
              'organizations:DisableAWSServiceAccess'
            ],
            resources: ['*']
          }),
          description: 'Organizations AI services opt-out write access',
          complianceRequirement: 'Least privilege IAM access for AI services opt-out write operations'
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
   * Bind to org:service-linked-role
   * 
   * @param context - Binding context
   * @param targetData - Expected structure:
   *   - orgId (required): string - Organization ID
   *   - masterAccountId (required): string - Management account ID
   *   - servicePrincipal (optional): string - Service principal for the service-linked role
   */
  private async bindToServiceLinkedRole(
    context: BindingContext,
    targetData: any
  ): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    const { directive } = context;
    const { access } = directive;

    if (!targetData?.orgId) {
      throw new Error('Target component missing required orgId property for org:service-linked-role binding');
    }
    if (!targetData?.masterAccountId) {
      throw new Error('Target component missing required masterAccountId property for org:service-linked-role binding');
    }

    const iamPolicies: IamPolicy[] = [];
    const environmentVariables: Record<string, string> = {
      AWS_ORGANIZATIONS_ID: targetData.orgId,
      AWS_ORGANIZATIONS_MASTER_ACCOUNT_ID: targetData.masterAccountId
    };

    // Handle granular actions override or use multi-statement approach
    if (context.directive.actions) {
      const resolvedActions = resolveActions(
        context.directive,
        context,
        (acc) => this.getServiceLinkedRoleActionsForAccess(acc),
        'organizations'
      );
      const statement = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: resolvedActions,
        resources: ['*']
      });
      iamPolicies.push({
        statement,
        description: 'Organizations service-linked role access permissions (granular actions)',
        complianceRequirement: 'Least privilege IAM access'
      });
    } else {
      if (access === 'read' || access === 'readwrite') {
        iamPolicies.push({
          statement: new PolicyStatement({
            effect: Effect.ALLOW,
            actions: [
              'organizations:ListAWSServiceAccessForOrganization',
              'iam:GetRole',
              'iam:ListRoles'
            ],
            resources: ['*']
          }),
          description: 'Organizations service-linked role read access',
          complianceRequirement: 'Least privilege IAM access for service-linked role read operations'
        });
      }

      if (access === 'write' || access === 'readwrite' || access === 'admin') {
        iamPolicies.push({
          statement: new PolicyStatement({
            effect: Effect.ALLOW,
            actions: [
              'organizations:EnableAWSServiceAccess',
              'organizations:DisableAWSServiceAccess',
              'iam:CreateServiceLinkedRole',
              'iam:DeleteServiceLinkedRole'
            ],
            resources: ['*']
          }),
          description: 'Organizations service-linked role write access',
          complianceRequirement: 'Least privilege IAM access for service-linked role write operations'
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
   * Get SCP actions based on access level
   * Used by resolveActions to compute base actions from coarse access level
   * 
   * @param access - Access level (read, write, readwrite, admin)
   * @returns Array of IAM action strings
   */
  private getScpActionsForAccess(access: string): string[] {
    switch (access) {
      case 'read':
        return [
          'organizations:DescribePolicy',
          'organizations:ListPolicies',
          'organizations:ListPoliciesForTarget',
          'organizations:DescribeOrganization',
          'organizations:ListRoots'
        ];
      case 'write':
        return [
          'organizations:CreatePolicy',
          'organizations:UpdatePolicy',
          'organizations:DeletePolicy',
          'organizations:AttachPolicy',
          'organizations:DetachPolicy',
          'organizations:EnablePolicyType',
          'organizations:DisablePolicyType'
        ];
      case 'readwrite':
        return [
          'organizations:DescribePolicy',
          'organizations:ListPolicies',
          'organizations:ListPoliciesForTarget',
          'organizations:DescribeOrganization',
          'organizations:ListRoots',
          'organizations:CreatePolicy',
          'organizations:UpdatePolicy',
          'organizations:DeletePolicy',
          'organizations:AttachPolicy',
          'organizations:DetachPolicy',
          'organizations:EnablePolicyType',
          'organizations:DisablePolicyType'
        ];
      case 'admin':
        return ['organizations:*'];
      default:
        throw new Error(`Unsupported SCP access level: ${access}`);
    }
  }

  /**
   * Get tag policy actions based on access level
   */
  private getTagPolicyActionsForAccess(access: string): string[] {
    switch (access) {
      case 'read':
        return [
          'organizations:DescribePolicy',
          'organizations:ListPolicies',
          'organizations:ListPoliciesForTarget'
        ];
      case 'write':
        return [
          'organizations:CreatePolicy',
          'organizations:UpdatePolicy',
          'organizations:DeletePolicy',
          'organizations:AttachPolicy',
          'organizations:DetachPolicy'
        ];
      case 'readwrite':
        return [
          'organizations:DescribePolicy',
          'organizations:ListPolicies',
          'organizations:ListPoliciesForTarget',
          'organizations:CreatePolicy',
          'organizations:UpdatePolicy',
          'organizations:DeletePolicy',
          'organizations:AttachPolicy',
          'organizations:DetachPolicy'
        ];
      case 'admin':
        return ['organizations:*'];
      default:
        throw new Error(`Unsupported tag policy access level: ${access}`);
    }
  }

  /**
   * Get backup policy actions based on access level
   */
  private getBackupPolicyActionsForAccess(access: string): string[] {
    switch (access) {
      case 'read':
        return [
          'organizations:DescribePolicy',
          'organizations:ListPolicies',
          'organizations:ListPoliciesForTarget'
        ];
      case 'write':
        return [
          'organizations:CreatePolicy',
          'organizations:UpdatePolicy',
          'organizations:DeletePolicy',
          'organizations:AttachPolicy',
          'organizations:DetachPolicy'
        ];
      case 'readwrite':
        return [
          'organizations:DescribePolicy',
          'organizations:ListPolicies',
          'organizations:ListPoliciesForTarget',
          'organizations:CreatePolicy',
          'organizations:UpdatePolicy',
          'organizations:DeletePolicy',
          'organizations:AttachPolicy',
          'organizations:DetachPolicy'
        ];
      case 'admin':
        return ['organizations:*'];
      default:
        throw new Error(`Unsupported backup policy access level: ${access}`);
    }
  }

  /**
   * Get OU actions based on access level
   */
  private getOuActionsForAccess(access: string): string[] {
    switch (access) {
      case 'read':
        return [
          'organizations:DescribeOrganizationalUnit',
          'organizations:ListOrganizationalUnitsForParent',
          'organizations:ListRoots',
          'organizations:ListChildren'
        ];
      case 'write':
        return [
          'organizations:CreateOrganizationalUnit',
          'organizations:UpdateOrganizationalUnit',
          'organizations:DeleteOrganizationalUnit',
          'organizations:MoveAccount'
        ];
      case 'readwrite':
        return [
          'organizations:DescribeOrganizationalUnit',
          'organizations:ListOrganizationalUnitsForParent',
          'organizations:ListRoots',
          'organizations:ListChildren',
          'organizations:CreateOrganizationalUnit',
          'organizations:UpdateOrganizationalUnit',
          'organizations:DeleteOrganizationalUnit',
          'organizations:MoveAccount'
        ];
      case 'admin':
        return ['organizations:*'];
      default:
        throw new Error(`Unsupported OU access level: ${access}`);
    }
  }

  /**
   * Get account actions based on access level
   */
  private getAccountActionsForAccess(access: string): string[] {
    switch (access) {
      case 'read':
        return [
          'organizations:DescribeAccount',
          'organizations:ListAccounts',
          'organizations:ListAccountsForParent'
        ];
      case 'write':
        return [
          'organizations:CreateAccount',
          'organizations:CloseAccount',
          'organizations:MoveAccount',
          'organizations:UpdateAccount'
        ];
      case 'readwrite':
        return [
          'organizations:DescribeAccount',
          'organizations:ListAccounts',
          'organizations:ListAccountsForParent',
          'organizations:CreateAccount',
          'organizations:CloseAccount',
          'organizations:MoveAccount',
          'organizations:UpdateAccount'
        ];
      case 'admin':
        return ['organizations:*'];
      default:
        throw new Error(`Unsupported account access level: ${access}`);
    }
  }

  /**
   * Get AI services opt-out actions based on access level
   */
  private getAiServicesOptOutActionsForAccess(access: string): string[] {
    switch (access) {
      case 'read':
        return [
          'organizations:ListAWSServiceAccessForOrganization',
          'organizations:DescribeOrganization'
        ];
      case 'write':
        return [
          'organizations:EnableAWSServiceAccess',
          'organizations:DisableAWSServiceAccess'
        ];
      case 'readwrite':
        return [
          'organizations:ListAWSServiceAccessForOrganization',
          'organizations:DescribeOrganization',
          'organizations:EnableAWSServiceAccess',
          'organizations:DisableAWSServiceAccess'
        ];
      case 'admin':
        return ['organizations:*'];
      default:
        throw new Error(`Unsupported AI services opt-out access level: ${access}`);
    }
  }

  /**
   * Get service-linked role actions based on access level
   */
  private getServiceLinkedRoleActionsForAccess(access: string): string[] {
    switch (access) {
      case 'read':
        return [
          'organizations:ListAWSServiceAccessForOrganization',
          'iam:GetRole',
          'iam:ListRoles'
        ];
      case 'write':
        return [
          'organizations:EnableAWSServiceAccess',
          'organizations:DisableAWSServiceAccess',
          'iam:CreateServiceLinkedRole',
          'iam:DeleteServiceLinkedRole'
        ];
      case 'readwrite':
        return [
          'organizations:ListAWSServiceAccessForOrganization',
          'iam:GetRole',
          'iam:ListRoles',
          'organizations:EnableAWSServiceAccess',
          'organizations:DisableAWSServiceAccess',
          'iam:CreateServiceLinkedRole',
          'iam:DeleteServiceLinkedRole'
        ];
      case 'admin':
        return ['organizations:*', 'iam:*'];
      default:
        throw new Error(`Unsupported service-linked role access level: ${access}`);
    }
  }
}

