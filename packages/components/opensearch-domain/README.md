# OpenSearch Domain Component

Configuration-driven OpenSearch domain that honours the platform precedence chain via
`OpenSearchDomainComponentConfigBuilder`. Compliance-specific defaults are delivered from
`/config/<framework>.yml`, keeping the component logic completely agnostic of frameworks.

## Features

- Data/ingest cluster layout (instance type/count, zone awareness, dedicated masters, UltraWarm) fully configurable.
- Storage, encryption, endpoint policy, and fine-grained access control expressed declaratively.
- Log publishing (slow search/index, application, audit) with optional log-group provisioning, retention, and removal policies.
- Monitoring/alarm thresholds (cluster status, JVM memory, free storage) sourced from configuration, surfaced as CloudWatch alarms.
- Capability payload advertises the resolved hardening profile for downstream binders.

## Usage

```yaml
components:
  - name: primary-search
    type: opensearch-domain
    config:
      cluster:
        instanceType: m6g.large.search
        instanceCount: 3
        zoneAwarenessEnabled: true
        dedicatedMasterEnabled: true
        masterInstanceType: m6g.large.search
      ebs:
        volumeType: gp3
        volumeSize: 120
      logging:
        audit:
          enabled: true
          retentionInDays: 365
          removalPolicy: retain
      monitoring:
        enabled: true
        alarms:
          clusterStatusRed:
            enabled: true
          freeStorageSpace:
            enabled: true
            threshold: 80
            comparisonOperator: lt
```

Any unspecified properties fall back to the platform defaults for the active compliance
framework (`/config/commercial.yml`, `/config/fedramp-moderate.yml`, `/config/fedramp-high.yml`).

## Key Configuration Sections

| Path | Description |
|------|-------------|
| `cluster` | Node topology (instance type/count, zone awareness, dedicated masters, warm nodes). |
| `ebs` | Volume configuration (type, size, optional IOPS/throughput). |
| `vpc` | VPC integration, security groups, and ingress rules. |
| `encryption` | At-rest and node-to-node encryption toggles and optional KMS key ARN. |
| `domainEndpoint` | HTTPS enforcement and TLS policy selection. |
| `advancedSecurity` | Fine-grained access control settings (master user, optional password secret). |
| `logging` | Slow search/index, application, and audit log controls with retention/removal policy. |
| `monitoring` | Global toggle plus per-alarm thresholds (cluster status red/yellow, JVM memory pressure, free storage space). |
| `snapshot` | Automated snapshot start hour. |
| `maintenance.autoTune` | AutoTune desired state and off-peak window enablement. |
| `accessPolicies.statements[]` | IAM-style policy statements granting/denying access to the domain. |
| `advancedOptions` | Direct pass-through for OpenSearch advanced options. |
| `hardeningProfile` | Abstract security posture reported via the component capability. |

## Capabilities

- `search:opensearch` – Domain metadata (ARN, endpoint, engine, cluster summary, hardening profile).

## Testing

```bash
corepack pnpm exec jest --runTestsByPath \
  packages/components/opensearch-domain/tests/opensearch-domain.builder.test.ts \
  packages/components/opensearch-domain/tests/opensearch-domain.component.synthesis.test.ts
```

## Notes

- The component no longer inspects `context.complianceFramework`; all compliance tuning must be defined in configuration.
- If fine-grained access control is enabled with an internal user database, provide `advancedSecurity.masterUserPassword` or a `masterUserPasswordSecretArn`.
- When `vpc.enabled` is true, either provide existing security group IDs or allow the component to create one by setting `createSecurityGroup: true`.
