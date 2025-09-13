# Deployment Bundle Pipeline Component

A production-ready deployment bundle pipeline component that creates immutable, signed deployment bundles with comprehensive compliance artifacts for secure software supply chain management.

## Overview

The Deployment Bundle Pipeline component creates deployment bundles (DBL) that contain everything needed to deploy, audit, or roll back a service. Each bundle is an immutable, content-addressed artifact that includes:

- **CDK synthesis output** - Infrastructure as Code definitions
- **Infrastructure plans** - Deployment preview and changes
- **SBOMs** - Software Bill of Materials for all components
- **Security reports** - Vulnerability scan results and policy compliance
- **SLSA provenance** - Build integrity attestations
- **Test results** - Unit tests, integration tests, and coverage reports
- **Compliance reports** - Framework-specific compliance validation

## Features

### 🔒 Security & Compliance
- **Cosign-based signing** with keyless (OIDC) or KMS options
- **SLSA provenance attestations** for build integrity
- **Comprehensive SBOM generation** using Syft
- **Vulnerability scanning** with Grype and policy gates
- **Multi-framework compliance** (FedRAMP, ISO 27001, SOC 2)
- **FIPS-validated cryptography** for regulated environments

### 📦 Immutable Artifacts
- **OCI artifact format** with content-addressed references
- **Digest-based deployment** (no mutable tags)
- **Complete audit trail** with build provenance
- **Rollback capabilities** using immutable references

### 🏗️ Platform Integration
- **5-layer configuration precedence** (Component > Environment > Platform > Compliance > Hardcoded)
- **Compliance framework defaults** with automatic security hardening
- **Structured logging** with JSON format and trace correlation
- **OpenTelemetry observability** with metrics and tracing

## Usage

### Basic Configuration

```yaml
# service.yml
components:
  - type: deployment-bundle-pipeline
    service: my-service
    versionTag: "1.2.3"
    artifactoryHost: "artifactory.company.com"
    ociRepoBundles: "artifactory.company.com/bundles"
    environment: "prod"
    complianceFramework: "fedramp-moderate"
```

### Advanced Configuration

```yaml
# service.yml
components:
  - type: deployment-bundle-pipeline
    service: my-service
    versionTag: "1.2.3"
    artifactoryHost: "artifactory.company.com"
    ociRepoBundles: "artifactory.company.com/bundles"
    ociRepoImages: "artifactory.company.com/images"
    environment: "prod"
    complianceFramework: "fedramp-high"
    
    # Signing configuration
    signing:
      keyless: false
      kmsKeyId: "kms://aws-kms/alias/platform-cosign-prod"
      fulcioUrl: "https://fulcio.sigstore.dev"
      rekorUrl: "https://rekor.sigstore.dev"
    
    # Security scanning
    security:
      failOnCritical: true
      onlyFixed: true
      addCpesIfNone: true
    
    # Bundle contents
    bundle:
      includeCdkOutput: true
      includeTestReports: true
      includeCoverage: true
      includePolicyReports: true
    
    # Runner configuration
    runner:
      image: "registry/org/platform-runner:1.5.0"
      nodeVersion: "20.12.2"
      fipsMode: true
```

## Configuration Reference

### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `service` | string | Service name (lowercase, numbers, hyphens only) |
| `versionTag` | string | Version tag (semver or build-id) |
| `artifactoryHost` | string | Artifactory host URL |
| `ociRepoBundles` | string | OCI repository for bundles |

### Optional Fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `environment` | string | `"dev"` | Environment (dev, staging, prod) |
| `complianceFramework` | string | `"commercial"` | Compliance framework |
| `ociRepoImages` | string | - | OCI repository for container images |
| `signing` | object | - | Signing configuration |
| `security` | object | - | Security scanning configuration |
| `bundle` | object | - | Bundle contents configuration |
| `runner` | object | - | Runner image configuration |

### Signing Configuration

| Field | Type | Description |
|-------|------|-------------|
| `keyless` | boolean | Use keyless signing (OIDC) |
| `kmsKeyId` | string | KMS key for keyed signing (format: `kms://...`) |
| `fulcioUrl` | string | Fulcio URL for keyless signing |
| `rekorUrl` | string | Rekor URL for transparency log |

### Security Configuration

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `failOnCritical` | boolean | `true` | Fail on critical vulnerabilities |
| `onlyFixed` | boolean | `false` | Only report fixed vulnerabilities |
| `addCpesIfNone` | boolean | `true` | Add CPEs if none found |

### Bundle Configuration

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `includeCdkOutput` | boolean | `true` | Include CDK synthesis output |
| `includeTestReports` | boolean | `true` | Include test reports |
| `includeCoverage` | boolean | `true` | Include coverage reports |
| `includePolicyReports` | boolean | `true` | Include policy compliance reports |

### Runner Configuration

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `image` | string | `"registry/org/platform-runner:1.5.0"` | Base runner image |
| `nodeVersion` | string | `"20.12.2"` | Node.js version |
| `fipsMode` | boolean | `false` | Enable FIPS mode |

## Compliance Frameworks

### Commercial
- Keyless signing with OIDC
- Standard vulnerability scanning
- Basic compliance reporting

### FedRAMP Moderate
- KMS-based signing with FIPS validation
- Strict vulnerability scanning
- FIPS-enabled runner image
- Enhanced audit logging

### FedRAMP High
- KMS-based signing with FIPS validation
- Strict vulnerability scanning (only fixed vulnerabilities)
- FIPS-enabled runner image
- Comprehensive audit logging

