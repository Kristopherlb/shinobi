/**
 * OrganizationsBinderStrategy Tests (Unified)
 * 
 * Tests for OrganizationsBinderStrategy following Platform Testing Standard v1.0
 * All tests assert EnhancedBindingResult structure (return-based, not mutation-based)
 */

import { OrganizationsBinderStrategy } from '../organizations-binder-strategy.js';
import {
  createMockSourceComponent,
  createMockTargetComponent,
  createBindingContext,
  executeUnifiedBinding,
  assertEnhancedBindingResult,
  TEST_CONSTANTS
} from '../../security/__tests__/unified-strategy-test-helpers.js';
import type { EnhancedBindingResult } from '@shinobi/core';

describe('OrganizationsBinderStrategy', () => {
  describe('OrganizationsBind__ScpReadAccess__ReturnsEnhancedResult', () => {
    const metadata = {
      id: 'TP-binders-governance-organizations-001',
      level: 'unit' as const,
      capability: 'Returns EnhancedBindingResult with all required fields including compliance block',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'OrganizationsBind__Condition__Outcome', example: 'OrganizationsBind__ScpReadAccess__ReturnsEnhancedResult' },
      invariants: [
        'result.compliance.status exists and is one of compliant|non-compliant|partially-compliant',
        'result.environmentVariables contains AWS_ORGANIZATIONS_ID and AWS_ORGANIZATIONS_MASTER_ACCOUNT_ID',
        'result.iamPolicies is an array with read actions',
        'result.securityGroupRules is an array'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'org:scpCapabilityData'],
      inputs: {
        shape: 'BindingContext with org:scp capability and read access',
        notes: 'Basic valid binding with read access'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('OrganizationsBind__ScpReadAccess__ReturnsEnhancedResult', async () => {
      const strategy = new OrganizationsBinderStrategy();
      const source = createMockSourceComponent('lambda-governance', 'test-source');
      
      const target = createMockTargetComponent('organizations', {
        'org:scp': {
          orgId: 'o-1234567890',
          masterAccountId: '111111111111',
          scpArn: 'arn:aws:organizations::111111111111:policy/o-1234567890/scp/p-1234567890'
        },
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'org:scp',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      expect(result.environmentVariables.AWS_ORGANIZATIONS_ID).toBe('o-1234567890');
      expect(result.environmentVariables.AWS_ORGANIZATIONS_MASTER_ACCOUNT_ID).toBe('111111111111');
      expect(result.environmentVariables.AWS_ORGANIZATIONS_SCP_ARN).toBe('arn:aws:organizations::111111111111:policy/o-1234567890/scp/p-1234567890');
      expect(result.iamPolicies.length).toBeGreaterThan(0);
      expect(['compliant', 'non-compliant', 'partially-compliant']).toContain(result.compliance.status);
    });
  });

  describe('OrganizationsBind__ScpWithDelegatedAdmin__AddsDelegatedAdminPolicies', () => {
    const metadata = {
      id: 'TP-binders-governance-organizations-002',
      level: 'unit' as const,
      capability: 'Adds delegated admin IAM policies when options.delegatedAdminAccountId is provided',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'OrganizationsBind__Condition__Outcome', example: 'OrganizationsBind__ScpWithDelegatedAdmin__AddsDelegatedAdminPolicies' },
      invariants: [
        'IAM policies include organizations:RegisterDelegatedAdministrator',
        'Environment variables include AWS_ORGANIZATIONS_DELEGATED_ADMIN_ACCOUNT_ID'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'org:scpCapabilityData'],
      inputs: {
        shape: 'BindingContext with org:scp capability and delegatedAdminAccountId option',
        notes: 'Tests delegated admin support'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('OrganizationsBind__ScpWithDelegatedAdmin__AddsDelegatedAdminPolicies', async () => {
      const strategy = new OrganizationsBinderStrategy();
      const source = createMockSourceComponent('lambda-governance', 'test-source');
      
      const target = createMockTargetComponent('organizations', {
        'org:scp': {
          orgId: 'o-1234567890',
          masterAccountId: '111111111111'
        },
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'org:scp',
        access: 'write',
        options: {
          delegatedAdminAccountId: '222222222222'
        }
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);
      expect(result.environmentVariables.AWS_ORGANIZATIONS_DELEGATED_ADMIN_ACCOUNT_ID).toBe('222222222222');
      
      const delegatedAdminPolicy = result.iamPolicies.find(p => 
        p.description.includes('delegated admin')
      );
      expect(delegatedAdminPolicy).toBeDefined();
    });
  });

  describe('OrganizationsBind__ScpWithRootIdAndOuPath__ExposesRootIdAndOuPath', () => {
    const metadata = {
      id: 'TP-binders-governance-organizations-003',
      level: 'unit' as const,
      capability: 'Exposes root ID and OU path in environment variables when provided',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'OrganizationsBind__Condition__Outcome', example: 'OrganizationsBind__ScpWithRootIdAndOuPath__ExposesRootIdAndOuPath' },
      invariants: [
        'Environment variables include AWS_ORGANIZATIONS_ROOT_ID when rootId provided',
        'Environment variables include AWS_ORGANIZATIONS_OU_PATH when ouPath provided'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'org:scpCapabilityData'],
      inputs: {
        shape: 'BindingContext with org:scp capability including rootId and ouPath',
        notes: 'Tests root ID and OU path exposure'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('OrganizationsBind__ScpWithRootIdAndOuPath__ExposesRootIdAndOuPath', async () => {
      const strategy = new OrganizationsBinderStrategy();
      const source = createMockSourceComponent('lambda-governance', 'test-source');
      
      const target = createMockTargetComponent('organizations', {
        'org:scp': {
          orgId: 'o-1234567890',
          masterAccountId: '111111111111',
          rootId: 'r-1234',
          ouPath: 'r-1234/ou-1234-567890ab/ou-1234-567890cd'
        },
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'org:scp',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);
      expect(result.environmentVariables.AWS_ORGANIZATIONS_ROOT_ID).toBe('r-1234');
      expect(result.environmentVariables.AWS_ORGANIZATIONS_OU_PATH).toBe('r-1234/ou-1234-567890ab/ou-1234-567890cd');
    });
  });

  describe('OrganizationsBind__AdminAccessWithoutRequireFullAdminAccess__NoFullAdminPolicy', () => {
    const metadata = {
      id: 'TP-binders-governance-organizations-004',
      level: 'unit' as const,
      capability: 'Does not grant full organizations:* access when admin access requested without requireFullAdminAccess option',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'OrganizationsBind__Condition__Outcome', example: 'OrganizationsBind__AdminAccessWithoutRequireFullAdminAccess__NoFullAdminPolicy' },
      invariants: [
        'No IAM policy with organizations:* actions when requireFullAdminAccess is not set',
        'IAM policies still include write actions for admin access'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'org:scpCapabilityData'],
      inputs: {
        shape: 'BindingContext with org:scp capability and admin access without requireFullAdminAccess',
        notes: 'Tests admin access gating'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('OrganizationsBind__AdminAccessWithoutRequireFullAdminAccess__NoFullAdminPolicy', async () => {
      const strategy = new OrganizationsBinderStrategy();
      const source = createMockSourceComponent('lambda-governance', 'test-source');
      
      const target = createMockTargetComponent('organizations', {
        'org:scp': {
          orgId: 'o-1234567890',
          masterAccountId: '111111111111'
        },
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'org:scp',
        access: 'admin'
        // Note: requireFullAdminAccess is NOT set
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);
      
      // Should not have full organizations:* policy
      const fullAdminPolicy = result.iamPolicies.find(p => 
        p.statement.toStatementJson().Action === 'organizations:*'
      );
      expect(fullAdminPolicy).toBeUndefined();
      
      // Should still have write policies
      expect(result.iamPolicies.length).toBeGreaterThan(0);
    });
  });

  describe('OrganizationsBind__AllCapabilities__RoutesToCorrectMethod', () => {
    const metadata = {
      id: 'TP-binders-governance-organizations-005',
      level: 'unit' as const,
      capability: 'Routes all 7 capabilities to correct binding methods',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'OrganizationsBind__Condition__Outcome', example: 'OrganizationsBind__AllCapabilities__RoutesToCorrectMethod' },
      invariants: [
        'Each capability returns EnhancedBindingResult',
        'Each capability includes AWS_ORGANIZATIONS_ID and AWS_ORGANIZATIONS_MASTER_ACCOUNT_ID'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with different Organizations capabilities',
        notes: 'Tests all 7 supported capabilities'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('OrganizationsBind__AllCapabilities__RoutesToCorrectMethod', async () => {
      const strategy = new OrganizationsBinderStrategy();
      const baseTargetData = {
        orgId: 'o-1234567890',
        masterAccountId: '111111111111'
      };

      const capabilities = [
        'org:scp',
        'org:tag-policy',
        'org:backup-policy',
        'org:ou',
        'org:account',
        'org:ai-services-opt-out',
        'org:service-linked-role'
      ];

      for (const capability of capabilities) {
        const target = createMockTargetComponent('organizations', {
          [capability]: baseTargetData
        });

        const context = createBindingContext({
          source: createMockSourceComponent('lambda-governance', 'test-source'),
          target,
          capability,
          access: 'read'
        });

        const result = await executeUnifiedBinding(strategy, context);
        assertEnhancedBindingResult(result);
        expect(result.environmentVariables.AWS_ORGANIZATIONS_ID).toBe('o-1234567890');
        expect(result.environmentVariables.AWS_ORGANIZATIONS_MASTER_ACCOUNT_ID).toBe('111111111111');
      }
    });
  });

  describe('OrganizationsBind__MissingOrgId__ThrowsActionableError', () => {
    const metadata = {
      id: 'TP-binders-governance-organizations-006',
      level: 'unit' as const,
      capability: 'Throws actionable error when orgId is missing from target capability data',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'OrganizationsBind__Condition__Outcome', example: 'OrganizationsBind__MissingOrgId__ThrowsActionableError' },
      invariants: [
        'Error message includes orgId',
        'Error is thrown before IAM policy creation'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with org:scp capability but missing orgId in target data',
        notes: 'Target has masterAccountId but no orgId'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('OrganizationsBind__MissingOrgId__ThrowsActionableError', async () => {
      const strategy = new OrganizationsBinderStrategy();
      const source = createMockSourceComponent('lambda-governance', 'test-source');
      const target = createMockTargetComponent('organizations', {
        'org:scp': {
          masterAccountId: '111111111111'
          // Missing orgId
        },
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'org:scp',
        access: 'read'
      });

      await expect(executeUnifiedBinding(strategy, context)).rejects.toThrow(/orgId/);
    });
  });

  describe('OrganizationsBind__CustomActionsOverride__ReplacesCoarseActions', () => {
    const metadata = {
      id: 'TP-binders-governance-organizations-003',
      level: 'unit' as const,
      capability: 'Custom actions override replaces default Organizations SCP actions',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'OrganizationsBind__Condition__Outcome', example: 'OrganizationsBind__CustomActionsOverride__ReplacesCoarseActions' },
      invariants: [
        'IAM policy actions match provided custom actions array',
        'Default Organizations actions are not included when custom actions provided',
        'Actions array is used directly (replaces coarse access)'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with org:scp capability and directive.actions array',
        notes: 'Granular actions override test'
      },
      risks: [],
      dependencies: ['action-resolver'],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('OrganizationsBind__CustomActionsOverride__ReplacesCoarseActions', async () => {
      const strategy = new OrganizationsBinderStrategy();
      const customActions = ['organizations:DescribePolicy', 'organizations:ListPolicies'];
      const target = createMockTargetComponent('organizations', {
        'org:scp': {
          orgId: 'o-1234567890',
          masterAccountId: '111111111111'
        },
      });

      const context = createBindingContext({
        source: createMockSourceComponent('lambda-governance', 'test-source'),
        target,
        capability: 'org:scp',
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
      expect(actions).not.toContain('organizations:ListPoliciesForTarget');
      expect(actions).not.toContain('organizations:DescribeOrganization');
    });
  });

  describe('OrganizationsBind__ScpWriteAccess__GrantsWriteActions', () => {
    const metadata = {
      id: 'TP-binders-governance-organizations-008',
      level: 'unit' as const,
      capability: 'SCP write access grants Organizations write actions',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'OrganizationsBind__Condition__Outcome', example: 'OrganizationsBind__ScpWriteAccess__GrantsWriteActions' },
      invariants: [
        'IAM policies include Organizations write actions',
        'Write actions include CreatePolicy and AttachPolicy'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with org:scp capability and write access',
        notes: 'SCP write access test'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('OrganizationsBind__ScpWriteAccess__GrantsWriteActions', async () => {
      const strategy = new OrganizationsBinderStrategy();
      const target = createMockTargetComponent('organizations', {
        'org:scp': {
          orgId: 'o-1234567890',
          masterAccountId: '111111111111'
        }
      });

      const context = createBindingContext({
        source: createMockSourceComponent('lambda-governance', 'test-source'),
        target,
        capability: 'org:scp',
        access: 'write'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      const policy = result.iamPolicies.find(p => p.description.includes('write access'));
      expect(policy).toBeDefined();
      
      const statementJson = policy!.statement.toStatementJson();
      const actions = Array.isArray(statementJson.Action)
        ? statementJson.Action
        : [statementJson.Action];

      expect(actions).toContain('organizations:CreatePolicy');
      expect(actions).toContain('organizations:AttachPolicy');
    });
  });

  describe('OrganizationsBind__TagPolicyReadAccess__ReturnsEnhancedResult', () => {
    const metadata = {
      id: 'TP-binders-governance-organizations-009',
      level: 'unit' as const,
      capability: 'Tag policy read access returns enhanced result',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'OrganizationsBind__Condition__Outcome', example: 'OrganizationsBind__TagPolicyReadAccess__ReturnsEnhancedResult' },
      invariants: [
        'Environment variables are set correctly',
        'IAM policies include tag policy read actions'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with org:tag-policy capability and read access',
        notes: 'Tag policy read access test'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('OrganizationsBind__TagPolicyReadAccess__ReturnsEnhancedResult', async () => {
      const strategy = new OrganizationsBinderStrategy();
      const target = createMockTargetComponent('organizations', {
        'org:tag-policy': {
          orgId: 'o-1234567890',
          masterAccountId: '111111111111',
          tagPolicyId: 'p-1234567890'
        }
      });

      const context = createBindingContext({
        source: createMockSourceComponent('lambda-governance', 'test-source'),
        target,
        capability: 'org:tag-policy',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      expect(result.environmentVariables.AWS_ORGANIZATIONS_ID).toBe('o-1234567890');
      expect(result.environmentVariables.AWS_ORGANIZATIONS_MASTER_ACCOUNT_ID).toBe('111111111111');

      const policy = result.iamPolicies.find(p => p.description.includes('tag policy read access'));
      expect(policy).toBeDefined();
      
      const statementJson = policy!.statement.toStatementJson();
      const actions = Array.isArray(statementJson.Action)
        ? statementJson.Action
        : [statementJson.Action];

      expect(actions).toContain('organizations:DescribePolicy');
      expect(actions).toContain('organizations:ListPolicies');
    });
  });

  describe('OrganizationsBind__TagPolicyMissingOrgId__ThrowsError', () => {
    const metadata = {
      id: 'TP-binders-governance-organizations-010',
      level: 'unit' as const,
      capability: 'Tag policy missing orgId throws error',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'OrganizationsBind__Condition__Outcome', example: 'OrganizationsBind__TagPolicyMissingOrgId__ThrowsError' },
      invariants: [
        'Error message indicates missing orgId for tag policy',
        'Error is thrown before binding completes'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with org:tag-policy capability but missing orgId',
        notes: 'Error case test'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('OrganizationsBind__TagPolicyMissingOrgId__ThrowsError', async () => {
      const strategy = new OrganizationsBinderStrategy();
      const target = createMockTargetComponent('organizations', {
        'org:tag-policy': {
          // Missing orgId
          masterAccountId: '111111111111'
        } as any
      });

      const context = createBindingContext({
        source: createMockSourceComponent('lambda-governance', 'test-source'),
        target,
        capability: 'org:tag-policy',
        access: 'read'
      });

      await expect(executeUnifiedBinding(strategy, context)).rejects.toThrow(
        'missing required orgId property'
      );
    });
  });

  describe('OrganizationsBind__BackupPolicyReadAccess__ReturnsEnhancedResult', () => {
    const metadata = {
      id: 'TP-binders-governance-organizations-011',
      level: 'unit' as const,
      capability: 'Backup policy read access returns enhanced result',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'OrganizationsBind__Condition__Outcome', example: 'OrganizationsBind__BackupPolicyReadAccess__ReturnsEnhancedResult' },
      invariants: [
        'Environment variables are set correctly',
        'IAM policies include backup policy read actions'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with org:backup-policy capability and read access',
        notes: 'Backup policy read access test'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('OrganizationsBind__BackupPolicyReadAccess__ReturnsEnhancedResult', async () => {
      const strategy = new OrganizationsBinderStrategy();
      const target = createMockTargetComponent('organizations', {
        'org:backup-policy': {
          orgId: 'o-1234567890',
          masterAccountId: '111111111111'
        }
      });

      const context = createBindingContext({
        source: createMockSourceComponent('lambda-governance', 'test-source'),
        target,
        capability: 'org:backup-policy',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      expect(result.environmentVariables.AWS_ORGANIZATIONS_ID).toBe('o-1234567890');
      
      const policy = result.iamPolicies.find(p => p.description.includes('backup policy read access'));
      expect(policy).toBeDefined();
    });
  });

  describe('OrganizationsBind__OuReadAccess__ReturnsEnhancedResult', () => {
    const metadata = {
      id: 'TP-binders-governance-organizations-012',
      level: 'unit' as const,
      capability: 'OU read access returns enhanced result',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'OrganizationsBind__Condition__Outcome', example: 'OrganizationsBind__OuReadAccess__ReturnsEnhancedResult' },
      invariants: [
        'Environment variables are set correctly',
        'IAM policies include OU read actions'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with org:ou capability and read access',
        notes: 'OU read access test'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('OrganizationsBind__OuReadAccess__ReturnsEnhancedResult', async () => {
      const strategy = new OrganizationsBinderStrategy();
      const target = createMockTargetComponent('organizations', {
        'org:ou': {
          orgId: 'o-1234567890',
          masterAccountId: '111111111111',
          ouId: 'ou-1234-567890ab',
          rootId: 'r-1234',
          ouPath: 'r-1234/ou-1234-567890ab'
        }
      });

      const context = createBindingContext({
        source: createMockSourceComponent('lambda-governance', 'test-source'),
        target,
        capability: 'org:ou',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      expect(result.environmentVariables.AWS_ORGANIZATIONS_ID).toBe('o-1234567890');
      expect(result.environmentVariables.AWS_ORGANIZATIONS_OU_ID).toBe('ou-1234-567890ab');
      expect(result.environmentVariables.AWS_ORGANIZATIONS_ROOT_ID).toBe('r-1234');
      expect(result.environmentVariables.AWS_ORGANIZATIONS_OU_PATH).toBe('r-1234/ou-1234-567890ab');
      
      const policy = result.iamPolicies.find(p => p.description.includes('OU read access'));
      expect(policy).toBeDefined();
    });
  });

  describe('OrganizationsBind__AccountReadAccess__ReturnsEnhancedResult', () => {
    const metadata = {
      id: 'TP-binders-governance-organizations-013',
      level: 'unit' as const,
      capability: 'Account read access returns enhanced result',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'OrganizationsBind__Condition__Outcome', example: 'OrganizationsBind__AccountReadAccess__ReturnsEnhancedResult' },
      invariants: [
        'Environment variables are set correctly',
        'IAM policies include account read actions'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with org:account capability and read access',
        notes: 'Account read access test'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('OrganizationsBind__AccountReadAccess__ReturnsEnhancedResult', async () => {
      const strategy = new OrganizationsBinderStrategy();
      const target = createMockTargetComponent('organizations', {
        'org:account': {
          orgId: 'o-1234567890',
          masterAccountId: '111111111111',
          accountId: '222222222222'
        }
      });

      const context = createBindingContext({
        source: createMockSourceComponent('lambda-governance', 'test-source'),
        target,
        capability: 'org:account',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      expect(result.environmentVariables.AWS_ORGANIZATIONS_ID).toBe('o-1234567890');
      expect(result.environmentVariables.AWS_ORGANIZATIONS_ACCOUNT_ID).toBe('222222222222');
      
      const policy = result.iamPolicies.find(p => p.description.includes('account read access'));
      expect(policy).toBeDefined();
    });
  });

  describe('OrganizationsBind__UnsupportedCapability__ThrowsError', () => {
    const metadata = {
      id: 'TP-binders-governance-organizations-014',
      level: 'unit' as const,
      capability: 'Unsupported capability throws error',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'OrganizationsBind__Condition__Outcome', example: 'OrganizationsBind__UnsupportedCapability__ThrowsError' },
      invariants: [
        'Error message indicates unsupported capability',
        'Error lists supported capabilities'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with unsupported capability',
        notes: 'Error case test'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('OrganizationsBind__UnsupportedCapability__ThrowsError', async () => {
      const strategy = new OrganizationsBinderStrategy();
      const target = createMockTargetComponent('organizations', {
        'org:invalid': {
          orgId: 'o-1234567890'
        }
      });

      const context = createBindingContext({
        source: createMockSourceComponent('lambda-governance', 'test-source'),
        target,
        capability: 'org:invalid',
        access: 'read'
      });

      await expect(executeUnifiedBinding(strategy, context)).rejects.toThrow(
        'Unsupported Organizations capability'
      );
    });
  });
});

