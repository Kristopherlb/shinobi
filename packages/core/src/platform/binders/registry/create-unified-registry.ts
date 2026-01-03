/**
 * Factory function to create a UnifiedBinderRegistry with all security strategies
 * 
 * This is a convenience function for testing and composition root setup.
 * All 4 security strategies are registered by default.
 * 
 * Usage:
 * ```typescript
 * import { createUnifiedBinderRegistry } from '@shinobi/core';
 * 
 * const registry = createUnifiedBinderRegistry();
 * // Registry now contains: KMS, Secrets Manager, Certificate, Cognito strategies
 * ```
 */

import { UnifiedBinderRegistry } from './unified-binder-registry.js';
import {
  KmsBinderStrategy,
  SecretsManagerBinderStrategy,
  CertificateBinderStrategy,
  CognitoUserPoolBinderStrategy
} from '@shinobi/binders/security';

/**
 * Create a UnifiedBinderRegistry with all security strategies registered
 * 
 * @returns A UnifiedBinderRegistry instance with security strategies registered
 */
export function createUnifiedBinderRegistry(): UnifiedBinderRegistry {
  return new UnifiedBinderRegistry([
    new KmsBinderStrategy(),
    new SecretsManagerBinderStrategy(),
    new CertificateBinderStrategy(),
    new CognitoUserPoolBinderStrategy()
  ]);
}