### ISO 27001
- KMS-based signing
- Comprehensive vulnerability scanning
- ISO 27001 compliance reporting

### SOC 2
- KMS-based signing
- Comprehensive vulnerability scanning
- SOC 2 compliance reporting

## Capabilities

The component provides the following capabilities for other components to bind to:

| Capability | Description |
|------------|-------------|
| `bundle:digest` | Content-addressed digest of the deployment bundle |
| `bundle:reference` | Full OCI reference to the deployment bundle |
| `bundle:manifest` | Bundle manifest with metadata and provenance |
| `bundle:signature` | Signature information and verification status |
| `bundle:attestation` | SLSA provenance attestation details |
| `bundle:sbom` | Software Bill of Materials references |
| `bundle:compliance-report` | Compliance validation report |
| `bundle:security-report` | Security scan results and policy status |

## Construct Handles

The component registers the following constructs for patches and escape hatches:

| Handle | Description |
|--------|-------------|
| `main` | Primary deployment bundle pipeline construct |

## Pipeline Stages

### 1. Build and Test
- Compile service code
- Run unit and integration tests
- Generate test reports and coverage
- Synthesize CDK infrastructure

### 2. Security Artifacts
- Generate SBOMs for workspace and images
- Run vulnerability scans with Grype
- Validate security policies
- Generate security reports

### 3. Compliance Reporting
- Validate against compliance framework
- Generate compliance reports
- Check policy compliance
- Document control coverage

### 4. Bundle Creation
- Package all artifacts into OCI bundle
- Create bundle manifest
- Push to Artifactory registry
- Generate content-addressed reference

### 5. Signing and Attestation
- Sign bundle with Cosign
- Generate SLSA provenance attestation
- Attach SBOMs as OCI referrers
- Create transparency log entries

### 6. Verification and Promotion
- Verify signatures and attestations
- Validate compliance policies
- Promote to appropriate channel
- Generate deployment evidence

## Security Features

### Signing and Attestation
- **Cosign integration** for artifact signing
- **SLSA provenance** for build integrity
- **Keyless signing** with OIDC for CI/CD
- **KMS-based signing** for regulated environments
- **Transparency log** integration with Rekor

### Vulnerability Management
- **Grype scanning** for known vulnerabilities
- **Policy gates** for security thresholds
- **SBOM generation** for dependency tracking
- **CVE tracking** and remediation guidance

### Compliance Validation
- **Multi-framework support** (FedRAMP, ISO 27001, SOC 2)
- **Automated compliance checks** with policy validation
- **Audit trail generation** for regulatory requirements
- **Control mapping** to compliance frameworks

## Monitoring and Observability

### Metrics
- Bundle creation rate and duration
- Signing success rate
- Vulnerability scan results
- Compliance status
- Error rates by pipeline stage

### Alarms
- Bundle creation failures
- Signing failures
- Critical vulnerability detection
- Compliance validation failures
- High error rates

### Dashboards
- Real-time pipeline status
- Security posture overview
- Compliance status tracking
- Performance metrics

## Development

### Prerequisites
- Node.js 18+
- TypeScript 5+
- AWS CDK 2.100+
- Platform core libraries

### Installation
```bash
npm install @platform/components-deployment-bundle-pipeline
```

### Building
```bash
npm run build
```

### Testing
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Linting
```bash
# Check for linting errors
npm run lint

# Fix linting errors
npm run lint:fix
```

## Audit and Compliance

### Audit Artifacts
- **Component Plan** (`audit/component.plan.json`) - Machine-readable specification
- **OSCAL Metadata** (`audit/deployment-bundle-pipeline.oscal.json`) - Compliance documentation
- **Rego Policies** (`audit/rego/`) - Policy-as-code validation rules

### Compliance Controls
- **AC-2** - Access control and authentication
- **AC-3** - Access enforcement and monitoring
- **AU-2** - Audit event generation
- **AU-3** - Audit record content
- **CA-2** - Security assessments
- **CM-2** - Configuration management
- **CP-9** - Information system backup
- **IR-4** - Incident response capabilities
- **RA-5** - Vulnerability scanning
- **SA-11** - Developer security testing
- **SA-12** - Supply chain protection
- **SC-7** - Boundary protection
- **SC-13** - Cryptographic protection
- **SC-28** - Information at rest protection
- **SI-2** - Flaw remediation
- **SI-3** - Malicious code protection
- **SI-4** - Information system monitoring

## Troubleshooting

### Common Issues

#### Build Failures
- Check that all required tools are installed (cosign, oras, syft, grype, skopeo, jq)
- Verify Artifactory connectivity and credentials
- Ensure proper IAM permissions for KMS (if using keyed signing)

#### Signing Failures
- Verify OIDC identity is properly configured (for keyless signing)
- Check KMS key permissions and region (for keyed signing)
- Ensure Fulcio/Rekor connectivity (for keyless signing)

#### Vulnerability Scan Failures
- Review vulnerability scan results and policy thresholds
- Check for false positives and update suppressions
- Verify SBOM generation is working correctly

#### Compliance Failures
- Review compliance framework requirements
- Check that all required controls are implemented
- Verify audit trail generation

### Debug Mode
Enable debug logging by setting the `DEBUG` environment variable:
```bash
export DEBUG=deployment-bundle-pipeline:*
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

For support and questions:
- Create an issue in the repository
- Contact the Platform Engineering team
- Check the documentation wiki
