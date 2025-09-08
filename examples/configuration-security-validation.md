# Platform Configuration Security Validation Examples

This document provides examples of the automated validation described in **Platform Configuration Standard v1.0, Section 9**.

## ❌ INVALID Examples - Will Cause Synthesis Errors

### Example 1: Hardcoded CORS Origins (FORBIDDEN)
```typescript
// ❌ VIOLATION: api-gateway-rest.component.ts
protected getHardcodedFallbacks(): ApiGatewayRestConfig {
  return {
    cors: {
      allowOrigins: ['*'], // 🚨 ERROR: Prohibited hardcoded value
      allowOrigins: ['https://app.mycompany.com'], // 🚨 ERROR: Environment-specific domain hardcoded
    }
  };
}
```

**Validation Error:**
```
ERROR: ConfigBuilder validation failed
Component: api-gateway-rest
Issue: Prohibited hardcoded CORS origins detected
Found: allowOrigins: ['*']
Required: allowOrigins: [] (empty array to force explicit configuration)
```

### Example 2: Hardcoded Resource Limits (FORBIDDEN)
```typescript
// ❌ VIOLATION: rds-postgres.component.ts  
protected getHardcodedFallbacks(): RdsPostgresConfig {
  return {
    instance: {
      instanceClass: 'db.r5.xlarge' // 🚨 ERROR: Production-sized instance hardcoded
    },
    storage: {
      allocatedStorage: 1000 // 🚨 ERROR: Large storage allocation hardcoded
    }
  };
}
```

**Validation Error:**
```
ERROR: ConfigBuilder validation failed
Component: rds-postgres
Issue: Production resource limits detected in hardcoded fallbacks
Found: instanceClass: 'db.r5.xlarge', allocatedStorage: 1000
Required: Use minimal fallbacks (db.t3.micro, 20GB) - real limits from platform config
```

## ✅ VALID Examples - Security-Compliant Patterns

### Example 1: Secure CORS Configuration  
```typescript
// ✅ COMPLIANT: api-gateway-rest.component.ts
protected getHardcodedFallbacks(): ApiGatewayRestConfig {
  return {
    cors: {
      allowOrigins: [], // ✅ Empty array forces explicit configuration
      allowMethods: ['GET', 'POST', 'OPTIONS'], // ✅ Minimal safe methods
      allowHeaders: ['Content-Type', 'Authorization'], // ✅ Minimal safe headers
      allowCredentials: false // ✅ Always secure default
    }
  };
}
```

**Platform Configuration** (`config/commercial.yml`):
```yaml
api-gateway-rest:
  cors:
    allowOrigins:
      - "https://*.yourdomain.com"
      - "https://admin.yourdomain.com"
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
    allowCredentials: true
```

**Service Configuration** (`service.yml`):
```yaml
environments:
  dev-us-west-2:
    defaults:
      apiCorsOrigins:
        - "http://localhost:3000"
        - "https://dev-app.yourdomain.com"
        
  prod-us-west-2:
    defaults:
      apiCorsOrigins:
        - "https://app.yourdomain.com"
        - "https://www.yourdomain.com"

components:
  - name: main-api
    type: api-gateway-rest
    overrides:
      cors:
        allowOrigins: ${env:apiCorsOrigins}
```

### Example 2: Conservative Resource Defaults
```typescript
// ✅ COMPLIANT: rds-postgres.component.ts
protected getHardcodedFallbacks(): RdsPostgresConfig {
  return {
    instance: {
      instanceClass: 'db.t3.micro' // ✅ Smallest available - forces intentional sizing
    },
    storage: {
      allocatedStorage: 20 // ✅ Minimal storage - forces explicit capacity planning
    },
    networking: {
      publiclyAccessible: false // ✅ Always secure default
    }
  };
}
```

## 🔍 Validation Process Flow

### 1. Pre-Synthesis Validation
```typescript
// Platform runs this validation before synthesis
class ConfigBuilderValidator {
  validateHardcodedFallbacks(component: IComponent): ValidationResult {
    const fallbacks = component.configBuilder.getHardcodedFallbacks();
    
    // Check CORS origins
    if (fallbacks.cors?.allowOrigins?.length > 0) {
      return ValidationResult.ERROR("CORS origins must not be hardcoded");
    }
    
    // Check for domain names
    const configStr = JSON.stringify(fallbacks);
    if (configStr.match(/https?:\/\/|\.com|\.gov|\.mil/)) {
      return ValidationResult.ERROR("External domains detected in hardcoded fallbacks");
    }
    
    return ValidationResult.SUCCESS();
  }
}
```

### 2. Environment-Specific Validation  
```typescript
// Platform validates final merged configuration
class EnvironmentValidator {
  validateFinalConfig(config: any, environment: string): ValidationResult {
    // Production should never have wildcard CORS
    if (environment.includes('prod') && config.cors?.allowOrigins?.includes('*')) {
      return ValidationResult.ERROR("Wildcard CORS not allowed in production");
    }
    
    // FedRAMP environments require specific domains
    if (environment.includes('fedramp')) {
      const origins = config.cors?.allowOrigins || [];
      const hasGovDomains = origins.some(origin => origin.includes('.gov') || origin.includes('.mil'));
      if (!hasGovDomains && origins.length > 0) {
        return ValidationResult.WARNING("FedRAMP environments should use .gov/.mil domains");
      }
    }
    
    return ValidationResult.SUCCESS();
  }
}
```

### 3. Migration Assistance
```bash
# Platform CLI command to identify non-compliant components
$ platform validate config --security-scan

🔍 Scanning components for configuration security violations...

❌ api-gateway (CRITICAL): Hardcoded CORS origins ['*'] 
❌ rds-primary (HIGH): Production instance class hardcoded
⚠️  lambda-api (MEDIUM): Large memory allocation hardcoded
✅ s3-bucket (COMPLIANT): Security-safe defaults

📋 Migration required for 3 components
🚀 Run: platform migrate config --component=api-gateway --dry-run
```

## 📝 Code Review Checklist

When reviewing `ConfigBuilder` changes, verify:

- [ ] **CORS**: `allowOrigins` is empty array `[]` in hardcoded fallbacks
- [ ] **Domains**: No hardcoded URLs, DNS names, or domain-specific values
- [ ] **Resources**: Instance sizes, storage, limits use minimal conservative values  
- [ ] **Network**: Most restrictive defaults (no public access, minimal ports)
- [ ] **Authentication**: No hardcoded scopes, audiences, or credentials
- [ ] **Configuration Flow**: Security-sensitive values configured through Layers 2-5
- [ ] **Documentation**: Clear comments explaining security rationale

This validation ensures the platform maintains security while providing flexibility through the 5-layer configuration system.
