# EFS Filesystem Component

Configuration-driven Amazon EFS filesystem that honours the platform precedence chain via
`EfsFilesystemComponentConfigBuilder`. Compliance defaults live entirely in `/config/<framework>.yml`; the
component simply consumes the resolved configuration to materialise the shared file system.

## Features

- File system topology (performance mode, throughput mode, provisioned throughput) declared via config.
- VPC integration with optional security-group provisioning and custom ingress rules (default NFS port 2049).
- Encryption controls (at rest, optional customer-managed KMS, and in-transit) with config-driven hardening profiles.
- Lifecycle management, automatic backups, and file-system policy pass-through all resolved from configuration.
- Optional CloudWatch log groups and alarms (storage utilisation, client connections, burst credits) defined per framework.
- Capability metadata advertises the final hardening profile for downstream binders.

## Usage

```yaml
components:
  - name: shared-efs
    type: efs-filesystem
    config:
      fileSystemName: app-shared-fs
      vpc:
        vpcId: vpc-0123456789abcdef0
        subnetIds:
          - subnet-private-a
          - subnet-private-b
        securityGroup:
          create: true
          ingressRules:
            - port: 2049
              cidr: 10.0.0.0/16
              description: "NFS traffic from application subnets"
      encryption:
        enabled: true
        encryptInTransit: true
        customerManagedKey:
          create: true
          alias: alias/app/shared-efs
      backups:
        enabled: true
      logging:
        access:
          enabled: true
          retentionInDays: 180
          removalPolicy: retain
      monitoring:
        enabled: true
        alarms:
          storageUtilization:
            enabled: true
            threshold: 214748364800 # 200 GiB
```

Any property omitted in the manifest defaults to the platform configuration for the active compliance
framework (`/config/commercial.yml`, `/config/fedramp-moderate.yml`, `/config/fedramp-high.yml`).

## Key Configuration Sections

| Path | Description |
|------|-------------|
| `fileSystemName` | Final filesystem name; auto-sanitised if omitted. |
| `performanceMode` | `generalPurpose` or `maxIO`. |
| `throughputMode` | `bursting`, `provisioned`, or `elastic`; provisioned mode expects `provisionedThroughputMibps`. |
| `encryption` | Controls at-rest encryption (with optional customer-managed key) and in-transit enforcement. |
| `vpc` | VPC ID, target subnets, and optional security group creation/import with ingress rules. |
| `lifecycle` | Transition files to/from Infrequent Access. |
| `backups.enabled` | Enables AWS Backup integration. |
| `logging.access` / `logging.audit` | Log group provisioning, retention, and removal policies. |
| `monitoring` | Global toggle plus per-alarm thresholds for storage utilisation, client connections, and burst credit balance. |
| `filesystemPolicy` | JSON policy document applied to the filesystem. |
| `removalPolicy` | `retain` or `destroy`. |
| `hardeningProfile` | Abstract security posture, surfaced in the component capability. |

## Capabilities

- `storage:efs` – Filesystem metadata (ID, ARN, performance/throughput configuration, encryption posture, backups).

## Testing

```bash
corepack pnpm exec jest --runTestsByPath \
  packages/components/efs-filesystem/tests/efs-filesystem.builder.test.ts \
  packages/components/efs-filesystem/tests/efs-filesystem.component.synthesis.test.ts
```

## Notes

- The component no longer inspects `context.complianceFramework`; ensure framework defaults in `/config` capture required hardening.
- Provide `config.vpc.vpcId` and subnet IDs – EFS mount targets must live in a VPC.
- When `encryption.customerManagedKey.create` is true, the component provisions a dedicated KMS key; otherwise supply `kmsKeyArn` or allow AWS-managed keys.
- Monitoring alarms and log groups are created only when explicitly enabled in configuration.
