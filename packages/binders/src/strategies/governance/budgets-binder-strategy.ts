/**
 * BudgetsBinderStrategy (Unified)
 * Handles AWS Budgets bindings with mandatory compliance enforcement
 * 
 * Multi-capability strategy supporting:
 * - governance:budgets-budget - Budget creation and management (cost, usage, RI utilization, RI coverage, Savings Plans)
 * - governance:budgets-action - Budget actions (e.g., stop EC2 instances, apply IAM policy)
 */

import { UnifiedBinderStrategyBase, resolveActions } from '@shinobi/core';
import type { BindingContext, EnhancedBindingResult, CompatibilityEntry, AccessLevel } from '@shinobi/core';
import type { IamPolicy } from '@shinobi/core';
import { PolicyStatement, Effect } from 'aws-cdk-lib/aws-iam';

export class BudgetsBinderStrategy extends UnifiedBinderStrategyBase {
  readonly supportedCapabilities = [
    'governance:budgets-budget',
    'governance:budgets-action'
  ];

  getStrategyName(): string {
    return 'BudgetsBinderStrategy';
  }

  canHandle(sourceType: string, targetCapability: string): boolean {
    return this.supportedCapabilities.includes(targetCapability);
  }

  getCompatibilityMatrix(): CompatibilityEntry[] {
    return [
      {
        sourceType: '*',
        targetType: '*',
        capability: 'governance:budgets-budget',
        supportedAccess: ['read', 'write', 'admin'],
        description: 'Bind to AWS Budgets for cost and usage budget management',
        examples: ['lambda-governance -> governance:budgets-budget (read)', 'lambda-cost-management -> governance:budgets-budget (write)']
      },
      {
        sourceType: '*',
        targetType: '*',
        capability: 'governance:budgets-action',
        supportedAccess: ['read', 'write', 'admin'],
        description: 'Bind to AWS Budgets actions for automated cost management',
        examples: ['lambda-cost-automation -> governance:budgets-action (write)']
      }
    ];
  }

  protected async doBind(context: BindingContext): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    const { source, target, directive } = context;
    const { capability } = directive;

