# CertificateManagerComponent Component

Certificate Manager Component with comprehensive security, monitoring, and compliance features.

## Overview

The CertificateManagerComponent component provides:

- **Production-ready** ACM certificate provisioning with DNS/email validation.
- **Secure-by-default posture** (monitoring enabled, log retention enforced, explicit validation requirements).
- **Comprehensive compliance** (Commercial, FedRAMP Moderate/High) via segregated defaults.
- **Integrated monitoring** for expiration and validation status plus structured CloudWatch logging.
- **Platform integration** with Route53 hosted zones and downstream binders via capability `certificate:acm` and an observability hand-off for the platform OTEL service.

### Category: security

### AWS Service: CERTIFICATEMANAGER

This component manages CERTIFICATEMANAGER resources and provides a simplified, secure interface for common use cases.

## Usage Example

### Basic Configuration

```yaml
service: my-service
owner: platform-team
complianceFramework: commercial

components:
  - name: my-certificate
    type: certificate-manager
    config:
      domainName: example.com
      subjectAlternativeNames:
        - api.example.com
        - admin.example.com
      validation:
        method: DNS
        hostedZoneId: Z0123456789ABCDEF
        hostedZoneName: example.com
      logging:
        groups:
          - id: lifecycle
            enabled: true
            retentionInDays: 365
            removalPolicy: retain
      monitoring:
        enabled: true
        expiration:
          thresholdDays: 30
        status:
          threshold: 1
```

## Configuration Reference

### Root Configuration

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `domainName` | string | Yes | Primary domain name associated with the certificate |
| `subjectAlternativeNames` | string[] | No | Additional SANs included on the certificate |
| `validation` | object | No | Validation configuration (`method`, optional hosted zone or email recipients) |
| `transparencyLoggingEnabled` | boolean | No | Whether CT logging is enabled (default: true) |
| `keyAlgorithm` | string | No | Key algorithm (`RSA_2048`, `EC_prime256v1`, `EC_secp384r1`) |
| `logging` | object | No | CloudWatch log group configuration for certificate lifecycle events |
| `monitoring` | object | No | Expiration/status alarm configuration |
| `tags` | object | No | Additional tags merged with the platform baseline |

### Validation Configuration

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `method` | enum | No | Validation method (`DNS` default, `EMAIL` requires recipients) |
| `hostedZoneId` | string | DNS only | Route53 hosted zone ID for automated DNS validation |
| `hostedZoneName` | string | DNS only | Route53 zone name (defaults to `domainName`) |
| `validationEmails` | string[] | Email only | Email addresses used for validation |

### Monitoring Configuration

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `enabled` | boolean | No | Toggle monitoring (default: true) |
| `expiration` | object | No | Expiration alarm overrides (`thresholdDays`, `periodHours`, etc.) |
| `status` | object | No | Status alarm overrides (`threshold`, `periodMinutes`, etc.) |

## Capabilities Provided

This component provides the following capabilities for binding with other components:

- `certificate:acm` – ACM certificate metadata (ARN, domain, validation method, key algorithm).
- `observability:certificate` – Certificate observability metadata (logging groups, monitoring posture, transparency logging flag) consumed by the platform OTEL service.

## MCP Integration

This component is fully integrated with the Model Context Protocol (MCP) for enhanced platform integration:

### MCP Resource URI
```
shinobi://components/certificate-manager
```

### MCP Capabilities
- **Compliance Frameworks**: Commercial, FedRAMP Moderate, FedRAMP High
- **Observability**: CloudWatch alarms, logs, certificate monitoring, transparency logging
- **Security**: Transparency logging, DNS/email validation, key rotation, monitoring

### MCP Usage Example
```yaml
# Binding to other components via MCP
components:
  - name: my-api
    type: api-gateway-rest
    binds:
      - to: my-certificate
        capability: certificate:acm
        access: [use]
  - name: my-monitor
    type: cloudwatch-dashboard
    binds:
      - to: my-certificate
        capability: certificate:monitoring
        access: [monitor]
```

## Construct Handles

The following construct handles are available for use in `patches.ts`:

- `main` - Main certificate-manager construct

## Compliance Frameworks

### Commercial

- Standard monitoring configuration
- Basic resource tagging
- Standard security settings

### FedRAMP Moderate/High

- Enhanced monitoring with detailed metrics
- Comprehensive audit logging
- Stricter security configurations
- Extended compliance tagging

## Best Practices

1. **Always enable monitoring** in production environments
2. **Use descriptive names** for better resource identification
3. **Configure appropriate tags** for cost allocation and governance
4. **Review compliance requirements** for your environment
5. **Test configurations** in development before production deployment

## Development

### Running Tests

```bash
# Run all tests for this component
npm test -- --testPathPattern=certificate-manager

# Run only builder tests
npm test -- --testPathPattern=certificate-manager.builder

# Run only synthesis tests
npm test -- --testPathPattern=certificate-manager.component.synthesis
```

---

*Generated by Component Completion Script*
