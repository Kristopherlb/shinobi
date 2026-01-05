/**
 * RAMBinderStrategy (Unified)
 * Handles AWS Resource Access Manager (RAM) bindings with mandatory compliance enforcement
 * 
 * Multi-capability strategy supporting:
 * - governance:ram-resource-share - Resource shares for cross-account resource sharing
 * - org:ram-share - Organization-wide resource sharing
 */

import { UnifiedBinderStrategyBase, resolveActions } from '@shinobi/core';
import type { BindingContext, EnhancedBindingResult, CompatibilityEntry } from '@shinobi/core';
import type { IamPolicy } from '@shinobi/core';
import { PolicyStatement, Effect } from 'aws-cdk-lib/aws-iam';

export class RAMBinderStrategy extends UnifiedBinderStrategyBase {
  readonly supportedCapabilities = [
    'governance:ram-resource-share',
    'org:ram-share'
  ];

  getStrategyName(): string {
    return 'RAMBinderStrategy';
  }

  canHandle(sourceType: string, targetCapability: string): boolean {
    return this.supportedCapabilities.includes(targetCapability);
  }

  getCompatibilityMatrix(): CompatibilityEntry[] {
    return [
      {
        sourceType: '*',
        targetType: '*',
        capability: 'governance:ram-resource-share',
        supportedAccess: ['read', 'write', 'admin'],
        description: 'Bind to AWS RAM resource shares for cross-account resource sharing',
        examples: ['lambda-networking -> governance:ram-resource-share (read)', 'lambda-governance -> governance:ram-resource-share (write)']
      },
      {
        sourceType: '*',
        targetType: '*',
        capability: 'org:ram-share',
        supportedAccess: ['read', 'write', 'admin'],
        description: 'Bind to AWS RAM for organization-wide resource sharing',
        examples: ['lambda-governance -> org:ram-share (write)']
      }
    ];
  }

  protected async doBind(context: BindingContext): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    const { source, target, directive } = context;
    const { capability } = directive;

