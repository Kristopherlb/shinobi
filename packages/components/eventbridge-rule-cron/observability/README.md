# EventBridge Rule Cron - Observability Guide

**Component:** `eventbridge-rule-cron`  
**Version:** 1.0.0  
**Last Updated:** October 10, 2025

---

## Overview

This directory contains operational observability resources for the EventBridge Rule Cron component, including CloudWatch metrics, alarm configurations, and operational runbooks.

---

## Quick Start

### Enable Monitoring
```yaml
# service.yml
components:
  - name: nightly-sync
    type: eventbridge-rule-cron
    config:
      schedule: 'cron(0 3 * * ? *)'
      monitoring:
        enabled: true
        alarms:
          failedInvocations:
            enabled: true
            threshold: 1
            evaluationPeriods: 2
            periodMinutes: 5
            comparisonOperator: gte
            treatMissingData: not-breaching
            statistic: Sum
          invocationRate:
            enabled: true
            threshold: 1000
            evaluationPeriods: 2
            periodMinutes: 5
        cloudWatchLogs:
          enabled: true
          retentionDays: 90
      deadLetterQueue:
        enabled: true
        maxRetryAttempts: 3
```

---

## Available Metrics

### Core Metrics (Implemented)

#### 1. FailedInvocations
- **Description:** Permanent invocation failures
- **Namespace:** `AWS/Events`
- **Statistic:** Sum
- **Alarm Threshold:** ≥ 1 (any failure should alert)
- **Use:** Detect delivery failures requiring investigation

#### 2. Invocations
- **Description:** Total rule invocations
- **Namespace:** `AWS/Events`
- **Statistic:** Sum
- **Alarm Threshold:** Configurable based on expected rate
- **Use:** Monitor invocation volume and detect rate anomalies

### Recommended Additional Metrics (AWS Best Practices)

#### 3. InvocationAttempts (To Be Added)
- **Description:** Total attempts to invoke targets (including retries)
- **Use:** Track overall delivery attempts vs. successes
- **Formula:** `InvocationAttempts = SuccessfulInvocationAttempts + RetryInvocationAttempts + FailedInvocations`

#### 4. RetryInvocationAttempts (To Be Added)
- **Description:** Number of retry attempts
- **Use:** Detect target scaling issues or transient failures
- **Alert:** High retry rate indicates target capacity problems

#### 5. InvocationsSentToDlq (To Be Added)
- **Description:** Events sent to dead letter queue
- **Use:** Monitor events that exhausted all retries
- **Alert:** Any DLQ events require review

#### 6. IngestionToInvocationSuccessLatency (To Be Added)
- **Description:** End-to-end latency from ingestion to successful delivery
- **Use:** Detect performance degradation
- **Target:** < 5 seconds for most use cases

---

## Alarm Configuration

### Failed Invocations Alarm
**Purpose:** Detect any failed invocations that require immediate attention

```yaml
alarms:
  failedInvocations:
    enabled: true
    threshold: 1          # Alert on any failure
    evaluationPeriods: 2  # 2 consecutive periods
    periodMinutes: 5      # 5-minute periods
    comparisonOperator: gte
    treatMissingData: not-breaching
    statistic: Sum
```

**Response:** See [runbooks/failed-invocations.md](./runbooks/failed-invocations.md)

### Invocation Rate Alarm
**Purpose:** Detect unexpected invocation volume spikes or drops

```yaml
alarms:
  invocationRate:
    enabled: true
    threshold: 1000       # Adjust based on expected rate
    evaluationPeriods: 2
    periodMinutes: 5
    comparisonOperator: gte  # Alert on high rate
    treatMissingData: not-breaching
    statistic: Sum
```

**Response:** See [runbooks/invocation-rate.md](./runbooks/invocation-rate.md)

---

## Dead Letter Queue Configuration

EventBridge supports DLQ configuration for failed invocations:

```yaml
deadLetterQueue:
  enabled: true
  maxRetryAttempts: 3    # 0-185 attempts
  retentionDays: 14      # 1-14 days
```

