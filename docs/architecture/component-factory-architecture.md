# Component Factory & Registry Architecture

## Overview

The Component Factory & Registry system provides a robust, type-safe way to instantiate and manage AWS components in the Shinobi platform. It follows a package-per-component architecture where each component type corresponds to a class in the `packages/components/` directory.

## Architecture Principles

### 1. Package-Per-Component Architecture
- Each component type (e.g., "s3-bucket", "lambda-api", "rds-postgres") has its own package
- Components export a subclass of `BaseComponent`
- Registry maps manifest types to constructors or factory functions

### 2. 5-Layer Configuration Precedence
The system implements a strict configuration precedence chain:

1. **Hardcoded Defaults** (lowest priority)
2. **Compliance Defaults** (framework-specific)
3. **Platform Defaults** (Shinobi platform standards)
4. **Environment Overrides** (environment-specific)
5. **Component Config** (highest priority)

### 3. CDK-Only Infrastructure
- All infrastructure is defined as code using AWS CDK
- No imperative AWS calls during synthesis
- Compliance differences handled via config builder

## Core Components

### ComponentFactory
The main factory class that orchestrates component creation:

```typescript
const factory = new ComponentFactory(registry, configBuilder);
const component = factory.create('s3-bucket', context, spec);
```

**Key Methods:**
- `create(type, context, spec)`: Creates component instances
- `isSupported(type)`: Checks if component type is supported
- `getSupportedTypes()`: Returns all supported component types

### ComponentRegistry
Maps component types to their constructors:

```typescript
const registry = new ComponentRegistry();
registry.register('s3-bucket', S3BucketComponent);
```

**Key Methods:**
- `register(type, componentClass)`: Registers a component type
- `getComponentClass(type)`: Retrieves component constructor
- `hasComponent(type)`: Checks if component is registered

### ComponentConfigBuilder
Implements the 5-layer configuration precedence:

```typescript
const config = configBuilder.buildConfig(type, context, spec);
```

**Configuration Layers:**
1. **Hardcoded Defaults**: Basic component defaults
2. **Compliance Defaults**: Framework-specific settings
3. **Platform Defaults**: Shinobi platform standards
4. **Environment Overrides**: Environment-specific overrides
5. **Component Config**: User-specified configuration

### BaseComponent
Abstract base class that all components must extend:

```typescript
export abstract class BaseComponent implements IComponent {
  abstract getType(): string;
  abstract getCapabilityData(): CapabilityData;
  abstract synth(): void;
  // ... other methods
}
```

## Usage Patterns

### 1. Creating a Component Factory

```typescript
import { ComponentFactoryBuilder } from '@shinobi/components';

const factory = new ComponentFactoryBuilder()
  .registerComponent('s3-bucket', S3BucketComponent)
  .registerComponent('lambda-api', LambdaApiComponent)
  .registerComponent('rds-postgres', RdsPostgresComponent)
  .build();
```

### 2. Creating Component Context

```typescript
import { ComponentContextBuilder } from '@shinobi/components';

const context = new ComponentContextBuilder()
  .serviceName('my-service')
  .environment('prod')
  .complianceFramework('fedramp-moderate')
  .region('us-west-2')
  .accountId('123456789012')
  .tags({ Environment: 'prod' })
  .build();
```

### 3. Creating Component Specification

```typescript
import { ComponentSpecBuilder } from '@shinobi/components';

const spec = new ComponentSpecBuilder()
  .name('my-bucket')
  .type('s3-bucket')
  .config({
    versioned: true,
    encryption: 'aws:kms'
  })
  .dependencies(['other-component'])
  .build();
```

### 4. Instantiating Components

```typescript
const component = factory.create('s3-bucket', context, spec);
```

## Service Manifest Integration

### Parsing Service Manifests

```typescript
import { ServiceManifestParser } from '@shinobi/components';

const parser = new ServiceManifestParser(factory);
const result = parser.parseManifest(manifest, 'prod');

// Access components
const components = result.components;
const context = result.context;
const dependencies = result.dependencies;
```

### Manifest Structure

```yaml
manifestVersion: "1.0.0"
service:
  name: "my-service"
  owner: "team@company.com"
  description: "My service description"
  tags:
    Environment: "prod"

environments:
  prod:
    complianceFramework: "fedramp-moderate"
    region: "us-west-2"
    accountId: "123456789012"
    overrides:
      components:
        my-bucket:
          versioned: false

components:
  - name: "my-bucket"
    type: "s3-bucket"
    config:
      versioned: true
      encryption: "aws:kms"
    dependencies:
      - "other-component"

binds:
  - from: "my-bucket"
    to: "other-component"
    capability: "s3:read"
    access: "read"
```

