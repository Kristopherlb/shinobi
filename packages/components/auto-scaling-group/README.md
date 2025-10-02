# AutoScalingGroupComponent Component

Auto Scaling Group Component with comprehensive security, monitoring, and compliance features.

## Overview

The AutoScalingGroupComponent component provides:

- **Production-ready** auto scaling group component functionality
- **Comprehensive compliance** (Commercial, FedRAMP Moderate/High)
- **Integrated monitoring** and observability with OpenTelemetry
- **Security-first** configuration with secure defaults
- **Platform integration** with other components
- **CDK Nag** security validation and compliance checking

### Category: compute

### AWS Service: AUTOSCALING

This component manages AUTOSCALING resources and provides a simplified, secure interface for common use cases.

## Features

- Internet-facing or internal Auto Scaling Group with dual-stack support
- Launch template configuration with AMI selection and user data
- Comprehensive security hardening (IMDSv2, encryption, STIG compliance)
- Integrated CloudWatch monitoring with custom metrics
- OpenTelemetry observability with distributed tracing
- CDK Nag security validation with proper suppressions
- Compliance-aware configuration (Commercial, FedRAMP Moderate/High)
- Automatic agent installation (SSM, CloudWatch, STIG hardening)

## Usage Example

### Basic Configuration

```yaml
service: my-service
owner: platform-team
complianceFramework: commercial

components:
  - name: my-auto-scaling-group
    type: auto-scaling-group
    config:
      description: "Production auto-scaling-group instance"
      launchTemplate:
        instanceType: "t3.medium"
        detailedMonitoring: true
        requireImdsv2: true
        installAgents:
          ssm: true
          cloudwatch: true
          stigHardening: false
      autoScaling:
        minCapacity: 2
        maxCapacity: 10
        desiredCapacity: 3
      storage:
        rootVolumeSize: 50
        rootVolumeType: "gp3"
        encrypted: true
      vpc:
        subnetType: "PRIVATE_WITH_EGRESS"
        allowAllOutbound: false
      monitoring:
        enabled: true
        alarms:
          cpuHigh:
            enabled: true
            threshold: 80
          inService:
            enabled: true
            threshold: 2
```

## Configuration Reference

### Root Configuration

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `name` | string | No | Optional friendly name override for the Auto Scaling Group |
| `description` | string | No | Human readable description used for tagging and logging |
| `launchTemplate` | object | Yes | Launch template defaults applied to every Auto Scaling Group instance |
| `autoScaling` | object | Yes | Auto scaling capacity bounds and desired state |
| `storage` | object | Yes | Root volume configuration for instances |
| `healthCheck` | object | Yes | Health check strategy controlling replacement semantics |
| `terminationPolicies` | array | Yes | Ordered termination policies applied during scale-in events |
| `vpc` | object | Yes | Network placement and connectivity configuration |
| `security` | object | Yes | IAM and compliance controls attached to the instance profile |
| `monitoring` | object | Yes | Observability controls including CloudWatch alarms |
| `tags` | object | No | Additional resource tags merged with platform baseline |

## Capabilities

- `compute:auto-scaling-group` – Auto Scaling Group metadata (capacity, security posture, launch template info).
- `observability:auto-scaling-group` – Monitoring, logging, and OTEL configuration consumed by the platform observability service.

### Launch Template Configuration

| Property | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `instanceType` | string | Yes | "t3.micro" | EC2 instance type used by the Auto Scaling Group |
| `ami` | object | No | - | AMI selection rules (provide either static AMI or lookup criteria) |
| `userData` | string | No | - | User data script rendered into the launch template |
| `keyName` | string | No | - | Existing EC2 key pair used for break-glass SSH access |
| `detailedMonitoring` | boolean | No | true | Enable detailed CloudWatch metrics for instances |
| `requireImdsv2` | boolean | No | true | Force all instances to require IMDSv2 token usage |
| `installAgents` | object | No | - | Agent installation flags that harden the base AMI at boot time |

### Auto Scaling Configuration

| Property | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `minCapacity` | integer | Yes | 1 | Minimum number of instances kept in service |
| `maxCapacity` | integer | Yes | 3 | Maximum number of instances allowed |
| `desiredCapacity` | integer | Yes | 2 | Desired number of instances after scaling stabilizes |

### Storage Configuration

| Property | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `rootVolumeSize` | integer | Yes | 20 | Size of the root EBS volume in GiB |
| `rootVolumeType` | string | Yes | "gp3" | Provisioned EBS volume type |
| `encrypted` | boolean | Yes | true | Encrypt the root volume with KMS-managed keys |
| `kms` | object | No | - | KMS encryption settings for the root volume |

