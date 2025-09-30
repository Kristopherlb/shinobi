# VpcComponent

Config-driven VPC provisioning aligned with the platform networking standard. The component consumes the shared `ConfigBuilder` precedence chain (platform defaults → environment overrides → manifest → policy), so no compliance behaviour is embedded in code.

## Highlights

- Builds a three-tier VPC (public/private/database) with configurable CIDR masks and AZ fan-out
- Optional CloudWatch flow logs with retention/removal policy controls
- Managed VPC endpoints (S3, DynamoDB, Secrets Manager, KMS, Lambda) driven from configuration
- Toggleable network security features (default security groups, compliance network ACLs, default SG restrictions)
- Monitoring thresholds (NAT packet drops, flow-log delivery failures) resolved through config files

## Usage

```yaml
components:
  - name: network
    type: vpc
    config:
      cidr: 10.42.0.0/16
      natGateways: 2
      flowLogs:
        enabled: true
        retentionInDays: 90
        removalPolicy: destroy
      vpcEndpoints:
        s3: true
        dynamodb: true
        secretsManager: true
        kms: true
        lambda: false
      security:
        createDefaultSecurityGroups: true
        complianceNacls:
          enabled: true
          mode: standard
        restrictDefaultSecurityGroup: false
```

Commercial / FedRAMP defaults live in `config/commercial.yml`, `config/fedramp-moderate.yml`, and `config/fedramp-high.yml`. Adjust those files to change organisation-wide behaviour; the component will pick up the resolved configuration automatically.

## Key Configuration Blocks

| Block | Description |
| --- | --- |
| `cidr`, `maxAzs`, `natGateways` | Core VPC topology knobs |
| `subnets.public/private/database` | CIDR mask and friendly name per subnet tier |
| `flowLogs.enabled` | Enables CloudWatch flow logs; `retentionInDays` must match a supported retention enum; `removalPolicy` chooses retain/destroy |
| `vpcEndpoints` | Booleans for S3, DynamoDB, Secrets Manager, KMS, and Lambda endpoints |
| `monitoring.alarms` | NAT packet drop and flow-log delivery thresholds consumed when alarms are created |
| `security` | Controls whether default security groups or compliance NACLs are created and if the default SG is restricted |

## Capabilities

- `net:vpc` – VPC identifiers and subnet IDs
- `networking:vpc` – Regional context and subnet topology
- `security:network-isolation` – Flow log + endpoint posture metadata

## Handles

- `main`, `vpc`, `flowLogGroup`, `flowLogRole` (when created) for patch integrations

## Tests

```bash
corepack pnpm exec jest --runTestsByPath \
  packages/components/vpc/tests/vpc.builder.test.ts \
  packages/components/vpc/tests/vpc.component.synthesis.test.ts
```
