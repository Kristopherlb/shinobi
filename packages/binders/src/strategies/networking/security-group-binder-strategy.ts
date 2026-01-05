/**
 * Security Group Binder Strategy (Unified)
 * Handles AWS Security Group bindings with mandatory compliance enforcement
 * Supports imported security groups (security-group:import) and security group aliases
 *
 * Design Philosophy:
 * This strategy focuses on exposing security group IDs and metadata via environment variables,
 * rather than generating security group rules. Rule creation is handled separately:
 * - At the component level (components add security groups to their constructs)
 * - Via patches (for cross-component rule creation)
 * - By other binder strategies (e.g., Service Connect, RDS, EFS)
 *
 * This separation enables:
 * - Cross-account/cross-region security group references (no CDK construct dependencies)
 * - Clear separation between ID exposure and rule management
 * - Consistent pattern with other network bindings (RDS, EFS, Neptune)
 */

import { UnifiedBinderStrategyBase, resolveActions } from '@shinobi/core';
import type { BindingContext, EnhancedBindingResult, CompatibilityEntry } from '@shinobi/core';
import type { IamPolicy } from '@shinobi/core';
import { PolicyStatement, Effect } from 'aws-cdk-lib/aws-iam';

/**
 * Security Group Import capability data structure
 * @property type - Capability type identifier
 * @property securityGroupId - Security group ID (required)
 * @property ssmParameterName - SSM parameter name containing the security group ID (optional)
 * @property vpcId - VPC ID where the security group exists (optional)
 * @property region - AWS region where the security group exists (optional)
 * @property accountId - AWS account ID where the security group exists (optional)
 */
interface SecurityGroupImportCapabilityData {
  type: 'security-group:import';
  securityGroupId: string;
  ssmParameterName?: string;
  vpcId?: string;
  region?: string;
  accountId?: string;
}

type SecurityGroupCapabilityData = SecurityGroupImportCapabilityData;

export class SecurityGroupBinderStrategy extends UnifiedBinderStrategyBase {
  readonly supportedCapabilities = [
    'security-group:import',
    'security:security-group'
    // Note: vpc:security-group is handled by VpcBinderStrategy
  ];

  getStrategyName(): string {
    return 'Security Group Binder Strategy';
  }

  canHandle(sourceType: string, targetCapability: string): boolean {
    return this.supportedCapabilities.includes(targetCapability);
  }

  getCompatibilityMatrix(): CompatibilityEntry[] {
    return [
      {
        sourceType: '*',
        targetType: 'security-group-import',
        capability: 'security-group:import',
        supportedAccess: ['read'],
        description: 'Bind to imported security group for network access',
        examples: ['lambda-api -> security-group:import (read)', 'ecs-fargate-service -> security-group:import (read)']
      },
      {
        sourceType: '*',
        targetType: '*',
        capability: 'security:security-group',
        supportedAccess: ['read'],
        description: 'Bind to security group (alias for security-group:import)',
        examples: ['ec2-instance -> security:security-group (read)']
      }
    ];
  }

  protected async doBind(context: BindingContext): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    const { source, target, directive } = context;

    // Validate inputs
    if (!target) {
      throw new Error('Target component is required for Security Group binding');
    }
    if (!source) {
      throw new Error('Source component is required for Security Group binding');
    }

    // Get target capability data
    const targetCapabilities = target.getCapabilities();
    const targetCapabilityData = targetCapabilities[directive.capability];
    if (!targetCapabilityData) {
      throw new Error(`Target component does not provide capability '${directive.capability}'`);
    }

    // Validate capability data structure
    if (!this.isSecurityGroupCapabilityData(targetCapabilityData, directive.capability)) {
      throw new Error(`Invalid Security Group capability data structure for capability '${directive.capability}'`);
    }

    const iamPolicies: IamPolicy[] = [];
    const environmentVariables: Record<string, string> = {};

    // Get security group ID (required)
    const securityGroupId = targetCapabilityData.securityGroupId;
    if (!securityGroupId) {
      throw new Error(`Security Group capability is missing securityGroupId for capability '${directive.capability}'`);
    }

