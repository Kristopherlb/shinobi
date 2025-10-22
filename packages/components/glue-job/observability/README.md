# Glue Job Observability Guide

## Standards
- Platform Observability Standard (`docs/platform-standards/platform-observability-standard.md`)
- Platform Structured Logging Standard (`docs/platform-standards/platform-logging-standard.md`)
- AWS Labs monitoring pack (`platform-kb/packs/aws/monitoring.yaml`)

## Signals Provided
- **CloudWatch Logs**  
  - `/aws/glue/jobs/{service}-{component}/security` — security & audit events (always provisioned).  
  - `/aws/glue/jobs/{service}-{component}/{suffix}` — additional per-framework groups (`compliance`, `audit`) with retention driven by `/config/<framework>.yml`.
- **CloudWatch Metrics**  
  - `AWS/Glue glue.driver.aggregate.numFailedTasks` — drives job failure alarm.  
  - `AWS/Glue glue.driver.aggregate.elapsedTime` — drives job duration alarm.
- **Alarms**  
  - `{service}-{component}-job-failure`  
  - `{service}-{component}-job-duration`

## Default Behaviour
- Commercial: monitoring optional (`monitoring.enabled` default false), single security log group, 90-day retention.
- FedRAMP Moderate: monitoring enforced, adds compliance log group with 365-day retention, enables metrics flags.
- FedRAMP High: monitoring enforced, adds audit log group with 3650-day retention, auto-scaling defaults enabled.

## Recommended Dashboards
1. **Glue Job Execution Health** — plot Duration vs Threshold, Failed tasks, Trigger counts.
2. **Logging Compliance** — CloudWatch Log Insights query filtering by `job-name`, `log-id`, `component-type`.

## Operational Runbooks
- **Job Failure**  
  1. Review `job-failure` alarm detail.  
  2. Inspect security/compliance log groups for stacktrace.  
  3. Re-run with increased retries if exception is transient.
- **Duration Breach**  
  1. Confirm data volume changes.  
  2. Compare with Glue metrics `glue.driver.aggregate.memoryBytesSpilled`.  
  3. Scale worker type/count through manifest overrides.

## TODOs
- Enforce monitoring as mandatory for commercial workloads (see Audit Prompt 04).
- Integrate ADOT/trace correlation guidance once AWS Glue supports native OTel collectors.
