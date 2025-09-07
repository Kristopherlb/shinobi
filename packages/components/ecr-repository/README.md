# ECR Repository Component

Enterprise-grade Amazon Elastic Container Registry (ECR) for secure container image storage with advanced security scanning, lifecycle management, and compliance features.

## Overview

This component provides a fully managed ECR repository with:

- **Container Security**: Automated vulnerability scanning and image signing
- **Lifecycle Management**: Automated image cleanup and retention policies
- **Access Control**: Fine-grained IAM policies and cross-account access
- **Compliance Hardening**: Three-tier compliance support (Commercial/FedRAMP Moderate/FedRAMP High)
- **Cost Optimization**: Intelligent storage management and cleanup policies

## Capabilities

- **registry:ecr**: Provides container registry connectivity for containerized applications

## Configuration

```yaml
components:
  - name: app-registry
    type: ecr-repository
    config:
      repositoryName: company/web-application
      
      imageScanningConfiguration:
        scanOnPush: true
        scanFilters:
          - HIGH
          - CRITICAL
      
      imageTagMutability: IMMUTABLE
      
      lifecyclePolicy:
        rules:
          - rulePriority: 1
            selection:
              tagStatus: UNTAGGED
              countType: sinceImagePushed
              countUnit: days
              countNumber: 7
            action:
              type: expire
          
          - rulePriority: 2
            selection:
              tagStatus: TAGGED
              tagPrefixList: ["v"]
              countType: imageCountMoreThan
              countNumber: 10
            action:
              type: expire
      
      encryptionConfiguration:
        encryptionType: KMS
        kmsKey: arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012
      
      repositoryPolicyText: |
        {
          "Version": "2012-10-17",
          "Statement": [
            {
              "Sid": "AllowPull",
              "Effect": "Allow",
              "Principal": {
                "AWS": "arn:aws:iam::123456789012:role/ECSTaskRole"
              },
              "Action": [
                "ecr:BatchGetImage",
                "ecr:GetDownloadUrlForLayer"
              ]
            }
          ]
        }
      
      tags:
        application: web-app
        team: platform
        backup-required: "true"
```

## Binding Examples

### ECS Service to ECR Repository

```yaml
components:
  - name: web-service
    type: ecs-fargate-service
    config:
      taskDefinition:
        containerDefinitions:
          - name: web-app
            image: ${app-registry.repositoryUri}:latest
    binds:
      - to: app-registry
        capability: registry:ecr
        access: pull
```

### CI/CD Pipeline Access

```yaml
components:
  - name: build-pipeline
    type: iam-role
    config:
      roleName: CodeBuildServiceRole
    binds:
      - to: app-registry
        capability: registry:ecr
        access: push
```

## Compliance Features

### Commercial
- Basic image scanning on push
- Standard lifecycle policies
- AWS managed encryption

### FedRAMP Moderate
- Enhanced vulnerability scanning (HIGH + CRITICAL)
- Customer-managed KMS encryption
- Comprehensive audit logging
- Immutable image tags enforced
- 1-year audit log retention

### FedRAMP High
- Comprehensive vulnerability scanning (all levels)
- Advanced threat detection integration
- Enhanced audit logging with detailed access patterns
- Mandatory image signing and verification
- 10-year audit log retention
- Strict access controls with cross-account policies

## Advanced Configuration

### Multi-Stage Lifecycle Policy

```yaml
config:
  lifecyclePolicy:
    rules:
      # Clean up untagged images after 1 day
      - rulePriority: 1
        selection:
          tagStatus: UNTAGGED
          countType: sinceImagePushed
          countUnit: days
          countNumber: 1
        action:
          type: expire
      
      # Keep only 5 latest production images
      - rulePriority: 2
        selection:
          tagStatus: TAGGED
          tagPrefixList: ["prod-"]
          countType: imageCountMoreThan
          countNumber: 5
        action:
          type: expire
      
      # Clean up old development images
      - rulePriority: 3
        selection:
          tagStatus: TAGGED
          tagPrefixList: ["dev-", "feature-"]
          countType: sinceImagePushed
          countUnit: days
          countNumber: 14
        action:
          type: expire
```

### Cross-Account Access Policy

```yaml
config:
  repositoryPolicyText: |
    {
      "Version": "2012-10-17",
      "Statement": [
        {
          "Sid": "AllowCrossAccountPull",
          "Effect": "Allow",
          "Principal": {
            "AWS": [
              "arn:aws:iam::111122223333:root",
              "arn:aws:iam::444455556666:root"
            ]
          },
          "Action": [
            "ecr:BatchGetImage",
            "ecr:GetDownloadUrlForLayer",
            "ecr:BatchCheckLayerAvailability"
          ]
        }
      ]
    }
```

### Enhanced Scanning Configuration

```yaml
config:
  imageScanningConfiguration:
    scanOnPush: true
    scanFilters:
      - HIGH
      - CRITICAL
      - MEDIUM
    enhancedScanning:
      enabled: true
      scanningFrequency: CONTINUOUS_SCAN
      findings:
        autoRemediation: true
        notificationArn: arn:aws:sns:us-east-1:123456789012:security-alerts
```

