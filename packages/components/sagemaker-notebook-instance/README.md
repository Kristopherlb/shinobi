# SageMaker Notebook Instance Component

Enterprise-grade AWS SageMaker Notebook Instance for machine learning development and experimentation with comprehensive security and compliance controls.

## Overview

This component provides a fully managed SageMaker Notebook Instance with:

- **Jupyter Environment**: Pre-configured ML frameworks and development tools
- **Security Hardening**: IAM roles, KMS encryption, and network isolation
- **Compliance Features**: Three-tier compliance support (Commercial/FedRAMP Moderate/FedRAMP High)
- **Development Tools**: Git integration, lifecycle management, and custom repositories
- **Resource Optimization**: Configurable instance types and storage options

## Capabilities

- **ml:notebook**: Provides machine learning development environment for data scientists

## Configuration

```yaml
components:
  - name: ml-development
    type: sagemaker-notebook-instance
    config:
      notebookInstanceName: DataScienceWorkbench
      instanceType: ml.m5.xlarge
      
      subnetId: subnet-12345678
      securityGroupIds:
        - sg-notebook-access
      
      kmsKeyId: arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012
      
      rootAccess: Disabled
      directInternetAccess: Disabled
      volumeSizeInGB: 100
      
      defaultCodeRepository: https://github.com/company/ml-projects
      additionalCodeRepositories:
        - https://github.com/company/shared-notebooks
        - https://github.com/company/data-utils
      
      lifecycleConfigName: ml-notebook-lifecycle
      platformIdentifier: notebook-al2-v2
      
      instanceMetadataServiceConfiguration:
        minimumInstanceMetadataServiceVersion: "2"
      
      tags:
        team: data-science
        environment: development
        cost-center: ml-ops
```

## Binding Examples

### S3 Bucket for Data Access

```yaml
components:
  - name: ml-datasets
    type: s3-bucket
    config:
      bucketName: company-ml-datasets
    binds:
      - from: ml-development
        capability: storage:s3
        access: read-write
```

This binding allows the notebook instance to:
- Access training datasets from S3
- Store model artifacts and outputs
- Manage experiment data and results

## Compliance Features

### Commercial
- Basic security configuration
- Root access enabled by default
- Internet access for package installations
- Cost-optimized instance types (ml.t3.medium)

### FedRAMP Moderate
- Root access disabled for security
- VPC-only networking (no direct internet)
- Enhanced instance types (ml.m5.large+)
- Comprehensive audit logging
- KMS encryption enabled
- IMDSv2 enforcement

### FedRAMP High
- Strict security controls (root access disabled)
- High-performance instances (ml.m5.xlarge+)
- Enhanced storage allocation (200GB+)
- Comprehensive security monitoring
- 10-year audit log retention
- Advanced threat detection

## Advanced Configuration

### Custom Lifecycle Configuration

```yaml
config:
  lifecycleConfigName: custom-ml-setup
  lifecycleScript: |
    #!/bin/bash
    # Install custom ML libraries
    pip install --upgrade torch transformers
    
    # Configure Jupyter extensions
    jupyter contrib nbextension install --user
    
    # Set up git configuration
    git config --global user.name "ML Team"
    git config --global user.email "ml-team@company.com"
```

### Multiple Code Repositories

```yaml
config:
  defaultCodeRepository: https://github.com/company/main-project
  additionalCodeRepositories:
    - https://github.com/company/shared-utilities
    - https://github.com/company/model-templates
    - https://github.com/company/data-preprocessing
```

### Custom IAM Role

```yaml
config:
  roleArn: arn:aws:iam::123456789012:role/CustomSageMakerRole
  # Custom role with specific permissions for your ML workflows
```

## Monitoring and Observability

The component automatically configures:

- **CloudWatch Logs**: Jupyter server logs and system metrics
- **Instance Monitoring**: CPU, memory, and disk utilization
- **Security Monitoring**: Access patterns and security events
- **Cost Tracking**: Instance usage and billing alerts
- **Audit Trails**: User activity and data access logs

### Monitoring Levels

- **Basic**: Instance health and basic usage metrics
- **Enhanced**: Detailed performance metrics + security logs
- **Comprehensive**: Enhanced + audit trails + compliance monitoring

## Security Features

