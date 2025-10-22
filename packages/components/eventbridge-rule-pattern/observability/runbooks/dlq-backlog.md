# Runbook: EventBridge DLQ Backlog

## Detection
- Alarm: `alarm:deadLetterQueueMessages`
- Metric: `AWS/SQS ApproximateNumberOfVisibleMessages`
- Default Threshold: 1 message (FedRAMP default)

## Immediate Actions
1. Validate the alarm firing in CloudWatch and note queue ARN from capability output.
2. Inspect DLQ messages using the SQS console or `aws sqs receive-message` CLI (mask sensitive data).
3. Cross-reference with failed invocation logs to determine recurring patterns.

## Diagnosis
- Identify whether failures are due to downstream outages, malformed payloads, or IAM denials.
- Check recent deployments or configuration changes in both the rule and target services.
- Confirm DLQ encryption with the customer-managed CMK for FedRAMP—missing permissions can block dequeueing.

## Mitigation
- If payloads are recoverable, replay messages after fixing root cause using `aws sqs send-message-batch` to the target.
- For poison-pill events, archive the message to a secure bucket and delete from DLQ to restore flow (ensure ticket references).
- Consider increasing `deadLetterQueue.maxRetryAttempts` temporarily if retry policy is too aggressive.

## Post-Incident
- Update incident records with backlog duration, volume, and remediation steps.
- Evaluate whether alarm thresholds need adjustment for the workload.
- Implement automated replay scripts if manual replay was required.
