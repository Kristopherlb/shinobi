# Auditable FedRAMP-Aware CDK Platform

An enterprise-grade Internal Developer Platform (IDP) that abstracts AWS CDK complexity while enforcing compliance guardrails and security best practices.

## Quick Start

### Installation

```bash
npm install -g @your-org/svc-cli
```

### Initialize Your First Service

```bash
mkdir my-service && cd my-service
svc init
```

The interactive setup will guide you through:
- Service name and ownership
- Compliance framework selection (Commercial, FedRAMP Moderate, FedRAMP High)
- Initial architecture pattern

### Validate and Plan

```bash
# Validate your service configuration
svc validate

# Generate deployment plan
svc plan --env dev
```

## Core Commands

### `svc init` - Initialize New Service

Create a new service with compliant defaults and architecture patterns.

```bash
# Interactive mode
svc init

# Non-interactive mode
svc init --name payment-api --owner payments-team --framework fedramp-moderate --pattern lambda-api-with-db

# Force initialization in non-empty directory
svc init --force
```

**Options:**
- `--name` - Service name (lowercase, hyphens allowed)
- `--owner` - Team or individual responsible for the service
- `--framework` - Compliance framework: `commercial`, `fedramp-moderate`, `fedramp-high`
- `--pattern` - Initial architecture pattern
- `--force` - Skip directory confirmation prompts

**Available Architecture Patterns:**
- **Empty** - Minimal setup for custom architectures
- **Lambda API with Database** - REST API with RDS PostgreSQL
- **Worker with Queue** - Background processing with SQS

### `svc validate` - Validate Configuration

Validates your `service.yml` against schema and compliance requirements.

```bash
# Validate current service
svc validate

# Validate specific file
svc validate --manifest ./custom-service.yml

# JSON output for CI/CD
svc validate --json
```

**Validation Stages:**
1. **YAML Parsing** - Syntax and structure validation
2. **Schema Validation** - Required fields and data types
3. **Context Hydration** - Environment variable resolution
4. **Semantic Validation** - Compliance and security policies

### `svc plan` - Generate Deployment Plan

Synthesizes infrastructure components and shows planned changes.

```bash
# Generate plan for development
svc plan --env dev

# Generate plan for production
svc plan --env prod

# JSON output
svc plan --env prod --json
```

**Plan Output Includes:**
- Component synthesis summary
- Infrastructure change analysis
- Compliance framework recommendations
- Security warnings and best practices

## Service Configuration

### Basic Service Structure

```yaml
# service.yml
service: my-api
owner: platform-team
runtime: nodejs20
complianceFramework: fedramp-moderate

environments:
  dev:
    defaults:
      lambdaMemory: 512
  prod:
    defaults:
      lambdaMemory: 1024

components:
  - name: api
    type: lambda-api
    config:
      routes:
        - method: GET
          path: /health
          handler: src/health.check
    binds:
      - to: database
        capability: db:postgres
        access: readwrite

  - name: database
    type: rds-postgres
    config:
      dbName: myapi
      encrypted: true
```

### Component Types

#### Lambda API (`lambda-api`)
REST API endpoints with AWS Lambda and API Gateway.

```yaml
components:
  - name: api
    type: lambda-api
    config:
      routes:
        - method: POST
          path: /users
          handler: src/users.create
        - method: GET
          path: /users/{id}
          handler: src/users.get
      cors: true
      timeout: 30
    overrides:
      function:
        memorySize: 1024
        reservedConcurrency: 100
```

#### RDS PostgreSQL (`rds-postgres`)
Managed PostgreSQL database instances.

```yaml
components:
  - name: database
    type: rds-postgres
    config:
      dbName: userdata
      multiAz: ${envIs:prod}
      backupRetentionDays: 30
      encrypted: true
      performanceInsights: true
    overrides:
      instance:
        class: db.r5.large
        storageGb: 100
```

#### S3 Bucket (`s3-bucket`)
Object storage with lifecycle policies.

```yaml
components:
  - name: storage
    type: s3-bucket
    config:
      versioning: true
      encryption: aws:kms
      publicAccess: false
      lifecycleRules:
        - id: archive-old-data
          status: Enabled
          transitions:
            - days: 30
              storageClass: STANDARD_IA
```

### Component Bindings

Connect components together with automatic IAM policy generation:

```yaml
components:
  - name: api
    binds:
      - to: database
        capability: db:postgres
        access: readwrite
        options:
          iamAuth: true
      - to: storage
        capability: bucket:s3
        access: write
        env:
          bucketName: STORAGE_BUCKET
```

