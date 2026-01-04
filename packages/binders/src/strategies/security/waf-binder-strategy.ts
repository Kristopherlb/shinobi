/**
 * WafBinderStrategy (Unified)
 * Handles security:waf bindings with mandatory compliance enforcement
 */

import { UnifiedBinderStrategyBase, resolveActions } from '@shinobi/core';
import type { BindingContext, EnhancedBindingResult, CompatibilityEntry } from '@shinobi/core';
import type { IamPolicy } from '@shinobi/core';
import { PolicyStatement, Effect } from 'aws-cdk-lib/aws-iam';

export class WafBinderStrategy extends UnifiedBinderStrategyBase {
  readonly supportedCapabilities = ['security:waf'];

  getStrategyName(): string {
    return 'WafBinderStrategy';
  }

  canHandle(sourceType: string, targetCapability: string): boolean {
    return this.supportedCapabilities.includes(targetCapability);
  }

  getCompatibilityMatrix(): CompatibilityEntry[] {
    return [
      {
        sourceType: '*',
        targetType: '*',
        capability: 'security:waf',
        supportedAccess: ['read', 'write', 'admin'],
        description: 'Bind to WAF Web ACL for web application firewall protection',
        examples: ['api-gateway -> security:waf (read)', 'alb -> security:waf (read)', 'app-runner -> security:waf (read)']
      }
    ];
  }

  protected async doBind(context: BindingContext): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    const { source, target, directive } = context;
    const { capability } = directive;

    // Validate inputs
    if (!target) {
      throw new Error('Target component is required for security:waf binding');
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

    return await this.bindToWaf(context, targetCapabilityData);
  }

  /**
   * Bind to WAF Web ACL
   * 
   * @param context - Binding context
   * @param targetData - Expected structure:
   *   - webAclArn (required): string - ARN of the WAF Web ACL
   *   - webAclId (optional): string - ID of the WAF Web ACL
   *   - scope (optional): string - Scope of the Web ACL (CLOUDFRONT or REGIONAL)
   *   - defaultAction (optional): string - Default action (allow or block)
   *   - webAclName (optional): string - Name of the Web ACL
   *   - managedRuleGroups (optional): number - Count of managed rule groups
   *   - customRules (optional): number - Count of custom rules
   *   - loggingDestinationArn (optional): string - ARN of logging destination (CloudWatch/S3/Kinesis)
   *   - loggingEnabled (optional): boolean - Whether logging is enabled
   *   - loggingDestinationType (optional): string - Type of logging destination (cloudwatch/s3/kinesis-firehose)
   * @returns Enhanced binding result (without compliance block)
   */
  private async bindToWaf(
    context: BindingContext,
    targetData: any
  ): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    const { source, directive } = context;
    const { access, options } = directive;

    // Validate required target properties
    if (!targetData?.webAclArn) {
      throw new Error('Target component missing required webAclArn property for WAF binding');
    }

    const iamPolicies: IamPolicy[] = [];
    const environmentVariables: Record<string, string> = {};
    const securityGroupRules: any[] = [];

