# Platform Services

Enterprise-grade platform services that apply cross-cutting concerns to components after synthesis.

## Overview

Platform Services implement the **Service Injector Pattern** to centralize cross-cutting logic like observability, security scanning, cost optimization, and compliance hardening. This architecture ensures:

- **Single Responsibility**: Components focus solely on creating AWS resources
- **Centralized Standards**: All platform-wide logic exists in one place per concern
- **Extensible Design**: New services can be added without modifying components or core engine
- **Consistent Application**: All components automatically receive platform standards

## Architecture

Platform Services are applied in **Phase 2.5** of the synthesis pipeline, immediately after component synthesis but before binding:

```
Phase 1: Component Instantiation
Phase 2: Component Synthesis (create resources)
Phase 2.5: Platform Services Application ← Services applied here
Phase 3: Component Binding
Phase 4: Patching
Phase 5: Final Assembly
```

## Available Services

- **[ObservabilityService](./observability.service.ts)** - CloudWatch alarms and monitoring
- **CostOptimizationService** (Coming Soon) - Cost optimization recommendations
- **SecurityScanningService** (Coming Soon) - Compliance and vulnerability detection
- **BackupRecoveryService** (Coming Soon) - Automated backup strategies
- **PerformanceOptimizationService** (Coming Soon) - Performance tuning

## Creating a Platform Service

### 1. Implement IPlatformService Interface

```typescript
import { IPlatformService } from '../platform/contracts/platform-services';
import { Component } from '../platform/contracts/component';

export class YourService implements IPlatformService {
  public readonly name = 'YourService';
  
  /**
   * Apply your service logic to a fully synthesized component
   */
  public apply(component: Component): void {
    const componentType = component.getType();
    
    // Check if your service supports this component type
    if (!this.supportsComponent(componentType)) {
      return; // Gracefully skip unsupported types
    }
    
    // Apply your logic based on component type
    switch (componentType) {
      case 'your-supported-type':
        this.applyToSupportedType(component);
        break;
      // Add more cases as needed
    }
  }
  
  private supportsComponent(componentType: string): boolean {
    return ['your-supported-type'].includes(componentType);
  }
  
  private applyToSupportedType(component: Component): void {
    // Your implementation here
  }
}
```

### 2. Register Service in ResolverEngine

```typescript
// In src/core-engine/resolver-engine.ts
import { YourService } from '../services/your.service';

// Add to service registry configuration
const serviceContext: PlatformServiceContext = {
  // ... existing context
  serviceRegistry: {
    // ... existing services
    yourService: { enabled: true }
  }
};

// Add to enabled services
if (serviceContext.serviceRegistry.yourService?.enabled) {
  enabledServices.push(new YourService(serviceContext));
}
```

## Service Development Guidelines

### Design Principles

1. **Single Concern**: Each service handles exactly one cross-cutting concern
2. **Component Agnostic**: Services receive a synthesized component and determine how to enhance it
3. **Graceful Degradation**: Unsupported component types should be handled gracefully, not cause failures
4. **Idempotent**: Services should be safe to run multiple times
5. **Minimal Dependencies**: Services should have minimal external dependencies

### Best Practices

- **Component Type Checking**: Always check if your service supports the component type
- **Error Handling**: Catch and log errors without failing the entire synthesis
- **Performance**: Keep service application fast - avoid expensive operations
- **Logging**: Use structured logging with service name prefix
- **Testing**: Write comprehensive unit tests for all supported component types

### Component Access Patterns

```typescript
// Get component metadata
const componentType = component.getType();
const componentName = component.node.id;

// Access CDK constructs created by the component
const mainConstruct = component.getConstruct('main');
const databaseConstruct = component.getConstruct('database');

// Access component capabilities
const capabilities = component.getCapabilities();
const dbCapability = capabilities['db:postgres'];
```

## Configuration

Platform Services are configured via the `PlatformServiceRegistry` interface:

```typescript
export interface PlatformServiceRegistry {
  observability?: PlatformServiceConfig;
  costManagement?: PlatformServiceConfig;
  securityScanning?: PlatformServiceConfig;
  backupRecovery?: PlatformServiceConfig;
  performanceOptimization?: PlatformServiceConfig;
  featureFlag?: PlatformServiceConfig;
  logging?: PlatformServiceConfig;
  audit?: PlatformServiceConfig;
}
```

Each service can be:
- **Enabled/Disabled**: `{ enabled: true/false }`
- **Configured**: `{ enabled: true, config: { /* service-specific options */ } }`

## Testing Platform Services

### Unit Testing

```typescript
import { YourService } from './your.service';
import { Component } from '../platform/contracts/component';

describe('YourService', () => {
  let service: YourService;
  let mockComponent: Component;

  beforeEach(() => {
    service = new YourService(mockContext);
    mockComponent = createMockComponent('supported-type');
  });

  it('should apply service to supported component types', () => {
    expect(() => service.apply(mockComponent)).not.toThrow();
    // Add specific assertions about what your service did
  });

  it('should gracefully skip unsupported component types', () => {
    const unsupportedComponent = createMockComponent('unsupported-type');
    expect(() => service.apply(unsupportedComponent)).not.toThrow();
  });
});
```

### Integration Testing

Test services within the full synthesis pipeline:

```typescript
import { ResolverEngine } from '../core-engine/resolver-engine';

describe('YourService Integration', () => {
  it('should apply service during synthesis pipeline', async () => {
    const resolverEngine = new ResolverEngine(dependencies);
    const manifest = createTestManifest();
    
    const result = await resolverEngine.synthesize(manifest);
    
    // Verify your service was applied
    expect(result.components).toBeDefined();
    // Add specific assertions about service effects
  });
});
```

## Troubleshooting

### Common Issues

1. **Service Not Applied**
   - Check service is enabled in `PlatformServiceRegistry`
   - Verify service is added to `enabledServices` array in ResolverEngine
   - Ensure `supportsComponent()` returns true for your target types

2. **Service Throws Errors**
   - Add proper error handling around CDK construct access
   - Check that required constructs are registered by components
   - Validate component state before applying service logic

3. **Service Applied Multiple Times**
   - Services should be idempotent - safe to run multiple times
   - Consider adding guard conditions to prevent duplicate resources

4. **Performance Issues**
   - Profile service execution time
   - Consider async operations for expensive tasks
   - Cache expensive computations where possible

### Debug Mode

Enable detailed logging for service application:

```bash
DEBUG=platform:services npm run synth
```

This will show:
- Which services are enabled
- Component processing order
- Service execution times
- Skip/error details

## Examples

See the [ObservabilityService](./observability.service.ts) for a complete, production-ready implementation that:
- Supports 9+ component types
- Creates CloudWatch alarms based on compliance framework
- Handles errors gracefully
- Provides detailed logging
- Follows all best practices

## Contributing

When adding new Platform Services:

1. Follow the [Platform Service Injector Standard v1.0](../docs/platform-standards/platform-service-injector-standard.md)
2. Add comprehensive unit and integration tests
3. Update this documentation with your service
4. Add service to the registry interface
5. Provide usage examples

For questions or support, contact the Platform Team or create an issue in the project repository.
