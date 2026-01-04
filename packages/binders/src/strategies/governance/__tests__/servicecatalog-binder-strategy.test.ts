/**
 * ServiceCatalogBinderStrategy Tests (Unified)
 * 
 * Tests for ServiceCatalogBinderStrategy following Platform Testing Standard v1.0
 * All tests assert EnhancedBindingResult structure (return-based, not mutation-based)
 */

import { ServiceCatalogBinderStrategy } from '../servicecatalog-binder-strategy.js';
import {
  createMockSourceComponent,
  createMockTargetComponent,
  createBindingContext,
  executeUnifiedBinding,
  assertEnhancedBindingResult,
  TEST_CONSTANTS
} from '../../security/__tests__/unified-strategy-test-helpers.js';
import type { EnhancedBindingResult } from '@shinobi/core';

describe('ServiceCatalogBinderStrategy', () => {
  describe('ServiceCatalogBind__ValidAccess__ReturnsEnhancedResult', () => {
    const metadata = {
      id: 'TP-binders-governance-servicecatalog-001',
      level: 'unit' as const,
      capability: 'Returns EnhancedBindingResult with all required fields including compliance block',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'ServiceCatalogBind__Condition__Outcome', example: 'ServiceCatalogBind__ValidAccess__ReturnsEnhancedResult' },
      invariants: [
        'result.compliance.status exists and is one of compliant|non-compliant|partially-compliant',
        'result.environmentVariables contains expected keys',
        'result.iamPolicies is an array',
        'result.securityGroupRules is an array'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'catalog:portfolioCapabilityData'],
      inputs: {
        shape: 'BindingContext with catalog:portfolio capability',
        notes: 'Basic valid binding with read access'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('ServiceCatalogBind__ValidAccess__ReturnsEnhancedResult', async () => {
      const strategy = new ServiceCatalogBinderStrategy();
      const source = createMockSourceComponent('lambda-governance', 'test-source');
      
      const target = createMockTargetComponent('servicecatalog', {
        'catalog:portfolio': {
          portfolioArn: 'arn:aws:catalog:us-east-1:123456789012:portfolio/port-1234567890',
          portfolioId: 'port-1234567890',
          portfolioName: 'test-portfolio',
          productId: 'prod-1234567890',
          orgId: 'o-1234567890'
        },
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'catalog:portfolio',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      expect(result.environmentVariables.AWS_SERVICE_CATALOG_PORTFOLIO_ARN).toBe('arn:aws:catalog:us-east-1:123456789012:portfolio/port-1234567890');
      expect(result.environmentVariables.AWS_SERVICE_CATALOG_PORTFOLIO_ID).toBe('port-1234567890');
      expect(result.environmentVariables.AWS_SERVICE_CATALOG_PORTFOLIO_NAME).toBe('test-portfolio');
      expect(result.environmentVariables.AWS_SERVICE_CATALOG_PRODUCT_ID).toBe('prod-1234567890');
      expect(result.environmentVariables.AWS_ORGANIZATIONS_ID).toBe('o-1234567890');
      expect(result.iamPolicies.length).toBeGreaterThan(0);
      expect(['compliant', 'non-compliant', 'partially-compliant']).toContain(result.compliance.status);
    });
  });

  describe('ServiceCatalogBind__CustomActionsOverride__ReplacesCoarseActions', () => {
    const metadata = {
      id: 'TP-binders-governance-servicecatalog-002',
      level: 'unit' as const,
      capability: 'Custom actions override replaces default Service Catalog actions',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'ServiceCatalogBind__Condition__Outcome', example: 'ServiceCatalogBind__CustomActionsOverride__ReplacesCoarseActions' },
      invariants: [
        'IAM policy actions match provided custom actions array',
        'Default Service Catalog actions are not included when custom actions provided',
        'Actions array is used directly (replaces coarse access)'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with catalog:portfolio capability and directive.actions array',
        notes: 'Granular actions override test'
      },
      risks: [],
      dependencies: ['action-resolver'],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('ServiceCatalogBind__CustomActionsOverride__ReplacesCoarseActions', async () => {
      const strategy = new ServiceCatalogBinderStrategy();
      const customActions = ['servicecatalog:DescribePortfolio', 'servicecatalog:ListPortfolios'];
      const target = createMockTargetComponent('servicecatalog', {
        'catalog:portfolio': {
          portfolioArn: 'arn:aws:catalog:us-east-1:123456789012:portfolio/port-1234567890'
        },
      });

      const context = createBindingContext({
        source: createMockSourceComponent('lambda-governance', 'test-source'),
        target,
        capability: 'catalog:portfolio',
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
      expect(actions).not.toContain('servicecatalog:ListPortfolioAccess');
      expect(actions).not.toContain('servicecatalog:DescribeProduct');
    });
  });
});

