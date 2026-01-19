/**
 * CloudWatchBinderStrategy Tests (Unified)
 * 
 * Tests for CloudWatchBinderStrategy following Platform Testing Standard v1.0
 * All tests assert EnhancedBindingResult structure (return-based, not mutation-based)
 */

import { CloudWatchBinderStrategy } from '../cloudwatch-binder-strategy.js';
import {
  createMockSourceComponent,
  createMockTargetComponent,
  createBindingContext,
  executeUnifiedBinding,
  assertEnhancedBindingResult,
  TEST_CONSTANTS
} from '../../security/__tests__/unified-strategy-test-helpers.js';
import type { EnhancedBindingResult } from '@shinobi/core';

describe('CloudWatchBinderStrategy', () => {
  describe('CloudWatchBind__DashboardReadAccess__ReturnsEnhancedResult', () => {
    const metadata = {
      id: 'TP-binders-monitoring-cloudwatch-001',
      level: 'unit' as const,
      capability: 'Returns EnhancedBindingResult with all required fields including compliance block',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'CloudWatchBind__Condition__Outcome', example: 'CloudWatchBind__DashboardReadAccess__ReturnsEnhancedResult' },
      invariants: [
        'result.compliance.status exists and is one of compliant|non-compliant|partially-compliant',
        'result.environmentVariables contains AWS_CLOUDWATCH_DASHBOARD_NAME',
        'result.iamPolicies is an array with read actions',
        'result.securityGroupRules is an array'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'monitoring:cloudwatch-dashboardCapabilityData'],
      inputs: {
        shape: 'BindingContext with monitoring:cloudwatch-dashboard capability and read access',
        notes: 'Basic valid binding with read access'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('CloudWatchBind__DashboardReadAccess__ReturnsEnhancedResult', async () => {
      const strategy = new CloudWatchBinderStrategy();
      const source = createMockSourceComponent('lambda-monitoring', 'test-source');
      
      const target = createMockTargetComponent('cloudwatch', {
        'monitoring:cloudwatch-dashboard': {
          dashboardName: 'test-dashboard',
          metricNamespace: 'TestNamespace',
          logGroupName: '/aws/lambda/test-function'
        },
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'monitoring:cloudwatch-dashboard',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      expect(result.environmentVariables.AWS_CLOUDWATCH_DASHBOARD_NAME).toBe('test-dashboard');
      expect(result.environmentVariables.AWS_CLOUDWATCH_METRIC_NAMESPACE).toBe('TestNamespace');
      expect(result.environmentVariables.AWS_CLOUDWATCH_LOG_GROUP_NAME).toBe('/aws/lambda/test-function');
      expect(result.iamPolicies.length).toBeGreaterThan(0);
      expect(['compliant', 'non-compliant', 'partially-compliant']).toContain(result.compliance.status);
    });
  });

  describe('CloudWatchBind__AlarmReadAccess__ReturnsEnhancedResult', () => {
    const metadata = {
      id: 'TP-binders-monitoring-cloudwatch-002',
      level: 'unit' as const,
      capability: 'Returns EnhancedBindingResult for alarm capability with read access',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'CloudWatchBind__Condition__Outcome', example: 'CloudWatchBind__AlarmReadAccess__ReturnsEnhancedResult' },
      invariants: [
        'result.environmentVariables contains AWS_CLOUDWATCH_ALARM_NAME',
        'result.iamPolicies is an array with alarm read actions'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'monitoring:cloudwatch-alarmCapabilityData'],
      inputs: {
        shape: 'BindingContext with monitoring:cloudwatch-alarm capability and read access',
        notes: 'Basic valid binding with read access for alarm capability'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('CloudWatchBind__AlarmReadAccess__ReturnsEnhancedResult', async () => {
      const strategy = new CloudWatchBinderStrategy();
      const source = createMockSourceComponent('lambda-monitoring', 'test-source');
      
      const target = createMockTargetComponent('cloudwatch', {
        'monitoring:cloudwatch-alarm': {
          alarmName: 'test-alarm',
          alarmArn: 'arn:aws:cloudwatch:us-east-1:123456789012:alarm:test-alarm',
          metricNamespace: 'TestNamespace'
        },
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'monitoring:cloudwatch-alarm',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      expect(result.environmentVariables.AWS_CLOUDWATCH_ALARM_NAME).toBe('test-alarm');
      expect(result.environmentVariables.AWS_CLOUDWATCH_ALARM_ARN).toBe('arn:aws:cloudwatch:us-east-1:123456789012:alarm:test-alarm');
      expect(result.environmentVariables.AWS_CLOUDWATCH_METRIC_NAMESPACE).toBe('TestNamespace');
    });
  });

  describe('CloudWatchBind__DashboardWithAllFields__ExposesAllEnvironmentVariables', () => {
    const metadata = {
      id: 'TP-binders-monitoring-cloudwatch-003',
      level: 'unit' as const,
      capability: 'Exposes all optional environment variables for dashboard when provided',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'CloudWatchBind__Condition__Outcome', example: 'CloudWatchBind__DashboardWithAllFields__ExposesAllEnvironmentVariables' },
      invariants: [
        'Environment variables include dashboard body',
        'Environment variables include metric widgets'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'monitoring:cloudwatch-dashboardCapabilityData'],
      inputs: {
        shape: 'BindingContext with monitoring:cloudwatch-dashboard capability with all optional fields',
        notes: 'Tests comprehensive field exposure for dashboard'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('CloudWatchBind__DashboardWithAllFields__ExposesAllEnvironmentVariables', async () => {
      const strategy = new CloudWatchBinderStrategy();
      const source = createMockSourceComponent('lambda-monitoring', 'test-source');
      
      const target = createMockTargetComponent('cloudwatch', {
        'monitoring:cloudwatch-dashboard': {
          dashboardName: 'test-dashboard',
          dashboardBody: '{"widgets": []}',
          metricWidgets: [{ type: 'metric', properties: {} }]
        },
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'monitoring:cloudwatch-dashboard',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      expect(result.environmentVariables.AWS_CLOUDWATCH_DASHBOARD_BODY).toBe('{"widgets": []}');
      expect(result.environmentVariables.AWS_CLOUDWATCH_METRIC_WIDGETS).toBeDefined();
      const widgets = JSON.parse(result.environmentVariables.AWS_CLOUDWATCH_METRIC_WIDGETS);
      expect(Array.isArray(widgets)).toBe(true);
    });
  });

  describe('CloudWatchBind__AlarmWithAllFields__ExposesAllEnvironmentVariables', () => {
    const metadata = {
      id: 'TP-binders-monitoring-cloudwatch-004',
      level: 'unit' as const,
      capability: 'Exposes all optional environment variables for alarm when provided',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'CloudWatchBind__Condition__Outcome', example: 'CloudWatchBind__AlarmWithAllFields__ExposesAllEnvironmentVariables' },
      invariants: [
        'Environment variables include alarm actions',
        'Environment variables include anomaly detector ARN',
        'Environment variables include composite alarm names'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'monitoring:cloudwatch-alarmCapabilityData'],
      inputs: {
        shape: 'BindingContext with monitoring:cloudwatch-alarm capability with all optional fields',
        notes: 'Tests comprehensive field exposure for alarm'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('CloudWatchBind__AlarmWithAllFields__ExposesAllEnvironmentVariables', async () => {
      const strategy = new CloudWatchBinderStrategy();
      const source = createMockSourceComponent('lambda-monitoring', 'test-source');
      
      const target = createMockTargetComponent('cloudwatch', {
        'monitoring:cloudwatch-alarm': {
          alarmName: 'test-alarm',
          alarmActions: ['arn:aws:sns:us-east-1:123456789012:topic1'],
          okActions: ['arn:aws:sns:us-east-1:123456789012:topic2'],
          insufficientDataActions: ['arn:aws:sns:us-east-1:123456789012:topic3'],
          anomalyDetectorArn: 'arn:aws:cloudwatch:us-east-1:123456789012:anomaly-detector/test',
          compositeAlarmNames: ['composite-alarm-1', 'composite-alarm-2']
        },
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'monitoring:cloudwatch-alarm',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      expect(result.environmentVariables.AWS_CLOUDWATCH_ALARM_ACTIONS).toBe('arn:aws:sns:us-east-1:123456789012:topic1');
      expect(result.environmentVariables.AWS_CLOUDWATCH_OK_ACTIONS).toBe('arn:aws:sns:us-east-1:123456789012:topic2');
      expect(result.environmentVariables.AWS_CLOUDWATCH_INSUFFICIENT_DATA_ACTIONS).toBe('arn:aws:sns:us-east-1:123456789012:topic3');
      expect(result.environmentVariables.AWS_CLOUDWATCH_ANOMALY_DETECTOR_ARN).toBe('arn:aws:cloudwatch:us-east-1:123456789012:anomaly-detector/test');
      expect(result.environmentVariables.AWS_CLOUDWATCH_COMPOSITE_ALARM_NAMES).toBe('composite-alarm-1,composite-alarm-2');
    });
  });

  describe('CloudWatchBind__AlarmWithAnomalyDetection__AddsAnomalyActions', () => {
    const metadata = {
      id: 'TP-binders-monitoring-cloudwatch-005',
      level: 'unit' as const,
      capability: 'Adds anomaly detection IAM actions when anomalyDetectorArn is provided',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'CloudWatchBind__Condition__Outcome', example: 'CloudWatchBind__AlarmWithAnomalyDetection__AddsAnomalyActions' },
      invariants: [
        'IAM policies include cloudwatch:PutAnomalyDetector',
        'IAM policies include cloudwatch:DescribeAnomalyDetectors'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'monitoring:cloudwatch-alarmCapabilityData'],
      inputs: {
        shape: 'BindingContext with monitoring:cloudwatch-alarm capability and anomalyDetectorArn',
        notes: 'Tests anomaly detection integration'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('CloudWatchBind__AlarmWithAnomalyDetection__AddsAnomalyActions', async () => {
      const strategy = new CloudWatchBinderStrategy();
      const source = createMockSourceComponent('lambda-monitoring', 'test-source');
      
      const target = createMockTargetComponent('cloudwatch', {
        'monitoring:cloudwatch-alarm': {
          alarmName: 'test-alarm',
          anomalyDetectorArn: 'arn:aws:cloudwatch:us-east-1:123456789012:anomaly-detector/test'
        },
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'monitoring:cloudwatch-alarm',
        access: 'write'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      const anomalyPolicy = result.iamPolicies.find(p => {
        const statementJson = p.statement.toStatementJson();
        const actions = Array.isArray(statementJson.Action) ? statementJson.Action : [statementJson.Action];
        return actions.some((action: string) => 
          action.includes('PutAnomalyDetector') || action.includes('DescribeAnomalyDetectors')
        );
      });
      expect(anomalyPolicy).toBeDefined();
    });
  });

  describe('CloudWatchBind__WithSecureAccess__AddsSecureHooks', () => {
    const metadata = {
      id: 'TP-binders-monitoring-cloudwatch-006',
      level: 'unit' as const,
      capability: 'Adds secure hooks IAM policies when requireSecureAccess option is set',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'CloudWatchBind__Condition__Outcome', example: 'CloudWatchBind__WithSecureAccess__AddsSecureHooks' },
      invariants: [
        'IAM policies include SNS notification actions',
        'IAM policies include CloudWatch Logs Insights actions',
        'Environment variable AWS_CLOUDWATCH_SECURE_ACCESS_ENABLED is set'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'monitoring:cloudwatch-alarmCapabilityData'],
      inputs: {
        shape: 'BindingContext with monitoring:cloudwatch-alarm capability and requireSecureAccess option',
        notes: 'Tests secure hooks integration'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('CloudWatchBind__WithSecureAccess__AddsSecureHooks', async () => {
      const strategy = new CloudWatchBinderStrategy();
      const source = createMockSourceComponent('lambda-monitoring', 'test-source');
      
      const target = createMockTargetComponent('cloudwatch', {
        'monitoring:cloudwatch-alarm': {
          alarmName: 'test-alarm'
        },
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'monitoring:cloudwatch-alarm',
        access: 'read',
        options: {
          requireSecureAccess: true
        }
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      const snsPolicy = result.iamPolicies.find(p => {
        const statementJson = p.statement.toStatementJson();
        const actions = Array.isArray(statementJson.Action) ? statementJson.Action : [statementJson.Action];
        return actions.some((action: string) => action.includes('sns:Publish'));
      });
      expect(snsPolicy).toBeDefined();

      const logsPolicy = result.iamPolicies.find(p => {
        const statementJson = p.statement.toStatementJson();
        const actions = Array.isArray(statementJson.Action) ? statementJson.Action : [statementJson.Action];
        return actions.some((action: string) => 
          action.includes('logs:CreateLogGroup') || action.includes('logs:PutLogEvents')
        );
      });
      expect(logsPolicy).toBeDefined();

      expect(result.environmentVariables.AWS_CLOUDWATCH_SECURE_ACCESS_ENABLED).toBe('true');
    });
  });

  describe('CloudWatchBind__MissingDashboardName__ThrowsError', () => {
    const metadata = {
      id: 'TP-binders-monitoring-cloudwatch-007',
      level: 'unit' as const,
      capability: 'Throws error when required dashboardName is missing',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'CloudWatchBind__Condition__Outcome', example: 'CloudWatchBind__MissingDashboardName__ThrowsError' },
      invariants: [
        'Error message indicates missing dashboardName property'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with monitoring:cloudwatch-dashboard capability but missing dashboardName',
        notes: 'Tests error handling for missing required fields'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('CloudWatchBind__MissingDashboardName__ThrowsError', async () => {
      const strategy = new CloudWatchBinderStrategy();
      const source = createMockSourceComponent('lambda-monitoring', 'test-source');
      
      const target = createMockTargetComponent('cloudwatch', {
        'monitoring:cloudwatch-dashboard': {
          // Missing dashboardName
        },
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'monitoring:cloudwatch-dashboard',
        access: 'read'
      });

      await expect(executeUnifiedBinding(strategy, context)).rejects.toThrow(
        'Target component missing required dashboardName property'
      );
    });
  });

  describe('CloudWatchBind__MissingAlarmName__ThrowsError', () => {
    const metadata = {
      id: 'TP-binders-monitoring-cloudwatch-008',
      level: 'unit' as const,
      capability: 'Throws error when required alarmName is missing',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'CloudWatchBind__Condition__Outcome', example: 'CloudWatchBind__MissingAlarmName__ThrowsError' },
      invariants: [
        'Error message indicates missing alarmName property'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with monitoring:cloudwatch-alarm capability but missing alarmName',
        notes: 'Tests error handling for missing required fields'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('CloudWatchBind__MissingAlarmName__ThrowsError', async () => {
      const strategy = new CloudWatchBinderStrategy();
      const source = createMockSourceComponent('lambda-monitoring', 'test-source');
      
      const target = createMockTargetComponent('cloudwatch', {
        'monitoring:cloudwatch-alarm': {
          // Missing alarmName
        },
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'monitoring:cloudwatch-alarm',
        access: 'read'
      });

      await expect(executeUnifiedBinding(strategy, context)).rejects.toThrow(
        'Target component missing required alarmName property'
      );
    });
  });

  describe('CloudWatchBind__CustomActionsOverride__ReplacesCoarseActions', () => {
    const metadata = {
      id: 'TP-binders-monitoring-cloudwatch-002',
      level: 'unit' as const,
      capability: 'Custom actions override replaces default CloudWatch dashboard actions',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'CloudWatchBind__Condition__Outcome', example: 'CloudWatchBind__CustomActionsOverride__ReplacesCoarseActions' },
      invariants: [
        'IAM policy actions match provided custom actions array',
        'Default CloudWatch dashboard actions are not included when custom actions provided',
        'Actions array is used directly (replaces coarse access)'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with monitoring:cloudwatch-dashboard capability and directive.actions array',
        notes: 'Granular actions override test'
      },
      risks: [],
      dependencies: ['action-resolver'],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('CloudWatchBind__CustomActionsOverride__ReplacesCoarseActions', async () => {
      const strategy = new CloudWatchBinderStrategy();
      const customActions = ['cloudwatch:GetDashboard', 'cloudwatch:ListDashboards'];
      const target = createMockTargetComponent('cloudwatch', {
        'monitoring:cloudwatch-dashboard': {
          dashboardName: 'test-dashboard'
        },
      });

      const context = createBindingContext({
        source: createMockSourceComponent('lambda-monitoring', 'test-source'),
        target,
        capability: 'monitoring:cloudwatch-dashboard',
        access: 'read',
        actions: customActions
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      expect(result.iamPolicies.length).toBeGreaterThan(0);
      const policy = result.iamPolicies.find(p => p.description.includes('granular actions'));
      expect(policy).toBeDefined();
      
      const statementJson = policy!.statement.toStatementJson();
      const actions = Array.isArray(statementJson.Action)
        ? statementJson.Action
        : [statementJson.Action];

      // Primary assertion: Custom actions are used, default actions are not
      expect(actions).toEqual(customActions);
      expect(actions).not.toContain('cloudwatch:GetMetricStatistics');
      expect(actions).not.toContain('cloudwatch:PutDashboard');
    });
  });
});
