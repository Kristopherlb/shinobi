# Secrets Manager Component

Enterprise-grade AWS Secrets Manager for secure storage, rotation, and retrieval of sensitive information with comprehensive compliance and audit features.

## Overview

This component provides fully managed secret storage with:

- **Automatic Rotation**: Configurable rotation schedules for database credentials and API keys
- **Encryption**: KMS-based encryption with customer-managed keys
- **Access Control**: Fine-grained IAM policies and resource-based permissions
- **Compliance Hardening**: Three-tier compliance support (Commercial/FedRAMP Moderate/FedRAMP High)
- **Audit Integration**: Comprehensive logging and monitoring of secret access

## Capabilities

- **secrets:manager**: Provides secure secret storage and retrieval for applications

## Configuration

```yaml
components:
  - name: app-database-credentials
    type: secrets-manager
    config:
      secretName: MyApp/Database/Credentials
      description: Database credentials for the main application database
      
      secretValue:
        # Option 1: JSON string for structured secrets
        secretString: |
          {
            "username": "app_user",
            "password": "SecurePassword123!",
            "host": "db.example.com",
            "port": 5432,
            "database": "myapp_prod"
          }
      
      # Option 2: Key-value pairs
      # secretValue:
      #   secretData:
      #     username: app_user
      #     password: SecurePassword123!
      #     host: db.example.com
      
      kmsKeyId: arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012
      
      automaticRotation:
        enabled: true
        rotationSchedule:
          scheduleExpression: "rate(30 days)"
        rotationLambda:
          functionArn: arn:aws:lambda:us-east-1:123456789012:function:rotate-db-credentials
      
      replicaRegions:
        - region: us-west-2
          kmsKeyId: arn:aws:kms:us-west-2:123456789012:key/87654321-4321-4321-4321-210987654321
      
      resourcePolicy: |
        {
          "Version": "2012-10-17",
          "Statement": [
            {
              "Sid": "AllowApplicationAccess",
              "Effect": "Allow",
              "Principal": {
                "AWS": "arn:aws:iam::123456789012:role/MyAppRole"
              },
              "Action": "secretsmanager:GetSecretValue",
              "Resource": "*",
              "Condition": {
                "StringEquals": {
                  "secretsmanager:ResourceTag/Application": "MyApp"
                }
              }
            }
          ]
        }
      
      tags:
        application: MyApp
        environment: production
        rotation-enabled: "true"
        compliance: fedramp-moderate
```

## Binding Examples

### Lambda Function to Secrets

```yaml
components:
  - name: api-service
    type: lambda-api
    config:
      handler: src/api.handler
      environment:
        SECRET_ARN: ${app-database-credentials.secretArn}
    binds:
      - to: app-database-credentials
        capability: secrets:manager
        access: read
```

### RDS Database with Managed Credentials

```yaml
components:
  - name: app-database
    type: rds-postgres
    config:
      instanceClass: db.r5.large
      manageMasterUserPassword: true
    binds:
      - from: api-service
        capability: secrets:manager
        access: read
```

## Compliance Features

### Commercial
- Basic KMS encryption with AWS managed keys
- Standard access controls
- Basic audit logging

### FedRAMP Moderate
- Customer-managed KMS keys with rotation
- Enhanced access logging and monitoring
- Automatic rotation every 30 days
- Cross-region replication
- 1-year audit log retention

### FedRAMP High
- Strict KMS key management with rotation
- Comprehensive audit trails with detailed access patterns
- Automatic rotation every 7 days
- Multi-region replication mandatory
- 10-year audit log retention
- Advanced access controls and monitoring

## Advanced Configuration

### Database Credential Rotation

```yaml
config:
  secretName: MyApp/RDS/MasterCredentials
  automaticRotation:
    enabled: true
    rotationSchedule:
      scheduleExpression: "rate(7 days)"
    rotationConfiguration:
      rotationType: RDS_POSTGRESQL
      masterSecretArn: arn:aws:secretsmanager:us-east-1:123456789012:secret:MasterSecret
      rotationLambda:
        functionName: SecretsManagerRDSPostgreSQLRotationSingleUser
```

### API Key Management

```yaml
config:
  secretName: MyApp/External/APIKeys
  secretValue:
    secretString: |
      {
        "stripe_api_key": "sk_live_...",
        "sendgrid_api_key": "SG...",
        "github_token": "ghp_..."
      }
  automaticRotation:
    enabled: true
    rotationSchedule:
      scheduleExpression: "rate(90 days)"
    rotationLambda:
      functionArn: arn:aws:lambda:us-east-1:123456789012:function:rotate-api-keys
```

### Multi-Environment Secrets

```yaml
# Production secrets
config:
  secretName: MyApp/Production/Config
  secretValue:
    secretString: |
      {
        "database_url": "postgres://prod.db.example.com:5432/myapp",
        "redis_url": "redis://prod.cache.example.com:6379",
        "encryption_key": "prod-encryption-key-32-chars"
      }

# Development secrets (separate component)
# config:
#   secretName: MyApp/Development/Config
#   secretValue:
#     secretString: |
#       {
#         "database_url": "postgres://dev.db.example.com:5432/myapp_dev",
#         "redis_url": "redis://dev.cache.example.com:6379"
#       }
```

## Monitoring and Observability

The component automatically configures:

- **CloudWatch Logs**: Secret access patterns and rotation events
- **CloudWatch Metrics**: Secret retrieval frequency and rotation success rates
- **AWS CloudTrail**: Administrative actions and access attempts
- **CloudWatch Alarms**: Failed rotations and unusual access patterns
- **Custom Metrics**: Application-specific secret usage analytics

### Monitoring Levels

- **Basic**: Secret access and basic rotation monitoring
- **Enhanced**: Detailed access patterns + rotation analytics
- **Comprehensive**: Enhanced + security monitoring + compliance reporting

