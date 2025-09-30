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
