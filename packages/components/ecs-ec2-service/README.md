# ECS EC2 Service Component

Configuration-driven ECS service that runs on EC2 capacity while following the platform monitoring, logging, and tagging standards. All behaviour is sourced from the shared `ConfigBuilder` precedence chain, so compliance-specific values belong in `config/<framework>.yml` rather than the component code.

## Highlights

- Creates an EC2-backed ECS service with Service Connect discovery
- Supports custom placement constraints/strategies, autoscaling, and health checks
- Centralised logging controls (retention + removal policy) with the base `mapLogRetentionDays` helper
- Monitoring thresholds for CPU/memory alarms resolved from configuration files
- Optional AWS Exec Command toggled through configuration

## Usage

```yaml
components:
  - name: orders-ec2
    type: ecs-ec2-service
    config:
      cluster: shared-ecs-cluster
      image:
        repository: 123456789012.dkr.ecr.us-east-1.amazonaws.com/orders
        tag: 1.4.0
      taskCpu: 512
      taskMemory: 1024
      port: 8080
      serviceConnect:
        portMappingName: api
        namespace: internal.local
      environment:
        APP_ENV: production
      autoScaling:
        minCapacity: 2
        maxCapacity: 6
        targetCpuUtilization: 65
      placementStrategies:
        - type: spread
          field: attribute:ecs.availability-zone
      logging:
        retentionInDays: 365
        removalPolicy: retain
      diagnostics:
        enableExecuteCommand: true
```

Platform defaults for Commercial, FedRAMP Moderate, and FedRAMP High live under `config/`. Override only the values you need in the manifest; the builder merges them with governance/policy layers automatically.

## Observability Configuration

### X-Ray Distributed Tracing

```yaml
components:
  - name: orders-ec2
    type: ecs-ec2-service
    config:
      cluster: shared-ecs-cluster
      image:
        repository: my-ecr-repo/orders-api
        tag: v1.0.0
      observability:
        xray:
          enabled: true
          mode: sidecar  # or 'centralized'
```

**Modes:**
- `sidecar` - Adds X-Ray daemon container to task (recommended for isolated environments)
- `centralized` - Uses account-level X-Ray collector (recommended for production with many services, lower overhead)

**Framework Defaults:**
- **Commercial**: Disabled (cost optimization)
- **FedRAMP Moderate**: Enabled with centralized mode
- **FedRAMP High**: Enabled with sidecar mode (better isolation)

### ADOT / OpenTelemetry

```yaml
components:
  - name: orders-ec2
    type: ecs-ec2-service
    config:
      observability:
        adot:
          enabled: true
          mode: centralized  # or 'sidecar'
          version: v0.35.0   # ADOT collector version
```

**Modes:**
- `sidecar` - Adds ADOT collector container to task (full isolation, higher resource usage)
- `centralized` - Uses account-level ADOT collector (lower overhead, shared infrastructure)

**Framework Defaults:**
- **Commercial**: Disabled (cost optimization)
- **FedRAMP Moderate**: Enabled with centralized mode
- **FedRAMP High**: Enabled with sidecar mode

### CloudWatch Dashboard

```yaml
components:
  - name: orders-ec2
    type: ecs-ec2-service
    config:
      observability:
        dashboard:
          enabled: true
          widgets: ["cpu", "memory", "tasks", "logs", "service-connect", "alarms"]
```

**Available Widgets:**
- `cpu` - CPU utilization over time
- `memory` - Memory utilization over time
- `tasks` - Desired vs Running vs Pending task count
- `logs` - Recent ERROR-level log entries (Log Insights)
- `service-connect` - Service Connect request metrics
- `alarms` - Alarm status widget

**Default**: All widgets enabled except service-connect

## Network Security

### Egress Policy Configuration

Control outbound network traffic for enhanced security:

```yaml
components:
  - name: secure-service
    type: ecs-ec2-service
    config:
      network:
        egressPolicy: vpc-endpoints-only  # Strictest policy
        vpcEndpoints:
          - pl-12345678  # CloudWatch Logs prefix list
          - pl-87654321  # Secrets Manager prefix list
          - pl-abcdef01  # ECR API prefix list
```

**Policies:**

| Policy | Allowed Egress | Use Case |
|--------|---------------|----------|
| `allow-all` | All outbound traffic | Development, testing, services needing external APIs |
| `vpc-only` | VPC CIDR only | Internal services with no external dependencies |
| `vpc-endpoints-only` | VPC endpoints via prefix lists | FedRAMP High, maximum security |

**Framework Defaults:**
- **Commercial**: `allow-all` (development-friendly)
- **FedRAMP Moderate**: `vpc-only` (more restrictive)
- **FedRAMP High**: `vpc-endpoints-only` (strictest, requires VPC endpoint configuration)

**Example for FedRAMP High:**

```yaml
components:
  - name: high-security-service
    type: ecs-ec2-service
    config:
      cluster: fedramp-cluster
      image:
        repository: dkr.ecr.us-gov-east-1.amazonaws.com/app
        tag: v2.0.0
      observability:
        xray:
          enabled: true
          mode: sidecar  # Sidecar for isolation
        adot:
          enabled: true
          mode: sidecar
      network:
        egressPolicy: vpc-endpoints-only
        vpcEndpoints:
          - pl-xxxxxx  # CloudWatch Logs endpoint
          - pl-yyyyyy  # Secrets Manager endpoint
          - pl-zzzzzz  # ECR API endpoint
```

Platform defaults for Commercial, FedRAMP Moderate, and FedRAMP High live under `config/`. Override only the values you need in the manifest; the builder merges them with governance/policy layers automatically.

## Key Configuration Blocks

| Block | Description |
| --- | --- |
| `taskCpu`, `taskMemory`, `desiredCount` | Container sizing and baseline capacity |
| `serviceConnect` | Port mapping name plus optional DNS/namespace overrides |
| `placementConstraints` / `placementStrategies` | ECS EC2 placement tuning (memberOf, distinctInstance, spread, binpack, random) |
| `logging` | `createLogGroup`, `retentionInDays`, `removalPolicy`, and optional `logGroupName` reuse |
| `monitoring.alarms` | CPU/memory alarm enablement, thresholds, and evaluation periods |
| `diagnostics` | Toggle AWS Exec Command support |

## Capabilities

- `service:connect` – Service Connect metadata for consumer bindings
- `otel:environment` – OpenTelemetry environment variables for downstream tasks

## Handles

- `service`, `taskDefinition`, `securityGroup`, `logGroup` (if created)

## Tests

```bash
corepack pnpm exec jest --runTestsByPath \
  packages/components/ecs-ec2-service/tests/ecs-ec2-service.builder.test.ts \
  packages/components/ecs-ec2-service/tests/ecs-ec2-service.component.synthesis.test.ts
```
