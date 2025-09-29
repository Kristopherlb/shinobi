# Lambda Worker Component

Asynchronous worker Lambda built on the platform ConfigBuilder contract. All
runtime/security/observability defaults are provided by `/config/<framework>.yml`
– the component simply consumes the resolved configuration and instantiates the
function.

## Features

- Configurable runtime (Node.js/Python), architecture, memory, timeout, and
  reserved concurrency.
- Optional dead-letter queue, VPC networking, and KMS environment-variable
  encryption supplied via configuration.
- Event sources (SQS, EventBridge schedule, EventBridge pattern) defined in the
  manifest/config – the component wires them automatically.
- Logging, tracing, and OpenTelemetry settings fully configuration-driven.
- CloudWatch alarms for errors/throttles/duration and capability metadata with
  hardening profile exposure.

## Usage

```yaml
components:
  - name: image-resize-worker
    type: lambda-worker
    config:
      handler: index.handler
      runtime: nodejs20.x
      codePath: services/image-worker/dist
      memorySize: 512
      timeoutSeconds: 120
      environment:
        STAGE: prod
        SOURCE_BUCKET: images-raw
      deadLetterQueue:
        enabled: true
        queueArn: arn:aws:sqs:us-east-1:123456789012:image-worker-dlq
      eventSources:
        - type: sqs
          queueArn: arn:aws:sqs:us-east-1:123456789012:image-worker-queue
          batchSize: 5
      monitoring:
        enabled: true
        alarms:
          errors:
            enabled: true
          throttles:
            enabled: true
      logging:
        logRetentionDays: 90
        logFormat: JSON
      observability:
        otelEnabled: true
        otelLayerArn: arn:aws:lambda:us-east-1:901920570463:layer:aws-otel-nodejs-amd64-ver-1-18-1:4
        otelResourceAttributes:
          service.environment: prod
```

Any omitted property inherits the defaults for the active compliance framework
(`config/commercial.yml`, `config/fedramp-moderate.yml`, `config/fedramp-high.yml`).

## Key Configuration Sections

| Path | Description |
|------|-------------|
| `handler` | Required Lambda handler (`file.export`). |
| `runtime`, `architecture`, `memorySize`, `timeoutSeconds` | Core execution attributes. |
| `environment` | Plain key/value environment variables. |
| `deadLetterQueue` | Enable + queue ARN for async failure handling. |
| `eventSources[]` | SQS queues, EventBridge schedules, or patterns that trigger the function. |
| `vpc` | Optional VPC integration (VPC ID plus subnets/security-groups). |
| `kmsKeyArn` | Customer-managed key for environment variable encryption. |
| `logging` | Log retention/format and log-level controls. |
| `tracing` | Active or pass-through X-Ray tracing. |
| `observability` | OpenTelemetry toggle, optional layer ARN, resource attributes. |
| `securityTools` | Additional hardening toggles (Falco). |
| `monitoring` | Enable CloudWatch alarms for errors/throttles/duration. |
| `hardeningProfile` | Abstract profile exposed via capability metadata. |

## Capabilities

- `lambda:function` – ARN, name, runtime, timeout, and hardening profile of the
  worker function.

## Testing

```bash
corepack pnpm exec jest --runTestsByPath \
  packages/components/lambda-worker/tests/lambda-worker.builder.test.ts \
  packages/components/lambda-worker/tests/lambda-worker.component.synthesis.test.ts
```

## Notes

- The component does **not** infer behaviour from `context.complianceFramework`;
  enforce compliance using the segregated config defaults.
- Provide a real `codePath` containing your built artefacts; tests use a small
  fixture under `tests/fixtures/basic-lambda` for synthesis.
- When VPC integration is enabled, ensure the specified subnets/security groups
  exist in the deployment account/region.
