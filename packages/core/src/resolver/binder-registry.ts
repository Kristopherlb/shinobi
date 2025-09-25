/**
 * Binder Registry - Manages concrete binding strategy implementations
 * Part of the Strategy pattern for component binding
 */

import { LambdaToSqsBinderStrategy, LambdaToRdsBinderStrategy, LambdaToS3BucketBinderStrategy } from './binders/concrete-binders';

type BindingMatrixEntry = {
  readonly sourceType: string;
  readonly targetCapability: string;
  readonly description: string;
  readonly supported: boolean;
};

const BINDING_MATRIX: ReadonlyArray<BindingMatrixEntry> = Object.freeze([
  { sourceType: 'lambda-api', targetCapability: 'queue:sqs', description: 'Lambda -> SQS', supported: true },
  { sourceType: 'lambda-worker', targetCapability: 'queue:sqs', description: 'Lambda worker -> SQS', supported: true },
  { sourceType: 'lambda-api', targetCapability: 'db:postgres', description: 'Lambda -> Postgres', supported: true },
  { sourceType: 'lambda-worker', targetCapability: 'db:postgres', description: 'Lambda worker -> Postgres', supported: true },
  { sourceType: 'lambda-api', targetCapability: 'bucket:s3', description: 'Lambda -> S3', supported: true },
  { sourceType: 'lambda-worker', targetCapability: 'bucket:s3', description: 'Lambda worker -> S3', supported: true }
]);

interface SourceBindingIndex {
  readonly supportedTargets: ReadonlyArray<string>;
  readonly supportedTargetSet: ReadonlySet<string>;
}

const SOURCE_BINDING_INDEX: ReadonlyMap<string, SourceBindingIndex> = (() => {
  const mutableIndex = new Map<string, { targets: string[]; targetSet: Set<string> }>();

  for (const entry of BINDING_MATRIX) {
    if (!entry.supported) {
      continue;
    }

    const existing = mutableIndex.get(entry.sourceType);
    if (existing) {
      if (!existing.targetSet.has(entry.targetCapability)) {
        existing.targetSet.add(entry.targetCapability);
        existing.targets.push(entry.targetCapability);
      }
      continue;
    }

    mutableIndex.set(entry.sourceType, {
      targets: [entry.targetCapability],
      targetSet: new Set([entry.targetCapability])
    });
  }

  return new Map(
    Array.from(mutableIndex.entries(), ([sourceType, meta]) => [
      sourceType,
      {
        supportedTargets: Object.freeze([...meta.targets]),
        supportedTargetSet: meta.targetSet as ReadonlySet<string>
      }
    ])
  );
})();

const SUPPORTED_SOURCE_TYPES: ReadonlyArray<string> = Object.freeze([
  ...SOURCE_BINDING_INDEX.keys()
]);

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
  getBindingMatrix(): ReadonlyArray<BindingMatrixEntry> {
    return BINDING_MATRIX;
  }

  validateBinding(sourceType: string, targetCapability: string): {
    valid: boolean;
    reason?: string;
    suggestion?: string;
  } {
    const bindingMeta = SOURCE_BINDING_INDEX.get(sourceType);

    if (bindingMeta?.supportedTargetSet.has(targetCapability)) {
      return { valid: true };
    }

    if (!bindingMeta || bindingMeta.supportedTargets.length === 0) {
      return {
        valid: false,
        reason: `No binding strategies available for source type '${sourceType}'`,
        suggestion: `Supported source types: ${SUPPORTED_SOURCE_TYPES.join(', ')}`
      };
    }

    return {
      valid: false,
      reason: `No binding strategy for '${sourceType}' -> '${targetCapability}'`,
      suggestion: `Available targets for '${sourceType}': ${bindingMeta.supportedTargets.join(', ')}`
    };
  }
}