### VPC Configuration

| Property | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `vpcId` | string | No | - | Override the default service VPC identifier |
| `subnetIds` | array | No | - | Specific subnet identifiers to target |
| `securityGroupIds` | array | No | - | Additional security groups to attach to instances |
| `subnetType` | string | No | "PRIVATE_WITH_EGRESS" | Subnet selection strategy when specific subnet ids are not supplied |
| `allowAllOutbound` | boolean | No | false | Permit all outbound traffic from instance ENIs |

### Security Configuration

| Property | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `managedPolicies` | array | Yes | [] | AWS managed policy names attached to the instance role |
| `attachLogDeliveryPolicy` | boolean | Yes | true | Attach a policy that permits log delivery to CloudWatch Logs |
| `stigComplianceTag` | boolean | Yes | false | Add STIG compliance tags required by FedRAMP accreditation |

### Monitoring Configuration

| Property | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `enabled` | boolean | Yes | true | Enable opinionated observability configuration (alarms, metrics) |
| `alarms` | object | Yes | - | CloudWatch alarm configurations |

## Security Features

### Secure by Default
- **Encryption**: EBS volumes encrypted by default
- **IMDSv2**: Instance Metadata Service v2 required by default
- **Private Subnets**: Default to private subnets with egress
- **Restricted Access**: No default outbound access rules
- **Detailed Monitoring**: Enabled by default for security

### Compliance Support
- **Commercial**: Standard security baseline
- **FedRAMP Moderate**: Enhanced monitoring and logging
- **FedRAMP High**: STIG hardening and comprehensive audit trail

### CDK Nag Integration
- Security validation with proper suppressions
- Compliance checking against AWS best practices
- Justified suppressions for platform-specific configurations

## Observability Features

### OpenTelemetry Integration
- Automatic OTEL collector endpoint configuration
- Environment variables for service identification
- Distributed tracing support
- Correlation ID injection

### CloudWatch Monitoring
- Alarm and metric definitions published via observability capability
- Log aggregation and forwarding (CloudWatch/OTEL)
- Dashboard templates for visualization

### Compliance Monitoring
- FedRAMP-specific alarms and metrics
- Security event monitoring
- Audit trail compliance
- Health check monitoring

## Outputs

The component provides the following capabilities:

- `compute:auto-scaling-group`: Core Auto Scaling Group capability
- `observability:auto-scaling-group`: Observability metadata (alarms, logging, OTEL settings) with a `telemetry` descriptor for OTEL/CloudWatch provisioning

### Capability Data Structure

```typescript
{
  asgArn: string;           // Auto Scaling Group ARN
  asgName: string;          // Auto Scaling Group name
  roleArn: string;          // Instance role ARN
  securityGroupId: string;  // Security group ID
  launchTemplateId: string; // Launch template ID
  launchTemplateName: string; // Launch template name
  kmsKeyArn?: string;       // KMS key ARN (if used)
}

// Observability capability (observability:auto-scaling-group)
{
  type: 'auto-scaling-group';
  autoScalingGroupName: string;
  monitoring: AutoScalingGroupConfig['monitoring'];
  launchTemplateId?: string;
  capacity: {
    min: number;
    max: number;
    desired: number;
  };
  tags: Record<string, string>;
  telemetry: {
    metrics: Array<{
      metricName: string;
      namespace: string;
      dimensions: Record<string, string>;
    }>;
    alarms?: Array<{
      metricId: string;
      threshold: number;
      comparisonOperator: 'gt' | 'gte' | 'lt' | 'lte';
    }>;
    logging: { destination: 'otel-collector' };
    tracing: { provider: 'adot'; samplingRate: number };
  };
}
```

## Compliance Frameworks

### Commercial Cloud
- Standard security baseline
- Basic monitoring and alerting
- Cost-optimized configuration

### FedRAMP Moderate
- Enhanced security controls
- Comprehensive monitoring
- Extended log retention
- STIG compliance options

### FedRAMP High
- Maximum security controls
- Full audit trail
- STIG hardening enabled
- Advanced threat detection

## Dependencies

- `@shinobi/core`: Platform core functionality
- `@platform/contracts`: Component contracts and interfaces
- `aws-cdk-lib`: AWS CDK constructs
- `cdk-nag`: Security validation

## Version

Current version: 1.0.0

## License

MIT
