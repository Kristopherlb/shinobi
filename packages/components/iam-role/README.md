# IAM Role Component

Enterprise-grade AWS IAM Role management with trust relationships, policy attachment, and comprehensive compliance controls for secure service-to-service authentication.

## Overview

This component provides managed IAM role creation with:

- **Trust Relationships**: Secure service-to-service authentication patterns
- **Policy Attachment**: Managed and custom policy integration
- **Cross-Account Access**: Secure cross-account role assumption
- **Compliance Hardening**: Three-tier compliance support (Commercial/FedRAMP Moderate/FedRAMP High)
- **Security Best Practices**: Least-privilege access and condition-based policies

## Capabilities

- **security:iam-role**: Provides managed IAM role for service authentication and authorization

## Configuration

```yaml
components:
  - name: app-service-role
    type: iam-role
    config:
      roleName: MyApplicationServiceRole
      description: Service role for application backend components
      
      assumeRolePolicyDocument:
        Version: "2012-10-17"
        Statement:
          - Effect: Allow
            Principal:
              Service:
                - lambda.amazonaws.com
                - ecs-tasks.amazonaws.com
            Action: "sts:AssumeRole"
            Condition:
              StringEquals:
                "aws:RequestedRegion": "us-east-1"
      
      managedPolicies:
        - arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
        - arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy
      
      inlinePolicies:
        S3DataAccess:
          Version: "2012-10-17"
          Statement:
            - Effect: Allow
              Action:
                - "s3:GetObject"
                - "s3:PutObject"
              Resource: "arn:aws:s3:::company-app-data/*"
            - Effect: Allow
              Action:
                - "s3:ListBucket"
              Resource: "arn:aws:s3:::company-app-data"
              Condition:
                StringLike:
                  "s3:prefix": "app-data/*"
      
      maxSessionDuration: 3600  # 1 hour
      
      tags:
        role-type: service-role
        application: MyApp
        compliance-required: "true"
```

## Binding Examples

### Lambda Function with IAM Role

```yaml
components:
  - name: api-function
    type: lambda-api
    config:
      handler: src/api.handler
      roleArn: ${app-service-role.roleArn}
    binds:
      - to: app-service-role
        capability: security:iam-role
        access: assume
```

### ECS Service with Task Role

```yaml
components:
  - name: web-service
    type: ecs-fargate-service
    config:
      serviceName: WebApplication
      taskRoleArn: ${app-service-role.roleArn}
    binds:
      - to: app-service-role
        capability: security:iam-role
        access: assume
```

## Compliance Features

### Commercial
- Basic trust relationships
- Standard managed policies
- Basic session duration limits

### FedRAMP Moderate
- Enhanced trust relationship conditions
- Comprehensive audit logging of role assumptions
- Shorter session durations (1 hour maximum)
- Mandatory external ID for cross-account access
- 1-year access log retention

### FedRAMP High
- Strict trust relationship conditions with time constraints
- Comprehensive audit logging with detailed session tracking
- Very short session durations (30 minutes maximum)
- Mandatory MFA conditions for sensitive operations
- 10-year access log retention
- Advanced monitoring and alerting

## Advanced Configuration

### Cross-Account Role Access

```yaml
config:
  assumeRolePolicyDocument:
    Version: "2012-10-17"
    Statement:
      - Effect: Allow
        Principal:
          AWS: 
            - "arn:aws:iam::123456789012:root"
            - "arn:aws:iam::098765432109:role/TrustedRole"
        Action: "sts:AssumeRole"
        Condition:
          StringEquals:
            "sts:ExternalId": "unique-external-id-12345"
          Bool:
            "aws:MultiFactorAuthPresent": "true"
          IpAddress:
            "aws:SourceIp": "203.0.113.0/24"
```

### Federated Identity Integration

```yaml
config:
  assumeRolePolicyDocument:
    Version: "2012-10-17"
    Statement:
      - Effect: Allow
        Principal:
          Federated: "arn:aws:iam::123456789012:saml-provider/CompanySAML"
        Action: "sts:AssumeRoleWithSAML"
        Condition:
          StringEquals:
            "SAML:aud": "https://signin.aws.amazon.com/saml"
            "SAML:department": "Engineering"
```

### Time-Based Access Control

```yaml
config:
  inlinePolicies:
    BusinessHoursAccess:
      Version: "2012-10-17"
      Statement:
        - Effect: Allow
          Action: 
            - "s3:*"
            - "dynamodb:*"
          Resource: "*"
          Condition:
            DateGreaterThan:
              "aws:CurrentTime": "08:00Z"
            DateLessThan:
              "aws:CurrentTime": "18:00Z"
            ForAllValues:StringEquals:
              "aws:RequestedDay": 
                - "Monday"
                - "Tuesday"
                - "Wednesday"
                - "Thursday"
                - "Friday"
```

## Monitoring and Observability

The component automatically configures:

- **CloudWatch Logs**: Role assumption events and policy evaluations
- **AWS CloudTrail**: All AssumeRole API calls and administrative changes
- **CloudWatch Metrics**: Role assumption frequency and duration
- **CloudWatch Alarms**: Failed assumptions and policy violations
- **AWS Config**: Role configuration changes and compliance drift

