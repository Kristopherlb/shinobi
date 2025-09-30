# S3 Bucket Component

CDK construct for deploying AWS S3 buckets with comprehensive security, monitoring, compliance, and lifecycle management features. Provides production-ready object storage infrastructure with advanced capabilities.

## Key Features

- **ConfigBuilder Integration** – Five-layer configuration precedence managed by the shared `ConfigBuilder` with framework defaults
- **Enhanced Lifecycle Management** – Flexible lifecycle rules with prefix/tag filtering and all storage class transitions
- **Security & Compliance** – KMS encryption, audit logging, Object Lock, and comprehensive security controls
- **Advanced Monitoring** – CloudWatch alarms, custom metrics, and performance dashboards
- **Virus Scanning** – ClamAV integration for secure file uploads with quarantine capabilities
- **Compliance Frameworks** – Built-in support for Commercial, FedRAMP Moderate, and FedRAMP High
- **CDK Nag Integration** – Automated security validation with comprehensive suppressions
- **Input Validation** – Comprehensive configuration validation with detailed error reporting

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
      versioning: true
      encryption:
        type: AES256
      monitoring:
        enabled: true
        clientErrorThreshold: 10
        serverErrorThreshold: 1
      security:
        blockPublicAccess: true
        requireSecureTransport: true
```

### Advanced Configuration

```yaml
components:
  - name: advanced-s3-bucket
    type: s3-bucket
    config:
      bucketName: my-advanced-bucket
      public: false
      versioning: true
      encryption:
        type: KMS
        kmsKeyArn: arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012
      security:
        blockPublicAccess: true
        requireSecureTransport: true
        requireMfaDelete: true
        denyDeleteActions: false
        tools:
          clamavScan: true
      compliance:
        auditLogging: true
        auditBucketRetentionDays: 1095
        objectLock:
          enabled: true
          mode: COMPLIANCE
          retentionDays: 365
      lifecycleRules:
        - id: "cost-optimization"
          enabled: true
          transitions:
            - storageClass: "STANDARD_IA"
              transitionAfter: 30
            - storageClass: "GLACIER_IR"
              transitionAfter: 90
            - storageClass: "DEEP_ARCHIVE"
              transitionAfter: 365
          expiration:
            days: 2555
          abortIncompleteMultipartUpload:
            daysAfterInitiation: 7
        - id: "logs-optimization"
          enabled: true
          prefix: "logs/"
          tags:
            environment: "production"
          transitions:
            - storageClass: "GLACIER_IR"
              transitionAfter: 7
          expiration:
            days: 1095
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

### Lifecycle Rules

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `lifecycleRules[].id` | string | Yes | Unique identifier for the lifecycle rule |
| `lifecycleRules[].enabled` | boolean | Yes | Enable or disable the rule |
| `lifecycleRules[].prefix` | string | No | Object key prefix filter for this rule |
| `lifecycleRules[].tags` | object | No | Tag filters for this rule |
| `lifecycleRules[].transitions[].storageClass` | string | No | Target storage class (`STANDARD_IA`, `ONEZONE_IA`, `GLACIER`, `DEEP_ARCHIVE`, `GLACIER_IR`) |
| `lifecycleRules[].transitions[].transitionAfter` | number | No | Days after object creation to transition |
| `lifecycleRules[].expiration.days` | number | No | Days after which objects expire |
| `lifecycleRules[].abortIncompleteMultipartUpload.daysAfterInitiation` | number | No | Days to abort incomplete multipart uploads |

### Encryption

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `encryption.type` | enum(`AES256`,`KMS`) | No | Server-side encryption mode (platform compliance profiles may enforce `KMS`) |
| `encryption.kmsKeyArn` | string | No | Existing CMK to use when `type` = `KMS` |

### Security

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `security.blockPublicAccess` | boolean | No | Apply AWS Block Public Access configuration (default: `true`) |
| `security.requireSecureTransport` | boolean | No | Deny requests made without HTTPS (default: `true`) |
| `security.requireMfaDelete` | boolean | No | Require MFA for delete operations via bucket policy (default: `false`) |
| `security.denyDeleteActions` | boolean | No | Deny delete-style actions to enforce immutability (default: `false`) |
| `security.tools.clamavScan` | boolean | No | Enable ClamAV virus scanning Lambda integration (default: `false`) |

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

