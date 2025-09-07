# Component API Contract Documentation

This directory contains the formal **Component API Contract Specification v1.0** - the definitive specification that governs how all components in the FedRAMP-Aware CDK Platform are built, how they behave, and how they interact with the core engine.

## Overview

The Component API Contract is the foundational document for any engineer contributing to the component library. It ensures that every component is a **predictable**, **secure**, and **composable** building block within the ecosystem.

## Contract Structure

### 1. Core Component Interface (`src/contracts/component.ts`)

Every component is a TypeScript class that extends the abstract `Component` base class:

```typescript
export abstract class Component extends Construct {
  protected readonly spec: ComponentSpec;
  protected readonly context: ComponentContext;
  protected readonly constructs: Map<string, IConstruct>;
  protected capabilities: ComponentCapabilities;

  // Must implement these methods:
  public abstract synth(): void;
  public abstract getCapabilities(): ComponentCapabilities;
  public abstract getType(): string;
}
```

**Key Requirements:**
- ✅ **`synth()`** - MUST populate both `constructs` and `capabilities` maps
- ✅ **`getCapabilities()`** - MUST throw error if called before synth()
- ✅ **`getType()`** - MUST return unique component type identifier

### 2. Standard Capability Vocabulary (`src/contracts/capabilities.ts`)

Standardized capability keys and data shapes for component interactions:

| Capability Key | Description | Data Shape | Example Provider |
|---|---|---|---|
| `db:postgres` | PostgreSQL database | `DbPostgresCapability` | `rds-postgres` |
| `db:dynamodb` | DynamoDB table | `DbDynamoDbCapability` | `dynamodb-table` |
| `queue:sqs` | SQS queue | `QueueSqsCapability` | `sqs-queue` |
| `topic:sns` | SNS topic | `TopicSnsCapability` | `sns-topic` |
| `bucket:s3` | S3 bucket | `BucketS3Capability` | `s3-bucket` |
| `api:rest` | REST API endpoint | `ApiRestCapability` | `lambda-api` |
| `lambda:function` | Lambda function | `LambdaFunctionCapability` | `lambda-worker` |

**Example Usage:**
```typescript
// Component provides capability
this.registerCapability('db:postgres', {
  host: database.instanceEndpoint.hostname,
  port: database.instanceEndpoint.port,
  dbName: 'orders',
  secretArn: secret.secretArn,
  sgId: securityGroup.securityGroupId,
  instanceArn: database.instanceArn
});

// Service binds to capability
binds:
  - to: shared-database
    capability: db:postgres
    access: readwrite
```

### 3. Configuration Contract (`src/contracts/configuration.ts`)

Every component MUST publish a `Config.schema.json` file defining its configuration schema:

```typescript
export interface ComponentConfigSchema extends JSONSchema7 {
  type: 'object';
  title: string;
  description: string;
  required?: string[];
  properties: { [key: string]: JSONSchema7 };
  additionalProperties?: boolean;
  defaults?: Record<string, any>;
}
```

**Configuration Builder Pattern:**
```typescript
export abstract class ConfigBuilder<TConfig> {
  public abstract build(): Promise<TConfig>;
  
  protected validateConfiguration(config: Record<string, any>): ConfigValidationResult;
  protected applyComplianceDefaults(config: Record<string, any>): Record<string, any>;
  protected resolveEnvironmentInterpolations(config: Record<string, any>): Record<string, any>;
}
```

### 4. Extensibility Contract (`src/contracts/extensibility.ts`)

**Overrides System:**
```typescript
// Allow-listed properties that can be safely overridden
export interface ComponentOverrideRegistry {
  componentType: string;
  allowedOverrides: {
    [constructHandle: string]: AllowedOverridePath[];
  };
}

// Usage in service.yml
overrides:
  database:
    instance.instanceClass: db.r5.large
    instance.allocatedStorage: 100
```

**Patches System:**
```typescript
// Governed "escape hatch" for structural changes
export interface PatchRegistration {
  function: string;
  description: string;
  owner: string;
  expirationDate: string;
  justification: string;
  riskLevel: 'low' | 'medium' | 'high';
}

// patches.ts
export function addCustomNetworking(context: PatchContext): void {
  const vpc = context.components.get('network');
  // Custom networking modifications
}
```

## Implementation Example

See `src/components/examples/rds-postgres-contract-example.component.ts` for a complete implementation example showing:

- ✅ **Configuration Schema** - JSON Schema definition
- ✅ **Configuration Builder** - Compliance defaults and validation
- ✅ **Component Implementation** - Proper synthesis and capability registration
- ✅ **Standard Capabilities** - DbPostgresCapability data shape
- ✅ **Construct Registration** - Proper handle mapping for overrides/patches

## Migration Path

**Existing Components (Legacy):**
- Continue using `src/components/base/base-component.ts`
- Marked as `@deprecated` but maintained for compatibility
- Can be gradually migrated to new contract

**New Components (Contract v1.0):**
- MUST use `src/contracts/component.ts`
- MUST implement all abstract methods
- MUST provide configuration schema
- MUST use standard capability vocabulary

## Benefits of the Contract System

### 🔒 **Security & Compliance**
- **Standardized Security**: All components follow same security patterns
- **Compliance Integration**: FedRAMP defaults applied automatically
- **Audit Trail**: Configuration changes tracked and validated

### 🔧 **Developer Experience**
- **Consistent API**: Same interface across all components
- **Type Safety**: Full TypeScript support with IntelliSense
- **Schema Validation**: Configuration validated at build time
- **Clear Documentation**: Standard interfaces are self-documenting

### 🏗️ **Platform Scalability**
- **Predictable Components**: Standard lifecycle and interfaces
- **Composable Architecture**: Components work together seamlessly
- **Extensibility**: Governed mechanisms for customization
- **Testing**: Standard patterns enable comprehensive testing

### 🔄 **Operational Excellence**
- **Configuration Management**: Environment-specific configuration
- **Monitoring Integration**: Standard capability patterns enable monitoring
- **Migration Support**: Structured upgrade paths between versions
- **Governance**: Override and patch systems with audit requirements

## Contract Validation

The platform validates contract compliance through:

1. **Build-Time Validation**: Schema validation of configurations
2. **Interface Checking**: TypeScript ensures proper method implementation
3. **Runtime Validation**: Capability and construct map population checks
4. **Test Coverage**: Standard test patterns for all contract methods

This contract system ensures that the FedRAMP-Aware CDK Platform remains a **reliable**, **secure**, and **scalable** foundation for enterprise infrastructure deployment! 🚀