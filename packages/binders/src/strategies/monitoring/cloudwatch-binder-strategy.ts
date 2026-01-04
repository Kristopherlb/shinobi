/**
 * CloudWatchBinderStrategy (Unified)
 * Handles CloudWatch bindings with mandatory compliance enforcement
 * 
 * Multi-capability strategy supporting:
 * - monitoring:cloudwatch-dashboard - CloudWatch dashboards with custom widgets
 * - monitoring:cloudwatch-alarm - Metric alarms (threshold, anomaly detection)
 */

import { UnifiedBinderStrategyBase, resolveActions } from '@shinobi/core';
import type { BindingContext, EnhancedBindingResult, CompatibilityEntry } from '@shinobi/core';
import type { IamPolicy } from '@shinobi/core';
import { PolicyStatement, Effect } from 'aws-cdk-lib/aws-iam';

export class CloudWatchBinderStrategy extends UnifiedBinderStrategyBase {
  readonly supportedCapabilities = [
    'monitoring:cloudwatch-dashboard',
    'monitoring:cloudwatch-alarm'
  ];

  getStrategyName(): string {
    return 'CloudWatchBinderStrategy';
  }

  canHandle(sourceType: string, targetCapability: string): boolean {
    return this.supportedCapabilities.includes(targetCapability);
  }

  getCompatibilityMatrix(): CompatibilityEntry[] {
    return [
      {
        sourceType: '*',
        targetType: '*',
        capability: 'monitoring:cloudwatch-dashboard',
        supportedAccess: ['read', 'write', 'admin'],
        description: 'Bind to CloudWatch dashboards for custom widgets and cross-account observability',
        examples: ['lambda-api -> monitoring:cloudwatch-dashboard (read)', 'lambda-monitoring -> monitoring:cloudwatch-dashboard (write)']
      },
      {
        sourceType: '*',
        targetType: '*',
        capability: 'monitoring:cloudwatch-alarm',
        supportedAccess: ['read', 'write', 'admin'],
        description: 'Bind to CloudWatch alarms for threshold and anomaly detection',
        examples: ['lambda-api -> monitoring:cloudwatch-alarm (read)', 'lambda-monitoring -> monitoring:cloudwatch-alarm (write)']
      }
    ];
  }

  protected async doBind(context: BindingContext): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    const { source, target, directive } = context;
    const { capability } = directive;

