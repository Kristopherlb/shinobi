/**
 * RAMBinderStrategy Tests (Unified)
 * 
 * Tests for RAMBinderStrategy following Platform Testing Standard v1.0
 * All tests assert EnhancedBindingResult structure (return-based, not mutation-based)
 */

import { RAMBinderStrategy } from '../ram-binder-strategy.js';
import {
  createMockSourceComponent,
  createMockTargetComponent,
  createBindingContext,
  executeUnifiedBinding,
  assertEnhancedBindingResult,
  TEST_CONSTANTS
} from '../../security/__tests__/unified-strategy-test-helpers.js';
import type { EnhancedBindingResult } from '@shinobi/core';

describe('RAMBinderStrategy', () => {
  describe('RAMBind__ValidAccess__ReturnsEnhancedResult', () => {
    const metadata = {
      id: 'TP-binders-governance-ram-001',
      level: 'unit' as const,
      capability: 'Returns EnhancedBindingResult with all required fields including compliance block',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'RAMBind__Condition__Outcome', example: 'RAMBind__ValidAccess__ReturnsEnhancedResult' },
      invariants: [
        'result.compliance.status exists and is one of compliant|non-compliant|partially-compliant',
        'result.environmentVariables contains expected keys',
        'result.iamPolicies is an array',
        'result.securityGroupRules is an array'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'governance:ram-resource-shareCapabilityData'],
      inputs: {
        shape: 'BindingContext with governance:ram-resource-share capability',
        notes: 'Basic valid binding with read access'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('RAMBind__ValidAccess__ReturnsEnhancedResult', async () => {
      const strategy = new RAMBinderStrategy();
      const source = createMockSourceComponent('lambda-networking', 'test-source');
      
      const target = createMockTargetComponent('ram', {
        'governance:ram-resource-share': {
          resourceShareArn: 'arn:aws:ram:us-east-1:123456789012:resource-share/test-share',
          resourceShareName: 'test-share',
          principalId: '123456789012',
          resourceArn: 'arn:aws:ec2:us-east-1:123456789012:subnet/subnet-12345678',
          permissionType: 'read-only'
        },
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'governance:ram-resource-share',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      expect(result.environmentVariables.AWS_RAM_RESOURCE_SHARE_ARN).toBe('arn:aws:ram:us-east-1:123456789012:resource-share/test-share');
      expect(result.environmentVariables.AWS_RAM_RESOURCE_SHARE_NAME).toBe('test-share');
      expect(result.environmentVariables.AWS_RAM_PRINCIPAL_ID).toBe('123456789012');
      expect(result.environmentVariables.AWS_RAM_RESOURCE_ARN).toBe('arn:aws:ec2:us-east-1:123456789012:subnet/subnet-12345678');
      expect(result.environmentVariables.AWS_RAM_PERMISSION_TYPE).toBe('read-only');
      expect(result.iamPolicies.length).toBeGreaterThan(0);
      expect(['compliant', 'non-compliant', 'partially-compliant']).toContain(result.compliance.status);
    });
  });

  describe('RAMBind__CustomActionsOverride__ReplacesCoarseActions', () => {
    const metadata = {
      id: 'TP-binders-governance-ram-002',
      level: 'unit' as const,
      capability: 'Custom actions override replaces default RAM resource share actions',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'RAMBind__Condition__Outcome', example: 'RAMBind__CustomActionsOverride__ReplacesCoarseActions' },
      invariants: [
        'IAM policy actions match provided custom actions array',
        'Default RAM actions are not included when custom actions provided',
        'Actions array is used directly (replaces coarse access)'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with governance:ram-resource-share capability and directive.actions array',
        notes: 'Granular actions override test'
      },
      risks: [],
      dependencies: ['action-resolver'],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('RAMBind__CustomActionsOverride__ReplacesCoarseActions', async () => {
      const strategy = new RAMBinderStrategy();
      const customActions = ['ram:GetResourceShare', 'ram:ListResourceShares'];
      const target = createMockTargetComponent('ram', {
        'governance:ram-resource-share': {
          resourceShareArn: 'arn:aws:ram:us-east-1:123456789012:resource-share/test-share'
        },
      });

      const context = createBindingContext({
        source: createMockSourceComponent('lambda-networking', 'test-source'),
        target,
        capability: 'governance:ram-resource-share',
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
      expect(actions).not.toContain('ram:GetResourceShareAssociations');
      expect(actions).not.toContain('ram:ListResourceShareAssociations');
    });
  });

  describe('RAMBind__WriteAccess__GrantsWriteActions', () => {
    const metadata = {
      id: 'TP-binders-governance-ram-003',
      level: 'unit' as const,
      capability: 'Write access grants RAM write actions',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'RAMBind__Condition__Outcome', example: 'RAMBind__WriteAccess__GrantsWriteActions' },
      invariants: [
        'IAM policies include RAM write actions',
        'Write actions are present for write access level'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with governance:ram-resource-share capability and write access',
        notes: 'Write access test'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('RAMBind__WriteAccess__GrantsWriteActions', async () => {
      const strategy = new RAMBinderStrategy();
      const target = createMockTargetComponent('ram', {
        'governance:ram-resource-share': {
          resourceShareArn: 'arn:aws:ram:us-east-1:123456789012:resource-share/test-share'
        }
      });

      const context = createBindingContext({
        source: createMockSourceComponent('lambda-networking', 'test-source'),
        target,
        capability: 'governance:ram-resource-share',
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

      expect(actions).toContain('ram:CreateResourceShare');
      expect(actions).toContain('ram:UpdateResourceShare');
      expect(actions).toContain('ram:DeleteResourceShare');
    });
  });

  describe('RAMBind__AdminAccessWithFullAdminOption__GrantsAdminActions', () => {
    const metadata = {
      id: 'TP-binders-governance-ram-004',
      level: 'unit' as const,
      capability: 'Admin access with requireFullAdminAccess option grants admin actions',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'RAMBind__Condition__Outcome', example: 'RAMBind__AdminAccessWithFullAdminOption__GrantsAdminActions' },
      invariants: [
        'IAM policies include RAM admin actions when requireFullAdminAccess option is set',
        'Admin actions include ram:*'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with governance:ram-resource-share capability, admin access, and requireFullAdminAccess option',
        notes: 'Admin access with option test'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('RAMBind__AdminAccessWithFullAdminOption__GrantsAdminActions', async () => {
      const strategy = new RAMBinderStrategy();
      const target = createMockTargetComponent('ram', {
        'governance:ram-resource-share': {
          resourceShareArn: 'arn:aws:ram:us-east-1:123456789012:resource-share/test-share'
        }
      });

      const context = createBindingContext({
        source: createMockSourceComponent('lambda-networking', 'test-source'),
        target,
        capability: 'governance:ram-resource-share',
        access: 'admin',
        options: { requireFullAdminAccess: true }
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      const policy = result.iamPolicies.find(p => p.description.includes('admin access'));
      expect(policy).toBeDefined();
      
      const statementJson = policy!.statement.toStatementJson();
      const actions = Array.isArray(statementJson.Action)
        ? statementJson.Action
        : [statementJson.Action];

      expect(actions).toContain('ram:*');
    });
  });

  describe('RAMBind__RequireSecureAccessWithKMS__GrantsOrganizationsAndKMSActions', () => {
    const metadata = {
      id: 'TP-binders-governance-ram-005',
      level: 'unit' as const,
      capability: 'requireSecureAccess option with KMS key grants Organizations and KMS actions',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'RAMBind__Condition__Outcome', example: 'RAMBind__RequireSecureAccessWithKMS__GrantsOrganizationsAndKMSActions' },
      invariants: [
        'IAM policies include Organizations actions when requireSecureAccess is set',
        'IAM policies include KMS actions when kmsKeyId is provided',
        'KMS policy references the correct key ARN'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with governance:ram-resource-share capability, requireSecureAccess option, and kmsKeyId',
        notes: 'Secure access with KMS test'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('RAMBind__RequireSecureAccessWithKMS__GrantsOrganizationsAndKMSActions', async () => {
      const strategy = new RAMBinderStrategy();
      const kmsKeyId = TEST_CONSTANTS.KMS_KEY_ARN;
      const target = createMockTargetComponent('ram', {
        'governance:ram-resource-share': {
          resourceShareArn: 'arn:aws:ram:us-east-1:123456789012:resource-share/test-share',
          kmsKeyId
        }
      });

      const context = createBindingContext({
        source: createMockSourceComponent('lambda-networking', 'test-source'),
        target,
        capability: 'governance:ram-resource-share',
        access: 'read',
        options: { requireSecureAccess: true }
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      const orgPolicy = result.iamPolicies.find(p => p.description.includes('Organizations access'));
      expect(orgPolicy).toBeDefined();
      
      const orgStatementJson = orgPolicy!.statement.toStatementJson();
      const orgActions = Array.isArray(orgStatementJson.Action)
        ? orgStatementJson.Action
        : [orgStatementJson.Action];

      expect(orgActions).toContain('organizations:DescribeOrganization');
      expect(orgActions).toContain('organizations:ListAccounts');

      const kmsPolicy = result.iamPolicies.find(p => p.description.includes('KMS encryption'));
      expect(kmsPolicy).toBeDefined();
      
      const kmsStatementJson = kmsPolicy!.statement.toStatementJson();
      const kmsActions = Array.isArray(kmsStatementJson.Action)
        ? kmsStatementJson.Action
        : [kmsStatementJson.Action];

      expect(kmsActions).toContain('kms:Decrypt');
      expect(kmsActions).toContain('kms:Encrypt');
      
      const kmsResources = Array.isArray(kmsStatementJson.Resource)
        ? kmsStatementJson.Resource
        : [kmsStatementJson.Resource];
      expect(kmsResources).toContain(kmsKeyId);
    });
  });

  describe('RAMBind__InvitationIdWithWriteAccess__GrantsInvitationActions', () => {
    const metadata = {
      id: 'TP-binders-governance-ram-006',
      level: 'unit' as const,
      capability: 'Invitation ID with write access grants invitation management actions',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'RAMBind__Condition__Outcome', example: 'RAMBind__InvitationIdWithWriteAccess__GrantsInvitationActions' },
      invariants: [
        'IAM policies include invitation management actions when invitationId is provided with write access',
        'Invitation actions include AcceptResourceShareInvitation and RejectResourceShareInvitation'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with governance:ram-resource-share capability, write access, and invitationId',
        notes: 'Invitation handling test'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('RAMBind__InvitationIdWithWriteAccess__GrantsInvitationActions', async () => {
      const strategy = new RAMBinderStrategy();
      const target = createMockTargetComponent('ram', {
        'governance:ram-resource-share': {
          resourceShareArn: 'arn:aws:ram:us-east-1:123456789012:resource-share/test-share',
          invitationId: 'inv-123456789012'
        }
      });

      const context = createBindingContext({
        source: createMockSourceComponent('lambda-networking', 'test-source'),
        target,
        capability: 'governance:ram-resource-share',
        access: 'write'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      expect(result.environmentVariables.AWS_RAM_INVITATION_ID).toBe('inv-123456789012');

      const policy = result.iamPolicies.find(p => p.description.includes('invitation management'));
      expect(policy).toBeDefined();
      
      const statementJson = policy!.statement.toStatementJson();
      const actions = Array.isArray(statementJson.Action)
        ? statementJson.Action
        : [statementJson.Action];

      expect(actions).toContain('ram:AcceptResourceShareInvitation');
      expect(actions).toContain('ram:RejectResourceShareInvitation');
      expect(actions).toContain('ram:GetResourceShareInvitations');
    });
  });

  describe('RAMBind__AllOptionalFields__SetsAllEnvironmentVariables', () => {
    const metadata = {
      id: 'TP-binders-governance-ram-007',
      level: 'unit' as const,
      capability: 'All optional fields are set as environment variables',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'RAMBind__Condition__Outcome', example: 'RAMBind__AllOptionalFields__SetsAllEnvironmentVariables' },
      invariants: [
        'All optional environment variables are set when provided',
        'Environment variables match input data'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with governance:ram-resource-share capability and all optional fields',
        notes: 'Optional fields test'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('RAMBind__AllOptionalFields__SetsAllEnvironmentVariables', async () => {
      const strategy = new RAMBinderStrategy();
      const target = createMockTargetComponent('ram', {
        'governance:ram-resource-share': {
          resourceShareArn: 'arn:aws:ram:us-east-1:123456789012:resource-share/test-share',
          resourceShareName: 'test-share',
          principalId: '123456789012',
          resourceArn: 'arn:aws:ec2:us-east-1:123456789012:subnet/subnet-12345678',
          permissionArn: 'arn:aws:ram:us-east-1:123456789012:permission/read-only',
          invitationId: 'inv-123456789012',
          permissionType: 'read-only',
          resourceType: 'subnet',
          status: 'ACTIVE'
        }
      });

      const context = createBindingContext({
        source: createMockSourceComponent('lambda-networking', 'test-source'),
        target,
        capability: 'governance:ram-resource-share',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      expect(result.environmentVariables.AWS_RAM_RESOURCE_SHARE_ARN).toBe('arn:aws:ram:us-east-1:123456789012:resource-share/test-share');
      expect(result.environmentVariables.AWS_RAM_RESOURCE_SHARE_NAME).toBe('test-share');
      expect(result.environmentVariables.AWS_RAM_PRINCIPAL_ID).toBe('123456789012');
      expect(result.environmentVariables.AWS_RAM_RESOURCE_ARN).toBe('arn:aws:ec2:us-east-1:123456789012:subnet/subnet-12345678');
      expect(result.environmentVariables.AWS_RAM_PERMISSION_ARN).toBe('arn:aws:ram:us-east-1:123456789012:permission/read-only');
      expect(result.environmentVariables.AWS_RAM_INVITATION_ID).toBe('inv-123456789012');
      expect(result.environmentVariables.AWS_RAM_PERMISSION_TYPE).toBe('read-only');
      expect(result.environmentVariables.AWS_RAM_RESOURCE_TYPE).toBe('subnet');
      expect(result.environmentVariables.AWS_RAM_RESOURCE_SHARE_STATUS).toBe('ACTIVE');
    });
  });

  describe('RAMBind__MissingResourceShareArn__ThrowsError', () => {
    const metadata = {
      id: 'TP-binders-governance-ram-008',
      level: 'unit' as const,
      capability: 'Missing required resourceShareArn throws error',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'RAMBind__Condition__Outcome', example: 'RAMBind__MissingResourceShareArn__ThrowsError' },
      invariants: [
        'Error message indicates missing resourceShareArn',
        'Error is thrown before binding completes'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with governance:ram-resource-share capability but missing resourceShareArn',
        notes: 'Error case test'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('RAMBind__MissingResourceShareArn__ThrowsError', async () => {
      const strategy = new RAMBinderStrategy();
      const target = createMockTargetComponent('ram', {
        'governance:ram-resource-share': {
          // Missing resourceShareArn
        } as any
      });

      const context = createBindingContext({
        source: createMockSourceComponent('lambda-networking', 'test-source'),
        target,
        capability: 'governance:ram-resource-share',
        access: 'read'
      });

      await expect(executeUnifiedBinding(strategy, context)).rejects.toThrow(
        'missing required resourceShareArn property'
      );
    });
  });

  describe('RAMBind__OrgRamShareReadAccess__ReturnsEnhancedResult', () => {
    const metadata = {
      id: 'TP-binders-governance-ram-009',
      level: 'unit' as const,
      capability: 'org:ram-share read access returns enhanced result',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'RAMBind__Condition__Outcome', example: 'RAMBind__OrgRamShareReadAccess__ReturnsEnhancedResult' },
      invariants: [
        'Environment variables are set correctly',
        'IAM policies include org-wide read actions',
        'Organizations actions are included'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with org:ram-share capability and read access',
        notes: 'org:ram-share capability test'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('RAMBind__OrgRamShareReadAccess__ReturnsEnhancedResult', async () => {
      const strategy = new RAMBinderStrategy();
      const target = createMockTargetComponent('ram', {
        'org:ram-share': {
          resourceShareArn: 'arn:aws:ram:us-east-1:123456789012:resource-share/test-share',
          orgId: 'o-1234567890',
          ouId: 'ou-1234-567890',
          resourceArn: 'arn:aws:ec2:us-east-1:123456789012:subnet/subnet-12345678'
        }
      });

      const context = createBindingContext({
        source: createMockSourceComponent('lambda-governance', 'test-source'),
        target,
        capability: 'org:ram-share',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      expect(result.environmentVariables.AWS_RAM_RESOURCE_SHARE_ARN).toBe('arn:aws:ram:us-east-1:123456789012:resource-share/test-share');
      expect(result.environmentVariables.AWS_ORGANIZATIONS_ID).toBe('o-1234567890');
      expect(result.environmentVariables.AWS_ORGANIZATIONS_OU_ID).toBe('ou-1234-567890');
      expect(result.environmentVariables.AWS_RAM_RESOURCE_ARN).toBe('arn:aws:ec2:us-east-1:123456789012:subnet/subnet-12345678');

      const policy = result.iamPolicies.find(p => p.description.includes('org-wide read access'));
      expect(policy).toBeDefined();
      
      const statementJson = policy!.statement.toStatementJson();
      const actions = Array.isArray(statementJson.Action)
        ? statementJson.Action
        : [statementJson.Action];

      expect(actions).toContain('ram:GetResourceShare');
      expect(actions).toContain('organizations:DescribeOrganization');
    });
  });

  describe('RAMBind__OrgRamShareWriteAccess__GrantsWriteActions', () => {
    const metadata = {
      id: 'TP-binders-governance-ram-010',
      level: 'unit' as const,
      capability: 'org:ram-share write access grants write actions',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'RAMBind__Condition__Outcome', example: 'RAMBind__OrgRamShareWriteAccess__GrantsWriteActions' },
      invariants: [
        'IAM policies include org-wide write actions',
        'Write actions include CreateResourceShare and UpdateResourceShare'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with org:ram-share capability and write access',
        notes: 'org:ram-share write access test'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('RAMBind__OrgRamShareWriteAccess__GrantsWriteActions', async () => {
      const strategy = new RAMBinderStrategy();
      const target = createMockTargetComponent('ram', {
        'org:ram-share': {
          resourceShareArn: 'arn:aws:ram:us-east-1:123456789012:resource-share/test-share'
        }
      });

      const context = createBindingContext({
        source: createMockSourceComponent('lambda-governance', 'test-source'),
        target,
        capability: 'org:ram-share',
        access: 'write'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      const policy = result.iamPolicies.find(p => p.description.includes('org-wide write access'));
      expect(policy).toBeDefined();
      
      const statementJson = policy!.statement.toStatementJson();
      const actions = Array.isArray(statementJson.Action)
        ? statementJson.Action
        : [statementJson.Action];

      expect(actions).toContain('ram:CreateResourceShare');
      expect(actions).toContain('ram:UpdateResourceShare');
      expect(actions).toContain('organizations:DescribeOrganization');
    });
  });

  describe('RAMBind__OrgRamShareMissingResourceShareArn__ThrowsError', () => {
    const metadata = {
      id: 'TP-binders-governance-ram-011',
      level: 'unit' as const,
      capability: 'org:ram-share missing resourceShareArn throws error',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'RAMBind__Condition__Outcome', example: 'RAMBind__OrgRamShareMissingResourceShareArn__ThrowsError' },
      invariants: [
        'Error message indicates missing resourceShareArn for org:ram-share',
        'Error is thrown before binding completes'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with org:ram-share capability but missing resourceShareArn',
        notes: 'Error case test for org:ram-share'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('RAMBind__OrgRamShareMissingResourceShareArn__ThrowsError', async () => {
      const strategy = new RAMBinderStrategy();
      const target = createMockTargetComponent('ram', {
        'org:ram-share': {
          // Missing resourceShareArn
        } as any
      });

      const context = createBindingContext({
        source: createMockSourceComponent('lambda-governance', 'test-source'),
        target,
        capability: 'org:ram-share',
        access: 'read'
      });

      await expect(executeUnifiedBinding(strategy, context)).rejects.toThrow(
        'missing required resourceShareArn property'
      );
    });
  });

  describe('RAMBind__UnsupportedCapability__ThrowsError', () => {
    const metadata = {
      id: 'TP-binders-governance-ram-012',
      level: 'unit' as const,
      capability: 'Unsupported capability throws error',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'RAMBind__Condition__Outcome', example: 'RAMBind__UnsupportedCapability__ThrowsError' },
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

    test('RAMBind__UnsupportedCapability__ThrowsError', async () => {
      const strategy = new RAMBinderStrategy();
      const target = createMockTargetComponent('ram', {
        'ram:invalid': {
          resourceShareArn: 'arn:aws:ram:us-east-1:123456789012:resource-share/test-share'
        }
      });

      const context = createBindingContext({
        source: createMockSourceComponent('lambda-networking', 'test-source'),
        target,
        capability: 'ram:invalid',
        access: 'read'
      });

      await expect(executeUnifiedBinding(strategy, context)).rejects.toThrow(
        'Unsupported RAM capability'
      );
    });
  });
});