### Monitoring Levels

- **Basic**: Role creation and basic assumption tracking
- **Enhanced**: Detailed policy evaluation + access pattern analysis
- **Comprehensive**: Enhanced + security monitoring + compliance auditing

## Security Features

### Trust Relationship Security
- Condition-based trust policies
- External ID requirements for cross-account access
- MFA enforcement for sensitive operations
- IP address restrictions

### Session Management
- Configurable session duration limits
- Session token monitoring
- Automatic session expiration
- Session revocation capabilities

### Policy Management
- Least-privilege policy attachment
- Policy validation and analysis
- Regular access reviews
- Automated policy optimization

## Role Patterns and Templates

### Lambda Execution Role

```yaml
config:
  roleName: LambdaExecutionRole
  assumeRolePolicyDocument:
    Version: "2012-10-17"
    Statement:
      - Effect: Allow
        Principal:
          Service: lambda.amazonaws.com
        Action: "sts:AssumeRole"
  managedPolicies:
    - arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
  inlinePolicies:
    CloudWatchLogs:
      Version: "2012-10-17"
      Statement:
        - Effect: Allow
          Action:
            - "logs:CreateLogStream"
            - "logs:PutLogEvents"
          Resource: "arn:aws:logs:*:*:log-group:/aws/lambda/*"
```

### ECS Task Role

```yaml
config:
  roleName: ECSTaskRole
  assumeRolePolicyDocument:
    Version: "2012-10-17"
    Statement:
      - Effect: Allow
        Principal:
          Service: ecs-tasks.amazonaws.com
        Action: "sts:AssumeRole"
  managedPolicies:
    - arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy
```

### Cross-Account Data Access Role

```yaml
config:
  roleName: CrossAccountDataRole
  assumeRolePolicyDocument:
    Version: "2012-10-17"
    Statement:
      - Effect: Allow
        Principal:
          AWS: "arn:aws:iam::TRUSTED-ACCOUNT:root"
        Action: "sts:AssumeRole"
        Condition:
          StringEquals:
            "sts:ExternalId": "${external-id}"
          Bool:
            "aws:MultiFactorAuthPresent": "true"
```

## Permission Boundary Support

### Development Environment Boundaries

```yaml
config:
  permissionsBoundary: arn:aws:iam::123456789012:policy/DeveloperBoundary
  inlinePolicies:
    DeveloperAccess:
      Version: "2012-10-17"
      Statement:
        - Effect: Allow
          Action: "*"
          Resource: "*"
          Condition:
            StringLike:
              "aws:RequestTag/Environment": "dev"
```

## Role Chaining and Delegation

### Service-to-Service Delegation

```yaml
# Primary service role
config:
  roleName: PrimaryServiceRole
  assumeRolePolicyDocument:
    Version: "2012-10-17"  
    Statement:
      - Effect: Allow
        Principal:
          Service: lambda.amazonaws.com
        Action: "sts:AssumeRole"
  inlinePolicies:
    AssumeDownstreamRole:
      Version: "2012-10-17"
      Statement:
        - Effect: Allow
          Action: "sts:AssumeRole"
          Resource: "arn:aws:iam::123456789012:role/DownstreamServiceRole"
```

## Troubleshooting

### Common Issues

1. **AssumeRole Access Denied**
   - Check trust relationship policy allows the principal
   - Verify external ID conditions are met
   - Ensure MFA conditions are satisfied if required
   - Check IP address restrictions

2. **Policy Attachment Failures**
   - Verify policy ARNs are correct and exist
   - Check IAM permissions for policy attachment
   - Ensure policy size limits are not exceeded

3. **Session Duration Issues**
   - Verify maxSessionDuration doesn't exceed AWS limits
   - Check if requesting duration exceeds role maximum
   - Ensure compliance framework limits are respected

### Debug Mode

Enable detailed IAM logging for troubleshooting:

```yaml
config:
  tags:
    debug: "true"
    detailed-logging: "enabled"
```

## Examples

See the [`examples/`](../../examples/) directory for complete service templates:

- `examples/lambda-with-iam/` - Lambda function with custom IAM role
- `examples/cross-account-access/` - Cross-account role patterns
- `examples/federated-access/` - SAML and OIDC federation

## API Reference

### IamRoleComponent

Main component class that extends `Component`.

#### Methods

- `synth()`: Creates AWS resources (IAM Role, inline policies, managed policy attachments)
- `getCapabilities()`: Returns security:iam-role capability
- `getType()`: Returns 'iam-role'

### Configuration Interfaces

- `IamRoleConfig`: Main configuration interface
- `IAM_ROLE_CONFIG_SCHEMA`: JSON schema for validation

## Development

To contribute to this component:

1. Make changes to the source code
2. Run tests: `npm test`
3. Build: `npm run build`
4. Follow the [Contributing Guide](../../../CONTRIBUTING.md)

## License

MIT License - see LICENSE file for details.