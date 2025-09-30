# Route53 Hosted Zone Component

Configuration-driven hosted zone creation following the shared ConfigBuilder
contract. All compliance-specific defaults are sourced from
`/config/<framework>.yml`; the component simply consumes the resolved
configuration when synthesising public or private zones.

## Features

- Public or private hosted zones with optional multi-VPC associations.
- Query logging support (existing log group or on-the-fly creation with
  configurable retention/removal).
- Optional DNSSEC enablement.
- CloudWatch alarms driven by configuration (query volume, health-check
  failures).
- Capability metadata exposes zone type, DNSSEC status, and name servers.

## Usage

```yaml
components:
  - name: app-public-zone
    type: route53-hosted-zone
    config:
      zoneName: example.com
      comment: "Primary public zone"
      zoneType: public
      queryLogging:
        enabled: true
        retentionDays: 180
        removalPolicy: retain
      monitoring:
        enabled: true
        alarms:
          queryVolume:
            enabled: true
            threshold: 20000
```

Private zones specify VPC associations:

```yaml
  - name: internal-zone
    type: route53-hosted-zone
    config:
      zoneName: corp.internal
      zoneType: private
      vpcAssociations:
        - vpcId: vpc-0123456789abcdef0
      dnssec:
        enabled: true
```

Any omitted property inherits the defaults for the active compliance framework.

## Key Configuration Sections

| Path | Description |
|------|-------------|
| `zoneName` | Required domain name. Trailing dots are stripped automatically. |
| `zoneType` | `public` (default) or `private`; private zones require at least one VPC association. |
| `vpcAssociations[]` | VPC ID and optional region for private zones. Additional entries are added via `addVpc`. |
| `queryLogging` | Enable/disable query logging; optionally supply existing log group ARN, otherwise a log group is created with the configured retention/removal policy. |
| `dnssec` | Toggle DNSSEC enablement. |
| `monitoring` | Enable alarms for query volume and health-check failures with configurable thresholds. |
| `hardeningProfile` | Abstract profile surfaced through component capabilities. |
| `removalPolicy` | `retain` (default) or `destroy`. |

## Capabilities

- `dns:hosted-zone` – Hosted zone ID, name, type, DNSSEC status, and name servers.

## Testing

```bash
corepack pnpm exec jest --runTestsByPath \
  packages/components/route53-hosted-zone/tests/route53-hosted-zone.builder.test.ts \
  packages/components/route53-hosted-zone/tests/route53-hosted-zone.component.synthesis.test.ts
```

## Notes

- The component does not inspect `context.complianceFramework`; ensure the
  `/config/<framework>.yml` files encode the required posture (DNSSEC, logging,
  alarms, etc.).
- When `zoneType` is `private`, provide the VPC IDs in the configuration so the
  builder can associate them. |
- Query logging requires the `route53resolver:AssociateResolverQueryLogConfig`
  permissions when deploying; ensure your execution role has the appropriate
  rights if you enable logging.
