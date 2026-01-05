/**
 * ControlTowerBinderStrategy (Unified)
 * Handles governance:control-tower bindings with mandatory compliance enforcement
 */

import { UnifiedBinderStrategyBase, resolveActions } from '@shinobi/core';
import type { BindingContext, EnhancedBindingResult, CompatibilityEntry } from '@shinobi/core';
import type { IamPolicy } from '@shinobi/core';
import { PolicyStatement, Effect } from 'aws-cdk-lib/aws-iam';

export class ControlTowerBinderStrategy extends UnifiedBinderStrategyBase {
  readonly supportedCapabilities = ['governance:control-tower'];

  getStrategyName(): string {
    return 'ControlTowerBinderStrategy';
  }

  canHandle(sourceType: string, targetCapability: string): boolean {
    return this.supportedCapabilities.includes(targetCapability);
  }

  getCompatibilityMatrix(): CompatibilityEntry[] {
    return [
      {
        sourceType: '*',
        targetType: '*',
        capability: 'governance:control-tower',
        supportedAccess: ['read', 'write', 'admin'],
        description: 'Bind to AWS Control Tower for landing zone management and guardrails',
        examples: ['lambda-governance -> governance:control-tower (read)', 'lambda-platform -> governance:control-tower (admin)']
      }
    ];
  }

  protected async doBind(context: BindingContext): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    const { source, target, directive } = context;
    const { capability } = directive;

    // Validate inputs
    if (!target) {
      throw new Error('Target component is required for governance:control-tower binding');
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

    return await this.bindToControlTower(context, targetCapabilityData);
  }

  /**
   * Bind to governance:control-tower
   * 
   * @param context - Binding context
   * @param targetData - Expected structure:
   *   - landingZoneArn (required): string - Landing zone ARN
   *   - landingZoneId (optional): string - Landing zone ID
   *   - baselineVersion (optional): string - Baseline version
   *   - controlStatuses (optional): object - Control statuses (JSON)
   *   - orgId (optional): string - Organization ID
   *   - guardrailStatus (optional): string - Guardrail status (ENABLED, DISABLED, PENDING)
   *   - controlOperationId (optional): string - Control operation ID
   *   - delegatedAdminAccountId (optional): string - Delegated admin account ID
   *   - enabledControls (optional): string[] - List of enabled control ARNs
   * @returns Enhanced binding result (without compliance block)
   */
  private async bindToControlTower(
    context: BindingContext,
    targetData: any
  ): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    const { directive } = context;
    const { access, options } = directive;

    if (!targetData?.landingZoneArn) {
      throw new Error('Target component missing required landingZoneArn property for governance:control-tower binding');
    }

    const iamPolicies: IamPolicy[] = [];
    const environmentVariables: Record<string, string> = {
      AWS_CONTROL_TOWER_LANDING_ZONE_ARN: targetData.landingZoneArn
    };

    if (targetData.landingZoneId) {
      environmentVariables.AWS_CONTROL_TOWER_LANDING_ZONE_ID = targetData.landingZoneId;
    }

    if (targetData.baselineVersion) {
      environmentVariables.AWS_CONTROL_TOWER_BASELINE_VERSION = targetData.baselineVersion;
    }

    if (targetData.controlStatuses) {
      environmentVariables.AWS_CONTROL_TOWER_CONTROL_STATUSES = JSON.stringify(targetData.controlStatuses);
    }

    if (targetData.orgId) {
      environmentVariables.AWS_ORGANIZATIONS_ID = targetData.orgId;
    }

    if (targetData.guardrailStatus) {
      environmentVariables.AWS_CONTROL_TOWER_GUARDRAIL_STATUS = targetData.guardrailStatus;
    }

    if (targetData.controlOperationId) {
      environmentVariables.AWS_CONTROL_TOWER_CONTROL_OPERATION_ID = targetData.controlOperationId;
    }

    if (targetData.delegatedAdminAccountId) {
      environmentVariables.AWS_CONTROL_TOWER_DELEGATED_ADMIN_ACCOUNT_ID = targetData.delegatedAdminAccountId;
    }

    if (targetData.enabledControls && Array.isArray(targetData.enabledControls)) {
      environmentVariables.AWS_CONTROL_TOWER_ENABLED_CONTROLS = targetData.enabledControls.join(',');
    }

