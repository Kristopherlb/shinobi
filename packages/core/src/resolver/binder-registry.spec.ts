import { ResolverBinderRegistry } from './binder-registry';

describe('ResolverBinderRegistry', () => {
  let registry: ResolverBinderRegistry;

  beforeEach(() => {
    registry = new ResolverBinderRegistry();
  });

  it('approves supported bindings using the precomputed lookup', () => {
    expect(registry.validateBinding('lambda-api', 'queue:sqs')).toEqual({ valid: true });
  });

  it('suggests available targets for a known source type', () => {
    expect(registry.validateBinding('lambda-api', 'queue:sns')).toEqual({
      valid: false,
      reason: "No binding strategy for 'lambda-api' -> 'queue:sns'",
      suggestion: "Available targets for 'lambda-api': queue:sqs, db:postgres, bucket:s3"
    });
  });

  it('lists supported source types when none are available for a given source', () => {
    expect(registry.validateBinding('step-function', 'queue:sqs')).toEqual({
      valid: false,
      reason: "No binding strategies available for source type 'step-function'",
      suggestion: 'Supported source types: lambda-api, lambda-worker'
    });
  });
});
