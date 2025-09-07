# EFS Filesystem Component

Enterprise-grade Amazon Elastic File System (EFS) for scalable, fully managed NFS file storage with comprehensive security and compliance features.

## Overview

This component provides a fully managed EFS filesystem with:

- **Scalable Storage**: Automatically scales to petabytes without provisioning
- **High Availability**: Multi-AZ durability and availability
- **Security Integration**: VPC networking, encryption, and access controls
- **Compliance Hardening**: Three-tier compliance support (Commercial/FedRAMP Moderate/FedRAMP High)
- **Performance Options**: General Purpose and Max I/O performance modes

## Capabilities

- **filesystem:efs**: Provides shared filesystem connectivity for compute resources

## Configuration

```yaml
components:
  - name: shared-storage
    type: efs-filesystem
    config:
      fileSystemName: SharedApplicationStorage
      
      performanceMode: generalPurpose
      throughputMode: provisioned
      provisionedThroughputInMibps: 500
      
      encrypted: true
      kmsKeyId: arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012
      
      vpc:
        vpcId: vpc-12345678
        subnetIds:
          - subnet-12345678
          - subnet-87654321
          - subnet-13579024
        securityGroupIds:
          - sg-efs-access
      
      accessPoints:
        - name: app-data
          path: /app-data
          posixUser:
            uid: 1000
            gid: 1000
          creationInfo:
            ownerUid: 1000
            ownerGid: 1000
            permissions: 755
        
        - name: shared-logs
          path: /logs
          posixUser:
            uid: 1001
            gid: 1001
          creationInfo:
            ownerUid: 1001
            ownerGid: 1001
            permissions: 750
      
      lifecyclePolicy:
        transitionToIA: AFTER_30_DAYS
        transitionToPrimaryStorageClass: AFTER_1_ACCESS
      
      backupPolicy:
        status: ENABLED
      
      tags:
        storage-type: shared-filesystem
        backup-required: "true"
```

## Binding Examples

### ECS Service to EFS

```yaml
components:
  - name: web-service
    type: ecs-fargate-service
    config:
      taskDefinition:
        containerDefinitions:
          - name: web-app
            mountPoints:
              - sourceVolume: shared-storage
                containerPath: /app/shared
                readOnly: false
        volumes:
          - name: shared-storage
            efsVolumeConfiguration:
              fileSystemId: ${shared-storage.fileSystemId}
              accessPoint: app-data
    binds:
      - to: shared-storage
        capability: filesystem:efs
        access: read-write
```

### Lambda Function to EFS

```yaml
components:
  - name: file-processor
    type: lambda-worker
    config:
      handler: src/process.handler
      vpcConfig:
        subnetIds:
          - subnet-12345678
          - subnet-87654321
        securityGroupIds:
          - sg-lambda-efs
      fileSystemConfigs:
        - arn: ${shared-storage.accessPointArn}
          localMountPath: /mnt/shared
    binds:
      - to: shared-storage
        capability: filesystem:efs
        access: read-write
```

## Compliance Features

### Commercial
- Basic encryption with AWS managed keys
- Standard performance configuration
- Cost-optimized settings

### FedRAMP Moderate
- Customer-managed KMS encryption
- Enhanced monitoring and logging
- Backup policies enabled
- 1-year audit log retention
- Provisioned throughput for performance

### FedRAMP High
- Strict encryption requirements
- High-performance provisioned throughput
- Comprehensive audit logging
- 10-year log retention
- Enhanced security monitoring
- Mandatory backup with extended retention

## Advanced Configuration

### High-Performance Configuration

```yaml
config:
  performanceMode: maxIO
  throughputMode: provisioned
  provisionedThroughputInMibps: 2000
  # For high concurrent access patterns
```

### Multi-Access Point Setup

```yaml
config:
  accessPoints:
    - name: web-content
      path: /web
      posixUser:
        uid: 33  # www-data user
        gid: 33
    - name: database-backup
      path: /backups
      posixUser:
        uid: 999  # mysql user
        gid: 999
    - name: logs
      path: /logs
      posixUser:
        uid: 1000
        gid: 1000
```

### Custom Lifecycle Policies

```yaml
config:
  lifecyclePolicy:
    transitionToIA: AFTER_7_DAYS
    transitionToPrimaryStorageClass: AFTER_1_ACCESS
  # Optimize costs by moving infrequently accessed files
```

## Monitoring and Observability

The component automatically configures:

- **CloudWatch Metrics**: Filesystem size, throughput, IOPS, connections
- **CloudWatch Logs**: Access logging and security events
- **Performance Insights**: Throughput and latency monitoring
- **CloudWatch Alarms**: Storage growth and performance alerts
- **Cost Monitoring**: Storage class utilization tracking