    // Validate inputs
    if (!target) {
      throw new Error('Target component is required for AWS RAM binding');
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
      case 'governance:ram-resource-share':
        return await this.bindToRamResourceShare(context, targetCapabilityData);
      case 'org:ram-share':
        return await this.bindToOrgRamShare(context, targetCapabilityData);
      default:
        throw new Error(`Unsupported RAM capability: ${capability}. Supported capabilities: ${this.supportedCapabilities.join(', ')}`);
    }
  }

  /**
   * Bind to governance:ram-resource-share
   * 
   * @param context - Binding context
   * @param targetData - Expected structure:
   *   - resourceShareArn (required): string - Resource share ARN
   *   - resourceShareName (optional): string - Resource share name
   *   - principalId (optional): string - Principal account/OU ID
   *   - resourceArn (optional): string - Shared resource ARN
   *   - permissionArn (optional): string - Permission ARN (read-only, full access)
   *   - invitationId (optional): string - Resource share invitation ID
   *   - permissionType (optional): string - Permission type (read-only, full-access)
   *   - resourceType (optional): string - Shared resource type (e.g., subnet, transit-gateway)
   *   - status (optional): string - Resource share status (PENDING, ACTIVE, FAILED, DELETING, DELETED)
   * @returns Enhanced binding result (without compliance block)
   */
  private async bindToRamResourceShare(
    context: BindingContext,
    targetData: any
  ): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    const { directive } = context;
    const { access, options } = directive;

    if (!targetData?.resourceShareArn) {
      throw new Error('Target component missing required resourceShareArn property for governance:ram-resource-share binding');
    }

    const iamPolicies: IamPolicy[] = [];
    const environmentVariables: Record<string, string> = {
      AWS_RAM_RESOURCE_SHARE_ARN: targetData.resourceShareArn
    };

    if (targetData.resourceShareName) {
      environmentVariables.AWS_RAM_RESOURCE_SHARE_NAME = targetData.resourceShareName;
    }

    if (targetData.principalId) {
      environmentVariables.AWS_RAM_PRINCIPAL_ID = targetData.principalId;
    }

    if (targetData.resourceArn) {
      environmentVariables.AWS_RAM_RESOURCE_ARN = targetData.resourceArn;
    }

    if (targetData.permissionArn) {
      environmentVariables.AWS_RAM_PERMISSION_ARN = targetData.permissionArn;
    }

    if (targetData.invitationId) {
      environmentVariables.AWS_RAM_INVITATION_ID = targetData.invitationId;
    }

    if (targetData.permissionType) {
      environmentVariables.AWS_RAM_PERMISSION_TYPE = targetData.permissionType;
    }

    if (targetData.resourceType) {
      environmentVariables.AWS_RAM_RESOURCE_TYPE = targetData.resourceType;
    }

    if (targetData.status) {
      environmentVariables.AWS_RAM_RESOURCE_SHARE_STATUS = targetData.status;
    }

    // Handle granular actions override or use multi-statement approach
    if (context.directive.actions) {
      // Granular actions provided: create single statement with resolved actions
      const resolvedActions = resolveActions(
        context.directive,
        context,
        (acc: string) => this.getRamResourceShareActionsForAccess(acc),
        'ram'
      );

      const statement = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: resolvedActions,
        resources: [targetData.resourceShareArn]
      });
      iamPolicies.push({
        statement,
        description: 'AWS RAM resource share access permissions (granular actions)',
        complianceRequirement: 'Least privilege IAM access'
      });
    } else {
      // Coarse access levels: use multi-statement approach (backward compatible)
      if (access === 'read' || access === 'readwrite') {
        iamPolicies.push({
          statement: new PolicyStatement({
            effect: Effect.ALLOW,
            actions: [
              'ram:GetResourceShare',
              'ram:ListResourceShares',
              'ram:GetResourceShareAssociations',
              'ram:ListResourceShareAssociations',
              'ram:GetResourceShareInvitations',
              'ram:ListResourceShareInvitations',
              'ram:ListPrincipals',
              'ram:ListResources'
            ],
            resources: [targetData.resourceShareArn]
          }),
          description: 'AWS RAM resource share read access',
          complianceRequirement: 'Least privilege IAM access for AWS RAM read operations'
        });
      }

      if (access === 'write' || access === 'readwrite' || access === 'admin') {
        iamPolicies.push({
          statement: new PolicyStatement({
            effect: Effect.ALLOW,
            actions: [
              'ram:CreateResourceShare',
              'ram:UpdateResourceShare',
              'ram:DeleteResourceShare',
              'ram:AssociateResourceShare',
              'ram:DisassociateResourceShare',
              'ram:AcceptResourceShareInvitation',
              'ram:RejectResourceShareInvitation'
            ],
            resources: [targetData.resourceShareArn]
          }),
          description: 'AWS RAM resource share write access',
          complianceRequirement: 'Least privilege IAM access for AWS RAM write operations'
        });

        // Resource share invitation acceptance/rejection
        if (targetData.invitationId) {
          iamPolicies.push({
            statement: new PolicyStatement({
              effect: Effect.ALLOW,
              actions: [
                'ram:AcceptResourceShareInvitation',
                'ram:RejectResourceShareInvitation',
                'ram:GetResourceShareInvitations'
              ],
              resources: [targetData.resourceShareArn]
            }),
            description: 'RAM resource share invitation management',
            complianceRequirement: 'Least privilege IAM access for resource share invitation operations'
          });
        }
      }

      // Admin access (full RAM permissions)
      if (access === 'admin' && options?.requireFullAdminAccess) {
        iamPolicies.push({
          statement: new PolicyStatement({
            effect: Effect.ALLOW,
            actions: ['ram:*'],
            resources: ['*']
          }),
          description: 'AWS RAM admin access',
          complianceRequirement: 'Full admin access to AWS RAM (requires explicit requireFullAdminAccess option)'
        });
      }
    }

    // Org-only sharing restriction
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
        description: 'Organizations access for org-only resource sharing',
        complianceRequirement: 'Least privilege IAM access for Organizations integration'
      });
    }

    // KMS encryption for shared resources
    if (options?.requireSecureAccess && targetData.kmsKeyId) {
      iamPolicies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
            'kms:Decrypt',
            'kms:DescribeKey',
            'kms:Encrypt',
            'kms:CreateGrant'
          ],
          resources: [targetData.kmsKeyId]
        }),
        description: 'KMS encryption for shared resources',
        complianceRequirement: 'Least privilege IAM access for KMS encryption'
      });
    }

    return {
      iamPolicies,
      environmentVariables,
      securityGroupRules: []
    };
  }

  /**
   * Bind to org:ram-share
   * 
   * @param context - Binding context
   * @param targetData - Expected structure:
   *   - resourceShareArn (required): string - Resource share ARN
   *   - orgId (optional): string - Organization ID
   *   - ouId (optional): string - Organizational Unit ID
   *   - resourceArn (optional): string - Shared resource ARN
   * @returns Enhanced binding result (without compliance block)
   */
  private async bindToOrgRamShare(
    context: BindingContext,
    targetData: any
  ): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    const { directive } = context;
    const { access, options } = directive;

    if (!targetData?.resourceShareArn) {
      throw new Error('Target component missing required resourceShareArn property for org:ram-share binding');
    }

    const iamPolicies: IamPolicy[] = [];
    const environmentVariables: Record<string, string> = {
      AWS_RAM_RESOURCE_SHARE_ARN: targetData.resourceShareArn
    };

    if (targetData.orgId) {
      environmentVariables.AWS_ORGANIZATIONS_ID = targetData.orgId;
    }

    if (targetData.ouId) {
      environmentVariables.AWS_ORGANIZATIONS_OU_ID = targetData.ouId;
    }

    if (targetData.resourceArn) {
      environmentVariables.AWS_RAM_RESOURCE_ARN = targetData.resourceArn;
    }

    // Handle granular actions override or use multi-statement approach
    if (context.directive.actions) {
      // Granular actions provided: create single statement with resolved actions
      const resolvedActions = resolveActions(
        context.directive,
        context,
        (acc: string) => this.getOrgRamShareActionsForAccess(acc),
        'ram'
      );

      const statement = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: resolvedActions,
        resources: [targetData.resourceShareArn, '*']
      });
      iamPolicies.push({
        statement,
        description: 'AWS RAM org-wide access permissions (granular actions)',
        complianceRequirement: 'Least privilege IAM access'
      });
    } else {
      // Coarse access levels: use multi-statement approach (backward compatible)
      if (access === 'read' || access === 'readwrite') {
        iamPolicies.push({
          statement: new PolicyStatement({
            effect: Effect.ALLOW,
            actions: [
              'ram:GetResourceShare',
              'ram:ListResourceShares',
              'ram:GetResourceShareAssociations',
              'organizations:DescribeOrganization',
              'organizations:ListAccounts',
              'organizations:ListOrganizationalUnitsForParent'
            ],
            resources: [targetData.resourceShareArn, '*']
          }),
          description: 'AWS RAM org-wide read access',
          complianceRequirement: 'Least privilege IAM access for AWS RAM org-wide read operations'
        });
      }

      if (access === 'write' || access === 'readwrite' || access === 'admin') {
        iamPolicies.push({
          statement: new PolicyStatement({
            effect: Effect.ALLOW,
            actions: [
              'ram:CreateResourceShare',
              'ram:UpdateResourceShare',
              'ram:AssociateResourceShare',
              'ram:DisassociateResourceShare',
              'organizations:DescribeOrganization',
              'organizations:ListAccounts',
              'organizations:ListOrganizationalUnitsForParent'
            ],
            resources: [targetData.resourceShareArn, '*']
          }),
          description: 'AWS RAM org-wide write access',
          complianceRequirement: 'Least privilege IAM access for AWS RAM org-wide write operations'
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
   * Get RAM resource share actions based on access level
   * Used by resolveActions to compute base actions from coarse access level
   * 
   * @param access - Access level (read, write, readwrite, admin)
   * @returns Array of IAM action strings
   */
  private getRamResourceShareActionsForAccess(access: string): string[] {
    switch (access) {
      case 'read':
        return [
          'ram:GetResourceShare',
          'ram:ListResourceShares',
          'ram:GetResourceShareAssociations',
          'ram:ListResourceShareAssociations',
          'ram:GetResourceShareInvitations',
          'ram:ListResourceShareInvitations',
          'ram:ListPrincipals',
          'ram:ListResources'
        ];
      case 'write':
        return [
          'ram:CreateResourceShare',
          'ram:UpdateResourceShare',
          'ram:DeleteResourceShare',
          'ram:AssociateResourceShare',
          'ram:DisassociateResourceShare',
          'ram:AcceptResourceShareInvitation',
          'ram:RejectResourceShareInvitation'
        ];
      case 'readwrite':
        return [
          'ram:GetResourceShare',
          'ram:ListResourceShares',
          'ram:GetResourceShareAssociations',
          'ram:ListResourceShareAssociations',
          'ram:GetResourceShareInvitations',
          'ram:ListResourceShareInvitations',
          'ram:ListPrincipals',
          'ram:ListResources',
          'ram:CreateResourceShare',
          'ram:UpdateResourceShare',
          'ram:DeleteResourceShare',
          'ram:AssociateResourceShare',
          'ram:DisassociateResourceShare',
          'ram:AcceptResourceShareInvitation',
          'ram:RejectResourceShareInvitation'
        ];
      case 'admin':
        return [
          'ram:*'
        ];
      default:
        throw new Error(`Unsupported RAM resource share access level: ${access}`);
    }
  }

  /**
   * Get org-wide RAM share actions based on access level
   * Used by resolveActions to compute base actions from coarse access level
   * Note: Organizations actions are kept separate for different resource
   * 
   * @param access - Access level (read, write, readwrite, admin)
   * @returns Array of IAM action strings (RAM actions only)
   */
  private getOrgRamShareActionsForAccess(access: string): string[] {
    switch (access) {
      case 'read':
        return [
          'ram:GetResourceShare',
          'ram:ListResourceShares',
          'ram:GetResourceShareAssociations'
        ];
      case 'write':
        return [
          'ram:CreateResourceShare',
          'ram:UpdateResourceShare',
          'ram:AssociateResourceShare',
          'ram:DisassociateResourceShare'
        ];
      case 'readwrite':
        return [
          'ram:GetResourceShare',
          'ram:ListResourceShares',
          'ram:GetResourceShareAssociations',
          'ram:CreateResourceShare',
          'ram:UpdateResourceShare',
          'ram:AssociateResourceShare',
          'ram:DisassociateResourceShare'
        ];
      case 'admin':
        return [
          'ram:*'
        ];
      default:
        throw new Error(`Unsupported org-wide RAM share access level: ${access}`);
    }
  }
}

