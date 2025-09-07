# S3 Bucket Component

Enterprise-grade Amazon S3 bucket for secure object storage with advanced features including encryption, lifecycle management, versioning, and compliance controls.

## Overview

This component provides a fully managed S3 bucket with:

- **Security-First Design**: Encryption, access controls, and public access blocking
- **Lifecycle Management**: Automated data archival and deletion policies  
- **Compliance Features**: Three-tier compliance support (Commercial/FedRAMP Moderate/FedRAMP High)
- **Cost Optimization**: Intelligent tiering and storage class transitions
- **Advanced Features**: Versioning, replication, and event notifications

## Capabilities

- **storage:s3**: Provides secure object storage for applications and data lakes

## Configuration

```yaml
components:
  - name: app-data-bucket
    type: s3-bucket
    config:
      bucketName: company-app-data-prod
      
      versioning:
        status: Enabled
      
      encryption:
        serverSideEncryptionConfiguration:
          - serverSideEncryptionByDefault:
              sseAlgorithm: aws:kms
              kmsMasterKeyID: arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012
            applyServerSideEncryptionByDefault: true
            bucketKeyEnabled: true
      
      publicAccessBlock:
        blockPublicAcls: true
        blockPublicPolicy: true
        ignorePublicAcls: true
        restrictPublicBuckets: true
      
      lifecycleConfiguration:
        rules:
          - id: TransitionToIA
            status: Enabled
            transitions:
              - days: 30
                storageClass: STANDARD_IA
              - days: 90
                storageClass: GLACIER
              - days: 365
                storageClass: DEEP_ARCHIVE
          
          - id: DeleteIncompleteUploads
            status: Enabled
            abortIncompleteMultipartUpload:
              daysAfterInitiation: 7
          
          - id: CleanupOldVersions
            status: Enabled
            noncurrentVersionTransitions:
              - noncurrentDays: 30
                storageClass: STANDARD_IA
            noncurrentVersionExpiration:
              noncurrentDays: 90
      
      notification:
        cloudWatchConfiguration:
          configurations:
            - event: s3:ObjectCreated:*
              cloudWatchConfiguration:
                logGroupName: /aws/s3/company-app-data-prod
        
        lambdaConfigurations:
          - event: s3:ObjectCreated:Put
            lambdaFunctionArn: arn:aws:lambda:us-east-1:123456789012:function:process-upload
            filter:
              key:
                filterRules:
                  - name: prefix
                    value: uploads/
                  - name: suffix
                    value: .json
      
      corsConfiguration:
        corsRules:
          - allowedHeaders: ["*"]
            allowedMethods: ["GET", "PUT", "POST", "DELETE", "HEAD"]
            allowedOrigins: ["https://app.company.com"]
            exposedHeaders: ["ETag"]
            maxAge: 3000
      
      replicationConfiguration:
        role: arn:aws:iam::123456789012:role/S3ReplicationRole
        rules:
          - id: ReplicateToBackupRegion
            status: Enabled
            prefix: critical/
            destination:
              bucket: arn:aws:s3:::company-app-data-backup
              storageClass: STANDARD_IA
              encryptionConfiguration:
                replicaKmsKeyID: arn:aws:kms:us-west-2:123456789012:key/backup-key-id
      
      tags:
        data-classification: sensitive
        backup-required: "true"
        compliance: fedramp-moderate
```

## Binding Examples

### Lambda Function to S3 Bucket

```yaml
components:
  - name: file-processor
    type: lambda-worker
    config:
      handler: src/processor.handler
      environment:
        BUCKET_NAME: ${app-data-bucket.bucketName}
    binds:
      - to: app-data-bucket
        capability: storage:s3
        access: read-write
```

### Static Website Hosting

```yaml
components:
  - name: company-website
    type: static-website
    config:
      websiteName: company-marketing
    binds:
      - to: app-data-bucket
        capability: storage:s3
        access: read-write
```

## Compliance Features

### Commercial
- Basic encryption with AWS managed keys
- Standard lifecycle policies
- Cost-optimized configurations

