# Lambda API Component

Managed AWS Lambda function fronted by API Gateway with configuration-driven hardening that satisfies the platform standards across Commercial, FedRAMP Moderate, and FedRAMP High environments. All behaviour is sourced from the manifest + `/config/<framework>.yml` defaults – there are no inline compliance switches.

## Key Features

- **ConfigBuilder Precedence** – Five-layer merge managed by the shared `ConfigBuilder`; defaults live under `config/` per framework.
- **Hardened Lambda Runtime** – Runtime, architecture, memory, timeout, log retention, tracing, and Falco instrumentation resolved from config.
- **REST API Gateway** – Stage logging, metrics, throttling, CORS, usage plans, and optional API keys are configuration-only.
- **Observability & Monitoring** – CloudWatch alarms for Lambda errors/throttles/duration and API 4xx/5xx plus OTEL telemetry injection.
- **VPC & Encryption Ready** – VPC wiring, KMS environment encryption, and removal policies controlled via manifest/config.
- **Standardised Capabilities** – Registers `lambda:function` and `api:rest` capability payloads for downstream binders.

## Example Manifest

```yaml
components:
  - name: checkout-api
    type: lambda-api
    config:
      handler: src/http.handler
      runtime: python3.11
      memorySize: 1024
      timeoutSeconds: 60
      environment:
        LOG_LEVEL: DEBUG
      deployment:
        codePath: ./dist
        inlineFallbackEnabled: false
      vpc:
        enabled: true
        vpcId: vpc-1234567890abcdef0
        subnetIds:
          - subnet-aaaa1111
          - subnet-bbbb2222
        securityGroupIds:
          - sg-0f00f0f0f0f0f0f0
      api:
        stageName: prod
        apiKeyRequired: true
        usagePlan:
          enabled: true
        cors:
          enabled: true
          allowOrigins:
            - https://app.example.com
          allowMethods:
            - GET
            - POST
          allowHeaders:
            - Content-Type
            - Authorization
          allowCredentials: true
      monitoring:
        enabled: true
        alarms:
          lambdaErrors:
            enabled: true
            threshold: 10
            periodMinutes: 1
```

## Configuration Surface

| Section | Description |
|---------|-------------|
| `handler`, `runtime`, `architecture`, `memorySize`, `timeoutSeconds` | Lambda execution settings resolved from config defaults per framework. |
| `logging` | Log retention days, format (`TEXT \| JSON`), and log levels export to environment variables. |
| `tracing.mode` | `Active` (default) or `PassThrough`; ties into X-Ray/OTEL requirements. |
| `deployment` | `codePath`, optional `assetHash`, and inline fallback toggle for bootstrap scenarios. |
| `vpc` | Enables VPC deployment with explicit `vpcId`, `subnetIds`, and `securityGroupIds`. Required for FedRAMP defaults. |
| `observability` | Controls OTEL layer injection plus additional resource attributes. Final env vars augmented by the platform observability service. |
| `monitoring.alarms` | Thresholds for Lambda errors, throttles, duration, and API 4xx/5xx metrics. All alarms tagged via `applyStandardTags`. |
| `api` | Stage name, throttling, usage plan, logging retention, and CORS definitions for the API Gateway REST API. |
| `securityTools.falco` | Enables Falco instrumentation when required (true by default for FedRAMP frameworks). |
| `hardeningProfile` | Baseline/fedramp-* string surfaced in capabilities for governance. |

Refer to `packages/components/lambda-api/Config.schema.json` for the full JSON schema.

## Compliance Defaults

| Framework | Highlights |
|-----------|------------|
| Commercial | 512 MB, 30s timeout, public CORS, access logging retained 90 days, usage plan disabled, VPC optional. |
| FedRAMP Moderate | 768 MB, 45s timeout, VPC + Falco enabled, API keys & usage plan required, logging retained 365 days. |
| FedRAMP High | 1024 MB ARM64, 60s timeout, stricter throttles, access logs retained 2555 days, usage plan required, Falco enabled, hardened CORS. |

All values are sourced from `config/commercial.yml`, `config/fedramp-moderate.yml`, and `config/fedramp-high.yml`. Update those files — not the component — to change framework behaviour.

## Capabilities

- `lambda:function` → ARN, runtime, memory, timeout, hardening profile, VPC and KMS metadata.
- `api:rest` → API ID, execute ARN, stage URL, and optional usage plan identifiers.

## Testing

The component follows the platform testing standard with targeted suites:

```bash
corepack pnpm exec jest --runTestsByPath \
  packages/components/lambda-api/tests/lambda-api.builder.test.ts \
  packages/components/lambda-api/tests/lambda-api.component.synthesis.test.ts \
  packages/components/lambda-api/tests/lambda-api.creator.test.ts
```

All suites use deterministic fixtures and assert the resolved CDK template for each compliance framework.

## Change Log

- **2025-03-27** – Migrated to `ConfigBuilder`, removed in-code compliance switches, added comprehensive monitoring/usage-plan support, refreshed docs/tests.
