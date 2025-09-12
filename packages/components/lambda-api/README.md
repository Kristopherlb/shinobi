# Lambda API Component

AWS Lambda function with API Gateway integration for synchronous API workloads. Implements platform standards with configuration-driven compliance.

## Overview

The Lambda API Component provides a production-ready AWS Lambda function with API Gateway integration, supporting multiple compliance frameworks (Commercial, FedRAMP Moderate, FedRAMP High) with automatic security hardening and observability.

## Features

- **Multi-Framework Compliance**: Supports Commercial, FedRAMP Moderate, and FedRAMP High deployments
- **Configuration-Driven**: 5-layer configuration precedence chain with platform defaults
- **Security by Default**: Automatic encryption, VPC deployment for FedRAMP, and security monitoring
- **Observability**: OpenTelemetry integration, CloudWatch alarms, and comprehensive logging
- **API Gateway Integration**: REST API with CORS, API key support, and proxy integration
- **Compliance Tagging**: Automatic resource tagging for compliance tracking

## Usage

### Basic Usage

```yaml
# service.yml
components:
  - name: my-api
    type: lambda-api
    config:
      handler: "index.handler"
      runtime: "nodejs20.x"
      memory: 512
      timeout: 30
      api:
        cors: true
        apiKeyRequired: false
```

### Advanced Configuration

```yaml
# service.yml
components:
  - name: my-api
    type: lambda-api
    config:
      handler: "src/handler.lambda_handler"
      runtime: "python3.11"
      memory: 1024
      timeout: 60
      codePath: "./src"
      environmentVariables:
        LOG_LEVEL: "INFO"
        API_VERSION: "v1"
      api:
        name: "my-production-api"
        cors: true
        apiKeyRequired: true
      monitoring:
        enabled: true
        detailedMetrics: true
        alarms:
          errorRateThreshold: 5
          durationThreshold: 80
          throttleThreshold: 1
      tags:
        team: "backend"
        project: "api-service"
```

### FedRAMP Configuration

```yaml
# service.yml (FedRAMP High)
components:
  - name: my-api
    type: lambda-api
    config:
      handler: "index.handler"
      runtime: "nodejs20.x"
      memory: 1024
      timeout: 60
      vpc:
        vpcId: "vpc-12345678"
        subnetIds: ["subnet-12345678", "subnet-87654321"]
        securityGroupIds: ["sg-12345678"]
      encryption:
        kmsKeyArn: "arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012"
      security:
        tools:
          falco: true
      monitoring:
        enabled: true
        detailedMetrics: true
```

## Configuration Reference

### Required Properties

| Property | Type | Description | Example |
|----------|------|-------------|---------|
| `handler` | string | Lambda function handler | `"index.handler"` |

### Optional Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `runtime` | string | `"nodejs20.x"` | Lambda runtime environment |
| `memory` | number | `512` | Memory allocation in MB (128-10240) |
| `timeout` | number | `30` | Function timeout in seconds (1-900) |
| `codePath` | string | `"./src"` | Path to Lambda function code |
| `environmentVariables` | object | `{}` | Environment variables for the function |
| `api` | object | See below | API Gateway configuration |
| `vpc` | object | `undefined` | VPC configuration for FedRAMP |
| `encryption` | object | `undefined` | Encryption configuration |
| `security` | object | See below | Security tooling configuration |
| `monitoring` | object | See below | Monitoring and observability |
| `tags` | object | `{}` | Additional resource tags |

### API Gateway Configuration

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `name` | string | Auto-generated | API Gateway name |
| `cors` | boolean | `false` | Enable CORS for API Gateway |
| `apiKeyRequired` | boolean | `false` | Require API key for requests |

### VPC Configuration (FedRAMP)

| Property | Type | Description |
|----------|------|-------------|
| `vpcId` | string | VPC ID for Lambda deployment |
| `subnetIds` | string[] | Subnet IDs for Lambda deployment |
| `securityGroupIds` | string[] | Security group IDs for Lambda |

### Encryption Configuration

| Property | Type | Description |
|----------|------|-------------|
| `kmsKeyArn` | string | KMS key ARN for environment variable encryption |

### Security Configuration

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `tools.falco` | boolean | `false` | Enable Falco security monitoring |

