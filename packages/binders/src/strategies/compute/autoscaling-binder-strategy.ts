/**
 * AutoScalingBinderStrategy (Unified)
 * Handles autoscaling:group bindings with mandatory compliance enforcement
 */

import { UnifiedBinderStrategyBase, resolveActions } from '@shinobi/core';
import type { BindingContext, EnhancedBindingResult, CompatibilityEntry } from '@shinobi/core';
import type { IamPolicy } from '@shinobi/core';
import { PolicyStatement, Effect } from 'aws-cdk-lib/aws-iam';

export class AutoScalingBinderStrategy extends UnifiedBinderStrategyBase {
  readonly supportedCapabilities = ['autoscaling:group'];

  getStrategyName(): string {
    return 'AutoScalingBinderStrategy';
  }

  canHandle(sourceType: string, targetCapability: string): boolean {
    return this.supportedCapabilities.includes(targetCapability);
  }

  getCompatibilityMatrix(): CompatibilityEntry[] {
    return [
      {
        sourceType: '*',
        targetType: '*',
        capability: 'autoscaling:group',
        supportedAccess: ['read', 'write', 'admin'],
        description: 'Bind to Auto Scaling groups for read-only access, scaling control (set desired capacity), or full administrative access',
        examples: ['lambda-monitoring -> autoscaling:group (read)', 'lambda-automation -> autoscaling:group (write)', 'lambda-admin -> autoscaling:group (admin)']
      }
    ];
  }

  protected async doBind(context: BindingContext): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    const { source, target, directive } = context;
    const { capability } = directive;

    // Validate inputs
    if (!target) {
      throw new Error('Target component is required for autoscaling:group binding');
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

    return await this.bindToGroup(context, targetCapabilityData);
  }

  /**
   * Bind to autoscaling:group
   * 
   * @param context - Binding context
   * @param targetData - Expected structure (AutoScalingGroupCapabilityData):
   *   - type: 'autoscaling:group'
   *   - resources (required): { autoScalingGroupName: string, arn?: string }
   *   - minSize (optional): number - Minimum size
   *   - maxSize (optional): number - Maximum size
   *   - desiredCapacity (optional): number - Desired capacity
   *   - availabilityZones (optional): string[] - Availability zones
   *   - launchConfigurationName (optional): string - Launch configuration name
   *   - launchTemplateId (optional): string - Launch template ID
   *   - healthCheckType (optional): string - Health check type
   *   - healthCheckGracePeriod (optional): number - Health check grace period
   *   - scalingPolicyArns (optional): string[] - Scaling policy ARNs
   *   - scheduledActionNames (optional): string[] - Scheduled action names
   *   - instanceRefreshId (optional): string - Instance refresh ID
   *   - warmPoolSize (optional): number - Warm pool size
   *   - warmPoolMinSize (optional): number - Warm pool minimum size
   *   - scalingAlarmArns (optional): string[] - CloudWatch alarm ARNs for scaling
   * @returns Enhanced binding result (without compliance block)
   */
  private async bindToGroup(
    context: BindingContext,
    targetData: any
  ): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    // Validate required target properties
    if (!targetData?.resources?.autoScalingGroupName) {
      throw new Error('Target component missing required resources.autoScalingGroupName property for Auto Scaling group binding');
    }

    const { directive } = context;
    const { access } = directive;

    const iamPolicies: IamPolicy[] = [];
    const environmentVariables: Record<string, string> = {};
    const autoScalingGroupName = targetData.resources.autoScalingGroupName;
    const autoScalingGroupArn = targetData.resources.arn || `arn:aws:autoscaling:*:*:autoScalingGroup:*:autoScalingGroupName/${autoScalingGroupName}`;

    // Resolve actions (granular override or coarse access)
    const resolvedActions = resolveActions(
      context.directive,
      context,
      (acc) => this.getAutoScalingActionsForAccess(acc),
      'autoscaling'
    );

