# Lambda Worker Component

Enterprise-grade AWS Lambda function optimized for background processing, event-driven workflows, and asynchronous task execution with comprehensive monitoring and security features.

## Overview

This component provides a fully managed Lambda function designed for worker processes with:

- **Event-Driven Processing**: Optimized for SQS, SNS, S3, and EventBridge event sources
- **Batch Processing**: Configurable batch sizes and processing windows
- **Error Handling**: Dead letter queues, retry logic, and failure monitoring
- **Compliance Hardening**: Three-tier compliance support (Commercial/FedRAMP Moderate/FedRAMP High)
- **Resource Optimization**: Memory and timeout settings tuned for background processing

## Capabilities

- **compute:lambda-worker**: Provides serverless background processing for asynchronous tasks

## Configuration

```yaml
components:
  - name: data-processor
    type: lambda-worker
    config:
      functionName: DataProcessingWorker
      description: Background worker for data processing tasks
      
      code:
        handler: src/worker.handler
        runtime: python3.11
        zipFile: ./dist/worker.zip
        # Alternative: Container image
        # imageUri: 123456789012.dkr.ecr.us-east-1.amazonaws.com/data-processor:latest
      
      environment:
        variables:
          PYTHON_ENV: production
          LOG_LEVEL: INFO
          BATCH_SIZE: "50"
          MAX_RETRY_ATTEMPTS: "3"
          DATABASE_URL: ${analytics-db.connectionString}
      
      memorySize: 1024
      timeout: 900  # 15 minutes for long-running processing
      
      reservedConcurrency: 50
      
      vpcConfig:
        vpcId: vpc-12345678
        subnetIds:
          - subnet-12345678
          - subnet-87654321
        securityGroupIds:
          - sg-lambda-worker
      
      deadLetterQueue:
        targetArn: arn:aws:sqs:us-east-1:123456789012:processing-dlq
      
      eventSourceMappings:
        - eventSourceArn: arn:aws:sqs:us-east-1:123456789012:data-processing-queue
          batchSize: 10
          maximumBatchingWindowInSeconds: 30
          functionResponseTypes:
            - ReportBatchItemFailures
        
        - eventSourceArn: arn:aws:s3:::company-data-input
          events:
            - s3:ObjectCreated:*
          filter:
            key:
              filterRules:
                - name: prefix
                  value: data/
                - name: suffix
                  value: .json
      
      layers:
        - arn:aws:lambda:us-east-1:123456789012:layer:DataProcessingLibs:1
        - arn:aws:lambda:us-east-1:123456789012:layer:Monitoring:2
      
      fileSystemConfigs:
        - arn: arn:aws:elasticfilesystem:us-east-1:123456789012:access-point/fsap-12345678
          localMountPath: /mnt/shared
      
      tags:
        worker-type: data-processing
        processing-tier: batch
        monitoring-required: "true"
```

## Binding Examples

### SQS Queue Processing

```yaml
components:
  - name: processing-queue
    type: sqs-queue
    config:
      queueName: DataProcessingQueue
      maxReceiveCount: 3
    binds:
      - to: data-processor
        capability: compute:lambda-worker
        access: invoke
        eventMapping:
          batchSize: 10
          maximumBatchingWindowInSeconds: 30
```

### S3 Event Processing

```yaml
components:
  - name: input-bucket
    type: s3-bucket
    config:
      bucketName: company-data-input
    binds:
      - to: data-processor
        capability: compute:lambda-worker
        access: invoke
        eventMapping:
          events:
            - s3:ObjectCreated:Put
```

## Compliance Features

### Commercial
- Basic error handling and monitoring
- Standard timeout and memory configurations
- Cost-optimized settings

### FedRAMP Moderate
- Enhanced error tracking with detailed logging
- VPC deployment for network isolation
- Comprehensive CloudWatch monitoring
- Dead letter queue mandatory for error handling
- 1-year audit log retention

### FedRAMP High
- Strict VPC deployment requirements
- Advanced error handling with multiple retry strategies
- Enhanced monitoring and security logging
- Comprehensive audit trails for all processing
- 10-year audit log retention
- Advanced threat detection and monitoring

## Advanced Configuration

### Container Image Deployment

```yaml
config:
  code:
    imageUri: 123456789012.dkr.ecr.us-east-1.amazonaws.com/data-processor:v1.2.3
    imageConfig:
      entryPoint: ["/lambda-entrypoint.sh"]
      command: ["app.handler"]
      workingDirectory: "/var/task"
  memorySize: 2048
  timeout: 900
```

### Multi-Source Event Processing

