# Security Group Import Component

Declarative import of existing AWS Security Groups via SSM parameters for shared, centrally-managed security groups.

## Overview

The Security Group Import component provides a declarative way to import existing security groups by looking up their IDs from SSM parameters. This is essential for referencing shared, centrally-managed security groups that are created outside of your service manifests.

## Features

- **Declarative Import**: Import existing security groups via SSM parameter lookup
- **Cross-Region Support**: Import security groups from different AWS regions
- **Cross-Account Support**: Import security groups from different AWS accounts
- **Validation Options**: Optional validation of security group existence and VPC membership
- **5-Layer Configuration**: Inherits platform's configuration precedence chain
- **Component Binding**: Automatic integration with compute components via binding strategies

## Usage

### Basic Security Group Import

```yaml
# service.yml
components:
  - name: web-servers-sg
    type: security-group-import
    config:
      description: "Import shared web servers security group"
      securityGroup:
        ssmParameterName: "/shared/security-groups/web-servers"
```

### Cross-Region Import

```yaml
components:
  - name: cross-region-sg
    type: security-group-import
    config:
      description: "Import security group from different region"
      securityGroup:
        ssmParameterName: "/shared/security-groups/app-sg"
        region: "us-west-2"
        accountId: "987654321098"
```

### VPC-Validated Import

```yaml
components:
  - name: vpc-validated-sg
    type: security-group-import
    config:
      description: "Import security group with VPC validation"
      securityGroup:
        ssmParameterName: "/vpc-specific/security-groups/database-sg"
        vpcId: "vpc-12345678"
        securityGroupName: "database-security-group"
      validation:
        validateExistence: true
        validateVpc: true
        validationTimeout: 60
```

### EC2 Instance Binding

```yaml
components:
  - name: web-server
    type: ec2-instance
    config:
      instanceType: t3.micro
    binds:
      - to: web-servers-sg
      - to: app-security-groups
  
  - name: web-servers-sg
    type: security-group-import
    config:
      securityGroup:
        ssmParameterName: "/shared/security-groups/web-servers"
  
  - name: app-security-groups
    type: security-group-import
    config:
      securityGroup:
        ssmParameterName: "/shared/security-groups/app-sg"
```

## Configuration Reference

### Top-Level Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `name` | string | No | Component name (auto-generated if not provided) |
| `description` | string | No | Component description |
| `securityGroup` | object | Yes | Security group import configuration |
| `validation` | object | No | Import validation settings |
| `tags` | object | No | Custom tags (for documentation purposes only) |

### Security Group Configuration

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `ssmParameterName` | string | Yes | SSM parameter name containing the security group ID |
| `region` | string | No | AWS region where the security group exists |
| `accountId` | string | No | AWS account ID where the security group exists |
| `vpcId` | string | No | VPC ID where the security group exists (for validation) |
| `securityGroupName` | string | No | Security group name for reference (documentation only) |

### Validation Configuration

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `validateExistence` | boolean | true | Whether to validate the security group exists during synthesis |
| `validateVpc` | boolean | false | Whether to validate the security group is in the expected VPC |
| `validationTimeout` | number | 30 | Custom validation timeout in seconds (5-300) |

## Component Binding

The security group import component provides the `security-group:import` capability, which can be bound to compute components:

```yaml
components:
  - name: web-server
    type: ec2-instance
    binds:
      - to: web-servers-sg
  
  - name: web-servers-sg
    type: security-group-import
    config:
      securityGroup:
        ssmParameterName: "/shared/security-groups/web-servers"
```

### Supported Bindings

| Source Component | Binding Type | Description |
|------------------|--------------|-------------|
| `ec2-instance` | Security Group Addition | Adds imported security group to EC2 instance |
| `lambda-api` | VPC Configuration | Configures Lambda VPC access to use imported security group |
| `lambda-worker` | VPC Configuration | Configures Lambda VPC access to use imported security group |
| `lambda-scheduled` | VPC Configuration | Configures Lambda VPC access to use imported security group |
| `ecs-fargate-service` | Security Group Addition | Adds imported security group to ECS Fargate service |
| `ecs-ec2-service` | Security Group Addition | Adds imported security group to ECS EC2 service |

