# Lambda Worker Component

CDK construct for deploying AWS Lambda functions configured for asynchronous workloads. Provides enterprise-grade event processing, data transformation, and background job capabilities with comprehensive monitoring and security features.

## Key Features

- **ConfigBuilder Integration** – Five-layer configuration precedence managed by the shared `ConfigBuilder` with framework defaults
- **Multi-Event Source Support** – SQS queues, EventBridge schedules, and EventBridge pattern matching
- **Dead Letter Queue Handling** – Automatic failure handling with configurable retry policies
- **Advanced Event Processing** – Batch processing, scaling configuration, and custom event filtering
- **Observability & Monitoring** – CloudWatch alarms, OpenTelemetry integration, and structured logging
- **VPC & Encryption Ready** – Network isolation, KMS encryption, and security group management
- **Performance Optimization** – Reserved concurrency, provisioned concurrency, and memory tuning
- **Security Hardening** – Falco instrumentation, environment variable encryption, and least-privilege IAM
- **CDK Nag Compliance** – Automated security validation with comprehensive suppressions for legitimate use cases

## Supported Runtimes

- Node.js: `nodejs18.x`, `nodejs20.x`
- Python: `python3.9`, `python3.10`, `python3.11`

## Architecture Options

- `x86_64` - Intel/AMD processors
- `arm64` - AWS Graviton2 processors (cost-optimized)

## Event Source Types

- `sqs` - SQS queue triggers
- `eventBridge` - EventBridge schedule triggers  
- `eventBridgePattern` - EventBridge pattern matching triggers

## Configuration Guide

### **Basic Configuration**

```yaml
components:
  - name: data-processor-worker
    type: lambda-worker
    config:
      handler: index.handler
      runtime: nodejs20.x
      codePath: services/data-processor/dist
      memorySize: 1024
      timeoutSeconds: 300
      environment:
        STAGE: prod
        PROCESSING_BATCH_SIZE: 100
```

### **Complete Configuration Example**

```yaml
components:
  - name: image-resize-worker
    type: lambda-worker
    config:
      # Core Configuration
      functionName: image-resize-worker
      handler: index.handler
      runtime: nodejs20.x
      architecture: arm64
      codePath: services/image-worker/dist
      memorySize: 1024
      timeoutSeconds: 300
      description: "Resize images from S3"
      
      # Environment Variables
      environment:
        STAGE: prod
        SOURCE_BUCKET: images-raw
        DEST_BUCKET: images-processed
        
      # Reserved Concurrency (optional)
      reservedConcurrency: 10
      
      # Dead Letter Queue
      deadLetterQueue:
        enabled: true
        queueArn: arn:aws:sqs:us-east-1:123456789012:image-worker-dlq
        maxReceiveCount: 3
        
      # Event Sources
      eventSources:
        - type: sqs
          queueArn: arn:aws:sqs:us-east-1:123456789012:image-worker-queue
          batchSize: 10
          enabled: true
        - type: eventbridge-schedule
          scheduleExpression: "rate(5 minutes)"
          enabled: true
          
      # VPC Configuration (optional)
      vpc:
        enabled: true
        vpcId: vpc-12345
        subnetIds:
          - subnet-12345
          - subnet-67890
        securityGroupIds:
          - sg-abcdef
          
      # KMS Encryption (optional)
      kmsKeyArn: arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012
        
      # Logging Configuration
      logging:
        logRetentionDays: 30
        logFormat: JSON
        systemLogLevel: INFO
        applicationLogLevel: INFO
        
      # X-Ray Tracing
      tracing:
        mode: Active
        
      # OpenTelemetry Observability
      observability:
        otelEnabled: true
        otelLayerArn: arn:aws:lambda:us-east-1:901920570463:layer:aws-otel-nodejs-amd64-ver-1-18-1:4
        otelResourceAttributes:
          service.name: image-resize-worker
          service.environment: prod
          
      # Security Tools
      securityTools:
        falco: false
        
      # CloudWatch Monitoring
      monitoring:
        enabled: true
        alarms:
          errors:
            enabled: true
            threshold: 1
            evaluationPeriods: 1
            periodMinutes: 1
            comparisonOperator: gt
            treatMissingData: breaching
            statistic: Sum
            tags: {}
          throttles:
            enabled: true
            threshold: 5
            evaluationPeriods: 2
            periodMinutes: 1
            comparisonOperator: gt
            treatMissingData: breaching
            statistic: Sum
            tags: {}
          duration:
            enabled: true
            threshold: 5000
            evaluationPeriods: 2
            periodMinutes: 1
            comparisonOperator: gt
            treatMissingData: breaching
            statistic: Average
            tags: {}
            
      # Hardening Profile
      hardeningProfile: standard
      
      # Removal Policy
      removalPolicy: retain
      
      # Tags
      tags:
        Service: image-processing
        Environment: prod
        Owner: platform-team
```

