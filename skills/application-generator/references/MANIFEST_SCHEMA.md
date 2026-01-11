# Manifest Schema Reference

## Service Manifest Structure (service.yml)

The service manifest defines the complete application infrastructure using a declarative YAML format.

### Top-Level Structure

```yaml
service: <service-name>          # Required: Unique service identifier
owner: <team-name>               # Required: Team responsible for service
complianceFramework: <framework> # Required: commercial | fedramp-moderate | fedramp-high
region: <aws-region>             # Required: AWS region (e.g., us-west-2)
accountId: "<account-id>"        # Required: AWS account ID

environments:                    # Optional: Environment-specific defaults
  <env-name>:
    defaults:
      <key>: <value>             # Environment-specific default values

components:                     # Required: List of components
  - name: <component-name>       # Required: Unique component identifier
    type: <component-type>       # Required: Component type from registry
    config:                      # Optional: Component-specific configuration
      <config-key>: <config-value>
    binds:                       # Optional: Component bindings
      - to: <target-component>   # Required: Target component name
        capability: <capability> # Required: Capability type
        access: <access-level>    # Required: read | write | readwrite
```

### Component Configuration

Component configuration follows the schema defined in each component's `Config.schema.json` file.

**Example**: For `lambda-api` component, read `packages/components/lambda-api/Config.schema.json` to understand:
- Required fields (e.g., `functionName`, `handler`, `runtime`)
- Optional fields (e.g., `memorySize`, `timeoutSeconds`)
- Nested configuration (e.g., `deployment.codePath`, `logging.logRetentionDays`)
- Default values

### Component Bindings

Bindings connect components using the Standard Capability Vocabulary:

**Standard Capabilities**:
- `storage:s3` - S3 bucket access
- `messaging:sqs` - SQS queue access
- `db:postgres` - PostgreSQL database access
- `db:dynamodb` - DynamoDB table access
- `api:rest` - REST API endpoint
- `security:secrets` - Secrets Manager access
- `service:connect` - ECS Service Connect port mapping

**Access Levels**:
- `read` - Read-only access
- `write` - Write-only access
- `readwrite` - Read and write access

### Environment Defaults

Environment-specific defaults allow configuration to vary by environment:

```yaml
environments:
  dev:
    defaults:
      instanceSize: small
      enableDebug: true
      highRiskEnvironment: false
  prod:
    defaults:
      instanceSize: large
      enableDebug: false
      highRiskEnvironment: true
```

### Component References

Components can reference other components using `@component:<component-name>` syntax:

```yaml
eventSources:
  - type: sqs
    queueArn: "@component:processing-queue"
```

## Validation Rules

1. **Service Name**: Must be unique across all services
2. **Component Names**: Must be unique within a service
3. **Binding Targets**: Must reference existing components
4. **Capability Contracts**: Binding capability must match provider capability
5. **Configuration**: Must conform to component's Config.schema.json

## Examples

See `apps/api-s3-service/service.yml` for a complete example.

