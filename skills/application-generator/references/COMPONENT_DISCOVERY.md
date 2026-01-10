# Component Discovery Guide

## How to Discover Available Components

### 1. Query Component Registry

Components are registered in the platform's component registry. To discover available components:

```bash
# List all component types
find packages/components -name "*.creator.ts" | xargs grep "componentType"

# Or check component directories
ls packages/components/
```

### 2. Read Component Config.schema.json

Each component has a `Config.schema.json` file that defines its configuration schema:

```bash
# Find all Config.schema.json files
find packages/components -name "Config.schema.json"

# Read a specific component's schema
cat packages/components/lambda-api/Config.schema.json
```

The schema defines:
- **Required fields**: Fields that must be provided
- **Optional fields**: Fields with default values
- **Field types**: string, number, boolean, object, array
- **Field constraints**: minLength, maxLength, pattern, enum
- **Nested configuration**: Object structures for complex config

### 3. Read Component Builder

The builder class (`{component-type}.builder.ts`) provides:
- **Configuration precedence chain**: How config layers are merged
- **Default values**: Hardcoded fallbacks and compliance defaults
- **Validation logic**: Custom validation beyond JSON Schema
- **Capability requirements**: What capabilities the component needs

```bash
# Find builder files
find packages/components -name "*.builder.ts"

# Read a specific builder
cat packages/components/lambda-api/lambda-api.builder.ts
```

### 4. Check Component README

Component README files provide:
- **Usage examples**: How to configure the component
- **Best practices**: Recommended configuration patterns
- **Capability registration**: What capabilities the component provides
- **Binding examples**: How to bind to other components

```bash
# Find README files
find packages/components -name "README.md"

# Read a specific README
cat packages/components/lambda-api/README.md
```

### 5. Query Capability Registration

To understand what capabilities a component provides:

```bash
# Find capability registrations
grep -r "registerCapability" packages/components

# Find specific capability
grep -r "registerCapability.*messaging:sqs" packages/components
```

## Component Discovery Process

When generating an application:

1. **Identify Requirements**: What services/components are needed?
   - API endpoint → `lambda-api`
   - File storage → `s3-bucket`
   - Message queue → `sqs-queue`
   - Database → `dynamodb-table` or `rds-postgres`

2. **Query Component Registry**: Find available component types

3. **Read Config Schemas**: Understand configuration options for each component

4. **Check Builders**: Understand default values and validation

5. **Verify Capabilities**: Ensure components can bind together

6. **Generate Manifest**: Create service.yml with proper configuration

## Example: Discovering Lambda API Component

```bash
# 1. Find component
ls packages/components/ | grep lambda

# 2. Read Config.schema.json
cat packages/components/lambda-api/Config.schema.json

# 3. Read builder
cat packages/components/lambda-api/lambda-api.builder.ts

# 4. Read README
cat packages/components/lambda-api/README.md

# 5. Check capabilities
grep -r "registerCapability" packages/components/lambda-api/
```

## Component Capability Matrix

| Component Type | Provides Capabilities | Requires Capabilities |
|---------------|----------------------|----------------------|
| `lambda-api` | `api:rest` | `storage:s3`, `db:*`, `security:secrets` |
| `lambda-worker` | (none) | `messaging:sqs`, `storage:s3`, `db:*` |
| `s3-bucket` | `storage:s3` | (none) |
| `sqs-queue` | `messaging:sqs` | (none) |
| `dynamodb-table` | `db:dynamodb` | (none) |
| `rds-postgres` | `db:postgres` | (none) |
| `ecs-fargate-service` | `service:connect` | `storage:s3`, `db:*`, `security:secrets` |

## Validation

Before generating a manifest, validate:
1. All component types exist in registry
2. All component configs conform to Config.schema.json
3. All bindings reference existing components
4. All capability contracts match (provider ↔ consumer)
5. All access levels are appropriate

