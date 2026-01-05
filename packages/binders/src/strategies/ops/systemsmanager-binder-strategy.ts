/**
 * SystemsManagerBinderStrategy (Unified)
 * Handles ops:ssm-automation bindings with mandatory compliance enforcement
 * 
 * Supports:
 * - SSM documents (Automation, Command, Policy)
 * - Automation execution with parameters
 * - Runbook management
 * - Hybrid activation for on-premises/EC2 fleet management
 * - Parameter Store integration
 */

import { UnifiedBinderStrategyBase, resolveActions } from '@shinobi/core';
import type { BindingContext, EnhancedBindingResult, CompatibilityEntry } from '@shinobi/core';
import type { IamPolicy } from '@shinobi/core';
import { PolicyStatement, Effect } from 'aws-cdk-lib/aws-iam';

export class SystemsManagerBinderStrategy extends UnifiedBinderStrategyBase {
  readonly supportedCapabilities = ['ops:ssm-automation'];

  getStrategyName(): string {
    return 'SystemsManagerBinderStrategy';
  }

  canHandle(sourceType: string, targetCapability: string): boolean {
    return this.supportedCapabilities.includes(targetCapability);
  }

  getCompatibilityMatrix(): CompatibilityEntry[] {
    return [
      {
        sourceType: '*',
        targetType: '*',
        capability: 'ops:ssm-automation',
        supportedAccess: ['read', 'write', 'admin'],
        description: 'Bind to Systems Manager for automation, runbooks, and fleet management',
        examples: ['lambda-automation -> ops:ssm-automation (write)', 'ec2-instance -> ops:ssm-automation (read)']
      }
    ];
  }

  protected async doBind(context: BindingContext): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    const { source, target, directive } = context;
    const { capability } = directive;

    // Validate inputs
    if (!target) {
      throw new Error('Target component is required for ops:ssm-automation binding');
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

    return await this.bindToSsmAutomation(context, targetCapabilityData);
  }

  /**
   * Bind to ops:ssm-automation
   * 
   * @param context - Binding context
   * @param targetData - Expected structure:
   *   - documentName (required): string - SSM document name
   *   - documentArn (optional): string - Document ARN
   *   - documentVersion (optional): string - Document version
   *   - automationExecutionId (optional): string - Automation execution ID
   *   - hybridActivationId (optional): string - Hybrid activation ID for on-premises/EC2 fleet
   *   - parameterStorePath (optional): string - Parameter Store path for integration
   *   - automationParameters (optional): object - Automation execution parameters
   *   - stepStatus (optional): string - Automation step execution status
   *   - sessionManagerEnabled (optional): boolean - SSM Session Manager enabled flag
   *   - inventoryEnabled (optional): boolean - SSM Inventory enabled flag
   * @returns Enhanced binding result (without compliance block)
   */
  private async bindToSsmAutomation(
    context: BindingContext,
    targetData: any
  ): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    const { directive } = context;
    const { access, options } = directive;

    if (!targetData?.documentName) {
      throw new Error('Target component missing required documentName property for ops:ssm-automation binding');
    }

    const iamPolicies: IamPolicy[] = [];
    const environmentVariables: Record<string, string> = {
      AWS_SSM_DOCUMENT_NAME: targetData.documentName
    };

    if (targetData.documentArn) {
      environmentVariables.AWS_SSM_DOCUMENT_ARN = targetData.documentArn;
    }

    if (targetData.documentVersion) {
      environmentVariables.AWS_SSM_DOCUMENT_VERSION = targetData.documentVersion;
    }

    if (targetData.automationExecutionId) {
      environmentVariables.AWS_SSM_AUTOMATION_EXECUTION_ID = targetData.automationExecutionId;
    }

    if (targetData.hybridActivationId) {
      environmentVariables.AWS_SSM_HYBRID_ACTIVATION_ID = targetData.hybridActivationId;
    }

    if (targetData.parameterStorePath) {
      environmentVariables.AWS_SSM_PARAMETER_STORE_PATH = targetData.parameterStorePath;
    }

    if (targetData.automationParameters) {
      environmentVariables.AWS_SSM_AUTOMATION_PARAMETERS = JSON.stringify(targetData.automationParameters);
    }

    if (targetData.stepStatus) {
      environmentVariables.AWS_SSM_STEP_STATUS = targetData.stepStatus;
    }

