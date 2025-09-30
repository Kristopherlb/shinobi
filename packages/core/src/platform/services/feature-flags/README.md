# Feature Flag Service

The Feature Flag Service is the platform's OpenFeature integration layer. It standardizes how
components evaluate feature flags, manages provider lifecycle, and ensures evaluations inherit
platform metadata (service name, environment, compliance framework, etc.).

## Responsibilities

- Translate platform configuration (manifest, config builders, or runtime overrides) into the
  OpenFeature provider and client model.
- Lazily instantiate OpenFeature clients and cache them by client name/provider signature.
- Merge evaluation context from multiple sources (global defaults, component context, per-call
  overrides) so targeting rules operate on a consistent attribute set.
- Provide typed helpers (`getBooleanValue`, `getStringValue`, `getNumberValue`, `getObjectValue`)
  plus batch evaluation with shared context.
- Coordinate provider shutdown during application teardown.

## Provider Resolution

Providers can be supplied three ways:

1. **Explicit instance**: Pass `providerInstance` in `FeatureFlagProviderConfig` to use a prepared
   provider (e.g., `new InMemoryProvider(flags)` for tests).
2. **Module loading**: Provide a `name` (e.g., `aws-appconfig`) and optional `module` / `factory`
   hints. The service maps common names to packages and attempts to import and instantiate a
   provider at runtime.
3. **Context defaults**: Builders can populate `context.featureFlags.provider`; the service falls
   back to these when no override is supplied.

Configuration signatures are serialized (minus functions) so the service only re-registers providers
when inputs change. Previous providers with an `onClose` method are disposed automatically.

## Context Layering

Evaluation context is composed in the following order (later entries override earlier values):

1. Global context provided during `configure()`.
2. Service-level defaults from `FeatureFlagServiceConfig.defaultContext`.
3. Component manifest context (`ComponentContext.featureFlags.defaultEvaluationContext`).
4. Projection of the component context (service name, environment, compliance framework, etc.).
5. Per-evaluation overrides (`FeatureFlagEvaluationOptions.context`).

This layering lets platform-wide attributes flow into targeting rules while still allowing ad-hoc
values per evaluation.

## API Summary

```ts
const service = new FeatureFlagService({
  provider: { name: 'aws-appconfig' },
  defaultContext: { deployment: 'blue' },
  hooks: [customAuditHook]
});

await service.configure({ clientName: 'checkout', logger: customLogger });

const cartFeature = await service.getBooleanValue({
  flagKey: 'checkout_experience_v2',
  defaultValue: false,
  componentContext,
  context: { tenantId: 'acme' }
});

const batch = await service.evaluateFlags({
  clientName: 'checkout',
  flags: [
    { key: 'checkout_experience_v2', type: 'boolean', defaultValue: false },
    { key: 'checkout_theme', type: 'string', defaultValue: 'legacy' }
  ],
  componentContext
});

await service.shutdown();
```

### Key methods

- `configure(config)`: Merge runtime overrides, update logging/context, and ensure providers are
  registered when necessary.
- `getClient(options)`: Resolve an OpenFeature client, creating and caching as needed.
- `getBooleanValue` / `getStringValue` / `getNumberValue` / `getObjectValue`: Type-specific helpers
  that return `EvaluationDetails<T>` including value, reason, variant, and metadata.
- `evaluateFlags(request)`: Batch evaluation for mixed flag types while sharing client/context.
- `shutdown()`: Dispose all cached providers and clients; call during graceful shutdowns to flush
  any open connections.

## Error Handling

- Provider resolution failures fall back to the OpenFeature noop provider and log a warning.
- Evaluation errors (network, parsing, provider failure) produce the supplied default value and log
  an error. The returned `EvaluationDetails` carries `reason = ERROR` and `errorCode = GENERAL` for
  observability.
- Invalid provider modules are ignored to prevent runtime crashes; the caller remains responsible
  for supplying a valid configuration.

## Integration with Components

`BaseComponent` injects a `featureFlagService` instance; components can:

```ts
const result = await this.featureFlagService.getBooleanValue({
  flagKey: 'bucket_versioning_opt_in',
  defaultValue: true,
  componentContext: this.context,
  context: { capability: 'storage:s3-bucket', component: this.spec.name }
});
```

Component contexts should populate `context.featureFlags.provider` during config building when a
specific provider binding is required. Otherwise the service will use global defaults.

## Testing Guidance

- For unit tests, configure the service with `providerInstance: new InMemoryProvider(flags)` to
  avoid network calls and guarantee deterministic evaluations.
- Use `evaluateFlags` to validate per-flag metadata when writing platform compliance tests.
- Jest example tests live in `__tests__/feature-flag.service.test.ts` and illustrate typical
  patterns.

## Related Services

- **Logging Service** – Injected into `FeatureFlagService` when provided via configuration; ensures
  evaluations emit structured logs consistent with platform standards.
- **BaseComponent** – Supplies component context and integrates the service into component lifecycle
  methods so feature flag evaluations can occur during synthesis or runtime hooks.

## Future Enhancements

- Native support for the new `@openfeature/server-sdk` once the ecosystem finishes migration.
- Optional cache warm-up and provider health monitoring hooks.
- Additional default provider mappings for emerging vendors (e.g., ConfigCat, Unleash).
