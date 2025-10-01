# Lambda Powertools Platform Services

This package provides enhanced observability capabilities for all Lambda components in the Shinobi platform while maintaining compatibility with existing OpenTelemetry (OTEL) + X-Ray infrastructure.

## Overview

The Lambda Powertools Platform Services extend your existing observability setup by adding AWS Lambda Powertools capabilities without replacing your current OTEL + X-Ray + structured logging infrastructure. This provides:

- **Enhanced Observability**: Automatic Lambda context injection, business metrics, and parameter store integration
- **Platform Consistency**: Shared across all Lambda components (lambda-api, lambda-worker, etc.)
- **Backward Compatibility**: Maintains existing OTEL + X-Ray setup
- **Compliance Ready**: Supports all compliance frameworks (commercial, FedRAMP, HIPAA)

## Architecture

```
Lambda Component (lambda-api, lambda-worker, etc.)
    ↓
Lambda Observability Service
    ↓
├── Base OTEL + X-Ray (Existing)
└── Powertools Enhancements (New)
    ├── Automatic Context Injection
    ├── Business Metrics
    ├── Parameter Store Integration
    └── Enhanced Audit Logging
```

## Components

### 1. LambdaPowertoolsExtensionHandler

Core handler that applies Powertools enhancements to Lambda functions.

**Features:**
- Automatic Powertools layer application
- Environment variable configuration
- IAM permissions management
- Runtime-specific optimizations

**Usage:**
```typescript
import { LambdaPowertoolsExtensionHandler } from '@shinobi/core/platform/services/lambda-powertools';

const handler = LambdaPowertoolsExtensionHandler.create(context, {
  enabled: true,
  serviceName: 'my-service',
  businessMetrics: true,
  parameterStore: true,
  auditLogging: true
});

const result = handler.applyPowertoolsEnhancements(component, observabilityConfig);
```

### 2. LambdaObservabilityService

Unified service that combines base OTEL instrumentation with Powertools enhancements.

**Features:**
- Complete observability management
- Factory methods for different use cases
- Configuration management
- Error handling and logging

**Usage:**
```typescript
import { LambdaObservabilityService } from '@shinobi/core/platform/services/lambda-powertools';

// Create service for worker Lambda
const workerService = LambdaObservabilityService.createWorkerService(
  context,
  'my-worker-service',
  'commercial'
);

// Apply complete observability
const result = await workerService.applyObservability(component);
```

## Factory Methods

### Create Worker Service
```typescript
const workerService = LambdaObservabilityService.createWorkerService(
  context,
  'worker-service',
  'commercial'
);
```
- Optimized for background processing
- Business metrics enabled
- Reduced logging (WARN level)
- Worker-specific metrics namespace

### Create Audit Service
```typescript
const auditService = LambdaObservabilityService.createAuditService(
  context,
  'audit-service',
  'fedramp-moderate'
);
```
- Enhanced audit logging
- Full event capture
- Business metrics enabled
- Debug-level logging
- Audit-specific metrics namespace

### Create Custom Service
```typescript
const customService = LambdaObservabilityService.create(
  context,
  'custom-service',
  'commercial',
  {
    businessMetrics: true,
    parameterStore: true,
    auditLogging: false,
    logLevel: 'INFO'
  }
);
```

## Configuration

### LambdaPowertoolsConfig

```typescript
interface LambdaPowertoolsConfig {
  enabled?: boolean;                    // Enable Powertools
  layerArn?: string;                    // Custom layer ARN
  enableLogger?: boolean;               // Enable Powertools Logger
  enableTracer?: boolean;               // Enable Powertools Tracer
  enableMetrics?: boolean;              // Enable Powertools Metrics
  enableParameters?: boolean;           // Enable Parameter Store integration
  enableIdempotency?: boolean;          // Enable Idempotency utility
  logLevel?: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
  serviceName?: string;                 // Service name
  metricsNamespace?: string;            // Metrics namespace
  businessMetrics?: boolean;            // Enable business metrics
  parameterStore?: boolean;             // Enable parameter store
  auditLogging?: boolean;               // Enable audit logging
  logEvent?: boolean;                   // Enable event logging
}
```

## Integration with Lambda Components

### Lambda Worker Component

```typescript
// In your lambda-worker component
import { LambdaObservabilityService } from '@shinobi/core/platform/services/lambda-powertools';

export class LambdaWorkerComponent extends BaseComponent {
  public async applyPowertoolsObservability(): Promise<void> {
    const observabilityService = LambdaObservabilityService.createWorkerService(
      this.context,
      this.config!.functionName,
      this.context.complianceFramework,
      {
        businessMetrics: true,
        auditLogging: false,
        logLevel: 'INFO'
      }
    );

    const result = await observabilityService.applyObservability(this);
    
    if (!result.success) {
      throw new Error(`Failed to apply Powertools observability: ${result.error}`);
    }
  }
}
```

### Lambda API Component

```typescript
// In your lambda-api component
export class LambdaApiComponent extends BaseComponent {
  public async applyPowertoolsObservability(): Promise<void> {
    const observabilityService = LambdaObservabilityService.create(
      this.context,
      this.config!.functionName,
      this.context.complianceFramework,
      {
        businessMetrics: true,
        auditLogging: true,
        parameterStore: true,
        logLevel: 'INFO'
      }
    );

    const result = await observabilityService.applyObservability(this);
    
    if (!result.success) {
      throw new Error(`Failed to apply Powertools observability: ${result.error}`);
    }
  }
}
```