## Configuration Reference

### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `functionName` | string | Lambda function name |
| `handler` | string | Function entry point (e.g., `index.handler`) |
| `runtime` | string | Runtime version (`nodejs18.x`, `nodejs20.x`, `python3.9`, `python3.10`, `python3.11`) |
| `architecture` | string | CPU architecture (`x86_64` or `arm64`) |
| `memorySize` | number | Memory allocation in MB |
| `timeoutSeconds` | number | Function timeout in seconds |
| `codePath` | string | Path to function code directory |
| `environment` | object | Environment variables |
| `logging` | object | Log configuration |
| `tracing` | object | X-Ray tracing configuration |
| `observability` | object | OpenTelemetry configuration |
| `securityTools` | object | Security tool configuration |
| `monitoring` | object | CloudWatch monitoring configuration |
| `hardeningProfile` | string | Hardening profile name |
| `removalPolicy` | string | CDK removal policy (`retain` or `destroy`) |
| `tags` | object | Resource tags |

### Optional Fields

| Field | Type | Description | Default |
|-------|------|-------------|---------|
| `description` | string | Function description | - |
| `reservedConcurrency` | number | Concurrency limit | No limit |
| `deadLetterQueue` | object | DLQ configuration | Disabled |
| `eventSources` | array | Event source triggers | `[]` |
| `vpc` | object | VPC configuration | Disabled |
| `kmsKeyArn` | string | KMS key for encryption | AWS managed |

### Event Source Configuration

#### SQS Event Source
```yaml
eventSources:
  - type: sqs
    queueArn: arn:aws:sqs:region:account:queue-name
    batchSize: 10
    enabled: true
```

#### EventBridge Schedule
```yaml
eventSources:
  - type: eventbridge
    scheduleExpression: "rate(5 minutes)"
    enabled: true
```

#### EventBridge Pattern
```yaml
eventSources:
  - type: eventBridgePattern
    eventPattern:
      source: ["aws.s3"]
      detail-type: ["Object Created"]
    enabled: true
```

### Dead Letter Queue
```yaml
deadLetterQueue:
  enabled: true
  queueArn: arn:aws:sqs:region:account:dlq-name
  maxReceiveCount: 3
```

### VPC Configuration
```yaml
vpc:
  enabled: true
  vpcId: vpc-12345
  subnetIds:
    - subnet-12345
    - subnet-67890
  securityGroupIds:
    - sg-abcdef
```

### Monitoring Configuration
```yaml
monitoring:
  enabled: true
  alarms:
    errors:
      enabled: true
      threshold: 1
      evaluationPeriods: 1
      periodMinutes: 1
      comparisonOperator: gt
      treatMissingData: breaching
      statistic: Sum
      tags: {}
    throttles:
      enabled: true
      threshold: 5
      evaluationPeriods: 2
      periodMinutes: 1
      comparisonOperator: gt
      treatMissingData: breaching
      statistic: Sum
      tags: {}
    duration:
      enabled: true
      threshold: 5000
      evaluationPeriods: 2
      periodMinutes: 1
      comparisonOperator: gt
      treatMissingData: breaching
      statistic: Average
      tags: {}
```

## Development

### Build
```bash
pnpm build
```

### Test
```bash
pnpm test
```

### Validate
```bash
svc validate --env dev
```

### Plan
```bash
svc plan --env prod
```

## Notes

- Provide a real `codePath` containing your built artifacts
- When VPC integration is enabled, ensure the specified subnets/security groups exist
- The component uses the platform ConfigBuilder for configuration precedence