### FedRAMP Moderate
- Customer-managed KMS encryption with rotation
- Enhanced access logging and monitoring
- Cross-region replication enabled
- Versioning mandatory
- 1-year object retention

### FedRAMP High
- Strict KMS key management with mandatory rotation
- Comprehensive audit logging with detailed access patterns
- Multi-region replication with encrypted copies
- Enhanced lifecycle policies with extended retention
- 10-year compliance log retention
- Advanced threat detection integration

## Advanced Configuration

### Data Lake Configuration

```yaml
config:
  bucketName: company-data-lake
  intelligentTieringConfiguration:
    - id: DataLakeOptimization
      status: Enabled
      prefix: raw-data/
      optionalFields:
        - BucketKeyEnabled
      
  inventoryConfiguration:
    - id: DataLakeInventory
      isEnabled: true
      destination:
        bucketArn: arn:aws:s3:::company-inventory-reports
        prefix: data-lake/
        format: CSV
      schedule:
        frequency: Daily
      includedObjectVersions: Current
      optionalFields:
        - Size
        - LastModifiedDate
        - StorageClass
        - ETag
```

### Multi-Environment Lifecycle Policies

```yaml
config:
  lifecycleConfiguration:
    rules:
      # Production data retention
      - id: ProductionDataRetention
        status: Enabled
        filter:
          prefix: prod/
        transitions:
          - days: 90
            storageClass: STANDARD_IA
          - days: 365
            storageClass: GLACIER
          - days: 2555  # 7 years
            storageClass: DEEP_ARCHIVE
      
      # Development data cleanup
      - id: DevDataCleanup
        status: Enabled
        filter:
          prefix: dev/
        expiration:
          days: 30
      
      # Log data management
      - id: LogDataManagement
        status: Enabled
        filter:
          prefix: logs/
        transitions:
          - days: 7
            storageClass: STANDARD_IA
          - days: 30
            storageClass: GLACIER
        expiration:
          days: 365
```

### Event-Driven Processing

```yaml
config:
  notification:
    lambdaConfigurations:
      # Image processing
      - event: s3:ObjectCreated:Put
        lambdaFunctionArn: arn:aws:lambda:us-east-1:123456789012:function:image-processor
        filter:
          key:
            filterRules:
              - name: prefix
                value: images/
              - name: suffix
                value: .jpg
      
      # Document indexing
      - event: s3:ObjectCreated:*
        lambdaFunctionArn: arn:aws:lambda:us-east-1:123456789012:function:document-indexer
        filter:
          key:
            filterRules:
              - name: prefix
                value: documents/
    
    sqsConfigurations:
      # Batch processing queue
      - event: s3:ObjectCreated:*
        queueArn: arn:aws:sqs:us-east-1:123456789012:batch-processing-queue
        filter:
          key:
            filterRules:
              - name: prefix
                value: batch/
```

## Monitoring and Observability

The component automatically configures:

- **CloudWatch Metrics**: Bucket size, request metrics, data retrieval
- **CloudWatch Logs**: Access logs and API call logging
- **AWS CloudTrail**: Administrative actions and API calls
- **S3 Access Logging**: Detailed request logging to separate bucket
- **Cost and Usage Reports**: Storage cost analysis and optimization

### Monitoring Levels

- **Basic**: Storage metrics and basic request monitoring
- **Enhanced**: Detailed request metrics + access logging
- **Comprehensive**: Enhanced + cost analysis + security monitoring

## Security Features

### Encryption and Key Management
- Server-side encryption with customer-managed KMS keys
- Bucket key optimization for cost reduction
- Automatic key rotation support
- Cross-region replication with re-encryption

### Access Control
- IAM policies for fine-grained access control
- Bucket policies for resource-based permissions
- Access Control Lists (ACLs) for legacy compatibility
- Pre-signed URL support for temporary access

### Security Monitoring
- AWS Macie integration for sensitive data discovery
- AWS GuardDuty integration for threat detection
- VPC endpoint support for private access
- AWS PrivateLink integration

## Data Management Patterns

### Backup and Archive Strategy

