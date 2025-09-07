# IAM Policy Component

Enterprise-grade AWS IAM Policy management with security templates, least-privilege patterns, and comprehensive compliance controls.

## Overview

This component provides managed IAM policy creation with:

- **Security Templates**: Pre-built policies for common access patterns
- **Least Privilege**: Automated permission optimization and validation
- **Compliance Controls**: Three-tier compliance support (Commercial/FedRAMP Moderate/FedRAMP High)
- **Policy Validation**: Automated policy analysis and security recommendations
- **Audit Integration**: Comprehensive access logging and monitoring

## Capabilities

- **security:iam-policy**: Provides managed IAM policy for fine-grained access control

## Configuration

```yaml
components:
  - name: s3-read-only-policy
    type: iam-policy
    config:
      policyName: S3DataLakeReadOnlyAccess
      description: Read-only access to company data lake S3 buckets
      
      template: s3-read-only
      templateParameters:
        bucketNames:
          - company-data-lake
          - company-analytics-data
        keyPrefixes:
          - "processed/*"
          - "reports/*"
      
      # Alternative: Custom policy document
      policyDocument:
        Version: "2012-10-17"
        Statement:
          - Effect: Allow
            Action:
              - "s3:GetObject"
              - "s3:ListBucket"
            Resource:
              - "arn:aws:s3:::company-data-lake/*"
              - "arn:aws:s3:::company-data-lake"
            Condition:
              StringLike:
                "s3:prefix": 
                  - "processed/*"
                  - "reports/*"
      
      validation:
        enabled: true
        strictMode: true
        allowedActions:
          - "s3:GetObject"
          - "s3:ListBucket"
        deniedActions:
          - "s3:DeleteObject"
          - "s3:PutObject"
      
      tags:
        access-type: read-only
        data-classification: internal
        compliance-required: "true"
```

## Binding Examples

### IAM Role to Policy

```yaml
components:
  - name: data-analyst-role
    type: iam-role
    config:
      roleName: DataAnalystRole
    binds:
      - to: s3-read-only-policy
        capability: security:iam-policy
        access: attach
```

### Lambda Function with Policy

```yaml
components:
  - name: data-processor
    type: lambda-worker
    config:
      handler: src/process.handler
    binds:
      - to: s3-read-only-policy
        capability: security:iam-policy
        access: attach
```

## Compliance Features

### Commercial
- Basic policy validation
- Standard security templates
- Cost-optimized configurations

### FedRAMP Moderate
- Enhanced policy validation with security scanning
- Mandatory least-privilege analysis
- Comprehensive audit logging
- 1-year policy change retention
- Automated compliance checks

### FedRAMP High
- Strict policy validation with advanced security analysis
- Mandatory security reviews for custom policies
- Enhanced audit logging with detailed access patterns
- 10-year policy change retention
- Automated threat detection integration

## Security Templates

### S3 Access Templates

```yaml
# Read-only S3 access
config:
  template: s3-read-only
  templateParameters:
    bucketNames: [data-bucket]
    keyPrefixes: ["public/*"]

# S3 read-write with restrictions
config:
  template: s3-read-write
  templateParameters:
    bucketNames: [app-bucket]
    keyPrefixes: ["user-data/*"]
    deniedActions: ["s3:DeleteBucket"]
```

### Lambda Execution Templates

```yaml
# Basic Lambda execution
config:
  template: lambda-basic-execution
  templateParameters:
    logGroupNames: ["/aws/lambda/my-function"]

# Lambda with VPC access
config:
  template: lambda-vpc-execution
  templateParameters:
    vpcId: vpc-12345678
    subnetIds: [subnet-123, subnet-456]
```

### Database Access Templates

```yaml
# RDS read-only access
config:
  template: rds-read-only
  templateParameters:
    dbInstanceIds: [prod-database]
    dbNames: [analytics]

# DynamoDB read-write
config:
  template: dynamodb-read-write
  templateParameters:
    tableNames: [user-sessions, app-config]
    indexNames: [UserIndex, ConfigIndex]
```

## Advanced Configuration

### Custom Policy with Conditions

```yaml
config:
  policyDocument:
    Version: "2012-10-17"
    Statement:
      - Effect: Allow
        Action:
          - "s3:GetObject"
        Resource:
          - "arn:aws:s3:::secure-bucket/*"
        Condition:
          IpAddress:
            "aws:SourceIp": "203.0.113.0/24"
          DateGreaterThan:
            "aws:CurrentTime": "2024-01-01T00:00:00Z"
```

### Multi-Statement Policy

