# Component Standards Anti-Patterns

This document lists common violations of the Component Standards Baseline and how to fix them.

## Critical Anti-Patterns

### ❌ Compliance Framework Checks in Component Code

**Violation**:
```typescript
// Component code
if (this.context.complianceFramework === 'fedramp-moderate') {
  this.useCustomerManagedKey = true;
}
```

**Fix**:
```typescript
// Component code (use config value)
if (this.config.encryption.useCustomerManagedKey) {
  this.kmsKey = new kms.Key(...);
}

// ConfigBuilder (risk-based flag)
protected getComplianceFrameworkDefaults(): Partial<MyServiceConfig> {
  const componentConfig = this.builderContext.spec.config as Partial<MyServiceConfig> | undefined;
  let isHighRisk = componentConfig?.highRiskEnvironment ?? false;
  
  try {
    const platformConfig = (this as any)._loadPlatformConfiguration();
    if (platformConfig?.highRiskEnvironment) {
      isHighRisk = true;
    }
  } catch {
    // Platform config might not be available in tests
  }
  
  if (isHighRisk) {
    return {
      encryption: { useCustomerManagedKey: true }
    };
  }
  
  return {};
}
```

### ❌ Hardcoded Security-Sensitive Values

**Violation**:
```typescript
// ConfigBuilder
protected getHardcodedFallbacks(): Partial<MyServiceConfig> {
  return {
    cors: { allowOrigins: ['https://example.com', '*'] },
    instanceType: 'm5.large',
    apiKey: 'sk_live_1234567890'
  };
}
```

**Fix**:
```typescript
// ConfigBuilder (safe defaults)
protected getHardcodedFallbacks(): Partial<MyServiceConfig> {
  return {
    cors: { allowOrigins: [] }, // Empty forces explicit config
    instanceType: 't3.micro', // Smallest available
    apiKey: undefined // Must be provided via Secrets Manager
  };
}
```

### ❌ Environment-Specific Conditionals

**Violation**:
```typescript
if (this.context.environment === 'prod' || this.context.environment === 'production') {
  this.instanceType = 'm5.large';
}
```

**Fix**: Use configuration layers (environment defaults, platform defaults) instead of code conditionals.

### ❌ Component Imports or Direct Instantiation

**Violation**:
```typescript
import { S3BucketComponent } from '../s3-bucket/s3-bucket.component';

public synth(): void {
  const bucket = new S3BucketComponent(this, 'Bucket', context, spec);
}
```

**Fix**: Use bindings and the Resolver Engine. Declare dependencies in `service.yml`:
```yaml
components:
  - name: api-lambda
    type: lambda-api
    binds:
      - to: user-data-s3
        capability: storage:s3
```

### ❌ Network Calls or CLI in ConfigBuilder

**Violation**:
```typescript
protected getHardcodedFallbacks(): Partial<MyServiceConfig> {
  const response = await fetch('https://api.example.com/config');
  const output = execSync('aws ec2 describe-instances');
}
```

**Fix**: All configuration must come from static sources (YAML files, code defaults, context) that are version-controlled.

### ❌ Console.log Instead of Structured Logging

**Violation**:
```typescript
console.log('Creating resource');
console.error('Error occurred');
```

**Fix**:
```typescript
this.logComponentEvent('resource_creation_start', 'Creating resource');
this.logError(error as Error, 'Resource creation');
```

## Common Patterns to Verify

1. ✅ BaseComponent inheritance
2. ✅ ConfigBuilder with 5-layer precedence
3. ✅ Risk-based configuration (not framework checks)
4. ✅ Standard tags on all resources
5. ✅ Structured logging (not console.log)
6. ✅ OpenTelemetry observability (for compute components)
7. ✅ Capability and construct registration
8. ✅ CDK-Nag security tests
9. ✅ Template assertions
10. ✅ Triad matrix tests

