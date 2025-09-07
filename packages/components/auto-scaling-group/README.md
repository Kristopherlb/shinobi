# Auto Scaling Group Component

Enterprise-grade Auto Scaling Group component with launch template, compliance hardening, and advanced monitoring capabilities.

## Overview

This component provides a fully managed Amazon EC2 Auto Scaling Group with:

- **Launch Template**: Standardized instance configuration with user data
- **Compliance Hardening**: Three-tier compliance support (Commercial/FedRAMP Moderate/FedRAMP High)
- **Security**: IAM roles, security groups, and encryption
- **Monitoring**: CloudWatch integration and optional detailed monitoring
- **Flexibility**: Configurable scaling policies, health checks, and update strategies

## Capabilities

- **compute:asg**: Provides Auto Scaling Group connectivity for other components

## Configuration

```yaml
components:
  - name: web-servers
    type: auto-scaling-group
    config:
      launchTemplate:
        instanceType: t3.medium
        ami:
          namePattern: "amzn2-ami-hvm-*-x86_64-gp2"
          owner: amazon
        userData: |
          #!/bin/bash
          yum update -y
          yum install -y httpd
          systemctl start httpd
          systemctl enable httpd
        keyName: my-key-pair
      
      autoScaling:
        minCapacity: 2
        maxCapacity: 10
        desiredCapacity: 4
      
      vpc:
        vpcId: vpc-12345678
        subnetIds:
          - subnet-12345678
          - subnet-87654321
        securityGroupIds:
          - sg-12345678
      
      storage:
        rootVolumeSize: 50
        rootVolumeType: gp3
        encrypted: true
        kmsKeyArn: arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012
      
      healthCheck:
        type: ELB
        gracePeriod: 300
      
      terminationPolicies:
        - OldestInstance
        - Default
      
      updatePolicy:
        rollingUpdate:
          minInstancesInService: 2
          maxBatchSize: 2
          pauseTime: PT5M
```

## Binding Examples

### Lambda Function to Auto Scaling Group

```yaml
components:
  - name: api
    type: lambda-api
    config:
      handler: src/handler.main
    binds:
      - to: web-servers
        capability: compute:asg
        access: describe
```

This binding allows the Lambda function to:
- Describe Auto Scaling Group instances
- Access instance metadata
- Integrate with scaling policies

## Compliance Features

### Commercial
- Basic monitoring and logging
- Cost-optimized instance types
- Standard security configurations

### FedRAMP Moderate
- Enhanced monitoring with SSM agent
- Medium instance types minimum (t3.medium)
- EBS encryption enabled
- Enhanced logging retention
- Security group egress restrictions

### FedRAMP High
- Comprehensive monitoring and auditing
- Large instance types minimum (m5.large)
- Customer-managed KMS keys
- IMDSv2 enforcement
- STIG compliance tagging
- Maximum security hardening

## Advanced Configuration

### Custom AMI

```yaml
launchTemplate:
  ami:
    amiId: ami-12345678  # Use specific AMI
```

### Multiple Security Groups

```yaml
vpc:
  securityGroupIds:
    - sg-web-tier
    - sg-monitoring
    - sg-backup
```

### Custom User Data Script

```yaml
launchTemplate:
  userData: |
    #!/bin/bash
    yum update -y
    
    # Install application dependencies
    yum install -y docker
    systemctl start docker
    systemctl enable docker
    
    # Configure monitoring
    yum install -y amazon-cloudwatch-agent
    
    # Custom application setup
    /opt/myapp/install.sh
```

### Advanced Update Policy

```yaml
updatePolicy:
  rollingUpdate:
    minInstancesInService: 3
    maxBatchSize: 1
    pauseTime: PT10M  # 10 minute pause between batches
```

## Monitoring and Observability

The component automatically configures:

- **CloudWatch Metrics**: CPU, memory, disk, and network metrics
- **CloudWatch Logs**: System and application logs
- **AWS X-Ray**: Distributed tracing (compliance frameworks)
- **AWS Systems Manager**: Session Manager and patch management
- **Custom Metrics**: Application-specific metrics via CloudWatch Agent

### Monitoring Levels

- **Basic**: Standard CloudWatch metrics
- **Enhanced**: Detailed monitoring + custom metrics
- **Comprehensive**: Enhanced + distributed tracing + security monitoring

## Security Features

### IAM Roles and Policies
- Least-privilege instance roles
- SSM agent permissions for compliance frameworks
- CloudWatch Logs permissions
- Optional S3 access for application data

### Security Groups
- Configurable ingress/egress rules
- Compliance-based restrictions
- Support for multiple security groups

### Encryption
- EBS volume encryption (automatic for compliance frameworks)
- Customer-managed KMS keys
- Key rotation support

## Scaling Policies

The Auto Scaling Group can be configured with additional scaling policies:

```yaml
# Note: Scaling policies would typically be configured
# through a separate auto-scaling-policy component
```

## Troubleshooting

### Common Issues

1. **Instance Launch Failures**
   - Check AMI availability in the target region
   - Verify subnet capacity and availability zones
   - Ensure security groups allow necessary traffic

2. **Health Check Failures**
   - Verify health check grace period is sufficient
   - Check application startup time
   - Ensure health check endpoints are responding

3. **Scaling Issues**
   - Check CloudWatch alarms and scaling policies
   - Verify IAM permissions for Auto Scaling
   - Review service limits and quotas

### Debug Mode

Enable detailed logging by setting component labels:

```yaml
labels:
  debug: "true"
  log-level: "DEBUG"
```

## Examples

See the [`examples/`](../../examples/) directory for complete service templates using this component:

- `examples/web-application/` - Multi-tier web application
- `examples/batch-processing/` - Batch processing workload
- `examples/microservices/` - Microservices architecture

## API Reference

### AutoScalingGroupComponent

Main component class that extends `Component`.

#### Methods

- `synth()`: Creates the AWS resources (Auto Scaling Group, Launch Template, etc.)
- `getCapabilities()`: Returns compute:asg capability
- `getType()`: Returns 'auto-scaling-group'

### Configuration Interfaces

- `AutoScalingGroupConfig`: Main configuration interface
- `AUTO_SCALING_GROUP_CONFIG_SCHEMA`: JSON schema for validation

## Development

To contribute to this component:

1. Make changes to the source code
2. Run tests: `npm test`
3. Build: `npm run build`
4. Follow the [Contributing Guide](../../../CONTRIBUTING.md)

## License

MIT License - see LICENSE file for details.