    // Set environment variables
    environmentVariables['SECURITY_GROUP_ID'] = securityGroupId;

    if (targetCapabilityData.vpcId) {
      environmentVariables['SECURITY_GROUP_VPC_ID'] = targetCapabilityData.vpcId;
    }

    if (this.isSecurityGroupImportCapabilityData(targetCapabilityData)) {
      // Security Group Import specific environment variables
      if (targetCapabilityData.ssmParameterName) {
        environmentVariables['SECURITY_GROUP_SSM_PARAMETER'] = targetCapabilityData.ssmParameterName;
      }
      if (targetCapabilityData.region) {
        environmentVariables['SECURITY_GROUP_REGION'] = targetCapabilityData.region;
      }
      if (targetCapabilityData.accountId) {
        environmentVariables['SECURITY_GROUP_ACCOUNT_ID'] = targetCapabilityData.accountId;
      }
    }

    // Optional: Add EC2 describe permissions for runtime validation/discovery
    // This is useful when components need to validate security group existence or query metadata
    if (directive.options?.includeDiscovery === true) {
      // Resolve actions (granular override or coarse access)
      const resolvedActions = resolveActions(
        context.directive,
        context,
        (acc: string) => this.getSecurityGroupDiscoveryActionsForAccess(acc),
        'ec2'
      );

      if (resolvedActions.length > 0) {
        iamPolicies.push({
          statement: new PolicyStatement({
            effect: Effect.ALLOW,
            actions: resolvedActions,
            resources: [`arn:aws:ec2:*:*:security-group/${securityGroupId}`]
          }),
          description: 'Security group discovery and validation permissions',
          complianceRequirement: 'Security group metadata access for runtime validation'
        });
      }
    }

    // Note: Security group rules (ingress/egress) are not generated here because the SecurityGroupRule
    // interface doesn't specify which security group the rule applies to. Rules must be applied via
    // patches or by components directly using CDK SecurityGroup constructs.
    //
    // For security group bindings, this strategy primarily:
    // 1. Provides security group IDs and metadata via environment variables
    // 2. Enables components to reference security groups in their configuration
    // 3. Supports compliance validation (network isolation, least-privilege)
    //
    // Actual rule creation is the responsibility of:
    // - Consuming components (components add security groups to their constructs directly)
    // - Patches (for cross-component rule creation)
    // - Other binder strategies (e.g., Service Connect, RDS, EFS when they create rules)
    //
    // This separation of concerns ensures that:
    // - Imported security groups are referenced by ID (no direct CDK construct access needed)
    // - Rule management remains at the appropriate level (component or patch)
    // - Cross-account/cross-region security groups can be referenced without construct dependencies

    return {
      iamPolicies,
      environmentVariables,
      securityGroupRules: [] // Network binding (security group rules) handled separately or via patches
    };
  }

  /**
   * Type guard for Security Group Import capability data
   */
  private isSecurityGroupImportCapabilityData(data: unknown): data is SecurityGroupImportCapabilityData {
    if (!data || typeof data !== 'object') return false;
    const d = data as Record<string, unknown>;
    return d.type === 'security-group:import' && typeof d.securityGroupId === 'string';
  }

  /**
   * Type guard for Security Group capability data
   */
  private isSecurityGroupCapabilityData(data: unknown, capability: string): data is SecurityGroupCapabilityData {
    if (!data || typeof data !== 'object') return false;

    // Handle both security-group:import and security:security-group (alias)
    if (capability === 'security-group:import' || capability === 'security:security-group') {
      return this.isSecurityGroupImportCapabilityData(data);
    }

    return false;
  }

  /**
   * Get Security Group discovery actions based on access level
   * Used by resolveActions to compute base actions from coarse access level
   * 
   * @param access - Access level (read)
   * @returns Array of IAM action strings
   */
  private getSecurityGroupDiscoveryActionsForAccess(access: string): string[] {
    if (access === 'read') {
      return [
        'ec2:DescribeSecurityGroups',
        'ec2:DescribeSecurityGroupRules'
      ];
    }
    return [];
  }
}

