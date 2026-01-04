/**
 * AccessAnalyzerBinderStrategy Tests (Unified)
 * 
 * Tests for AccessAnalyzerBinderStrategy following Platform Testing Standard v1.0
 * All tests assert EnhancedBindingResult structure (return-based, not mutation-based)
 */

import { AccessAnalyzerBinderStrategy } from '../accessanalyzer-binder-strategy.js';
import {
  createMockSourceComponent,
  createMockTargetComponent,
  createBindingContext,
  executeUnifiedBinding,
  assertEnhancedBindingResult,
  TEST_CONSTANTS
} from './unified-strategy-test-helpers.js';
import type { EnhancedBindingResult } from '@shinobi/core';

describe('AccessAnalyzerBinderStrategy', () => {
  describe('AccessAnalyzerBind__AnalyzerReadAccess__ReturnsEnhancedResult', () => {
    const metadata = {
      id: 'TP-binders-security-accessanalyzer-001',
      level: 'unit' as const,
      capability: 'Returns EnhancedBindingResult with all required fields including compliance block',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'AccessAnalyzerBind__Condition__Outcome', example: 'AccessAnalyzerBind__AnalyzerReadAccess__ReturnsEnhancedResult' },
      invariants: [
        'result.compliance.status exists and is one of compliant|non-compliant|partially-compliant',
        'result.environmentVariables contains AWS_ACCESS_ANALYZER_ARN',
        'result.iamPolicies is an array with read actions',
        'result.securityGroupRules is an array'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'security:access-analyzerCapabilityData'],
      inputs: {
        shape: 'BindingContext with security:access-analyzer capability and read access',
        notes: 'Basic valid binding with read access'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('AccessAnalyzerBind__AnalyzerReadAccess__ReturnsEnhancedResult', async () => {
      const strategy = new AccessAnalyzerBinderStrategy();
      const source = createMockSourceComponent('lambda-security', 'test-source');
      
      const target = createMockTargetComponent('access-analyzer', {
        'security:access-analyzer': {
          analyzerArn: 'arn:aws:access-analyzer:us-east-1:123456789012:analyzer/test-analyzer',
          findingsSummary: { total: 10, critical: 2 },
          zoneOfTrust: 'arn:aws:iam::123456789012:root',
          analyzerType: 'ACCOUNT_UNUSED_ACCESS'
        },
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'security:access-analyzer',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      expect(result.environmentVariables.AWS_ACCESS_ANALYZER_ARN).toBe('arn:aws:access-analyzer:us-east-1:123456789012:analyzer/test-analyzer');
      expect(result.environmentVariables.AWS_ACCESS_ANALYZER_ZONE_OF_TRUST).toBe('arn:aws:iam::123456789012:root');
      expect(result.environmentVariables.AWS_ACCESS_ANALYZER_TYPE).toBe('ACCOUNT_UNUSED_ACCESS');
      expect(result.environmentVariables.AWS_ACCESS_ANALYZER_FINDINGS_SUMMARY).toBeDefined();
      expect(result.iamPolicies.length).toBeGreaterThan(0);
      expect(['compliant', 'non-compliant', 'partially-compliant']).toContain(result.compliance.status);
    });
  });

  describe('AccessAnalyzerBind__AnalyzerWithAllFields__ExposesAllEnvironmentVariables', () => {
    const metadata = {
      id: 'TP-binders-security-accessanalyzer-005',
      level: 'unit' as const,
      capability: 'Exposes all optional environment variables when provided in target data',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'AccessAnalyzerBind__Condition__Outcome', example: 'AccessAnalyzerBind__AnalyzerWithAllFields__ExposesAllEnvironmentVariables' },
      invariants: [
        'Environment variables include zone of trust detail',
        'Environment variables include unused permissions analysis',
        'Environment variables include finding count and external access count'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'security:access-analyzerCapabilityData'],
      inputs: {
        shape: 'BindingContext with security:access-analyzer capability with all optional fields',
        notes: 'Tests comprehensive field exposure'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('AccessAnalyzerBind__AnalyzerWithAllFields__ExposesAllEnvironmentVariables', async () => {
      const strategy = new AccessAnalyzerBinderStrategy();
      const source = createMockSourceComponent('lambda-security', 'test-source');
      
      const target = createMockTargetComponent('access-analyzer', {
        'security:access-analyzer': {
          analyzerArn: 'arn:aws:access-analyzer:us-east-1:123456789012:analyzer/test-analyzer',
          zoneOfTrust: 'arn:aws:iam::123456789012:root',
          zoneOfTrustDetail: { type: 'AWS_ACCOUNT', id: '123456789012' },
          analyzerType: 'ORGANIZATION',
          unusedPermissionsAnalysis: { unusedActions: ['s3:PutObject'], lastAnalyzed: '2024-01-01T00:00:00Z' },
          findingCount: 42,
          externalAccessCount: 8
        },
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'security:access-analyzer',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      expect(result.environmentVariables.AWS_ACCESS_ANALYZER_ZONE_OF_TRUST_DETAIL).toBeDefined();
      expect(result.environmentVariables.AWS_ACCESS_ANALYZER_UNUSED_PERMISSIONS_ANALYSIS).toBeDefined();
      expect(result.environmentVariables.AWS_ACCESS_ANALYZER_FINDING_COUNT).toBe('42');
      expect(result.environmentVariables.AWS_ACCESS_ANALYZER_EXTERNAL_ACCESS_COUNT).toBe('8');
    });
  });

  describe('AccessAnalyzerBind__AnalyzerWriteAccess__ReturnsWritePolicies', () => {
    const metadata = {
      id: 'TP-binders-security-accessanalyzer-002',
      level: 'unit' as const,
      capability: 'Returns IAM policies with write actions for write access',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'AccessAnalyzerBind__Condition__Outcome', example: 'AccessAnalyzerBind__AnalyzerWriteAccess__ReturnsWritePolicies' },
      invariants: [
        'IAM policies include access-analyzer:CreateAnalyzer',
        'IAM policies include access-analyzer:ArchiveFindings'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'security:access-analyzerCapabilityData'],
      inputs: {
        shape: 'BindingContext with security:access-analyzer capability and write access',
        notes: 'Tests write access IAM policy generation'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('AccessAnalyzerBind__AnalyzerWriteAccess__ReturnsWritePolicies', async () => {
      const strategy = new AccessAnalyzerBinderStrategy();
      const source = createMockSourceComponent('lambda-security', 'test-source');
      
      const target = createMockTargetComponent('access-analyzer', {
        'security:access-analyzer': {
          analyzerArn: 'arn:aws:access-analyzer:us-east-1:123456789012:analyzer/test-analyzer'
        },
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'security:access-analyzer',
        access: 'write'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);
      
      const writePolicy = result.iamPolicies.find(p => 
        p.description.includes('write')
      );
      expect(writePolicy).toBeDefined();
      expect(writePolicy?.statement.actions).toContain('access-analyzer:CreateAnalyzer');
    });
  });

  describe('AccessAnalyzerBind__WithSecureAccess__AddsAutoRemediationPolicies', () => {
    const metadata = {
      id: 'TP-binders-security-accessanalyzer-003',
      level: 'unit' as const,
      capability: 'Adds auto-remediation IAM policies when requireSecureAccess option is provided',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'AccessAnalyzerBind__Condition__Outcome', example: 'AccessAnalyzerBind__WithSecureAccess__AddsAutoRemediationPolicies' },
      invariants: [
        'IAM policies include lambda:InvokeFunction',
        'IAM policies include Security Hub integration',
        'IAM policies include findings archive automation'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'security:access-analyzerCapabilityData'],
      inputs: {
        shape: 'BindingContext with security:access-analyzer capability and requireSecureAccess option',
        notes: 'Tests secure hooks support'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('AccessAnalyzerBind__WithSecureAccess__AddsAutoRemediationPolicies', async () => {
      const strategy = new AccessAnalyzerBinderStrategy();
      const source = createMockSourceComponent('lambda-security', 'test-source');
      
      const target = createMockTargetComponent('access-analyzer', {
        'security:access-analyzer': {
          analyzerArn: 'arn:aws:access-analyzer:us-east-1:123456789012:analyzer/test-analyzer'
        },
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'security:access-analyzer',
        access: 'read',
        options: {
          requireSecureAccess: true
        }
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);
      
      const autoRemediationPolicy = result.iamPolicies.find(p => 
        p.description.includes('Auto-remediation')
      );
      expect(autoRemediationPolicy).toBeDefined();
      expect(autoRemediationPolicy?.statement.actions).toContain('lambda:InvokeFunction');
      
      const securityHubPolicy = result.iamPolicies.find(p => 
        p.description.includes('Security Hub')
      );
      expect(securityHubPolicy).toBeDefined();
      
      const archivePolicy = result.iamPolicies.find(p => 
        p.description.includes('Findings archive')
      );
      expect(archivePolicy).toBeDefined();
    });
  });

  describe('AccessAnalyzerBind__MissingAnalyzerArn__ThrowsError', () => {
    const metadata = {
      id: 'TP-binders-security-accessanalyzer-004',
      level: 'unit' as const,
      capability: 'Throws error when required analyzerArn property is missing',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'AccessAnalyzerBind__Condition__Outcome', example: 'AccessAnalyzerBind__MissingAnalyzerArn__ThrowsError' },
      invariants: [
        'Error message includes "missing required analyzerArn"',
        'Error is thrown before binding completes'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with security:access-analyzer capability but missing analyzerArn',
        notes: 'Tests validation error handling'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('AccessAnalyzerBind__MissingAnalyzerArn__ThrowsError', async () => {
      const strategy = new AccessAnalyzerBinderStrategy();
      const source = createMockSourceComponent('lambda-security', 'test-source');
      
      const target = createMockTargetComponent('access-analyzer', {
        'security:access-analyzer': {
          // Missing analyzerArn
        },
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'security:access-analyzer',
        access: 'read'
      });

      await expect(executeUnifiedBinding(strategy, context)).rejects.toThrow('missing required analyzerArn');
    });
  });

  describe('AccessAnalyzerBind__CustomActionsOverride__ReplacesCoarseActions', () => {
    const metadata = {
      id: 'TP-binders-accessanalyzer-012',
      level: 'unit' as const,
      capability: 'Custom actions override replaces default coarse-grained actions',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'AccessAnalyzerBind__Condition__Outcome', example: 'AccessAnalyzerBind__CustomActionsOverride__ReplacesCoarseActions' },
      invariants: [
        'IAM policy actions match provided custom actions',
        'Default coarse access actions are not present',
        'Single policy statement is generated'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with security:access-analyzer capability and directive.actions array',
        notes: 'Granular actions override test'
      },
      risks: [],
      dependencies: ['action-resolver'],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('AccessAnalyzerBind__CustomActionsOverride__ReplacesCoarseActions', async () => {
      const strategy = new AccessAnalyzerBinderStrategy();
      const target = createMockTargetComponent('access-analyzer', {
        'security:access-analyzer': {
          analyzerArn: 'arn:aws:access-analyzer:us-east-1:123456789012:analyzer/analyzer-12345678'
        }
      });

      const customActions = ['access-analyzer:GetAnalyzer', 'access-analyzer:ListAnalyzers'];
      const context = createBindingContext({
        source: createMockSourceComponent(),
        target,
        capability: 'security:access-analyzer',
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

  describe('AccessAnalyzerBind__InvalidActionPrefix__ThrowsPrefixMismatchError', () => {
    const metadata = {
      id: 'TP-binders-accessanalyzer-013',
      level: 'unit' as const,
      capability: 'Throws error when custom actions have mismatched service prefix',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'AccessAnalyzerBind__Condition__Outcome', example: 'AccessAnalyzerBind__InvalidActionPrefix__ThrowsPrefixMismatchError' },
      invariants: [
        'Error message indicates mismatched prefix',
        'Error is thrown by action-resolver'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with security:access-analyzer capability and directive.actions with invalid prefix',
        notes: 'Error case - invalid action prefix'
      },
      risks: ['Incorrect IAM policy generation'],
      dependencies: ['action-resolver'],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('AccessAnalyzerBind__InvalidActionPrefix__ThrowsPrefixMismatchError', async () => {
      const strategy = new AccessAnalyzerBinderStrategy();
      const target = createMockTargetComponent('access-analyzer', {
        'security:access-analyzer': {
          analyzerArn: 'arn:aws:access-analyzer:us-east-1:123456789012:analyzer/analyzer-12345678'
        }
      });

      const invalidActions = ['s3:GetObject']; // Invalid prefix for Access Analyzer
      const context = createBindingContext({
        source: createMockSourceComponent(),
        target,
        capability: 'security:access-analyzer',
        access: 'read',
        actions: invalidActions
      });

      await expect(executeUnifiedBinding(strategy, context)).rejects.toThrow(
        "Actions must match service prefix 'access-analyzer:'"
      );
    });
  });
});

