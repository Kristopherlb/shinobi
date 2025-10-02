# Container Application Component

Provision an end-to-end ECS Fargate workload with an opinionated application
load balancer, CloudWatch observability, and hardened defaults. This component
translates a compact configuration into an ECS cluster, Fargate service,
application load balancer, optional HTTPS listener, and an ECR repository (or
reuse an existing one) without sacrificing governance.

## Features

- Deterministic 5-layer configuration precedence via the shared
  `ConfigBuilder` pipeline.
- Seamless reuse of existing VPCs, subnets, security groups, and ECR
  repositories when deploying into pre-provisioned environments—set
  `network.vpcId`, `network.subnetIds`, or `ecr.repositoryArn` to plug in.
- Built-in CloudWatch logging, alarms, and OpenTelemetry environment variables
  generated through `configureObservability`.
- Secure defaults: encryption at rest, image scanning on push, least-privilege
  secrets access, and VPC flow log support when the component owns the network.
- Target-tracking auto scaling policies for CPU and memory keep workloads right
  sized without manual intervention.

## Usage

```yaml
components:
  - name: web-app
    type: container-application
    config:
      application:
        name: web-app
        port: 8080
        environment:
          NODE_ENV: production
        secrets:
          DATABASE_URL: services/prod/database/url
      service:
        desiredCount: 3
        cpu: 1024
        memory: 2048
      network:
        assignPublicIp: false
        loadBalancerScheme: internal
      loadBalancer:
        port: 80
        sslCertificateArn: arn:aws:acm:us-east-1:123456789012:certificate/abc123
      ecr:
        createRepository: true
        maxImageCount: 20
      observability:
        logRetentionDays: 90
      security:
        enableEncryption: true
        enableVpcFlowLogs: true
        enableWaf: false
```

## Configuration Reference

| Path | Description |
|------|-------------|
| `application.name` | Application identifier used for ECS, logging, and repository naming (`^[a-z0-9-]+$`). |
| `application.port` | Primary container port exposed by the service (default `3000`). |
| `application.environment` | Map of additional environment variables injected into the container (default `{}`). |
| `application.secrets` | Map of environment variable name to Secrets Manager secret ID (default `{}`). |
| `service.desiredCount` | Desired number of running tasks (default `2`, min `1`, max `10`). |
| `service.cpu` | Task CPU units (enum `256`, `512`, `1024`, `2048`, `4096`; default `512`). |
| `service.memory` | Task memory in MiB (enum `512`–`8192`; default `1024`). |
| `service.healthCheck.*` | Container health check command and thresholds. |
| `network.vpcId` | Deploy into an existing VPC (otherwise a dedicated VPC is created). |
| `network.subnetIds` | Explicit subnet IDs for the ECS service and load balancer. |
| `network.securityGroupIds` | Existing security group IDs to attach to the service. |
| `network.assignPublicIp` | Assign public IPs to Fargate tasks (default `true`, disable when private egress is available). |
| `network.loadBalancerScheme` | Application Load Balancer scheme (`internet-facing` or `internal`; default `internet-facing`). |
| `network.natGateways` | NAT gateway count when creating a VPC (default `0`). |
| `loadBalancer.port` | HTTP listener port (default `80`). |
| `loadBalancer.sslCertificateArn` | ACM certificate ARN to enable HTTPS listener (optional). |
| `ecr.createRepository` | Create a dedicated ECR repository (default `true`). |
| `ecr.repositoryArn` | Existing repository ARN when `createRepository` is `false`. |
| `ecr.maxImageCount` | Images retained by lifecycle policy (default `10`). |
| `ecr.imageScanOnPush` | Enable ECR image scanning (default `true`). |
| `service.autoScaling.enabled` | Enable CPU/memory target tracking (default `true`). |
| `service.autoScaling.maxCapacity` | Upper bound for desired task count (default `4`). |
| `service.autoScaling.cpuTarget` | CPU utilisation target percentage (default `75`). |
| `service.autoScaling.memoryTarget` | Memory utilisation target percentage (default `80`). |
| `observability.enabled` | Toggle platform observability features (default `true`). |
| `observability.logRetentionDays` | CloudWatch log retention (default `30`). |
| `observability.cpuThreshold` | CPU alarm threshold percentage (default `80`). |
| `observability.memoryThreshold` | Memory alarm threshold percentage (default `85`). |
| `observability.enableTracing` | Enable AWS X-Ray tracing (default `true`). |
| `observability.enableMetrics` | Publish custom metrics (default `true`). |
| `security.enableEncryption` | Enable encryption at rest for supported resources (default `true`). |
| `security.enableVpcFlowLogs` | Enable VPC flow logs when the component owns the VPC (default `true`). |
| `security.enableWaf` | Associate AWS WAF with the load balancer (default `false`). |
| `security.webAclArn` | Existing WAF WebACL ARN required when `enableWaf` is true. |
| `tags` | Extra tags merged with platform standard tags (default `{}`). |

## Capabilities

- `service:connect` – ALB DNS name, listener port, and security group ID for
  downstream consumers or binders.
- `net:vpc` – VPC identifiers (public, private, isolated subnets) when the
  component creates or is provided a VPC.
- `otel:environment` – Computed OpenTelemetry environment variables injected
  into the workload.

## Construct Handles

- `cluster`
- `service`
- `taskDefinition`
- `loadBalancer`
- `targetGroup`
- `applicationLogs`
- `repository`

## Testing

```bash
corepack pnpm exec jest --runTestsByPath \
  packages/components/container-application/tests/container-application.builder.test.ts \
  packages/components/container-application/tests/container-application.component.test.ts
```

## Observability Runbook

See [`observability/container-application-observability.md`](./observability/container-application-observability.md)
for dashboards, alarm routing, and synthetic test guidance.
