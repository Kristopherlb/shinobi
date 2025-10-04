# Cognito User Pool Observability Guide

This runbook explains how the Cognito User Pool component aligns with the
[Platform Observability Standard](../../../docs/platform-standards/platform-observability-standard.md)
and how to extend visibility when integrating with downstream services.

## Built-in Telemetry

- **CloudWatch Metrics & Alarms**: The component enables platform defaults for
  the Cognito namespace. Four golden-signal alarms (sign-in/sign-up success and
  throttling) fire with production-safe thresholds. FedRAMP frameworks also
  enable the `RiskLevelHigh` alarm automatically.
- **Structured Logging**: Lifecycle and resource logs are emitted through the
  platform logger, ensuring each event carries the OpenTelemetry correlation
  identifiers (`traceId`, `spanId`) and the compliance metadata required by the
  [logging standard](../../../docs/platform-standards/platform-logging-standard.md).
- **Advanced Security Signals**: When `advancedSecurityMode` is set to `audit`
  or `enforced`, Cognito generates advanced security events that should be
  forwarded to the central SIEM. Use the `riskHigh` alarm to trigger ingestion.

## Operational Dashboards

Create a dashboard (Grafana or CloudWatch) that surfaces:

| Metric | Namespace | Notes |
| --- | --- | --- |
| `SignInSuccesses` | `AWS/Cognito` | Monitor rolling 5-minute success counts. |
| `SignInThrottles` | `AWS/Cognito` | Indicates rate-limit issues; correlate with API client patterns. |
| `RiskLevelHigh` | `AWS/Cognito` | Elevated when advanced security flags high-risk activity. |
| `TokenRefreshSuccesses` | `AWS/Cognito` | Track session renewal health for web/mobile clients. |

## Recommended Enhancements

1. **Trace Correlation** – When authoring Lambda triggers, initialise the
   platform logger to preserve `traceId`/`spanId` and include
   `cognito_event_type` in the context payload.
2. **Audit Streaming** – Forward Cognito logs to the centralized logging
   account via Kinesis Firehose. Retain logs for the durations defined in the
   platform standard (7 years for FedRAMP High).
3. **Synthetic Transactions** – Schedule a canary that exercises a full
   registration/login/logout flow hourly. Publish custom metrics prefixed with
   `platform.cognito` and alert on failures to supplement the native alarms.
4. **Dashboard Template** – Use `templates/dashboard/cognito-user-pool.json`
   (create in service repos) as a starting point. Populate it with the metrics
   above plus client-specific KPIs (conversion rate, MFA adoption).

## Alert Routing

| Alarm ID | Default Severity | Routing |
| --- | --- | --- |
| `SignInSuccessAlarm` | High | Service on-call (PagerDuty) |
| `SignInThrottleAlarm` | Medium | Platform SRE queue |
| `SignUpSuccessAlarm` | Medium | Product team channel |
| `SignUpThrottleAlarm` | Medium | Platform SRE queue |
| `RiskHighAlarm` | Critical | Security Operations Center |

Configure alarm targets via the manifest overrides to point at SNS topics the
service team owns. When running in production-like environments (`prod*`), the
component validation enforces that monitoring stays enabled.

## Runbook Actions

- **High Risk Events**: Validate user identities, rotate credentials, and
  inspect recent advanced security event logs. Escalate to Security Ops within
  15 minutes.
- **Throttling Alarm**: Check for sudden spikes in Client Credentials or SRP
  flows. Consider enabling Cognito adaptive authentication or rate limiting at
  the API gateway.
- **Sign-in Failures**: Correlate with upstream API health and user migration
  triggers. Confirm email/SMS providers are healthy.

Maintaining this guide alongside the component ensures observability remains
"opt-out impossible" in compliance with the platform standard.
