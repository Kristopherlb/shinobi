# EventBridge Rule Pattern - Observability Guide

This directory contains comprehensive observability documentation for the EventBridge Rule Pattern component.

## Overview

The EventBridge Rule Pattern component provides built-in observability through:
- CloudWatch Metrics (automatic)
- CloudWatch Alarms (configurable)
- CloudWatch Logs (mandatory, encrypted)
- Structured logging (component lifecycle)
- Dead Letter Queue monitoring (mandatory)

## Table of Contents

1. [CloudWatch Metrics](#cloudwatch-metrics)
2. [CloudWatch Alarms](#cloudwatch-alarms)
3. [CloudWatch Logs](#cloudwatch-logs)
4. [Structured Logging](#structured-logging)
5. [Dead Letter Queue Monitoring](#dead-letter-queue-monitoring)
6. [Trace Context Propagation](#trace-context-propagation)
7. [Dashboard Examples](#dashboard-examples)
8. [Troubleshooting](#troubleshooting)

---

## CloudWatch Metrics

### Automatic Metrics

EventBridge automatically emits the following CloudWatch metrics for all rules:

| Metric Name | Namespace | Description | Dimensions |
|-------------|-----------|-------------|------------|
| `Invocations` | `AWS/Events` | Number of times a rule's targets were invoked | `RuleName` |
| `FailedInvocations` | `AWS/Events` | Number of invocations that failed | `RuleName` |
| `TriggeredRules` | `AWS/Events` | Number of rules that were triggered | `RuleName` |
| `MatchedEvents` | `AWS/Events` | Number of events that matched the rule | `RuleName` |
| `ThrottledRules` | `AWS/Events` | Number of rules that were throttled | `RuleName` |

### Dead Letter Queue Metrics

When DLQ is enabled, additional SQS metrics are available:

| Metric Name | Namespace | Description | Dimensions |
|-------------|-----------|-------------|------------|
| `ApproximateNumberOfMessagesVisible` | `AWS/SQS` | Messages in DLQ awaiting processing | `QueueName` |
| `ApproximateAgeOfOldestMessage` | `AWS/SQS` | Age of oldest message in DLQ | `QueueName` |
| `NumberOfMessagesSent` | `AWS/SQS` | Messages sent to DLQ | `QueueName` |
| `NumberOfMessagesDeleted` | `AWS/SQS` | Messages deleted from DLQ | `QueueName` |

### Querying Metrics

**AWS CLI:**
```bash
# Get failed invocations for a rule
aws cloudwatch get-metric-statistics \
  --namespace AWS/Events \
  --metric-name FailedInvocations \
  --dimensions Name=RuleName,Value=my-service-my-rule \
  --start-time 2025-10-10T00:00:00Z \
  --end-time 2025-10-10T23:59:59Z \
  --period 300 \
  --statistics Sum

# Get DLQ message count
aws cloudwatch get-metric-statistics \
  --namespace AWS/SQS \
  --metric-name ApproximateNumberOfMessagesVisible \
  --dimensions Name=QueueName,Value=my-service-my-rule-dlq \
  --start-time 2025-10-10T00:00:00Z \
  --end-time 2025-10-10T23:59:59Z \
  --period 300 \
  --statistics Maximum
```

**CloudWatch Insights Query:**
```sql
fields @timestamp, detail.eventName, detail.eventID
| filter @type = "EventBridge"
| filter ruleName = "my-service-my-rule"
| stats count() by bin(5m)
```

---

## CloudWatch Alarms

### Configurable Alarms

The component supports four types of alarms:

#### 1. Failed Invocations Alarm

Triggers when rule invocations fail.

**Configuration Example:**
```yaml
monitoring:
  enabled: true
  failedInvocations:
    enabled: true
    threshold: 5  # Alert after 5 failures
    evaluationPeriods: 2  # In 2 consecutive periods
    periodMinutes: 5  # 5-minute periods
    comparisonOperator: gte  # Greater than or equal
    treatMissingData: not-breaching
    statistic: Sum
```

**Use Case:** Detect when rule targets are consistently failing to process events.

#### 2. Invocations Volume Alarm

Monitors total invocation volume (can alert on too high or too low).

**Configuration Example (Low Volume Alert):**
```yaml
monitoring:
  invocations:
    enabled: true
    threshold: 10  # Alert if fewer than 10 invocations
    evaluationPeriods: 3
    periodMinutes: 5
    comparisonOperator: lte  # Less than or equal
    treatMissingData: breaching
    statistic: Sum
```

**Use Case:** Detect when event flow stops unexpectedly.

#### 3. Matched Events Alarm

Monitors events that match the rule pattern.

**Configuration Example:**
```yaml
monitoring:
  matchedEvents:
    enabled: true
    threshold: 100  # Alert if more than 100 matches
    evaluationPeriods: 1
    periodMinutes: 5
    comparisonOperator: gt
    treatMissingData: not-breaching
    statistic: Sum
```

**Use Case:** Detect unusual spikes in matching events.

#### 4. Dead Letter Queue Messages Alarm

Monitors message backlog in DLQ (requires DLQ enabled).

**Configuration Example:**
```yaml
deadLetterQueue:
  enabled: true
monitoring:
  deadLetterQueueMessages:
    enabled: true
    threshold: 10  # Alert if more than 10 messages in DLQ
    evaluationPeriods: 2
    periodMinutes: 5
    comparisonOperator: gte
    statistic: Sum
```

**Use Case:** Detect failed event deliveries accumulating in DLQ.

### Alarm States

- **OK**: Metric is within threshold
- **ALARM**: Metric breached threshold for specified evaluation periods
- **INSUFFICIENT_DATA**: Not enough data to determine state

### Alarm Actions

Alarms can trigger SNS topics for notifications:

```typescript
// In custom code (not part of component)
import * as sns from 'aws-cdk-lib/aws-sns';

const alarm = component.getConstruct('alarm:failedInvocations') as cloudwatch.Alarm;
const topic = new sns.Topic(this, 'AlertTopic');
alarm.addAlarmAction(new cloudwatch_actions.SnsAction(topic));
```

---

## CloudWatch Logs

### Log Configuration

CloudWatch Logs capture matched events for audit and debugging and are mandatory under the platform standard. FedRAMP deployments automatically switch to customer-managed CMKs and longer retention windows.

**Configuration (defaults shown):**
```yaml
monitoring:
  cloudWatchLogs:
    enabled: true
    logGroupName: /aws/platform/events/${serviceName}-${componentName}-${ruleName}
    retentionDays: 365  # Automatically elevated to 1827/3653 for FedRAMP
    removalPolicy: retain
```

### Log Format

Events are logged in JSON format with full event details:

```json
{
  "version": "0",
  "id": "6a7e8feb-b491-4cf7-a9f1-bf3703467718",
  "detail-type": "EC2 Instance State-change Notification",
  "source": "aws.ec2",
  "account": "123456789012",
  "time": "2025-10-10T12:00:00Z",
  "region": "us-east-1",
  "resources": [
    "arn:aws:ec2:us-east-1:123456789012:instance/i-abcd1234"
  ],
  "detail": {
    "instance-id": "i-abcd1234",
    "state": "running"
  }
}
```

### Querying Logs

**CloudWatch Insights Query:**
```sql
fields @timestamp, source, detail.instance-id, detail.state
| filter source = "aws.ec2"
| sort @timestamp desc
| limit 20
```

**Filter for Errors:**
```sql
fields @timestamp, source, detail
| filter detail.state = "error"
| stats count() by source, bin(5m)
```

### Log Retention by Framework

| Framework | Default Retention | Configurable Range |
|-----------|-------------------|-------------------|
| Commercial | 365 days (1 year) | 1-3653 days |
| FedRAMP Moderate | 1827 days (5 years) | 1827-3653 days |
| FedRAMP High | 3653 days (10 years) | 3653 days |

---

## Structured Logging

### Component Lifecycle Logging

The component emits structured log events at key lifecycle points:

#### 1. Synthesis Start
```json
{
  "timestamp": "2025-10-10T12:00:00.000Z",
  "level": "INFO",
  "message": "Starting EventBridge rule pattern synthesis",
  "event": "synthesis_start",
  "service": {
    "name": "my-service",
    "version": "1.0.0"
  },
  "component": {
    "name": "my-rule",
    "type": "eventbridge-rule-pattern"
  },
  "context": {
    "environment": "production",
    "region": "us-east-1",
    "complianceFramework": "fedramp-high"
  }
}
```

#### 2. Configuration Resolved
```json
{
  "timestamp": "2025-10-10T12:00:01.000Z",
  "level": "INFO",
  "message": "Resolved EventBridge rule configuration",
  "event": "config_resolved",
  "data": {
    "ruleName": "my-service-my-rule",
    "eventBus": "default",
    "monitoringEnabled": true,
    "dlqEnabled": true
  }
}
```

#### 3. Resource Creation
```json
{
  "timestamp": "2025-10-10T12:00:02.000Z",
  "level": "INFO",
  "message": "Created dead-letter-queue",
  "event": "resource_creation",
  "resource": {
    "type": "dead-letter-queue",
    "name": "my-service-my-rule-dlq"
  },
  "config": {
    "retentionDays": 14,
    "maxRetryAttempts": 3
  }
}
```

#### 4. Observability Configured
```json
{
  "timestamp": "2025-10-10T12:00:03.000Z",
  "level": "INFO",
  "message": "Monitoring configured for EventBridge rule",
  "event": "observability_configured",
  "data": {
    "ruleName": "my-service-my-rule",
    "alarmsCreated": 4
  }
}
```

#### 5. Synthesis Complete
```json
{
  "timestamp": "2025-10-10T12:00:04.000Z",
  "level": "INFO",
  "message": "EventBridge rule pattern synthesized successfully",
  "event": "synthesis_complete",
  "data": {
    "ruleName": "my-service-my-rule",
    "alarmsConfigured": 4
  }
}
```

### Error Logging

Errors are captured with full context:

```json
{
  "timestamp": "2025-10-10T12:00:00.000Z",
  "level": "ERROR",
  "message": "EventBridge rule synthesis failed",
  "event": "synthesis_error",
  "error": {
    "type": "ValidationError",
    "message": "eventPattern is required",
    "stack": "ValidationError: eventPattern is required\n    at ..."
  },
  "context": {
    "componentName": "my-rule",
    "serviceName": "my-service"
  }
}
```

---

## Dead Letter Queue Monitoring

### DLQ Message Structure

Failed events are sent to DLQ with metadata:

```json
{
  "MessageId": "12345678-1234-1234-1234-123456789012",
  "Body": "{\"version\":\"0\",\"id\":\"...\",\"detail-type\":\"...\"}",
  "MessageAttributes": {
    "ErrorCode": "InternalServerError",
    "ErrorMessage": "Target invocation failed",
    "TargetArn": "arn:aws:lambda:us-east-1:123456789012:function:my-function",
    "AttemptCount": "3",
    "RuleName": "my-service-my-rule"
  }
}
```

### Processing DLQ Messages

**List DLQ Messages:**
```bash
aws sqs receive-message \
  --queue-url https://sqs.us-east-1.amazonaws.com/123456789012/my-service-my-rule-dlq \
  --max-number-of-messages 10 \
  --visibility-timeout 30 \
  --attribute-names All \
  --message-attribute-names All
```

**Reprocess Failed Events:**
```python
import boto3
import json

sqs = boto3.client('sqs')
events = boto3.client('events')

# Receive messages from DLQ
response = sqs.receive_message(
    QueueUrl='https://sqs.us-east-1.amazonaws.com/123456789012/my-service-my-rule-dlq',
    MaxNumberOfMessages=10,
    MessageAttributeNames=['All']
)

for message in response.get('Messages', []):
    # Parse event from message body
    event = json.loads(message['Body'])
    
    # Retry by putting event back on EventBridge
    events.put_events(Entries=[event])
    
    # Delete from DLQ if successful
    sqs.delete_message(
        QueueUrl='https://sqs.us-east-1.amazonaws.com/123456789012/my-service-my-rule-dlq',
        ReceiptHandle=message['ReceiptHandle']
    )
```

---

## Trace Context Propagation

### EventBridge Trace Context

EventBridge can propagate trace context to targets using input transformers.

**Configuration Example:**
```yaml
input:
  type: transformer
  transformer:
    inputPathsMap:
      eventId: $.id
      source: $.source
      detailType: $.detail-type
      # Inject trace context if present in event detail
      traceId: $.detail.traceId
      spanId: $.detail.spanId
    inputTemplate: |
      {
        "event": <aws.events.event>,
        "metadata": {
          "eventId": "<eventId>",
          "source": "<source>",
          "detailType": "<detailType>"
        },
        "trace": {
          "traceId": "<traceId>",
          "spanId": "<spanId>"
        }
      }
```

### Publishing Events with Trace Context

**From Lambda (with X-Ray):**
```typescript
import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';
import * as AWSXRay from 'aws-xray-sdk-core';

const eventbridge = AWSXRay.captureAWSv3Client(new EventBridgeClient({}));

export async function handler(event: any) {
  const segment = AWSXRay.getSegment();
  const traceId = segment?.trace_id;
  const spanId = segment?.id;
  
  await eventbridge.send(new PutEventsCommand({
    Entries: [{
      Source: 'com.myapp.orders',
      DetailType: 'Order Placed',
      Detail: JSON.stringify({
        orderId: '12345',
        amount: 100.00,
        // Include trace context in event detail
        traceId,
        spanId
      })
    }]
  }));
}
```

**From Application (with OpenTelemetry):**
```typescript
import { trace } from '@opentelemetry/api';
import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';

const tracer = trace.getTracer('my-app');

async function publishEvent() {
  const span = tracer.startSpan('publish-event');
  const spanContext = span.spanContext();
  
  const eventbridge = new EventBridgeClient({});
  
  await eventbridge.send(new PutEventsCommand({
    Entries: [{
      Source: 'com.myapp.orders',
      DetailType: 'Order Placed',
      Detail: JSON.stringify({
        orderId: '12345',
        // Include OpenTelemetry trace context
        traceId: spanContext.traceId,
        spanId: spanContext.spanId,
        traceFlags: spanContext.traceFlags
      })
    }]
  }));
  
  span.end();
}
```

---

## Dashboard Examples

### CloudWatch Dashboard JSON

```json
{
  "widgets": [
    {
      "type": "metric",
      "properties": {
        "metrics": [
          ["AWS/Events", "Invocations", {"stat": "Sum", "label": "Total Invocations"}],
          [".", "FailedInvocations", {"stat": "Sum", "label": "Failed Invocations"}],
          [".", "MatchedEvents", {"stat": "Sum", "label": "Matched Events"}]
        ],
        "view": "timeSeries",
        "stacked": false,
        "region": "us-east-1",
        "title": "EventBridge Rule Metrics",
        "period": 300
      }
    },
    {
      "type": "metric",
      "properties": {
        "metrics": [
          ["AWS/SQS", "ApproximateNumberOfMessagesVisible", 
           {"stat": "Maximum", "label": "DLQ Messages"}]
        ],
        "view": "timeSeries",
        "region": "us-east-1",
        "title": "Dead Letter Queue",
        "period": 300,
        "yAxis": {
          "left": {
            "min": 0
          }
        }
      }
    }
  ]
}
```

### Creating Dashboard via CLI

```bash
aws cloudwatch put-dashboard \
  --dashboard-name "EventBridge-My-Service-My-Rule" \
  --dashboard-body file://dashboard.json
```

### Packaged Observability Assets

- `dashboards/rule-operations.json` — baseline dashboard template referenced above.
- `runbooks/failed-invocations.md` — playbook for handling sustained `FailedInvocations` alarms.
- `runbooks/dlq-backlog.md` — guidance for diagnosing and draining DLQ backlog.
- `slos/rule-availability.yaml` — 99.9% availability service-level objective definition.

---

## Troubleshooting

### Common Issues

#### 1. No Metrics Appearing

**Symptom:** CloudWatch shows no metrics for the rule.

**Possible Causes:**
- Rule is disabled (`state: disabled`)
- No events matching the pattern
- Event pattern is too restrictive

**Resolution:**
```bash
# Check rule status
aws events describe-rule --name my-service-my-rule

# Enable the rule if disabled
aws events enable-rule --name my-service-my-rule

# Test event pattern
aws events test-event-pattern \
  --event-pattern file://pattern.json \
  --event file://test-event.json
```

#### 2. High Failed Invocations

**Symptom:** `FailedInvocations` metric is high.

**Possible Causes:**
- Target Lambda function errors
- Target IAM permissions missing
- Target throttling/rate limits
- Network issues

**Resolution:**
```bash
# Check CloudWatch Logs for target function
aws logs tail /aws/lambda/my-function --follow

# Check DLQ for error details
aws sqs receive-message \
  --queue-url https://sqs.us-east-1.amazonaws.com/123456789012/my-service-my-rule-dlq \
  --message-attribute-names All

# Review IAM permissions
aws iam simulate-principal-policy \
  --policy-source-arn arn:aws:iam::123456789012:role/EventBridgeRole \
  --action-names lambda:InvokeFunction \
  --resource-arns arn:aws:lambda:us-east-1:123456789012:function:my-function
```

#### 3. Events Not Matching Pattern

**Symptom:** `MatchedEvents` is zero despite events being published.

**Possible Causes:**
- Event pattern syntax error
- Event structure doesn't match pattern
- Event published to wrong event bus

**Resolution:**
```bash
# Test event pattern locally
aws events test-event-pattern \
  --event-pattern '{"source": ["aws.ec2"]}' \
  --event file://sample-event.json

# Enable CloudTrail for EventBridge to see all events
aws cloudtrail lookup-events \
  --lookup-attributes AttributeKey=EventName,AttributeValue=PutEvents

# Check if events are on correct bus
aws events put-rule --name test-catch-all \
  --event-pattern '{}' \
  --state ENABLED
```

#### 4. DLQ Messages Growing

**Symptom:** DLQ alarm triggering, messages accumulating.

**Possible Causes:**
- Persistent target failures
- No DLQ consumer configured
- Target completely unavailable

**Resolution:**
1. Inspect DLQ messages for error patterns
2. Fix underlying target issue
3. Reprocess messages from DLQ
4. Consider implementing automated DLQ processing

**DLQ Consumer Lambda Example:**
```typescript
import { SQSHandler } from 'aws-lambda';
import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';

export const handler: SQSHandler = async (event) => {
  const eventbridge = new EventBridgeClient({});
  
  for (const record of event.Records) {
    try {
      const originalEvent = JSON.parse(record.body);
      
      // Retry by re-publishing to EventBridge
      await eventbridge.send(new PutEventsCommand({
        Entries: [originalEvent]
      }));
      
      console.log(`Reprocessed event: ${originalEvent.id}`);
    } catch (error) {
      console.error(`Failed to reprocess: ${error}`);
      // Let message return to DLQ for retry
      throw error;
    }
  }
};
```

---

## Best Practices

1. **Always Enable Monitoring in Production**
   - Set `monitoring.enabled: true` for production deployments
   - Configure appropriate alarm thresholds

2. **Use DLQ for Critical Workflows**
   - Enable DLQ for business-critical event processing
   - Implement automated DLQ processing

3. **Enable CloudWatch Logs for Audit**
   - Required for FedRAMP compliance
   - Useful for debugging pattern matching issues

4. **Set Up Alarm Actions**
   - Connect alarms to SNS topics for notifications
   - Integrate with incident management systems

5. **Propagate Trace Context**
   - Include trace IDs in event detail for end-to-end tracing
   - Use input transformers to pass context to targets

6. **Regular DLQ Review**
   - Monitor DLQ message age
   - Investigate patterns in failed events
   - Implement retry strategies

7. **Test Event Patterns Thoroughly**
   - Use `test-event-pattern` before deployment
   - Include both positive and negative test cases

8. **Configure Appropriate Retention**
   - Match retention to compliance requirements
   - Balance cost vs. audit needs

---

## Additional Resources

- [AWS EventBridge Monitoring Documentation](https://docs.aws.amazon.com/eventbridge/latest/userguide/monitoring-overview.html)
- [AWS EventBridge Best Practices](https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-best-practices.html)
- [CloudWatch Metrics for EventBridge](https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-monitoring.html)
- [Platform Observability Standard](../../../docs/platform-standards/platform-observability-standard.md)
- [Platform Logging Standard](../../../docs/platform-standards/platform-logging-standard.md)

---

## Feedback

For questions, issues, or suggestions about observability features:
- GitHub Issues: https://github.com/project42/shinobi/issues
- Platform Slack: #platform-observability
- Documentation: https://docs.shinobi.dev/observability
