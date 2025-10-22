# EFS Filesystem Observability Playbook

This component exposes CloudWatch metrics and log streams that satisfy the Platform Observability Standard (`docs/platform-standards/platform-observability-standard.md`). Use this document as the canonical reference when wiring dashboards or baseline alerts via the awslabs MCP tools.

## Metrics

| Channel | Namespace | Metric | Notes |
| --- | --- | --- | --- |
| `storage` | `AWS/EFS` | `StorageBytes` | Tracked via the `storageUtilization` alarm. Includes `StorageClass=Total` for full capacity tracking. |
| `connections` | `AWS/EFS` | `ClientConnections` | Captures active NFS clients; spikes can indicate scaling events or mounts leaking. |
| `burst` | `AWS/EFS` | `BurstCreditBalance` | Ensures burst mode volumes do not exhaust throughput credits. |

All metrics are tagged with the component capability handle (`storage:efs` and `efs:file-system`) so MCP dashboards can auto-discover them.

## Log Groups

Two structured log groups are provisioned when enabled through configuration:

- `/aws/efs/<filesystem>/access` – Access activity suitable for audit correlation.
- `/aws/efs/<filesystem>/audit` – Compliance audit trail with 365+ day retention (2555 days in FedRAMP routes).

Custom tags supplied through configuration are merged with the platform tag set to maintain governance coverage.

## Dashboards & Alerts

- **Baseline alarms**: Created for storage utilisation, client connections, and burst credits. Thresholds are configurable per environment and exported through the capability metadata (see `logGroups` and `securityGroupId`).
- **MCP integration**: The capability advertises log group names and security group identifiers so the awslabs `baseline_alerts` and `plan_probes` tools can stitch dashboards and synthetic checks automatically.

## Incident Response Tips

1. **Storage exhaustion** – look for sustained growth in `StorageBytes` and coordinate expansion before reaching thresholds.
2. **Client saturation** – high `ClientConnections` coupled with throttled mounts often correlates with missing mount targets; review VPC routing.
3. **Burst credits near zero** – switch to provisioned throughput or enable Elastic Throughput depending on workload steady state.

For runbooks, link this document in your Service Catalog entry so operations teams have immediate context when alerts fire.
