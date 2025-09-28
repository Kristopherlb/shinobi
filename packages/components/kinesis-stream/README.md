# Kinesis Stream Component

Configuration-driven Kinesis data stream that leverages the platform’s five-layer precedence chain. The component consumes the resolved configuration produced by `KinesisStreamComponentConfigBuilder`; all compliance defaults live in `/config/<framework>.yml`.

## Features

- Supports provisioned or on-demand stream mode with configurable shard count and retention window.
- Encryption choices: none, AWS-managed KMS, or customer-managed key creation/import.
- Observability surface covering iterator age and provisioned throughput alarms with per-framework defaults.
- Capability payload includes `hardeningProfile` and encryption metadata for downstream consumers.

## Usage

```yaml
components:
  - name: ingest-stream
    type: kinesis-stream
    config:
      streamMode: provisioned
      shardCount: 4
      retentionHours: 72
      encryption:
        type: kms
        customerManagedKey:
          create: true
          alias: alias/ingest-stream
      monitoring:
        enabled: true
        enhancedMetrics: true
        alarms:
          iteratorAgeMs:
            enabled: true
            threshold: 180000
```

Unset fields inherit their values from the active framework configuration file.

## Configuration Highlights

| Path | Description |
|------|-------------|
| `streamMode` | `provisioned` (default) or `on-demand`. Shard count is required for provisioned mode. |
| `shardCount` | Number of shards when stream mode is provisioned. |
| `retentionHours` | Data retention in hours (24–8760). |
| `encryption.type` | `none`, `aws-managed`, or `kms`. Use `kmsKeyArn` or `customerManagedKey.create` to control key usage. |
| `monitoring.enabled` | Enables CloudWatch alarms. |
| `monitoring.alarms.iteratorAgeMs` | Iterator age (ms) threshold for consumer lag. |
| `monitoring.alarms.readProvisionedExceeded` | Count threshold for read throttling events. |
| `monitoring.alarms.writeProvisionedExceeded` | Count threshold for write throttling events. |
| `hardeningProfile` | Abstract security posture exposed via capabilities (`baseline`, `hardened`, `stig`). |

## Capability

`stream:kinesis`

```json
{
  "type": "stream:kinesis",
  "streamName": "ingest-stream",
  "streamArn": "arn:aws:kinesis:...",
  "streamMode": "provisioned",
  "shardCount": 4,
  "retentionHours": 72,
  "encryption": "kms",
  "kmsKeyArn": "arn:aws:kms:...",
  "hardeningProfile": "hardened"
}
```

## Tests

```bash
corepack pnpm exec jest --runTestsByPath \
  packages/components/kinesis-stream/tests/kinesis-stream.builder.test.ts \
  packages/components/kinesis-stream/tests/kinesis-stream.component.synthesis.test.ts
```

Note: component synthesis tests are subject to the known `@platform/logger` haste-map duplication issue; builder tests should still pass.
