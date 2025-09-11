# IAM Role Component

Declarative management of custom IAM roles with inline policies, managed policies, and compliance-aware defaults.

## Overview

The IAM Role component provides a declarative way to create and manage custom IAM roles within your service manifests. It supports complex permission sets, cross-account access, and automatic compliance enforcement for frameworks like FedRAMP.

## Features

- **Declarative Configuration**: Define IAM roles in simple YAML manifests
- **Inline Policies**: Support for custom policy statements with conditions
- **Managed Policies**: Attach AWS managed policies by ARN
- **Cross-Account Access**: Support for external account principals with external IDs
- **Compliance Integration**: Automatic FedRAMP permissions boundaries and MFA requirements
- **5-Layer Configuration**: Inherits platform's configuration precedence chain
- **Component Binding**: Automatic integration with compute components via binding strategies

## Usage

### Basic IAM Role

```yaml
# service.yml
components:
  - name: web-server-role
    type: iam-role
    config:
      description: "IAM role for web server EC2 instances"
      role:
        assumedBy:
          service: ec2.amazonaws.com
        inlinePolicies:
          s3Access:
            statements:
              - effect: Allow
                actions:
                  - s3:GetObject
                  - s3:PutObject
                resources:
                  - arn:aws:s3:::my-app-bucket/*
```

### Cross-Account Role

```yaml
components:
  - name: cross-account-role
    type: iam-role
    config:
      description: "Role for external service access"
      role:
        assumedBy:
          account: "987654321098"
          externalId: "unique-external-id"
        inlinePolicies:
          readOnlyAccess:
            statements:
              - effect: Allow
                actions:
                  - s3:GetObject
                resources:
                  - arn:aws:s3:::shared-bucket/*
```

### Lambda Function Role

```yaml
components:
  - name: lambda-execution-role
    type: iam-role
    config:
      description: "Execution role for Lambda functions"
      role:
        assumedBy:
          service: lambda.amazonaws.com
        managedPolicies:
          - arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
        inlinePolicies:
          dynamoAccess:
            statements:
              - effect: Allow
                actions:
                  - dynamodb:GetItem
                  - dynamodb:PutItem
                resources:
                  - arn:aws:dynamodb:*:*:table/MyTable
```

### FedRAMP Compliant Role

```yaml
components:
  - name: fedramp-role
    type: iam-role
    config:
      description: "FedRAMP compliant role"
      role:
        assumedBy:
          service: ec2.amazonaws.com
        inlinePolicies:
          minimalAccess:
            statements:
              - effect: Allow
                actions:
                  - s3:GetObject
                resources:
                  - arn:aws:s3:::approved-bucket/*
      compliance:
        permissionsBoundary: true
        requireMfa: true
        leastPrivilege: true
```

## Configuration Reference

### Top-Level Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `name` | string | No | Component name (auto-generated if not provided) |
| `description` | string | No | Component description |
| `role` | object | Yes | IAM role configuration |
| `compliance` | object | No | Compliance and security settings |
| `tags` | object | No | Custom tags to apply to the role |

### Role Configuration

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `assumedBy` | object | Yes | Principal that can assume this role |
| `inlinePolicies` | object | No | Inline policies attached to the role |
| `managedPolicies` | array | No | Managed policy ARNs to attach |
| `maxSessionDuration` | number | No | Maximum session duration in seconds (3600-43200) |
| `path` | string | No | Path for the role (default: "/") |

### AssumedBy Configuration

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `service` | string | No* | AWS service principal (e.g., "ec2.amazonaws.com") |
| `account` | string | No* | AWS account ID for cross-account access |
| `externalId` | string | No | External ID for cross-account access |
| `arn` | string | No* | Custom ARN principal |

*At least one of `service`, `account`, or `arn` must be provided.

### Inline Policies

```yaml
inlinePolicies:
  policyName:
    statements:
      - effect: Allow | Deny
        actions:
          - action1
          - action2
        resources:
          - resource1
          - resource2
        conditions:  # Optional
          StringEquals:
            key: value
```

### Compliance Configuration

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `permissionsBoundary` | boolean | false | Enable permissions boundary |
| `permissionsBoundaryArn` | string | - | Custom permissions boundary ARN |
| `leastPrivilege` | boolean | true | Enable least privilege enforcement |
| `requireMfa` | boolean | false | Require MFA for role assumption |

## Component Binding

The IAM role component provides the `iam:assumeRole` capability, which can be bound to compute components:

