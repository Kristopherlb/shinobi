# Import Components Example

This example demonstrates how to use **Import Components** to connect to existing shared AWS resources managed by other teams.

## Overview

Import Components solve the enterprise challenge of connecting to shared infrastructure without duplicating resource creation. This is especially critical in large organizations where:

- **Database teams** manage shared RDS instances used by multiple services
- **Platform teams** manage company-wide SNS topics for event distribution  
- **Security teams** require centralized resource management for compliance
- **Cost optimization** requires sharing expensive resources across services

## Architecture

```
┌─────────────────┐    ┌──────────────────────┐    ┌─────────────────┐
│   Your Service  │    │  Import Components   │    │ Shared Resources│
│                 │    │                      │    │                 │
│  ┌───────────┐  │    │  ┌─────────────────┐ │    │  ┌───────────┐  │
│  │Lambda API │◄─┼────┼─►│rds-postgres-    │◄┼────┼─►│    RDS    │  │
│  └───────────┘  │    │  │import           │ │    │  │ PostgreSQL│  │
│                 │    │  └─────────────────┘ │    │  └───────────┘  │
│  ┌───────────┐  │    │                      │    │                 │
│  │Lambda     │◄─┼────┼─►┌─────────────────┐ │    │  ┌───────────┐  │
│  │Worker     │  │    │  │sns-topic-       │◄┼────┼─►│SNS Topic  │  │
│  └───────────┘  │    │  │import           │ │    │  │(Company-  │  │
│                 │    │  └─────────────────┘ │    │  │wide)      │  │
└─────────────────┘    └──────────────────────┘    │  └───────────┘  │
                                                    └─────────────────┘
```

## Key Benefits

### ✅ **Declarative Resource Sharing**
```yaml
components:
  - name: shared-qa-db
    type: rds-postgres-import
    config:
      instanceArn: '${env:sharedDbArn}'
      secretArn: '${env:dbSecretArn}'
```

### ✅ **Consistent Binding Experience**
```yaml
binds:
  - to: shared-qa-db
    capability: db:postgres
    access: readwrite
    # Same binding syntax as newly created resources!
```

### ✅ **Environment-Specific Configuration**
```yaml
# shared-resources.yml
qa-us-east-1:
  defaults:
    sharedDbArn: arn:aws:rds:us-east-1:123....:db:shared-qa-database

prod-us-east-1:
  defaults:
    sharedDbArn: arn:aws:rds:us-east-1:987....:db:shared-prod-database
```

### ✅ **Security & Compliance**
- ✅ **ARN validation** - Only valid AWS resource ARNs accepted
- ✅ **IAM permissions** - Proper role configuration for cross-account access
- ✅ **Security groups** - Network access properly configured
- ✅ **Secret management** - Database credentials accessed securely

## Usage Examples

### Database Connection

```yaml
# Import existing shared database
- name: shared-database
  type: rds-postgres-import
  config:
    instanceArn: 'arn:aws:rds:us-east-1:123456789012:db:shared-prod-db'
    securityGroupId: 'sg-12345678'
    secretArn: 'arn:aws:secretsmanager:us-east-1:123456789012:secret:db-creds-AbCdEf'

# Lambda connects to shared database
- name: api
  type: lambda-api
  binds:
    - to: shared-database
      capability: db:postgres
      access: readwrite
      env:
        DATABASE_URL: ORDERS_DATABASE_URL  # Custom env var name
```

**Result:** Lambda automatically gets these environment variables:
```bash
ORDERS_DATABASE_URL=postgresql://username:password@shared-prod-db.amazonaws.com:5432/postgres
DB_HOST=shared-prod-db.amazonaws.com
DB_PORT=5432
DB_SECRET_ARN=arn:aws:secretsmanager:us-east-1:123456789012:secret:db-creds-AbCdEf
```

### Event Publishing

```yaml
# Import company-wide notification topic
- name: company-events
  type: sns-topic-import
  config:
    topicArn: 'arn:aws:sns:us-east-1:123456789012:company-notifications'

# Lambda publishes to shared topic
- name: order-processor
  type: lambda-worker
  binds:
    - to: company-events
      capability: topic:sns
      access: write
      options:
        messageAttributes:
          service: order-processor
          team: fulfillment
```

**Result:** Lambda automatically gets:
- ✅ **Publish permissions** to the SNS topic
- ✅ **Environment variables** with topic ARN
- ✅ **Regional configuration** extracted from ARN

## Multi-Environment Support

The import components work seamlessly with distributed environment configuration:

```yaml
# Different shared resources per environment
environments:
  $ref: './shared-resources.yml'

components:
  - name: database
    type: rds-postgres-import
    config:
      instanceArn: '${env:sharedDbArn}'  # qa-db, staging-db, prod-db
      secretArn: '${env:dbSecretArn}'    # Different secrets per env
```

## Cross-Region & Cross-Account

Import components support enterprise-grade multi-region and cross-account scenarios:

```yaml
# Cross-region database in EU
prod-eu-central-1:
  defaults:
    sharedDbArn: arn:aws:rds:eu-central-1:987654321098:db:shared-eu-database

# Cross-account topic managed by platform team  
prod-us-east-1:
  defaults:
    notificationTopicArn: arn:aws:sns:us-east-1:111222333444:platform-events
```

## Testing

The import components include comprehensive test coverage:

```bash
# Run import component tests
npm test -- --grep "Import Components"

# Test specific component
npm test tests/unit/components/rds-postgres-import.test.ts
npm test tests/unit/components/sns-topic-import.test.ts

# Integration tests
npm test tests/integration/import-components-integration.test.ts
```

## Available Import Components

### `rds-postgres-import`
**Purpose:** Connect to existing PostgreSQL RDS instances

**Configuration:**
- `instanceArn` (required) - RDS instance ARN
- `securityGroupId` (required) - Security group ID for network access
- `secretArn` (required) - Secrets Manager ARN for credentials
- `engine` (optional) - Database engine, defaults to 'postgres'

**Capabilities:** `db:postgres`
**Access Levels:** `read`, `write`, `readwrite`, `admin`

### `sns-topic-import`
**Purpose:** Connect to existing SNS topics for messaging

**Configuration:**
- `topicArn` (required) - SNS topic ARN
- `topicName` (optional) - Friendly name for the topic

**Capabilities:** `topic:sns`  
**Access Levels:** `read`, `write`, `readwrite`, `admin`

## Platform Integration

Import components integrate seamlessly with all platform features:

- ✅ **Schema Validation** - JSON schema validates import configurations
- ✅ **Migration Tool** - Import components work with platform migrations  
- ✅ **Binding System** - Same binding experience as regular components
- ✅ **Environment Variables** - Automatic injection with custom naming
- ✅ **IAM Security** - Proper permissions for cross-account access
- ✅ **Distributed Config** - Works with `$ref` environment files

This provides a **consistent, declarative way** to consume shared infrastructure while maintaining the developer experience of the platform! 🚀