**Access Levels:**
- `read` - Read-only access
- `write` - Write-only access  
- `readwrite` - Full read/write access

### Environment Configuration

Define environment-specific settings:

```yaml
environments:
  dev:
    defaults:
      logLevel: debug
      enableTracing: true
  prod:
    defaults:
      logLevel: info
      enableTracing: false
      
components:
  - name: api
    config:
      logLevel: ${env:logLevel}
      tracing: ${env:enableTracing}
    overrides:
      function:
        memorySize:
          dev: 512
          prod: 1024
```

**Environment Variables:**
- `${env:variableName}` - Environment-specific values
- `${envIs:environment}` - Boolean check for environment

## Compliance Frameworks

### Commercial
Standard security controls for commercial applications.

```yaml
complianceFramework: commercial
```

### FedRAMP Moderate
Enhanced security for controlled unclassified information.

```yaml
complianceFramework: fedramp-moderate
classification: controlled
auditLevel: detailed

# Automatic security enhancements:
# - Database encryption required
# - 30+ day backup retention
# - Performance insights enabled
# - Enhanced IAM policies
```

### FedRAMP High
Highest security level for sensitive government data.

```yaml
complianceFramework: fedramp-high
classification: controlled
auditLevel: detailed

# Additional security requirements:
# - Multi-AZ database deployment
# - Extended backup retention
# - Network isolation controls
# - Comprehensive audit logging
```

### Governance and Suppressions

Manage compliance exceptions with full audit trails:

```yaml
governance:
  cdkNag:
    suppress:
      - id: AwsSolutions-IAM5
        justification: "Required for cross-account S3 access"
        owner: "security-team"
        expiresOn: "2025-12-31"
        appliesTo:
          - component: api
```

## Advanced Features

### Escape Hatches (Patches)

For advanced CDK customizations beyond the platform's built-in components:

```typescript
// patches.ts
import { App, Stack } from 'aws-cdk-lib';

export function applyPatches(app: App, stacks: Stack[]) {
  // Custom CDK modifications
  const apiStack = stacks.find(s => s.stackName.includes('api'));
  if (apiStack) {
    // Add custom resources, modify properties, etc.
  }
}
```

### Custom Templates

Platform teams can add new architecture patterns:

```bash
# Template structure
src/templates/patterns/
├── event-driven-service/
│   ├── metadata.json
│   └── service.yml.mustache
└── microservice-mesh/
    ├── metadata.json
    └── service.yml.mustache
```

```json
// metadata.json
{
  "displayName": "Event-Driven Service",
  "description": "Event sourcing with DynamoDB and EventBridge",
  "features": [
    "DynamoDB event store",
    "EventBridge integration",
    "Lambda event handlers"
  ]
}
```

## Best Practices

### Service Naming
- Use kebab-case: `payment-processor`, `user-service`
- Be descriptive and specific
- Avoid abbreviations

### Component Organization
- Keep related components in the same service
- Use clear, descriptive component names
- Group by capability, not technology

### Environment Strategy
- Use `dev` for development and testing
- Use `staging` for pre-production validation
- Use `prod` for production workloads
- Consider compliance requirements for environment isolation

### Security Considerations
- Always enable encryption for data at rest
- Use IAM authentication where possible
- Set appropriate backup retention periods
- Regular review of governance suppressions

## Troubleshooting

### Common Validation Errors

**"Service manifest already exists"**
```bash
# Solution: Initialize in empty directory or use --force
svc init --force
```

**"Pattern 'xyz' not found in available templates"**
```bash
# Solution: Check available templates
svc init  # Shows available patterns in interactive mode
```

**"Missing required dependencies: git"**
```bash
# Solution: Install required system dependencies
brew install git  # macOS
apt-get install git  # Ubuntu/Debian
```

### FedRAMP Compliance Errors

**"FedRAMP requires encryption"**
```yaml
# Solution: Enable encryption for all data stores
components:
  - name: database
    config:
      encrypted: true
```

**"Backup retention insufficient for FedRAMP"**
```yaml
# Solution: Increase retention period
components:
  - name: database
    config:
      backupRetentionDays: 30  # Minimum for FedRAMP
```

### Getting Help

```bash
# Command help
svc --help
svc init --help
svc validate --help
svc plan --help

# Version information
svc --version
```

For additional support, consult your platform team or internal documentation.