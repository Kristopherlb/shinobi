/**
 * GuardDutyBinderStrategy (Unified)
 * Handles security:guardduty-detector bindings with mandatory compliance enforcement
 */

import { UnifiedBinderStrategyBase } from '@shinobi/core';
import type { BindingContext, EnhancedBindingResult, CompatibilityEntry } from '@shinobi/core';
import type { IamPolicy } from '@shinobi/core';
import { PolicyStatement, Effect } from 'aws-cdk-lib/aws-iam';

export class GuardDutyBinderStrategy extends UnifiedBinderStrategyBase {
  readonly supportedCapabilities = ['security:guardduty-detector'];

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
        description: 'TODO: Add description for security:guardduty-detector binding',
        examples: ['TODO: Add examples']
      }
    ];
  }

  protected async doBind(context: BindingContext): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    const { source, target, directive } = context;
    const { capability } = directive;

    // Validate inputs
    if (!target) {
      throw new Error('Target component is required for security:guardduty-detector binding');
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

    return await this.bindToGuardDutyDetector(context, targetCapabilityData);
  }

  /**
   * Bind to security:guardduty-detector
   * 
   * @param context - Binding context
   * @param targetData - Target capability data
   * @returns Enhanced binding result (without compliance block)
   */
  private async bindToGuardDutyDetector(
    context: BindingContext,
    targetData: any
  ): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    const { source, directive } = context;
    const { access } = directive;

    const iamPolicies: IamPolicy[] = [];
    const environmentVariables: Record<string, string> = {};
    const securityGroupRules: any[] = [];

    // TODO: Implement IAM policy generation based on access level
    // Example:
    // if (access === 'read' || access === 'readwrite') {
    //   iamPolicies.push({
    //     statements: [
    //       new PolicyStatement({
    //         effect: Effect.ALLOW,
    //         actions: ['security:guardduty-detector:Get*', 'security:guardduty-detector:Describe*'],
    //         resources: [targetData.resources?.arn || '*'],
    //       }),
    //     ],
    //     complianceRequirement: 'TODO: Add compliance requirement string',
    //   });
    // }

    // TODO: Add environment variables
    // Example:
    // if (targetData.resources?.arn) {
    //   environmentVariables['<%= mainCapability.toUpperCase().replace(/:/g, '_') %>_ARN'] = targetData.resources.arn;
    // }

    return {
      iamPolicies,
      environmentVariables,
      securityGroupRules,
    };
  }
}

