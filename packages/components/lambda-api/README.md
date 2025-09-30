# Lambda API Component

CDK construct for deploying AWS Lambda functions with API Gateway REST API integration. Provides production-ready serverless API infrastructure with comprehensive monitoring, security, and observability features.

## Key Features

- **ConfigBuilder Integration** – Five-layer configuration precedence managed by the shared `ConfigBuilder` with framework defaults
- **Hardened Lambda Runtime** – Runtime, architecture, memory, timeout, log retention, tracing, and security instrumentation
- **REST API Gateway** – Stage logging, metrics, throttling, CORS, usage plans, and API key management
- **Observability & Monitoring** – CloudWatch alarms for Lambda errors/throttles/duration and API 4xx/5xx plus OpenTelemetry integration
- **VPC & Encryption Ready** – VPC wiring, KMS environment encryption, and configurable removal policies
- **Standardized Capabilities** – Registers `lambda:function` and `api:rest` capability payloads for downstream binders
- **Advanced Features** – Dead letter queues, event sources, performance optimizations, and circuit breaker patterns
- **CDK Nag Compliance** – Automated security validation with comprehensive suppressions for legitimate use cases

## Supported Runtimes

- Node.js: `nodejs18.x`, `nodejs20.x`
- Python: `python3.9`, `python3.10`, `python3.11`

## Architecture Options

- `x86_64` - Intel/AMD processors
- `arm64` - AWS Graviton2 processors (cost-optimized)

## Configuration Guide

### Basic Configuration

```yaml
components:
  - name: checkout-api
    type: lambda-api
    config:
      functionName: checkout-api
      handler: src/http.handler
      runtime: nodejs20.x
      architecture: arm64
      memorySize: 512
      timeoutSeconds: 30
      codePath: ./dist
      environment:
        LOG_LEVEL: INFO
      api:
        stageName: prod
        cors:
          enabled: true
          allowOrigins: ["*"]
```

### Complete Configuration Example

```yaml
components:
  - name: checkout-api
    type: lambda-api
    config:
      # Core Lambda Configuration
      functionName: checkout-api
      handler: src/http.handler
      runtime: nodejs20.x
      architecture: arm64
      memorySize: 1024
      timeoutSeconds: 60
      description: "Checkout API service"
      
      # Environment Variables
      environment:
        LOG_LEVEL: DEBUG
        API_VERSION: v1
        
      # Reserved Concurrency (optional)
      reservedConcurrency: 100
      
      # Deployment Configuration
      deployment:
        codePath: ./dist
        assetHash: "abc123"
        inlineFallbackEnabled: false
        
      # VPC Configuration (optional)
      vpc:
        enabled: true
        vpcId: vpc-1234567890abcdef0
        subnetIds:
          - subnet-aaaa1111
          - subnet-bbbb2222
        securityGroupIds:
          - sg-0f00f0f0f0f0f0f0
          
      # KMS Encryption (optional)
      kmsKeyArn: arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012
      
      # API Gateway Configuration
      api:
        type: rest
        name: checkout-api
        description: "Checkout API Gateway"
        stageName: prod
        metricsEnabled: true
        tracingEnabled: true
        apiKeyRequired: true
        
        # Throttling Configuration
        throttling:
          burstLimit: 5000
          rateLimit: 2000
          
        # Usage Plan Configuration
        usagePlan:
          enabled: true
          name: "checkout-usage-plan"
          throttle:
            rateLimit: 1000
            burstLimit: 2000
          quota:
            limit: 10000
            period: DAY
            
        # Access Logging
        logging:
          enabled: true
          retentionDays: 90
          format: json
          includeRequestData: true
          includeResponseData: false
          
        # CORS Configuration
        cors:
          enabled: true
          allowOrigins:
            - https://app.example.com
            - https://staging.example.com
          allowMethods:
            - GET
            - POST
            - PUT
            - DELETE
            - OPTIONS
          allowHeaders:
            - Content-Type
            - Authorization
            - X-Requested-With
          allowCredentials: true
          maxAge: 3600
          
      # Logging Configuration
      logging:
        logRetentionDays: 30
        logFormat: JSON
        systemLogLevel: INFO
        applicationLogLevel: DEBUG
        
      # X-Ray Tracing
      tracing:
        mode: Active
        
      # OpenTelemetry Observability
      observability:
        otelEnabled: true
        otelLayerArn: arn:aws:lambda:us-east-1:901920570463:layer:aws-otel-nodejs-amd64-ver-1-18-1:4
        otelResourceAttributes:
          service.name: checkout-api
          service.environment: prod
          
      # Security Tools
      securityTools:
        falco: false
        
      # CloudWatch Monitoring
      monitoring:
        enabled: true
        alarms:
          lambdaErrors:
            enabled: true
            threshold: 1
            evaluationPeriods: 1
            periodMinutes: 1
            comparisonOperator: gt
            treatMissingData: breaching
            statistic: Sum
            tags: {}
          lambdaThrottles:
            enabled: true
            threshold: 5
            evaluationPeriods: 2
            periodMinutes: 1
            comparisonOperator: gt
            treatMissingData: breaching
            statistic: Sum
            tags: {}
          lambdaDuration:
            enabled: true
            threshold: 5000
            evaluationPeriods: 2
            periodMinutes: 1
            comparisonOperator: gt
            treatMissingData: breaching
            statistic: Average
            tags: {}
          api4xxErrors:
            enabled: true
            threshold: 10
            evaluationPeriods: 2
            periodMinutes: 1
            comparisonOperator: gt
            treatMissingData: breaching
            statistic: Sum
            tags: {}
          api5xxErrors:
            enabled: true
            threshold: 5
            evaluationPeriods: 2
            periodMinutes: 1
            comparisonOperator: gt
            treatMissingData: breaching
            statistic: Sum
            tags: {}
            
      # Hardening Profile
      hardeningProfile: standard
      
      # Removal Policy
      removalPolicy: retain
      
      # Tags
      tags:
        Service: checkout-api
        Environment: prod
        Owner: platform-team
```