```yaml
config:
  lifecycleConfiguration:
    rules:
      - id: BackupRetention
        status: Enabled
        filter:
          prefix: backups/
        transitions:
          - days: 0
            storageClass: STANDARD_IA
          - days: 30
            storageClass: GLACIER
          - days: 90
            storageClass: DEEP_ARCHIVE
        expiration:
          days: 2555  # 7 years retention
```

### Data Lake Partitioning

```bash
# Recommended S3 data lake structure
s3://company-data-lake/
├── raw-data/
│   ├── year=2024/
│   │   ├── month=01/
│   │   │   ├── day=15/
│   │   │   │   └── data-file.parquet
├── processed-data/
│   ├── analytics/
│   └── ml-features/
└── archive/
    └── historical-data/
```

### Multi-Part Upload Configuration

```yaml
config:
  multipartUpload:
    threshold: 64MB  # Files larger than 64MB use multipart
    chunksize: 16MB  # Each part will be 16MB
    maxConcurrency: 10  # Maximum concurrent uploads
  
  transferAcceleration:
    enabled: true  # Enable S3 Transfer Acceleration
```

## Cost Optimization

### Intelligent Tiering

```yaml
config:
  intelligentTieringConfiguration:
    - id: CostOptimization
      status: Enabled
      optionalFields:
        - BucketKeyEnabled
      filter:
        prefix: data/
      # Automatically moves objects between access tiers
```

### Storage Class Analysis

```yaml
config:
  analyticsConfiguration:
    - id: StorageClassAnalysis
      prefix: analytics-data/
      storageClassAnalysis:
        dataExport:
          outputSchemaVersion: V_1
          destination:
            bucketArn: arn:aws:s3:::company-analytics-reports
            prefix: storage-analysis/
            format: CSV
```

## Cross-Region Replication

### Disaster Recovery Setup

```yaml
config:
  replicationConfiguration:
    role: arn:aws:iam::123456789012:role/S3ReplicationServiceRole
    rules:
      - id: DisasterRecoveryReplication
        status: Enabled
        priority: 1
        filter:
          prefix: critical/
        deleteMarkerReplication:
          status: Enabled
        destination:
          bucket: arn:aws:s3:::company-dr-backup
          region: us-west-2
          storageClass: STANDARD_IA
          accessControlTranslation:
            owner: Destination
          account: 123456789012
          encryptionConfiguration:
            replicaKmsKeyID: arn:aws:kms:us-west-2:123456789012:key/dr-key-id
```

## Troubleshooting

### Common Issues

1. **Access Denied Errors**
   - Check IAM policies and bucket policies
   - Verify public access block settings
   - Ensure KMS key permissions for encryption

2. **Lifecycle Policy Issues**
   - Verify policy syntax and filter configuration
   - Check minimum storage duration requirements
   - Review transition timing and storage classes

3. **Replication Failures**
   - Verify IAM role permissions for replication
   - Check destination bucket policies
   - Ensure KMS key permissions in target region

### Debug Mode

Enable detailed monitoring and logging:

```yaml
config:
  requestMetricsConfiguration:
    - id: DetailedMetrics
      filter:
        prefix: debug/
  tags:
    debug: "true"
    detailed-monitoring: "enabled"
```

## Examples

See the [`examples/`](../../examples/) directory for complete service templates:

- `examples/data-lake/` - Enterprise data lake with S3
- `examples/static-website/` - Static website hosting
- `examples/backup-solution/` - Automated backup system

## API Reference

### S3BucketComponent

Main component class that extends `Component`.

#### Methods

- `synth()`: Creates AWS resources (S3 Bucket, policies, lifecycle rules)
- `getCapabilities()`: Returns storage:s3 capability
- `getType()`: Returns 's3-bucket'

### Configuration Interfaces

- `S3BucketConfig`: Main configuration interface
- `S3_BUCKET_CONFIG_SCHEMA`: JSON schema for validation

## Development

To contribute to this component:

1. Make changes to the source code
2. Run tests: `npm test`
3. Build: `npm run build`
4. Follow the [Contributing Guide](../../../CONTRIBUTING.md)

## License

MIT License - see LICENSE file for details.