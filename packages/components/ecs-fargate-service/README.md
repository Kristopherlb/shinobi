# ECS Fargate Service Component

ECS Fargate Service component that provisions a production-ready microservice following the Platform ECS Service Connect, Logging, Monitoring, and Compliance standards. Runtime behaviour is fully configuration-driven through the shared ConfigBuilder precedence chain (platform defaults → environment defaults → component overrides → governance policies).

## Highlights

- Creates a Fargate task definition, service, and optional blue/green deployment wiring
- Integrates with ECS Service Connect for service discovery
- Supports VPC security group management and IAM task role injection
- Ships platform-aligned logging, monitoring, and tagging policies controlled via configuration
- Enables/Disables AWS Exec Command and alarm thresholds without touching code

## Quick Start

`examples/simple-synth.yml`

```yaml
components:
  - name: orders-api
    type: ecs-fargate-service
    config:
      cluster: shared-ecs-cluster
      image:
        repository: 123456789012.dkr.ecr.us-west-2.amazonaws.com/orders-api
        tag: 1.4.7
      cpu: 512
      memory: 1024
      port: 8080
      serviceConnect:
        portMappingName: api
      environment:
        APP_ENV: production
      autoScaling:
        minCapacity: 2
        maxCapacity: 6
        targetCpuUtilization: 65
      monitoring:
        alarms:
          cpuUtilization:
            threshold: 75
          runningTaskCount:
            threshold: 2
      diagnostics:
        enableExecuteCommand: true
```

Platform defaults for Commercial, FedRAMP Moderate, and FedRAMP High live in `config/<framework>.yml`. Override only the values you need; the builder will merge them with the manifest and governance policies.

## Configuration Reference

### Required

| Property | Type | Description |
| --- | --- | --- |
| `cluster` | string | ECS cluster name or ARN |
| `image.repository` | string | Container image (ECR URI or public registry path) |

### Service Definition

| Property | Type | Default | Notes |
| --- | --- | --- | --- |
| `image.tag` | string | `latest` | Immutable tags recommended for production |
| `cpu` | number | Framework default (256–1024) | Must align with Fargate CPU values |
| `memory` | number | Framework default | Must be a valid partner for the selected CPU |
| `port` | number | `8080` | Container/service port |
| `serviceConnect.portMappingName` | string | `<component>-svc` | DNS friendly port mapping name |
| `serviceConnect.namespace` | string | Cluster namespace | Overrides the Cloud Map namespace discovered from the cluster |
| `environment` | map<string,string> | `{}` | Additional container environment variables |
| `secrets` | map<string,string> | `{}` | Map of env key → Secrets Manager ARN |
| `taskRoleArn` | string | auto-created | Reuse an existing IAM role if supplied |
| `desiredCount` | number | Framework default | Used when autoscaling is not configured |

### Auto Scaling

Set the block to enable Service Auto Scaling. Leave undefined to run at a fixed capacity.

```yaml
autoScaling:
  minCapacity: 2
  maxCapacity: 8
  targetCpuUtilization: 65
  targetMemoryUtilization: 70
```

### Deployment Strategy

Supports `rolling` (default) and `blue-green`. The latter requires ALB details and optionally traffic shifting settings. See `packages/components/ecs-fargate-service/tests` for fixture examples.

### Logging

| Property | Default | Description |
| --- | --- | --- |
| `logging.createLogGroup` | true | Provision a new CloudWatch Log Group |
| `logging.logGroupName` | `/ecs/<service>/<component>` | Override when integrating with central logging |
| `logging.streamPrefix` | `service` | Passed to the AWS Logs driver |
| `logging.retentionInDays` | Framework default (30/365/731) | Must be one of the supported CloudWatch retention enums |
| `logging.removalPolicy` | `destroy` (Commercial) / `retain` (FedRAMP) | Controls log data lifecycle |

### Monitoring

| Alarm | Default State | Threshold (Commercial / Mod / High) |
| --- | --- | --- |
| `cpuUtilization` | enabled | 85 / 80 / 70 |
| `memoryUtilization` | enabled | 90 / 85 / 75 |
| `runningTaskCount` | enabled | Desired/Min capacity | Comparison defaults to `lt` |

Each alarm supports overrides for `evaluationPeriods`, `periodMinutes`, `comparisonOperator`, `treatMissingData`, `statistic`, `datapointsToAlarm`, and custom tags.

### Diagnostics

`diagnostics.enableExecuteCommand` toggles AWS Exec Command. Commercial defaults to `false`; FedRAMP profiles default to `true`.

### Tags & Hardening

`tags` merges into the platform tagging service output. `hardeningProfile` defaults to `baseline`; supply your own profile string if you need to signal additional runtime guardrails.

## Capabilities

- `service:connect` – ECS Service Connect endpoint metadata (DNS, port, security group)

## Construct Handles

Registered handles (when created):

- `service` – `ecs.FargateService`
- `taskDefinition` – `ecs.FargateTaskDefinition`
- `securityGroup` – managed security group
- `logGroup` – created CloudWatch Log Group (skipped when imported)

## Testing

```bash
corepack pnpm exec tsc -b packages/core/tsconfig.json
corepack pnpm exec jest --runTestsByPath \
  packages/components/ecs-fargate-service/tests/ecs-fargate-service.builder.test.ts \
  packages/components/ecs-fargate-service/tests/ecs-fargate-service.component.synthesis.test.ts
```

## Related Standards

- Platform Component Contract v1.0
- ECS Service Connect Standard v1.0
- Logging & Monitoring Standards v1.2
