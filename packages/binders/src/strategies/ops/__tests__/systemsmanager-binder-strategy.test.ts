/**
 * SystemsManagerBinderStrategy Tests (Unified)
 * 
 * Tests for SystemsManagerBinderStrategy following Platform Testing Standard v1.0
 * All tests assert EnhancedBindingResult structure (return-based, not mutation-based)
 */

import { SystemsManagerBinderStrategy } from '../systemsmanager-binder-strategy.js';
import {
  createMockSourceComponent,
  createMockTargetComponent,
  createBindingContext,
  executeUnifiedBinding,
  assertEnhancedBindingResult,
  TEST_CONSTANTS
} from '@shinobi/binders/security/__tests__/unified-strategy-test-helpers';
import type { EnhancedBindingResult } from '@shinobi/core';

describe('SystemsManagerBinderStrategy', () => {
  describe('SystemsManagerBind__ReadAccess__ReturnsEnhancedResult', () => {
    const metadata = {
      id: 'TP-binders-ops-systemsmanager-001',
      level: 'unit' as const,
      capability: 'Returns EnhancedBindingResult with all required fields including compliance block',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'SystemsManagerBind__Condition__Outcome', example: 'SystemsManagerBind__ReadAccess__ReturnsEnhancedResult' },
      invariants: [
        'result.compliance.status exists and is one of compliant|non-compliant|partially-compliant',
        'result.environmentVariables contains AWS_SSM_DOCUMENT_NAME',
        'result.iamPolicies is an array with read actions',
        'result.securityGroupRules is an array'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'ops:ssm-automationCapabilityData'],
      inputs: {
        shape: 'BindingContext with ops:ssm-automation capability and read access',
        notes: 'Basic valid binding with read access'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('SystemsManagerBind__ReadAccess__ReturnsEnhancedResult', async () => {
      const strategy = new SystemsManagerBinderStrategy();
      const source = createMockSourceComponent('lambda-automation', 'test-source');
      
      const target = createMockTargetComponent('ssm', {
        'ops:ssm-automation': {
          documentName: 'test-document',
          documentArn: 'arn:aws:ssm:us-east-1:123456789012:document/test-document',
          automationExecutionId: 'exec-123456'
        },
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'ops:ssm-automation',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      expect(result.environmentVariables.AWS_SSM_DOCUMENT_NAME).toBe('test-document');
      expect(result.environmentVariables.AWS_SSM_DOCUMENT_ARN).toBe('arn:aws:ssm:us-east-1:123456789012:document/test-document');
      expect(result.environmentVariables.AWS_SSM_AUTOMATION_EXECUTION_ID).toBe('exec-123456');
      expect(result.iamPolicies.length).toBeGreaterThan(0);
      expect(['compliant', 'non-compliant', 'partially-compliant']).toContain(result.compliance.status);
    });
  });

  describe('SystemsManagerBind__WriteAccess__ReturnsWritePolicies', () => {
    const metadata = {
      id: 'TP-binders-ops-systemsmanager-002',
      level: 'unit' as const,
      capability: 'Returns IAM policies with write actions for write access',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'SystemsManagerBind__Condition__Outcome', example: 'SystemsManagerBind__WriteAccess__ReturnsWritePolicies' },
      invariants: [
        'IAM policies include ssm:SendCommand',
        'IAM policies include ssm:StartAutomationExecution'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'ops:ssm-automationCapabilityData'],
      inputs: {
        shape: 'BindingContext with ops:ssm-automation capability and write access',
        notes: 'Tests write access IAM policy generation'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('SystemsManagerBind__WriteAccess__ReturnsWritePolicies', async () => {
      const strategy = new SystemsManagerBinderStrategy();
      const source = createMockSourceComponent('lambda-automation', 'test-source');
      
      const target = createMockTargetComponent('ssm', {
        'ops:ssm-automation': {
          documentName: 'test-document'
        },
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'ops:ssm-automation',
        access: 'write'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      const writePolicy = result.iamPolicies.find(p => {
        const statementJson = p.statement.toStatementJson();
        const actions = Array.isArray(statementJson.Action) ? statementJson.Action : [statementJson.Action];
        return actions.some((action: string) => 
          action.includes('SendCommand') || action.includes('StartAutomationExecution')
        );
      });
      expect(writePolicy).toBeDefined();
    });
  });

  describe('SystemsManagerBind__WithAllFields__ExposesAllEnvironmentVariables', () => {
    const metadata = {
      id: 'TP-binders-ops-systemsmanager-003',
      level: 'unit' as const,
      capability: 'Exposes all optional environment variables when provided in target data',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'SystemsManagerBind__Condition__Outcome', example: 'SystemsManagerBind__WithAllFields__ExposesAllEnvironmentVariables' },
      invariants: [
        'Environment variables include document version',
        'Environment variables include parameter store path',
        'Environment variables include automation parameters',
        'Environment variables include step status',
        'Environment variables include Session Manager and Inventory flags'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'ops:ssm-automationCapabilityData'],
      inputs: {
        shape: 'BindingContext with ops:ssm-automation capability with all optional fields',
        notes: 'Tests comprehensive field exposure'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('SystemsManagerBind__WithAllFields__ExposesAllEnvironmentVariables', async () => {
      const strategy = new SystemsManagerBinderStrategy();
      const source = createMockSourceComponent('lambda-automation', 'test-source');
      
      const target = createMockTargetComponent('ssm', {
        'ops:ssm-automation': {
          documentName: 'test-document',
          documentVersion: '1',
          parameterStorePath: '/test/parameters',
          automationParameters: { param1: 'value1', param2: 'value2' },
          stepStatus: 'SUCCESS',
          sessionManagerEnabled: true,
          inventoryEnabled: true
        },
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'ops:ssm-automation',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      expect(result.environmentVariables.AWS_SSM_DOCUMENT_VERSION).toBe('1');
      expect(result.environmentVariables.AWS_SSM_PARAMETER_STORE_PATH).toBe('/test/parameters');
      expect(result.environmentVariables.AWS_SSM_AUTOMATION_PARAMETERS).toBeDefined();
      const params = JSON.parse(result.environmentVariables.AWS_SSM_AUTOMATION_PARAMETERS);
      expect(params.param1).toBe('value1');
      expect(result.environmentVariables.AWS_SSM_STEP_STATUS).toBe('SUCCESS');
      expect(result.environmentVariables.AWS_SSM_SESSION_MANAGER_ENABLED).toBe('true');
      expect(result.environmentVariables.AWS_SSM_INVENTORY_ENABLED).toBe('true');
    });
  });

  describe('SystemsManagerBind__WithSessionManager__AddsSessionManagerActions', () => {
    const metadata = {
      id: 'TP-binders-ops-systemsmanager-004',
      level: 'unit' as const,
      capability: 'Adds Session Manager IAM actions when sessionManagerEnabled is true',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'SystemsManagerBind__Condition__Outcome', example: 'SystemsManagerBind__WithSessionManager__AddsSessionManagerActions' },
      invariants: [
        'IAM policies include ssm:StartSession',
        'IAM policies include ssm:TerminateSession'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'ops:ssm-automationCapabilityData'],
      inputs: {
        shape: 'BindingContext with ops:ssm-automation capability and sessionManagerEnabled',
        notes: 'Tests Session Manager integration'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('SystemsManagerBind__WithSessionManager__AddsSessionManagerActions', async () => {
      const strategy = new SystemsManagerBinderStrategy();
      const source = createMockSourceComponent('lambda-automation', 'test-source');
      
      const target = createMockTargetComponent('ssm', {
        'ops:ssm-automation': {
          documentName: 'test-document',
          sessionManagerEnabled: true
        },
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'ops:ssm-automation',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      const sessionPolicy = result.iamPolicies.find(p => {
        const statementJson = p.statement.toStatementJson();
        const actions = Array.isArray(statementJson.Action) ? statementJson.Action : [statementJson.Action];
        return actions.some((action: string) => 
          action.includes('StartSession') || action.includes('TerminateSession')
        );
      });
      expect(sessionPolicy).toBeDefined();
    });
  });

  describe('SystemsManagerBind__WithSecureAccess__AddsSecureHooks', () => {
    const metadata = {
      id: 'TP-binders-ops-systemsmanager-005',
      level: 'unit' as const,
      capability: 'Adds secure hooks IAM policies when requireSecureAccess option is set',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'SystemsManagerBind__Condition__Outcome', example: 'SystemsManagerBind__WithSecureAccess__AddsSecureHooks' },
      invariants: [
        'IAM policies include CloudWatch Logs actions',
        'IAM policies include KMS encryption actions if kmsKeyId provided',
        'IAM policies include Run Command restriction',
        'Environment variable AWS_SSM_SECURE_ACCESS_ENABLED is set'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'ops:ssm-automationCapabilityData'],
      inputs: {
        shape: 'BindingContext with ops:ssm-automation capability and requireSecureAccess option',
        notes: 'Tests secure hooks integration'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('SystemsManagerBind__WithSecureAccess__AddsSecureHooks', async () => {
      const strategy = new SystemsManagerBinderStrategy();
      const source = createMockSourceComponent('lambda-automation', 'test-source');
      
      const target = createMockTargetComponent('ssm', {
        'ops:ssm-automation': {
          documentName: 'test-document',
          kmsKeyId: 'arn:aws:kms:us-east-1:123456789012:key/test-key'
        },
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'ops:ssm-automation',
        access: 'read',
        options: {
          requireSecureAccess: true
        }
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      const logsPolicy = result.iamPolicies.find(p => {
        const statementJson = p.statement.toStatementJson();
        const actions = Array.isArray(statementJson.Action) ? statementJson.Action : [statementJson.Action];
        return actions.some((action: string) => action.includes('logs:CreateLogGroup'));
      });
      expect(logsPolicy).toBeDefined();

      const kmsPolicy = result.iamPolicies.find(p => {
        const statementJson = p.statement.toStatementJson();
        const actions = Array.isArray(statementJson.Action) ? statementJson.Action : [statementJson.Action];
        return actions.some((action: string) => action.includes('kms:Decrypt'));
      });
      expect(kmsPolicy).toBeDefined();

      const denyPolicy = result.iamPolicies.find(p => 
        p.statement.toStatementJson().Effect === 'Deny'
      );
      expect(denyPolicy).toBeDefined();

      expect(result.environmentVariables.AWS_SSM_SECURE_ACCESS_ENABLED).toBe('true');
    });
  });

  describe('SystemsManagerBind__AdminWithFullAccess__ReturnsAdminPolicies', () => {
    const metadata = {
      id: 'TP-binders-ops-systemsmanager-006',
      level: 'unit' as const,
      capability: 'Returns admin IAM policies when admin access with requireFullAdminAccess option',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'SystemsManagerBind__Condition__Outcome', example: 'SystemsManagerBind__AdminWithFullAccess__ReturnsAdminPolicies' },
      invariants: [
        'IAM policies include ssm:* actions when requireFullAdminAccess is set'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'ops:ssm-automationCapabilityData'],
      inputs: {
        shape: 'BindingContext with ops:ssm-automation capability and admin access with requireFullAdminAccess',
        notes: 'Tests admin access gating'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('SystemsManagerBind__AdminWithFullAccess__ReturnsAdminPolicies', async () => {
      const strategy = new SystemsManagerBinderStrategy();
      const source = createMockSourceComponent('lambda-automation', 'test-source');
      
      const target = createMockTargetComponent('ssm', {
        'ops:ssm-automation': {
          documentName: 'test-document'
        },
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'ops:ssm-automation',
        access: 'admin',
        options: {
          requireFullAdminAccess: true
        }
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      const adminPolicy = result.iamPolicies.find(p => {
        const statementJson = p.statement.toStatementJson();
        return statementJson.Action === 'ssm:*' || 
          (Array.isArray(statementJson.Action) && statementJson.Action.includes('ssm:*'));
      });
      expect(adminPolicy).toBeDefined();
    });
  });

  describe('SystemsManagerBind__MissingDocumentName__ThrowsError', () => {
    const metadata = {
      id: 'TP-binders-ops-systemsmanager-007',
      level: 'unit' as const,
      capability: 'Throws error when required documentName is missing',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'SystemsManagerBind__Condition__Outcome', example: 'SystemsManagerBind__MissingDocumentName__ThrowsError' },
      invariants: [
        'Error message indicates missing documentName property'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with ops:ssm-automation capability but missing documentName',
        notes: 'Tests error handling for missing required fields'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('SystemsManagerBind__MissingDocumentName__ThrowsError', async () => {
      const strategy = new SystemsManagerBinderStrategy();
      const source = createMockSourceComponent('lambda-automation', 'test-source');
      
      const target = createMockTargetComponent('ssm', {
        'ops:ssm-automation': {
          // Missing documentName
        },
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'ops:ssm-automation',
        access: 'read'
      });

      await expect(executeUnifiedBinding(strategy, context)).rejects.toThrow(
        'Target component missing required documentName property'
      );
    });
  });

  describe('SystemsManagerBind__CustomActionsOverride__ReplacesCoarseActions', () => {
    const metadata = {
      id: 'TP-binders-ops-systemsmanager-007',
      level: 'unit' as const,
      capability: 'Custom actions override replaces default SSM automation actions',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'SystemsManagerBind__Condition__Outcome', example: 'SystemsManagerBind__CustomActionsOverride__ReplacesCoarseActions' },
      invariants: [
        'IAM policy actions match provided custom actions array',
        'Default SSM automation actions are not included when custom actions provided',
        'Actions array is used directly (replaces coarse access)'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with ops:ssm-automation capability and directive.actions array',
        notes: 'Granular actions override test'
      },
      risks: [],
      dependencies: ['action-resolver'],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('SystemsManagerBind__CustomActionsOverride__ReplacesCoarseActions', async () => {
      const strategy = new SystemsManagerBinderStrategy();
      const customActions = ['ssm:GetDocument', 'ssm:DescribeDocument'];
      const target = createMockTargetComponent('ssm', {
        'ops:ssm-automation': {
          documentName: 'test-document'
        },
      });

      const context = createBindingContext({
        source: createMockSourceComponent('lambda-automation', 'test-source'),
        target,
        capability: 'ops:ssm-automation',
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
      expect(actions).not.toContain('ssm:ListDocuments');
      expect(actions).not.toContain('ssm:StartAutomationExecution');
    });
  });
});
