# EventBridge Rule Pattern Component

Creates an Amazon EventBridge rule that matches events using a manifest-driven pattern. **Monitoring and dead-letter queuing are mandatory per platform standards**, with compliance-aware defaults for log retention and KMS encryption.

## 🔒 Platform Standards Enforced

- ✅ **Mandatory Monitoring**: Cannot be disabled (platform observability standard)
- ✅ **Mandatory Dead Letter Queue**: Ensures resilient event-driven design
- ✅ **Compliance-Aware Log Retention**: Automatic retention based on framework
  - Commercial: 365 days (1 year)
  - FedRAMP Moderate: 1827 days (5 years)
  - FedRAMP High: 3653 days (10 years)
- ✅ **KMS Encryption**: Customer-managed keys auto-created for FedRAMP deployments
- ✅ **Retain by Default**: Log groups set to `RemovalPolicy.RETAIN`

## Minimal Usage Example

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
      # Mandatory fields (platform enforces these)
      deadLetterQueue:
        enabled: true
      monitoring:
        enabled: true
        cloudWatchLogs:
          enabled: true
```

## Full Example with Alarms

```yaml
components:
  - name: high-value-orders
    type: eventbridge-rule-pattern
    config:
      description: "Monitor high-value order events"
      eventPattern:
        source: ['com.myapp.orders']
        detail-type: ['Order Placed']
        detail:
          amount:
            - numeric: [">", 1000]
      
      # Monitoring (mandatory - customize alarm thresholds)
      monitoring:
        enabled: true
        failedInvocations:
          enabled: true
          threshold: 5
          evaluationPeriods: 2
          periodMinutes: 5
          comparisonOperator: gte
        cloudWatchLogs:
          enabled: true
          retentionDays: 90  # Override framework default if needed
          removalPolicy: retain

      # Dead Letter Queue (mandatory - customize retention)
      deadLetterQueue:
        enabled: true
        maxRetryAttempts: 3
        retentionDays: 14
      
      tags:
        CostCenter: "OrderProcessing"
        DataClassification: "Confidential"