    // Validate inputs
    if (!target) {
      throw new Error('Target component is required for CloudWatch binding');
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
      case 'monitoring:cloudwatch-dashboard':
        return await this.bindToCloudWatchDashboard(context, targetCapabilityData);
      case 'monitoring:cloudwatch-alarm':
        return await this.bindToCloudWatchAlarm(context, targetCapabilityData);
      default:
        throw new Error(`Unsupported CloudWatch capability: ${capability}. Supported capabilities: ${this.supportedCapabilities.join(', ')}`);
    }
  }

  /**
   * Bind to monitoring:cloudwatch-dashboard
   * 
   * @param context - Binding context
   * @param targetData - Expected structure:
   *   - dashboardName (required): string - Dashboard name
   *   - metricNamespace (optional): string - Metric namespace
   *   - logGroupName (optional): string - Log group name
   *   - dashboardBody (optional): string - Dashboard body (JSON widget configuration)
   *   - metricWidgets (optional): object[] - Metric widget configurations
   * @returns Enhanced binding result (without compliance block)
   */
  private async bindToCloudWatchDashboard(
    context: BindingContext,
    targetData: any
  ): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    const { directive } = context;
    const { access, options } = directive;

    if (!targetData?.dashboardName) {
      throw new Error('Target component missing required dashboardName property for monitoring:cloudwatch-dashboard binding');
    }

    const iamPolicies: IamPolicy[] = [];
    const environmentVariables: Record<string, string> = {
      AWS_CLOUDWATCH_DASHBOARD_NAME: targetData.dashboardName
    };

    if (targetData.metricNamespace) {
      environmentVariables.AWS_CLOUDWATCH_METRIC_NAMESPACE = targetData.metricNamespace;
    }

    if (targetData.logGroupName) {
      environmentVariables.AWS_CLOUDWATCH_LOG_GROUP_NAME = targetData.logGroupName;
    }

    if (targetData.dashboardBody) {
      environmentVariables.AWS_CLOUDWATCH_DASHBOARD_BODY = targetData.dashboardBody;
    }

    if (targetData.metricWidgets && Array.isArray(targetData.metricWidgets)) {
      environmentVariables.AWS_CLOUDWATCH_METRIC_WIDGETS = JSON.stringify(targetData.metricWidgets);
    }

    // Handle granular actions override or use multi-statement approach
    if (context.directive.actions) {
      // Granular actions provided: create single statement with resolved actions
      const resolvedActions = resolveActions(
        context.directive,
        context,
        (acc) => this.getCloudWatchDashboardActionsForAccess(acc),
        'cloudwatch'
      );

      const statement = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: resolvedActions,
        resources: ['*']
      });
      iamPolicies.push({
        statement,
        description: 'CloudWatch dashboard access permissions (granular actions)',
        complianceRequirement: 'Least privilege IAM access'
      });
    } else {
      // Coarse access levels: use multi-statement approach (backward compatible)
      // IAM policies for CloudWatch dashboard operations
      if (access === 'read' || access === 'readwrite' || access === 'admin') {
        iamPolicies.push({
          statement: new PolicyStatement({
            effect: Effect.ALLOW,
            actions: [
              'cloudwatch:GetDashboard',
              'cloudwatch:ListDashboards',
              'cloudwatch:GetMetricStatistics',
              'cloudwatch:GetMetricData',
              'cloudwatch:ListMetrics'
            ],
            resources: ['*']
          }),
          description: 'CloudWatch dashboard read access',
          complianceRequirement: 'Least privilege IAM access for CloudWatch dashboard read operations'
        });
      }

      if (access === 'write' || access === 'readwrite' || access === 'admin') {
        iamPolicies.push({
          statement: new PolicyStatement({
            effect: Effect.ALLOW,
            actions: [
              'cloudwatch:PutDashboard',
              'cloudwatch:DeleteDashboards',
              'cloudwatch:PutMetricData'
          ],
          resources: ['*']
        }),
        description: 'CloudWatch dashboard write access',
        complianceRequirement: 'Least privilege IAM access for CloudWatch dashboard write operations'
      });
    }
    }

    // Gate admin access behind explicit option
    if (access === 'admin' && options?.requireFullAdminAccess) {
      iamPolicies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ['cloudwatch:*'],
          resources: ['*']
        }),
        description: 'CloudWatch admin access',
        complianceRequirement: 'Full CloudWatch access for admin operations (explicitly requested)'
      });
    }

    // Secure hooks support
    if (options?.requireSecureAccess) {
      // SNS integration for alarm notifications
      iamPolicies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ['sns:Publish'],
          resources: ['*']
        }),
        description: 'CloudWatch SNS notification access',
        complianceRequirement: 'Least privilege IAM access for SNS alarm notifications'
      });

      // CloudWatch Logs Insights integration
      iamPolicies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
            'logs:StartQuery',
            'logs:StopQuery',
            'logs:GetQueryResults',
            'logs:GetLogEvents',
            'logs:DescribeLogGroups',
            'logs:DescribeLogStreams'
          ],
          resources: ['*']
        }),
        description: 'CloudWatch Logs Insights access',
        complianceRequirement: 'Least privilege IAM access for CloudWatch Logs Insights'
      });

      environmentVariables.AWS_CLOUDWATCH_SECURE_ACCESS_ENABLED = 'true';
    }

    return {
      iamPolicies,
      environmentVariables,
      securityGroupRules: []
    };
  }

  /**
   * Bind to monitoring:cloudwatch-alarm
   * 
   * @param context - Binding context
   * @param targetData - Expected structure:
   *   - alarmName (required): string - Alarm name
   *   - alarmArn (optional): string - Alarm ARN
   *   - metricNamespace (optional): string - Metric namespace
   *   - alarmActions (optional): string[] - List of alarm action ARNs (SNS topics, etc.)
   *   - okActions (optional): string[] - List of OK action ARNs
   *   - insufficientDataActions (optional): string[] - List of insufficient data action ARNs
   *   - anomalyDetectorArn (optional): string - Anomaly detector ARN
   *   - compositeAlarmNames (optional): string[] - List of composite alarm names
   * @returns Enhanced binding result (without compliance block)
   */
  private async bindToCloudWatchAlarm(
    context: BindingContext,
    targetData: any
  ): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    const { directive } = context;
    const { access, options } = directive;

    if (!targetData?.alarmName) {
      throw new Error('Target component missing required alarmName property for monitoring:cloudwatch-alarm binding');
    }

    const iamPolicies: IamPolicy[] = [];
    const environmentVariables: Record<string, string> = {
      AWS_CLOUDWATCH_ALARM_NAME: targetData.alarmName
    };

    if (targetData.alarmArn) {
      environmentVariables.AWS_CLOUDWATCH_ALARM_ARN = targetData.alarmArn;
    }

    if (targetData.metricNamespace) {
      environmentVariables.AWS_CLOUDWATCH_METRIC_NAMESPACE = targetData.metricNamespace;
    }

    if (targetData.alarmActions && Array.isArray(targetData.alarmActions)) {
      environmentVariables.AWS_CLOUDWATCH_ALARM_ACTIONS = targetData.alarmActions.join(',');
    }

    if (targetData.okActions && Array.isArray(targetData.okActions)) {
      environmentVariables.AWS_CLOUDWATCH_OK_ACTIONS = targetData.okActions.join(',');
    }

    if (targetData.insufficientDataActions && Array.isArray(targetData.insufficientDataActions)) {
      environmentVariables.AWS_CLOUDWATCH_INSUFFICIENT_DATA_ACTIONS = targetData.insufficientDataActions.join(',');
    }

    if (targetData.anomalyDetectorArn) {
      environmentVariables.AWS_CLOUDWATCH_ANOMALY_DETECTOR_ARN = targetData.anomalyDetectorArn;
    }

    if (targetData.compositeAlarmNames && Array.isArray(targetData.compositeAlarmNames)) {
      environmentVariables.AWS_CLOUDWATCH_COMPOSITE_ALARM_NAMES = targetData.compositeAlarmNames.join(',');
    }

    // IAM policies for CloudWatch alarm operations
    if (access === 'read' || access === 'readwrite' || access === 'admin') {
      const readActions = [
        'cloudwatch:DescribeAlarms',
        'cloudwatch:DescribeAlarmHistory',
        'cloudwatch:DescribeAlarmsForMetric',
        'cloudwatch:GetMetricStatistics',
        'cloudwatch:GetMetricData',
        'cloudwatch:ListMetrics'
      ];

      // Add anomaly detection read actions if anomaly detector is present
      if (targetData.anomalyDetectorArn) {
        readActions.push('cloudwatch:DescribeAnomalyDetectors');
      }

      // Add composite alarm read actions if composite alarms are present
      if (targetData.compositeAlarmNames && targetData.compositeAlarmNames.length > 0) {
        readActions.push('cloudwatch:DescribeAlarms');
      }

      iamPolicies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: readActions,
          resources: ['*']
        }),
        description: 'CloudWatch alarm read access',
        complianceRequirement: 'Least privilege IAM access for CloudWatch alarm read operations'
      });
    }

    if (access === 'write' || access === 'readwrite' || access === 'admin') {
      const writeActions = [
        'cloudwatch:PutMetricAlarm',
        'cloudwatch:DeleteAlarms',
        'cloudwatch:SetAlarmState',
        'cloudwatch:PutMetricData'
      ];

      // Add anomaly detection actions if anomaly detector is present
      if (targetData.anomalyDetectorArn) {
        writeActions.push(
          'cloudwatch:PutAnomalyDetector',
          'cloudwatch:DeleteAnomalyDetector',
          'cloudwatch:DescribeAnomalyDetectors'
        );
      }

      // Add composite alarm actions if composite alarms are present
      if (targetData.compositeAlarmNames && targetData.compositeAlarmNames.length > 0) {
        writeActions.push(
          'cloudwatch:PutCompositeAlarm',
          'cloudwatch:DeleteCompositeAlarm'
        );
      }

      iamPolicies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: writeActions,
          resources: ['*']
        }),
        description: 'CloudWatch alarm write access',
        complianceRequirement: 'Least privilege IAM access for CloudWatch alarm write operations'
      });
    }

    // Gate admin access behind explicit option
    if (access === 'admin' && options?.requireFullAdminAccess) {
      iamPolicies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ['cloudwatch:*'],
          resources: ['*']
        }),
        description: 'CloudWatch admin access',
        complianceRequirement: 'Full CloudWatch access for admin operations (explicitly requested)'
      });
    }

    // Secure hooks support
    if (options?.requireSecureAccess) {
      // SNS integration for alarm notifications
      iamPolicies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ['sns:Publish'],
          resources: ['*']
        }),
        description: 'CloudWatch SNS notification access',
        complianceRequirement: 'Least privilege IAM access for SNS alarm notifications'
      });

      // CloudWatch Logs integration
      iamPolicies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
            'logs:CreateLogGroup',
            'logs:PutLogEvents',
            'logs:DescribeLogGroups',
            'logs:DescribeLogStreams'
          ],
          resources: ['*']
        }),
        description: 'CloudWatch Logs access',
        complianceRequirement: 'Least privilege IAM access for CloudWatch Logs integration'
      });

      environmentVariables.AWS_CLOUDWATCH_SECURE_ACCESS_ENABLED = 'true';
    }

    return {
      iamPolicies,
      environmentVariables,
      securityGroupRules: []
    };
  }

  /**
   * Get CloudWatch dashboard actions based on access level
   * Used by resolveActions to compute base actions from coarse access level
   * 
   * @param access - Access level (read, write, admin)
   * @returns Array of IAM action strings
   */
  private getCloudWatchDashboardActionsForAccess(access: string): string[] {
    switch (access) {
      case 'read':
        return [
          'cloudwatch:GetDashboard',
          'cloudwatch:ListDashboards',
          'cloudwatch:GetMetricStatistics',
          'cloudwatch:GetMetricData',
          'cloudwatch:ListMetrics'
        ];
      case 'write':
        return [
          'cloudwatch:PutDashboard',
          'cloudwatch:DeleteDashboards',
          'cloudwatch:PutMetricData'
        ];
      case 'admin':
        return ['cloudwatch:*'];
      default:
        throw new Error(`Unsupported CloudWatch dashboard access level: ${access}`);
    }
  }

  /**
   * Get CloudWatch alarm actions based on access level
   * Used by resolveActions to compute base actions from coarse access level
   * 
   * @param access - Access level (read, write, admin)
   * @returns Array of IAM action strings
   */
  private getCloudWatchAlarmActionsForAccess(access: string): string[] {
    switch (access) {
      case 'read':
        return [
          'cloudwatch:DescribeAlarms',
          'cloudwatch:DescribeAlarmsForMetric',
          'cloudwatch:GetMetricStatistics',
          'cloudwatch:GetMetricData',
          'cloudwatch:ListMetrics'
        ];
      case 'write':
        return [
          'cloudwatch:PutMetricAlarm',
          'cloudwatch:DeleteAlarms',
          'cloudwatch:PutMetricData',
          'cloudwatch:SetAlarmState'
        ];
      case 'admin':
        return ['cloudwatch:*'];
      default:
        throw new Error(`Unsupported CloudWatch alarm access level: ${access}`);
    }
  }
}