## Security Features

### Encryption and Key Management
- Encryption at rest with customer-managed KMS keys
- Automatic key rotation support
- Cross-region key replication
- Fine-grained key usage policies

### Access Control
- Resource-based policies for fine-grained access
- IAM integration with condition-based access
- Cross-account access support
- Temporary credential support

### Audit and Compliance
- Comprehensive access logging
- Rotation audit trails
- Integration with AWS Config
- Compliance reporting and alerts

## Secret Rotation Patterns

### Database Credentials

```python
# Lambda rotation function example
import boto3
import json

def lambda_handler(event, context):
    client = boto3.client('secretsmanager')
    rds_client = boto3.client('rds')
    
    secret_arn = event['SecretId']
    token = event['ClientRequestToken']
    step = event['Step']
    
    if step == "createSecret":
        # Create new credentials
        new_password = generate_password()
        client.update_secret_version_stage(
            SecretId=secret_arn,
            VersionStage="AWSPENDING",
            ClientRequestToken=token,
            SecretString=json.dumps({
                "username": "app_user",
                "password": new_password
            })
        )
    
    elif step == "setSecret":
        # Update database with new credentials
        update_database_user(secret_arn, token)
    
    elif step == "testSecret":
        # Test new credentials
        test_database_connection(secret_arn, token)
    
    elif step == "finishSecret":
        # Finalize rotation
        client.update_secret_version_stage(
            SecretId=secret_arn,
            VersionStage="AWSCURRENT",
            MoveToVersionId=token
        )
```

### API Key Rotation

```python
# Custom API key rotation
def rotate_api_key(secret_arn, service_name):
    # Generate new API key from service
    new_key = external_service.create_api_key()
    
    # Update secret with new key
    secrets_client.update_secret(
        SecretId=secret_arn,
        SecretString=json.dumps({
            "api_key": new_key,
            "created_at": datetime.utcnow().isoformat()
        })
    )
    
    # Revoke old key after grace period
    schedule_key_revocation(old_key, grace_period=timedelta(hours=24))
```

## Usage Patterns

### Application Integration

```python
# Python application example
import boto3
import json

def get_database_credentials():
    client = boto3.client('secretsmanager')
    
    try:
        response = client.get_secret_value(
            SecretId='MyApp/Database/Credentials'
        )
        secret = json.loads(response['SecretString'])
        return secret
    except Exception as e:
        print(f"Error retrieving secret: {e}")
        raise

# Usage in application
creds = get_database_credentials()
connection = psycopg2.connect(
    host=creds['host'],
    port=creds['port'],
    database=creds['database'],
    user=creds['username'],
    password=creds['password']
)
```

### Container Environment Variables

```dockerfile
# Dockerfile example
FROM python:3.9-slim

# Install AWS CLI for secret retrieval
RUN pip install awscli boto3

# Use startup script to fetch secrets
COPY startup.sh /startup.sh
RUN chmod +x /startup.sh

ENTRYPOINT ["/startup.sh"]
```

```bash
#!/bin/bash
# startup.sh
export DB_PASSWORD=$(aws secretsmanager get-secret-value \
  --secret-id MyApp/Database/Credentials \
  --query SecretString --output text | jq -r .password)

exec python app.py
```

## Cross-Region Replication

### Multi-Region Setup

```yaml
config:
  replicaRegions:
    - region: us-west-2
      kmsKeyId: arn:aws:kms:us-west-2:123456789012:key/west-key-id
    - region: eu-west-1
      kmsKeyId: arn:aws:kms:eu-west-1:123456789012:key/eu-key-id
```

### Disaster Recovery

```python
# Multi-region secret access
def get_secret_with_failover(secret_name, regions=['us-east-1', 'us-west-2']):
    for region in regions:
        try:
            client = boto3.client('secretsmanager', region_name=region)
            response = client.get_secret_value(SecretId=secret_name)
            return json.loads(response['SecretString'])
        except Exception as e:
            print(f"Failed to get secret from {region}: {e}")
            continue
    raise Exception("Failed to retrieve secret from all regions")
```

## Troubleshooting

### Common Issues

1. **Access Denied Errors**
   - Verify IAM permissions include `secretsmanager:GetSecretValue`
   - Check resource-based policies on secrets
   - Ensure KMS key permissions for decryption

2. **Rotation Failures**
   - Verify rotation Lambda function permissions
   - Check Lambda function logs for errors
   - Ensure database connectivity from Lambda

3. **Cross-Region Access Issues**
   - Verify replica regions are configured correctly
   - Check KMS key permissions in target regions
   - Ensure regional endpoint accessibility

### Debug Mode

Enable detailed logging for troubleshooting:

```yaml
config:
  tags:
    debug: "true"
    log-level: "DEBUG"
```

## Examples

See the [`examples/`](../../examples/) directory for complete service templates:

- `examples/database-rotation/` - Automated database credential rotation
- `examples/api-key-management/` - External API key management
- `examples/multi-env-secrets/` - Multi-environment secret management

## API Reference

### SecretsManagerComponent

Main component class that extends `Component`.

#### Methods

- `synth()`: Creates AWS resources (Secret, rotation configuration, resource policies)
- `getCapabilities()`: Returns secrets:manager capability
- `getType()`: Returns 'secrets-manager'

### Configuration Interfaces

- `SecretsManagerConfig`: Main configuration interface
- `SECRETS_MANAGER_CONFIG_SCHEMA`: JSON schema for validation

## Development

To contribute to this component:

1. Make changes to the source code
2. Run tests: `npm test`
3. Build: `npm run build`
4. Follow the [Contributing Guide](../../../CONTRIBUTING.md)

## License

MIT License - see LICENSE file for details.