```

## Configuration Reference

### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `eventPattern` | object | Standard EventBridge event pattern (see [AWS docs](https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-event-patterns.html)) |
| `deadLetterQueue` | object | Dead letter queue configuration (must set `enabled: true`) |
| `monitoring` | object | Monitoring configuration (must set `enabled: true` and `cloudWatchLogs.enabled: true`) |

### Optional Fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `ruleName` | string | `{service}-{component}` | Custom rule name. Invalid characters replaced with `-`, truncated to 64 chars |
| `description` | string | Auto-generated | Human-readable rule description |
| `state` | enum | `enabled` | Rule state: `enabled` or `disabled` |
| `eventBus.name` | string | `default` | Name of existing event bus |
| `eventBus.arn` | string | - | ARN of event bus (overrides `name`, used for cross-account) |

### Input Transformation (Optional)

| Field | Type | Description |
|-------|------|-------------|
| `input.type` | enum | Transformation type: `constant`, `path`, or `transformer` |
| `input.value` | string | Static JSON string when `type: constant` |
| `input.path` | string | JSONPath expression when `type: path` |
| `input.transformer.inputPathsMap` | object | Variable mappings for transformer |
| `input.transformer.inputTemplate` | string | Template string (required when `type: transformer`) |

### Dead Letter Queue Configuration

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `deadLetterQueue.enabled` | boolean | `true` | **Must be true** - cannot be disabled |
| `deadLetterQueue.maxRetryAttempts` | number | `3` | Retry attempts before sending to DLQ (0-185) |
| `deadLetterQueue.retentionDays` | number | `14` | Message retention in DLQ (1-14 days) |

### Monitoring Configuration

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `monitoring.enabled` | boolean | `true` | **Must be true** - cannot be disabled |
| `monitoring.cloudWatchLogs.enabled` | boolean | `true` | **Must be true** - cannot be disabled |
| `monitoring.cloudWatchLogs.logGroupName` | string | `/aws/platform/events/{service}-{component}-{rule}` | Custom log group name |
| `monitoring.cloudWatchLogs.retentionDays` | number | Framework-dependent | Log retention period (see compliance table below) |
| `monitoring.cloudWatchLogs.removalPolicy` | enum | `retain` | Must remain `retain` for FedRAMP deployments |

### Alarm Configuration (Optional)

Each alarm section (`failedInvocations`, `invocations`, `matchedEvents`, `deadLetterQueueMessages`) accepts:

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `enabled` | boolean | `false` | Enable this specific alarm |
| `threshold` | number | Metric-specific | Alarm threshold value |
| `evaluationPeriods` | number | `1` | Number of evaluation periods |
| `periodMinutes` | number | `5` | Period length in minutes |
| `comparisonOperator` | enum | Metric-specific | `gt`, `gte`, `lt`, or `lte` |
| `treatMissingData` | enum | `not-breaching` | `breaching`, `not-breaching`, `ignore`, or `missing` |
| `statistic` | enum | `Sum` | `Average`, `Sum`, `Minimum`, or `Maximum` |

## Compliance Framework Behavior

The component automatically adapts to your deployment's compliance framework:

| Framework | Log Retention | KMS Encryption | Removal Policy |
|-----------|---------------|----------------|----------------|
| **Commercial** | 365 days (1 year) | Optional | Retain |
| **FedRAMP Moderate** | 1827 days (5 years) | Customer-managed (auto-created) | Retain |
| **FedRAMP High** | 3653 days (10 years) | Customer-managed (auto-created) | Retain |

**Note**: You can override retention and provide your own KMS key, but you cannot disable monitoring or reduce security below the framework baseline.

## Capabilities

The component exposes the `eventbridge:rule-pattern` capability:

```typescript
{
  ruleName: string;              // Name of the EventBridge rule
  ruleArn: string;               // ARN of the EventBridge rule
  state: 'enabled' | 'disabled'; // Current rule state
  eventBus: string;              // Event bus name or ARN
  deadLetterQueue: {
    queueUrl: string;            // SQS queue URL
    queueArn: string;            // SQS queue ARN
    encrypted: boolean;          // Whether DLQ uses a customer-managed key
    encryptionKeyArn?: string;   // ARN of DLQ KMS key (FedRAMP)
  };
  logGroup: {
    logGroupName: string;        // CloudWatch log group name
    logGroupArn: string;         // CloudWatch log group ARN
    encrypted: boolean;          // Whether KMS encryption is enabled
    encryptionKeyArn?: string;   // ARN of log KMS key (FedRAMP)
  };
  monitoring: {
    alarmsConfigured: string[];  // List of alarm IDs created
  };
}
```

See [platform-capability-naming-standard.md](../../docs/platform-standards/platform-capability-naming-standard.md#eventbridgerule-pattern) for binder integration details.

## Construct Handles

| Handle | Description |
|--------|-------------|
| `main`, `rule` | Underlying `AWS::Events::Rule` construct |
| `deadLetterQueue` | SQS dead letter queue (always created) |
| `logGroup` | CloudWatch log group (always created) |
| `kms:logs` | KMS key for log encryption (FedRAMP deployments) |
| `kms:dlq` | KMS key for DLQ encryption (FedRAMP deployments) |
| `alarm:failedInvocations` | CloudWatch alarm for failed invocations (if enabled) |
| `alarm:invocations` | CloudWatch alarm for invocation volume (if enabled) |
| `alarm:matchedEvents` | CloudWatch alarm for matched events (if enabled) |
| `alarm:deadLetterQueueMessages` | CloudWatch alarm for DLQ backlog (if enabled) |

## Validation

The component performs strict validation:

```typescript
// ❌ This will FAIL validation
{
  eventPattern: { source: ['aws.s3'] },
  monitoring: { enabled: false }  // Cannot disable monitoring
}

