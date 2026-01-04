/**
 * IamRoleBinderStrategy (Unified)
 * Handles iam:role bindings with mandatory compliance enforcement
 */

import { UnifiedBinderStrategyBase, resolveActions } from '@shinobi/core';
import type { BindingContext, EnhancedBindingResult, CompatibilityEntry } from '@shinobi/core';
import type { IamPolicy } from '@shinobi/core';
import { PolicyStatement, Effect } from 'aws-cdk-lib/aws-iam';

export class IamRoleBinderStrategy extends UnifiedBinderStrategyBase {
  readonly supportedCapabilities = ['iam:role'];

  getStrategyName(): string {
    return 'IamRoleBinderStrategy';
  }

  canHandle(sourceType: string, targetCapability: string): boolean {
    return this.supportedCapabilities.includes(targetCapability);
  }

  getCompatibilityMatrix(): CompatibilityEntry[] {
    return [
      {
        sourceType: '*',
        targetType: '*',
        capability: 'iam:role',
        supportedAccess: ['read', 'write', 'admin'],
        description: 'Bind to IAM role for role assumption and management',
        examples: ['lambda-api -> iam:role (read)', 'ecs-task -> iam:role (read)', 'ec2-instance -> iam:role (read)']
      }
    ];
  }

  protected async doBind(context: BindingContext): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    const { source, target, directive } = context;
    const { capability } = directive;

    // Validate inputs
    if (!target) {
      throw new Error('Target component is required for iam:role binding');
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

    return await this.bindToRole(context, targetCapabilityData);
  }

  /**
   * Bind to IAM role
   * 
   * @param context - Binding context
   * @param targetData - Expected structure:
   *   - roleArn (required): string - ARN of the IAM role
   *   - roleName (required): string - Name of the IAM role
   *   - maxSessionDuration?: number - Maximum session duration in seconds
   *   - permissionsBoundary?: string - ARN of permissions boundary (if applicable)
   *   - instanceProfileName?: string - Instance profile name (if applicable)
   *   - assumedBy?: Array<{service?: string, accountId?: string, roleArn?: string, federatedProvider?: string}> - Trust policy principals
   *   - externalId?: string - External ID for cross-account assume role
   *   - inlinePolicies?: Array<{name: string}> - Inline policy names
   *   - managedPolicies?: string[] - Managed policy ARNs
   * @returns Enhanced binding result (without compliance block)
   */
  private async bindToRole(
    context: BindingContext,
    targetData: any
  ): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    const { source, directive } = context;
    const { access, options } = directive;

    // Validate required target properties
    if (!targetData?.roleArn) {
      throw new Error('Target component missing required roleArn property for IAM role binding');
    }
    if (!targetData?.roleName) {
      throw new Error('Target component missing required roleName property for IAM role binding');
    }

    const iamPolicies: IamPolicy[] = [];
    const environmentVariables: Record<string, string> = {};
    const securityGroupRules: any[] = [];

