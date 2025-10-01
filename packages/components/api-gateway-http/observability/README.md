# API Gateway HTTP Observability Playbook

This component publishes API Gateway v2 HTTP API metrics, logs, and traces in alignment with the Platform Observability Standard v1.0.

## Metrics

### Built-in CloudWatch Metrics
- **`AWS/ApiGateway` 5XXError / 4XXError** – Alert thresholds sourced from the component config (`monitoring.alarms`).
- **Latency** – Alarmed when average latency exceeds the configured `highLatency` value.
- **Count** – Low-throughput alarm using `lowThroughput` from the config to detect stalled APIs.

### Custom Metrics
- **Custom/API-Gateway** namespace for application-specific metrics
- **RequestCount** – Total API requests with dimensions
- **ResponseTime** – API response time measurements
- **SecurityEvents** – Security-related events and violations
- **ComplianceEvents** – Compliance and audit events

## Logs

### Access Logs
- Access logs are emitted to a dedicated CloudWatch Log Group with retention driven by the manifest (365 days for FedRAMP High).
- JSON format with standard fields: caller, httpMethod, ip, protocol, requestTime, resourcePath, responseLength, status, user
- Include execution data and request/response data based on configuration

### Execution Logs
- Execution logs remain at `ERROR` level for commercial and `ERROR` for FedRAMP tiers to avoid sensitive payload capture.
- Structured logging with trace correlation IDs

## Tracing

### OpenTelemetry Integration
- OpenTelemetry environment variables are injected into the API Gateway stage
- Traces flow to the environment OTel collector endpoint defined in the platform config
- Service naming follows platform conventions with compliance context

### X-Ray Integration
- X-Ray is enabled when `monitoring.tracingEnabled` or FedRAMP manifests require it
- Note: HTTP APIs don't support stage-level X-Ray tracing, but component handles this correctly

## Dashboards / Alerts

### CloudWatch Alarms
- See `alarms-config.json` for the recommended CloudWatch alarm wiring
- 4xx/5xx error rate monitoring
- High latency detection
- Low throughput alerts
- Custom metric alarms

### Dashboards
- Link dashboards into the platform catalog entry when publishing the component
- Include API Gateway built-in metrics and custom metrics
- Show compliance and security event trends

## Custom Metrics Configuration

```yaml
monitoring:
  customMetrics:
    - name: "RequestCount"
      namespace: "Custom/API-Gateway"
      statistic: "Sum"
      period: 300
      unit: "Count"
      dimensions:
        Environment: "production"
        Service: "api-gateway-http"
    - name: "SecurityEvents"
      namespace: "Security/API"
      statistic: "Sum"
      period: 60
      unit: "Count"
```

## Compliance Monitoring

### FedRAMP Requirements
- 365-day log retention for FedRAMP High
- Security event monitoring
- Compliance event tracking
- Audit trail maintenance

### Commercial Requirements
- 90-day log retention
- Basic error and performance monitoring
- Custom business metrics