## Monitoring and Observability

The component automatically configures:

- **CloudWatch Metrics**: Repository size, image count, scan results
- **CloudWatch Events**: Image push/pull events, scan completion
- **Security Findings**: Vulnerability scan results and trends
- **Cost Tracking**: Storage costs and data transfer metrics
- **Audit Trails**: All repository access and administrative actions

### Monitoring Levels

- **Basic**: Repository metrics and basic scanning
- **Enhanced**: Detailed scan results + lifecycle monitoring
- **Comprehensive**: Enhanced + security analytics + compliance reporting

## Security Features

### Vulnerability Scanning
- Automated scanning on image push
- Continuous vulnerability monitoring
- Integration with AWS Security Hub
- Custom scan filters and thresholds

### Encryption and Data Protection
- Encryption at rest with KMS
- Image layer encryption
- Customer-managed encryption keys
- Key rotation support

### Access Control
- IAM-based repository policies
- Cross-account access controls
- Service-specific permissions
- Resource-based policies

## Container Image Management

### Image Tagging Strategies

```bash
# Semantic versioning
docker tag myapp:latest 123456789012.dkr.ecr.us-east-1.amazonaws.com/company/web-application:v1.2.3

# Git commit SHA
docker tag myapp:latest 123456789012.dkr.ecr.us-east-1.amazonaws.com/company/web-application:sha-abc1234

# Environment-specific
docker tag myapp:latest 123456789012.dkr.ecr.us-east-1.amazonaws.com/company/web-application:prod-v1.2.3
```

### CI/CD Integration

```bash
# Authenticate Docker to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 123456789012.dkr.ecr.us-east-1.amazonaws.com

# Build and push
docker build -t company/web-application .
docker tag company/web-application:latest 123456789012.dkr.ecr.us-east-1.amazonaws.com/company/web-application:latest
docker push 123456789012.dkr.ecr.us-east-1.amazonaws.com/company/web-application:latest
```

### Multi-Architecture Support

```yaml
config:
  repositoryName: company/multi-arch-app
  # Supports multiple architectures automatically
  # Examples: linux/amd64, linux/arm64
```

## Lifecycle Management

### Automated Cleanup Policies

```yaml
config:
  lifecyclePolicy:
    rules:
      # Keep only latest 10 images with 'latest' tag
      - rulePriority: 1
        selection:
          tagStatus: TAGGED
          tagPrefixList: ["latest"]
          countType: imageCountMoreThan
          countNumber: 1
        action:
          type: expire
      
      # Remove untagged images older than 3 days
      - rulePriority: 2
        selection:
          tagStatus: UNTAGGED
          countType: sinceImagePushed
          countUnit: days
          countNumber: 3
        action:
          type: expire
```

### Cost Optimization

- Automated cleanup of unused images
- Lifecycle policies for different environments
- Storage class optimization
- Transfer cost management

## Security Scanning

### Scan Result Analysis

```bash
# Get scan results
aws ecr describe-image-scan-findings \
  --repository-name company/web-application \
  --image-id imageTag=v1.2.3

# List repositories with scan results
aws ecr describe-repositories \
  --repository-names company/web-application
```

### Automated Response to Findings

```yaml
config:
  scanningConfiguration:
    autoRemediation:
      enabled: true
      highSeverityAction: BLOCK_DEPLOYMENT
      criticalSeverityAction: QUARANTINE
    notifications:
      snsTopicArn: arn:aws:sns:us-east-1:123456789012:security-findings
```

## Troubleshooting

### Common Issues

1. **Authentication Failures**
   - Verify IAM permissions for ECR actions
   - Check Docker login credentials and expiration
   - Ensure AWS CLI is configured correctly

2. **Image Push/Pull Failures**
   - Check repository policies and cross-account access
   - Verify network connectivity and VPC endpoints
   - Review image size limits and quotas

3. **Scanning Issues**
   - Verify scanning configuration is enabled
   - Check for scan-on-push settings
   - Review security findings and thresholds

### Debug Mode

Enable detailed logging for troubleshooting:

```yaml
config:
  tags:
    debug: "true"
    detailed-monitoring: "enabled"
```

## Examples

See the [`examples/`](../../examples/) directory for complete service templates:

- `examples/containerized-app/` - Full containerized application deployment
- `examples/ci-cd-pipeline/` - Container build and deployment pipeline
- `examples/multi-env-registry/` - Multi-environment registry setup

## API Reference

### EcrRepositoryComponent

Main component class that extends `Component`.

#### Methods

- `synth()`: Creates AWS resources (ECR Repository, lifecycle policies, scanning config)
- `getCapabilities()`: Returns registry:ecr capability  
- `getType()`: Returns 'ecr-repository'

### Configuration Interfaces

- `EcrRepositoryConfig`: Main configuration interface
- `ECR_REPOSITORY_CONFIG_SCHEMA`: JSON schema for validation

## Development

To contribute to this component:

1. Make changes to the source code
2. Run tests: `npm test`
3. Build: `npm run build`
4. Follow the [Contributing Guide](../../../CONTRIBUTING.md)

## License

MIT License - see LICENSE file for details.