/**
 * IamRoleBinderStrategy Tests (Unified)
 * 
 * Tests for IamRoleBinderStrategy following Platform Testing Standard v1.0
 * All tests assert EnhancedBindingResult structure (return-based, not mutation-based)
 */

import { IamRoleBinderStrategy } from '../iamrole-binder-strategy.js';
import {
  createMockSourceComponent,
  createMockTargetComponent,
  createBindingContext,
  executeUnifiedBinding,
  assertEnhancedBindingResult,
  TEST_CONSTANTS
} from './unified-strategy-test-helpers.js';

const IAM_ROLE_ARN = 'arn:aws:iam::123456789012:role/test-role';
const IAM_ROLE_NAME = 'test-role';

describe('IamRoleBinderStrategy', () => {
  describe('IamRoleBind__ValidAccess__ReturnsEnhancedResult', () => {
    const metadata = {
      id: 'TP-binders-security-iamrole-001',
      level: 'unit' as const,
      capability: 'Returns EnhancedBindingResult with all required fields including compliance block',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'IamRoleBind__Condition__Outcome', example: 'IamRoleBind__ValidAccess__ReturnsEnhancedResult' },
      invariants: [
        'result.compliance.status exists and is one of compliant|non-compliant|partially-compliant',
        'result.environmentVariables.IAM_ROLE_ARN matches input roleArn',
        'result.environmentVariables.IAM_ROLE_NAME matches input roleName',
        'result.iamPolicies is an array',
        'result.securityGroupRules is an array'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'IamRoleCapabilityData'],
      inputs: {
        shape: 'BindingContext with iam:role capability, roleArn, roleName',
        notes: 'Basic valid binding with read access'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('IamRoleBind__ValidAccess__ReturnsEnhancedResult', async () => {
      const strategy = new IamRoleBinderStrategy();
      const source = createMockSourceComponent('lambda-api', 'test-source');
      
      const target = createMockTargetComponent('iam-role', {
        'iam:role': {
          roleArn: IAM_ROLE_ARN,
          roleName: IAM_ROLE_NAME
        },
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'iam:role',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Primary assertion: compliance block exists and has correct structure
      expect(['compliant', 'non-compliant', 'partially-compliant']).toContain(result.compliance.status);
      expect(result.compliance.framework).toBe(TEST_CONSTANTS.COMPLIANCE_FRAMEWORK);
      expect(Array.isArray(result.compliance.actionsTaken)).toBe(true);

      // Invariants
      expect(result.environmentVariables.IAM_ROLE_ARN).toBe(IAM_ROLE_ARN);
      expect(result.environmentVariables.IAM_ROLE_NAME).toBe(IAM_ROLE_NAME);
      expect(Array.isArray(result.iamPolicies)).toBe(true);
      expect(Array.isArray(result.securityGroupRules)).toBe(true);
      expect(result.iamPolicies.length).toBeGreaterThan(0);
    });
  });

  describe('IamRoleBind__ReadAccess__GrantsAssumeRoleAndReadPermissions', () => {
    const metadata = {
      id: 'TP-binders-security-iamrole-002',
      level: 'unit' as const,
      capability: 'Grants sts:AssumeRole and IAM read actions for read access level',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'IamRoleBind__Condition__Outcome', example: 'IamRoleBind__ReadAccess__GrantsAssumeRoleAndReadPermissions' },
      invariants: [
        'PolicyStatement resources match roleArn',
        'PolicyStatement Effect is Allow',
        'Actions array includes sts:AssumeRole and iam:GetRole'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'IamRoleCapabilityData'],
      inputs: {
        shape: 'BindingContext with iam:role capability and read access',
        notes: 'Standard AccessLevel read value'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('IamRoleBind__ReadAccess__GrantsAssumeRoleAndReadPermissions', async () => {
      const strategy = new IamRoleBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('iam-role', {
        'iam:role': {
          roleArn: IAM_ROLE_ARN,
          roleName: IAM_ROLE_NAME
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'iam:role',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Check that sts:AssumeRole permission is granted
      const assumeRolePolicy = result.iamPolicies.find(p => 
        p.statement.actions?.includes('sts:AssumeRole')
      );
      expect(assumeRolePolicy).toBeDefined();
      expect(assumeRolePolicy?.statement.resources).toContain(IAM_ROLE_ARN);

      // Check that IAM read permissions are granted
      const readPolicy = result.iamPolicies.find(p => 
        p.statement.actions?.includes('iam:GetRole')
      );
      expect(readPolicy).toBeDefined();
    });
  });

  describe('IamRoleBind__WriteAccess__GrantsWritePermissions', () => {
    const metadata = {
      id: 'TP-binders-security-iamrole-003',
      level: 'unit' as const,
      capability: 'Grants IAM write actions for write access level',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'IamRoleBind__Condition__Outcome', example: 'IamRoleBind__WriteAccess__GrantsWritePermissions' },
      invariants: [
        'PolicyStatement includes iam:UpdateRole action',
        'PolicyStatement includes iam:PutRolePolicy action',
        'All read permissions are also included'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'IamRoleCapabilityData'],
      inputs: {
        shape: 'BindingContext with iam:role capability and write access',
        notes: 'Standard AccessLevel write value'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('IamRoleBind__WriteAccess__GrantsWritePermissions', async () => {
      const strategy = new IamRoleBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('iam-role', {
        'iam:role': {
          roleArn: IAM_ROLE_ARN,
          roleName: IAM_ROLE_NAME
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'iam:role',
        access: 'write'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Check that write permissions are granted
      const writePolicy = result.iamPolicies.find(p => 
        p.statement.actions?.includes('iam:UpdateRole')
      );
      expect(writePolicy).toBeDefined();
      expect(writePolicy?.statement.actions).toContain('iam:PutRolePolicy');
    });
  });

  describe('IamRoleBind__AdminAccessWithoutOption__DoesNotGrantCreateDelete', () => {
    const metadata = {
      id: 'TP-binders-security-iamrole-004',
      level: 'unit' as const,
      capability: 'Admin access without allowRoleManagement option does not include CreateRole/DeleteRole',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'IamRoleBind__Condition__Outcome', example: 'IamRoleBind__AdminAccessWithoutOption__DoesNotGrantCreateDelete' },
      invariants: [
        'PolicyStatement does not include iam:CreateRole action',
        'PolicyStatement does not include iam:DeleteRole action',
        'All read and write permissions are still included'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'IamRoleCapabilityData'],
      inputs: {
        shape: 'BindingContext with iam:role capability and admin access (no allowRoleManagement option)',
        notes: 'Admin access by default does not include Create/Delete for safety'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('IamRoleBind__AdminAccessWithoutOption__DoesNotGrantCreateDelete', async () => {
      const strategy = new IamRoleBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('iam-role', {
        'iam:role': {
          roleArn: IAM_ROLE_ARN,
          roleName: IAM_ROLE_NAME
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'iam:role',
        access: 'admin'
        // No allowRoleManagement option
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Check that admin permissions (Create/Delete) are NOT granted without option
      const createDeletePolicy = result.iamPolicies.find(p => 
        p.statement.actions?.includes('iam:CreateRole') || 
        p.statement.actions?.includes('iam:DeleteRole')
      );
      expect(createDeletePolicy).toBeUndefined();
    });
  });

  describe('IamRoleBind__AdminAccessWithOption__GrantsCreateDelete', () => {
    const metadata = {
      id: 'TP-binders-security-iamrole-004b',
      level: 'unit' as const,
      capability: 'Grants IAM admin actions including CreateRole and DeleteRole when allowRoleManagement option is set',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'IamRoleBind__Condition__Outcome', example: 'IamRoleBind__AdminAccessWithOption__GrantsCreateDelete' },
      invariants: [
        'PolicyStatement includes iam:CreateRole action',
        'PolicyStatement includes iam:DeleteRole action',
        'All read and write permissions are also included'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'IamRoleCapabilityData'],
      inputs: {
        shape: 'BindingContext with iam:role capability, admin access, and allowRoleManagement option',
        notes: 'Admin access with allowRoleManagement option enables Create/Delete'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('IamRoleBind__AdminAccessWithOption__GrantsCreateDelete', async () => {
      const strategy = new IamRoleBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('iam-role', {
        'iam:role': {
          roleArn: IAM_ROLE_ARN,
          roleName: IAM_ROLE_NAME
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'iam:role',
        access: 'admin',
        options: { allowRoleManagement: true }
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Check that admin permissions are granted with option
      const adminPolicy = result.iamPolicies.find(p => 
        p.statement.actions?.includes('iam:CreateRole')
      );
      expect(adminPolicy).toBeDefined();
      expect(adminPolicy?.statement.actions).toContain('iam:DeleteRole');
    });
  });

  describe('IamRoleBind__WithTrustPolicy__ExposesTrustEntities', () => {
    const metadata = {
      id: 'TP-binders-security-iamrole-007',
      level: 'unit' as const,
      capability: 'Exposes trust policy entities (assumedBy principals) as environment variables',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'IamRoleBind__Condition__Outcome', example: 'IamRoleBind__WithTrustPolicy__ExposesTrustEntities' },
      invariants: [
        'Environment variables include IAM_ROLE_TRUST_SERVICE_PRINCIPALS',
        'Environment variables include IAM_ROLE_TRUST_PRINCIPAL_COUNT',
        'Service principals are comma-separated'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'IamRoleCapabilityDataWithTrustPolicy'],
      inputs: {
        shape: 'BindingContext with iam:role capability including assumedBy principals',
        notes: 'Trust policy information exposed as env vars'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('IamRoleBind__WithTrustPolicy__ExposesTrustEntities', async () => {
      const strategy = new IamRoleBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('iam-role', {
        'iam:role': {
          roleArn: IAM_ROLE_ARN,
          roleName: IAM_ROLE_NAME,
          assumedBy: [
            { service: 'lambda.amazonaws.com' },
            { service: 'ecs-tasks.amazonaws.com' },
            { accountId: '987654321098' }
          ]
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'iam:role',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      expect(result.environmentVariables.IAM_ROLE_TRUST_SERVICE_PRINCIPALS).toBe('lambda.amazonaws.com,ecs-tasks.amazonaws.com');
      expect(result.environmentVariables.IAM_ROLE_TRUST_ACCOUNT_IDS).toBe('987654321098');
      expect(result.environmentVariables.IAM_ROLE_TRUST_PRINCIPAL_COUNT).toBe('3');
    });
  });

  describe('IamRoleBind__WithExternalId__AddsConditionAndExposesEnvVar', () => {
    const metadata = {
      id: 'TP-binders-security-iamrole-008',
      level: 'unit' as const,
      capability: 'Adds external ID condition to assume role policy and exposes as environment variable',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'IamRoleBind__Condition__Outcome', example: 'IamRoleBind__WithExternalId__AddsConditionAndExposesEnvVar' },
      invariants: [
        'Assume role PolicyStatement includes sts:ExternalId condition',
        'Environment variables include IAM_ROLE_EXTERNAL_ID',
        'Condition matches external ID value'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'IamRoleCapabilityDataWithExternalId'],
      inputs: {
        shape: 'BindingContext with iam:role capability including externalId',
        notes: 'Cross-account assume role with external ID'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('IamRoleBind__WithExternalId__AddsConditionAndExposesEnvVar', async () => {
      const strategy = new IamRoleBinderStrategy();
      const source = createMockSourceComponent();
      const externalId = 'cross-account-partner-id-123';
      const target = createMockTargetComponent('iam-role', {
        'iam:role': {
          roleArn: IAM_ROLE_ARN,
          roleName: IAM_ROLE_NAME,
          externalId
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'iam:role',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Check that external ID is exposed as env var
      expect(result.environmentVariables.IAM_ROLE_EXTERNAL_ID).toBe(externalId);

      // Check that assume role policy has external ID condition
      const assumePolicy = result.iamPolicies.find(p => 
        p.statement.actions?.includes('sts:AssumeRole')
      );
      expect(assumePolicy).toBeDefined();
      expect(assumePolicy?.statement.conditions?.StringEquals?.['sts:ExternalId']).toBe(externalId);
    });
  });

  describe('IamRoleBind__WithInlinePolicies__ExposesPolicyInfo', () => {
    const metadata = {
      id: 'TP-binders-security-iamrole-009',
      level: 'unit' as const,
      capability: 'Exposes inline policy names and count as environment variables',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'IamRoleBind__Condition__Outcome', example: 'IamRoleBind__WithInlinePolicies__ExposesPolicyInfo' },
      invariants: [
        'Environment variables include IAM_ROLE_INLINE_POLICY_NAMES',
        'Environment variables include IAM_ROLE_INLINE_POLICY_COUNT',
        'Policy names are comma-separated'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'IamRoleCapabilityDataWithInlinePolicies'],
      inputs: {
        shape: 'BindingContext with iam:role capability including inlinePolicies',
        notes: 'Inline policy information exposed as env vars'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('IamRoleBind__WithInlinePolicies__ExposesPolicyInfo', async () => {
      const strategy = new IamRoleBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('iam-role', {
        'iam:role': {
          roleArn: IAM_ROLE_ARN,
          roleName: IAM_ROLE_NAME,
          inlinePolicies: [
            { name: 'S3AccessPolicy' },
            { name: 'SecretsManagerPolicy' }
          ]
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'iam:role',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      expect(result.environmentVariables.IAM_ROLE_INLINE_POLICY_NAMES).toBe('S3AccessPolicy,SecretsManagerPolicy');
      expect(result.environmentVariables.IAM_ROLE_INLINE_POLICY_COUNT).toBe('2');
    });
  });

  describe('IamRoleBind__MissingRoleArn__ThrowsError', () => {
    const metadata = {
      id: 'TP-binders-security-iamrole-005',
      level: 'unit' as const,
      capability: 'Throws error when target data missing required roleArn property',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'IamRoleBind__Condition__Outcome', example: 'IamRoleBind__MissingRoleArn__ThrowsError' },
      invariants: [
        'Error message indicates missing roleArn',
        'Error is thrown before binding completes'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with iam:role capability but missing roleArn',
        notes: 'Error case for missing required field'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('IamRoleBind__MissingRoleArn__ThrowsError', async () => {
      const strategy = new IamRoleBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('iam-role', {
        'iam:role': {
          roleName: IAM_ROLE_NAME
          // Missing roleArn
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'iam:role',
        access: 'read'
      });

      await expect(executeUnifiedBinding(strategy, context)).rejects.toThrow(
        'Target component missing required roleArn property for IAM role binding'
      );
    });
  });

  describe('IamRoleBind__MissingRoleName__ThrowsError', () => {
    const metadata = {
      id: 'TP-binders-security-iamrole-006',
      level: 'unit' as const,
      capability: 'Throws error when target data missing required roleName property',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'IamRoleBind__Condition__Outcome', example: 'IamRoleBind__MissingRoleName__ThrowsError' },
      invariants: [
        'Error message indicates missing roleName',
        'Error is thrown before binding completes'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with iam:role capability but missing roleName',
        notes: 'Error case for missing required field'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('IamRoleBind__MissingRoleName__ThrowsError', async () => {
      const strategy = new IamRoleBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('iam-role', {
        'iam:role': {
          roleArn: IAM_ROLE_ARN
          // Missing roleName
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'iam:role',
        access: 'read'
      });

      await expect(executeUnifiedBinding(strategy, context)).rejects.toThrow(
        'Target component missing required roleName property for IAM role binding'
      );
    });
  });

  describe('IamRoleBind__CustomActionsOverride__ReplacesCoarseActions', () => {
    const metadata = {
      id: 'TP-binders-iamrole-018',
      level: 'unit' as const,
      capability: 'Custom actions override replaces default coarse-grained actions',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'IamRoleBind__Condition__Outcome', example: 'IamRoleBind__CustomActionsOverride__ReplacesCoarseActions' },
      invariants: [
        'IAM policy actions match provided custom actions',
        'Default coarse access actions are not present',
        'Single policy statement is generated'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'IamRoleCapabilityData'],
      inputs: {
        shape: 'BindingContext with iam:role capability and directive.actions array',
        notes: 'Granular actions override test'
      },
      risks: [],
      dependencies: ['action-resolver'],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('IamRoleBind__CustomActionsOverride__ReplacesCoarseActions', async () => {
      const strategy = new IamRoleBinderStrategy();
      const roleArn = 'arn:aws:iam::123456789012:role/test-role';
      const target = createMockTargetComponent('iam-role', {
        'iam:role': {
          roleArn,
          roleName: 'test-role'
        }
      });

      const customActions = ['iam:GetRole', 'iam:ListRolePolicies'];
      const context = createBindingContext({
        source: createMockSourceComponent(),
        target,
        capability: 'iam:role',
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

  describe('IamRoleBind__InvalidActionPrefix__ThrowsPrefixMismatchError', () => {
    const metadata = {
      id: 'TP-binders-iamrole-019',
      level: 'unit' as const,
      capability: 'Throws error when custom actions have mismatched service prefix',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'IamRoleBind__Condition__Outcome', example: 'IamRoleBind__InvalidActionPrefix__ThrowsPrefixMismatchError' },
      invariants: [
        'Error message indicates mismatched prefix',
        'Error is thrown by action-resolver'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'IamRoleCapabilityData'],
      inputs: {
        shape: 'BindingContext with iam:role capability and directive.actions with invalid prefix',
        notes: 'Error case - invalid action prefix'
      },
      risks: ['Incorrect IAM policy generation'],
      dependencies: ['action-resolver'],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('IamRoleBind__InvalidActionPrefix__ThrowsPrefixMismatchError', async () => {
      const strategy = new IamRoleBinderStrategy();
      const roleArn = 'arn:aws:iam::123456789012:role/test-role';
      const target = createMockTargetComponent('iam-role', {
        'iam:role': {
          roleArn,
          roleName: 'test-role'
        }
      });

      const invalidActions = ['s3:GetObject']; // Invalid prefix for IAM
      const context = createBindingContext({
        source: createMockSourceComponent(),
        target,
        capability: 'iam:role',
        access: 'read',
        actions: invalidActions
      });

      await expect(executeUnifiedBinding(strategy, context)).rejects.toThrow(
        "Actions must match service prefix 'iam:'"
      );
    });
  });
});