    // Handle granular actions override or use multi-statement approach
    if (directive.actions) {
      const resolvedActions = resolveActions(
        directive,
        context,
        (acc) => this.getIamRoleActionsForAccess(acc, options),
        'iam'
      );

      // For granular actions, create a single policy statement
      // Note: AssumeRole conditions (externalId) are not applied in granular mode
      // Users must specify all required actions including sts:AssumeRole if needed
      const statement = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: resolvedActions,
        resources: [targetData.roleArn]
      });
      iamPolicies.push({
        statement,
        description: 'IAM role access permissions (granular actions)',
        complianceRequirement: 'Least privilege IAM access'
      });
    } else {
      // Coarse access levels: use multi-statement approach (backward compatible)
      // Grant role assumption permissions
      if (access === 'read' || access === 'write' || access === 'admin' || access === 'readwrite') {
      const assumeRoleStatement = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['sts:AssumeRole'],
        resources: [targetData.roleArn]
      });

      // Add cross-account external ID condition if provided
      if (targetData.externalId && options?.requireExternalId !== false) {
        assumeRoleStatement.addConditions({
          StringEquals: {
            'sts:ExternalId': targetData.externalId
          }
        });
      }

      iamPolicies.push({
        statement: assumeRoleStatement,
        description: 'IAM role assume permissions',
        complianceRequirement: 'Least privilege IAM access'
      });
    }

    // Grant role read permissions (describe role, list policies)
    if (access === 'read' || access === 'write' || access === 'admin' || access === 'readwrite') {
      const statement = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          'iam:GetRole',
          'iam:GetRolePolicy',
          'iam:ListRolePolicies',
          'iam:ListAttachedRolePolicies'
        ],
        resources: [targetData.roleArn]
      });
      iamPolicies.push({
        statement,
        description: 'IAM role read permissions',
        complianceRequirement: 'Least privilege IAM access'
      });
    }

    // Grant role write permissions (update role, manage policies)
    if (access === 'write' || access === 'admin' || access === 'readwrite') {
      const statement = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          'iam:UpdateRole',
          'iam:UpdateRoleDescription',
          'iam:PutRolePolicy',
          'iam:DeleteRolePolicy',
          'iam:AttachRolePolicy',
          'iam:DetachRolePolicy',
          'iam:TagRole',
          'iam:UntagRole'
        ],
        resources: [targetData.roleArn]
      });
      iamPolicies.push({
        statement,
        description: 'IAM role write permissions',
        complianceRequirement: 'Least privilege IAM access'
      });
    }

    // Grant role admin permissions (create, delete role) - gated behind option
    if (access === 'admin' && options?.allowRoleManagement === true) {
      const statement = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          'iam:CreateRole',
          'iam:DeleteRole'
        ],
        resources: [targetData.roleArn]
      });
      iamPolicies.push({
        statement,
        description: 'IAM role admin permissions (create/delete)',
        complianceRequirement: 'Least privilege IAM access - role management gated behind allowRoleManagement option'
      });
    }
    }

    // Set environment variables
    environmentVariables['IAM_ROLE_ARN'] = targetData.roleArn;
    environmentVariables['IAM_ROLE_NAME'] = targetData.roleName;
    
    if (targetData.maxSessionDuration !== undefined) {
      environmentVariables['IAM_ROLE_MAX_SESSION_DURATION'] = targetData.maxSessionDuration.toString();
    }
    
    if (targetData.permissionsBoundary) {
      environmentVariables['IAM_ROLE_PERMISSIONS_BOUNDARY'] = targetData.permissionsBoundary;
    }
    
    if (targetData.instanceProfileName) {
      environmentVariables['IAM_INSTANCE_PROFILE_NAME'] = targetData.instanceProfileName;
    }

    // Expose trust policy entities (assumedBy principals)
    if (targetData.assumedBy && Array.isArray(targetData.assumedBy)) {
      const servicePrincipals: string[] = [];
      const accountIds: string[] = [];
      const roleArns: string[] = [];
      const federatedProviders: string[] = [];

      targetData.assumedBy.forEach((principal: any) => {
        if (principal.service) servicePrincipals.push(principal.service);
        if (principal.accountId) accountIds.push(principal.accountId);
        if (principal.roleArn) roleArns.push(principal.roleArn);
        if (principal.federatedProvider) federatedProviders.push(principal.federatedProvider);
      });

      if (servicePrincipals.length > 0) {
        environmentVariables['IAM_ROLE_TRUST_SERVICE_PRINCIPALS'] = servicePrincipals.join(',');
      }
      if (accountIds.length > 0) {
        environmentVariables['IAM_ROLE_TRUST_ACCOUNT_IDS'] = accountIds.join(',');
      }
      if (roleArns.length > 0) {
        environmentVariables['IAM_ROLE_TRUST_ROLE_ARNS'] = roleArns.join(',');
      }
      if (federatedProviders.length > 0) {
        environmentVariables['IAM_ROLE_TRUST_FEDERATED_PROVIDERS'] = federatedProviders.join(',');
      }
      
      environmentVariables['IAM_ROLE_TRUST_PRINCIPAL_COUNT'] = targetData.assumedBy.length.toString();
    }

    // Expose cross-account external ID for assume role
    if (targetData.externalId) {
      environmentVariables['IAM_ROLE_EXTERNAL_ID'] = targetData.externalId;
    }

    // Expose inline policy information
    if (targetData.inlinePolicies && Array.isArray(targetData.inlinePolicies)) {
      const policyNames = targetData.inlinePolicies
        .map((policy: any) => policy.name || policy)
        .filter((name: string) => name);
      
      if (policyNames.length > 0) {
        environmentVariables['IAM_ROLE_INLINE_POLICY_NAMES'] = policyNames.join(',');
        environmentVariables['IAM_ROLE_INLINE_POLICY_COUNT'] = policyNames.length.toString();
      }
    }

    // Expose managed policy information
    if (targetData.managedPolicies && Array.isArray(targetData.managedPolicies)) {
      environmentVariables['IAM_ROLE_MANAGED_POLICY_ARNS'] = targetData.managedPolicies.join(',');
      environmentVariables['IAM_ROLE_MANAGED_POLICY_COUNT'] = targetData.managedPolicies.length.toString();
    }

    return {
      iamPolicies,
      environmentVariables,
      securityGroupRules,
    };
  }

  /**
   * Get IAM role actions based on access level
   * Used by resolveActions to compute base actions from coarse access level
   * 
   * @param access - Access level (read, write, admin, readwrite)
   * @param options - Binding options (for allowRoleManagement flag)
   * @returns Array of IAM action strings (includes sts:AssumeRole for all levels)
   */
  private getIamRoleActionsForAccess(access: string, options?: Record<string, any>): string[] {
    const actions: string[] = [];

    // All access levels include AssumeRole (read permissions)
    actions.push('sts:AssumeRole');

    switch (access) {
      case 'read':
      case 'readwrite':
        actions.push(
          'iam:GetRole',
          'iam:GetRolePolicy',
          'iam:ListRolePolicies',
          'iam:ListAttachedRolePolicies',
          'iam:ListInstanceProfilesForRole'
        );
        break;
      case 'write':
      case 'admin':
        actions.push(
          'iam:UpdateRole',
          'iam:UpdateRoleDescription',
          'iam:PutRolePolicy',
          'iam:DeleteRolePolicy',
          'iam:AttachRolePolicy',
          'iam:DetachRolePolicy',
          'iam:TagRole',
          'iam:UntagRole'
        );
        break;
    }

    // For readwrite, combine read and write
    if (access === 'readwrite') {
      actions.push(
        'iam:GetRole',
        'iam:GetRolePolicy',
        'iam:ListRolePolicies',
        'iam:ListAttachedRolePolicies',
        'iam:ListInstanceProfilesForRole',
        'iam:UpdateRole',
        'iam:UpdateRoleDescription',
        'iam:PutRolePolicy',
        'iam:DeleteRolePolicy',
        'iam:AttachRolePolicy',
        'iam:DetachRolePolicy',
        'iam:TagRole',
        'iam:UntagRole'
      );
    }

    // For admin with allowRoleManagement, add create/delete
    if (access === 'admin' && options?.allowRoleManagement === true) {
      actions.push(
        'iam:CreateRole',
        'iam:DeleteRole'
      );
    }

    if (actions.length === 0) {
      throw new Error(`Unsupported IAM role access level: ${access}`);
    }

    return actions;
  }
}

