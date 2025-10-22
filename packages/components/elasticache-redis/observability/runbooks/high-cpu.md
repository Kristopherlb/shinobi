# Runbook: High CPU Utilisation

## Detection
- Alarm: `alarm:cpuUtilization`
- Threshold: 80% (commercial), 75% (FedRAMP Moderate), 70% (FedRAMP High)

## Immediate Actions
1. Confirm the alarm in CloudWatch and open the `redis-performance` dashboard.
2. Check `CmdGet`/`CmdSet` metrics to identify command spikes.
3. Inspect slow logs (`/aws/platform/redis/<service>-<component>/slow-log`).

## Diagnosis
- Recent deployments? Review change log.
- Increased client connections? Inspect `CurrConnections` and application logs.
- Evictions increasing? Pair with memory runbook.

## Mitigations
- Scale node type (`nodeType`) or increase `numCacheNodes` temporarily.
- Optimise client workloads (batch requests, caching TTL adjustments).
- Enable or tune Redis parameters (`parameterGroup.parameters`) such as `maxmemory-policy`.

## Follow-up
- Record incident details in the incident tracker.
- Raise a backlog item for capacity planning if recurrent.