// ❌ This will FAIL validation
{
  eventPattern: { source: ['aws.s3'] },
  deadLetterQueue: { enabled: false }  // Cannot disable DLQ
}

// ✅ This will PASS validation
{
  eventPattern: { source: ['aws.s3'] },
  deadLetterQueue: { enabled: true },
  monitoring: { 
    enabled: true, 
    cloudWatchLogs: { enabled: true } 
  }
}
```

## Migration from Pre-1.0

If you have existing manifests without mandatory fields, update them:

**Before** (Pre-1.0):
```yaml
- name: my-rule
  type: eventbridge-rule-pattern
  config:
    eventPattern:
      source: ['aws.ec2']
```

**After** (1.0+):
```yaml
- name: my-rule
  type: eventbridge-rule-pattern
  config:
    eventPattern:
      source: ['aws.ec2']
    deadLetterQueue:
      enabled: true
    monitoring:
      enabled: true
      cloudWatchLogs:
        enabled: true
```

## Testing

```bash
# Unit and builder tests
pnpm test

# Specific test files
pnpm jest tests/eventbridge-rule-pattern.builder.test.ts
pnpm jest tests/eventbridge-rule-pattern.component.synthesis.test.ts

# Coverage report
pnpm test:coverage
```

## Common Patterns

### Pattern: Cross-Account Event Bus

```yaml
config:
  eventBus:
    arn: arn:aws:events:us-east-1:123456789012:event-bus/partner-events
  eventPattern:
    source: ['partner.app']
```

### Pattern: High-Security Compliance

```yaml
config:
  eventPattern:
    source: ['com.myapp.audit']
  monitoring:
    enabled: true
    cloudWatchLogs:
      enabled: true
      kmsKeyId: arn:aws:kms:us-gov-west-1:123456789012:key/my-cmk
      retentionDays: 2555  # 7 years
      removalPolicy: retain
  deadLetterQueue:
    enabled: true
    retentionDays: 14
```

### Pattern: Transform Event Data

```yaml
config:
  eventPattern:
    source: ['aws.s3']
  input:
    type: transformer
    transformer:
      inputPathsMap:
        bucket: "$.detail.bucket.name"
        key: "$.detail.object.key"
      inputTemplate: '{"bucketName": <bucket>, "objectKey": <key>}'
```

## Observability

All rules emit structured logs and metrics:

**Metrics** (namespace: `AWS/Events`):
- `Invocations`: Total rule invocations
- `FailedInvocations`: Failed target deliveries
- `MatchedEvents`: Events matched by pattern

**Logs** (group: `/aws/events/rule/{service}-{component}`):
- Event details for matched events
- Encrypted with KMS for FedRAMP
- Retained per compliance framework
- Queryable with CloudWatch Insights

**Alarms** (optional):
- Configure thresholds per your SLOs
- Integration with SNS/PagerDuty via alarm actions

## Troubleshooting

### Error: "Monitoring cannot be disabled"
- **Cause**: Attempted to set `monitoring.enabled: false`
- **Fix**: Remove the field or set to `true` (mandatory per platform standards)

### Error: "Dead letter queue cannot be disabled"
- **Cause**: Attempted to set `deadLetterQueue.enabled: false`
- **Fix**: Remove the field or set to `true` (mandatory for resilience)

### Error: "kms:Encrypt denied for log group"
- **Cause**: Custom KMS key policy missing CloudWatch Logs permissions
- **Fix**: Use auto-created key or add CloudWatch Logs principal to your key policy

## See Also

- [Platform Observability Standard](../../docs/platform-standards/platform-observability-standard.md)
- [Platform Logging Standard](../../docs/platform-standards/platform-logging-standard.md)
- [Platform Capability Naming Standard](../../docs/platform-standards/platform-capability-naming-standard.md)
- [EventBridge Event Patterns](https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-event-patterns.html)
- [Remediation Summary](./REMEDIATION-SUMMARY.md) - Full audit remediation details
