/**
 * ConfigBinderStrategy (Unified)
 * Handles AWS Config bindings with mandatory compliance enforcement
 * 
 * Supports:
 * - Managed and custom Config rules
 * - Remediation via SSM Automation documents
 * - Rule parameters and evaluation triggers
 * - Org aggregator support for cross-account compliance views
 * - Compliance status reporting
 */

import { UnifiedBinderStrategyBase } from '@shinobi/core';
import type { BindingContext, EnhancedBindingResult, CompatibilityEntry } from '@shinobi/core';
import type { IamPolicy } from '@shinobi/core';
import { PolicyStatement, Effect } from 'aws-cdk-lib/aws-iam';

export class ConfigBinderStrategy extends UnifiedBinderStrategyBase {
  readonly supportedCapabilities = ['compliance:config-rule'];

  getStrategyName(): string {
    return 'ConfigBinderStrategy';
  }

  canHandle(sourceType: string, targetCapability: string): boolean {
    return this.supportedCapabilities.includes(targetCapability);
  }

  getCompatibilityMatrix(): CompatibilityEntry[] {
    return [
      {
        sourceType: '*',
        targetType: '*',
        capability: 'compliance:config-rule',
        supportedAccess: ['read', 'write', 'admin'],
        description: 'Bind to AWS Config rules for compliance monitoring and enforcement',
        examples: ['lambda-compliance -> compliance:config-rule (read)', 'lambda-governance -> compliance:config-rule (write)']
      }
    ];
  }

  protected async doBind(context: BindingContext): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    const { source, target, directive } = context;
    const { capability } = directive;

    // Validate inputs
    if (!target) {
      throw new Error('Target component is required for compliance:config-rule binding');
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

    return await this.bindToConfigRule(context, targetCapabilityData);
  }

  /**
   * Bind to compliance:config-rule
   * 
   * @param context - Binding context
   * @param targetData - Expected structure:
   *   - configRuleName (required): string - Config rule name
   *   - configRuleArn (optional): string - Config rule ARN
   *   - aggregatorArn (optional): string - Config aggregator ARN (if org-wide)
   *   - remediationActionArn (optional): string - Remediation action ARN
   *   - ruleParameters (optional): object - Rule parameters (JSON)
   *   - complianceType (optional): string - Compliance type (COMPLIANT, NON_COMPLIANT, NOT_APPLICABLE, INSUFFICIENT_DATA)
   *   - evaluationMode (optional): string - Evaluation mode (DETECTIVE, PROACTIVE)
   *   - triggerType (optional): string - Trigger type (CONFIGURATION_CHANGE, SCHEDULED, PERIODIC)
   *   - configRecorderName (optional): string - Config recorder name
   *   - deliveryChannelName (optional): string - Delivery channel name
   *   - complianceSummary (optional): object - Compliance summary (JSON)
   *   - evaluationResults (optional): object[] - Evaluation results (JSON array)
   * @returns Enhanced binding result (without compliance block)
   */
  private async bindToConfigRule(
    context: BindingContext,
    targetData: any
  ): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    const { directive } = context;
    const { access, options } = directive;

    if (!targetData?.configRuleName) {
      throw new Error('Target component missing required configRuleName property for compliance:config-rule binding');
    }

    const iamPolicies: IamPolicy[] = [];
    const environmentVariables: Record<string, string> = {
      AWS_CONFIG_RULE_NAME: targetData.configRuleName
    };

    if (targetData.configRuleArn) {
      environmentVariables.AWS_CONFIG_RULE_ARN = targetData.configRuleArn;
    }

    if (targetData.aggregatorArn) {
      environmentVariables.AWS_CONFIG_AGGREGATOR_ARN = targetData.aggregatorArn;
    }

    if (targetData.remediationActionArn) {
      environmentVariables.AWS_CONFIG_REMEDIATION_ACTION_ARN = targetData.remediationActionArn;
    }

    if (targetData.complianceType) {
      environmentVariables.AWS_CONFIG_COMPLIANCE_TYPE = targetData.complianceType;
    }

    if (targetData.evaluationMode) {
      environmentVariables.AWS_CONFIG_EVALUATION_MODE = targetData.evaluationMode;
    }

    if (targetData.triggerType) {
      environmentVariables.AWS_CONFIG_TRIGGER_TYPE = targetData.triggerType;
    }

    if (targetData.configRecorderName) {
      environmentVariables.AWS_CONFIG_RECORDER_NAME = targetData.configRecorderName;
    }

    if (targetData.deliveryChannelName) {
      environmentVariables.AWS_CONFIG_DELIVERY_CHANNEL_NAME = targetData.deliveryChannelName;
    }

    if (targetData.complianceSummary) {
      environmentVariables.AWS_CONFIG_COMPLIANCE_SUMMARY = JSON.stringify(targetData.complianceSummary);
    }

    if (targetData.evaluationResults && Array.isArray(targetData.evaluationResults)) {
      environmentVariables.AWS_CONFIG_EVALUATION_RESULTS = JSON.stringify(targetData.evaluationResults);
    }

