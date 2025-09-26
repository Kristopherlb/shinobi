# Api Gateway REST Observability Playbook

This component publishes API Gateway metrics, logs, and traces in alignment with the Platform Observability Standard v1.0.

## Metrics

- **`AWS/ApiGateway` 5XXError / 4XXError** – Alert thresholds sourced from the component config (`monitoring.thresholds`).
- **Latency** – Alarmed when p50 latency exceeds the configured `highLatencyMs` value.
- **Count** – Low-throughput alarm using `lowThroughput` from the config to detect stalled APIs.

## Logs

- Access logs are emitted to a dedicated CloudWatch Log Group with retention driven by the manifest (2555 days for FedRAMP High).
- Execution logs remain at `ERROR` for commercial and `ERROR` for FedRAMP tiers to avoid sensitive payload capture.

## Tracing

- OpenTelemetry environment variables are injected into the API Gateway stage; traces flow to the environment OTel collector endpoint defined in the platform config.
- X-Ray is enabled when `monitoring.tracingEnabled` or FedRAMP manifests require it.

## Dashboards / Alerts

- See `alarms-config.json` for the recommended CloudWatch alarm wiring.
- Link dashboards into the platform catalog entry when publishing the component.
