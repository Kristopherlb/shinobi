# Lambda Worker Component

Enterprise-grade asynchronous Lambda worker component with comprehensive security, compliance, and operational capabilities. Built on the platform ConfigBuilder contract with advanced features including dead letter queues, event source integration, performance optimization, and circuit breaker patterns.

## Overview

The Lambda Worker Component provides a production-ready foundation for asynchronous workloads including:
- **Event Processing**: SQS queues, EventBridge rules, and scheduled tasks
- **Data Processing**: ETL pipelines, batch processing, and stream processing
- **Background Jobs**: Image processing, document conversion, and notification delivery
- **Microservice Integration**: Async communication between services

## Core Capabilities

### **🔧 Runtime Configuration**
- **Multi-Runtime Support**: Node.js 18.x/20.x, Python 3.9/3.10/3.11
- **Architecture Options**: x86_64 and ARM64 (Graviton2) for cost optimization
- **Memory & Timeout**: Configurable from 128MB to 10GB, 1s to 15min timeout
- **Reserved Concurrency**: Precise resource allocation and cost control

### **🛡️ Security & Compliance**
- **CDK Nag Integration**: Automated security validation with 12+ compliance checks
- **Input Validation**: Multi-layer validation preventing misconfigurations
- **Framework Compliance**: Commercial, FedRAMP Moderate/High, HIPAA, SOX support
- **VPC Integration**: Network isolation with configurable subnets and security groups
- **Encryption**: KMS integration for environment variables and data at rest

### **📊 Advanced Features**
- **Dead Letter Queue (DLQ)**: Automatic failure handling with SQS integration
- **Event Sources**: SQS, EventBridge schedule, and EventBridge pattern support
- **Performance Optimization**: Provisioned concurrency, reserved concurrency, SnapStart
- **Circuit Breaker**: Automatic failure detection and recovery patterns
- **Comprehensive Monitoring**: CloudWatch alarms for errors, throttles, duration, and custom metrics

### **🔍 Observability & Monitoring**
- **OpenTelemetry Integration**: Structured logging with trace correlation
- **X-Ray Tracing**: Distributed tracing for complex workflows
- **Lambda Powertools**: Enhanced observability with business metrics and parameter store integration
- **CloudWatch Dashboards**: Pre-configured monitoring and alerting
- **Compliance Scoring**: 0-100 scale validation with detailed remediation guidance

### **⚡ Performance & Reliability**
- **Auto-Scaling**: Intelligent scaling based on utilization patterns
- **Error Handling**: Retry logic with exponential backoff
- **Resource Optimization**: Memory and timeout recommendations
- **Cost Monitoring**: Automated cost tracking and optimization alerts

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

### **Framework-Specific Defaults**

Configuration inherits defaults from compliance framework files:
- `config/commercial.yml` - Standard commercial defaults
- `config/fedramp-moderate.yml` - FedRAMP Moderate compliance requirements
- `config/fedramp-high.yml` - FedRAMP High compliance requirements
- `config/hipaa.yml` - HIPAA compliance requirements
- `config/sox.yml` - SOX compliance requirements

## Key Configuration Sections

| Path | Description |
|------|-------------|
| `handler` | Required Lambda handler (`file.export`). |
| `runtime`, `architecture`, `memorySize`, `timeoutSeconds` | Core execution attributes. |
| `environment` | Plain key/value environment variables. |
| `deadLetterQueue` | Enable + queue ARN for async failure handling. |
| `eventSources[]` | SQS queues, EventBridge schedules, or patterns that trigger the function. |
| `vpc` | Optional VPC integration (VPC ID plus subnets/security-groups). |
| `kmsKeyArn` | Customer-managed key for environment variable encryption. |
| `logging` | Log retention/format and log-level controls. |
| `tracing` | Active or pass-through X-Ray tracing. |
| `observability` | OpenTelemetry toggle, optional layer ARN, resource attributes. |
| `securityTools` | Additional hardening toggles (Falco). |
| `monitoring` | Enable CloudWatch alarms for errors/throttles/duration. |
| `hardeningProfile` | Abstract profile exposed via capability metadata. |

## Capabilities

- `lambda:function` – ARN, name, runtime, timeout, and hardening profile of the
  worker function.

## Testing

```bash
corepack pnpm exec jest --runTestsByPath \
  packages/components/lambda-worker/tests/lambda-worker.builder.test.ts \
  packages/components/lambda-worker/tests/lambda-worker.component.synthesis.test.ts
```

## Notes

- The component does **not** infer behaviour from `context.complianceFramework`;
  enforce compliance using the segregated config defaults.
- Provide a real `codePath` containing your built artefacts; tests use a small
  fixture under `tests/fixtures/basic-lambda` for synthesis.
- When VPC integration is enabled, ensure the specified subnets/security groups
  exist in the deployment account/region.
