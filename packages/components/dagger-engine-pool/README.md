# Dagger Engine Pool Component

A secure, compliance-ready AWS CDK component that provisions a private, FIPS/STIG-friendly fleet for hosting remote Dagger engines with mTLS endpoints.

## Overview

The Dagger Engine Pool component provides a hermetic, reproducible CI/CD infrastructure by deploying a managed fleet of Dagger engine instances behind a private Network Load Balancer. This component ensures supply-chain integrity through signed deployment bundles, comprehensive SBOMs, and SLSA provenance attestations.

## Key Features

- **Security First**: FIPS/STIG-hardened base images with encryption at rest and in transit
- **Compliance Ready**: Built-in support for Commercial, FedRAMP Moderate, and FedRAMP High frameworks
- **Supply Chain Integrity**: Signed deployment bundles with SBOMs and provenance attestations
- **Observability**: Comprehensive logging, metrics, and alerting with OpenTelemetry integration
- **Feature Flags**: Configurable behaviors for shared caching and ECR mirroring

## Quick Start

```yaml
# service.yml
components:
  - name: ci-engine
    type: dagger-engine-pool
    config:
      capacity: { min: 1, max: 3 }
      fipsMode: true
      stigBaseline: "UBI9"
      endpoint:
        hostname: "dagger.engine.local"
        mtls:
          acmPcaArn: "arn:aws:acm-pca:us-east-1:123456789012:certificate-authority/12345678-1234-1234-1234-123456789012"
          allowedClientArns:
            - "arn:aws:acm:us-east-1:123456789012:certificate/ci-client-cert"
      storage:
        cache: "EBS"
        ebsGiB: 200
      featureFlags:
        sharedCacheEfs: false
        enableEcrMirror: false
```

## Configuration Reference

### Required Properties

| Property | Type | Description |
|----------|------|-------------|
| `capacity` | `object` | Auto Scaling Group capacity configuration |
| `capacity.min` | `number` | Minimum number of instances (minimum: 1) |
| `capacity.max` | `number` | Maximum number of instances (minimum: 1) |
| `fipsMode` | `boolean` | Enable FIPS 140-2 compliance mode |

### Optional Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `service` | `string` | - | Service name (auto-populated from context) |
| `env` | `string` | - | Environment name (auto-populated from context) |
| `owner` | `string` | - | Owner tag (auto-populated from context) |
| `stigBaseline` | `string` | `"UBI9"` | STIG baseline (`RHEL8`, `UBI9`, `UBUNTU-20`) |
| `instanceType` | `string` | `"c7i.large"` | EC2 instance type |
| `endpoint.hostname` | `string` | - | Custom hostname for Route53 record |
| `endpoint.nlbInternal` | `boolean` | `true` | Use internal NLB (public exposure forbidden) |
| `endpoint.mtls.acmPcaArn` | `string` | - | ACM Private CA ARN for mTLS certificates |
| `endpoint.mtls.allowedClientArns` | `array` | `[]` | Allowed client certificate ARNs |
| `storage.cache` | `string` | `"EBS"` | Cache backend (`EBS`, `EFS`, `DISK`) |
| `storage.ebsGiB` | `number` | `200` | EBS volume size in GiB |
| `storage.s3ArtifactsBucketRef` | `string` | - | Existing S3 bucket for artifacts (auto-created if omitted) |
| `storage.kmsKeyRef` | `string` | - | Existing KMS key (auto-created if omitted) |
| `observability.otlpEndpoint` | `string` | - | OpenTelemetry collector endpoint |
| `observability.logRetentionDays` | `number` | `365` | CloudWatch log retention in days |
| `featureFlags.sharedCacheEfs` | `boolean` | `false` | Enable EFS for cross-host caching |
| `featureFlags.enableEcrMirror` | `boolean` | `false` | Enable ECR pull-through caching |
| `compliance.forbidPublicExposure` | `boolean` | `true` | Block public endpoint exposure |
| `compliance.forbidNonFipsAmi` | `boolean` | `true` | Require FIPS-compliant AMIs |
| `compliance.forbidNoKms` | `boolean` | `true` | Require KMS encryption for all storage |

## Capabilities

This component provides the following capabilities for other components to bind to:

### `dagger:endpoint`
Provides the mTLS-secured endpoint URL for Dagger engine connections.

```typescript
{
  endpointUrl: "grpcs://internal-nlb-12345.elb.us-east-1.amazonaws.com:8443",
  hostname: "dagger.engine.local"
}
```