```yaml
config:
  eventSourceMappings:
    # SQS processing
    - eventSourceArn: arn:aws:sqs:us-east-1:123456789012:high-priority-queue
      batchSize: 1
      maximumBatchingWindowInSeconds: 0
    
    # Kinesis stream processing
    - eventSourceArn: arn:aws:kinesis:us-east-1:123456789012:stream/data-stream
      batchSize: 100
      startingPosition: LATEST
      parallelizationFactor: 10
      maximumBatchingWindowInSeconds: 5
    
    # DynamoDB stream processing
    - eventSourceArn: arn:aws:dynamodb:us-east-1:123456789012:table/UserData/stream/*
      batchSize: 50
      startingPosition: TRIM_HORIZON
      maximumBatchingWindowInSeconds: 10
```

### EFS Integration for Large Files

```yaml
config:
  fileSystemConfigs:
    - arn: arn:aws:elasticfilesystem:us-east-1:123456789012:access-point/fsap-shared-data
      localMountPath: /mnt/shared-data
    - arn: arn:aws:elasticfilesystem:us-east-1:123456789012:access-point/fsap-temp-processing
      localMountPath: /mnt/temp
```

## Monitoring and Observability

The component automatically configures:

- **CloudWatch Metrics**: Invocations, duration, errors, iterator age, concurrent executions
- **CloudWatch Logs**: Structured logging with correlation IDs
- **AWS X-Ray**: Distributed tracing for complex workflows
- **CloudWatch Alarms**: Processing delays, error rates, and dead letter queue depth
- **Custom Metrics**: Processing throughput, business-specific KPIs

### Monitoring Levels

- **Basic**: Standard Lambda metrics and basic error tracking
- **Enhanced**: X-Ray tracing + detailed performance metrics + batch processing analytics
- **Comprehensive**: Enhanced + business metrics + compliance monitoring + security analytics

## Security Features

### Network Isolation
- VPC deployment with private subnets
- Security group controls for database and service access
- NAT Gateway for controlled internet access
- VPC endpoints for AWS service communication

### Data Security
- Environment variable encryption with KMS
- EFS encryption for file system access
- Secrets management integration
- Input validation and data sanitization

### Access Control
- Least-privilege IAM execution roles
- Resource-based policies for event sources
- Cross-account invocation controls
- Service-to-service authentication

## Processing Patterns

### Batch Processing with SQS

```python
import json
import boto3
from typing import List, Dict, Any

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Process batch of SQS messages"""
    
    batch_item_failures = []
    successful_records = []
    
    for record in event['Records']:
        try:
            # Extract message data
            message_body = json.loads(record['body'])
            message_id = record['messageId']
            
            # Process the message
            result = process_data_item(message_body)
            
            successful_records.append({
                'messageId': message_id,
                'result': result
            })
            
        except Exception as e:
            print(f"Failed to process message {record['messageId']}: {str(e)}")
            
            # Report individual item failure for partial batch success
            batch_item_failures.append({
                'itemIdentifier': record['messageId']
            })
    
    # Log processing summary
    print(f"Processed {len(successful_records)} records successfully")
    print(f"Failed to process {len(batch_item_failures)} records")
    
    # Return batch item failures for SQS to retry only failed items
    return {
        'batchItemFailures': batch_item_failures
    }

def process_data_item(data: Dict[str, Any]) -> Dict[str, Any]:
    """Process individual data item"""
    # Implement your processing logic here
    transformed_data = {
        'id': data.get('id'),
        'processed_at': datetime.utcnow().isoformat(),
        'status': 'completed'
    }
    
    # Save to database or send to next stage
    save_processed_data(transformed_data)
    
    return transformed_data
```

### Stream Processing with Kinesis

```python
import base64
import json
from datetime import datetime

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Process Kinesis stream records"""
    
    batch_item_failures = []
    processed_count = 0
    
    for record in event['Records']:
        try:
            # Decode Kinesis data
            payload = base64.b64decode(record['kinesis']['data'])
            data = json.loads(payload)
            
            # Process the stream record
            process_stream_record(data, record['kinesis']['sequenceNumber'])
            processed_count += 1
            
        except Exception as e:
            print(f"Failed to process record {record['kinesis']['sequenceNumber']}: {str(e)}")
            
            batch_item_failures.append({
                'itemIdentifier': record['kinesis']['sequenceNumber']
            })
    
    print(f"Successfully processed {processed_count} stream records")
    
    return {
        'batchItemFailures': batch_item_failures
    }

def process_stream_record(data: Dict[str, Any], sequence_number: str):
    """Process individual stream record"""
    # Real-time processing logic
    enriched_data = enrich_data(data)
    
    # Send to downstream systems
    send_to_analytics(enriched_data)
    update_real_time_dashboard(enriched_data)
```

### File Processing with S3 Events

