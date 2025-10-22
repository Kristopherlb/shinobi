# Feature Flag Observability Playbook

This playbook documents the default telemetry surface for the `feature-flag` component. It aligns with the Platform OpenTelemetry Observability Standard (`docs/platform-standards/platform-observability-standard.md`) and the Feature Flagging & Canary Deployment Standard (`docs/platform-standards/feature-flagging-canary-deployment-v1.0.md`).

## Default Signals

- **AppConfig Hosted Configuration Version Events**  
  Captured through CloudTrail and AppConfig deployment logs. Use these events to audit flag changes and rollout stages.

- **Flag Evaluation Metrics**  
  When `monitoring.detailedMetrics` is enabled, downstream compute components are expected to emit:
  - `feature.flag.evaluation.latency_ms`
  - `feature.flag.evaluation.error_rate_percent`
  - `feature.flag.rollout.percentage`

- **Flag Deployment Alerts**  
  The platform’s observability recipes translate `monitoring.alarms` into CloudWatch alarms (for AppConfig deployments) and PagerDuty incidents for sustained error spikes.

## Runbook

1. **Flag Drift Detected**  
   - Query `AWS::AppConfig::Deployment` history for the affected flag key.  
   - Confirm latest hosted configuration version number matches expectations via the MCP `/platform/components/feature-flag/schema` endpoint.  
   - Roll back to the previous version if the deployment introduced the regression.

2. **Evaluation Latency Breach**  
   - Inspect compute component metrics for downstream SDK latency.  
   - Validate AppConfig environment health and confirm network access to the configuration profile.  
   - Increase the percentile thresholds or adjust targeting rules that trigger heavy evaluation logic.

3. **Evaluation Error Spike**  
   - Verify the JSON constraints under `providerConfig.awsAppConfig.constraints`.  
   - Check LaunchDarkly/Flagsmith telemetry (if applicable) to ensure SDK tokens remain valid.  
   - If the issue is restricted to a specific targeting condition, disable the offending rule and redeploy.

## Dashboards

An exemplar Grafana dashboard is referenced in `platform-kb/observability/recipes/feature-flags.yaml`. It surfaces:
- Successful vs failed AppConfig deployments
- Flag evaluation latency percentiles
- Error rate heatmaps across environments

## Additional Guidance

- Ensure the `feature-flags:flag` capability is bound through the `ComputeToOpenFeatureStrategy` so that telemetry exporters receive the correct metadata.
- For FedRAMP workloads, confirm that hosted configuration versions are stored with KMS encryption and that audit logs are retained for seven years (see `platform-kb/well-architected/security.yaml`).
