# MCP Server Component

Model Context Protocol server that exposes the platform intelligence APIs. The component is fully configuration-driven: defaults live in `/config/<framework>.yml`, and the manifest should only describe deviations for an environment.

## Quick Start

```yaml
components:
  - name: platform-brain
    type: mcp-server
    config:
      container:
        cpu: 1024          # overrides platform default
        memory: 2048
      loadBalancer:
        enabled: true
        certificateArn: ${env:MCP_CERT_ARN}
      monitoring:
        alarms:
          cpuUtilization: 65
          memoryUtilization: 70
          responseTime: 1.5
```

## Configuration Surface (partial)

| Block | Highlights |
|-------|------------|
| `ecrRepository` | Name of the repository containing the MCP server image. |
| `container` | `imageTag`, `cpu`, `memory`, `taskCount`, `containerPort`. Supports number strings for env interpolation. |
| `loadBalancer` | Toggle ALB creation, optional `certificateArn`, `domainName`, and `internetFacing` flag. |
| `authentication` | `jwtSecretArn` and `tokenExpiration` for token issuance. |
| `dataSources` | Git/GitHub token ARNs, AWS cross-account roles, and template repository hints. |
| `logging` | `retentionDays` (honoured via `BaseComponent.mapLogRetentionDays`) and `logLevel`. |
| `monitoring` | Enable/disable alarms, detailed metrics, and per-alarm thresholds for CPU, memory, and response time. |
| `enableExecuteCommand` | Enables ECS Exec if permitted in the deployment environment. |

Refer to `packages/components/mcp-server/mcp-server.builder.ts` for the authoritative schema enforced by the ConfigBuilder.

## Capabilities

- `api:rest` – HTTPS endpoint (ALB URL or internal address when no ALB is created).
- `container:ecs` – ECS resources for binders requiring direct cluster/service access.

## Construct Handles

Registered handles for `patches.ts`: `main`, `cluster`, `service`, `taskDefinition`, `repository`, `loadBalancer`, `logGroup`.

## Compliance Defaults

Platform defaults for Commercial, FedRAMP Moderate, and FedRAMP High live in:

- `config/commercial.yml`
- `config/fedramp-moderate.yml`
- `config/fedramp-high.yml`

The component no longer branches on `context.complianceFramework`; update those YAML files to adjust per-framework behaviour.

## Testing

```bash
corepack pnpm exec jest \
  --runTestsByPath \
  packages/components/mcp-server/tests/mcp-server.builder.test.ts \
  packages/components/mcp-server/tests/mcp-server.component.synthesis.test.ts
```
