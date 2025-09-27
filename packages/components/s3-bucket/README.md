# S3BucketComponent Component

S3 Bucket Component with comprehensive security, monitoring, and compliance features.

## Overview

The S3BucketComponent component provides:

- **Production-ready** Amazon S3 bucket provisioning
- **FedRAMP-aware defaults** with encryption, versioning, and audit logging safeguards
- **Integrated monitoring** (client/server error alarms)
- **Security-first** configuration (block public access, HTTPS enforcement)
- **Platform integration** with other components

## Usage Example

### Basic Configuration

```yaml
service: my-service
owner: platform-team
complianceFramework: commercial

components:
  - name: my-s3-bucket
    type: s3-bucket
    config:
      monitoring:
        enabled: true
        clientErrorThreshold: 25
        serverErrorThreshold: 3
```

### Advanced Configuration

```yaml
components:
  - name: advanced-s3-bucket
    type: s3-bucket
    config:
      public: false
      versioning: true
      encryption:
        type: KMS
      compliance:
        auditLogging: true
        auditBucketRetentionDays: 1095
      website:
        enabled: true
        indexDocument: index.html
        errorDocument: error.html
      monitoring:
        enabled: true
        clientErrorThreshold: 5
        serverErrorThreshold: 1
```

## Configuration Reference

### Core Settings

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `public` | boolean | No | Allow public read access (default: `false`) |
| `versioning` | boolean | No | Enable S3 bucket versioning (default: `true`) |
| `eventBridgeEnabled` | boolean | No | Emit bucket events to EventBridge (default: `false`) |
| `bucketName` | string | No | Explicit bucket name (must be globally unique) |

### Website Hosting

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `website.enabled` | boolean | No | Enable static website hosting (default: `false`) |
| `website.indexDocument` | string | No | Index document when website enabled (default: `index.html`) |
| `website.errorDocument` | string | No | Error document when website enabled (default: `error.html`) |

### Encryption

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `encryption.type` | enum(`AES256`,`KMS`) | No | Server-side encryption mode (FedRAMP requires `KMS`) |
| `encryption.kmsKeyArn` | string | No | Existing CMK to use when `type` = `KMS` |

### Compliance

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `compliance.auditLogging` | boolean | No | Enable server access logging to an audit bucket |
| `compliance.auditBucketName` | string | No | Override name for the audit bucket |
| `compliance.auditBucketRetentionDays` | number | No | Retention for audit bucket lifecycle rule |
| `compliance.auditBucketObjectLock` | object | No | Object lock configuration applied to the audit bucket |
| `compliance.objectLock` | object | No | Object lock configuration applied to the primary bucket |

### Monitoring

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `monitoring.enabled` | boolean | No | Enable CloudWatch alarms (default: `false`) |
| `monitoring.clientErrorThreshold` | number | No | Threshold for 4xx error alarm (default: `10`) |
| `monitoring.serverErrorThreshold` | number | No | Threshold for 5xx error alarm (default: `1`) |

## Capabilities Provided

This component provides the following capabilities for binding with other components:

- `storage:s3-bucket` - Main s3-bucket capability
- `monitoring:s3-bucket` - Monitoring capability

## Construct Handles

The following construct handles are available for use in `patches.ts`:

- `main` - Main s3-bucket construct

## Compliance Frameworks

### Commercial

- Versioning enabled, AES256 encryption
- Monitoring disabled by default (can be enabled per component)
- Audit logging optional

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

## Migration Guide

When upgrading from previous versions:

1. **Update component type** to `s3-bucket`
2. **Review configuration schema** changes
3. **Update test assertions** if using custom tests
4. **Verify compliance settings** for your environment

## Troubleshooting

### Common Issues

1. **Configuration validation errors** - Check the JSON schema requirements
2. **Missing capabilities** - Verify component synthesis completed successfully
3. **Tag propagation issues** - Ensure BaseComponent is properly extended

### Debugging

1. **Enable verbose logging** in the platform CLI
2. **Check CloudWatch metrics** for component health
3. **Review CloudFormation events** for deployment issues
4. **Use patches.ts** for advanced customization if needed

## Performance Considerations

1. **Monitor resource utilization** through CloudWatch metrics
2. **Configure appropriate scaling** if applicable
3. **Review cost implications** of detailed monitoring
4. **Optimize configurations** based on usage patterns

## Security Considerations

1. **Follow principle of least privilege** for IAM permissions
2. **Enable encryption** for data at rest and in transit
3. **Use secure defaults** provided by compliance frameworks
4. **Regular security reviews** of component configurations
5. **Monitor access patterns** through CloudTrail and CloudWatch
