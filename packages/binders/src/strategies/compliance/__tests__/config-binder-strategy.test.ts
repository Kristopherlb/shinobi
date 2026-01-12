/**
 * ConfigBinderStrategy Tests (Unified)
 * 
 * Tests for ConfigBinderStrategy following Platform Testing Standard v1.0
 * All tests assert EnhancedBindingResult structure (return-based, not mutation-based)
 */

import { ConfigBinderStrategy } from '../config-binder-strategy.js';
import {
  createMockSourceComponent,
  createMockTargetComponent,
  createBindingContext,
  executeUnifiedBinding,
  assertEnhancedBindingResult,
  TEST_CONSTANTS
} from '../../security/__tests__/unified-strategy-test-helpers.js';
import type { EnhancedBindingResult } from '@shinobi/core';

describe('ConfigBinderStrategy', () => {
  describe('ConfigBind__ValidAccess__ReturnsEnhancedResult', () => {
    const metadata = {
      id: 'TP-binders-compliance-config-001',
      level: 'unit' as const,
      capability: 'Returns EnhancedBindingResult with all required fields including compliance block',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'ConfigBind__Condition__Outcome', example: 'ConfigBind__ValidAccess__ReturnsEnhancedResult' },
      invariants: [
        'result.compliance.status exists and is one of compliant|non-compliant|partially-compliant',
        'result.environmentVariables contains expected keys',
        'result.iamPolicies is an array',
        'result.securityGroupRules is an array'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'compliance:config-ruleCapabilityData'],
      inputs: {
        shape: 'BindingContext with compliance:config-rule capability',
        notes: 'Basic valid binding with read access'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('ConfigBind__ValidAccess__ReturnsEnhancedResult', async () => {
      const strategy = new ConfigBinderStrategy();
      const source = createMockSourceComponent('lambda-compliance', 'test-source');
      
      const target = createMockTargetComponent('config', {
        'compliance:config-rule': {
          configRuleName: 'test-config-rule',
          configRuleArn: 'arn:aws:config:us-east-1:123456789012:config-rule/test-config-rule',
          complianceType: 'COMPLIANT'
        },
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'compliance:config-rule',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      expect(result.environmentVariables.AWS_CONFIG_RULE_NAME).toBe('test-config-rule');
      expect(result.environmentVariables.AWS_CONFIG_RULE_ARN).toBe('arn:aws:config:us-east-1:123456789012:config-rule/test-config-rule');
      expect(result.environmentVariables.AWS_CONFIG_COMPLIANCE_TYPE).toBe('COMPLIANT');
      expect(result.iamPolicies.length).toBeGreaterThan(0);
      expect(['compliant', 'non-compliant', 'partially-compliant']).toContain(result.compliance.status);
    });
  });

  describe('ConfigBind__WithEvaluationModeAndTriggerType__ExposesEvaluationDetails', () => {
    const metadata = {
      id: 'TP-binders-compliance-config-002',
      level: 'unit' as const,
      capability: 'Exposes evaluation mode and trigger type when provided',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'ConfigBind__Condition__Outcome', example: 'ConfigBind__WithEvaluationModeAndTriggerType__ExposesEvaluationDetails' },
      invariants: [
        'Environment variables include AWS_CONFIG_EVALUATION_MODE and AWS_CONFIG_TRIGGER_TYPE when provided'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'compliance:config-ruleCapabilityData'],
      inputs: {
        shape: 'BindingContext with compliance:config-rule capability including evaluation mode and trigger type',
        notes: 'Tests evaluation mode and trigger type exposure'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('ConfigBind__WithEvaluationModeAndTriggerType__ExposesEvaluationDetails', async () => {
      const strategy = new ConfigBinderStrategy();
      const source = createMockSourceComponent('lambda-compliance', 'test-source');
      
      const target = createMockTargetComponent('config', {
        'compliance:config-rule': {
          configRuleName: 'test-config-rule',
          evaluationMode: 'DETECTIVE',
          triggerType: 'CONFIGURATION_CHANGE'
        },
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'compliance:config-rule',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      expect(result.environmentVariables.AWS_CONFIG_EVALUATION_MODE).toBe('DETECTIVE');
      expect(result.environmentVariables.AWS_CONFIG_TRIGGER_TYPE).toBe('CONFIGURATION_CHANGE');
    });
  });

  describe('ConfigBind__WithRecorderAndDeliveryChannel__AddsRecorderPolicies', () => {
    const metadata = {
      id: 'TP-binders-compliance-config-003',
      level: 'unit' as const,
      capability: 'Adds Config recorder and delivery channel IAM policies when provided',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'ConfigBind__Condition__Outcome', example: 'ConfigBind__WithRecorderAndDeliveryChannel__AddsRecorderPolicies' },
      invariants: [
        'IAM policies include Config recorder and delivery channel actions when provided'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'compliance:config-ruleCapabilityData'],
      inputs: {
        shape: 'BindingContext with compliance:config-rule capability including recorder and delivery channel',
        notes: 'Tests Config recorder and delivery channel support'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('ConfigBind__WithRecorderAndDeliveryChannel__AddsRecorderPolicies', async () => {
      const strategy = new ConfigBinderStrategy();
      const source = createMockSourceComponent('lambda-compliance', 'test-source');
      
      const target = createMockTargetComponent('config', {
        'compliance:config-rule': {
          configRuleName: 'test-config-rule',
          configRecorderName: 'default',
          deliveryChannelName: 'default'
        },
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'compliance:config-rule',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      expect(result.environmentVariables.AWS_CONFIG_RECORDER_NAME).toBe('default');
      expect(result.environmentVariables.AWS_CONFIG_DELIVERY_CHANNEL_NAME).toBe('default');
      const recorderPolicy = result.iamPolicies.find(p => {
        const statementJson = p.statement.toStatementJson();
        const actions = Array.isArray(statementJson.Action) ? statementJson.Action : [statementJson.Action];
        return actions.some((a: string) => a.includes('DescribeConfigurationRecorder'));
      });
      expect(recorderPolicy).toBeDefined();
    });
  });

  describe('ConfigBind__WithComplianceSummary__ExposesComplianceSummary', () => {
    const metadata = {
      id: 'TP-binders-compliance-config-004',
      level: 'unit' as const,
      capability: 'Exposes compliance summary and evaluation results when provided',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'ConfigBind__Condition__Outcome', example: 'ConfigBind__WithComplianceSummary__ExposesComplianceSummary' },
      invariants: [
        'Environment variables include AWS_CONFIG_COMPLIANCE_SUMMARY and AWS_CONFIG_EVALUATION_RESULTS when provided'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'compliance:config-ruleCapabilityData'],
      inputs: {
        shape: 'BindingContext with compliance:config-rule capability including compliance summary',
        notes: 'Tests compliance summary and evaluation results exposure'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('ConfigBind__WithComplianceSummary__ExposesComplianceSummary', async () => {
      const strategy = new ConfigBinderStrategy();
      const source = createMockSourceComponent('lambda-compliance', 'test-source');
      
      const target = createMockTargetComponent('config', {
        'compliance:config-rule': {
          configRuleName: 'test-config-rule',
          complianceSummary: { compliant: 10, nonCompliant: 2 },
          evaluationResults: [{ complianceType: 'COMPLIANT' }]
        },
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'compliance:config-rule',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      expect(result.environmentVariables.AWS_CONFIG_COMPLIANCE_SUMMARY).toBeDefined();
      expect(result.environmentVariables.AWS_CONFIG_EVALUATION_RESULTS).toBeDefined();
      const summaryPolicy = result.iamPolicies.find(p => {
        const statementJson = p.statement.toStatementJson();
        const actions = Array.isArray(statementJson.Action) ? statementJson.Action : [statementJson.Action];
        return actions.some((a: string) => a.includes('GetComplianceSummary'));
      });
      expect(summaryPolicy).toBeDefined();
    });
  });

  describe('ConfigBind__CustomActionsOverride__ReplacesCoarseActions', () => {
    const metadata = {
      id: 'TP-binders-compliance-config-002',
      level: 'unit' as const,
      capability: 'Custom actions override replaces default Config rule actions',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'ConfigBind__Condition__Outcome', example: 'ConfigBind__CustomActionsOverride__ReplacesCoarseActions' },
      invariants: [
        'IAM policy actions match provided custom actions array',
        'Default Config actions are not included when custom actions provided',
        'Actions array is used directly (replaces coarse access)'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with compliance:config-rule capability and directive.actions array',
        notes: 'Granular actions override test'
      },
      risks: [],
      dependencies: ['action-resolver'],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('ConfigBind__CustomActionsOverride__ReplacesCoarseActions', async () => {
      const strategy = new ConfigBinderStrategy();
      const customActions = ['config:DescribeConfigRules', 'config:GetConfigRule'];
      const target = createMockTargetComponent('config', {
        'compliance:config-rule': {
          configRuleName: 'test-config-rule',
          configRuleArn: 'arn:aws:config:us-east-1:123456789012:config-rule/test-config-rule'
        },
      });

      const context = createBindingContext({
        source: createMockSourceComponent('lambda-compliance', 'test-source'),
        target,
        capability: 'compliance:config-rule',
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
      expect(actions).not.toContain('config:DescribeConfigRuleEvaluationStatus');
      expect(actions).not.toContain('config:GetComplianceDetailsByConfigRule');
    });
  });
});