    // Validate inputs
    if (!target) {
      throw new Error('Target component is required for AWS Budgets binding');
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
      case 'governance:budgets-budget':
        return await this.bindToBudgetsBudget(context, targetCapabilityData);
      case 'governance:budgets-action':
        return await this.bindToBudgetsAction(context, targetCapabilityData);
      default:
        throw new Error(`Unsupported Budgets capability: ${capability}. Supported capabilities: ${this.supportedCapabilities.join(', ')}`);
    }
  }

  /**
   * Bind to governance:budgets-budget
   * 
   * @param context - Binding context
   * @param targetData - Expected structure:
   *   - budgetArn (required): string - Budget ARN
   *   - budgetName (optional): string - Budget name
   *   - alertThreshold (optional): number - Alert threshold percentage
   *   - budgetType (optional): string - Budget type (COST, USAGE, RI_UTILIZATION, RI_COVERAGE, SAVINGS_PLANS_UTILIZATION, SAVINGS_PLANS_COVERAGE)
   *   - snsTopicArn (optional): string - SNS topic ARN for budget alerts
   *   - budgetAmount (optional): number - Calculated budget amount
   *   - timeUnit (optional): string - Time unit (DAILY, MONTHLY, QUARTERLY, ANNUALLY)
   *   - notificationArn (optional): string - Budget notification ARN
   *   - reportArn (optional): string - Budget report ARN
   *   - orgId (optional): string - Organization ID (for org-wide budgets)
   *   - ouId (optional): string - Organizational Unit ID (for OU-level budgets)
   * @returns Enhanced binding result (without compliance block)
   */
  private async bindToBudgetsBudget(
    context: BindingContext,
    targetData: any
  ): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    const { directive } = context;
    const { access, options } = directive;

    if (!targetData?.budgetArn) {
      throw new Error('Target component missing required budgetArn property for governance:budgets-budget binding');
    }

    const iamPolicies: IamPolicy[] = [];
    const environmentVariables: Record<string, string> = {
      AWS_BUDGETS_BUDGET_ARN: targetData.budgetArn
    };

    if (targetData.budgetName) {
      environmentVariables.AWS_BUDGETS_BUDGET_NAME = targetData.budgetName;
    }

    if (targetData.alertThreshold !== undefined) {
      environmentVariables.AWS_BUDGETS_ALERT_THRESHOLD = String(targetData.alertThreshold);
    }

    if (targetData.budgetType) {
      environmentVariables.AWS_BUDGETS_BUDGET_TYPE = targetData.budgetType;
    }

    if (targetData.budgetAmount !== undefined) {
      environmentVariables.AWS_BUDGETS_BUDGET_AMOUNT = String(targetData.budgetAmount);
    }

    if (targetData.timeUnit) {
      environmentVariables.AWS_BUDGETS_TIME_UNIT = targetData.timeUnit;
    }

    if (targetData.notificationArn) {
      environmentVariables.AWS_BUDGETS_NOTIFICATION_ARN = targetData.notificationArn;
    }

    if (targetData.reportArn) {
      environmentVariables.AWS_BUDGETS_REPORT_ARN = targetData.reportArn;
    }

    if (targetData.orgId) {
      environmentVariables.AWS_ORGANIZATIONS_ID = targetData.orgId;
    }

    if (targetData.ouId) {
      environmentVariables.AWS_ORGANIZATIONS_OU_ID = targetData.ouId;
    }

    // Handle granular actions override or use multi-statement approach
    if (context.directive.actions) {
      // Granular actions provided: create single statement with resolved actions
      const resolvedActions = resolveActions(
        context.directive,
        context,
        (acc: string) => this.getBudgetsBudgetActionsForAccess(acc as AccessLevel),
        'budgets'
      );

      const statement = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: resolvedActions,
        resources: [targetData.budgetArn]
      });
      iamPolicies.push({
        statement,
        description: 'AWS Budgets budget access permissions (granular actions)',
        complianceRequirement: 'Least privilege IAM access'
      });
    } else {
      // Coarse access levels: use multi-statement approach (backward compatible)
      if (access === 'read' || access === 'readwrite') {
        iamPolicies.push({
          statement: new PolicyStatement({
            effect: Effect.ALLOW,
            actions: [
              'budgets:ViewBudget',
              'budgets:DescribeBudget',
              'budgets:DescribeBudgets',
              'budgets:DescribeBudgetPerformanceHistory'
            ],
            resources: [targetData.budgetArn]
          }),
          description: 'AWS Budgets read access',
          complianceRequirement: 'Least privilege IAM access for AWS Budgets read operations'
        });
      }

      if (access === 'write' || access === 'readwrite' || access === 'admin') {
        iamPolicies.push({
          statement: new PolicyStatement({
            effect: Effect.ALLOW,
            actions: [
              'budgets:ModifyBudget',
              'budgets:CreateBudget',
              'budgets:DeleteBudget',
              'budgets:UpdateBudget'
            ],
            resources: [targetData.budgetArn]
          }),
          description: 'AWS Budgets write access',
          complianceRequirement: 'Least privilege IAM access for AWS Budgets write operations'
        });
      }

      // Admin access (full budgets permissions)
      if (access === 'admin' && options?.requireFullAdminAccess) {
        iamPolicies.push({
          statement: new PolicyStatement({
            effect: Effect.ALLOW,
            actions: ['budgets:*'],
            resources: ['*']
          }),
          description: 'AWS Budgets admin access',
          complianceRequirement: 'Full admin access to AWS Budgets (requires explicit requireFullAdminAccess option)'
        });
      }
    }

    // SNS access for budget alerts
    if (targetData.snsTopicArn) {
      iamPolicies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ['sns:Publish'],
          resources: [targetData.snsTopicArn]
        }),
        description: 'SNS publish access for budget alerts',
        complianceRequirement: 'Least privilege IAM access for SNS budget alert delivery'
      });
    }

    // Organizations integration for OU-level budgets and org-wide budget application
    if ((options?.requireSecureAccess || options?.orgWideBudget) && (targetData.orgId || options?.orgWideBudget)) {
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
        description: 'Organizations access for OU-level and org-wide budgets',
        complianceRequirement: 'Least privilege IAM access for Organizations integration'
      });
    }

    // Budget notifications access
    if (targetData.notificationArn || targetData.snsTopicArn) {
      const notificationResource = targetData.notificationArn || targetData.snsTopicArn;
      if (access === 'read' || access === 'readwrite') {
        iamPolicies.push({
          statement: new PolicyStatement({
            effect: Effect.ALLOW,
            actions: [
              'budgets:DescribeNotificationsForBudget',
              'sns:GetTopicAttributes',
              'sns:ListSubscriptionsByTopic'
            ],
            resources: [notificationResource]
          }),
          description: 'Budget notification read access',
          complianceRequirement: 'Least privilege IAM access for budget notification read operations'
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
   * Bind to governance:budgets-action
   * 
   * @param context - Binding context
   * @param targetData - Expected structure:
   *   - actionArn (required): string - Budget action ARN
   *   - actionId (optional): string - Budget action ID
   *   - actionType (optional): string - Action type (APPLY_IAM_POLICY, APPLY_SCP_POLICY, RUN_SSM_DOCUMENTS)
   *   - actionThreshold (optional): number - Action threshold percentage
   *   - budgetArn (optional): string - Associated budget ARN
   * @returns Enhanced binding result (without compliance block)
   */
  private async bindToBudgetsAction(
    context: BindingContext,
    targetData: any
  ): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    const { directive } = context;
    const { access, options } = directive;

    if (!targetData?.actionArn) {
      throw new Error('Target component missing required actionArn property for governance:budgets-action binding');
    }

    const iamPolicies: IamPolicy[] = [];
    const environmentVariables: Record<string, string> = {
      AWS_BUDGETS_ACTION_ARN: targetData.actionArn
    };

    if (targetData.actionId) {
      environmentVariables.AWS_BUDGETS_ACTION_ID = targetData.actionId;
    }

    if (targetData.actionType) {
      environmentVariables.AWS_BUDGETS_ACTION_TYPE = targetData.actionType;
    }

    if (targetData.actionThreshold !== undefined) {
      environmentVariables.AWS_BUDGETS_ACTION_THRESHOLD = String(targetData.actionThreshold);
    }

    if (targetData.budgetArn) {
      environmentVariables.AWS_BUDGETS_BUDGET_ARN = targetData.budgetArn;
    }

    // Handle granular actions override or use multi-statement approach
    if (context.directive.actions) {
      // Granular actions provided: create single statement with resolved actions
      const resolvedActions = resolveActions(
        context.directive,
        context,
        (acc: string) => this.getBudgetsActionActionsForAccess(acc as AccessLevel),
        'budgets'
      );

      const statement = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: resolvedActions,
        resources: [targetData.actionArn]
      });
      iamPolicies.push({
        statement,
        description: 'AWS Budgets action access permissions (granular actions)',
        complianceRequirement: 'Least privilege IAM access'
      });
    } else {
      // Coarse access levels: use multi-statement approach (backward compatible)
      if (access === 'read' || access === 'readwrite') {
        iamPolicies.push({
          statement: new PolicyStatement({
            effect: Effect.ALLOW,
            actions: [
              'budgets:ViewBudgetAction',
              'budgets:DescribeBudgetAction',
              'budgets:DescribeBudgetActionsForBudget',
              'budgets:DescribeBudgetActionsForAccount'
            ],
            resources: [targetData.actionArn]
          }),
          description: 'AWS Budgets action read access',
          complianceRequirement: 'Least privilege IAM access for AWS Budgets action read operations'
        });
      }

      if (access === 'write' || access === 'readwrite' || access === 'admin') {
        iamPolicies.push({
          statement: new PolicyStatement({
            effect: Effect.ALLOW,
            actions: [
              'budgets:ModifyBudgetAction',
              'budgets:CreateBudgetAction',
              'budgets:DeleteBudgetAction',
              'budgets:ExecuteBudgetAction',
              'budgets:UpdateBudgetAction'
            ],
            resources: [targetData.actionArn]
          }),
          description: 'AWS Budgets action write access',
          complianceRequirement: 'Least privilege IAM access for AWS Budgets action write operations'
        });
      }

      // Additional permissions for action execution
      if (options?.requireSecureAccess) {
        // IAM policy application permissions (if action type is APPLY_IAM_POLICY)
        if (targetData.actionType === 'APPLY_IAM_POLICY' || !targetData.actionType) {
          // SECURITY: Wildcard resources are not allowed for sensitive service 'iam'.
          // Require explicit role/user ARNs from options.
          const targetRoleArn = options.targetRoleArn || 
            `arn:aws:iam::${context.source.context.accountId || '123456789012'}:role/budget-action-target`;
          const targetUserArn = options.targetUserArn || 
            `arn:aws:iam::${context.source.context.accountId || '123456789012'}:user/budget-action-target`;
          
          iamPolicies.push({
            statement: new PolicyStatement({
              effect: Effect.ALLOW,
              actions: [
                'iam:PutUserPolicy',
                'iam:PutRolePolicy',
                'iam:AttachUserPolicy',
                'iam:AttachRolePolicy'
              ],
              resources: [targetRoleArn, targetUserArn]
            }),
            description: 'IAM policy application permissions for budget actions',
            complianceRequirement: 'Least privilege IAM access for budget action IAM policy application'
          });
        }

        // SSM document execution permissions (if action type is RUN_SSM_DOCUMENTS)
        if (targetData.actionType === 'RUN_SSM_DOCUMENTS') {
          // SECURITY: Wildcard resources are not allowed for sensitive service 'ssm'.
          // Require explicit document ARN and instance ARNs from options.
          const ssmDocumentArn = options.ssmDocumentArn || 
            `arn:aws:ssm:${context.source.context.region || 'us-east-1'}:${context.source.context.accountId || '123456789012'}:document/budget-action-document`;
          const ssmInstanceArn = options.ssmInstanceArn || 
            `arn:aws:ec2:${context.source.context.region || 'us-east-1'}:${context.source.context.accountId || '123456789012'}:instance/*`;
          
          iamPolicies.push({
            statement: new PolicyStatement({
              effect: Effect.ALLOW,
              actions: [
                'ssm:SendCommand',
                'ssm:GetCommandInvocation'
              ],
              resources: [ssmDocumentArn, ssmInstanceArn]
            }),
            description: 'SSM document execution permissions for budget actions',
            complianceRequirement: 'Least privilege IAM access for budget action SSM document execution'
          });
        }
      }

      // Admin access (full budgets permissions)
      if (access === 'admin' && options?.requireFullAdminAccess) {
        iamPolicies.push({
          statement: new PolicyStatement({
            effect: Effect.ALLOW,
            actions: ['budgets:*'],
            resources: ['*']
          }),
          description: 'AWS Budgets admin access',
          complianceRequirement: 'Full admin access to AWS Budgets (requires explicit requireFullAdminAccess option)'
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
   * Get Budgets budget actions based on access level
   * Used by resolveActions to compute base actions from coarse access level
   * 
   * @param access - Access level (read, write, readwrite, admin)
   * @returns Array of IAM action strings
   */
  private getBudgetsBudgetActionsForAccess(access: string): string[] {
    switch (access) {
      case 'read':
        return [
          'budgets:ViewBudget',
          'budgets:DescribeBudget',
          'budgets:DescribeBudgets',
          'budgets:DescribeBudgetPerformanceHistory'
        ];
      case 'write':
        return [
          'budgets:ModifyBudget',
          'budgets:CreateBudget',
          'budgets:DeleteBudget',
          'budgets:UpdateBudget'
        ];
      case 'readwrite':
        return [
          'budgets:ViewBudget',
          'budgets:DescribeBudget',
          'budgets:DescribeBudgets',
          'budgets:DescribeBudgetPerformanceHistory',
          'budgets:ModifyBudget',
          'budgets:CreateBudget',
          'budgets:DeleteBudget',
          'budgets:UpdateBudget'
        ];
      case 'admin':
        return [
          'budgets:*'
        ];
      default:
        throw new Error(`Unsupported Budgets budget access level: ${access}`);
    }
  }

  /**
   * Get Budgets action actions based on access level
   * Used by resolveActions to compute base actions from coarse access level
   * 
   * @param access - Access level (read, write, readwrite, admin)
   * @returns Array of IAM action strings
   */
  private getBudgetsActionActionsForAccess(access: string): string[] {
    switch (access) {
      case 'read':
        return [
          'budgets:ViewBudgetAction',
          'budgets:DescribeBudgetAction',
          'budgets:DescribeBudgetActionsForBudget',
          'budgets:DescribeBudgetActionsForAccount'
        ];
      case 'write':
        return [
          'budgets:ModifyBudgetAction',
          'budgets:CreateBudgetAction',
          'budgets:DeleteBudgetAction',
          'budgets:ExecuteBudgetAction',
          'budgets:UpdateBudgetAction'
        ];
      case 'readwrite':
        return [
          'budgets:ViewBudgetAction',
          'budgets:DescribeBudgetAction',
          'budgets:DescribeBudgetActionsForBudget',
          'budgets:DescribeBudgetActionsForAccount',
          'budgets:ModifyBudgetAction',
          'budgets:CreateBudgetAction',
          'budgets:DeleteBudgetAction',
          'budgets:ExecuteBudgetAction',
          'budgets:UpdateBudgetAction'
        ];
      case 'admin':
        return [
          'budgets:*'
        ];
      default:
        throw new Error(`Unsupported Budgets action access level: ${access}`);
    }
  }
}