### `storage:artifacts`
Provides encrypted S3 storage for deployment bundles, SBOMs, and provenance data.

```typescript
{
  bucketArn: "arn:aws:s3:::dagger-artifacts-12345",
  bucketName: "dagger-artifacts-12345"
}
```

### `security:kms`
Provides the KMS key used for encryption of all storage resources.

```typescript
{
  keyArn: "arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012",
  keyId: "12345678-1234-1234-1234-123456789012"
}
```

### `logging:cloudwatch`
Provides CloudWatch Log Group for structured logging with correlation IDs.

```typescript
{
  logGroupName: "/aws/dagger-engine/my-service",
  logGroupArn: "arn:aws:logs:us-east-1:123456789012:log-group:/aws/dagger-engine/my-service"
}
```

## Construct Handles

The following construct handles are available for patches and advanced use cases:

| Handle | Type | Description |
|--------|------|-------------|
| `main` | `AutoScalingGroup` | Primary Auto Scaling Group managing the engine fleet |
| `nlb` | `NetworkLoadBalancer` | Internal Network Load Balancer for mTLS endpoint |
| `kms` | `Key` | KMS key for encryption of storage resources |
| `bucket` | `Bucket` | S3 bucket for artifacts and deployment bundles |
| `logs` | `LogGroup` | CloudWatch Log Group for structured logging |

## Security & Compliance

### Encryption
- **At Rest**: All storage (S3, EBS, EFS) encrypted with AWS KMS
- **In Transit**: mTLS on port 8443 with ACM Private CA certificates
- **Key Management**: Automatic key rotation enabled

### Network Security
- Private subnet deployment only (no public exposure)
- Security groups restrict access to port 8443
- IMDSv2 enforcement on EC2 instances

### Compliance Frameworks
- **Commercial**: Standard security defaults
- **FedRAMP Moderate**: Enhanced logging and monitoring
- **FedRAMP High**: FIPS 140-2 compliance and STIG hardening

### Audit & Monitoring
- Comprehensive CloudWatch logging with structured JSON
- OpenTelemetry integration for distributed tracing
- Built-in alarms for CPU, memory, and error rates
- VPC Flow Logs and CloudTrail integration

## Observability

### Dashboards
The component includes a pre-configured dashboard template (`observability/otel-dashboard-template.json`) with panels for:
- Engine pool health and capacity
- CPU and memory utilization
- Network load balancer metrics
- Dagger engine request/error rates
- Storage usage and KMS key metrics
- Log volume and correlation analysis

### Alarms
Default alarms are configured (`observability/alarms-config.json`) for:
- High CPU utilization (>80% for 5 minutes)
- High memory utilization (>85% for 5 minutes)
- No healthy hosts in load balancer
- High error rate (>1% for 2 minutes)
- Artifact storage approaching capacity (>90%)
- Anomalous log volume patterns

## Local Development

### Prerequisites
- Node.js 18+
- AWS CDK CLI
- Docker (for Dagger engine)

### Building
```bash
npm install
npm run build
```

### Testing
```bash
npm test
npm run test:coverage
```

### Linting
```bash
npm run lint
npm run lint:fix
```

## Compliance Artifacts

This component includes comprehensive compliance documentation:

### Audit Plan (`audit/component.plan.json`)
Machine-readable specification of component behavior, compliance controls, and security features.

### REGO Policies (`audit/rego/`)
Policy-as-code rules for validating component compliance:
- `dagger-engine-pool.rego`: Main compliance policy
- `dagger-engine-pool_test.rego`: Policy test cases

### OSCAL Stub (`audit/dagger-engine-pool.oscal.json`)
Placeholder for formal compliance certification documentation following OSCAL standards.

## Platform Integration

This component extends `BaseComponent` and integrates with:
- **Platform Tagging Service**: Automatic application of compliance and governance tags
- **Platform Observability**: OpenTelemetry instrumentation and structured logging
- **Platform Configuration**: 5-layer precedence chain for configuration management
- **Platform Testing**: Comprehensive test suite with >90% coverage

## Support

For questions, issues, or contributions:
- Platform Engineering Team: platform-team@company.com
- Documentation: [Platform Standards](docs/platform-standards/)
- Issues: [GitHub Issues](https://github.com/company/shinobi/issues)

## License

Apache License 2.0 - see [LICENSE](../../LICENSE) for details.
