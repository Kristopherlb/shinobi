# Security & Compliance Audit – dynamodb-table

## Observations
- Tables are provisioned with `RemovalPolicy.RETAIN`, optional TTL, and contributor insights toggled through configuration, preventing accidental data loss by default.[^sec-retain]
- When FedRAMP configurations are in effect, the builder enables provisioned capacity, PITR, TTL, streams, and customer-managed KMS keys with rotation, aligning with hardened expectations.[^sec-fedramp]
- Customer-managed keys created by the component inherit standard tags and enable key rotation automatically.[^sec-kms]

## Findings
- ❗ Layer-1 fallbacks disable both point-in-time recovery and backups; if platform defaults fail to load, the table would be synthesized without critical recovery controls, conflicting with the "secure fallback" guidance.[^sec-fallbacks]
- ❗ The capability payload omits server-side encryption metadata (`sseSpecification`, CMK ARN), preventing downstream binders from enforcing least-privilege KMS policies during secure bindings.[^sec-capability]
- ⚠️ AWS Backup resources lack standard tagging, which can break FedRAMP evidence chains that rely on compliance tags.[^sec-backup-tags]

## Recommendations
1. Enable PITR and backups in hardcoded fallbacks so recovery controls remain intact even in degraded configuration scenarios.[^sec-fallbacks]
2. Extend capability data with SSE/KMS details to support secure binder flows and IAM policy generation.[^sec-capability]
3. Apply standard tags to `BackupPlan`/`BackupSelection` constructs to keep backup resources within the compliance tagging schema.[^sec-backup-tags]

[^sec-retain]: packages/components/dynamodb-table/src/dynamodb-table.component.ts:155-190
[^sec-fedramp]: config/fedramp-high.yml:1368-1411; packages/components/dynamodb-table/src/dynamodb-table.builder.ts:188-209
[^sec-kms]: packages/components/dynamodb-table/src/dynamodb-table.component.ts:121-152
[^sec-fallbacks]: docs/platform-standards/platform-configuration-standard.md:55-63; packages/components/dynamodb-table/src/dynamodb-table.builder.ts:188-209
[^sec-capability]: packages/core/src/platform/binders/strategies/database/dynamodb-binder-strategy.ts:154-320; packages/components/dynamodb-table/src/dynamodb-table.component.ts:585-607
[^sec-backup-tags]: docs/platform-standards/platform-tagging-standard.md:21-75; packages/components/dynamodb-table/src/dynamodb-table.component.ts:521-549
