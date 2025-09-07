# EC2 Instance Component

A comprehensive, enterprise-grade EC2 Instance component that implements the Platform Binding & Trigger Specification v1.0. This component provides secure, compliant EC2 instances with automatic hardening based on your compliance framework requirements.

## Features

### 🏗️ **Enterprise Architecture**
- **Flexible Instance Configuration**: Support for various instance types, AMIs, and storage options
- **VPC Integration**: Seamless integration with existing VPCs, subnets, and security groups
- **User Data Support**: Flexible user data scripts for instance initialization
- **Key Pair Management**: SSH access control through EC2 key pairs

### 🔐 **Multi-Tier Compliance Support**
- **Commercial**: Cost-optimized configuration with basic monitoring
- **FedRAMP Moderate**: Enhanced security with encryption, detailed monitoring, and SSM
- **FedRAMP High**: Maximum security with customer-managed KMS keys, STIG compliance, and Nitro Enclaves

### 🛡️ **Security & Monitoring**
- **IAM Integration**: Least-privilege instance profiles with framework-specific policies
- **EBS Encryption**: Automatic encryption with compliance-appropriate key management
- **Security Groups**: Configurable network access controls with compliance restrictions
- **CloudWatch Integration**: Comprehensive monitoring with agent installation and log forwarding

## Quick Start

### Basic Usage

```yaml
components:
  - name: web-server
    type: ec2-instance
    config:
      instanceType: t3.small
      userData:
        script: |
          #!/bin/bash
          yum update -y
          yum install -y httpd
          systemctl start httpd
          systemctl enable httpd
```

### VPC Integration

```yaml
components:
  - name: app-server
    type: ec2-instance
    config:
      instanceType: t3.medium
      vpc:
        vpcId: vpc-12345678
        subnetId: subnet-87654321
        securityGroupIds:
          - sg-additional1
          - sg-additional2
      keyPair:
        keyName: my-ssh-key
```

### Storage Configuration

```yaml
components:
  - name: data-server
    type: ec2-instance
    config:
      instanceType: m5.large
      storage:
        rootVolumeSize: 100
        rootVolumeType: gp3
        encrypted: true
        deleteOnTermination: false
```

### Custom AMI

```yaml
components:
  - name: custom-server
    type: ec2-instance
    config:
      ami:
        amiId: ami-0abcdef1234567890
      instanceType: c5.xlarge
```

## Configuration Reference

### Instance Configuration

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `instanceType` | string | `t3.micro` | EC2 instance type |
| `ami.amiId` | string | - | Specific AMI ID to use |
| `ami.namePattern` | string | `amzn2-ami-hvm-*-x86_64-gp2` | AMI name pattern for lookup |
| `ami.owner` | string | `amazon` | AMI owner for lookup |

### VPC Configuration

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `vpc.vpcId` | string | Default VPC | VPC ID to deploy into |
| `vpc.subnetId` | string | Auto-selected | Specific subnet for the instance |
| `vpc.securityGroupIds` | string[] | - | Additional security group IDs |

### Storage Configuration

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `storage.rootVolumeSize` | number | 20 | Root volume size in GB |
| `storage.rootVolumeType` | string | `gp3` | EBS volume type |
| `storage.encrypted` | boolean | `false` | Enable EBS encryption |
| `storage.kmsKeyArn` | string | - | Custom KMS key ARN |
| `storage.deleteOnTermination` | boolean | `true` | Delete volume on termination |

### Monitoring Configuration

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `monitoring.detailed` | boolean | `false` | Enable detailed CloudWatch monitoring |
| `monitoring.cloudWatchAgent` | boolean | `false` | Install CloudWatch agent |

### Security Configuration

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `security.requireImdsv2` | boolean | `false` | Require IMDSv2 for metadata |
| `security.httpTokens` | string | `optional` | Metadata service token requirement |
| `security.nitroEnclaves` | boolean | `false` | Enable AWS Nitro Enclaves |

## Compliance Frameworks

### Commercial (Default)
- **Instance Type**: `t3.micro` (cost-optimized)
- **Storage**: 20GB unencrypted GP3
- **Monitoring**: Basic CloudWatch metrics
- **Security**: Standard configuration

### FedRAMP Moderate
- **Instance Type**: `t3.medium` (performance for compliance workloads)
- **Storage**: 50GB encrypted EBS with AWS-managed keys
- **Monitoring**: Detailed CloudWatch + agent installation
- **Security**: IMDSv2 required, SSM integration
- **Additional**: Enhanced logging, security group restrictions

### FedRAMP High
- **Instance Type**: `m5.large` (enhanced performance)
- **Storage**: 100GB encrypted with customer-managed KMS keys
- **Monitoring**: Full observability stack with centralized logging
- **Security**: Nitro Enclaves, STIG hardening, immutable infrastructure
- **Additional**: Advanced security agents, compliance tagging

