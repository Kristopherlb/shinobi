# Binder Strategy System

## Overview

The Binder Strategy System provides a comprehensive, compliance-aware framework for automatically wiring components together in the Shinobi platform. It handles the complex task of establishing secure, compliant connections between components while enforcing least-privilege access and compliance framework requirements.

## Architecture

### Core Components

1. **EnhancedBindingContext** - Rich context object containing all binding information
2. **EnhancedBinderStrategy** - Abstract base class for all binding strategies
3. **ComplianceEnforcer** - Centralized compliance validation and enforcement
4. **EnhancedBinderRegistry** - Strategy registry and coordination
5. **Concrete Binder Strategies** - Database, Storage, Cache, and Queue binders

### Design Patterns

- **Strategy Pattern** - Different binding strategies for different capability types
- **Template Method Pattern** - Base class defines binding workflow, subclasses implement specifics
- **Compliance Enforcement** - Centralized compliance checking with framework-specific rules

## Supported Capabilities

### Database Bindings (`DatabaseBinderStrategy`)

**Supported Capabilities:**
- `db:postgres` - PostgreSQL databases
- `db:mysql` - MySQL databases  
- `db:aurora-postgres` - Aurora PostgreSQL clusters
- `db:aurora-mysql` - Aurora MySQL clusters

**What it provides:**
- IAM policies for database access (read, write, readwrite, admin)
- Secrets Manager access for credentials
- Environment variables for connection details
- Security group rules for network access
- Connection string generation
- Compliance framework enforcement

**Example:**
```yaml
binds:
  - to: user-database
    capability: db:postgres
    access: readwrite
    env:
      host: DB_HOST
      port: DB_PORT
      database: DB_NAME
      secretArn: DB_SECRET_ARN
```

### Storage Bindings (`StorageBinderStrategy`)

**Supported Capabilities:**
- `storage:s3` - S3 bucket storage
- `storage:s3-bucket` - S3 bucket storage (alternative naming)
- `bucket:s3` - S3 bucket storage (legacy naming)

**What it provides:**
- Least-privilege S3 access policies
- KMS encryption key access
- Environment variables for bucket details
- Multipart upload support for large files
- Bucket metadata access
- HTTPS-only transport enforcement

**Example:**
```yaml
binds:
  - to: user-storage
    capability: storage:s3
    access: readwrite
    env:
      bucketName: STORAGE_BUCKET_NAME
      bucketArn: STORAGE_BUCKET_ARN
```

### Cache Bindings (`CacheBinderStrategy`)

**Supported Capabilities:**
- `cache:redis` - Redis cache
- `cache:elasticache-redis` - ElastiCache Redis
- `cache:memcached` - Memcached cache

**What it provides:**
- ElastiCache metadata access policies
- Security group rules for network access
- Environment variables for cache connection
- AUTH token access via Secrets Manager
- Redis cluster endpoint configuration
- Encryption in transit enforcement

**Example:**
```yaml
binds:
  - to: user-cache
    capability: cache:redis
    access: readwrite
    env:
      host: CACHE_HOST
      port: CACHE_PORT
      authToken: CACHE_AUTH_TOKEN
```

### Queue Bindings (`QueueBinderStrategy`)

**Supported Capabilities:**
- `queue:sqs` - SQS queues
- `topic:sns` - SNS topics
- `messaging:sqs` - SQS messaging (alternative naming)
- `messaging:sns` - SNS messaging (alternative naming)

### Lambda Bindings (`LambdaBinderStrategy`)

**Supported Capabilities:**
- `lambda:function` - Lambda functions
- `function:lambda` - Lambda functions (alternative naming)
- `compute:lambda` - Lambda compute (alternative naming)

**What it provides:**
- Lambda invocation permissions
- Function configuration access
- CloudWatch Logs integration
- Environment variables for function details
- Performance monitoring access

**Example:**
```yaml
binds:
  - to: notification-service
    capability: lambda:function
    access: read
    env:
      functionName: NOTIFICATION_FUNCTION_NAME
      functionArn: NOTIFICATION_FUNCTION_ARN
```

### API Gateway Bindings (`ApiGatewayBinderStrategy`)

**Supported Capabilities:**
- `api:gateway` - API Gateway APIs
- `gateway:api` - API Gateway APIs (alternative naming)
- `http:api` - HTTP APIs
- `rest:api` - REST APIs

**What it provides:**
- API Gateway access permissions
- API execution permissions
- CloudWatch Logs integration
- Environment variables for API details
- Base URL generation for API calls

**Example:**
```yaml
binds:
  - to: api-gateway
    capability: api:gateway
    access: readwrite
    env:
      apiUrl: API_GATEWAY_URL
      apiArn: API_GATEWAY_ARN
      baseUrl: API_BASE_URL
```

**What it provides:**
- SQS/SNS access policies based on access level
- Dead letter queue configuration
- Environment variables for queue details
- CloudWatch monitoring access
- Message processing permissions
- HTTPS-only transport enforcement

**Example:**
```yaml
binds:
  - to: order-queue
    capability: queue:sqs
    access: write
    env:
      queueUrl: ORDER_QUEUE_URL
      queueArn: ORDER_QUEUE_ARN
    options:
      deadLetterQueue:
        maxReceiveCount: 3
        queueArn: arn:aws:sqs:us-east-1:123456789012:order-dlq
```

## Compliance Framework Support