    if (targetData.sessionManagerEnabled !== undefined) {
      environmentVariables.AWS_SSM_SESSION_MANAGER_ENABLED = String(targetData.sessionManagerEnabled);
    }

    if (targetData.inventoryEnabled !== undefined) {
      environmentVariables.AWS_SSM_INVENTORY_ENABLED = String(targetData.inventoryEnabled);
    }

    // Handle granular actions override or use multi-statement approach
    if (context.directive.actions) {
      // Granular actions provided: create single statement with resolved actions
      const resolvedActions = resolveActions(
        context.directive,
        context,
        (acc) => this.getSsmAutomationActionsForAccess(acc),
        'ssm'
      );

      // SECURITY: Use explicit region and account from context instead of wildcards
      const region = context.source.context.region || 'us-east-1';
      const accountId = context.source.context.accountId || '123456789012';
      
      const statement = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: resolvedActions,
        resources: [
          `arn:aws:ssm:${region}:${accountId}:document/${targetData.documentName}`,
          `arn:aws:ssm:${region}:${accountId}:automation-execution/*`,
          `arn:aws:ec2:${region}:${accountId}:instance/*`
        ]
      });
      iamPolicies.push({
        statement,
        description: 'SSM automation access permissions (granular actions)',
        complianceRequirement: 'Least privilege IAM access'
      });
    } else {
      // Coarse access levels: use multi-statement approach (backward compatible)
      // IAM policies for SSM operations
      if (access === 'read' || access === 'readwrite' || access === 'admin') {
        const readActions = [
          'ssm:GetDocument',
          'ssm:DescribeDocument',
          'ssm:ListDocuments',
          'ssm:DescribeInstanceInformation',
          'ssm:GetCommandInvocation',
          'ssm:ListCommandInvocations',
          'ssm:DescribeInstanceAssociationsStatus',
          'ssm:GetAutomationExecution',
          'ssm:DescribeAutomationExecutions',
          'ssm:DescribeAutomationStepExecutions'
        ];

        // Add Session Manager actions if enabled
        if (targetData.sessionManagerEnabled) {
          readActions.push(
            'ssm:StartSession',
            'ssm:TerminateSession',
            'ssm:DescribeSessions',
            'ssm:ResumeSession'
          );
        }

        // Add Inventory actions if enabled
        if (targetData.inventoryEnabled) {
          readActions.push(
            'ssm:GetInventory',
            'ssm:GetInventorySchema',
            'ssm:ListInventoryEntries',
            'ssm:ListResourceDataSync'
          );
        }

        // SECURITY: Use explicit region and account from context instead of wildcards
        const region = context.source.context.region || 'us-east-1';
        const accountId = context.source.context.accountId || '123456789012';
        
        iamPolicies.push({
          statement: new PolicyStatement({
            effect: Effect.ALLOW,
            actions: readActions,
            resources: [
              `arn:aws:ssm:${region}:${accountId}:document/${targetData.documentName}`,
              `arn:aws:ssm:${region}:${accountId}:automation-execution/*`,
              `arn:aws:ec2:${region}:${accountId}:instance/*`
            ]
          }),
          description: 'SSM read access',
          complianceRequirement: 'Least privilege IAM access for SSM read operations'
        });
      }

      if (access === 'write' || access === 'readwrite' || access === 'admin') {
        // SECURITY: Use explicit region and account from context instead of wildcards
        const region = context.source.context.region || 'us-east-1';
        const accountId = context.source.context.accountId || '123456789012';
        
        iamPolicies.push({
          statement: new PolicyStatement({
            effect: Effect.ALLOW,
            actions: [
              'ssm:SendCommand',
              'ssm:StartAutomationExecution',
              'ssm:StopAutomationExecution',
              'ssm:CreateDocument',
              'ssm:UpdateDocument',
              'ssm:DeleteDocument',
              'ssm:ModifyDocumentPermission'
            ],
            resources: [
              `arn:aws:ssm:${region}:${accountId}:document/${targetData.documentName}`,
              `arn:aws:ssm:${region}:${accountId}:automation-execution/*`,
              `arn:aws:ec2:${region}:${accountId}:instance/*`
            ]
          }),
          description: 'SSM write access',
          complianceRequirement: 'Least privilege IAM access for SSM write operations'
        });
      }

      // Gate admin access behind explicit option
      if (access === 'admin' && options?.requireFullAdminAccess) {
        // SECURITY: Even admin access requires explicit resources for sensitive services.
        // Use explicit region and account from context.
        const region = context.source.context.region || 'us-east-1';
        const accountId = context.source.context.accountId || '123456789012';
        
        iamPolicies.push({
          statement: new PolicyStatement({
            effect: Effect.ALLOW,
            actions: [
              'ssm:*',
              'ssm-parameter:*',
              'ssm-document:*',
              'ssm-automation:*',
              'ssm-patch:*',
              'ssm-maintenancewindow:*',
              'ssm-compliance:*'
            ],
            resources: [
              `arn:aws:ssm:${region}:${accountId}:*`,
              `arn:aws:ec2:${region}:${accountId}:instance/*`,
              `arn:aws:iam::${accountId}:role/*`,
              `arn:aws:iam::${accountId}:user/*`
            ]
          }),
          description: 'SSM admin access',
          complianceRequirement: 'Full SSM access for admin operations (explicitly requested)'
        });
      }
    }

    // Secure hooks support
    if (options?.requireSecureAccess) {
      // CloudWatch Logs integration for execution logging
      iamPolicies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
            'logs:CreateLogGroup',
            'logs:CreateLogStream',
            'logs:PutLogEvents',
            'logs:DescribeLogGroups',
            'logs:DescribeLogStreams'
          ],
          resources: ['*']
        }),
        description: 'SSM CloudWatch Logs access',
        complianceRequirement: 'Least privilege IAM access for CloudWatch Logs integration'
      });

      // KMS encryption for parameters
      if (targetData.kmsKeyId) {
        iamPolicies.push({
          statement: new PolicyStatement({
            effect: Effect.ALLOW,
            actions: [
              'kms:Decrypt',
              'kms:DescribeKey',
              'kms:Encrypt',
              'kms:GenerateDataKey'
            ],
            resources: [targetData.kmsKeyId]
          }),
          description: 'SSM KMS encryption access',
          complianceRequirement: 'Least privilege IAM access for KMS encryption'
        });
      }

      // Restrict Run Command execution (only allow specific documents)
      iamPolicies.push({
        statement: new PolicyStatement({
          effect: Effect.DENY,
          actions: ['ssm:SendCommand'],
          resources: ['*'],
          conditions: {
            StringNotEquals: {
              'ssm:documentName': targetData.documentName
            }
          }
        }),
        description: 'SSM Run Command restriction',
        complianceRequirement: 'Restrict Run Command to approved documents only'
      });

      environmentVariables.AWS_SSM_SECURE_ACCESS_ENABLED = 'true';
    }

    // Parameter Store integration (explicit path or from targetData)
    const parameterPath = targetData.parameterStorePath || targetData.parameterPath;
    if (parameterPath) {
      iamPolicies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
            'ssm:GetParameter',
            'ssm:GetParameters',
            'ssm:GetParametersByPath',
            'ssm:DescribeParameters'
          ],
          resources: [
            `arn:aws:ssm:${context.source.context.region || 'us-east-1'}:${context.source.context.accountId || '123456789012'}:parameter${parameterPath}*`
          ]
        }),
        description: 'SSM Parameter Store access',
        complianceRequirement: 'Least privilege IAM access for Parameter Store integration'
      });
    }

    return {
      iamPolicies,
      environmentVariables,
      securityGroupRules: []
    };
  }

  /**
   * Get SSM automation actions based on access level
   * Used by resolveActions to compute base actions from coarse access level
   * 
   * @param access - Access level (read, write, admin)
   * @returns Array of IAM action strings
   */
  private getSsmAutomationActionsForAccess(access: string): string[] {
    switch (access) {
      case 'read':
        return [
          'ssm:GetDocument',
          'ssm:DescribeDocument',
          'ssm:ListDocuments',
          'ssm:DescribeInstanceInformation',
          'ssm:GetCommandInvocation',
          'ssm:ListCommandInvocations',
          'ssm:DescribeInstanceAssociationsStatus',
          'ssm:GetAutomationExecution',
          'ssm:DescribeAutomationExecutions',
          'ssm:DescribeAutomationStepExecutions'
        ];
      case 'write':
        return [
          'ssm:SendCommand',
          'ssm:StartAutomationExecution',
          'ssm:StopAutomationExecution',
          'ssm:CreateDocument',
          'ssm:UpdateDocument',
          'ssm:DeleteDocument',
          'ssm:ModifyDocumentPermission'
        ];
      case 'admin':
        return ['ssm:*'];
      default:
        throw new Error(`Unsupported SSM automation access level: ${access}`);
    }
  }
}

