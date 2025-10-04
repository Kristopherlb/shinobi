# Container Application Observability Guide

The container-application component automatically configures baseline
telemetry for ECS, the load balancer, and the backing task definition. This
runbook outlines the default coverage and how to extend it for production
workloads in line with the [Platform Observability Standard](../../../../docs/platform-standards/platform-observability-standard.md).

## Built-In Signals

- **Structured Logs** – Application logs are written to
  `/aws/ecs/<service>/<application>` with retention controlled by
  `observability.logRetentionDays`. Logs inherit the platform’s structured
  logging format and include automatic correlation IDs via
  `configureObservability`.
- **Metrics** – CPU and memory utilisation CloudWatch alarms are provisioned
  with thresholds sourced from configuration. These alarms tag resources with
  `alarm-type` metadata to simplify routing.
- **Tracing** – OpenTelemetry environment variables calculated by
  `configureObservability` are injected into the container, enabling the
  workload to forward traces to the platform collector with zero additional
  wiring.

## Recommended Dashboards

| Metric | Namespace | Purpose |
|--------|-----------|---------|
| `AWS/ECS:CPUUtilization` | `AWS/ECS` | Track sustained CPU pressure against service capacity. |
| `AWS/ECS:MemoryUtilization` | `AWS/ECS` | Detect memory leaks or runaway allocations. |
| `AWS/ApplicationELB:TargetResponseTime` | `AWS/ApplicationELB` | Measure end-to-end latency for requests. |
| `AWS/ApplicationELB:5XXErrorCount` | `AWS/ApplicationELB` | Alert on backend or load balancer failures. |
| `AWS/ECS:RunningTaskCount` | `AWS/ECS` | Ensure task health and auto-scaling behaviour. |

A reference dashboard is available under `templates/dashboard/container-application.json`
(extend with domain-specific metrics where applicable).

## Alarm Routing

| Alarm | Default Severity | Suggested Destination |
|-------|------------------|-----------------------|
| `*-cpu-high` | Medium | Service on-call channel (PagerDuty). |
| `*-memory-high` | Medium | Service on-call channel (PagerDuty). |
| Custom service alarms | Critical | Service SRE rotation. |

Configure alarm actions via stack overrides (e.g. SNS topics) so production
services notify the appropriate responders.

## Synthetic Monitoring

Deploy a lightweight canary (e.g. CloudWatch Synthetics or Lambda cron) that
performs an HTTP probe against the ALB endpoint every five minutes. Emit a
custom metric namespace `platform.container_application` with latency and
availability. Couple the canary failures with alerting to catch regressions
before customer impact.

## Log Retention & Compliance

- The component honours `observability.logRetentionDays` and maps the integer to
  the nearest supported CloudWatch Logs retention enum.
- When the component provisions a VPC, enabling
  `security.enableVpcFlowLogs` activates flow logs with the same retention as
  application logs.

## Extending Telemetry

1. **Custom Metrics:** Instrument application code to publish domain KPIs using
   the OpenTelemetry environment variables surfaced via the
   `otel:environment` capability.
2. **Trace Attributes:** Include the ALB DNS name and service name (already set)
   in trace metadata to accelerate correlation across systems.
3. **Dashboard Integrations:** Wire the `service:connect` capability into
   downstream binders (e.g. API Gateways) to automatically annotate dashboards
   with upstream dependencies.

Following this guide keeps the component compliant with the “observability is
not optional” mandate and provides a consistent operational experience across
service teams.