    // Create IAM policy
    if (resolvedActions.length > 0) {
      iamPolicies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: resolvedActions,
          resources: [autoScalingGroupArn]
        }),
        description: `Auto Scaling group ${access} access`,
        complianceRequirement: `Least privilege IAM access for Auto Scaling group ${access} operations`
      });
    }

    // Set environment variables
    environmentVariables['AUTOSCALING_GROUP_NAME'] = autoScalingGroupName;
    if (targetData.resources.arn) {
      environmentVariables['AUTOSCALING_GROUP_ARN'] = targetData.resources.arn;
    }
    
    if (targetData.minSize !== undefined) {
      environmentVariables['AUTOSCALING_MIN_SIZE'] = targetData.minSize.toString();
    }
    
    if (targetData.maxSize !== undefined) {
      environmentVariables['AUTOSCALING_MAX_SIZE'] = targetData.maxSize.toString();
    }
    
    if (targetData.desiredCapacity !== undefined) {
      environmentVariables['AUTOSCALING_DESIRED_CAPACITY'] = targetData.desiredCapacity.toString();
    }
    
    if (targetData.availabilityZones && Array.isArray(targetData.availabilityZones)) {
      environmentVariables['AUTOSCALING_AVAILABILITY_ZONES'] = targetData.availabilityZones.join(',');
    }
    
    if (targetData.launchConfigurationName) {
      environmentVariables['AUTOSCALING_LAUNCH_CONFIGURATION_NAME'] = targetData.launchConfigurationName;
    }
    
    if (targetData.launchTemplateId) {
      environmentVariables['AUTOSCALING_LAUNCH_TEMPLATE_ID'] = targetData.launchTemplateId;
    }
    
    if (targetData.healthCheckType) {
      environmentVariables['AUTOSCALING_HEALTH_CHECK_TYPE'] = targetData.healthCheckType;
    }
    
    if (targetData.healthCheckGracePeriod !== undefined) {
      environmentVariables['AUTOSCALING_HEALTH_CHECK_GRACE_PERIOD'] = targetData.healthCheckGracePeriod.toString();
    }
    
    // Scaling policies
    if (targetData.scalingPolicyArns && Array.isArray(targetData.scalingPolicyArns)) {
      environmentVariables['AUTOSCALING_SCALING_POLICY_ARNS'] = targetData.scalingPolicyArns.join(',');
    }
    
    // Scheduled actions
    if (targetData.scheduledActionNames && Array.isArray(targetData.scheduledActionNames)) {
      environmentVariables['AUTOSCALING_SCHEDULED_ACTION_NAMES'] = targetData.scheduledActionNames.join(',');
    }
    
    // Instance refresh
    if (targetData.instanceRefreshId) {
      environmentVariables['AUTOSCALING_INSTANCE_REFRESH_ID'] = targetData.instanceRefreshId;
    }
    
    // Warm pool
    if (targetData.warmPoolSize !== undefined) {
      environmentVariables['AUTOSCALING_WARM_POOL_SIZE'] = targetData.warmPoolSize.toString();
    }
    if (targetData.warmPoolMinSize !== undefined) {
      environmentVariables['AUTOSCALING_WARM_POOL_MIN_SIZE'] = targetData.warmPoolMinSize.toString();
    }
    
    // CloudWatch alarm ARNs for scaling
    if (targetData.scalingAlarmArns && Array.isArray(targetData.scalingAlarmArns)) {
      environmentVariables['AUTOSCALING_SCALING_ALARM_ARNS'] = targetData.scalingAlarmArns.join(',');
    }

    return {
      iamPolicies,
      environmentVariables,
      securityGroupRules: [],
    };
  }

  /**
   * Get Auto Scaling actions based on access level
   * Used by resolveActions to compute base actions from coarse access level
   * 
   * @param access - Access level (read, write, readwrite, admin)
   * @returns Array of IAM action strings
   */
  private getAutoScalingActionsForAccess(access: string): string[] {
    const actions: string[] = [];
    
    if (access === 'read' || access === 'readwrite' || access === 'admin') {
      // Read access: Describe Auto Scaling groups and related resources
      actions.push(
        'autoscaling:DescribeAutoScalingGroups',
        'autoscaling:DescribeLaunchConfigurations',
        'autoscaling:DescribeLaunchTemplates',
        'autoscaling:DescribeScalingActivities',
        'autoscaling:DescribeScalingProcessTypes',
        'autoscaling:DescribeScheduledActions',
        'autoscaling:DescribeTags',
        'autoscaling:DescribeLifecycleHooks',
        'autoscaling:DescribePolicies',
        'autoscaling:DescribeAdjustmentTypes',
        'autoscaling:DescribeInstanceRefreshes',
        'autoscaling:DescribeWarmPool',
        'cloudwatch:DescribeAlarms',
        'cloudwatch:GetMetricStatistics'
      );
    }

    if (access === 'write' || access === 'readwrite' || access === 'admin') {
      // Write access: Control scaling operations
      actions.push(
        'autoscaling:SetDesiredCapacity',
        'autoscaling:UpdateAutoScalingGroup',
        'autoscaling:ExecutePolicy',
        'autoscaling:PutScalingPolicy',
        'autoscaling:DeletePolicy',
        'autoscaling:PutScheduledUpdateGroupAction',
        'autoscaling:DeleteScheduledAction',
        'autoscaling:TerminateInstanceInAutoScalingGroup',
        'autoscaling:SetInstanceHealth',
        'autoscaling:PutLifecycleHook',
        'autoscaling:DeleteLifecycleHook',
        'autoscaling:RecordLifecycleActionHeartbeat',
        'autoscaling:CompleteLifecycleAction',
        'autoscaling:StartInstanceRefresh',
        'autoscaling:CancelInstanceRefresh',
        'autoscaling:PutWarmPool',
        'autoscaling:DeleteWarmPool'
      );
    }

    if (access === 'admin') {
      // Admin access: Full control including create/delete
      // TODO: Consider gating CreateAutoScalingGroup/DeleteAutoScalingGroup behind an option for safety
      actions.push(
        'autoscaling:CreateAutoScalingGroup',
        'autoscaling:DeleteAutoScalingGroup',
        'autoscaling:CreateLaunchConfiguration',
        'autoscaling:DeleteLaunchConfiguration',
        'autoscaling:AttachInstances',
        'autoscaling:DetachInstances',
        'autoscaling:EnterStandby',
        'autoscaling:ExitStandby',
        'autoscaling:ResumeProcesses',
        'autoscaling:SuspendProcesses'
      );
    }

    return [...new Set(actions)]; // Remove duplicates
  }
}

