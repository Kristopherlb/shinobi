# EventBridge Rule Pattern Component

Creates an Amazon EventBridge rule that matches events using a manifest-driven pattern. All defaults come from `/config/<framework>.yml`; the component itself never branches on `context.complianceFramework`.

## Usage Example

```yaml
components:
  - name: user-signup-events
    type: eventbridge-rule-pattern
    config:
      eventPattern:
        source: ['aws.cognito-idp']
        detail-type: ['AWS API Call via CloudTrail']
        detail:
          eventName: ['SignUp']
      monitoring:
        enabled: true
        failedInvocations:
          enabled: true
          threshold: 2
        cloudWatchLogs:
          enabled: true
          logGroupName: /platform/events/user-signups
          retentionDays: 90
      deadLetterQueue:
        enabled: true
        retentionDays: 14
```

## Configuration Reference

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `eventPattern` | object | ✅ | Standard EventBridge event pattern (see AWS docs). |
| `ruleName` | string | | Overrides the generated rule name. Invalid characters are replaced with `-` and truncated to 64 chars. |
| `description` | string | | Rule description (defaults to `EventBridge rule pattern for <component>`). |
| `state` | enum | | `enabled` (default) or `disabled`. |
| `eventBus.name` | string | | Name of an existing event bus (defaults to `default`). |
| `eventBus.arn` | string | | ARN of an event bus when cross-account. Overrides `name`. |
| `input.type` | enum | | `constant`, `path`, or `transformer`. |
| `input.value` | string | | Constant JSON string when `type: constant`. |
| `input.path` | string | | JSON path when `type: path`. |
| `input.transformer` | object | | Transformer definition (`inputTemplate` required) when `type: transformer`. |
| `deadLetterQueue.enabled` | boolean | | Toggles creation of a DLQ (default per framework). |
| `deadLetterQueue.maxRetryAttempts` | number | | Number of retry attempts applied by rule targets. |
| `deadLetterQueue.retentionDays` | number | | Queue retention period (1–14 days). |
| `monitoring.enabled` | boolean | | Enables alarms/logging. |
| `monitoring.failedInvocations` | Alarm | | Alarm settings for `AWS/Events FailedInvocations`. |
| `monitoring.invocations` | Alarm | | Alarm on invocation volume (`AWS/Events Invocations`). |
| `monitoring.matchedEvents` | Alarm | | Alarm on matched events (`AWS/Events MatchedEvents`). |
| `monitoring.deadLetterQueueMessages` | Alarm | | Alarm on DLQ message backlog (requires DLQ enabled). |
| `monitoring.cloudWatchLogs.enabled` | boolean | | Enables CloudWatch log delivery for events. |
| `monitoring.cloudWatchLogs.logGroupName` | string | | Custom log group name (defaults to `/aws/events/rule/<service>-<name>`). |
| `monitoring.cloudWatchLogs.retentionDays` | number | | Log retention in days (mapped to the nearest CloudWatch enum). |
| `monitoring.cloudWatchLogs.removalPolicy` | enum | | `retain` or `destroy`. |
| `tags` | map | | Extra tags merged onto the rule. |

**Alarm Config fields**

Each alarm block accepts:

| Field | Description |
|-------|-------------|
| `enabled` | Enables the alarm. |
| `threshold` | Numeric threshold for the metric. |
| `evaluationPeriods` | Number of evaluation periods. |
| `periodMinutes` | Period size in minutes. |
| `comparisonOperator` | `gt`, `gte`, `lt`, or `lte`. |
| `treatMissingData` | `breaching`, `not-breaching`, `ignore`, or `missing`. |
| `statistic` | `Sum`, `Average`, `Maximum`, or `Minimum`. |

## Capabilities

| Capability | Description |
|------------|-------------|
| `eventbridge:rule-pattern` | Exposes rule name/ARN, state, event bus identifier, and DLQ metadata (when created). |

## Construct Handles

| Handle | Description |
|--------|-------------|
| `main`, `rule` | Underlying `AWS::Events::Rule` construct. |
| `deadLetterQueue` | Dead letter queue when enabled. |
| `logGroup` | CloudWatch log group created for the rule. |
| `alarm:<metric>` | CloudWatch alarms created from the monitoring configuration (e.g. `alarm:failedInvocations`). |

## Platform Defaults

Defaults live in:

- `config/commercial.yml`
- `config/fedramp-moderate.yml`
- `config/fedramp-high.yml`

FedRAMP profiles enable logging, DLQ, and alarms out of the box. The commercial profile keeps these disabled unless opted-in.

## Testing

```bash
corepack pnpm exec jest --runTestsByPath \
  packages/components/eventbridge-rule-pattern/tests/eventbridge-rule-pattern.builder.test.ts \
  packages/components/eventbridge-rule-pattern/tests/eventbridge-rule-pattern.component.synthesis.test.ts --silent
```