    // Handle granular actions override or use multi-statement approach
    if (context.directive.actions) {
      const resolvedActions = resolveActions(
        context.directive,
        context,
        (acc) => this.getWafActionsForAccess(acc, options),
        'wafv2'
      );

      const statement = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: resolvedActions,
        resources: [targetData.webAclArn]
      });
      iamPolicies.push({
        statement,
        description: 'WAF Web ACL access permissions (granular actions)',
        complianceRequirement: 'Least privilege IAM access'
      });
    } else {
      // Coarse access levels: use multi-statement approach (backward compatible)
      // Grant WAF read permissions
      if (access === 'read' || access === 'write' || access === 'admin' || access === 'readwrite') {
      const statement = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          'wafv2:GetWebACL',
          'wafv2:GetWebACLForResource',
          'wafv2:ListResourcesForWebACL'
        ],
        resources: [targetData.webAclArn]
      });
      iamPolicies.push({
        statement,
        description: 'WAF Web ACL read permissions',
        complianceRequirement: 'Least privilege IAM access'
      });
    }

    // Grant WAF write permissions (associate/disassociate) - UpdateWebACL gated behind option
    if (access === 'write' || access === 'admin' || access === 'readwrite') {
      const writeActions = [
        'wafv2:AssociateWebACL',
        'wafv2:DisassociateWebACL'
      ];

      // Include UpdateWebACL only if option is set
      if (options?.allowWebAclUpdates === true) {
        writeActions.push('wafv2:UpdateWebACL');
      }

      const statement = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: writeActions,
        resources: [targetData.webAclArn]
      });
      iamPolicies.push({
        statement,
        description: options?.allowWebAclUpdates === true
          ? 'WAF Web ACL write permissions (including updates)'
          : 'WAF Web ACL write permissions (associate/disassociate only)',
        complianceRequirement: 'Least privilege IAM access'
      });
    }

    // Grant WAF admin permissions (create, delete) - gated behind option
    if (access === 'admin' && options?.allowWebAclManagement === true) {
      const statement = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          'wafv2:CreateWebACL',
          'wafv2:DeleteWebACL'
        ],
        resources: [targetData.webAclArn]
      });
      iamPolicies.push({
        statement,
        description: 'WAF Web ACL admin permissions (create/delete)',
        complianceRequirement: 'Least privilege IAM access - Web ACL management gated behind allowWebAclManagement option'
      });
    }
    }

    // Grant WAF logging permissions if logging is enabled
    if (targetData.loggingEnabled && targetData.loggingDestinationArn) {
      const loggingActions: string[] = ['wafv2:GetLoggingConfiguration', 'wafv2:ListLoggingConfigurations'];

      // Add write permissions for logging configuration if write/admin access
      if (access === 'write' || access === 'admin' || access === 'readwrite') {
        loggingActions.push('wafv2:PutLoggingConfiguration', 'wafv2:DeleteLoggingConfiguration');
      }

      const statement = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: loggingActions,
        resources: [targetData.webAclArn]
      });
      iamPolicies.push({
        statement,
        description: 'WAF logging configuration permissions',
        complianceRequirement: 'Least privilege IAM access'
      });

      // Grant permissions to write to logging destination based on type
      if (targetData.loggingDestinationType === 'cloudwatch' && targetData.loggingDestinationArn) {
        const logsStatement = new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ['logs:CreateLogStream', 'logs:PutLogEvents'],
          resources: [targetData.loggingDestinationArn]
        });
        iamPolicies.push({
          statement: logsStatement,
          description: 'CloudWatch Logs permissions for WAF logging',
          complianceRequirement: 'Least privilege IAM access'
        });
      } else if (targetData.loggingDestinationType === 's3' && targetData.loggingDestinationArn) {
        const s3Statement = new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ['s3:PutObject'],
          resources: [`${targetData.loggingDestinationArn}/*`]
        });
        iamPolicies.push({
          statement: s3Statement,
          description: 'S3 permissions for WAF logging',
          complianceRequirement: 'Least privilege IAM access'
        });
      } else if (targetData.loggingDestinationType === 'kinesis-firehose' && targetData.loggingDestinationArn) {
        const firehoseStatement = new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ['firehose:PutRecord', 'firehose:PutRecordBatch'],
          resources: [targetData.loggingDestinationArn]
        });
        iamPolicies.push({
          statement: firehoseStatement,
          description: 'Kinesis Firehose permissions for WAF logging',
          complianceRequirement: 'Least privilege IAM access'
        });
      }
    }

    // Set environment variables
    environmentVariables['WAF_WEB_ACL_ARN'] = targetData.webAclArn;
    
    if (targetData.webAclId) {
      environmentVariables['WAF_WEB_ACL_ID'] = targetData.webAclId;
    }
    
    if (targetData.scope) {
      environmentVariables['WAF_WEB_ACL_SCOPE'] = targetData.scope;
    }
    
    if (targetData.defaultAction) {
      environmentVariables['WAF_WEB_ACL_DEFAULT_ACTION'] = targetData.defaultAction;
    }
    
    if (targetData.webAclName) {
      environmentVariables['WAF_WEB_ACL_NAME'] = targetData.webAclName;
    }

    // Expose rule group information
    if (targetData.managedRuleGroups !== undefined) {
      environmentVariables['WAF_WEB_ACL_MANAGED_RULE_GROUPS_COUNT'] = targetData.managedRuleGroups.toString();
    }

    if (targetData.customRules !== undefined) {
      environmentVariables['WAF_WEB_ACL_CUSTOM_RULES_COUNT'] = targetData.customRules.toString();
    }

    const totalRules = (targetData.managedRuleGroups || 0) + (targetData.customRules || 0);
    if (totalRules > 0) {
      environmentVariables['WAF_WEB_ACL_TOTAL_RULES_COUNT'] = totalRules.toString();
    }

    // Expose logging configuration
    if (targetData.loggingEnabled !== undefined) {
      environmentVariables['WAF_WEB_ACL_LOGGING_ENABLED'] = targetData.loggingEnabled ? 'true' : 'false';
    }

    if (targetData.loggingDestinationArn) {
      environmentVariables['WAF_WEB_ACL_LOGGING_DESTINATION_ARN'] = targetData.loggingDestinationArn;
    }

    if (targetData.loggingDestinationType) {
      environmentVariables['WAF_WEB_ACL_LOGGING_DESTINATION_TYPE'] = targetData.loggingDestinationType;
    }

    return {
      iamPolicies,
      environmentVariables,
      securityGroupRules,
    };
  }

  /**
   * Get WAF actions based on access level
   * Used by resolveActions to compute base actions from coarse access level
   */
  private getWafActionsForAccess(access: string, options?: Record<string, any>): string[] {
    const actions: string[] = [];

    switch (access) {
      case 'read':
      case 'readwrite':
      case 'write':
      case 'admin':
        actions.push(
          'wafv2:GetWebACL',
          'wafv2:GetWebACLForResource',
          'wafv2:ListResourcesForWebACL'
        );
        break;
    }

    if (access === 'write' || access === 'admin' || access === 'readwrite') {
      actions.push(
        'wafv2:AssociateWebACL',
        'wafv2:DisassociateWebACL'
      );

      if (options?.allowWebAclUpdates === true) {
        actions.push('wafv2:UpdateWebACL');
      }
    }

    if (access === 'admin' && options?.allowWebAclManagement === true) {
      actions.push(
        'wafv2:CreateWebACL',
        'wafv2:DeleteWebACL'
      );
    }

    if (actions.length === 0) {
      throw new Error(`Unsupported WAF access level: ${access}`);
    }

    return actions;
  }
}

