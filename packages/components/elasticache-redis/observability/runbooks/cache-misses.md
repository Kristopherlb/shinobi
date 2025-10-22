# Runbook: Elevated Cache Miss Rate

## Detection
- Alarm: `alarm:cacheMisses`
- Threshold: 1000 misses per evaluation period (environment-dependent)

## Immediate Actions
1. Review the `redis-performance` dashboard hit ratio panel.
2. Check application logs for cache bypass patterns.
3. Confirm dataset growth or new traffic patterns with product teams.

## Diagnosis
- Do keys expire earlier than expected? Inspect TTL policies.
- Are writes failing? Inspect CloudWatch error metrics and client retries.
- Review configuration overrides for `parameterGroup.parameters` (e.g., `maxmemory-policy`).

## Mitigations
- Increase node memory (`nodeType`) or scale out.
- Adjust eviction policy (`maxmemory-policy`) to favour working set retention.
- Cache additional hot paths within application logic.

## Follow-up
- Document root cause in incident record.
- Update service documentation with new caching strategy.