## Capabilities

The component provides the `compute:ec2` capability with the following properties:

```yaml
compute:ec2:
  instanceId: "i-1234567890abcdef0"
  privateIp: "10.0.1.100"
  publicIp: "52.123.45.67"
  roleArn: "arn:aws:iam::123456789012:role/service-instance-role"
  securityGroupId: "sg-0123456789abcdef0"
  availabilityZone: "us-east-1a"
```

## Binding Examples

### Lambda to EC2

```yaml
# Lambda function that needs to invoke operations on the EC2 instance
components:
  - name: worker-function
    type: lambda-worker
    bindings:
      - target: web-server
        capability: compute:ec2
        permissions:
          - ssm:SendCommand
          - ssm:GetCommandInvocation
```

### Application Load Balancer to EC2

```yaml
# ALB targeting the EC2 instance
components:
  - name: load-balancer
    type: application-load-balancer
    bindings:
      - target: web-server
        capability: compute:ec2
        permissions:
          - ec2:DescribeInstances
```

## Monitoring and Observability

### CloudWatch Metrics
- **Instance Metrics**: CPU, memory, disk, network utilization
- **Custom Metrics**: Application-specific metrics via CloudWatch agent
- **Detailed Monitoring**: 1-minute resolution for compliance frameworks

### Logging
- **System Logs**: `/var/log/messages` forwarded to CloudWatch Logs
- **Application Logs**: Configurable log group per service
- **Centralized Logging**: Rsyslog forwarding for FedRAMP High

### Alerting
- **Health Checks**: Instance status and reachability
- **Performance**: CPU, memory, and disk thresholds
- **Security**: Login attempts, privilege escalation events

## Security Features

### Network Security
- **Security Groups**: Least-privilege network access
- **Private Subnets**: Compliance frameworks use private subnets by default
- **Egress Control**: Restricted outbound traffic for compliance

### Data Protection
- **EBS Encryption**: At-rest encryption with compliance-appropriate keys
- **In-Transit**: TLS for all data transmission
- **Key Management**: AWS or customer-managed KMS keys

### Access Control
- **IAM Roles**: Instance profiles with minimal required permissions
- **SSH Access**: Key-based authentication only
- **Session Manager**: SSM-based access for compliance frameworks

### Compliance Hardening
- **STIG**: Security Technical Implementation Guide compliance
- **CIS**: Center for Internet Security benchmarks
- **AIDE**: Advanced Intrusion Detection Environment
- **Auditd**: Comprehensive audit logging

## Troubleshooting

### Common Issues

**Instance fails to start**
- Check instance type availability in the region
- Verify VPC and subnet configuration
- Review security group rules
- Check AMI availability and permissions

**Cannot connect via SSH**
- Verify key pair is correctly specified
- Check security group allows SSH (port 22)
- Ensure instance is in a public subnet or accessible via VPN
- For compliance instances, use Session Manager instead

**EBS encryption issues**
- Verify KMS key permissions for EC2 service
- Check that the specified KMS key exists and is enabled
- For FedRAMP, ensure customer-managed keys are properly configured

**CloudWatch agent not reporting**
- Check IAM permissions for CloudWatch
- Verify agent configuration and installation
- Review instance logs for agent errors
- Ensure proper network connectivity to CloudWatch

### Debug Commands

```bash
# Check instance status
aws ec2 describe-instance-status --instance-ids i-1234567890abcdef0

# View CloudWatch agent logs
sudo tail -f /opt/aws/amazon-cloudwatch-agent/logs/amazon-cloudwatch-agent.log

# Check SSM agent status
sudo systemctl status amazon-ssm-agent

# Verify security group rules
aws ec2 describe-security-groups --group-ids sg-0123456789abcdef0
```

## Advanced Configuration

### Multi-AZ Deployment

```yaml
components:
  - name: web-server-1a
    type: ec2-instance
    config:
      vpc:
        subnetId: subnet-1a-private
  - name: web-server-1b
    type: ec2-instance
    config:
      vpc:
        subnetId: subnet-1b-private
```

### Auto Scaling Integration

```yaml
# Use with Auto Scaling Group component
components:
  - name: web-servers
    type: auto-scaling-group
    config:
      launchTemplate:
        instanceType: t3.medium
        # EC2 instance configuration applied to launch template
```

### Custom Security Configuration

```yaml
components:
  - name: secure-server
    type: ec2-instance
    config:
      security:
        requireImdsv2: true
        httpTokens: required
        nitroEnclaves: true
      monitoring:
        detailed: true
        cloudWatchAgent: true
```