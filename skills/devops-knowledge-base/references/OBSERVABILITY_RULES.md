# Observability Rules from AWS Config Conformance Packs

This document extracts observability-specific rules from AWS Config conformance packs to inform component configuration.

## CloudWatch Metrics

### Required Metrics by Service

#### S3
- `BucketSizeBytes` - Total size of objects in bucket
- `NumberOfObjects` - Total number of objects in bucket
- `AllRequests` - Total number of requests
- `GetRequests` - Number of GET requests
- `PutRequests` - Number of PUT requests
- `DeleteRequests` - Number of DELETE requests

#### EC2
- `CPUUtilization` - Average CPU utilization
- `NetworkIn` - Bytes received from network
- `NetworkOut` - Bytes sent to network
- `DiskReadOps` - Completed read operations
- `DiskWriteOps` - Completed write operations

#### ECS
- `CPUUtilization` - Average CPU utilization across tasks
- `MemoryUtilization` - Average memory utilization across tasks
- `RunningTaskCount` - Number of tasks in RUNNING state
- `DesiredTaskCount` - Number of tasks desired

#### Lambda
- `Invocations` - Number of function invocations
- `Errors` - Number of function errors
- `Duration` - Function execution duration
- `Throttles` - Number of throttled invocations
- `ConcurrentExecutions` - Number of concurrent executions

#### RDS
- `CPUUtilization` - Average CPU utilization
- `DatabaseConnections` - Number of database connections
- `FreeableMemory` - Available memory
- `FreeStorageSpace` - Available storage space
- `ReadLatency` - Average read latency
- `WriteLatency` - Average write latency

### Metric Collection Requirements

- **Basic Monitoring**: 5-minute intervals (default)
- **Detailed Monitoring**: 1-minute intervals (enable for production)
- **Custom Metrics**: Enable for application-specific metrics
- **Metric Filters**: Configure for log-based metrics

## CloudWatch Alarms

### Alarm Thresholds by Service

#### EC2
- **CPUUtilization > 80%**: High CPU usage
- **StatusCheckFailed**: Instance health check failure
- **NetworkPacketsIn < threshold**: Unusual network activity

#### ECS
- **CPUUtilization > 80%**: High CPU usage
- **MemoryUtilization > 80%**: High memory usage
- **RunningTaskCount < DesiredTaskCount**: Service not at desired capacity

#### Lambda
- **Errors > 0**: Function errors
- **Throttles > 0**: Function throttling
- **Duration > timeout threshold**: Function timeout risk

#### RDS
- **CPUUtilization > 80%**: High CPU usage
- **FreeStorageSpace < threshold**: Low storage space
- **DatabaseConnections > threshold**: High connection count

### Alarm Configuration Best Practices

- **Evaluation Periods**: 2-3 periods for production
- **Datapoints to Alarm**: 1-2 datapoints
- **Alarm Actions**: SNS topic for notifications
- **OK Actions**: Notification when alarm clears
- **Treat Missing Data**: `breaching` for critical alarms

## CloudWatch Logs

### Log Retention by Compliance Framework

- **Commercial**: 30 days (default)
- **FedRAMP Low**: 90 days
- **FedRAMP Moderate**: 1095 days (3 years)
- **FedRAMP High**: 2555 days (7 years)
- **HIPAA**: 6 years
- **PCI-DSS**: 1 year minimum

### Log Groups Configuration

- **Log Group Name**: `/aws/{service}/{component-name}`
- **Retention**: Based on compliance framework
- **Encryption**: KMS customer-managed key for high-risk environments
- **Metric Filters**: Configure for log-based metrics

### Required Logging by Service

#### S3
- **Server Access Logging**: Enable for all buckets
- **CloudTrail Data Events**: Enable for object-level operations
- **Object-Level Logging**: Enable for sensitive buckets

#### API Gateway
- **Access Logging**: Enable with detailed format
- **Execution Logging**: Enable for debugging
- **Log Level**: INFO for production, DEBUG for development

#### Lambda
- **Function Logs**: Automatic via CloudWatch Logs
- **Log Level**: Configure via environment variables
- **Structured Logging**: Use JSON format

#### ECS
- **Container Logs**: CloudWatch Logs driver
- **Task Logs**: Enable for all tasks
- **Log Driver Options**: Configure retention, encryption

## CloudTrail

### Required CloudTrail Configuration

- **Multi-Region**: Enable for all regions
- **Data Events**: Enable for S3, Lambda (sensitive operations)
- **Log File Validation**: Enable
- **Encryption**: KMS customer-managed key
- **Log Retention**: Based on compliance framework

### CloudTrail Events to Monitor

- **IAM Changes**: User, role, policy changes
- **Security Group Changes**: Ingress/egress rule changes
- **Network Changes**: VPC, subnet, route table changes
- **Resource Creation/Deletion**: Track resource lifecycle
- **API Calls**: Monitor all API activity

## VPC Flow Logs

### Flow Log Configuration

- **Destination**: CloudWatch Logs or S3
- **Traffic Type**: ALL (accepted and rejected)
- **Format**: Default or custom
- **Retention**: Based on compliance framework

### Flow Log Analysis

- **Metric Filters**: Configure for security analysis
- **Alarms**: Alert on unusual traffic patterns
- **Dashboards**: Visualize network traffic

## X-Ray Tracing

### Services Requiring X-Ray

- **Lambda**: Enable active tracing
- **API Gateway**: Enable X-Ray tracing
- **ECS**: Enable X-Ray daemon
- **EC2**: Install X-Ray daemon

### X-Ray Configuration

- **Sampling Rate**: 1% for production, 100% for development
- **Trace ID**: Include in logs for correlation
- **Annotations**: Add custom annotations
- **Metadata**: Include request context

## Container Insights

### ECS Container Insights

- **Enable**: CloudWatch Container Insights
- **Metrics**: CPU, memory, network, storage
- **Logs**: Container logs via CloudWatch Logs
- **Dashboards**: Auto-generated dashboards

### EKS Container Insights

- **Enable**: CloudWatch Container Insights for EKS
- **Prometheus**: Integrate Prometheus metrics
- **Logs**: Container logs via CloudWatch Logs
- **Metrics**: Pod, node, cluster metrics

## Dashboards

### Required Dashboards

- **Service Dashboard**: Per-service metrics and alarms
- **Compliance Dashboard**: Compliance status and violations
- **Cost Dashboard**: Cost by service, resource, tag
- **Security Dashboard**: Security events and violations

### Dashboard Best Practices

- **Widget Types**: Line charts, number widgets, logs widgets
- **Refresh Interval**: 1 minute for real-time, 5 minutes for standard
- **Time Range**: 1 hour, 3 hours, 1 day, 1 week
- **Alarms**: Include alarm widgets

## Integration with Platform Standards

These observability rules should be integrated with:

- **Platform Observability Standard**: OTel configuration, ADOT integration
- **Platform Logging Standard**: Structured JSON logging, trace correlation
- **Component Standards**: Component-specific observability configuration

## References

- CloudWatch Metrics: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/working_with_metrics.html
- CloudWatch Logs: https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/WhatIsCloudWatchLogs.html
- CloudTrail: https://docs.aws.amazon.com/awscloudtrail/latest/userguide/cloudtrail-user-guide.html
- X-Ray: https://docs.aws.amazon.com/xray/latest/devguide/aws-xray.html


