# Runbook: Redis Evictions Detected

## Detection
- Alarm: `alarm:evictions`
- Threshold: 10 evictions per evaluation period (commercial), tighter in FedRAMP tiers

## Immediate Actions
1. Validate alarm context in CloudWatch.
2. Inspect `BytesUsedForCache` and `Evictions` metrics on the dashboards.
3. Ensure backup snapshots recent in case of data loss.

## Diagnosis
- Review data growth; compare to historical size trends.
- Confirm replication health (no lag or degraded replicas).
- Check client behaviour for large payloads or bursts.

## Mitigations
- Scale memory (larger `nodeType` or additional replicas).
- Implement data tiering or adjust TTLs on non-critical keys.
- Tune eviction policy (`maxmemory-policy`) to align with workload.

## Follow-up
- Capture remediation steps in incident tracker.
- Schedule capacity review with product owners.
