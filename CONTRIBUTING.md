# Contributing to the Platform

This guide explains how to contribute new components, stacks, and capabilities to the platform. It covers the complete development lifecycle from component creation to testing and integration.

## Table of Contents

1. [Component Development](#component-development)
2. [Configuration Management](#configuration-management)
3. [Binding & Trigger Integration](#binding--trigger-integration)
4. [Testing Requirements](#testing-requirements)
5. [Quality Standards](#quality-standards)
6. [Platform Integration](#platform-integration)

## Component Development

### Creating a New Component

#### 1. Project Structure

Each component follows a standardized package structure:

```
packages/components/your-component/
├── src/
│   ├── index.ts                    # Main export file
│   ├── your-component.component.ts # Component implementation
│   └── your-component.creator.ts   # Component factory (optional)
├── package.json                    # Package configuration
├── tsconfig.json                   # TypeScript configuration
└── README.md                       # Component documentation
```

#### 2. Component Implementation

All components must extend the `Component` abstract class from `@platform/contracts`:

```typescript
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {
  Component,
  ComponentSpec,
  ComponentContext,
  ComponentCapabilities,
  ComponentConfigSchema
} from '@platform/contracts';

/**
 * Configuration interface for your component
 */
export interface YourComponentConfig {
  /** Required configuration property */
  requiredProperty: string;
  
  /** Optional configuration with default */
  optionalProperty?: string;
  
  /** Nested configuration object */
  advanced?: {
    setting1?: boolean;
    setting2?: number;
  };
}

/**
 * Configuration schema for validation
 */
export const YOUR_COMPONENT_CONFIG_SCHEMA: ComponentConfigSchema = {
  type: 'object',
  title: 'Your Component Configuration',
  description: 'Configuration for creating your AWS resource',
  required: ['requiredProperty'],
  properties: {
    requiredProperty: {
      type: 'string',
      description: 'Description of required property',
      pattern: '^[a-zA-Z][a-zA-Z0-9-]*$'
    },
    optionalProperty: {
      type: 'string',
      description: 'Description of optional property',
      default: 'default-value'
    }
  },
  additionalProperties: false,
  defaults: {
    optionalProperty: 'default-value'
  }
};

/**
 * Configuration builder for your component
 * REQUIRED: Every component MUST implement a dedicated ConfigBuilder class
 */
export class YourComponentConfigBuilder {
  private context: ComponentContext;
  private spec: ComponentSpec;
  
  constructor(context: ComponentContext, spec: ComponentSpec) {
    this.context = context;
    this.spec = spec;
  }

  /**
   * Builds the final configuration by applying platform defaults, compliance frameworks, and user overrides
   */
  public async build(): Promise<YourComponentConfig> {
    return this.buildSync();
  }

  /**
   * Synchronous version of build for use in synth() method
   */
  public buildSync(): YourComponentConfig {
    // Start with platform defaults
    const platformDefaults = this.getPlatformDefaults();
    
    // Apply compliance framework defaults
    const complianceDefaults = this.getComplianceFrameworkDefaults();
    
    // Merge user configuration from spec
    const userConfig = this.spec.config || {};
    
    // Merge configurations (user config takes precedence)
    const mergedConfig = this.mergeConfigs(
      this.mergeConfigs(platformDefaults, complianceDefaults),
      userConfig
    );
    
    return mergedConfig as YourComponentConfig;
  }

  /**
   * Simple merge utility for combining configuration objects
   */
  private mergeConfigs(target: Record<string, any>, source: Record<string, any>): Record<string, any> {
    const result = { ...target };
    
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.mergeConfigs(result[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    
    return result;
  }

  /**
   * Get platform-wide defaults for your component
   */
  private getPlatformDefaults(): Record<string, any> {
    return {
      optionalProperty: 'default-value',
      advanced: {
        setting1: false,
        setting2: 100
      }
    };
  }

  /**
   * Get compliance framework specific defaults
   */
  private getComplianceFrameworkDefaults(): Record<string, any> {
    const framework = this.context.complianceFramework;
    
    switch (framework) {
      case 'fedramp-moderate':
        return {
          advanced: {
            setting1: true, // Enhanced security for compliance
            setting2: 200   // Increased limits for reliability
          }
        };
        
      case 'fedramp-high':
        return {
          advanced: {
            setting1: true, // Mandatory security features
            setting2: 300   // Maximum limits for high compliance
          }
        };
        
      default: // commercial
        return {};
    }
  }
}

/**
 * Your Component implementation
 */
export class YourComponent extends Component {
  private yourResource?: YourAwsResource;
  private config?: YourComponentConfig;

  constructor(scope: Construct, id: string, context: ComponentContext, spec: ComponentSpec) {
    super(scope, id, context, spec);
  }

  /**
   * Synthesis phase - Create AWS resources
   */
  public synth(): void {
    this.logComponentEvent('synthesis_start', 'Starting your component synthesis');
    
    try {
      // Build configuration using ConfigBuilder (REQUIRED)
      const configBuilder = new YourComponentConfigBuilder(this.context, this.spec);
      this.config = configBuilder.buildSync();
      
      // Create AWS resources
      this.createYourResource();
      
      // Apply compliance hardening
      this.applyComplianceHardening();
      
      // Register constructs for binding access
      this.registerConstruct('yourResource', this.yourResource!);
      
      // Register capabilities for other components
      this.registerCapability('your:capability', this.buildCapability());
      
      this.logComponentEvent('synthesis_complete', 'Component synthesis completed successfully');
    } catch (error) {
      this.logError(error as Error, 'component synthesis');
      throw error;
    }
  }

  /**
   * Get the capabilities this component provides
   */
  public getCapabilities(): ComponentCapabilities {
    this.validateSynthesized();
    return this.capabilities;
  }

  /**
   * Get the component type identifier
   */
  public getType(): string {
    return 'your-component';
  }


  private createYourResource(): void {
    const props = {
      // Map configuration to AWS CDK properties
      resourceName: `${this.context.serviceName}-${this.spec.name}`,
      // ... other properties
    };

    this.yourResource = new YourAwsResource(this, 'YourResource', props);
    
    // Apply standard tags (see Platform Tagging Standard v1.0)
    this.applyStandardTags(this.yourResource, {
      'resource-type': 'your-resource-type'
    });
    
    // Configure observability (see Platform OpenTelemetry Observability Standard v1.0)
    this.configureObservability(this.yourResource);
    
    this.logResourceCreation('your-resource', this.yourResource.resourceId);
  }

  private buildCapability(): YourCapability {
    return {
      resourceArn: this.yourResource!.resourceArn,
      endpointUrl: this.yourResource!.endpointUrl,
      // ... other capability data
    };
  }

  private applyComplianceHardening(): void {
    switch (this.context.complianceFramework) {
      case 'fedramp-high':
        this.applyFedrampHighHardening();
        break;
      case 'fedramp-moderate':
        this.applyFedrampModerateHardening();
        break;
      default:
        this.applyCommercialHardening();
        break;
    }
  }
}
```

#### 3. Package Configuration

Create `package.json` for your component:

```json
{
  "name": "@platform/your-component",
  "version": "1.0.0",
  "description": "Description of your component",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "test": "jest",
    "clean": "rm -rf dist"
  },
  "keywords": ["cdk", "aws", "your-service"],
  "author": "Platform Team",
  "license": "MIT",
  "dependencies": {
    "@platform/contracts": "^1.0.0",
    "@platform/logger": "^1.0.0",
    "@platform/tagging": "^1.0.0",
    "@platform/observability": "^1.0.0"
  },
  "peerDependencies": {
    "aws-cdk-lib": "^2.0.0",
    "constructs": "^10.0.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "@types/node": "^18.0.0",
    "jest": "^29.0.0",
    "@types/jest": "^29.0.0"
  }
}
```

#### 4. TypeScript Configuration

Create `tsconfig.json`:

```json
{
  "extends": "../../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["dist", "node_modules"]
}
```

## Configuration Management

### Schema-Driven Configuration

All components use JSON Schema for configuration validation:

1. **Define Configuration Interface**: TypeScript interface for type safety
2. **Create JSON Schema**: Validation rules, defaults, and documentation
3. **Apply Compliance Defaults**: Framework-specific configuration
4. **Environment Interpolation**: Support for environment-specific values

### Configuration Best Practices

```typescript
// Good: Strongly typed with validation
export interface ComponentConfig {
  /** Required setting with validation pattern */
  name: string;
  
  /** Optional with sensible default */
  timeout?: number;
  
  /** Compliance-aware nested config */
  security?: {
    encryptionEnabled?: boolean;
    keyRotationEnabled?: boolean;
  };
}

export const CONFIG_SCHEMA: ComponentConfigSchema = {
  type: 'object',
  required: ['name'],
  properties: {
    name: {
      type: 'string',
      pattern: '^[a-zA-Z][a-zA-Z0-9-]*$',
      minLength: 3,
      maxLength: 63
    },
    timeout: {
      type: 'number',
      minimum: 1,
      maximum: 900,
      default: 30
    }
  },
  defaults: {
    timeout: 30
  }
};
```

### Environment-Specific Configuration

Use the context hydrator for environment-specific settings:

```yaml
# service.yml
environments:
  dev:
    defaults:
      instanceClass: db.t3.micro
      backupRetention: 1
  prod:
    defaults:
      instanceClass: db.r5.large
      backupRetention: 30
      multiAz: true
```

## Binding & Trigger Integration

### Implementing Binding Support

To support the Platform Binding & Trigger Specification v1.0:

#### 1. Define Capabilities

Register capabilities in your component's `synth()` method:

```typescript
// Register standard capabilities using the vocabulary
this.registerCapability('db:postgres', {
  host: this.database.instanceEndpoint.hostname,
  port: this.database.instanceEndpoint.port,
  databaseName: this.config.dbName,
  secretArn: this.secret.secretArn
});

this.registerCapability('storage:s3', {
  bucketName: this.bucket.bucketName,
  bucketArn: this.bucket.bucketArn,
  region: this.context.region
});
```

#### 2. Create Binding Strategies

Implement binding strategies for your component:

```typescript
import { 
  BindingContext, 
  BindingResult, 
  IBinderStrategy,
  CompatibilityEntry
} from '@platform/contracts';

export class LambdaToYourResourceBinder implements IBinderStrategy {
  canHandle(sourceType: string, targetCapability: string): boolean {
    return ['lambda-api', 'lambda-worker'].includes(sourceType) && 
           targetCapability === 'your:capability';
  }

  bind(context: BindingContext): BindingResult {
    // Implement binding logic
    return {
      environmentVariables: {
        YOUR_RESOURCE_URL: 'https://...',
        YOUR_RESOURCE_ARN: 'arn:aws:...'
      },
      iamPolicies: ['your-resource-access-policy'],
      networkConfiguration: {
        securityGroups: ['sg-12345']
      }
    };
  }

  getCompatibilityMatrix(): CompatibilityEntry[] {
    return [{
      sourceType: 'lambda-api',
      targetType: 'your-component',
      capability: 'your:capability',
      supportedAccess: ['read', 'write', 'admin'],
      description: 'Lambda function access to your resource'
    }];
  }
}
```

#### 3. Support Triggers (for Event Sources)

If your component can trigger other components:

```typescript
import {
  TriggerContext,
  TriggerResult,
  ITriggerStrategy,
  TriggerCompatibilityEntry
} from '@platform/contracts';

export class YourResourceToLambdaTrigger implements ITriggerStrategy {
  canHandle(sourceType: string, targetType: string, eventType: string): boolean {
    return sourceType === 'your-component' && 
           targetType === 'lambda-worker' && 
           eventType === 'your.event.type';
  }

  trigger(context: TriggerContext): TriggerResult {
    // Implement trigger configuration
    return {
      triggerConfiguration: {
        eventSourceArn: context.source.getConstruct('yourResource')!.resourceArn,
        targetArn: context.target.getConstruct('lambdaFunction')!.functionArn,
        eventPattern: {
          source: ['your.service'],
          'detail-type': ['Your Event Type']
        }
      },
      iamPolicies: ['trigger-invocation-policy']
    };
  }

  getCompatibilityMatrix(): TriggerCompatibilityEntry[] {
    return [{
      sourceType: 'your-component',
      targetType: 'lambda-worker',
      eventType: 'your.event.type',
      supportedAccess: ['invoke'],
      description: 'Your resource triggering Lambda functions'
    }];
  }
}
```

## Testing Requirements

### Test Structure

Create comprehensive tests following the project patterns:

```
tests/
├── unit/
│   ├── your-component.test.ts       # Unit tests for component logic
│   ├── your-component-config.test.ts # Configuration validation tests
│   └── your-component-binding.test.ts # Binding strategy tests
├── integration/
│   └── your-component-integration.test.ts # Integration tests
└── e2e/
    └── your-component-e2e.test.ts   # End-to-end tests
```

### Unit Tests

```typescript
import { describe, test, expect, beforeEach } from '@jest/globals';
import { YourComponent } from '../src/your-component.component';
import { ComponentContext, ComponentSpec } from '@platform/contracts';

describe('YourComponent', () => {
  let component: YourComponent;
  let mockContext: ComponentContext;
  let mockSpec: ComponentSpec;

  beforeEach(() => {
    mockContext = {
      serviceName: 'test-service',
      environment: 'test',
      complianceFramework: 'commercial',
      scope: new cdk.Stack()
    };

    mockSpec = {
      name: 'test-component',
      type: 'your-component',
      config: {
        requiredProperty: 'test-value'
      }
    };

    component = new YourComponent(mockContext.scope, 'TestComponent', mockContext, mockSpec);
  });

  describe('Component Synthesis', () => {
    test('should synthesize successfully with valid configuration', () => {
      expect(() => component.synth()).not.toThrow();
    });

    test('should register expected capabilities', () => {
      component.synth();
      const capabilities = component.getCapabilities();
      
      expect(capabilities['your:capability']).toBeDefined();
      expect(capabilities['your:capability'].resourceArn).toMatch(/^arn:aws:/);
    });

    test('should apply compliance hardening for FedRAMP High', () => {
      mockContext.complianceFramework = 'fedramp-high';
      component.synth();
      
      // Verify enhanced security configurations
      const construct = component.getConstruct('yourResource');
      expect(construct).toBeDefined();
      // Add specific compliance checks
    });
  });

  describe('Configuration Validation', () => {
    test('should reject invalid configuration', () => {
      mockSpec.config = { invalidProperty: 'invalid' };
      
      expect(() => component.synth()).toThrow(/Invalid.*configuration/);
    });

    test('should apply default values', () => {
      mockSpec.config = { requiredProperty: 'test' }; // Missing optional property
      
      component.synth();
      // Verify defaults were applied
    });
  });
});
```

### Integration Tests

```typescript
import { describe, test, expect } from '@jest/globals';
import { ResolverEngine } from '@platform/core-engine';
import { Logger } from '@platform/logger';

describe('YourComponent Integration', () => {
  let resolverEngine: ResolverEngine;

  beforeEach(() => {
    resolverEngine = new ResolverEngine({ logger: new Logger() });
  });

  test('should integrate with Lambda binding', async () => {
    const manifest = {
      service: 'integration-test',
      owner: 'test-team',
      complianceFramework: 'commercial',
      components: [
        {
          name: 'your-resource',
          type: 'your-component',
          config: { requiredProperty: 'test' }
        },
        {
          name: 'api',
          type: 'lambda-api',
          config: { handler: 'index.handler' },
          binds: [{
            to: 'your-resource',
            capability: 'your:capability',
            access: 'read'
          }]
        }
      ]
    };

    const result = await resolverEngine.synthesize(manifest);
    
    // Verify binding was successful
    expect(result.bindings).toHaveLength(1);
    expect(result.bindings[0].capability).toBe('your:capability');
    
    // Verify CloudFormation template
    const template = result.app.synth().getStackByName('integration-test-stack').template;
    // Add specific template assertions
  });
});
```

### Coverage Requirements

All components must maintain:
- **90% minimum code coverage** across branches, functions, lines, and statements
- **Unit tests** for all public methods and edge cases
- **Integration tests** for component interactions
- **E2E tests** for complete workflows

### Test Execution

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test suites
npm test -- --testPathPattern=unit
npm test -- --testPathPattern=integration
npm test -- --testPathPattern=e2e
```

## Quality Standards

### Code Quality Requirements

1. **TypeScript Compliance**: All code must be properly typed with no `any` types
2. **ESLint Compliance**: Follow platform ESLint configuration
3. **Documentation**: Comprehensive JSDoc for all public APIs
4. **Error Handling**: Proper error handling with structured logging (see [Platform Structured Logging Standard v1.0](./docs/standards/structured-logging-standard-v1.0.md))
5. **Security**: No hardcoded secrets, proper sanitization
6. **Observability**: All components must implement standard observability patterns (see [Platform OpenTelemetry Observability Standard v1.0](./docs/standards/observability-standard-v1.0.md))
7. **Tagging**: All resources must follow standard tagging conventions (see [Platform Tagging Standard v1.0](./docs/standards/tagging-standard-v1.0.md))

### Compliance Requirements

All components must support three compliance tiers:

#### Commercial (Default)
- Basic logging and monitoring
- Standard encryption
- Cost-optimized configurations

#### FedRAMP Moderate
- Enhanced logging with longer retention
- Enhanced monitoring and alerting
- Customer-managed encryption keys
- Network isolation requirements

#### FedRAMP High
- Comprehensive audit logging
- Maximum security hardening
- STIG compliance configurations
- Air-gapped network requirements

### Implementation Example

```typescript
private applyFedrampHighHardening(): void {
  // Enhanced encryption
  this.resource.addPropertyOverride('EncryptionConfiguration', {
    KMSKeyId: this.kmsKey.keyArn,
    SSEAlgorithm: 'aws:kms'
  });

  // Audit logging
  const auditLogGroup = new logs.LogGroup(this, 'AuditLogs', {
    retention: logs.RetentionDays.ONE_YEAR,
    removalPolicy: cdk.RemovalPolicy.RETAIN
  });

  // STIG compliance tags
  this.applyStandardTags(this.resource, {
    'stig-compliance': 'true',
    'security-level': 'high',
    'audit-required': 'true'
  });
}
```

## Working in the Monorepo

### Monorepo Tooling

This platform uses a monorepo structure managed with modern tooling to ensure efficient development across multiple packages.

#### Essential Commands

```bash
# Scaffold a new component package
npm run scaffold:component -- --name your-component --type aws-resource

# Install dependencies for all packages
npm install

# Build all packages
npm run build

# Build a specific package
npm run build --workspace=@platform/your-component

# Run tests for a single package
npm test --workspace=@platform/your-component

# Run tests for all affected packages (based on git changes)
npm run test:affected

# Run all tests across the monorepo
npm run test:all

# Lint all packages
npm run lint

# Clean build artifacts
npm run clean
```

#### Managing Dependencies

```bash
# Add a dependency to a specific package
npm install lodash --workspace=@platform/your-component

# Add a dev dependency to a specific package
npm install --save-dev @types/lodash --workspace=@platform/your-component

# Add a dependency to the root (shared across all packages)
npm install typescript --save-dev

# Update dependencies across all packages
npm update
```

#### Development Workflow

```bash
# Start development mode (watches for changes)
npm run dev

# Watch and rebuild a specific component
npm run dev --workspace=@platform/your-component

# Run integration tests
npm run test:integration

# Generate code coverage report
npm run test:coverage

# Check for circular dependencies
npm run check:circular
```

#### Package Structure Validation

```bash
# Validate package.json structure across all packages
npm run validate:packages

# Check for missing exports
npm run check:exports

# Verify TypeScript configurations
npm run check:typescript
```

### Working with Component Dependencies

When your component depends on other platform components:

```bash
# Add a platform component as a dependency
npm install @platform/contracts --workspace=@platform/your-component

# Update to latest version of platform contracts
npm install @platform/contracts@latest --workspace=@platform/your-component
```

### Troubleshooting

```bash
# Clear all node_modules and reinstall
npm run clean:all && npm install

# Reset TypeScript cache
npm run clean:typescript

# Check package dependency graph
npm run deps:graph

# Find duplicate dependencies
npm run deps:check
```

## Platform Integration

### Component Registration

Register your component with the platform:

1. **Update Component Registry**: Add your component type to the registry
2. **Add to Templates**: Include in relevant service templates
3. **Update Documentation**: Add component documentation
4. **Integration Tests**: Verify end-to-end functionality

### Example Registration

```typescript
// In packages/components/index.ts
export { YourComponent } from './your-component/src';

// In packages/core-engine/src/component-registry.ts
import { YourComponent } from '@platform/your-component';

componentRegistry.register('your-component', {
  createComponent: (spec, context) => new YourComponent(context.scope, spec.name, context, spec),
  configSchema: YOUR_COMPONENT_CONFIG_SCHEMA,
  supportedFrameworks: ['commercial', 'fedramp-moderate', 'fedramp-high']
});
```

### Service Template Integration

```yaml
# In packages/templates/src/patterns/your-pattern/service.yml
service: '{{serviceName}}'
owner: '{{owner}}'
complianceFramework: '{{complianceFramework}}'

components:
  - name: your-resource
    type: your-component
    config:
      requiredProperty: '{{resourceName}}'
```

### Validation and Review

Before submission, ensure:

1. **All tests pass** with required coverage
2. **LSP diagnostics** are clean (no TypeScript errors)
3. **Component integrates** with existing binding strategies
4. **Documentation** is complete and accurate
5. **Security review** for compliance requirements
6. **Performance testing** under expected load

### Submission Process

1. **Create Feature Branch**: `git checkout -b feature/your-component`
2. **Implement Component**: Follow all guidelines above
3. **Run Full Test Suite**: Ensure all tests pass
4. **Update Documentation**: Include usage examples
5. **Submit Pull Request**: Include comprehensive description
6. **Address Review Feedback**: Iterate based on team review
7. **Merge to Main**: After approval and CI success

### Maintenance Responsibilities

Component authors are responsible for:

- **Bug fixes** and security updates
- **Compatibility** with platform updates
- **Performance optimization** based on usage metrics
- **Documentation updates** for new features
- **Migration guides** for breaking changes

## Additional Resources

### Core Platform Specifications
- [Platform Binding & Trigger Specification v1.0](./packages/platform/contracts/src/platform-binding-trigger-spec.ts)
- [Component API Contract](./packages/platform/contracts/src/component.ts)
- [Configuration Schema Guide](./packages/platform/contracts/src/component-interfaces.ts)

### Platform Standards
- [Platform Tagging Standard v1.0](./docs/standards/tagging-standard-v1.0.md)
- [Platform OpenTelemetry Observability Standard v1.0](./docs/standards/observability-standard-v1.0.md)
- [Platform Structured Logging Standard v1.0](./docs/standards/structured-logging-standard-v1.0.md)

### Development Resources
- [Testing Patterns](./tests/)
- [Compliance Requirements](./docs/compliance/)
- [Monorepo Development Guide](./docs/development/monorepo-guide.md)
- [Component Examples](./packages/components/)

For questions or support, contact the Platform Team or create an issue in the project repository.