### Monitoring Levels

- **Basic**: Storage size and basic access metrics
- **Enhanced**: Throughput monitoring + performance insights
- **Comprehensive**: Enhanced + security logging + detailed analytics

## Security Features

### Encryption
- Encryption at rest with KMS
- Encryption in transit (TLS)
- Customer-managed keys support
- Key rotation automation

### Access Control
- VPC-based network isolation
- Security group restrictions
- Access point permissions
- POSIX-compliant access controls

### Network Security
- Mount targets in private subnets
- Security group-based access control
- VPC endpoint support
- Network ACL integration

## Performance Optimization

### Performance Modes

#### General Purpose
- Up to 7,000 file operations per second
- Lowest latency per operation
- Best for latency-sensitive workloads

#### Max I/O
- Higher aggregate throughput and IOPS
- Scale to higher performance levels
- Best for applications that can tolerate higher latencies

### Throughput Modes

#### Bursting
- Baseline performance with ability to burst
- Suitable for variable workloads
- Cost-effective for most use cases

#### Provisioned
- Consistent throughput regardless of size
- Predictable performance
- Higher cost but guaranteed performance

## Access Patterns and Use Cases

### Shared Application Data

```bash
# Mount EFS in containers or EC2 instances
mount -t efs -o tls fs-12345678.efs.us-east-1.amazonaws.com:/ /mnt/shared

# Use for shared application state
echo "shared config" > /mnt/shared/app-config.json
```

### Content Management

```yaml
config:
  accessPoints:
    - name: media-content
      path: /media
      creationInfo:
        permissions: 755
    - name: user-uploads
      path: /uploads
      creationInfo:
        permissions: 750
```

### Backup and Archive

```yaml
config:
  lifecyclePolicy:
    transitionToIA: AFTER_30_DAYS
  backupPolicy:
    status: ENABLED
  # Automated backups with lifecycle management
```

## Mount Options and Configuration

### Linux Mount Options

```bash
# High-performance mount
mount -t efs -o tls,_netdev,iam fs-12345678.efs.us-east-1.amazonaws.com:/ /mnt/efs

# With access point
mount -t efs -o tls,_netdev,accesspoint=fsap-12345678 fs-12345678.efs.us-east-1.amazonaws.com:/ /mnt/app
```

### Container Mount Configuration

```yaml
# Docker Compose example
volumes:
  - type: efs
    source: fs-12345678.efs.us-east-1.amazonaws.com:/app-data
    target: /app/shared
    efs-options:
      - tls
      - accesspoint=fsap-12345678
```

## Backup and Recovery

### Automatic Backups

```yaml
config:
  backupPolicy:
    status: ENABLED
  # Creates point-in-time backups automatically
```

### Manual Backup Strategy

```bash
# Create manual backup using AWS Backup
aws backup start-backup-job \
  --backup-vault-name MyBackupVault \
  --resource-arn arn:aws:elasticfilesystem:us-east-1:123456789012:file-system/fs-12345678 \
  --lifecycle DeleteAfterDays=30
```

## Troubleshooting

### Common Issues

1. **Mount Timeouts**
   - Check VPC and subnet configuration
   - Verify security group rules allow NFS traffic (port 2049)
   - Ensure mount targets are in correct availability zones

2. **Permission Denied Errors**
   - Verify POSIX user and group settings in access points
   - Check file system permissions
   - Ensure IAM permissions for EFS access

3. **Performance Issues**
   - Monitor CloudWatch metrics for throughput limits
   - Consider switching to provisioned throughput mode
   - Check for network bandwidth limitations

### Debug Mode

Enable detailed monitoring:

```yaml
config:
  tags:
    debug: "true"
    detailed-monitoring: "enabled"
```

## Examples

See the [`examples/`](../../examples/) directory for complete service templates:

- `examples/shared-storage/` - Multi-service shared storage
- `examples/content-management/` - Media and content storage
- `examples/backup-solution/` - Automated backup system

## API Reference

### EfsFilesystemComponent

Main component class that extends `Component`.

#### Methods

- `synth()`: Creates AWS resources (EFS Filesystem, Mount Targets, Access Points)
- `getCapabilities()`: Returns filesystem:efs capability
- `getType()`: Returns 'efs-filesystem'

### Configuration Interfaces

- `EfsFilesystemConfig`: Main configuration interface
- `EFS_FILESYSTEM_CONFIG_SCHEMA`: JSON schema for validation

## Development

To contribute to this component:

1. Make changes to the source code
2. Run tests: `npm test`
3. Build: `npm run build`
4. Follow the [Contributing Guide](../../../CONTRIBUTING.md)

## License

MIT License - see LICENSE file for details.