### Monitoring Configuration

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `enabled` | boolean | `true` | Enable monitoring |
| `detailedMetrics` | boolean | `false` | Enable detailed CloudWatch metrics |
| `alarms.errorRateThreshold` | number | `5` | Error rate threshold for alarms |
| `alarms.durationThreshold` | number | `80` | Duration threshold (percentage of timeout) |
| `alarms.throttleThreshold` | number | `1` | Throttle threshold for alarms |

## Capabilities

### Provided Capabilities

| Capability | Description | Data Shape |
|------------|-------------|------------|
| `lambda:function` | Lambda function capability | `{ functionArn, functionName, roleArn }` |
| `api:rest` | REST API capability | `{ endpointUrl, apiId }` |

### Required Capabilities

None - this component is self-contained.

## Construct Handles

| Handle | Description | Type |
|--------|-------------|------|
| `lambdaFunction` | Main Lambda function construct | `aws-cdk-lib/aws-lambda.Function` |
| `api` | API Gateway REST API construct | `aws-cdk-lib/aws-apigateway.RestApi` |
| `kmsKey` | KMS key for encryption (FedRAMP High only) | `aws-cdk-lib/aws-kms.Key` |

## Compliance Frameworks

### Commercial
- Basic CloudWatch logging (1 month retention)
- Standard memory allocation (512MB)
- Standard timeout (30s)
- Optional CORS and API key requirements

### FedRAMP Moderate
- Enhanced CloudWatch logging (3 months retention)
- Increased memory allocation (768MB)
- Extended timeout (45s)
- X-Ray tracing enabled
- Falco security monitoring
- VPC deployment required

### FedRAMP High
- Comprehensive CloudWatch logging (1 year audit retention)
- Maximum memory allocation (1024MB)
- Extended timeout (60s)
- Customer-managed KMS encryption
- STIG compliance configuration
- VPC deployment with restricted internet access
- Enhanced security monitoring

## Security Features

- **Encryption at Rest**: Environment variables encrypted using AWS KMS
- **Encryption in Transit**: API Gateway enforces HTTPS for all requests
- **Logging and Monitoring**: Comprehensive CloudWatch logging with compliance-aware retention
- **Tracing and Observability**: X-Ray tracing for FedRAMP deployments, OpenTelemetry integration
- **Security Monitoring**: Falco security monitoring for FedRAMP deployments
- **Network Security**: VPC deployment for FedRAMP with restricted network access

## Observability

### CloudWatch Metrics
- Lambda invocations, errors, duration, throttles
- API Gateway requests, 4xx/5xx errors, latency
- Custom application metrics

### CloudWatch Alarms
- High error rate detection
- Duration threshold monitoring
- Throttling detection
- Memory utilization monitoring
- API Gateway performance monitoring

### Dashboards
- Comprehensive monitoring dashboard template
- Framework-specific compliance monitoring
- Custom metrics visualization

## Testing

The component includes comprehensive test coverage:

- **Configuration Tests**: 5-layer precedence chain validation
- **Synthesis Tests**: CloudFormation template generation verification
- **Compliance Tests**: Framework-specific resource validation
- **Integration Tests**: End-to-end component behavior

Run tests:
```bash
npm test -- --testPathPatterns=lambda-api
```

## Dependencies

- AWS CDK Core (^2.0.0)
- AWS Lambda CDK (^2.0.0)
- AWS API Gateway CDK (^2.0.0)
- Platform Contracts (^1.0.0)

## Compliance Standards

This component helps meet the following compliance standards:

- **AWS Foundational Security Best Practices**: Lambda.1, Lambda.2, Lambda.3, Lambda.4, Lambda.5
- **FedRAMP Moderate Controls**: AC-2, AC-3, AC-6, AU-2, AU-3, AU-6, SC-7, SC-13
- **FedRAMP High Controls**: AC-2(4), AU-2(3), SC-7(3), SC-13(1)

## Audit Artifacts

- **Component Plan**: `/audit/component.plan.json`
- **OSCAL Metadata**: `/audit/lambda-api.oscal.json`
- **Policy Stubs**: `/audit/rego/`
- **Dashboard Template**: `/observability/otel-dashboard-template.json`
- **Alarm Configuration**: `/observability/alarms-config.json`

## Support

For questions or issues:
- Platform Team: platform-team@company.com
- Security Team: security-team@company.com
- Compliance Team: compliance-team@company.com