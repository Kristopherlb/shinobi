# Configuration Precedence Audit – dynamodb-table

## Observations
- The component leans on the shared `ConfigBuilder` engine, which applies the five-layer precedence chain defined in the platform configuration standard (hardcoded fallbacks, framework defaults, service environments, component overrides, policy overrides).[^config-engine]
- Framework-specific defaults provide hardened settings—commercial deployments enable pay-per-request billing with PITR and backups, while FedRAMP High switches to provisioned throughput, enables TTL, streams, CMK encryption, and expanded monitoring.[^config-defaults]
- Unit tests assert that the builder returns the expected defaults for commercial and FedRAMP contexts and preserves manifest overrides, demonstrating precedence coverage.[^config-tests]

## Findings
- ⚠️ Environment and policy override layers are currently unimplemented (`_getEnvironmentConfiguration` / `_getPolicyOverrides` return empty objects), so components cannot yet honor higher-priority overrides despite the documented chain.[^config-todo]
- ⚠️ Hardcoded fallbacks disable point-in-time recovery and backups, relying entirely on framework defaults to enforce safe settings; this conflicts with the guidance that fallbacks should remain security-safe.[^config-fallbacks]

## Recommendations
1. Implement the pending environment and policy override loaders so that Layer 3 and Layer 5 precedence rules become effective.[^config-todo]
2. Revisit hardcoded fallbacks for PITR and backup to provide protective defaults even if framework configuration fails to load.[^config-fallbacks]

[^config-engine]: docs/platform-standards/platform-configuration-standard.md:29-129; packages/components/dynamodb-table/src/dynamodb-table.builder.ts:182-214
[^config-defaults]: config/commercial.yml:1189-1218; config/fedramp-high.yml:1368-1411
[^config-tests]: packages/components/dynamodb-table/tests/dynamodb-table.builder.test.ts:1-78
[^config-todo]: docs/platform-standards/platform-configuration-standard.md:29-129; packages/core/src/platform/contracts/config-builder.ts:62-109
[^config-fallbacks]: docs/platform-standards/platform-configuration-standard.md:55-63; packages/components/dynamodb-table/src/dynamodb-table.builder.ts:188-209
