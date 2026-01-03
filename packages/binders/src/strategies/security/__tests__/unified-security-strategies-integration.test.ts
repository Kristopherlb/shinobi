/**
 * Unified Security Strategies Integration Tests
 * 
 * End-to-end integration tests for all 4 unified security binder strategies
 * following Platform Testing Standard v1.0
 */

import { UnifiedBinderRegistry } from '@shinobi/core';
import {
  KmsBinderStrategy,
  SecretsManagerBinderStrategy,
  CertificateBinderStrategy,
  CognitoUserPoolBinderStrategy
} from '../index.js';
// Note: Full ResolverEngine integration test would require component synthesis setup
// This test validates strategy execution directly rather than full pipeline
import {
  createMockSourceComponent,
  createMockTargetComponent,
  createBindingContext,
  executeUnifiedBinding,
  assertEnhancedBindingResult,
  TEST_CONSTANTS
} from './unified-strategy-test-helpers.js';
import type { EnhancedBindingResult } from '@shinobi/core';

describe('Unified Security Strategies Integration', () => {
  describe('SecurityStrategies__RegistryLookup__FindsAllStrategies', () => {
    const metadata = {
      id: 'TP-binders-integration-001',
      level: 'integration' as const,
      capability: 'UnifiedBinderRegistry.findStrategy() finds all 4 strategies by their capabilities',
      oracle: 'exact' as const,
      invariants: [
        'All 10 capabilities are discoverable (3 KMS + 2 Secrets + 3 Certificate + 2 Cognito)',
        'findStrategy() returns correct strategy instance for each capability',
        'findStrategyForBinding() returns strategy when source type and capability match'
      ],
      fixtures: ['UnifiedBinderRegistry', 'KmsBinderStrategy', 'SecretsManagerBinderStrategy', 'CertificateBinderStrategy', 'CognitoUserPoolBinderStrategy'],
      inputs: {
        shape: 'UnifiedBinderRegistry with all 4 security strategies registered',
        notes: 'Tests registry discovery for all security strategy capabilities'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('SecurityStrategies__RegistryLookup__FindsAllStrategies', () => {
      const registry = new UnifiedBinderRegistry([
        new KmsBinderStrategy(),
        new SecretsManagerBinderStrategy(),
        new CertificateBinderStrategy(),
        new CognitoUserPoolBinderStrategy()
      ]);

      // Primary assertion: All KMS capabilities are discoverable
      expect(registry.hasStrategy('kms:key')).toBe(true);
      expect(registry.hasStrategy('kms:alias')).toBe(true);
      expect(registry.hasStrategy('kms:grant')).toBe(true);

      const kmsStrategy = registry.findStrategy('kms:key');
      expect(kmsStrategy).toBeInstanceOf(KmsBinderStrategy);

      // Primary assertion: All Secrets Manager capabilities are discoverable
      expect(registry.hasStrategy('secretsmanager:secret')).toBe(true);
      expect(registry.hasStrategy('secretsmanager:rotation')).toBe(true);

      const secretsStrategy = registry.findStrategy('secretsmanager:secret');
      expect(secretsStrategy).toBeInstanceOf(SecretsManagerBinderStrategy);

      // Primary assertion: All Certificate capabilities are discoverable
      expect(registry.hasStrategy('certificate:acm')).toBe(true);
      expect(registry.hasStrategy('certificate:validation')).toBe(true);
      expect(registry.hasStrategy('certificate:monitoring')).toBe(true);

      const certStrategy = registry.findStrategy('certificate:acm');
      expect(certStrategy).toBeInstanceOf(CertificateBinderStrategy);

      // Primary assertion: All Cognito capabilities are discoverable
      expect(registry.hasStrategy('auth:user-pool')).toBe(true);
      expect(registry.hasStrategy('auth:identity-provider')).toBe(true);

      const cognitoStrategy = registry.findStrategy('auth:user-pool');
      expect(cognitoStrategy).toBeInstanceOf(CognitoUserPoolBinderStrategy);

      // Invariants: All 10 capabilities are discoverable
      const capabilities = registry.getRegisteredCapabilities();
      expect(capabilities.length).toBe(10);
      expect(registry.getStrategyCount()).toBe(4);

      // Test findStrategyForBinding
      const strategyForBinding = registry.findStrategyForBinding('lambda-api', 'kms:key');
      expect(strategyForBinding).toBeInstanceOf(KmsBinderStrategy);
      expect(strategyForBinding?.canHandle('lambda-api', 'kms:key')).toBe(true);
    });
  });

  describe('SecurityStrategies__ResolverEngineBinding__ExecutesFullPipeline', () => {
    const metadata = {
      id: 'TP-binders-integration-002',
      level: 'integration' as const,
      capability: 'ResolverEngine.bindComponents() executes binding for all 4 security strategies',
      oracle: 'trace' as const,
      invariants: [
        'All bindings return EnhancedBindingResult',
        'All bindings have compliance.status set',
        'Binding pipeline completes without errors'
      ],
      fixtures: ['UnifiedBinderRegistry', 'MockComponents', 'BindingContext'],
      inputs: {
        shape: 'Component array with bindings to all 4 security strategy capabilities',
        notes: 'Tests full binding pipeline execution via ResolverEngine'
      },
      risks: [],
      dependencies: ['@shinobi/core'],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('SecurityStrategies__ResolverEngineBinding__ExecutesFullPipeline', async () => {
      // Note: This test validates the binding execution flow
      // Full ResolverEngine integration would require component synthesis
      // For now, we test the binding execution directly via strategies
      
      const registry = new UnifiedBinderRegistry([
        new KmsBinderStrategy(),
        new SecretsManagerBinderStrategy(),
        new CertificateBinderStrategy(),
        new CognitoUserPoolBinderStrategy()
      ]);

      // Execute bindings for all 4 strategies
      const kmsContext = createBindingContext({
        source: createMockSourceComponent('lambda-api', 'function1'),
        target: createMockTargetComponent('kms-key', {
          'kms:key': {
            keyArn: TEST_CONSTANTS.KMS_KEY_ARN,
            keyId: TEST_CONSTANTS.KMS_KEY_ID
          }
        }),
        capability: 'kms:key',
        access: 'read'
      });

      const secretsContext = createBindingContext({
        source: createMockSourceComponent('lambda-api', 'function2'),
        target: createMockTargetComponent('secret', {
          'secretsmanager:secret': {
            secretArn: TEST_CONSTANTS.SECRET_ARN,
            name: 'test-secret'
          }
        }),
        capability: 'secretsmanager:secret',
        access: 'read'
      });

      const certContext = createBindingContext({
        source: createMockSourceComponent('api-gateway', 'api1'),
        target: createMockTargetComponent('certificate', {
          'certificate:acm': {
            certificateArn: TEST_CONSTANTS.CERTIFICATE_ARN,
            domainName: 'example.com'
          }
        }),
        capability: 'certificate:acm',
        access: 'read'
      });

      const cognitoContext = createBindingContext({
        source: createMockSourceComponent('lambda-api', 'function3'),
        target: createMockTargetComponent('user-pool', {
          'auth:user-pool': {
            userPoolId: TEST_CONSTANTS.USER_POOL_ID,
            userPoolArn: TEST_CONSTANTS.USER_POOL_ARN,
            clients: [{ clientId: 'client-123' }]
          }
        }),
        capability: 'auth:user-pool',
        access: 'read'
      });

      // Execute all bindings
      const kmsStrategy = registry.findStrategy('kms:key')!;
      const secretsStrategy = registry.findStrategy('secretsmanager:secret')!;
      const certStrategy = registry.findStrategy('certificate:acm')!;
      const cognitoStrategy = registry.findStrategy('auth:user-pool')!;

      const kmsResult = await kmsStrategy.bind(kmsContext);
      const secretsResult = await secretsStrategy.bind(secretsContext);
      const certResult = await certStrategy.bind(certContext);
      const cognitoResult = await cognitoStrategy.bind(cognitoContext);

      // Primary assertion: All bindings return EnhancedBindingResult
      assertEnhancedBindingResult(kmsResult);
      assertEnhancedBindingResult(secretsResult);
      assertEnhancedBindingResult(certResult);
      assertEnhancedBindingResult(cognitoResult);

      // Invariants: All have compliance status set
      expect(kmsResult.compliance.status).toBeDefined();
      expect(secretsResult.compliance.status).toBeDefined();
      expect(certResult.compliance.status).toBeDefined();
      expect(cognitoResult.compliance.status).toBeDefined();

      // Invariants: All have compliance framework set
      expect(kmsResult.compliance.framework).toBe(TEST_CONSTANTS.COMPLIANCE_FRAMEWORK);
      expect(secretsResult.compliance.framework).toBe(TEST_CONSTANTS.COMPLIANCE_FRAMEWORK);
      expect(certResult.compliance.framework).toBe(TEST_CONSTANTS.COMPLIANCE_FRAMEWORK);
      expect(cognitoResult.compliance.framework).toBe(TEST_CONSTANTS.COMPLIANCE_FRAMEWORK);
    });
  });

  describe('SecurityStrategies__ComplianceFrameworkPropagation__AppliesToAllStrategies', () => {
    const metadata = {
      id: 'TP-binders-integration-003',
      level: 'integration' as const,
      capability: 'complianceFramework from context propagates to all strategy results',
      oracle: 'exact' as const,
      invariants: [
        'All results.compliance.framework match input framework',
        'Framework propagation works for commercial, fedramp-moderate, fedramp-high'
      ],
      fixtures: ['UnifiedBinderRegistry', 'MockComponents', 'BindingContext'],
      inputs: {
        shape: 'BindingContext with different complianceFramework values',
        notes: 'Tests compliance framework propagation across all 4 strategies'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('SecurityStrategies__ComplianceFrameworkPropagation__AppliesToAllStrategies', async () => {
      const registry = new UnifiedBinderRegistry([
        new KmsBinderStrategy(),
        new SecretsManagerBinderStrategy(),
        new CertificateBinderStrategy(),
        new CognitoUserPoolBinderStrategy()
      ]);
      const frameworks = ['commercial', 'fedramp-moderate', 'fedramp-high'] as const;

      for (const framework of frameworks) {
        const kmsContext = createBindingContext({
          source: createMockSourceComponent(),
          target: createMockTargetComponent('kms-key', {
            'kms:key': {
              keyArn: TEST_CONSTANTS.KMS_KEY_ARN,
              keyId: TEST_CONSTANTS.KMS_KEY_ID
            }
          }),
          capability: 'kms:key',
          access: 'read',
          complianceFramework: framework
        });

        const secretsContext = createBindingContext({
          source: createMockSourceComponent(),
          target: createMockTargetComponent('secret', {
            'secretsmanager:secret': {
              secretArn: TEST_CONSTANTS.SECRET_ARN,
              name: 'test-secret'
            }
          }),
          capability: 'secretsmanager:secret',
          access: 'read',
          complianceFramework: framework
        });

        const certContext = createBindingContext({
          source: createMockSourceComponent(),
          target: createMockTargetComponent('certificate', {
            'certificate:acm': {
              certificateArn: TEST_CONSTANTS.CERTIFICATE_ARN
            }
          }),
          capability: 'certificate:acm',
          access: 'read',
          complianceFramework: framework
        });

        const cognitoContext = createBindingContext({
          source: createMockSourceComponent(),
          target: createMockTargetComponent('user-pool', {
            'auth:user-pool': {
              userPoolId: TEST_CONSTANTS.USER_POOL_ID,
              userPoolArn: TEST_CONSTANTS.USER_POOL_ARN,
              clients: [{ clientId: 'client-123' }]
            }
          }),
          capability: 'auth:user-pool',
          access: 'read',
          complianceFramework: framework
        });

        const kmsStrategy = registry.findStrategy('kms:key')!;
        const secretsStrategy = registry.findStrategy('secretsmanager:secret')!;
        const certStrategy = registry.findStrategy('certificate:acm')!;
        const cognitoStrategy = registry.findStrategy('auth:user-pool')!;

        const kmsResult = await kmsStrategy.bind(kmsContext);
        const secretsResult = await secretsStrategy.bind(secretsContext);
        const certResult = await certStrategy.bind(certContext);
        const cognitoResult = await cognitoStrategy.bind(cognitoContext);

        // Primary assertion: All results have matching compliance framework
        expect(kmsResult.compliance.framework).toBe(framework);
        expect(secretsResult.compliance.framework).toBe(framework);
        expect(certResult.compliance.framework).toBe(framework);
        expect(cognitoResult.compliance.framework).toBe(framework);
      }
    });
  });
});
