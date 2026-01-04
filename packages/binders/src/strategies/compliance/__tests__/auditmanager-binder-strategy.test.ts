/**
 * AuditManagerBinderStrategy Tests (Unified)
 * 
 * Tests for AuditManagerBinderStrategy following Platform Testing Standard v1.0
 * All tests assert EnhancedBindingResult structure (return-based, not mutation-based)
 */

import { AuditManagerBinderStrategy } from '../auditmanager-binder-strategy.js';
import {
  createMockSourceComponent,
  createMockTargetComponent,
  createBindingContext,
  executeUnifiedBinding,
  assertEnhancedBindingResult,
  TEST_CONSTANTS
} from '@shinobi/binders/security/__tests__/unified-strategy-test-helpers';
import type { EnhancedBindingResult } from '@shinobi/core';

describe('AuditManagerBinderStrategy', () => {
  describe('AuditManagerBind__FrameworkReadAccess__ReturnsEnhancedResult', () => {
    const metadata = {
      id: 'TP-binders-compliance-auditmanager-001',
      level: 'unit' as const,
      capability: 'Returns EnhancedBindingResult with all required fields including compliance block',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'AuditManagerBind__Condition__Outcome', example: 'AuditManagerBind__FrameworkReadAccess__ReturnsEnhancedResult' },
      invariants: [
        'result.compliance.status exists and is one of compliant|non-compliant|partially-compliant',
        'result.environmentVariables contains AWS_AUDIT_MANAGER_FRAMEWORK_ARN',
        'result.iamPolicies is an array with read actions',
        'result.securityGroupRules is an array'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'compliance:audit-manager-frameworkCapabilityData'],
      inputs: {
        shape: 'BindingContext with compliance:audit-manager-framework capability and read access',
        notes: 'Basic valid binding with read access'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('AuditManagerBind__FrameworkReadAccess__ReturnsEnhancedResult', async () => {
      const strategy = new AuditManagerBinderStrategy();
      const source = createMockSourceComponent('lambda-compliance', 'test-source');
      
      const target = createMockTargetComponent('auditmanager', {
        'compliance:audit-manager-framework': {
          frameworkArn: 'arn:aws:auditmanager:us-east-1:123456789012:framework/test-framework'
        },
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'compliance:audit-manager-framework',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      expect(result.environmentVariables.AWS_AUDIT_MANAGER_FRAMEWORK_ARN).toBe('arn:aws:auditmanager:us-east-1:123456789012:framework/test-framework');
      expect(result.iamPolicies.length).toBeGreaterThan(0);
      expect(['compliant', 'non-compliant', 'partially-compliant']).toContain(result.compliance.status);
    });
  });

  describe('AuditManagerBind__AssessmentReadAccess__ReturnsEnhancedResult', () => {
    const metadata = {
      id: 'TP-binders-compliance-auditmanager-002',
      level: 'unit' as const,
      capability: 'Returns EnhancedBindingResult for assessment capability with read access',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'AuditManagerBind__Condition__Outcome', example: 'AuditManagerBind__AssessmentReadAccess__ReturnsEnhancedResult' },
      invariants: [
        'result.environmentVariables contains AWS_AUDIT_MANAGER_ASSESSMENT_ID',
        'result.iamPolicies is an array with assessment read actions'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'compliance:audit-manager-assessmentCapabilityData'],
      inputs: {
        shape: 'BindingContext with compliance:audit-manager-assessment capability and read access',
        notes: 'Basic valid binding with read access for assessment capability'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('AuditManagerBind__AssessmentReadAccess__ReturnsEnhancedResult', async () => {
      const strategy = new AuditManagerBinderStrategy();
      const source = createMockSourceComponent('lambda-compliance', 'test-source');
      
      const target = createMockTargetComponent('auditmanager', {
        'compliance:audit-manager-assessment': {
          assessmentId: 'test-assessment-id',
          frameworkArn: 'arn:aws:auditmanager:us-east-1:123456789012:framework/test-framework',
          assessmentReportArn: 'arn:aws:auditmanager:us-east-1:123456789012:assessment/test-assessment/report/test-report'
        },
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'compliance:audit-manager-assessment',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      expect(result.environmentVariables.AWS_AUDIT_MANAGER_ASSESSMENT_ID).toBe('test-assessment-id');
      expect(result.environmentVariables.AWS_AUDIT_MANAGER_FRAMEWORK_ARN).toBe('arn:aws:auditmanager:us-east-1:123456789012:framework/test-framework');
      expect(result.environmentVariables.AWS_AUDIT_MANAGER_ASSESSMENT_REPORT_ARN).toBe('arn:aws:auditmanager:us-east-1:123456789012:assessment/test-assessment/report/test-report');
    });
  });

  describe('AuditManagerBind__AssessmentWithAllFields__ExposesAllEnvironmentVariables', () => {
    const metadata = {
      id: 'TP-binders-compliance-auditmanager-003',
      level: 'unit' as const,
      capability: 'Exposes all optional environment variables for assessment when provided',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'AuditManagerBind__Condition__Outcome', example: 'AuditManagerBind__AssessmentWithAllFields__ExposesAllEnvironmentVariables' },
      invariants: [
        'Environment variables include assessment report URL',
        'Environment variables include assessment status',
        'Environment variables include evidence folder ARN',
        'Environment variables include control ID'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'compliance:audit-manager-assessmentCapabilityData'],
      inputs: {
        shape: 'BindingContext with compliance:audit-manager-assessment capability with all optional fields',
        notes: 'Tests comprehensive field exposure for assessment'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('AuditManagerBind__AssessmentWithAllFields__ExposesAllEnvironmentVariables', async () => {
      const strategy = new AuditManagerBinderStrategy();
      const source = createMockSourceComponent('lambda-compliance', 'test-source');
      
      const target = createMockTargetComponent('auditmanager', {
        'compliance:audit-manager-assessment': {
          assessmentId: 'test-assessment-id',
          assessmentReportUrl: 'https://auditmanager.aws.amazon.com/assessment/test-assessment',
          assessmentStatus: 'ACTIVE',
          evidenceFolderArn: 'arn:aws:auditmanager:us-east-1:123456789012:assessment/test-assessment/evidence-folder/test-folder',
          controlId: 'test-control-id'
        },
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'compliance:audit-manager-assessment',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      expect(result.environmentVariables.AWS_AUDIT_MANAGER_ASSESSMENT_REPORT_URL).toBe('https://auditmanager.aws.amazon.com/assessment/test-assessment');
      expect(result.environmentVariables.AWS_AUDIT_MANAGER_ASSESSMENT_STATUS).toBe('ACTIVE');
      expect(result.environmentVariables.AWS_AUDIT_MANAGER_EVIDENCE_FOLDER_ARN).toBe('arn:aws:auditmanager:us-east-1:123456789012:assessment/test-assessment/evidence-folder/test-folder');
      expect(result.environmentVariables.AWS_AUDIT_MANAGER_CONTROL_ID).toBe('test-control-id');
    });
  });

  describe('AuditManagerBind__WithDelegatedAdmin__AddsDelegatedAdminPolicies', () => {
    const metadata = {
      id: 'TP-binders-compliance-auditmanager-004',
      level: 'unit' as const,
      capability: 'Adds delegated admin IAM policies when delegatedAdminAccountId option is provided',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'AuditManagerBind__Condition__Outcome', example: 'AuditManagerBind__WithDelegatedAdmin__AddsDelegatedAdminPolicies' },
      invariants: [
        'IAM policies include auditmanager:RegisterOrganizationAdminAccount',
        'Environment variables include AWS_AUDIT_MANAGER_DELEGATED_ADMIN_ACCOUNT_ID'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'compliance:audit-manager-assessmentCapabilityData'],
      inputs: {
        shape: 'BindingContext with compliance:audit-manager-assessment capability and delegatedAdminAccountId option',
        notes: 'Tests delegated admin support'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('AuditManagerBind__WithDelegatedAdmin__AddsDelegatedAdminPolicies', async () => {
      const strategy = new AuditManagerBinderStrategy();
      const source = createMockSourceComponent('lambda-compliance', 'test-source');
      
      const target = createMockTargetComponent('auditmanager', {
        'compliance:audit-manager-assessment': {
          assessmentId: 'test-assessment-id'
        },
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'compliance:audit-manager-assessment',
        access: 'write',
        options: {
          delegatedAdminAccountId: '123456789012'
        }
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      const delegatedAdminPolicy = result.iamPolicies.find(p => {
        const statementJson = p.statement.toStatementJson();
        const actions = Array.isArray(statementJson.Action) ? statementJson.Action : [statementJson.Action];
        return actions.some((action: string) => action.includes('RegisterOrganizationAdminAccount'));
      });
      expect(delegatedAdminPolicy).toBeDefined();
      expect(result.environmentVariables.AWS_AUDIT_MANAGER_DELEGATED_ADMIN_ACCOUNT_ID).toBe('123456789012');
    });
  });

  describe('AuditManagerBind__WithOrgWideEnablement__AddsOrgWidePolicies', () => {
    const metadata = {
      id: 'TP-binders-compliance-auditmanager-005',
      level: 'unit' as const,
      capability: 'Adds org-wide enablement IAM policies when orgWideEnablement option is provided',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'AuditManagerBind__Condition__Outcome', example: 'AuditManagerBind__WithOrgWideEnablement__AddsOrgWidePolicies' },
      invariants: [
        'IAM policies include auditmanager:RegisterAccount',
        'Environment variables include AWS_AUDIT_MANAGER_ORG_WIDE_ENABLED'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'compliance:audit-manager-assessmentCapabilityData'],
      inputs: {
        shape: 'BindingContext with compliance:audit-manager-assessment capability and orgWideEnablement option',
        notes: 'Tests org-wide enablement support'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('AuditManagerBind__WithOrgWideEnablement__AddsOrgWidePolicies', async () => {
      const strategy = new AuditManagerBinderStrategy();
      const source = createMockSourceComponent('lambda-compliance', 'test-source');
      
      const target = createMockTargetComponent('auditmanager', {
        'compliance:audit-manager-assessment': {
          assessmentId: 'test-assessment-id'
        },
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'compliance:audit-manager-assessment',
        access: 'write',
        options: {
          orgWideEnablement: true
        }
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      const orgWidePolicy = result.iamPolicies.find(p => {
        const statementJson = p.statement.toStatementJson();
        const actions = Array.isArray(statementJson.Action) ? statementJson.Action : [statementJson.Action];
        return actions.some((action: string) => action.includes('RegisterAccount'));
      });
      expect(orgWidePolicy).toBeDefined();
      expect(result.environmentVariables.AWS_AUDIT_MANAGER_ORG_WIDE_ENABLED).toBe('true');
    });
  });

  describe('AuditManagerBind__WithSecureAccess__AddsSecureHooks', () => {
    const metadata = {
      id: 'TP-binders-compliance-auditmanager-006',
      level: 'unit' as const,
      capability: 'Adds secure hooks IAM policies when requireSecureAccess option is set',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'AuditManagerBind__Condition__Outcome', example: 'AuditManagerBind__WithSecureAccess__AddsSecureHooks' },
      invariants: [
        'IAM policies include KMS encryption actions if kmsKeyId provided',
        'IAM policies include S3 export actions if findings export bucket provided',
        'IAM policies include Security Hub integration actions',
        'IAM policies include Config integration actions',
        'Environment variables include all secure access flags'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'compliance:audit-manager-assessmentCapabilityData'],
      inputs: {
        shape: 'BindingContext with compliance:audit-manager-assessment capability and requireSecureAccess option',
        notes: 'Tests secure hooks integration'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('AuditManagerBind__WithSecureAccess__AddsSecureHooks', async () => {
      const strategy = new AuditManagerBinderStrategy();
      const source = createMockSourceComponent('lambda-compliance', 'test-source');
      
      const target = createMockTargetComponent('auditmanager', {
        'compliance:audit-manager-assessment': {
          assessmentId: 'test-assessment-id',
          kmsKeyId: 'arn:aws:kms:us-east-1:123456789012:key/test-key',
          findingsExportBucket: 's3://auditmanager-findings-bucket'
        },
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'compliance:audit-manager-assessment',
        access: 'read',
        options: {
          requireSecureAccess: true
        }
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      const kmsPolicy = result.iamPolicies.find(p => {
        const statementJson = p.statement.toStatementJson();
        const actions = Array.isArray(statementJson.Action) ? statementJson.Action : [statementJson.Action];
        return actions.some((action: string) => action.includes('kms:Decrypt'));
      });
      expect(kmsPolicy).toBeDefined();

      const s3Policy = result.iamPolicies.find(p => {
        const statementJson = p.statement.toStatementJson();
        const actions = Array.isArray(statementJson.Action) ? statementJson.Action : [statementJson.Action];
        return actions.some((action: string) => action.includes('s3:PutObject'));
      });
      expect(s3Policy).toBeDefined();

      const securityHubPolicy = result.iamPolicies.find(p => {
        const statementJson = p.statement.toStatementJson();
        const actions = Array.isArray(statementJson.Action) ? statementJson.Action : [statementJson.Action];
        return actions.some((action: string) => action.includes('securityhub:BatchImportFindings'));
      });
      expect(securityHubPolicy).toBeDefined();

      const configPolicy = result.iamPolicies.find(p => {
        const statementJson = p.statement.toStatementJson();
        const actions = Array.isArray(statementJson.Action) ? statementJson.Action : [statementJson.Action];
        return actions.some((action: string) => action.includes('config:GetResourceConfigHistory'));
      });
      expect(configPolicy).toBeDefined();

      expect(result.environmentVariables.AWS_AUDIT_MANAGER_KMS_KEY_ID).toBe('arn:aws:kms:us-east-1:123456789012:key/test-key');
      expect(result.environmentVariables.AWS_AUDIT_MANAGER_FINDINGS_EXPORT_BUCKET).toBe('s3://auditmanager-findings-bucket');
      expect(result.environmentVariables.AWS_AUDIT_MANAGER_SECURITY_HUB_INTEGRATION_ENABLED).toBe('true');
      expect(result.environmentVariables.AWS_AUDIT_MANAGER_CONFIG_INTEGRATION_ENABLED).toBe('true');
      expect(result.environmentVariables.AWS_AUDIT_MANAGER_EVIDENCE_AUTOMATION_ENABLED).toBe('true');
      expect(result.environmentVariables.AWS_AUDIT_MANAGER_SECURE_ACCESS_ENABLED).toBe('true');
    });
  });

  describe('AuditManagerBind__MissingFrameworkArn__ThrowsError', () => {
    const metadata = {
      id: 'TP-binders-compliance-auditmanager-007',
      level: 'unit' as const,
      capability: 'Throws error when required frameworkArn is missing',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'AuditManagerBind__Condition__Outcome', example: 'AuditManagerBind__MissingFrameworkArn__ThrowsError' },
      invariants: [
        'Error message indicates missing frameworkArn property'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with compliance:audit-manager-framework capability but missing frameworkArn',
        notes: 'Tests error handling for missing required fields'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('AuditManagerBind__MissingFrameworkArn__ThrowsError', async () => {
      const strategy = new AuditManagerBinderStrategy();
      const source = createMockSourceComponent('lambda-compliance', 'test-source');
      
      const target = createMockTargetComponent('auditmanager', {
        'compliance:audit-manager-framework': {
          // Missing frameworkArn
        },
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'compliance:audit-manager-framework',
        access: 'read'
      });

      await expect(executeUnifiedBinding(strategy, context)).rejects.toThrow(
        'Target component missing required frameworkArn property'
      );
    });
  });

  describe('AuditManagerBind__MissingAssessmentId__ThrowsError', () => {
    const metadata = {
      id: 'TP-binders-compliance-auditmanager-008',
      level: 'unit' as const,
      capability: 'Throws error when required assessmentId is missing',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'AuditManagerBind__Condition__Outcome', example: 'AuditManagerBind__MissingAssessmentId__ThrowsError' },
      invariants: [
        'Error message indicates missing assessmentId property'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with compliance:audit-manager-assessment capability but missing assessmentId',
        notes: 'Tests error handling for missing required fields'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('AuditManagerBind__MissingAssessmentId__ThrowsError', async () => {
      const strategy = new AuditManagerBinderStrategy();
      const source = createMockSourceComponent('lambda-compliance', 'test-source');
      
      const target = createMockTargetComponent('auditmanager', {
        'compliance:audit-manager-assessment': {
          // Missing assessmentId
        },
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'compliance:audit-manager-assessment',
        access: 'read'
      });

      await expect(executeUnifiedBinding(strategy, context)).rejects.toThrow(
        'Target component missing required assessmentId property'
      );
    });
  });

  describe('AuditManagerBind__CustomActionsOverride__ReplacesCoarseActions', () => {
    const metadata = {
      id: 'TP-binders-compliance-auditmanager-003',
      level: 'unit' as const,
      capability: 'Custom actions override replaces default Audit Manager framework actions',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'AuditManagerBind__Condition__Outcome', example: 'AuditManagerBind__CustomActionsOverride__ReplacesCoarseActions' },
      invariants: [
        'IAM policy actions match provided custom actions array',
        'Default Audit Manager actions are not included when custom actions provided',
        'Actions array is used directly (replaces coarse access)'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with compliance:audit-manager-framework capability and directive.actions array',
        notes: 'Granular actions override test'
      },
      risks: [],
      dependencies: ['action-resolver'],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('AuditManagerBind__CustomActionsOverride__ReplacesCoarseActions', async () => {
      const strategy = new AuditManagerBinderStrategy();
      const customActions = ['auditmanager:GetFramework', 'auditmanager:ListFrameworks'];
      const target = createMockTargetComponent('auditmanager', {
        'compliance:audit-manager-framework': {
          frameworkArn: 'arn:aws:auditmanager:us-east-1:123456789012:framework/test-framework'
        },
      });

      const context = createBindingContext({
        source: createMockSourceComponent('lambda-compliance', 'test-source'),
        target,
        capability: 'compliance:audit-manager-framework',
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
      expect(actions).not.toContain('auditmanager:GetControl');
      expect(actions).not.toContain('auditmanager:ListControls');
    });
  });
});