## SSM Parameter Format

The SSM parameter should contain the security group ID in the following format:

```
Parameter Name: /shared/security-groups/web-servers
Parameter Value: sg-1234567890abcdef0
Parameter Type: String
```

## Compliance Frameworks

### Commercial
- Basic validation enabled by default
- No VPC validation by default
- 30-second validation timeout

### FedRAMP Moderate
- Enhanced validation enabled
- VPC validation available
- Strict timeout settings

### FedRAMP High
- Maximum validation enabled
- VPC validation required
- Strictest timeout settings

## Environment Variables

The component supports environment variable overrides:

```bash
# Override validation timeout
export SECURITY_GROUP_IMPORT_VALIDATION_TIMEOUT=120

# Enable VPC validation
export SECURITY_GROUP_IMPORT_VALIDATE_VPC=true
```

## Examples

### Web Application Stack with Shared Security Groups

```yaml
components:
  - name: web-server
    type: ec2-instance
    config:
      instanceType: t3.micro
    binds:
      - to: web-servers-sg
      - to: database-sg
  
  - name: web-servers-sg
    type: security-group-import
    config:
      description: "Shared security group for web servers"
      securityGroup:
        ssmParameterName: "/shared/security-groups/web-servers"
        securityGroupName: "web-servers-sg"
      validation:
        validateExistence: true
        validationTimeout: 30
  
  - name: database-sg
    type: security-group-import
    config:
      description: "Shared security group for database access"
      securityGroup:
        ssmParameterName: "/shared/security-groups/database-sg"
        vpcId: "vpc-12345678"
        securityGroupName: "database-sg"
      validation:
        validateExistence: true
        validateVpc: true
        validationTimeout: 60
```

### Cross-Account Security Group Import

```yaml
components:
  - name: shared-services-sg
    type: security-group-import
    config:
      description: "Security group from shared services account"
      securityGroup:
        ssmParameterName: "/cross-account/security-groups/shared-services"
        region: "us-west-2"
        accountId: "111111111111"
        securityGroupName: "shared-services-sg"
      validation:
        validateExistence: true
        validationTimeout: 45
```

### Lambda Function with VPC Security Group

```yaml
components:
  - name: data-processor
    type: lambda-worker
    config:
      runtime: nodejs18.x
      handler: index.handler
    binds:
      - to: vpc-sg
  
  - name: vpc-sg
    type: security-group-import
    config:
      description: "VPC security group for Lambda function"
      securityGroup:
        ssmParameterName: "/vpc/security-groups/lambda-sg"
        vpcId: "vpc-abcdef12"
      validation:
        validateExistence: true
        validateVpc: true
```

## Testing

Run the component tests:

```bash
npm test
```

The test suite covers:
- 5-layer configuration precedence
- Schema validation
- Component synthesis
- Cross-region and cross-account scenarios
- Validation configuration
- Binding strategy compatibility

## Architecture

The component follows the Platform Component API Contract:

- **ConfigBuilder**: Extends abstract `ConfigBuilder` with 5-layer precedence
- **Component**: Extends `BaseComponent` with security group import logic
- **Creator**: Factory class for component instantiation
- **Binding Strategy**: `ComputeToSecurityGroupImportBinder` for automatic integration

## Security Considerations

- Always validate security group existence in production
- Use VPC validation for VPC-specific security groups
- Regularly audit SSM parameter values
- Monitor security group usage with CloudTrail
- Use least privilege principles for SSM parameter access

## Troubleshooting

### Common Issues

1. **SSM Parameter Not Found**: Ensure the parameter exists and is accessible
2. **Security Group Not Found**: Verify the security group ID in the SSM parameter
3. **VPC Validation Failed**: Check that the security group is in the expected VPC
4. **Cross-Region Access**: Ensure proper IAM permissions for cross-region access

### Debug Mode

Enable debug logging to troubleshoot import issues:

```bash
export DEBUG=platform:security-group-import:*
```

## Contributing

When extending this component:

1. Follow the Abstract Component ConfigBuilder specification
2. Add comprehensive tests for new features
3. Update this documentation
4. Ensure compliance framework compatibility
5. Test binding strategies with affected components
