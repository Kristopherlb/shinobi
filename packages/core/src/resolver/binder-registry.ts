/**
 * Binder Registry - Manages concrete binding strategy implementations
 * Part of the Strategy pattern for component binding
 */

import { LambdaToSqsBinderStrategy, LambdaToRdsBinderStrategy, LambdaToS3BucketBinderStrategy } from './binders/concrete-binders.ts';

/**
 * Deprecated Resolver Binder Registry shim
 */
export class ResolverBinderRegistry {
  constructor() {
    // no-op; legacy registry removed in favor of platform binders
  }

  /**
   * Legacy method retained for compatibility; no registrations performed
   */
  private registerEnterpriseStrategies(): void {
    // intentionally empty
  }

  /**
   * Legacy binding matrix retained for docs/tests; static suggestions only
   */
  getBindingMatrix(): Array<{
    sourceType: string;
    targetCapability: string;
    description: string;
    supported: boolean;
  }> {
    return [
      { sourceType: 'lambda-api', targetCapability: 'queue:sqs', description: 'Lambda -> SQS', supported: true },
      { sourceType: 'lambda-worker', targetCapability: 'queue:sqs', description: 'Lambda worker -> SQS', supported: true },
      { sourceType: 'lambda-api', targetCapability: 'db:postgres', description: 'Lambda -> Postgres', supported: true },
      { sourceType: 'lambda-worker', targetCapability: 'db:postgres', description: 'Lambda worker -> Postgres', supported: true },
      { sourceType: 'lambda-api', targetCapability: 'bucket:s3', description: 'Lambda -> S3', supported: true },
      { sourceType: 'lambda-worker', targetCapability: 'bucket:s3', description: 'Lambda worker -> S3', supported: true }
    ];
  }

  validateBinding(sourceType: string, targetCapability: string): {
    valid: boolean;
    reason?: string;
    suggestion?: string;
  } {
    const availableTargets = this.getBindingMatrix()
      .filter(binding => binding.sourceType === sourceType && binding.supported)
      .map(binding => binding.targetCapability);

    if (availableTargets.includes(targetCapability)) {
      return { valid: true };
    }

    if (availableTargets.length === 0) {
      return {
        valid: false,
        reason: `No binding strategies available for source type '${sourceType}'`,
        suggestion: `Supported source types: ${[...new Set(this.getBindingMatrix().map(b => b.sourceType))].join(', ')}`
      };
    }

    return {
      valid: false,
      reason: `No binding strategy for '${sourceType}' -> '${targetCapability}'`,
      suggestion: `Available targets for '${sourceType}': ${availableTargets.join(', ')}`
    };
  }
}