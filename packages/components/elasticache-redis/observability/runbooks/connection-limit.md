# Runbook: Connection Limit Approaching

## Detection
- Alarm: `alarm:connections`
- Threshold: 500 connections (commercial baseline)

## Immediate Actions
1. Verify active connections in the dashboard (`CurrConnections`).
2. Review client-side connection pooling metrics.
3. Inspect slow logs for connection churn or AUTH failures.

## Diagnosis
- Identify clients with excessive connections (use VPC flow logs or application telemetry).
- Confirm idle connection timeout configuration on client libraries.
- Validate security groups to ensure no unexpected sources.

## Mitigations
- Increase `numCacheNodes` to scale connection capacity.
- Implement connection pooling or reuse in client services.
- Configure `timeout` and `tcp-keepalive` parameters via the parameter group.

## Follow-up
- Document responsible services and actions taken.
- Update architectural diagrams if topology changed.
