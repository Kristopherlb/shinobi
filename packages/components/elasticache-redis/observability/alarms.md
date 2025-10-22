# Alarm Catalogue

The ElastiCache Redis component provisions the following CloudWatch alarms automatically when `monitoring.enabled` is `true` (default).

| Alarm Handle | Metric | Purpose | Default Threshold |
|--------------|--------|---------|-------------------|
| `alarm:cpuUtilization` | `CPUUtilization` (Average) | Detect sustained CPU pressure | 80% (commercial), 75% (FedRAMP Moderate), 70% (FedRAMP High) |
| `alarm:cacheMisses` | `CacheMisses` (Sum) | Signal declining cache effectiveness | 1000 (commercial), 500 / 250 (FedRAMP moderate/high) |
| `alarm:evictions` | `Evictions` (Sum) | Highlight memory pressure leading to evictions | 10 / 5 / 2 |
| `alarm:connections` | `CurrConnections` (Average) | Monitor connection exhaustion risk | 500 / 400 / 350 |

## Notifications
- Use the service-level `alerts` SNS topic mapped via the platform to receive notifications.
- FedRAMP environments must integrate alarms with the MCP baseline alerts workflow to satisfy audit trails.

## Customisation
- Override thresholds in `service.yml` under `monitoring.alarms.*`.
- Additional alarms can be added via `monitoring.logDelivery` plus service-specific IaC, but platform defaults must remain enabled.