## Component Development

### Creating a New Component

1. **Create Component Class**:
```typescript
export class MyComponent extends BaseComponent {
  getType(): string {
    return 'my-component';
  }

  getCapabilityData(): CapabilityData {
    return {
      type: 'my-component',
      resources: { /* ... */ },
      capabilities: { /* ... */ },
      endpoints: { /* ... */ },
      credentials: { /* ... */ }
    };
  }

  synth(): void {
    // Create CDK constructs
  }
}
```

2. **Register Component**:
```typescript
registry.register('my-component', MyComponent);
```

3. **Add Configuration Defaults**:
```typescript
// In ComponentConfigBuilder
this.hardcodedDefaults.set('my-component', {
  // Default configuration
});
```

### Compliance Framework Support

Components automatically apply compliance-specific configurations:

```typescript
protected applyComplianceConfig(): void {
  switch (this.getComplianceFramework()) {
    case 'commercial':
      this.applyCommercialConfig();
      break;
    case 'fedramp-moderate':
      this.applyFedrampModerateConfig();
      break;
    case 'fedramp-high':
      this.applyFedrampHighConfig();
      break;
  }
}
```

## Configuration Precedence Examples

### S3 Bucket Configuration

**Layer 1 - Hardcoded Defaults:**
```typescript
{
  versioned: false,
  publicReadAccess: false,
  blockPublicAccess: true,
  encryption: 'AES256'
}
```

**Layer 2 - Compliance Defaults (FedRAMP Moderate):**
```typescript
{
  versioned: true,
  encryption: 'aws:kms',
  accessLogging: true
}
```

**Layer 3 - Platform Defaults:**
```typescript
{
  tags: {
    ManagedBy: 'Shinobi',
    Platform: 'AWS'
  }
}
```

**Layer 4 - Environment Overrides:**
```typescript
{
  versioned: false  // Override for this environment
}
```

**Layer 5 - Component Config:**
```typescript
{
  customProperty: 'user-value'  // User-specified
}
```

**Final Configuration:**
```typescript
{
  versioned: false,           // From Layer 4 (environment override)
  publicReadAccess: false,    // From Layer 1 (hardcoded)
  blockPublicAccess: true,    // From Layer 1 (hardcoded)
  encryption: 'aws:kms',      // From Layer 2 (compliance)
  accessLogging: true,        // From Layer 2 (compliance)
  tags: {                     // From Layer 3 (platform)
    ManagedBy: 'Shinobi',
    Platform: 'AWS'
  },
  customProperty: 'user-value' // From Layer 5 (component config)
}
```

## Testing

### Unit Tests

```typescript
describe('ComponentFactory', () => {
  it('should create component with correct configuration', () => {
    const component = factory.create('s3-bucket', context, spec);
    expect(component.getType()).toBe('s3-bucket');
    expect(component.getConfig().versioned).toBe(true);
  });
});
```

### Integration Tests

```typescript
describe('Service Manifest Parser', () => {
  it('should parse manifest and create components', () => {
    const result = parser.parseManifest(manifest, 'prod');
    expect(result.components.size).toBe(2);
    expect(result.context.complianceFramework).toBe('fedramp-moderate');
  });
});
```

## Error Handling

### Common Errors

1. **Unsupported Component Type**:
   ```
   Error: Unsupported component type: unsupported-type
   ```

2. **Missing Required Configuration**:
   ```
   Error: Service name is required
   ```

3. **Circular Dependencies**:
   ```
   Error: Circular dependency detected involving component: component-a
   ```

4. **Invalid Component Class**:
   ```
   Error: Component class must implement getType method
   ```

## Best Practices

### 1. Component Design
- Always extend `BaseComponent`
- Implement all required abstract methods
- Use configuration precedence for defaults
- Apply compliance-specific configurations

### 2. Configuration Management
- Use the 5-layer precedence chain
- Provide sensible defaults for each layer
- Document configuration options
- Validate configuration in `validateConfig()`

### 3. Error Handling
- Provide clear error messages
- Validate inputs early
- Use TypeScript for type safety
- Handle edge cases gracefully

### 4. Testing
- Write unit tests for all components
- Test configuration precedence
- Test compliance framework differences
- Test error conditions

## Future Enhancements

### 1. Dynamic Component Loading
- Load components from external packages
- Support component versioning
- Enable hot-swapping of components

### 2. Advanced Configuration
- Support for configuration templates
- Environment-specific configuration inheritance
- Configuration validation schemas

### 3. Monitoring and Observability
- Component instantiation metrics
- Configuration change tracking
- Performance monitoring

### 4. Developer Experience
- Component scaffolding tools
- Configuration validation in IDE
- Interactive component selection