### DLQ Behavior
1. EventBridge retries failed invocations up to `maxRetryAttempts`
2. After exhausting retries, event sent to DLQ (if configured)
3. Events in DLQ retained for `retentionDays`
4. Monitor `InvocationsSentToDlq` metric to detect DLQ events

**Best Practice:** Always enable DLQ for production rules to prevent data loss

---

## CloudWatch Logs Configuration

Enable CloudWatch Logs to capture rule execution details:

```yaml
monitoring:
  cloudWatchLogs:
    enabled: true
    logGroupName: /aws/events/rule/my-service-rule  # Optional override
    retentionDays: 90         # 1-3653 days
    removalPolicy: retain     # retain or destroy
```

### Log Content
- Rule execution timestamp
- Target invocation details
- Input transformation results
- Failure reasons (if applicable)

### Querying Logs
```bash
# View logs
aws logs tail /aws/events/rule/my-service-rule --follow

# Filter for failures
aws logs filter-log-events \
  --log-group-name /aws/events/rule/my-service-rule \
  --filter-pattern "error"
```

---

## Compliance Framework Differences

### Commercial
- **Monitoring:** Optional (must enable explicitly)
- **Log Retention:** 14 days (default)
- **DLQ:** Optional
- **Alarms:** Optional

### FedRAMP Moderate
- **Monitoring:** Enabled by default
- **Log Retention:** 90 days (minimum)
- **DLQ:** Recommended
- **Alarms:** Enabled for failures

### FedRAMP High
- **Monitoring:** Required (enforced)
- **Log Retention:** 1 year+ (minimum)
- **DLQ:** Required
- **Alarms:** Comprehensive (failures, rate, latency)

---

## Operational Runbooks

### Common Issues

1. **Failed Invocations**
   - **Symptom:** FailedInvocations alarm triggered
   - **Runbook:** [runbooks/failed-invocations.md](./runbooks/failed-invocations.md)
   - **Common Causes:** Target unavailable, permission errors, throttling

2. **High Retry Rate**
   - **Symptom:** RetryInvocationAttempts increasing
   - **Runbook:** [runbooks/high-retry-rate.md](./runbooks/high-retry-rate.md)
   - **Common Causes:** Target scaling issues, transient errors

3. **DLQ Events**
   - **Symptom:** InvocationsSentToDlq > 0
   - **Runbook:** [runbooks/dlq-events.md](./runbooks/dlq-events.md)
   - **Common Causes:** Exhausted retries, persistent failures

4. **Unexpected Invocation Rate**
   - **Symptom:** Invocation rate spike or drop
   - **Runbook:** [runbooks/invocation-rate.md](./runbooks/invocation-rate.md)
   - **Common Causes:** Schedule misconfiguration, rule state change

---

## Dashboard (To Be Created)

CloudWatch Dashboard showing:
- Invocation success rate
- Failed invocations timeline
- Retry attempts
- DLQ event count
- End-to-end latency

**Template:** [dashboards/eventbridge-rule-cron.json](./dashboards/eventbridge-rule-cron.json) (TBD)

---

## SLOs (Service Level Objectives)

### Recommended SLOs

| SLO | Target | Measurement |
|-----|--------|-------------|
| **Invocation Success Rate** | 99.9% | `(SuccessfulInvocationAttempts / InvocationAttempts) * 100` |
| **P95 Latency** | < 5 seconds | `IngestionToInvocationSuccessLatency` p95 |
| **DLQ Rate** | < 0.1% | `(InvocationsSentToDlq / Invocations) * 100` |

---

## AWS Documentation References

- [EventBridge Monitoring](https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-monitoring.html)
- [EventBridge Metrics](https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-monitoring.html#eb-metrics)
- [Monitoring Best Practices](https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-monitoring-events-best-practices.html)
- [Dead Letter Queues](https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-rule-dlq.html)

---

**For questions or issues with observability, contact:** Platform Engineering Team

