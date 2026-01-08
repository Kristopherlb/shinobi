---
name: application-generator
description: Generates complete applications with manifest (service.yml), local integration testing, end-to-end live testing, log retrieval mechanisms, and pre/post deploy validation. References manifest schema, component Config.schema.json files, and builders for capability validation.
compatibility: Requires access to @shinobi/core, component Config.schema.json files, manifest schema, and builder patterns. Designed for generating complete applications in the Shinobi platform.
metadata:
  author: shinobi-platform
  version: "1.0"
license: Apache-2.0
---

# application-generator

<!-- Degrees of Freedom: Medium - Provide structure with flexibility for different application types -->

## Instructions

1. **Analyze Requirements**: Understand the application requirements (compute, storage, messaging, API, etc.)
2. **Discover Components**: Query available components and their capabilities using:
   - Component registry to find available component types
   - Component Config.schema.json files to understand configuration options
   - Builder classes to understand capability requirements
3. **Generate Manifest (service.yml)**:
   - Create service.yml following manifest schema structure
   - Configure components with appropriate config from Config.schema.json
   - Set up bindings between components using capability vocabulary
   - Configure environments (dev, staging, prod) with appropriate defaults
4. **Generate Local Integration Tests**:
   - Create test fixtures for local component testing
   - Set up mock services for external dependencies
   - Generate test metadata following Platform Testing Standard
   - Create integration test suite with pre-deploy validation
5. **Generate End-to-End Live Tests**:
   - Create E2E test suite for deployed infrastructure
   - Set up test harness for live environment validation
   - Generate post-deploy validation checks
   - Create connectivity and correctness tests
6. **Generate Log Retrieval Mechanisms**:
   - Create log retrieval scripts for CloudWatch Logs
   - Set up structured log query patterns
   - Generate log correlation utilities
   - Create log export mechanisms for compliance
7. **Generate Pre/Post Deploy Validation**:
   - Create pre-deploy checks (schema validation, capability validation)
   - Create post-deploy checks (connectivity, health, correctness)
   - Generate validation scripts with error reporting
   - Create rollback triggers based on validation failures

### Critical Rules

**REQUIRED**: Always reference:
- **Manifest Schema**: Use service.yml structure from existing applications (e.g., `apps/api-s3-service/service.yml`)
- **Component Config.schema.json**: Read each component's `Config.schema.json` to understand configuration options
- **Builder Classes**: Reference component builders to understand capability requirements and validation
- **Capability Vocabulary**: Use standard capability names from `@shinobi/core` (e.g., `messaging:sqs`, `storage:s3`, `db:postgres`)

**Component Discovery Process**:
1. Query component registry for available types
2. Read `packages/components/{component-type}/Config.schema.json` for each component
3. Read `packages/components/{component-type}/{component-type}.builder.ts` to understand:
   - Configuration precedence chain
   - Required vs optional fields
   - Default values
   - Capability registration
4. Check component README.md for usage examples and best practices

**Binding Validation**:
- Verify binding targets exist in component list
- Validate capability contracts match (e.g., `messaging:sqs` provider with `messaging:sqs` consumer)
- Check access levels are appropriate (read, write, readwrite)
- Ensure IAM permissions will be generated correctly

**Testing Infrastructure**:
- Local tests: Use CDK synthesis and template assertions
- Integration tests: Test component interactions locally
- E2E tests: Test deployed infrastructure with real AWS services
- All tests must follow Platform Testing Standard (use `platform-testing-reviewer` skill)

## Examples

### Example 1: Generate API Service with S3 Storage

**Input**: "Generate an API service that stores files in S3"

**Process**:
1. **Discover Components**:
   - Query for `lambda-api` component (read `Config.schema.json`)
   - Query for `s3-bucket` component (read `Config.schema.json`)
   - Check builders for capability registration

2. **Generate Manifest**:
```yaml
service: file-api-service
owner: platform-team
complianceFramework: commercial
region: us-west-2

components:
  - name: file-api
    type: lambda-api
    config:
      # From lambda-api Config.schema.json
      functionName: file-api
      handler: src/handler.handler
      runtime: nodejs20.x
      # ... other required fields from schema
    binds:
      - to: file-bucket
        capability: storage:s3  # From s3-bucket capability registration
        access: readwrite

  - name: file-bucket
    type: s3-bucket
    config:
      # From s3-bucket Config.schema.json
      versioning: true
      encryption:
        type: AES256
```

