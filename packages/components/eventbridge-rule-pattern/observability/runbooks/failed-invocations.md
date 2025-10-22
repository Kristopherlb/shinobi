# Runbook: EventBridge Rule Failed Invocations

## Detection
- Alarm: `alarm:failedInvocations`
- Metric: `AWS/Events FailedInvocations`
- Threshold: Derived from manifest (default 5 failures across 2 periods)

## Immediate Actions
1. **Confirm alarm details** in the EventBridge dashboard `observability/dashboards/rule-operations.json`.
2. **Inspect CloudWatch Logs** for the rule log group (`/aws/platform/events/<service>-<component>-<ruleName>`) for error payloads and targets.
3. **Check DLQ backlog** via the `ApproximateNumberOfMessagesVisible` metric; if backlog is growing, follow the DLQ backlog runbook.

## Diagnosis
- **Target availability**: Verify the downstream target (Lambda, Step Functions, API) health.
- **IAM permissions**: Ensure rule targets still have required invoke permissions.
- **Payload validation**: Compare failing event payloads with target contract.

## Mitigation
- Reprocess failed events from DLQ after remediation.
- Temporarily increase max retry attempts (manifest `deadLetterQueue.maxRetryAttempts`) if transient failures persist.
- Coordinate with target service owners if downstream outage continues beyond 10 minutes (FedRAMP SLA).

## Post-Incident
- Document root cause, corrective actions, and prevention items in the incident tracker.
- Update playbook thresholds if alarm was too sensitive or not sensitive enough.