- `bucket:s3` – Primary S3 bucket handle (bucket name, ARN, and encryption type)

## Construct Handles

- The following construct handles are registered for use in `patches.ts`:
  - `main` – Alias of the primary bucket construct (legacy compatibility)
  - `bucket` – Primary bucket construct
  - `kmsKey` – Generated KMS key when the component creates one
  - `auditBucket` – Dedicated audit logging bucket when enabled

## Compliance Frameworks

### Commercial
- **Encryption**: AES256 by default (KMS optional)
- **Versioning**: Enabled by default
- **Monitoring**: Optional (disabled by default)
- **Audit Logging**: Optional
- **Security**: Block public access enabled, HTTPS enforcement
- **Object Lock**: Optional

### FedRAMP Moderate
- **Encryption**: KMS encryption required
- **Audit Logging**: Mandatory with 1095-day retention
- **MFA Delete**: Required
- **Monitoring**: Enhanced monitoring enabled
- **Security**: All security controls enabled
- **Object Lock**: Available for compliance

### FedRAMP High
- **Encryption**: KMS encryption required
- **Audit Logging**: Mandatory with 2555-day retention
- **MFA Delete**: Required
- **Monitoring**: Enhanced monitoring with real-time alerts
- **Security**: All security controls enabled
- **Object Lock**: Recommended for sensitive data

## Best Practices

1. **Enable monitoring** in production environments for operational visibility
2. **Configure lifecycle rules** for cost optimization (especially with GIR)
3. **Use descriptive bucket names** for better resource identification
4. **Enable audit logging** for compliance and security auditing
5. **Configure appropriate encryption** based on data sensitivity
6. **Use prefix and tag filters** in lifecycle rules for targeted optimization
7. **Enable ClamAV scanning** for user-uploaded content
8. **Review compliance requirements** and configure accordingly
9. **Test configurations** in development before production deployment
10. **Monitor CloudWatch metrics** for performance and cost optimization

## Migration Guide

When upgrading from previous versions:

1. **Update component type** to `s3-bucket`
2. **Review configuration schema** changes
3. **Update test assertions** if using custom tests
4. **Verify compliance settings** for your environment

## Troubleshooting

### Common Issues

1. **Configuration validation errors** - Check the JSON schema requirements and validation messages
2. **Missing capabilities** - Verify component synthesis completed successfully
3. **Tag propagation issues** - Ensure BaseComponent is properly extended
4. **Lifecycle rule conflicts** - Ensure rule IDs are unique and transitions are logical
5. **Encryption key issues** - Verify KMS key ARN format and permissions
6. **Object Lock validation** - Ensure versioning is enabled when Object Lock is used
7. **ClamAV integration errors** - Check Lambda function permissions and layer configuration

### Debugging

1. **Enable verbose logging** in the platform CLI
2. **Check component event logs** for validation and configuration details
3. **Review CloudWatch metrics** for component health and performance
4. **Check CDK Nag suppressions** for security validation results
5. **Review CloudFormation events** for deployment issues
6. **Use patches.ts** for advanced customization if needed
7. **Validate configuration** using the built-in validation framework

## Performance Considerations

1. **Monitor resource utilization** through CloudWatch metrics and custom dashboards
2. **Configure lifecycle rules** for optimal storage class transitions
3. **Use prefix and tag filters** for targeted lifecycle management
4. **Enable ClamAV scanning** judiciously (scan-on-upload has performance impact)
5. **Review cost implications** of detailed monitoring and audit logging
6. **Optimize configurations** based on usage patterns and access frequency
7. **Consider GIR transitions** for cost-effective archival with instant retrieval

## Security Considerations

1. **Follow principle of least privilege** for IAM permissions
2. **Enable encryption** for data at rest and in transit
3. **Use secure defaults** provided by compliance frameworks
4. **Regular security reviews** of component configurations
5. **Monitor access patterns** through CloudTrail and CloudWatch
