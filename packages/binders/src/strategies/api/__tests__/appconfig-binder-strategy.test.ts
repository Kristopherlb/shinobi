/**
 * AppConfigBinderStrategy Tests (Unified)
 * 
 * Tests for AppConfigBinderStrategy following Platform Testing Standard v1.0
 * All tests assert EnhancedBindingResult structure (return-based, not mutation-based)
 */

import { AppConfigBinderStrategy } from '../appconfig-binder-strategy.js';
import {
  createMockSourceComponent,
  createMockTargetComponent,
  createBindingContext,
  executeUnifiedBinding,
  assertEnhancedBindingResult,
  TEST_CONSTANTS
} from '../../security/__tests__/unified-strategy-test-helpers.js';
import type { EnhancedBindingResult } from '@shinobi/core';

describe('AppConfigBinderStrategy', () => {
  describe('AppConfigBind__ReadAccess__ReturnsEnhancedResult', () => {
    const metadata = {
      id: 'TP-binders-api-appconfig-001',
      level: 'unit' as const,
      capability: 'Returns EnhancedBindingResult with all required fields including compliance block',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'AppConfigBind__Condition__Outcome', example: 'AppConfigBind__ReadAccess__ReturnsEnhancedResult' },
      invariants: [
        'result.compliance.status exists and is one of compliant|non-compliant|partially-compliant',
        'result.environmentVariables contains AWS_APPCONFIG_APPLICATION_ID',
        'result.iamPolicies is an array with read actions',
        'result.securityGroupRules is an array'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'config:appconfigCapabilityData'],
      inputs: {
        shape: 'BindingContext with config:appconfig capability and read access',
        notes: 'Basic valid binding with read access'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('AppConfigBind__ReadAccess__ReturnsEnhancedResult', async () => {
      const strategy = new AppConfigBinderStrategy();
      const source = createMockSourceComponent('lambda-api', 'test-source');
      
      const target = createMockTargetComponent('appconfig', {
        'config:appconfig': {
          applicationId: 'test-app-id',
          environmentId: 'test-env-id',
          configurationProfileId: 'test-profile-id'
        },
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'config:appconfig',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      expect(result.environmentVariables.AWS_APPCONFIG_APPLICATION_ID).toBe('test-app-id');
      expect(result.environmentVariables.AWS_APPCONFIG_ENVIRONMENT_ID).toBe('test-env-id');
      expect(result.environmentVariables.AWS_APPCONFIG_CONFIGURATION_PROFILE_ID).toBe('test-profile-id');
      expect(result.iamPolicies.length).toBeGreaterThan(0);
      expect(['compliant', 'non-compliant', 'partially-compliant']).toContain(result.compliance.status);
    });
  });

  describe('AppConfigBind__WriteAccess__ReturnsWritePolicies', () => {
    const metadata = {
      id: 'TP-binders-api-appconfig-002',
      level: 'unit' as const,
      capability: 'Returns IAM policies with write actions for write access',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'AppConfigBind__Condition__Outcome', example: 'AppConfigBind__WriteAccess__ReturnsWritePolicies' },
      invariants: [
        'IAM policies include appconfig:CreateApplication',
        'IAM policies include appconfig:StartDeployment'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'config:appconfigCapabilityData'],
      inputs: {
        shape: 'BindingContext with config:appconfig capability and write access',
        notes: 'Tests write access IAM policy generation'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('AppConfigBind__WriteAccess__ReturnsWritePolicies', async () => {
      const strategy = new AppConfigBinderStrategy();
      const source = createMockSourceComponent('lambda-config', 'test-source');
      
      const target = createMockTargetComponent('appconfig', {
        'config:appconfig': {
          applicationId: 'test-app-id'
        },
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'config:appconfig',
        access: 'write'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      const writePolicy = result.iamPolicies.find(p => {
        const statementJson = p.statement.toStatementJson();
        const actions = Array.isArray(statementJson.Action) ? statementJson.Action : [statementJson.Action];
        return actions.some((action: string) => 
          action.includes('CreateApplication') || action.includes('StartDeployment')
        );
      });
      expect(writePolicy).toBeDefined();
    });
  });

  describe('AppConfigBind__WithAllFields__ExposesAllEnvironmentVariables', () => {
    const metadata = {
      id: 'TP-binders-api-appconfig-003',
      level: 'unit' as const,
      capability: 'Exposes all optional environment variables when provided in target data',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'AppConfigBind__Condition__Outcome', example: 'AppConfigBind__WithAllFields__ExposesAllEnvironmentVariables' },
      invariants: [
        'Environment variables include hosted configuration version',
        'Environment variables include extension identifier',
        'Environment variables include deployment key',
        'Environment variables include validator ARN',
        'Environment variables include rollout strategy'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'config:appconfigCapabilityData'],
      inputs: {
        shape: 'BindingContext with config:appconfig capability with all optional fields',
        notes: 'Tests comprehensive field exposure'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('AppConfigBind__WithAllFields__ExposesAllEnvironmentVariables', async () => {
      const strategy = new AppConfigBinderStrategy();
      const source = createMockSourceComponent('lambda-api', 'test-source');
      
      const target = createMockTargetComponent('appconfig', {
        'config:appconfig': {
          applicationId: 'test-app-id',
          environmentId: 'test-env-id',
          configurationProfileId: 'test-profile-id',
          deploymentStrategyId: 'test-strategy-id',
          hostedConfigurationVersion: '1',
          extensionIdentifier: 'test-extension',
          deploymentKey: 'test-deployment-key',
          validatorArn: 'arn:aws:lambda:us-east-1:123456789012:function:validator',
          rolloutStrategy: { type: 'linear', growthFactor: 20 }
        },
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'config:appconfig',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      expect(result.environmentVariables.AWS_APPCONFIG_HOSTED_CONFIGURATION_VERSION).toBe('1');
      expect(result.environmentVariables.AWS_APPCONFIG_EXTENSION_IDENTIFIER).toBe('test-extension');
      expect(result.environmentVariables.AWS_APPCONFIG_DEPLOYMENT_KEY).toBe('test-deployment-key');
      expect(result.environmentVariables.AWS_APPCONFIG_VALIDATOR_ARN).toBe('arn:aws:lambda:us-east-1:123456789012:function:validator');
      expect(result.environmentVariables.AWS_APPCONFIG_ROLLOUT_STRATEGY).toBeDefined();
      const rolloutStrategy = JSON.parse(result.environmentVariables.AWS_APPCONFIG_ROLLOUT_STRATEGY);
      expect(rolloutStrategy.type).toBe('linear');
      expect(rolloutStrategy.growthFactor).toBe(20);
    });
  });

  describe('AppConfigBind__WithSecureAccess__AddsSecureHooks', () => {
    const metadata = {
      id: 'TP-binders-api-appconfig-004',
      level: 'unit' as const,
      capability: 'Adds secure hooks IAM policies when requireSecureAccess option is set',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'AppConfigBind__Condition__Outcome', example: 'AppConfigBind__WithSecureAccess__AddsSecureHooks' },
      invariants: [
        'IAM policies include CloudWatch monitoring actions',
        'IAM policies include KMS encryption actions if kmsKeyId provided',
        'IAM policies include Lambda validator actions if validatorArn provided',
        'Environment variable AWS_APPCONFIG_SECURE_ACCESS_ENABLED is set'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'config:appconfigCapabilityData'],
      inputs: {
        shape: 'BindingContext with config:appconfig capability and requireSecureAccess option',
        notes: 'Tests secure hooks integration'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('AppConfigBind__WithSecureAccess__AddsSecureHooks', async () => {
      const strategy = new AppConfigBinderStrategy();
      const source = createMockSourceComponent('lambda-api', 'test-source');
      
      const target = createMockTargetComponent('appconfig', {
        'config:appconfig': {
          applicationId: 'test-app-id',
          kmsKeyId: 'arn:aws:kms:us-east-1:123456789012:key/test-key',
          validatorArn: 'arn:aws:lambda:us-east-1:123456789012:function:validator'
        },
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'config:appconfig',
        access: 'read',
        options: {
          requireSecureAccess: true
        }
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      const cloudwatchPolicy = result.iamPolicies.find(p => {
        const statementJson = p.statement.toStatementJson();
        const actions = Array.isArray(statementJson.Action) ? statementJson.Action : [statementJson.Action];
        return actions.some((action: string) => action.includes('cloudwatch:PutMetricData'));
      });
      expect(cloudwatchPolicy).toBeDefined();

      const kmsPolicy = result.iamPolicies.find(p => {
        const statementJson = p.statement.toStatementJson();
        const actions = Array.isArray(statementJson.Action) ? statementJson.Action : [statementJson.Action];
        return actions.some((action: string) => action.includes('kms:Decrypt'));
      });
      expect(kmsPolicy).toBeDefined();

      const lambdaPolicy = result.iamPolicies.find(p => {
        const statementJson = p.statement.toStatementJson();
        const actions = Array.isArray(statementJson.Action) ? statementJson.Action : [statementJson.Action];
        return actions.some((action: string) => action.includes('lambda:InvokeFunction'));
      });
      expect(lambdaPolicy).toBeDefined();

      expect(result.environmentVariables.AWS_APPCONFIG_SECURE_ACCESS_ENABLED).toBe('true');
    });
  });

  describe('AppConfigBind__MissingApplicationId__ThrowsError', () => {
    const metadata = {
      id: 'TP-binders-api-appconfig-005',
      level: 'unit' as const,
      capability: 'Throws error when required applicationId is missing',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'AppConfigBind__Condition__Outcome', example: 'AppConfigBind__MissingApplicationId__ThrowsError' },
      invariants: [
        'Error message indicates missing applicationId property'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with config:appconfig capability but missing applicationId',
        notes: 'Tests error handling for missing required fields'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('AppConfigBind__MissingApplicationId__ThrowsError', async () => {
      const strategy = new AppConfigBinderStrategy();
      const source = createMockSourceComponent('lambda-api', 'test-source');
      
      const target = createMockTargetComponent('appconfig', {
        'config:appconfig': {
          // Missing applicationId
        },
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'config:appconfig',
        access: 'read'
      });

      await expect(executeUnifiedBinding(strategy, context)).rejects.toThrow(
        'Target component missing required applicationId property'
      );
    });
  });

  describe('AppConfigBind__CustomActionsOverride__ReplacesCoarseActions', () => {
    const metadata = {
      id: 'TP-binders-api-appconfig-010',
      level: 'unit' as const,
      capability: 'Custom actions override replaces default AppConfig actions',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'AppConfigBind__Condition__Outcome', example: 'AppConfigBind__CustomActionsOverride__ReplacesCoarseActions' },
      invariants: [
        'IAM policy actions match provided custom actions array',
        'Default AppConfig actions are not included when custom actions provided',
        'Actions array is used directly (replaces coarse access)'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'AppConfigCapabilityData'],
      inputs: {
        shape: 'BindingContext with config:appconfig capability and directive.actions array',
        notes: 'Granular actions override test'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('AppConfigBind__CustomActionsOverride__ReplacesCoarseActions', async () => {
      const strategy = new AppConfigBinderStrategy();
      const target = createMockTargetComponent('appconfig', {
        'config:appconfig': {
          applicationId: 'test-app-id',
          environmentId: 'test-env-id',
          configurationProfileId: 'test-profile-id'
        }
      });

      const customActions = ['appconfig:GetConfiguration', 'appconfig:GetApplication'];
      const context = createBindingContext({
        source: createMockSourceComponent(),
        target,
        capability: 'config:appconfig',
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

      expect(actions).toEqual(expect.arrayContaining(customActions));
      expect(actions.length).toBe(customActions.length);
    });
  });

  describe('AppConfigBind__InvalidActionPrefix__ThrowsPrefixMismatchError', () => {
    const metadata = {
      id: 'TP-binders-api-appconfig-011',
      level: 'unit' as const,
      capability: 'Throws error when actions array contains actions with wrong service prefix',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'AppConfigBind__Condition__Outcome', example: 'AppConfigBind__InvalidActionPrefix__ThrowsPrefixMismatchError' },
      invariants: [
        'Error message indicates service prefix mismatch',
        'Error specifies which actions are mismatched',
        'Binding fails before IAM policy generation'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'AppConfigCapabilityData'],
      inputs: {
        shape: 'BindingContext with config:appconfig capability and directive.actions containing non-appconfig actions',
        notes: 'Error case - invalid action prefix for AppConfig binder'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('AppConfigBind__InvalidActionPrefix__ThrowsPrefixMismatchError', async () => {
      const strategy = new AppConfigBinderStrategy();
      const target = createMockTargetComponent('appconfig', {
        'config:appconfig': {
          applicationId: 'test-app-id',
          environmentId: 'test-env-id',
          configurationProfileId: 'test-profile-id'
        }
      });

      const invalidActions = ['s3:GetObject']; // Wrong service prefix
      const context = createBindingContext({
        source: createMockSourceComponent(),
        target,
        capability: 'config:appconfig',
        access: 'read',
        actions: invalidActions
      });

      await expect(executeUnifiedBinding(strategy, context)).rejects.toThrow(
        "Actions must match service prefix 'appconfig:'"
      );
    });
  });
});