## Enhanced Capabilities

### 1. Automatic Context Injection

Powertools automatically injects Lambda context into your logs and metrics:

```typescript
// Before (manual)
logger.info('Processing request', {
  functionName: process.env.AWS_LAMBDA_FUNCTION_NAME,
  requestId: context.awsRequestId,
  // ... manual context
});

// After (automatic)
logger.info('Processing request', {
  // Lambda context automatically injected
  // functionName, requestId, etc. added automatically
});
```

### 2. Business Metrics

Collect custom business metrics with automatic Lambda context:

```typescript
// Business metrics with automatic context
metrics.addMetric('UserRegistrations', 'Count', 1);
metrics.addMetric('ProcessingTime', 'Milliseconds', duration);
```

### 3. Parameter Store Integration

Secure configuration management with caching:

```typescript
// Parameter store with automatic caching
const apiKey = await parameters.get('/my-service/api-key');
const config = await parameters.get('/my-service/config', { transform: 'json' });
```

### 4. Enhanced Audit Logging

Comprehensive audit trails for compliance:

```typescript
// Audit logging with automatic context
auditLogger.info('User action performed', {
  action: 'user.create',
  userId: 'user-123',
  // Lambda context automatically included
});
```

## Compliance Framework Support

### Commercial
- Basic observability features
- Standard logging levels
- Essential metrics collection

### FedRAMP Moderate
- Enhanced audit logging
- Parameter store integration
- Comprehensive metrics collection
- VPC-aware configuration

### FedRAMP High
- Full audit trail capture
- Enhanced security logging
- Comprehensive parameter store integration
- Advanced business metrics
- Maximum observability

## Migration Guide

### From Component-Specific Powertools

**Before:**
```typescript
// In lambda-worker component
import { LambdaPowertoolsExtensionHandler } from './lambda-powertools-extension.handler';
```

**After:**
```typescript
// In lambda-worker component
import { LambdaObservabilityService } from '@shinobi/core/platform/services/lambda-powertools';
```

### Benefits of Migration

1. **Centralized Management**: All Lambda components use the same Powertools configuration
2. **Consistent Behavior**: Standardized observability across all Lambda functions
3. **Easier Maintenance**: Single location for Powertools updates and configuration
4. **Better Testing**: Centralized testing of Powertools functionality
5. **Platform Integration**: Seamless integration with platform observability standards

## Testing

The platform includes comprehensive tests for all Powertools functionality:

```bash
# Run Powertools tests
npm test -- --testPathPattern="lambda-powertools"

# Run specific test suites
npm test -- --testNamePattern="LambdaPowertoolsExtensionHandler"
npm test -- --testNamePattern="LambdaObservabilityService"
```

## Best Practices

### 1. Use Factory Methods
Prefer factory methods over manual configuration:

```typescript
// Good
const service = LambdaObservabilityService.createWorkerService(context, 'my-service', 'commercial');

// Avoid
const service = new LambdaObservabilityService(context, complexConfig);
```

### 2. Configure Based on Use Case
Use appropriate factory methods for different Lambda types:

- **Worker Lambdas**: `createWorkerService()` - Optimized for background processing
- **API Lambdas**: `create()` with custom config - Full observability for user-facing APIs
- **Audit Lambdas**: `createAuditService()` - Enhanced logging for compliance

### 3. Leverage Business Metrics
Use business metrics for application-specific monitoring:

```typescript
const service = LambdaObservabilityService.create(context, 'my-service', 'commercial', {
  businessMetrics: true
});

// In your Lambda function
metrics.addMetric('OrdersProcessed', 'Count', 1);
metrics.addMetric('ProcessingLatency', 'Milliseconds', duration);
```

### 4. Use Parameter Store for Configuration
Leverage parameter store integration for secure configuration:

```typescript
const service = LambdaObservabilityService.create(context, 'my-service', 'commercial', {
  parameterStore: true
});

// In your Lambda function
const config = await parameters.get('/my-service/config', { transform: 'json' });
```

## Troubleshooting

### Common Issues

1. **Layer Not Found**
   - Ensure the runtime is supported
   - Check the layer ARN is correct for your region

2. **IAM Permissions**
   - Verify IAM permissions are applied correctly
   - Check CloudWatch Logs permissions

3. **Environment Variables**
   - Ensure all required environment variables are set
   - Check for typos in environment variable names

### Debug Mode

Enable debug logging for troubleshooting:

```typescript
const service = LambdaObservabilityService.create(context, 'my-service', 'commercial', {
  logLevel: 'DEBUG'
});
```

## Support

For issues or questions about Lambda Powertools Platform Services:

1. Check the troubleshooting section above
2. Review the test cases for usage examples
3. Consult the platform documentation
4. Contact the platform engineering team

## Future Enhancements

Planned improvements include:

- **Additional Powertools Utilities**: Idempotency, Event Handler, etc.
- **Enhanced Metrics**: Custom metric dimensions and namespaces
- **Advanced Caching**: Intelligent parameter store caching strategies
- **Compliance Automation**: Automatic compliance framework detection
- **Performance Optimization**: Reduced cold start impact