```yaml
config:
  policyDocument:
    Version: "2012-10-17"
    Statement:
      - Sid: "AllowS3Read"
        Effect: Allow
        Action:
          - "s3:GetObject"
          - "s3:ListBucket"
        Resource:
          - "arn:aws:s3:::data-bucket"
          - "arn:aws:s3:::data-bucket/*"
      
      - Sid: "AllowCloudWatchLogs"
        Effect: Allow
        Action:
          - "logs:CreateLogStream"
          - "logs:PutLogEvents"
        Resource:
          - "arn:aws:logs:*:*:log-group:/aws/lambda/data-processor"
      
      - Sid: "DenyDangerousActions"
        Effect: Deny
        Action:
          - "s3:DeleteBucket"
          - "iam:*"
        Resource: "*"
```

## Policy Validation and Security

### Validation Rules

The component automatically validates policies for:

- **Overly Permissive Permissions**: Identifies wildcards and broad access
- **Security Best Practices**: Enforces MFA, IP restrictions, and time bounds
- **Resource Specificity**: Ensures resources are explicitly defined
- **Compliance Requirements**: Validates against framework standards

### Security Analysis

```yaml
config:
  validation:
    enabled: true
    strictMode: true
    securityChecks:
      - no-wildcard-actions
      - no-wildcard-resources
      - require-mfa-for-sensitive-actions
      - enforce-encryption-in-transit
    complianceFrameworks:
      - fedramp-moderate
      - sox-compliance
```

## Monitoring and Observability

The component automatically configures:

- **CloudWatch Logs**: Policy usage and access patterns
- **AWS CloudTrail**: Policy changes and administrative actions
- **Access Analyzer**: Continuous policy analysis and recommendations
- **Config Rules**: Compliance monitoring and drift detection
- **Custom Metrics**: Policy effectiveness and usage statistics

### Monitoring Levels

- **Basic**: Policy creation and basic usage tracking
- **Enhanced**: Access pattern analysis + security recommendations
- **Comprehensive**: Enhanced + compliance monitoring + threat detection

## Template Library

### Common Templates

#### Lambda Function Templates
- `lambda-basic-execution`: CloudWatch Logs access
- `lambda-vpc-execution`: VPC networking permissions
- `lambda-s3-trigger`: S3 event processing
- `lambda-dynamodb-access`: DynamoDB read/write operations

#### S3 Access Templates
- `s3-read-only`: Read access to specific buckets/prefixes
- `s3-read-write`: Read/write with optional restrictions
- `s3-full-access`: Full S3 access (use with caution)
- `s3-cross-account`: Cross-account bucket access

#### Database Templates
- `rds-read-only`: RDS read permissions
- `rds-read-write`: RDS read/write permissions
- `dynamodb-read-only`: DynamoDB read operations
- `dynamodb-read-write`: DynamoDB full access

#### Power User Templates
- `power-user`: Broad AWS access excluding IAM
- `developer-access`: Development environment permissions
- `read-only-access`: Read-only access across services

## Policy Testing and Simulation

### Policy Simulator Integration

```yaml
config:
  testing:
    enabled: true
    simulationTests:
      - action: "s3:GetObject"
        resource: "arn:aws:s3:::test-bucket/file.txt"
        expectedResult: "Allow"
      - action: "s3:DeleteObject"
        resource: "arn:aws:s3:::test-bucket/file.txt"
        expectedResult: "Deny"
```

### Access Analysis

```yaml
config:
  accessAnalyzer:
    enabled: true
    findings:
      - unusedAccess
      - externalAccess
      - publicAccess
    alerting:
      enabled: true
      snsTopicArn: arn:aws:sns:us-east-1:123456789012:policy-alerts
```

## Troubleshooting

### Common Issues

1. **Policy Too Restrictive**
   - Use AWS CloudTrail to identify denied actions
   - Run policy simulator to test permissions
   - Review Access Analyzer recommendations

2. **Policy Too Permissive**
   - Enable Access Analyzer for unused access detection
   - Review CloudWatch metrics for actual usage
   - Implement least-privilege recommendations

3. **Condition Errors**
   - Validate condition syntax and values
   - Test conditions with policy simulator
   - Review CloudTrail for condition evaluation

### Debug Mode

Enable detailed policy analysis:

```yaml
config:
  validation:
    enabled: true
    verboseLogging: true
    generateRecommendations: true
```

## Examples

See the [`examples/`](../../examples/) directory for complete service templates:

- `examples/data-access-policies/` - Data lake and analytics policies
- `examples/microservice-policies/` - Service-specific access patterns
- `examples/compliance-policies/` - Compliance-focused policy templates

## API Reference

### IamPolicyComponent

Main component class that extends `Component`.

#### Methods

- `synth()`: Creates AWS resources (IAM Policy, validation rules)
- `getCapabilities()`: Returns security:iam-policy capability
- `getType()`: Returns 'iam-policy'

### Configuration Interfaces

- `IamPolicyConfig`: Main configuration interface
- `IAM_POLICY_CONFIG_SCHEMA`: JSON schema for validation

## Development

To contribute to this component:

1. Make changes to the source code
2. Run tests: `npm test`
3. Build: `npm run build`
4. Follow the [Contributing Guide](../../../CONTRIBUTING.md)

## License

MIT License - see LICENSE file for details.