## Configuration Reference

### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `functionName` | string | Lambda function name |
| `handler` | string | Function entry point (e.g., `src/http.handler`) |
| `runtime` | string | Runtime version (`nodejs18.x`, `nodejs20.x`, `python3.9`, `python3.10`, `python3.11`) |
| `architecture` | string | CPU architecture (`x86_64` or `arm64`) |
| `memorySize` | number | Memory allocation in MB |
| `timeoutSeconds` | number | Function timeout in seconds |
| `environment` | object | Environment variables |
| `deployment` | object | Deployment configuration |
| `api` | object | API Gateway configuration |
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
| `ephemeralStorageMb` | number | Ephemeral storage size in MB | 1024 |
| `vpc` | object | VPC configuration | Disabled |
| `kmsKeyArn` | string | KMS key for encryption | AWS managed |
| `deadLetterQueue` | object | DLQ configuration | Disabled |
| `eventSources` | object | Event source triggers | Disabled |
| `performanceOptimizations` | object | Performance optimization settings | Disabled |
| `circuitBreaker` | object | Circuit breaker configuration | Disabled |

### API Gateway Configuration

#### CORS Configuration
```yaml
api:
  cors:
    enabled: true
    allowOrigins:
      - https://app.example.com
      - https://staging.example.com
    allowMethods:
      - GET
      - POST
      - PUT
      - DELETE
      - OPTIONS
    allowHeaders:
      - Content-Type
      - Authorization
      - X-Requested-With
    allowCredentials: true
    maxAge: 3600
```

#### Usage Plan Configuration
```yaml
api:
  usagePlan:
    enabled: true
    name: "api-usage-plan"
    throttle:
      rateLimit: 1000
      burstLimit: 2000
    quota:
      limit: 10000
      period: DAY
```

#### Access Logging
```yaml
api:
  logging:
    enabled: true
    retentionDays: 90
    format: json
    includeRequestData: true
    includeResponseData: false
```

### VPC Configuration
```yaml
vpc:
  enabled: true
  vpcId: vpc-1234567890abcdef0
  subnetIds:
    - subnet-aaaa1111
    - subnet-bbbb2222
  securityGroupIds:
    - sg-0f00f0f0f0f0f0f0
```

### Monitoring Configuration
```yaml
monitoring:
  enabled: true
  alarms:
    lambdaErrors:
      enabled: true
      threshold: 1
      evaluationPeriods: 1
      periodMinutes: 1
      comparisonOperator: gt
      treatMissingData: breaching
      statistic: Sum
      tags: {}
    api4xxErrors:
      enabled: true
      threshold: 10
      evaluationPeriods: 2
      periodMinutes: 1
      comparisonOperator: gt
      treatMissingData: breaching
      statistic: Sum
      tags: {}
    api5xxErrors:
      enabled: true
      threshold: 5
      evaluationPeriods: 2
      periodMinutes: 1
      comparisonOperator: gt
      treatMissingData: breaching
      statistic: Sum
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
- API Gateway stage name determines the deployment URL path