3. **Generate Local Integration Tests**:
   - Create `tests/integration/local.test.ts` with CDK synthesis tests
   - Create test fixtures for Lambda and S3 components
   - Generate test metadata (`.meta.json`) following PTS-1.0

4. **Generate E2E Tests**:
   - Create `tests/e2e/live.test.ts` for deployed infrastructure
   - Test API endpoint connectivity
   - Test S3 upload/download operations
   - Validate IAM permissions

5. **Generate Log Retrieval**:
   - Create `scripts/get-logs.sh` for CloudWatch Logs retrieval
   - Create log query patterns for structured logs
   - Generate log correlation utilities

6. **Generate Pre/Post Deploy Validation**:
   - Create `scripts/pre-deploy-validate.sh`:
     - Validate service.yml schema
     - Validate component configs against Config.schema.json
     - Validate bindings and capabilities
   - Create `scripts/post-deploy-validate.sh`:
     - Test API endpoint health
     - Test S3 bucket connectivity
     - Validate CloudWatch alarms
     - Check log groups exist

### Example 2: Generate Queue Processing Service

**Input**: "Generate a service that processes messages from SQS and stores results in DynamoDB"

**Process**:
1. **Discover Components**:
   - Query for `lambda-worker` component (read `Config.schema.json`)
   - Query for `sqs-queue` component (read `Config.schema.json`)
   - Query for `dynamodb-table` component (read `Config.schema.json`)

2. **Generate Manifest**:
```yaml
components:
  - name: queue-processor
    type: lambda-worker
    config:
      # From lambda-worker Config.schema.json
      functionName: queue-processor
      handler: handler.handler
      runtime: nodejs20.x
      eventSources:
        - type: sqs
          queueArn: "@component:processing-queue"
    binds:
      - to: results-table
        capability: db:dynamodb
        access: readwrite

  - name: processing-queue
    type: sqs-queue
    config:
      # From sqs-queue Config.schema.json
      deadLetterQueue:
        enabled: true
        maxReceiveCount: 3

  - name: results-table
    type: dynamodb-table
    config:
      # From dynamodb-table Config.schema.json
      partitionKey: id
      billingMode: PAY_PER_REQUEST
```

3. **Generate Tests and Validation** (similar to Example 1)

## Bundled Resources

- **Scripts**: 
  - `scripts/generate-manifest.sh` - Generate service.yml from requirements
  - `scripts/generate-local-tests.sh` - Generate local integration test suite
  - `scripts/generate-e2e-tests.sh` - Generate end-to-end test suite
  - `scripts/generate-log-retrieval.sh` - Generate log retrieval utilities
  - `scripts/generate-validation.sh` - Generate pre/post deploy validation scripts

- **References**:
  - `references/MANIFEST_SCHEMA.md` - Manifest schema documentation
  - `references/COMPONENT_DISCOVERY.md` - How to discover components and capabilities
  - `references/TESTING_PATTERNS.md` - Testing patterns for local, integration, and E2E tests
  - `references/LOG_RETRIEVAL_PATTERNS.md` - Log retrieval patterns and CloudWatch queries
  - `references/VALIDATION_PATTERNS.md` - Pre/post deploy validation patterns

- **Assets**: Templates for common application patterns

## Cross-Skill Activation

- **component-standards-reviewer**: Validate generated components follow standards
- **platform-testing-reviewer**: Validate generated tests follow Platform Testing Standard
- **devops-knowledge-base**: Get AWS best practices for component configuration
- **arbiter-release-manager**: Generate release validation and evidence bundles

## Knowledge Index

Use these grep commands to find specific information:

```bash
# Find manifest examples
grep -r "service:" apps/*/service.yml

# Find component Config.schema.json files
find packages/components -name "Config.schema.json"

# Find capability registrations
grep -r "registerCapability" packages/components

# Find builder patterns
grep -r "extends ConfigBuilder" packages/components

# Find test patterns
grep -r "describe.*Integration" packages/components/tests
grep -r "describe.*E2E" packages/components/tests

# Find log retrieval patterns
grep -r "CloudWatch.*Log" packages/components
```