### Network Security
- VPC-based deployment for network isolation
- Security group restrictions for controlled access
- No direct internet access (compliance frameworks)
- Private subnet deployment options

### Data Protection
- KMS encryption for storage volumes
- Encrypted communication channels
- Data residency compliance
- Secure model artifact storage

### Access Control
- IAM role-based permissions
- Root access control (disabled for compliance)
- Session-based authentication
- Multi-factor authentication support

## Development Workflows

### Model Development

```python
# Example notebook workflow
import sagemaker
from sagemaker.tensorflow import TensorFlow

# Initialize SageMaker session
sess = sagemaker.Session()

# Define training job
estimator = TensorFlow(
    entry_point='train.py',
    role=sagemaker.get_execution_role(),
    instance_count=1,
    instance_type='ml.p3.2xlarge',
    framework_version='2.8'
)

# Start training
estimator.fit({'training': 's3://ml-datasets/training-data'})
```

### Data Exploration

```python
# Access datasets from bound S3 bucket
import boto3
import pandas as pd

s3 = boto3.client('s3')
df = pd.read_csv('s3://company-ml-datasets/customer-data.csv')

# Perform exploratory data analysis
print(df.describe())
print(df.info())
```

## Instance Types and Sizing

### General Purpose
- **ml.t3.medium**: Development and testing (2 vCPU, 4GB RAM)
- **ml.m5.large**: Regular ML workflows (2 vCPU, 8GB RAM)
- **ml.m5.xlarge**: Large datasets (4 vCPU, 16GB RAM)

### Compute Optimized
- **ml.c5.xlarge**: CPU-intensive preprocessing (4 vCPU, 8GB RAM)
- **ml.c5.2xlarge**: Large-scale feature engineering (8 vCPU, 16GB RAM)

### GPU-Enabled
- **ml.p3.2xlarge**: Deep learning training (8 vCPU, 61GB RAM, 1 V100 GPU)
- **ml.g4dn.xlarge**: ML inference development (4 vCPU, 16GB RAM, 1 T4 GPU)

## Storage Configuration

### Root Volume Sizing

```yaml
config:
  volumeSizeInGB: 200  # Increase for large datasets
  # Note: Cannot be decreased after creation
```

### External Storage Access

```yaml
# Bind to EFS for shared storage
binds:
  - to: shared-ml-storage
    capability: filesystem:efs
    access: read-write
```

## Git Integration

### Repository Access

```yaml
config:
  defaultCodeRepository: https://github.com/company/ml-main
  # Supports both public and private repositories
  gitCredentials: # For private repos
    username: git-user
    token: github-personal-access-token
```

### Branch Management

```bash
# Within notebook environment
git checkout feature/new-model
git pull origin main
git push origin feature/new-model
```

## Troubleshooting

### Common Issues

1. **Notebook Won't Start**
   - Check IAM role permissions
   - Verify subnet and security group configuration
   - Ensure KMS key access permissions

2. **Package Installation Failures**
   - Check internet access configuration
   - Verify pip/conda repository access
   - Review lifecycle configuration scripts

3. **Git Repository Access**
   - Verify repository URLs and credentials
   - Check network connectivity to Git providers
   - Ensure proper SSH key configuration

### Debug Mode

Enable detailed logging:

```yaml
config:
  tags:
    debug: "true"
    log-level: "DEBUG"
```

## Examples

See the [`examples/`](../../examples/) directory for complete service templates:

- `examples/ml-pipeline/` - End-to-end ML workflow
- `examples/data-science-platform/` - Multi-user data science environment
- `examples/model-development/` - Model training and deployment

## API Reference

### SageMakerNotebookInstanceComponent

Main component class that extends `Component`.

#### Methods

- `synth()`: Creates AWS resources (Notebook Instance, IAM Role, Security Groups)
- `getCapabilities()`: Returns ml:notebook capability
- `getType()`: Returns 'sagemaker-notebook-instance'

### Configuration Interfaces

- `SageMakerNotebookInstanceConfig`: Main configuration interface
- `SAGEMAKER_NOTEBOOK_INSTANCE_CONFIG_SCHEMA`: JSON schema for validation

## Development

To contribute to this component:

1. Make changes to the source code
2. Run tests: `npm test`
3. Build: `npm run build`
4. Follow the [Contributing Guide](../../../CONTRIBUTING.md)

## License

MIT License - see LICENSE file for details.