```yaml
components:
  - name: web-server
    type: ec2-instance
    binds:
      - to: web-server-role
  
  - name: web-server-role
    type: iam-role
    config:
      role:
        assumedBy:
          service: ec2.amazonaws.com
```

### Supported Bindings

| Source Component | Binding Type | Description |
|------------------|--------------|-------------|
| `ec2-instance` | Instance Profile | Creates IAM Instance Profile |
| `lambda-api` | Policy Merge | Merges policies with Lambda execution role |
| `lambda-worker` | Policy Merge | Merges policies with Lambda execution role |
| `lambda-scheduled` | Policy Merge | Merges policies with Lambda execution role |
| `ecs-fargate-service` | Task Role | Adds as ECS task role |
| `ecs-ec2-service` | Task Role | Adds as ECS task role |

## Compliance Frameworks

### Commercial
- No permissions boundary by default
- Least privilege enforcement enabled
- MFA not required for service roles

### FedRAMP Moderate
- Permissions boundary automatically applied
- Least privilege enforcement enabled
- Enhanced security settings

### FedRAMP High
- Permissions boundary automatically applied
- MFA requirements enforced
- Strictest security settings

## Environment Variables

The component supports environment variable overrides:

```bash
# Override session duration
export IAM_ROLE_MAX_SESSION_DURATION=7200

# Override role path
export IAM_ROLE_PATH=/custom/
```

## Examples

### Web Application Stack

```yaml
components:
  - name: web-server
    type: ec2-instance
    config:
      instanceType: t3.micro
    binds:
      - to: web-server-role
      - to: app-security-groups
  
  - name: web-server-role
    type: iam-role
    config:
      description: "Role for web server instances"
      role:
        assumedBy:
          service: ec2.amazonaws.com
        inlinePolicies:
          s3Access:
            statements:
              - effect: Allow
                actions:
                  - s3:GetObject
                  - s3:PutObject
                resources:
                  - arn:aws:s3:::my-app-bucket/*
          cloudwatchLogs:
            statements:
              - effect: Allow
                actions:
                  - logs:CreateLogGroup
                  - logs:CreateLogStream
                  - logs:PutLogEvents
                resources:
                  - arn:aws:logs:*:*:log-group:/aws/ec2/*
```

### Lambda Function with Database Access

```yaml
components:
  - name: data-processor
    type: lambda-worker
    config:
      runtime: nodejs18.x
      handler: index.handler
    binds:
      - to: data-processor-role
      - to: database-connection
  
  - name: data-processor-role
    type: iam-role
    config:
      description: "Execution role for data processing Lambda"
      role:
        assumedBy:
          service: lambda.amazonaws.com
        managedPolicies:
          - arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
        inlinePolicies:
          databaseAccess:
            statements:
              - effect: Allow
                actions:
                  - rds-db:connect
                resources:
                  - arn:aws:rds-db:*:*:dbuser:*/lambda-user
          s3Access:
            statements:
              - effect: Allow
                actions:
                  - s3:GetObject
                  - s3:PutObject
                resources:
                  - arn:aws:s3:::data-bucket/*
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
- Compliance framework integration
- Binding strategy compatibility

## Architecture

The component follows the Platform Component API Contract:

- **ConfigBuilder**: Extends abstract `ConfigBuilder` with 5-layer precedence
- **Component**: Extends `BaseComponent` with IAM role synthesis logic
- **Creator**: Factory class for component instantiation
- **Binding Strategy**: `ComputeToIamRoleBinder` for automatic integration

## Security Considerations

- Always use least privilege principles
- Enable permissions boundaries for production workloads
- Use external IDs for cross-account access
- Regularly audit and rotate access keys
- Monitor role usage with CloudTrail

## Troubleshooting

### Common Issues

1. **Invalid Service Principal**: Ensure service principals follow the format `service.amazonaws.com`
2. **Policy Validation Errors**: Check that policy statements have required `effect`, `actions`, and `resources`
3. **Cross-Account Access**: Verify account IDs are 12 digits and external IDs are unique
4. **Permissions Boundary**: Ensure boundary policies exist and are accessible

### Debug Mode

Enable debug logging to troubleshoot configuration issues:

```bash
export DEBUG=platform:iam-role:*
```

## Contributing

When extending this component:

1. Follow the Abstract Component ConfigBuilder specification
2. Add comprehensive tests for new features
3. Update this documentation
4. Ensure compliance framework compatibility
5. Test binding strategies with affected components