    // IAM policies for Config rule operations
    if (access === 'read' || access === 'readwrite') {
      iamPolicies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
            'config:DescribeConfigRules',
            'config:GetConfigRule',
            'config:DescribeConfigRuleEvaluationStatus',
            'config:GetComplianceDetailsByConfigRule',
            'config:GetComplianceSummaryByConfigRule',
            'config:DescribeComplianceByConfigRule',
            'config:DescribeComplianceByResource'
          ],
          resources: [targetData.configRuleArn || `arn:aws:config:*:*:config-rule/${targetData.configRuleName}`]
        }),
        description: 'AWS Config rule read access',
        complianceRequirement: 'Least privilege IAM access for AWS Config read operations'
      });
    }

    if (access === 'write' || access === 'readwrite' || access === 'admin') {
      iamPolicies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
            'config:PutConfigRule',
            'config:DeleteConfigRule',
            'config:PutEvaluations',
            'config:PutRemediationConfigurations',
            'config:DeleteRemediationConfiguration'
          ],
          resources: [targetData.configRuleArn || `arn:aws:config:*:*:config-rule/${targetData.configRuleName}`]
        }),
        description: 'AWS Config rule write access',
        complianceRequirement: 'Least privilege IAM access for AWS Config write operations'
      });
    }

    // Admin access (full Config permissions)
    if (access === 'admin' && options?.requireFullAdminAccess) {
      iamPolicies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ['config:*'],
          resources: ['*']
        }),
        description: 'AWS Config admin access',
        complianceRequirement: 'Full admin access to AWS Config (requires explicit requireFullAdminAccess option)'
      });
    }

    // SSM Automation for remediation
    if (options?.requireSecureAccess && targetData.remediationActionArn) {
      iamPolicies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
            'ssm:StartAutomationExecution',
            'ssm:GetAutomationExecution',
            'ssm:DescribeAutomationExecutions'
          ],
          resources: [targetData.remediationActionArn]
        }),
        description: 'SSM Automation execution for Config remediation',
        complianceRequirement: 'Least privilege IAM access for SSM Automation remediation'
      });
    }

    // Org aggregator support
    if (targetData.aggregatorArn) {
      iamPolicies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
            'config:PutAggregationAuthorization',
            'config:DescribeAggregationAuthorizations',
            'config:DescribeConfigurationAggregators',
            'config:GetAggregateComplianceDetailsByConfigRule',
            'config:GetAggregateConfigRuleComplianceSummary'
          ],
          resources: [targetData.aggregatorArn]
        }),
        description: 'AWS Config aggregator access',
        complianceRequirement: 'Least privilege IAM access for Config aggregator operations'
      });
    }

    // Security Hub integration
    if (options?.requireSecureAccess) {
      iamPolicies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
            'securityhub:BatchImportFindings',
            'securityhub:UpdateFindings'
          ],
          resources: ['*']
        }),
        description: 'Security Hub integration for Config findings',
        complianceRequirement: 'Least privilege IAM access for Security Hub integration'
      });
    }

    // Config recorder and delivery channel support
    if (targetData.configRecorderName || targetData.deliveryChannelName) {
      if (access === 'read' || access === 'readwrite') {
        iamPolicies.push({
          statement: new PolicyStatement({
            effect: Effect.ALLOW,
            actions: [
              'config:DescribeConfigurationRecorders',
              'config:DescribeConfigurationRecorderStatus',
              'config:DescribeDeliveryChannels',
              'config:DescribeDeliveryChannelStatus'
            ],
            resources: ['*']
          }),
          description: 'Config recorder and delivery channel read access',
          complianceRequirement: 'Least privilege IAM access for Config recorder and delivery channel read operations'
        });
      }

      if (access === 'write' || access === 'readwrite' || access === 'admin') {
        iamPolicies.push({
          statement: new PolicyStatement({
            effect: Effect.ALLOW,
            actions: [
              'config:PutConfigurationRecorder',
              'config:PutDeliveryChannel',
              'config:StartConfigurationRecorder',
              'config:StopConfigurationRecorder'
            ],
            resources: ['*']
          }),
          description: 'Config recorder and delivery channel write access',
          complianceRequirement: 'Least privilege IAM access for Config recorder and delivery channel write operations'
        });
      }
    }

    // Compliance summary and evaluation results
    if (targetData.complianceSummary || targetData.evaluationResults) {
      if (access === 'read' || access === 'readwrite') {
        iamPolicies.push({
          statement: new PolicyStatement({
            effect: Effect.ALLOW,
            actions: [
              'config:GetComplianceSummaryByConfigRule',
              'config:GetComplianceSummaryByResourceType',
              'config:GetComplianceDetailsByConfigRule',
              'config:GetComplianceDetailsByResource',
              'config:GetResourceConfigHistory',
              'config:GetAggregateComplianceDetailsByConfigRule',
              'config:GetAggregateConfigRuleComplianceSummary'
            ],
            resources: [targetData.configRuleArn || `arn:aws:config:*:*:config-rule/${targetData.configRuleName}`]
          }),
          description: 'Config compliance summary and evaluation results access',
          complianceRequirement: 'Least privilege IAM access for compliance summary and evaluation results'
        });
      }
    }

    // KMS encryption for rule parameters
    if (options?.requireSecureAccess && targetData.kmsKeyId) {
      iamPolicies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
            'kms:Decrypt',
            'kms:DescribeKey',
            'kms:Encrypt'
          ],
          resources: [targetData.kmsKeyId]
        }),
        description: 'KMS encryption for Config rule parameters',
        complianceRequirement: 'Least privilege IAM access for KMS encryption'
      });
    }

    return {
      iamPolicies,
      environmentVariables,
      securityGroupRules: []
    };
  }
}

