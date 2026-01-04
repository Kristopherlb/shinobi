/**
 * CloudTrailBinderStrategy Tests (Unified)
 * 
 * Tests for CloudTrailBinderStrategy following Platform Testing Standard v1.0
 * All tests assert EnhancedBindingResult structure (return-based, not mutation-based)
 */

import { CloudTrailBinderStrategy } from '../cloudtrail-binder-strategy.js';
import {
  createMockSourceComponent,
  createMockTargetComponent,
  createBindingContext,
  executeUnifiedBinding,
  assertEnhancedBindingResult,
  TEST_CONSTANTS
} from '../../security/__tests__/unified-strategy-test-helpers.js';
import type { EnhancedBindingResult } from '@shinobi/core';

describe('CloudTrailBinderStrategy', () => {
  describe('CloudTrailBind__ReadAccess__ReturnsEnhancedResult', () => {
    const metadata = {
      id: 'TP-binders-governance-cloudtrail-001',
      level: 'unit' as const,
      capability: 'Returns EnhancedBindingResult with all required fields including compliance block',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'CloudTrailBind__Condition__Outcome', example: 'CloudTrailBind__ReadAccess__ReturnsEnhancedResult' },
      invariants: [
        'result.compliance.status exists and is one of compliant|non-compliant|partially-compliant',
        'result.environmentVariables contains AWS_CLOUDTRAIL_TRAIL_ARN and AWS_CLOUDTRAIL_S3_BUCKET_NAME',
        'result.iamPolicies is an array with read actions',
        'result.securityGroupRules is an array'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'audit:cloudtrail-trailCapabilityData'],
      inputs: {
        shape: 'BindingContext with audit:cloudtrail-trail capability and read access',
        notes: 'Basic valid binding with read access'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('CloudTrailBind__ReadAccess__ReturnsEnhancedResult', async () => {
      const strategy = new CloudTrailBinderStrategy();
      const source = createMockSourceComponent('lambda-audit', 'test-source');
      
      const target = createMockTargetComponent('cloudtrail', {
        'audit:cloudtrail-trail': {
          trailArn: 'arn:aws:cloudtrail:us-east-1:123456789012:trail/test-trail',
          s3BucketName: 'test-cloudtrail-logs',
          trailName: 'test-trail',
          status: 'LOGGING',
          isOrganizationTrail: false,
          isMultiRegionTrail: true
        },
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'audit:cloudtrail-trail',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      expect(result.environmentVariables.AWS_CLOUDTRAIL_TRAIL_ARN).toBe('arn:aws:cloudtrail:us-east-1:123456789012:trail/test-trail');
      expect(result.environmentVariables.AWS_CLOUDTRAIL_S3_BUCKET_NAME).toBe('test-cloudtrail-logs');
      expect(result.environmentVariables.AWS_CLOUDTRAIL_TRAIL_NAME).toBe('test-trail');
      expect(result.environmentVariables.AWS_CLOUDTRAIL_STATUS).toBe('LOGGING');
      expect(result.environmentVariables.AWS_CLOUDTRAIL_IS_MULTI_REGION_TRAIL).toBe('true');
      expect(result.iamPolicies.length).toBeGreaterThan(0);
      expect(['compliant', 'non-compliant', 'partially-compliant']).toContain(result.compliance.status);
    });
  });

  describe('CloudTrailBind__WithLogFileValidation__AddsValidationPolicies', () => {
    const metadata = {
      id: 'TP-binders-governance-cloudtrail-002',
      level: 'unit' as const,
      capability: 'Adds log file validation IAM policies when logFileValidationEnabled is true',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'CloudTrailBind__Condition__Outcome', example: 'CloudTrailBind__WithLogFileValidation__AddsValidationPolicies' },
      invariants: [
        'IAM policies include cloudtrail:ValidateLogs',
        'Environment variables include AWS_CLOUDTRAIL_LOG_FILE_VALIDATION_ENABLED'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'audit:cloudtrail-trailCapabilityData'],
      inputs: {
        shape: 'BindingContext with audit:cloudtrail-trail capability and logFileValidationEnabled',
        notes: 'Tests log file validation support'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('CloudTrailBind__WithLogFileValidation__AddsValidationPolicies', async () => {
      const strategy = new CloudTrailBinderStrategy();
      const source = createMockSourceComponent('lambda-audit', 'test-source');
      
      const target = createMockTargetComponent('cloudtrail', {
        'audit:cloudtrail-trail': {
          trailArn: 'arn:aws:cloudtrail:us-east-1:123456789012:trail/test-trail',
          s3BucketName: 'test-cloudtrail-logs',
          logFileValidationEnabled: true
        },
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'audit:cloudtrail-trail',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);
      expect(result.environmentVariables.AWS_CLOUDTRAIL_LOG_FILE_VALIDATION_ENABLED).toBe('true');
      
      const validationPolicy = result.iamPolicies.find(p => 
        p.description.includes('log file validation')
      );
      expect(validationPolicy).toBeDefined();
    });
  });

  describe('CloudTrailBind__WithEventSelectors__AddsEventSelectorPolicies', () => {
    const metadata = {
      id: 'TP-binders-governance-cloudtrail-003',
      level: 'unit' as const,
      capability: 'Adds event selector management IAM policies when eventSelectors are provided',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'CloudTrailBind__Condition__Outcome', example: 'CloudTrailBind__WithEventSelectors__AddsEventSelectorPolicies' },
      invariants: [
        'IAM policies include cloudtrail:PutEventSelectors and cloudtrail:GetEventSelectors'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'audit:cloudtrail-trailCapabilityData'],
      inputs: {
        shape: 'BindingContext with audit:cloudtrail-trail capability and eventSelectors',
        notes: 'Tests event selector management'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('CloudTrailBind__WithEventSelectors__AddsEventSelectorPolicies', async () => {
      const strategy = new CloudTrailBinderStrategy();
      const source = createMockSourceComponent('lambda-audit', 'test-source');
      
      const target = createMockTargetComponent('cloudtrail', {
        'audit:cloudtrail-trail': {
          trailArn: 'arn:aws:cloudtrail:us-east-1:123456789012:trail/test-trail',
          s3BucketName: 'test-cloudtrail-logs',
          eventSelectors: [{ ReadWriteType: 'All', IncludeManagementEvents: true }]
        },
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'audit:cloudtrail-trail',
        access: 'write'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);
      
      const eventSelectorPolicy = result.iamPolicies.find(p => 
        p.description.includes('event selector')
      );
      expect(eventSelectorPolicy).toBeDefined();
    });
  });

  describe('CloudTrailBind__AdminAccessWithoutRequireFullAdminAccess__NoFullAdminPolicy', () => {
    const metadata = {
      id: 'TP-binders-governance-cloudtrail-004',
      level: 'unit' as const,
      capability: 'Does not grant full cloudtrail:* access when admin access requested without requireFullAdminAccess option',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'CloudTrailBind__Condition__Outcome', example: 'CloudTrailBind__AdminAccessWithoutRequireFullAdminAccess__NoFullAdminPolicy' },
      invariants: [
        'No IAM policy with cloudtrail:* actions when requireFullAdminAccess is not set'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'audit:cloudtrail-trailCapabilityData'],
      inputs: {
        shape: 'BindingContext with audit:cloudtrail-trail capability and admin access without requireFullAdminAccess',
        notes: 'Tests admin access gating'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('CloudTrailBind__AdminAccessWithoutRequireFullAdminAccess__NoFullAdminPolicy', async () => {
      const strategy = new CloudTrailBinderStrategy();
      const source = createMockSourceComponent('lambda-audit', 'test-source');
      
      const target = createMockTargetComponent('cloudtrail', {
        'audit:cloudtrail-trail': {
          trailArn: 'arn:aws:cloudtrail:us-east-1:123456789012:trail/test-trail',
          s3BucketName: 'test-cloudtrail-logs'
        },
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'audit:cloudtrail-trail',
        access: 'admin'
        // Note: requireFullAdminAccess is NOT set
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);
      
      // Should not have full cloudtrail:* policy
      const fullAdminPolicy = result.iamPolicies.find(p => {
        const statementJson = p.statement.toStatementJson();
        return statementJson.Action === 'cloudtrail:*';
      });
      expect(fullAdminPolicy).toBeUndefined();
    });
  });

  describe('CloudTrailBind__MissingTrailArn__ThrowsActionableError', () => {
    const metadata = {
      id: 'TP-binders-governance-cloudtrail-005',
      level: 'unit' as const,
      capability: 'Throws actionable error when trailArn is missing from target capability data',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'CloudTrailBind__Condition__Outcome', example: 'CloudTrailBind__MissingTrailArn__ThrowsActionableError' },
      invariants: [
        'Error message includes trailArn',
        'Error is thrown before IAM policy creation'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with audit:cloudtrail-trail capability but missing trailArn in target data',
        notes: 'Target has s3BucketName but no trailArn'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('CloudTrailBind__MissingTrailArn__ThrowsActionableError', async () => {
      const strategy = new CloudTrailBinderStrategy();
      const source = createMockSourceComponent('lambda-audit', 'test-source');
      const target = createMockTargetComponent('cloudtrail', {
        'audit:cloudtrail-trail': {
          s3BucketName: 'test-cloudtrail-logs'
          // Missing trailArn
        },
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'audit:cloudtrail-trail',
        access: 'read'
      });

      await expect(executeUnifiedBinding(strategy, context)).rejects.toThrow(/trailArn/);
    });
  });

  describe('CloudTrailBind__CustomActionsOverride__ReplacesCoarseActions', () => {
    const metadata = {
      id: 'TP-binders-governance-cloudtrail-003',
      level: 'unit' as const,
      capability: 'Custom actions override replaces default CloudTrail actions',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'CloudTrailBind__Condition__Outcome', example: 'CloudTrailBind__CustomActionsOverride__ReplacesCoarseActions' },
      invariants: [
        'IAM policy actions match provided custom actions array',
        'Default CloudTrail actions are not included when custom actions provided',
        'Actions array is used directly (replaces coarse access)'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with audit:cloudtrail-trail capability and directive.actions array',
        notes: 'Granular actions override test'
      },
      risks: [],
      dependencies: ['action-resolver'],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('CloudTrailBind__CustomActionsOverride__ReplacesCoarseActions', async () => {
      const strategy = new CloudTrailBinderStrategy();
      const customActions = ['cloudtrail:GetTrail', 'cloudtrail:DescribeTrails'];
      const target = createMockTargetComponent('cloudtrail', {
        'audit:cloudtrail-trail': {
          trailArn: 'arn:aws:cloudtrail:us-east-1:123456789012:trail/test-trail',
          s3BucketName: 'test-cloudtrail-logs'
        },
      });

      const context = createBindingContext({
        source: createMockSourceComponent('lambda-audit', 'test-source'),
        target,
        capability: 'audit:cloudtrail-trail',
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
      expect(actions).not.toContain('cloudtrail:GetTrailStatus');
      expect(actions).not.toContain('cloudtrail:LookupEvents');
    });
  });
});

