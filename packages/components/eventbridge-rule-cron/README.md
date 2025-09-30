# EventBridge Rule Cron Component

Creates an EventBridge rule that triggers on a cron/rate schedule using the platform configuration precedence chain. Scheduling, dead-letter queue behaviour, logging, and alarms are all resolved by the builder; no compliance logic lives in the component.

## Usage Example

```yaml
components:
  - name: nightly-sync
    type: eventbridge-rule-cron
    config:
      schedule: 'cron(0 3 * * ? *)'
      description: Run nightly sync at 03:00 UTC
      eventBus:
        name: custom-bus
      deadLetterQueue:
        enabled: true
        maxRetryAttempts: 5
        retentionDays: 14
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
            threshold: 500
            evaluationPeriods: 2
            periodMinutes: 5
            comparisonOperator: gte
            treatMissingData: not-breaching
            statistic: Sum
        cloudWatchLogs:
          enabled: true
          retentionDays: 90
```

## Configuration Reference

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `schedule` | string | ✅ | Cron or rate expression passed directly to EventBridge. |
| `ruleName` | string | | Override the generated rule name (sanitised to 64 characters). |
| `description` | string | | Rule description (defaults to `Cron rule for <component>`). |
| `eventBus.name` | string | | Name of an EventBridge bus (defaults to `default`). |
| `eventBus.arn` | string | | ARN of an EventBridge bus (overrides `name`). |
| `state` | enum | | `enabled` or `disabled` (defaults to `enabled`). |
| `input.type` | enum | | `constant`, `path`, or `transformer` (optional). |
| `input.value` | string | | Constant payload when `type: constant`. |
| `input.path` | string | | JSON path when `type: path`. |
| `input.transformer` | object | | Transformer configuration (`inputTemplate` required) when `type: transformer`. |
| `deadLetterQueue.enabled` | boolean | | Toggle DLQ configuration (no SQS queue is created automatically). |
| `deadLetterQueue.maxRetryAttempts` | number | | Retry attempts before handing to the DLQ. |
| `deadLetterQueue.retentionDays` | number | | DLQ retention period in days. |
| `monitoring.enabled` | boolean | | Enable CloudWatch alarms/logging. |
| `monitoring.alarms.failedInvocations` | Alarm | | Alarm configuration for failed invocations. |
| `monitoring.alarms.invocationRate` | Alarm | | Alarm configuration for invocation volume. |
| `monitoring.cloudWatchLogs.enabled` | boolean | | Enable CloudWatch log delivery for rule executions. |
| `monitoring.cloudWatchLogs.logGroupName` | string | | Override the log group name (defaults to `/aws/events/rule/<service>-<component>`). |
| `monitoring.cloudWatchLogs.retentionDays` | number | | Log retention period in days. |
| `monitoring.cloudWatchLogs.removalPolicy` | enum | | `retain` or `destroy`. |
| `tags` | map | | Additional tags merged into the rule. |

**Alarm Config Fields**

| Field | Description |
|-------|-------------|
| `enabled` | Turns the alarm on/off. |
| `threshold` | Numeric threshold for the metric. |
| `evaluationPeriods` | Number of evaluation periods. |
| `periodMinutes` | Period length in minutes. |
| `comparisonOperator` | `gt`, `gte`, `lt`, or `lte`. |
| `treatMissingData` | `breaching`, `not-breaching`, `ignore`, or `missing`. |
| `statistic` | `Sum`, `Average`, `Minimum`, or `Maximum`. |

## Capabilities

| Capability | Description |
|------------|-------------|
| `eventbridge:rule-cron` | Exposes rule ARN/name, schedule, state, event bus identifier, DLQ config, and monitoring metadata. |

## Construct Handles

| Handle | Description |
|--------|-------------|
| `main`, `rule` | Underlying `AWS::Events::Rule` construct. |
| `logGroup` | CloudWatch log group created when logging is enabled. |
| `alarm:<metric>` | CloudWatch alarms created from the monitoring configuration (e.g. `alarm:failedInvocations`). |

## Platform Defaults

Defaults are defined in:

- `config/commercial.yml`
- `config/fedramp-moderate.yml`
- `config/fedramp-high.yml`

Commercial defaults keep monitoring and DLQ disabled. FedRAMP profiles enable DLQ, CloudWatch logging, and alarms by default.

## Testing

```bash
corepack pnpm exec jest --runTestsByPath \
  packages/components/eventbridge-rule-cron/tests/eventbridge-rule-cron.builder.test.ts \
  packages/components/eventbridge-rule-cron/tests/eventbridge-rule-cron.component.synthesis.test.ts --silent
```
