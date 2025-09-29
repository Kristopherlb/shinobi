# SNS Topic Component

Creates an Amazon SNS topic using the platform’s configuration precedence chain. All encryption, policies, and monitoring behaviour are supplied by the resolved configuration; the component itself never branches on `context.complianceFramework`.

## Usage Example

```yaml
components:
  - name: notifications
    type: sns-topic
    config:
      displayName: Customer Notifications
      fifo:
        enabled: false
      encryption:
        enabled: true
        customerManagedKey:
          create: true
          alias: alias/notifications-key
          enableRotation: true
      deliveryPolicy:
        http:
          defaultHealthyRetryPolicy:
            numRetries: 5
            minDelayTarget: 30
            maxDelayTarget: 120
            backoffFunction: exponential
      policies:
        - sid: DenyInsecureTransport
          effect: deny
          actions: ['sns:*']
          principals:
            - type: any
          conditions:
            Bool:
              aws:SecureTransport: 'false'
      monitoring:
        enabled: true
        alarms:
          failedNotifications:
            enabled: true
            threshold: 1
            evaluationPeriods: 2
            periodMinutes: 5
            comparisonOperator: gte
            treatMissingData: not-breaching
            statistic: Sum
          messageRate:
            enabled: true
            threshold: 5000
            evaluationPeriods: 2
            periodMinutes: 5
            comparisonOperator: gte
            treatMissingData: not-breaching
            statistic: Sum
```

## Configuration Reference

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `topicName` | string | | Override the generated topic name. `.fifo` is appended automatically when FIFO is enabled. |
| `displayName` | string | | Display name for mobile push/SMS notifications. |
| `fifo.enabled` | boolean | | Enable FIFO topic behaviour. |
| `fifo.contentBasedDeduplication` | boolean | | Turn on content-based deduplication for FIFO topics. |
| `encryption.enabled` | boolean | | Enables server-side encryption. |
| `encryption.kmsKeyArn` | string | | Import an existing KMS key ARN. |
| `encryption.customerManagedKey.create` | boolean | | Create a customer-managed key when `kmsKeyArn` is not supplied. |
| `encryption.customerManagedKey.alias` | string | | Optional alias for the generated key. |
| `encryption.customerManagedKey.enableRotation` | boolean | | Enable automatic key rotation when creating a key. |
| `deliveryPolicy` | object | | Raw delivery policy map applied to the topic (e.g. HTTP retry configuration). |
| `messageFilterPolicy` | object | | Informational filter policy data (exposed in capabilities for consumers). |
| `tracing` | enum | | `Active` or `PassThrough` tracing mode (defaults to `PassThrough`). |
| `policies[]` | object | | Declarative resource policies applied to the topic (see below). |
| `monitoring.enabled` | boolean | | Enables CloudWatch alarms. |
| `monitoring.alarms.failedNotifications` | Alarm | | Alarm configuration for `AWS/SNS NumberOfNotificationsFailed`. |
| `monitoring.alarms.messageRate` | Alarm | | Alarm configuration for `AWS/SNS NumberOfMessagesPublished`. |
| `tags` | map | | Additional tags merged into the topic. |

**Alarm Config Fields**

Each alarm supports:

| Field | Description |
|-------|-------------|
| `enabled` | Turns the alarm on/off. |
| `threshold` | Numeric threshold for the metric. |
| `evaluationPeriods` | Number of consecutive periods required. |
| `periodMinutes` | Period size in minutes. |
| `comparisonOperator` | `gt`, `gte`, `lt`, or `lte`. |
| `treatMissingData` | `breaching`, `not-breaching`, `ignore`, or `missing`. |
| `statistic` | `Sum`, `Average`, `Minimum`, or `Maximum`. |

**Policy Statement Fields**

| Field | Description |
|-------|-------------|
| `sid` | Optional statement identifier. |
| `effect` | `allow` or `deny` (defaults to `allow`). |
| `actions` | Required list of SNS actions. |
| `resources` | Optional list of ARNs (defaults to the topic ARN). |
| `principals[]` | Principals to apply (`service`, `account`, or `any`). |
| `conditions` | Optional condition block (matches IAM JSON structure). |

## Capabilities

| Capability | Description |
|------------|-------------|
| `topic:sns` | Exposes topic ARN, FIFO/encryption status, tracing mode, and master key ARN if present. |

## Construct Handles

| Handle | Description |
|--------|-------------|
| `main`, `topic` | Underlying `AWS::SNS::Topic` construct. |
| `kmsKey` | Generated KMS key when encryption creates one. |
| `alarm:failedNotifications` / `alarm:messageRate` | CloudWatch alarms created from the monitoring configuration. |

## Platform Defaults

Defaults are provided in:

- `config/commercial.yml`
- `config/fedramp-moderate.yml`
- `config/fedramp-high.yml`

Commercial defaults keep encryption and alarms optional. FedRAMP profiles enable customer-managed keys, stricter retry policies, and CloudWatch alarms by default.

## Testing

```bash
corepack pnpm exec jest --runTestsByPath \
  packages/components/sns-topic/tests/sns-topic.builder.test.ts \
  packages/components/sns-topic/tests/sns-topic.component.synthesis.test.ts --silent
```
