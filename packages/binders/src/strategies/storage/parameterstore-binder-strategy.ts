/**
 * ParameterStoreBinderStrategy (Unified)
 * Handles ssm:parameter bindings with mandatory compliance enforcement
 */

import { UnifiedBinderStrategyBase } from '@shinobi/core';
import type { BindingContext, EnhancedBindingResult, CompatibilityEntry } from '@shinobi/core';
import type { IamPolicy } from '@shinobi/core';
import { PolicyStatement, Effect } from 'aws-cdk-lib/aws-iam';

export class ParameterStoreBinderStrategy extends UnifiedBinderStrategyBase {
  readonly supportedCapabilities = ['ssm:parameter'];

  getStrategyName(): string {
    return 'ParameterStoreBinderStrategy';
  }

  canHandle(sourceType: string, targetCapability: string): boolean {
    return this.supportedCapabilities.includes(targetCapability);
  }

  getCompatibilityMatrix(): CompatibilityEntry[] {
    return [
      {
        sourceType: '*',
        targetType: '*',
        capability: 'ssm:parameter',
        supportedAccess: ['read', 'write'],
        description: 'Bind to Systems Manager Parameter Store parameters for read-only access or parameter management (create/update/delete)',
        examples: ['lambda-config -> ssm:parameter (read)', 'lambda-config-manager -> ssm:parameter (write)']
      }
    ];
  }

  protected async doBind(context: BindingContext): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    const { source, target, directive } = context;
    const { capability } = directive;

    // Validate inputs
    if (!target) {
      throw new Error('Target component is required for ssm:parameter binding');
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

    return await this.bindToParameter(context, targetCapabilityData);
  }

  /**
   * Bind to ssm:parameter
   * 
   * @param context - Binding context
   * @param targetData - Expected structure (ParameterStoreCapabilityData):
   *   - type: 'ssm:parameter'
   *   - resources (required): { parameterName: string, parameterArn?: string }
   *   - parameterType (optional): string - Parameter type ('String', 'StringList', 'SecureString')
   *   - value (optional): string - Parameter value (usually not provided for security)
   *   - description (optional): string - Parameter description
   *   - keyId (optional): string - KMS key ID for SecureString parameters
   *   - version (optional): number - Parameter version
   *   - tier (optional): string - Parameter tier ('Standard', 'Advanced', 'Intelligent-Tiering')
   * @returns Enhanced binding result (without compliance block)
   */
  private async bindToParameter(
    context: BindingContext,
    targetData: any
  ): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    // Validate required target properties
    if (!targetData?.resources?.parameterName) {
      throw new Error('Target component missing required resources.parameterName property for Parameter Store binding');
    }

    const { directive } = context;
    const { access } = directive;

    // Validate access level (Parameter Store only supports read and write)
    if (access !== 'read' && access !== 'write') {
      throw new Error(`Invalid access level for Parameter Store: ${access}. Only 'read' and 'write' are supported`);
    }

    const iamPolicies: IamPolicy[] = [];
    const environmentVariables: Record<string, string> = {};
    const parameterName = targetData.resources.parameterName;
    const parameterArn = targetData.resources.parameterArn || `arn:aws:ssm:*:*:parameter/${parameterName}`;

    // Determine IAM actions based on access level
    let actions: string[] = [];
    
    if (access === 'read') {
      // Read access: Get parameters
      actions.push(
        'ssm:GetParameter',
        'ssm:GetParameters',
        'ssm:GetParametersByPath',
        'ssm:DescribeParameters',
        'ssm:GetParameterHistory',
        'ssm:GetParameterHistory'
      );
    }

    if (access === 'write') {
      // Write access: Manage parameters
      actions.push(
        'ssm:GetParameter',
        'ssm:GetParameters',
        'ssm:GetParametersByPath',
        'ssm:DescribeParameters',
        'ssm:PutParameter',
        'ssm:DeleteParameter',
        'ssm:DeleteParameters',
        'ssm:LabelParameterVersion',
        'ssm:RemoveTagsFromResource',
        'ssm:AddTagsToResource'
      );
    }

    // Create IAM policy
    if (actions.length > 0) {
      iamPolicies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [...new Set(actions)], // Remove duplicates
          resources: [parameterArn]
        }),
        description: `Parameter Store parameter ${access} access`,
        complianceRequirement: `Least privilege IAM access for Parameter Store parameter ${access} operations`
      });

      // If parameter is SecureString, grant KMS decrypt permissions
      if (targetData.parameterType === 'SecureString' && targetData.keyId) {
        iamPolicies.push({
          statement: new PolicyStatement({
            effect: Effect.ALLOW,
            actions: ['kms:Decrypt', 'kms:DescribeKey'],
            resources: [targetData.keyId]
          }),
          description: 'KMS decrypt permissions for SecureString parameter',
          complianceRequirement: 'KMS access for encrypted Parameter Store parameters'
        });
      }
    }

    // Set environment variables
    environmentVariables['SSM_PARAMETER_NAME'] = parameterName;
    
    if (targetData.resources.parameterArn) {
      environmentVariables['SSM_PARAMETER_ARN'] = targetData.resources.parameterArn;
    }
    
    if (targetData.parameterType) {
      environmentVariables['SSM_PARAMETER_TYPE'] = targetData.parameterType;
    }
    
    if (targetData.description) {
      environmentVariables['SSM_PARAMETER_DESCRIPTION'] = targetData.description;
    }
    
    if (targetData.keyId) {
      environmentVariables['SSM_PARAMETER_KEY_ID'] = targetData.keyId;
    }
    
    if (targetData.version !== undefined) {
      environmentVariables['SSM_PARAMETER_VERSION'] = targetData.version.toString();
    }
    
    if (targetData.tier) {
      environmentVariables['SSM_PARAMETER_TIER'] = targetData.tier;
    }

    // Note: Parameter value is intentionally NOT included in environment variables for security reasons
    // Applications should use AWS SDK to retrieve parameter values at runtime

    return {
      iamPolicies,
      environmentVariables,
      securityGroupRules: [],
    };
  }
}

