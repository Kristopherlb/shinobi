# DynamoDB Table Component

Configuration-driven DynamoDB table that sources all defaults from the platform ConfigBuilder. Compliance-specific behaviours (FedRAMP Moderate/High) are captured in `/config/<framework>.yml`; the component simply consumes the resolved configuration.

## Features

- Key schema, billing mode, table class, TTL, streams, and indexes expressed declaratively via configuration.
- Provisioned throughput auto-scaling, point-in-time recovery, and backup retention controlled by config defaults.
- Encryption supports AWS-managed or customer-managed keys (including optional key creation/aliasing).
- Monitoring alarms (read/write throttles, system errors) configurable per environment.
- Capability payload includes `hardeningProfile` and encryption metadata for downstream consumers.

## Usage Example

```yaml
components:
  - name: orders-table
    type: dynamodb-table
    config:
      partitionKey:
        name: orderId
        type: string
      sortKey:
        name: createdAt
        type: number
      billingMode: provisioned
      provisioned:
        readCapacity: 10
        writeCapacity: 5
        autoScaling:
          minReadCapacity: 5
          maxReadCapacity: 50
      pointInTimeRecovery: true
      timeToLive:
        enabled: true
        attributeName: ttlExpiry
      stream:
        enabled: true
        viewType: new-and-old-images
      encryption:
        type: customer-managed
        customerManagedKey:
          create: true
          alias: alias/orders-table
      monitoring:
        enabled: true
        alarms:
          readThrottle:
            enabled: true
            threshold: 1
```

## Configuration Highlights

| Path | Description |
|------|-------------|
| `partitionKey` / `sortKey` | Required table keys; include name and type (`string`, `number`, `binary`). |
| `billingMode` | `pay-per-request` (default) or `provisioned`. Provisioned mode enables auto-scaling inputs. |
| `provisioned` | Read/write capacity and optional auto-scaling bounds & utilization target. |
| `tableClass` | `standard` or `infrequent-access`. |
| `pointInTimeRecovery` | Enable PITR snapshots. |
| `timeToLive` | Toggle TTL and specify the attribute when enabled. |
| `stream` | Enable DynamoDB streams and choose a view type. |
| `globalSecondaryIndexes` / `localSecondaryIndexes` | Configure additional indexes, projection types, and throughput. |
| `encryption` | `aws-managed` or `customer-managed`; optionally supply `kmsKeyArn` or request key creation. |
| `backup` | Enable table backups, retention (days), and optional schedule metadata. |
| `monitoring.alarms` | Configure thresholds for read/write throttles and system errors. |
| `hardeningProfile` | Exposed via the capability to signal posture (`baseline`, `hardened`, `stig`). |

## Capability

`db:dynamodb`

```json
{
  "tableName": "orders-table",
  "tableArn": "arn:aws:dynamodb:...",
  "streamArn": "arn:aws:dynamodb:.../stream/...",
  "billingMode": "provisioned",
  "tableClass": "standard",
  "pointInTimeRecovery": true,
  "encryption": "customer-managed",
  "kmsKeyArn": "arn:aws:kms:...",
  "hardeningProfile": "hardened"
}
```

## Tests

```bash
corepack pnpm exec jest --runTestsByPath \
  packages/components/dynamodb-table/tests/dynamodb-table.builder.test.ts \
  packages/components/dynamodb-table/tests/dynamodb-table.component.synthesis.test.ts
```

Note: component synthesis tests are currently blocked by the known `@platform/logger` haste-map duplication issue. Builder tests should pass.
