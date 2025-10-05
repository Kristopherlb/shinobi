# Schema Validation Audit – dynamodb-table

## Observations
- The standalone JSON schema declares `$schema`, `title`, top-level `type`, and blocks unknown keys via `additionalProperties: false`, matching platform expectations for discoverable component schemas.[^schema-meta]

## Findings
- ❗ The JSON schema only requires `partitionKey`, while the TypeScript contract treats `tableName`, `billingMode`, `tableClass`, `pointInTimeRecovery`, `encryption`, `backup`, `monitoring`, `hardeningProfile`, and `tags` as mandatory fields. This divergence violates the contract that every required field in the interface must be reflected in the schema.[^schema-required]
- ❗ Several nested properties (e.g., `provisioned.autoScaling.*`, `monitoring.alarms.*`, `encryption.customerManagedKey.*`) have no `description`, reducing the schema's usefulness for documentation tooling mandated by the component API spec.[^schema-descriptions]
- ⚠️ When `encryption.type` is `customer-managed`, the schema does not enforce supplying either `kmsKeyArn` or a `customerManagedKey` block, allowing configurations that fail at synthesis time even though the platform expects comprehensive schema-level validation.[^schema-kms]

## Recommendations
1. Expand the `required` array (or update the interface to use optional properties) so that the schema and runtime contract stay aligned.[^schema-required]
2. Add concise `description` strings to nested properties, especially under `provisioned.autoScaling` and `monitoring.alarms`, to satisfy schema completeness expectations.[^schema-descriptions]
3. Introduce a conditional (`allOf`/`anyOf`) rule that enforces supplying either `kmsKeyArn` or a `customerManagedKey` stanza whenever `encryption.type` is `customer-managed`.[^schema-kms]

[^schema-meta]: packages/components/dynamodb-table/Config.schema.json:1-15
[^schema-required]: docs/platform-standards/platform-component-api-spec.md:90-104; packages/components/dynamodb-table/src/dynamodb-table.builder.ts:91-114; packages/components/dynamodb-table/Config.schema.json:7-9
[^schema-descriptions]: docs/platform-standards/platform-component-api-spec.md:90-104; packages/components/dynamodb-table/Config.schema.json:81-116,154-172
[^schema-kms]: docs/platform-standards/platform-component-api-spec.md:90-104; packages/components/dynamodb-table/Config.schema.json:353-386; packages/components/dynamodb-table/src/dynamodb-table.component.ts:121-152