    // Handle granular actions override or use multi-statement approach
    if (context.directive.actions) {
      // Granular actions provided: create single statement with resolved actions
      const resolvedActions = resolveActions(
        context.directive,
        context,
        (acc: string) => this.getControlTowerActionsForAccess(acc),
        'controltower'
      );

      const statement = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: resolvedActions,
        resources: [targetData.landingZoneArn]
      });
      iamPolicies.push({
        statement,
        description: 'Control Tower access permissions (granular actions)',
        complianceRequirement: 'Least privilege IAM access'
      });
    } else {
      // Coarse access levels: use multi-statement approach (backward compatible)
      if (access === 'read' || access === 'readwrite') {
        iamPolicies.push({
          statement: new PolicyStatement({
            effect: Effect.ALLOW,
            actions: [
              'controltower:GetLandingZone',
              'controltower:ListLandingZones',
              'controltower:GetControlOperation',
              'controltower:ListEnabledControls',
              'controltower:GetEnabledControl',
              'controltower:ListBaselines'
            ],
            resources: [targetData.landingZoneArn]
          }),
          description: 'Control Tower read access',
          complianceRequirement: 'Least privilege IAM access for Control Tower read operations'
        });
      }

      if (access === 'write' || access === 'readwrite' || access === 'admin') {
        iamPolicies.push({
          statement: new PolicyStatement({
            effect: Effect.ALLOW,
            actions: [
              'controltower:CreateLandingZone',
              'controltower:UpdateLandingZone',
              'controltower:DeleteLandingZone',
              'controltower:EnableControl',
              'controltower:DisableControl',
              'controltower:CreateAccount',
              'controltower:UpdateAccount',
              'controltower:DeleteAccount'
            ],
            resources: [targetData.landingZoneArn]
          }),
          description: 'Control Tower write access',
          complianceRequirement: 'Least privilege IAM access for Control Tower write operations'
        });
      }

      // Admin access (full Control Tower permissions)
      if (access === 'admin' && options?.requireFullAdminAccess) {
        iamPolicies.push({
          statement: new PolicyStatement({
            effect: Effect.ALLOW,
            actions: ['controltower:*'],
            resources: ['*']
          }),
          description: 'Control Tower admin access',
          complianceRequirement: 'Full admin access to Control Tower (requires explicit requireFullAdminAccess option)'
        });
      }
    }

    // Guardrail status and control operation exposure
    if (targetData.guardrailStatus || targetData.controlOperationId) {
      if (access === 'read' || access === 'readwrite') {
        iamPolicies.push({
          statement: new PolicyStatement({
            effect: Effect.ALLOW,
            actions: [
              'controltower:GetGuardrail',
              'controltower:ListGuardrails',
              'controltower:GetControlOperation',
              'controltower:ListControlOperations'
            ],
            resources: [targetData.landingZoneArn]
          }),
          description: 'Control Tower guardrail and control operation read access',
          complianceRequirement: 'Least privilege IAM access for guardrail and control operation read operations'
        });
      }
    }

    // Delegated admin and baseline version enforcement
    if (targetData.delegatedAdminAccountId || options?.requireSecureAccess) {
      iamPolicies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
            'controltower:EnableControl',
            'controltower:DisableControl',
            'controltower:GetEnabledControl'
          ],
          resources: [targetData.landingZoneArn]
        }),
        description: 'Control Tower delegated admin and baseline enforcement',
        complianceRequirement: 'Least privilege IAM access for delegated admin operations'
      });
    }

    // Enabled controls list
    if (targetData.enabledControls && (access === 'read' || access === 'readwrite')) {
      iamPolicies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
            'controltower:ListEnabledControls',
            'controltower:GetEnabledControl'
          ],
          resources: [targetData.landingZoneArn]
        }),
        description: 'Control Tower enabled controls list access',
        complianceRequirement: 'Least privilege IAM access for enabled controls read operations'
      });
    }

    // Organizations integration for account factory
    if (options?.requireSecureAccess) {
      iamPolicies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
            'organizations:DescribeOrganization',
            'organizations:ListAccounts',
            'organizations:ListOrganizationalUnitsForParent',
            'organizations:CreateAccount',
            'organizations:InviteAccountToOrganization'
          ],
          resources: ['*']
        }),
        description: 'Organizations access for Control Tower account factory',
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
   * Get Control Tower actions based on access level
   * Used by resolveActions to compute base actions from coarse access level
   * 
   * @param access - Access level (read, write, readwrite, admin)
   * @returns Array of IAM action strings
   */
  private getControlTowerActionsForAccess(access: string): string[] {
    switch (access) {
      case 'read':
        return [
          'controltower:GetLandingZone',
          'controltower:ListLandingZones',
          'controltower:GetControlOperation',
          'controltower:ListEnabledControls',
          'controltower:GetEnabledControl',
          'controltower:ListBaselines'
        ];
      case 'write':
        return [
          'controltower:CreateLandingZone',
          'controltower:UpdateLandingZone',
          'controltower:DeleteLandingZone',
          'controltower:EnableControl',
          'controltower:DisableControl',
          'controltower:CreateAccount',
          'controltower:UpdateAccount',
          'controltower:DeleteAccount'
        ];
      case 'readwrite':
        return [
          'controltower:GetLandingZone',
          'controltower:ListLandingZones',
          'controltower:GetControlOperation',
          'controltower:ListEnabledControls',
          'controltower:GetEnabledControl',
          'controltower:ListBaselines',
          'controltower:CreateLandingZone',
          'controltower:UpdateLandingZone',
          'controltower:DeleteLandingZone',
          'controltower:EnableControl',
          'controltower:DisableControl',
          'controltower:CreateAccount',
          'controltower:UpdateAccount',
          'controltower:DeleteAccount'
        ];
      case 'admin':
        return [
          'controltower:*'
        ];
      default:
        throw new Error(`Unsupported Control Tower access level: ${access}`);
    }
  }
}

