# Platform Binders

**Layer:** Platform Validation & Planning
**Purpose:** High-level binding validation, compliance checking, and planning

## Architecture Overview

The Platform Binders system consists of three distinct layers:

```
┌─────────────────────────────────────────┐
│         Platform Binders Layer          │  ← You are here
├─────────────────────────────────────────┤
│ • Validate binding compatibility         │
│ • Enforce compliance framework rules    │
│ • Generate binding plans & metadata     │
│ • DOES NOT generate CDK code            │
└─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│       Core-Engine Binding Strategies    │
├─────────────────────────────────────────┤
│ • Generic Strategy pattern implementation│
│ • Basic component relationship logic    │
│ • Simple validation & error handling    │
└─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│          Resolver Binders               │
├─────────────────────────────────────────┤
│ • CDK-specific binding implementations  │
│ • Generate actual infrastructure code   │
│ • Work with real CDK constructs         │
│ • Handle IAM policies, environment vars │
└─────────────────────────────────────────┘
```

## Directory Structure

```
packages/core/src/platform/binders/
├── strategies/                     # AWS Service-specific binders
│   ├── analytics/                  # EMR, Kinesis, etc.
│   ├── compute/                    # ECS, Lambda, Batch, etc.
│   ├── database/                   # RDS, DynamoDB, Neptune
│   ├── messaging/                  # EventBridge, Step Functions
│   ├── storage/                    # S3, EFS, etc.
│   ├── security/                   # KMS, Secrets Manager
│   └── binder-strategy.ts          # Base interface
├── binding-context.ts              # Context for binding operations
├── component-binding.ts            # Binding definition interface
└── registry/                       # Advanced binder registries
```

## Purpose of Each Layer

### 1. Platform Binders (This Layer)
- **What it does:** Validates that binding requests are compliant and make sense
- **Example:** Ensures Lambda can connect to S3 bucket with proper permissions
- **Output:** Validation results, compliance metadata, planning information
- **Does NOT:** Generate CDK code or interact with AWS services

### 2. Core-Engine Binding Strategies
- **What it does:** Simple, generic component relationship logic
- **Example:** Basic "source -> target" binding pattern
- **Output:** Generic binding results
- **Use Case:** When you need basic binding functionality without AWS specifics

### 3. Resolver Binders
- **What it does:** Generate actual CDK infrastructure code
- **Example:** Creates IAM policies, environment variables, security groups
- **Output:** Real CDK constructs and resource configurations
- **Use Case:** When you need actual infrastructure to be created

## Example Flow

```typescript
// 1. User requests: Lambda API -> S3 Bucket (read access)
const bindingRequest = {
  from: 'lambda-api',
  to: 's3-bucket',
  capability: 'bucket:s3',
  access: ['read']
};

// 2. Platform Binder validates the request
const ecsBinder = new EcsFargateBinderStrategy();
const isValid = ecsBinder.canHandle('lambda-api', 's3-bucket', 'bucket:s3');
// Returns: true (valid combination)

// 3. Core-Engine Strategy provides generic binding logic
const strategy = binderRegistry.findStrategy('lambda-api', 'bucket:s3');
// Returns: Basic binding result with env vars, policies

// 4. Resolver Binder generates actual CDK code
const cdkBinding = resolverBinder.bind(context);
// Creates: IAM policies, S3 bucket policies, environment variables
```

## Key Differences

| Aspect | Platform Binders | Core-Engine | Resolver Binders |
|--------|------------------|-------------|------------------|
| **Purpose** | Validation & Planning | Generic Logic | Infrastructure |
| **AWS Specific** | Yes | No | Yes |
| **CDK Code** | No | No | Yes |
| **Compliance** | Full | Basic | Full |
| **Validation** | Extensive | Basic | Extensive |
| **Performance** | Fast | Fast | Slower |
| **Use Case** | Design-time | Generic | Runtime |

## When to Use Each Layer

### Use Platform Binders When:
- Validating binding requests at design time
- Checking compliance framework requirements
- Planning binding strategies
- Generating documentation/metadata

### Use Core-Engine When:
- Simple, generic component relationships
- Basic validation without AWS specifics
- Lightweight binding operations
- Testing or prototyping

### Use Resolver Binders When:
- Generating actual infrastructure code
- Working with real CDK constructs
- Creating IAM policies and security groups
- Full enterprise deployment scenarios

## Integration Points

- **Platform Binders** feed into **Resolver Binders** for final CDK generation
- **Core-Engine** provides basic functionality that both layers can use
- **Resolver Binders** consume the validation and planning from Platform Binders
- All layers work with the same `ComponentBinding` interface for consistency