```python
import boto3
import os
from urllib.parse import unquote_plus

s3_client = boto3.client('s3')

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Process S3 object creation events"""
    
    for record in event['Records']:
        try:
            # Extract S3 information
            bucket = record['s3']['bucket']['name']
            key = unquote_plus(record['s3']['object']['key'])
            
            print(f"Processing file: s3://{bucket}/{key}")
            
            # Download and process file
            result = process_s3_file(bucket, key)
            
            print(f"Successfully processed {key}: {result}")
            
        except Exception as e:
            print(f"Error processing {key}: {str(e)}")
            # Send to DLQ or error handling system
            raise
    
    return {'statusCode': 200}

def process_s3_file(bucket: str, key: str) -> Dict[str, Any]:
    """Download and process S3 file"""
    
    # Download file to /tmp (or EFS mount if configured)
    local_path = f"/tmp/{os.path.basename(key)}"
    s3_client.download_file(bucket, key, local_path)
    
    # Process file based on type
    if key.endswith('.json'):
        return process_json_file(local_path)
    elif key.endswith('.csv'):
        return process_csv_file(local_path)
    else:
        return process_binary_file(local_path)
```

## Error Handling and Resilience

### Retry Configuration

```yaml
config:
  retryConfig:
    maximumRetryAttempts: 3
    destinationConfig:
      onFailure:
        destination: arn:aws:sqs:us-east-1:123456789012:processing-failures
      onSuccess:
        destination: arn:aws:sns:us-east-1:123456789012:processing-success
```

### Circuit Breaker Implementation

```python
import time
from enum import Enum
from typing import Callable, Any

class CircuitState(Enum):
    CLOSED = "CLOSED"
    OPEN = "OPEN"
    HALF_OPEN = "HALF_OPEN"

class CircuitBreaker:
    def __init__(self, failure_threshold: int = 5, timeout: int = 60):
        self.failure_threshold = failure_threshold
        self.timeout = timeout
        self.failure_count = 0
        self.last_failure_time = 0
        self.state = CircuitState.CLOSED
    
    def call(self, func: Callable, *args, **kwargs) -> Any:
        if self.state == CircuitState.OPEN:
            if time.time() - self.last_failure_time > self.timeout:
                self.state = CircuitState.HALF_OPEN
            else:
                raise Exception("Circuit breaker is OPEN")
        
        try:
            result = func(*args, **kwargs)
            self.on_success()
            return result
        except Exception as e:
            self.on_failure()
            raise
    
    def on_success(self):
        self.failure_count = 0
        self.state = CircuitState.CLOSED
    
    def on_failure(self):
        self.failure_count += 1
        self.last_failure_time = time.time()
        
        if self.failure_count >= self.failure_threshold:
            self.state = CircuitState.OPEN
```

## Performance Optimization

### Memory and Timeout Optimization

```yaml
# CPU-intensive data processing
config:
  memorySize: 3008  # Maximum CPU allocation
  timeout: 900      # 15 minutes for complex processing

# I/O-intensive file processing
config:
  memorySize: 1024  # Balanced allocation
  timeout: 300      # 5 minutes timeout

# Large file processing with EFS
config:
  memorySize: 512   # Lower memory for file I/O
  timeout: 900      # Extended time for large files
  fileSystemConfigs:
    - localMountPath: /mnt/processing
```

### Batch Size Optimization

```yaml
config:
  eventSourceMappings:
    # High-throughput, small messages
    - batchSize: 100
      maximumBatchingWindowInSeconds: 5
    
    # Low-throughput, large messages  
    - batchSize: 1
      maximumBatchingWindowInSeconds: 0
    
    # Balanced processing
    - batchSize: 25
      maximumBatchingWindowInSeconds: 10
```

## Troubleshooting

### Common Issues

1. **High Error Rates**
   - Check dead letter queue for failed messages
   - Review CloudWatch Logs for error patterns
   - Verify input data format and validation

2. **Processing Delays**
   - Monitor iterator age for stream processing
   - Check reserved concurrency limits
   - Review batch size and processing window settings

3. **VPC Connectivity Issues**
   - Ensure NAT Gateway for outbound access
   - Verify security group rules
   - Check VPC endpoint configurations

### Debug Mode

Enable detailed logging and tracing:

```yaml
config:
  environment:
    variables:
      LOG_LEVEL: DEBUG
      AWS_LAMBDA_LOG_LEVEL: DEBUG
  tracingConfig:
    mode: Active
  tags:
    debug: "true"
```

## Examples

See the [`examples/`](../../examples/) directory for complete service templates:

- `examples/data-pipeline/` - ETL data processing pipeline
- `examples/event-processing/` - Event-driven microservices
- `examples/batch-jobs/` - Scheduled batch processing

## API Reference

### LambdaWorkerComponent

Main component class that extends `Component`.

#### Methods

- `synth()`: Creates AWS resources (Lambda Function, Event Source Mappings, IAM Role)
- `getCapabilities()`: Returns compute:lambda-worker capability
- `getType()`: Returns 'lambda-worker'

### Configuration Interfaces

- `LambdaWorkerConfig`: Main configuration interface
- `LAMBDA_WORKER_CONFIG_SCHEMA`: JSON schema for validation

## Development

To contribute to this component:

1. Make changes to the source code
2. Run tests: `npm test`  
3. Build: `npm run build`
4. Follow the [Contributing Guide](../../../CONTRIBUTING.md)

## License

MIT License - see LICENSE file for details.