### Commercial Framework
- Basic security policies
- Secure transport requirements
- Standard access control
- Basic logging and monitoring

### FedRAMP Moderate
- Enhanced monitoring requirements
- Audit logging (90 days retention)
- Secure transport enforcement
- Regional restrictions
- Error monitoring and alerting

### FedRAMP High
- VPC endpoint requirements for AWS services
- Comprehensive audit logging (365 days retention)
- Security monitoring and alerting
- Resource-based policies
- MFA requirements for administrative access
- Encryption at rest enforcement
- Network segmentation (no wildcard CIDRs)

## Usage

### Basic Integration

```typescript
import { BinderIntegration } from '@platform/contracts/binder-integration';

const binderIntegration = new BinderIntegration();

// Process component bindings
const bindingResults = await binderIntegration.processComponentBindings(
  components,
  'dev',
  'fedramp-moderate'
);

// Apply binding results
binderIntegration.applyBindingResults(components, bindingResults);
```

### Direct Strategy Usage

```typescript
import { DatabaseBinderStrategy } from '@platform/contracts/binders/database-binder-strategy';
import { EnhancedBindingContext } from '@platform/contracts/enhanced-binding-context';

const strategy = new DatabaseBinderStrategy();
const context: EnhancedBindingContext = {
  source: sourceComponent,
  target: targetComponent,
  directive: bindingDirective,
  environment: 'prod',
  complianceFramework: 'fedramp-high',
  targetCapabilityData: capabilityData
};

const result = strategy.bind(context);
```

## Configuration Options

### Binding Options

```typescript
interface BindingOptions {
  iamAuth?: boolean;              // IAM authentication enabled
  tlsRequired?: boolean;          // TLS/SSL required
  vpcEndpoint?: string;           // VPC endpoint for FedRAMP
  iamConditions?: Record<string, any>;  // Custom IAM conditions
  networkRestrictions?: NetworkRestrictions;  // Network access rules
  complianceOverrides?: Record<string, any>;  // Compliance overrides
}
```

### Network Restrictions

```typescript
interface NetworkRestrictions {
  allowedCidrs?: string[];        // Allowed CIDR blocks
  deniedCidrs?: string[];         // Denied CIDR blocks
  requiredVpcEndpoints?: string[]; // Required VPC endpoints
  portRestrictions?: PortRestriction[]; // Port-specific rules
}
```

## Security Features

### Least Privilege Access
- IAM policies are scoped to specific resources only
- No wildcard permissions (`*`) are granted
- Access levels (read, write, readwrite, admin) map to minimal required permissions

### Network Security
- Security group rules for database and cache access
- VPC endpoint requirements for FedRAMP compliance
- HTTPS/TLS enforcement for all AWS service access
- Network segmentation with explicit CIDR blocks

### Compliance Enforcement
- Framework-specific security requirements
- Automated compliance validation
- Violation detection and reporting
- Remediation guidance

### Audit and Monitoring
- Comprehensive logging of all access attempts
- CloudWatch metrics integration
- Security monitoring and alerting
- Compliance action tracking

## Error Handling

The system provides comprehensive error handling with:

- **Validation Errors** - Invalid binding contexts or missing data
- **Compliance Violations** - Framework requirement violations
- **Strategy Errors** - Unsupported binding scenarios
- **Network Errors** - Security group or network configuration issues

All errors include:
- Descriptive error messages
- Remediation guidance
- Compliance framework context
- Component identification

## Testing

Comprehensive unit tests are provided for all binder strategies following the Platform Testing Standard v1.0:

- Strategy identification tests
- Binding execution tests
- Environment variable generation tests
- Compliance framework tests
- Error handling tests

Run tests with:
```bash
npm test -- --testPathPatterns="src/platform/contracts/tests"
```

## Extension Points

### Adding New Binder Strategies

1. Extend `EnhancedBinderStrategy`
2. Implement `canHandle()` and `bind()` methods
3. Register strategy with `EnhancedBinderRegistry`
4. Add comprehensive unit tests

### Adding New Compliance Frameworks

1. Extend `ComplianceEnforcer`
2. Add framework-specific enforcement methods
3. Update compliance validation logic
4. Add framework-specific tests

### Custom Capability Types

1. Define capability schema
2. Implement binder strategy
3. Add capability to component registration
4. Update documentation and examples

## Best Practices

1. **Always use least privilege** - Grant minimal required permissions
2. **Enforce compliance** - Use appropriate compliance framework
3. **Validate bindings** - Check compliance before deployment
4. **Monitor access** - Enable comprehensive logging and monitoring
5. **Test thoroughly** - Include unit tests for all binding scenarios
6. **Document capabilities** - Clearly document what each capability provides
7. **Handle errors gracefully** - Provide clear error messages and remediation

## Troubleshooting

### Common Issues

1. **No binding strategy found**
   - Check component types and capability names
   - Verify strategy registration
   - Review compatibility matrix

2. **Compliance violations**
   - Review framework requirements
   - Check network restrictions
   - Verify IAM policy conditions

3. **Missing environment variables**
   - Check capability data structure
   - Verify environment variable mappings
   - Review component capability registration

### Debug Mode

Enable debug logging to see detailed binding information:

```typescript
process.env.DEBUG_BINDINGS = 'true';
```

This will log:
- Strategy selection process
- Binding context validation
- Compliance enforcement actions
- Environment variable generation
- IAM policy creation
- Security group rule configuration
