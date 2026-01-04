/**
 * Test: Unified Binder Registry with Security Strategies
 * 
 * Validates that all 4 security strategies are correctly registered and discoverable
 */

import { UnifiedBinderRegistry } from '../unified-binder-registry.js';
import { KmsBinderStrategy } from '../../../../../../binders/src/strategies/security/kms-binder-strategy.js';
import { SecretsManagerBinderStrategy } from '../../../../../../binders/src/strategies/security/secrets-manager-binder-strategy.js';
import { CertificateBinderStrategy } from '../../../../../../binders/src/strategies/security/certificate-binder-strategy.js';
import { CognitoUserPoolBinderStrategy } from '../../../../../../binders/src/strategies/security/cognito-user-pool-binder-strategy.js';

function createUnifiedBinderRegistry(): UnifiedBinderRegistry {
  return new UnifiedBinderRegistry([
    new KmsBinderStrategy(),
    new SecretsManagerBinderStrategy(),
    new CertificateBinderStrategy(),
    new CognitoUserPoolBinderStrategy()
  ]);
}

describe('UnifiedBinderRegistry - Security Strategies Registration', () => {
  it('should register all 4 security strategies via factory function', () => {
    const registry = createUnifiedBinderRegistry();

    // Verify all strategies are registered by checking their capabilities
    expect(registry.hasStrategy('kms:key')).toBe(true);
    expect(registry.hasStrategy('kms:alias')).toBe(true);
    expect(registry.hasStrategy('kms:grant')).toBe(true);
    
    expect(registry.hasStrategy('secretsmanager:secret')).toBe(true);
    expect(registry.hasStrategy('secretsmanager:rotation')).toBe(true);
    
    expect(registry.hasStrategy('certificate:acm')).toBe(true);
    expect(registry.hasStrategy('certificate:validation')).toBe(true);
    expect(registry.hasStrategy('certificate:monitoring')).toBe(true);
    
    expect(registry.hasStrategy('auth:user-pool')).toBe(true);
    expect(registry.hasStrategy('auth:identity-provider')).toBe(true);

    // Should have 4 unique strategies (one per strategy class)
    expect(registry.getStrategyCount()).toBe(4);
  });

  it('should find strategies by capability', () => {
    const registry = createUnifiedBinderRegistry();

    const kmsStrategy = registry.findStrategy('kms:key');
    expect(kmsStrategy).toBeInstanceOf(KmsBinderStrategy);

    const secretsStrategy = registry.findStrategy('secretsmanager:secret');
    expect(secretsStrategy).toBeInstanceOf(SecretsManagerBinderStrategy);

    const certStrategy = registry.findStrategy('certificate:acm');
    expect(certStrategy).toBeInstanceOf(CertificateBinderStrategy);

    const cognitoStrategy = registry.findStrategy('auth:user-pool');
    expect(cognitoStrategy).toBeInstanceOf(CognitoUserPoolBinderStrategy);
  });

  it('should find strategies for binding (source type + capability)', () => {
    const registry = createUnifiedBinderRegistry();

    // All security strategies can handle any source type (sourceType: '*')
    const kmsStrategy = registry.findStrategyForBinding('lambda-api', 'kms:key');
    expect(kmsStrategy).toBeInstanceOf(KmsBinderStrategy);
    expect(kmsStrategy?.canHandle('lambda-api', 'kms:key')).toBe(true);

    const secretsStrategy = registry.findStrategyForBinding('ecs-task', 'secretsmanager:secret');
    expect(secretsStrategy).toBeInstanceOf(SecretsManagerBinderStrategy);
    expect(secretsStrategy?.canHandle('ecs-task', 'secretsmanager:secret')).toBe(true);

    const certStrategy = registry.findStrategyForBinding('api-gateway', 'certificate:acm');
    expect(certStrategy).toBeInstanceOf(CertificateBinderStrategy);
    expect(certStrategy?.canHandle('api-gateway', 'certificate:acm')).toBe(true);

    const cognitoStrategy = registry.findStrategyForBinding('lambda-api', 'auth:user-pool');
    expect(cognitoStrategy).toBeInstanceOf(CognitoUserPoolBinderStrategy);
    expect(cognitoStrategy?.canHandle('lambda-api', 'auth:user-pool')).toBe(true);
  });

  it('should return null for unknown capabilities', () => {
    const registry = createUnifiedBinderRegistry();

    expect(registry.findStrategy('unknown:capability')).toBeNull();
    expect(registry.findStrategyForBinding('lambda-api', 'unknown:capability')).toBeNull();
  });

  it('should return all registered capabilities', () => {
    const registry = createUnifiedBinderRegistry();
    const capabilities = registry.getRegisteredCapabilities();

    // Should include all security strategy capabilities
    expect(capabilities).toContain('kms:key');
    expect(capabilities).toContain('kms:alias');
    expect(capabilities).toContain('kms:grant');
    expect(capabilities).toContain('secretsmanager:secret');
    expect(capabilities).toContain('secretsmanager:rotation');
    expect(capabilities).toContain('certificate:acm');
    expect(capabilities).toContain('certificate:validation');
    expect(capabilities).toContain('certificate:monitoring');
    expect(capabilities).toContain('auth:user-pool');
    expect(capabilities).toContain('auth:identity-provider');

    // Should have 10 total capabilities (3 KMS + 2 Secrets + 3 Certificate + 2 Cognito)
    expect(capabilities.length).toBe(10);
  });

  it('should allow manual registration of strategies', () => {
    const registry = new UnifiedBinderRegistry();
    
    // Manually register strategies
    registry.register(new KmsBinderStrategy());
    registry.register(new SecretsManagerBinderStrategy());
    registry.register(new CertificateBinderStrategy());
    registry.register(new CognitoUserPoolBinderStrategy());

    expect(registry.getStrategyCount()).toBe(4);
    expect(registry.hasStrategy('kms:key')).toBe(true);
    expect(registry.hasStrategy('secretsmanager:secret')).toBe(true);
    expect(registry.hasStrategy('certificate:acm')).toBe(true);
    expect(registry.hasStrategy('auth:user-pool')).toBe(true);
  });
});
