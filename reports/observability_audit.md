# Observability Standard Audit – dynamodb-table

## Observations
- The component invokes the platform observability service (`configureObservability`) with DynamoDB-specific attributes so downstream consumers can correlate table metadata with telemetry.[^obs-config]
- A CloudWatch dashboard with capacity, throttling, error, and item-count widgets is provisioned to visualise table health.[^obs-dashboard]
- Structured monitoring alarms exist for read/write throttles and system errors when observability is enabled.[^obs-alarms]

## Findings
- ❗ The observability recipe for DynamoDB calls for alarms on consumed read/write capacity in addition to throttle/system metrics, but the implementation only creates throttling and system error alarms, leaving capacity utilisation coverage incomplete.[^obs-missing]
- ⚠️ The declarative observability manifest under `observability/dynamodb-observability.yaml` enables tracing even though the AWSlabs recipe marks tracing as not applicable for DynamoDB tables; confirm whether tracing enablement is intentional or should be disabled for accuracy.[^obs-manifest]

## Recommendations
1. Extend `configureMonitoring` to add CloudWatch alarms for `ConsumedReadCapacityUnits` and `ConsumedWriteCapacityUnits`, matching the recipe defaults.[^obs-missing]
2. Align the observability manifest with the platform KB by disabling tracing (or documenting why it remains enabled) to avoid agent misconfiguration.[^obs-manifest]

[^obs-config]: docs/platform-standards/platform-observability-standard.md:7-78; packages/components/dynamodb-table/src/dynamodb-table.component.ts:472-505
[^obs-dashboard]: docs/platform-standards/platform-observability-standard.md:7-78; packages/components/dynamodb-table/src/dynamodb-table.component.ts:486-505
[^obs-alarms]: docs/platform-standards/platform-observability-standard.md:7-78; packages/components/dynamodb-table/src/dynamodb-table.component.ts:393-427
[^obs-missing]: platform-kb/observability/recipes/dynamodb.yaml:5-18; packages/components/dynamodb-table/src/dynamodb-table.component.ts:393-427
[^obs-manifest]: platform-kb/observability/recipes/dynamodb.yaml:8-15; packages/components/dynamodb-table/observability/dynamodb-observability.yaml:9-38
