# Tagging Standard Audit – dynamodb-table

## Observations
- The component reuses the platform tagging helper to stamp the primary DynamoDB table with standard context and component-specific keys such as `billing-mode`, `table-class`, and `hardening-profile`.[^tag-table]
- Customer-managed KMS keys created for encryption inherit standard tags (including compliance and ownership metadata) plus resource-specific qualifiers.[^tag-kms]
- CloudWatch alarms created through `createAlarm` call the tagging helper, preserving traceability for operational metrics.[^tag-alarms]

## Findings
- ❗ AWS Backup constructs (`BackupPlan` and `BackupSelection`) are created without invoking `applyStandardTags`, leaving backup resources out of compliance with the mandatory tagging rules.[^tag-missing]
- ⚠️ Additional operational constructs (e.g., CloudWatch dashboards) rely on downstream services for tagging rather than explicitly applying the standard set; confirm that the observability service covers these resources to avoid blind spots.[^tag-dashboard]

## Recommendations
1. Call `applyStandardTags` on the `backupPlan` and `backupSelection` constructs immediately after creation.[^tag-missing]
2. If the observability service does not already tag dashboards, extend `configureObservabilityTelemetry` to apply standard tags before returning.[^tag-dashboard]

[^tag-table]: docs/platform-standards/platform-tagging-standard.md:21-75; packages/components/dynamodb-table/src/dynamodb-table.component.ts:193-199
[^tag-kms]: docs/platform-standards/platform-tagging-standard.md:21-75; packages/components/dynamodb-table/src/dynamodb-table.component.ts:135-151
[^tag-alarms]: docs/platform-standards/platform-tagging-standard.md:21-75; packages/components/dynamodb-table/src/dynamodb-table.component.ts:393-459
[^tag-missing]: docs/platform-standards/platform-tagging-standard.md:21-75; packages/components/dynamodb-table/src/dynamodb-table.component.ts:521-549
[^tag-dashboard]: docs/platform-standards/platform-tagging-standard.md:21-75; packages/components/dynamodb-table/src/dynamodb-table.component.ts:472-505
