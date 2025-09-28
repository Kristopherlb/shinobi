# SecretsManagerComponent Component

Secrets Manager Component with comprehensive security, monitoring, and compliance features.

## Overview

The SecretsManagerComponent component provides:

- **Production-ready** secrets manager provisioning
- **Compliance-aware defaults** sourced from manifest/config profiles
- **Integrated monitoring** via configurable CloudWatch alarms
- **Security-first** access policies and encryption controls
- **Platform integration** with other components

### Category: security

### AWS Service: SECRETSMANAGER

This component manages SECRETSMANAGER resources and provides a simplified, secure interface for common use cases.

## Usage Example

### Basic Configuration

```yaml
service: my-service
owner: platform-team
complianceFramework: commercial

components:
  - name: credentials-store
    type: secrets-manager
    config:
      description: "Primary secret for the checkout service"
      generateSecret:
        enabled: true
        passwordLength: 48
      automaticRotation:
        enabled: true
        schedule:
          automaticallyAfterDays: 60
      encryption:
        createCustomerManagedKey: true
        enableKeyRotation: true
      monitoring:
        enabled: true
        unusualAccessThresholdMs: 4000
      accessPolicies:
        denyInsecureTransport: true
        restrictToVpce: true
        allowedVpceIds:
          - vpce-0abc123def456
```

## Configuration Reference

### Root Configuration

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `secretName` | string | No | Secret name (defaults to `<service>/<component>` when omitted) |
| `description` | string | No | Human-readable description |
| `secretValue.secretStringValue` | string | No | Initial plaintext secret value |
| `generateSecret` | object | No | Automatic secret generation settings |
| `automaticRotation` | object | No | Rotation schedule and Lambda configuration |
| `encryption` | object | No | Encryption strategy (customer managed vs AWS managed) |
| `replicas` | array | No | Multi-region replica configuration |
| `recovery` | object | No | Deletion protection and recovery window controls |
| `monitoring` | object | No | Monitoring and alarm thresholds |
| `accessPolicies` | object | No | Secret access policy toggles |

### Secret Generation

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `generateSecret.enabled` | boolean | `false` | Enable automatic secret generation |
| `generateSecret.passwordLength` | number | `32` | Length of generated password |
| `generateSecret.excludeCharacters` | string | `"@/\'` | Characters to exclude |

### Automatic Rotation

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `automaticRotation.enabled` | boolean | Varies by compliance | Enable automatic rotation |
| `automaticRotation.schedule.automaticallyAfterDays` | number | `365` | Rotation interval (days) |
| `automaticRotation.rotationLambda.createFunction` | boolean | Varies by compliance | Provision managed rotation Lambda |
| `automaticRotation.rotationLambda.enableTracing` | boolean | Varies by compliance | Enable AWS X-Ray tracing |

### Encryption

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `encryption.kmsKeyArn` | string | — | Existing KMS key ARN |
| `encryption.createCustomerManagedKey` | boolean | Varies by compliance | Create customer managed key |
| `encryption.enableKeyRotation` | boolean | Varies by compliance | Enable CMK rotation |

### Recovery Settings

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `recovery.deletionProtection` | boolean | Varies by compliance | Enable deletion protection |
| `recovery.recoveryWindowInDays` | number | `30` | Recovery window when deletion protection disabled |

### Monitoring & Alarms

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `monitoring.enabled` | boolean | Varies by compliance | Enable monitoring alarms |
| `monitoring.rotationFailureThreshold` | number | `1` | Threshold for rotation failure alarms |
| `monitoring.unusualAccessThresholdMs` | number | `5000` | Latency threshold for unusual access alarm |

### Access Policies

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `accessPolicies.denyInsecureTransport` | boolean | `true` | Deny non-TLS access |
| `accessPolicies.restrictToVpce` | boolean | Varies by compliance | Restrict access to VPCEs |
| `accessPolicies.allowedVpceIds` | array | `[]` | Allowed VPC endpoints when restriction enabled |
| `accessPolicies.requireTemporaryCredentials` | boolean | Varies by compliance | Require STS/temporary credentials |

### Monitoring Configuration

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `enabled` | boolean | No | Enable monitoring (default: true) |

## Capabilities Provided

This component provides the following capabilities for binding with other components:

- `security:secrets-manager` - Main secrets-manager capability
- `monitoring:secrets-manager` - Monitoring capability

## Construct Handles

The following construct handles are available for use in `patches.ts`:

- `main` - Main secrets-manager construct

## Compliance Frameworks

### Commercial

- Standard monitoring configuration
- Basic resource tagging
- Standard security settings

### FedRAMP Moderate

- Automatic rotation enabled with 90-day cadence
- Customer-managed KMS key and deletion protection
- Monitoring and VPCE access restrictions enabled by default

### FedRAMP High

- Automatic rotation enabled with 30-day cadence and tracing
- Customer-managed KMS key with rotation, seven-day recovery window
- VPCE restrictions and temporary-credential enforcement enabled

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
npm test -- --testPathPattern=secrets-manager

# Run only builder tests
npm test -- --testPathPattern=secrets-manager.builder

# Run only synthesis tests
npm test -- --testPathPattern=secrets-manager.component.synthesis
```

---

*Generated by Component Completion Script*
