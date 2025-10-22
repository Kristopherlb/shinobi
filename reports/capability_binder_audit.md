# Capability & Binder Matrix Audit – dynamodb-table

## Observations
- The component registers `db:dynamodb`, `dynamodb:table`, `dynamodb:index`, and `dynamodb:stream` capabilities, exposing table metadata, index definitions, and stream endpoints for downstream consumers.[^cap-register]
- Capability payloads include key schema, attribute definitions, backup metadata, and observability parameters, which are useful for binders and diagnostics.[^cap-payload]

## Findings
- ❗ The binder registry looks up strategies by capability string, but the DynamoDB strategy is registered under the service key `'dynamodb'` and only advertises `dynamodb:*` capabilities. Requests for `db:dynamodb` therefore fail strategy resolution despite the component emitting that canonical capability.[^cap-alias]
- ❗ `configureSecureTableAccess` in the binder expects `sseSpecification` and `pointInTimeRecoverySpecification` in the capability payload, yet the component does not include these fields, preventing the binder from enforcing secure access when `requireSecureAccess` is set.[^cap-sse]
- ⚠️ The stream capability omits a `streamLabel`, so the binder ends up injecting an undefined environment variable (`DYNAMODB_STREAM_LABEL`), which can break consumers relying on that context.[^cap-stream]

## Recommendations
1. Either register an alias for `db:dynamodb` in `ComprehensiveBinderRegistry` or expose a binder for the canonical capability so `ResolverEngine` can satisfy standard binds.[^cap-alias]
2. Extend `buildCapability` to surface SSE and PITR state (and CMK ARN) so secure access bindings have the data they require.[^cap-sse]
3. Include the DynamoDB stream label when constructing the stream capability, or adjust the binder to handle its absence gracefully.[^cap-stream]

[^cap-register]: docs/platform-standards/platform-capability-naming-standard.md:34-74; packages/components/dynamodb-table/src/dynamodb-table.component.ts:76-88
[^cap-payload]: packages/components/dynamodb-table/src/dynamodb-table.component.ts:585-607
[^cap-alias]: docs/platform-standards/platform-capability-naming-standard.md:34-74; packages/core/src/resolver/resolver-engine.ts:225-238; packages/core/src/platform/binders/registry/comprehensive-binder-registry.ts:66-124; packages/core/src/platform/binders/strategies/database/dynamodb-binder-strategy.ts:12-57
[^cap-sse]: packages/core/src/platform/binders/strategies/database/dynamodb-binder-strategy.ts:154-320; packages/components/dynamodb-table/src/dynamodb-table.component.ts:585-607
[^cap-stream]: packages/core/src/platform/binders/strategies/database/dynamodb-binder-strategy.ts:214-267; packages/components/dynamodb-table/src/dynamodb-table.component.ts:525-607
