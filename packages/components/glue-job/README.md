# Glue Job Component

The Glue Job component creates an AWS Glue job that honours the platform's configuration precedence chain. It pulls hardened defaults from `/config/<framework>.yml`, applies service manifest overrides, and synthesizes logging, security, and monitoring controls without embedding compliance-specific logic in the implementation.

## Usage Example

```yaml
components:
  - name: nightly-etl
    type: glue-job
    config:
      scriptLocation: s3://analytics-artifacts/scripts/nightly-etl.py
      description: Nightly batch ingest
      workerConfiguration:
        workerType: G.2X
        numberOfWorkers: 20
      defaultArguments:
        --extra-py-files: s3://analytics-artifacts/lib/helpers.zip
      security:
        encryption:
          enabled: true
          createCustomerManagedKey: true
      logging:
        groups:
          - id: security
            logGroupSuffix: security
            retentionDays: 90
            removalPolicy: destroy
          - id: compliance
            logGroupSuffix: compliance
            retentionDays: 365
            removalPolicy: retain
      monitoring:
        enabled: true
```

## Configuration Reference

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `scriptLocation` | string | ✅ | S3 URI to the Glue script. |
| `glueVersion` | string | | Glue runtime version (defaults per framework). |
| `jobType` | enum | | Glue job type (`glueetl`, `gluestreaming`, `pythonshell`, `glueray`). |
| `command.pythonVersion` | string | | Python runtime (defaults per framework). |
| `command.scriptArguments` | map | | Additional script arguments merged with platform defaults. |
| `workerConfiguration.workerType` | enum | | Worker type for the job. |
| `workerConfiguration.numberOfWorkers` | number | | Worker count. |
| `maxConcurrentRuns` | number | | Maximum concurrent runs. |
| `maxRetries` | number | | Retry attempts on failure. |
| `timeout` | number | | Timeout in minutes. |
| `defaultArguments` | map | | Overrides merged on top of platform-supplied defaults (`--TempDir`, `--job-bookmark-option`, `--enable-glue-datacatalog`). |
| `nonOverridableArguments` | map | | Arguments protected from job-level overrides. |
| `security.encryption.enabled` | boolean | | Enables Glue, CloudWatch, job bookmark, and S3 encryption enforcement. |
| `security.encryption.kmsKeyArn` | string | | Import an existing KMS key instead of creating one. |
| `security.encryption.createCustomerManagedKey` | boolean | | Create a managed key when no ARN is provided. |
| `security.encryption.removalPolicy` | enum | | Removal policy for the created key (`retain`/`destroy`). |
| `security.securityConfigurationName` | string | | Supply an existing Glue security configuration rather than generating one. |
| `logging.groups[]` | object | | Declarative log group list (`id`, `logGroupSuffix`, `retentionDays`, `removalPolicy`, `enabled`). |
| `monitoring.enabled` | boolean | | Toggles alarm creation. |
| `monitoring.jobFailure` | object | | Failure alarm thresholds: `threshold`, `evaluationPeriods`, `periodMinutes`. |
| `monitoring.jobDuration` | object | | Duration alarm thresholds: `thresholdMs`, `evaluationPeriods`, `periodMinutes`. |
| `tags` | map | | Additional resource tags merged with platform tagging. |

## Platform Defaults

The builder resolves configuration using the five-layer precedence chain. Per-framework defaults live in:

- `config/commercial.yml`
- `config/fedramp-moderate.yml`
- `config/fedramp-high.yml`

FedRAMP profiles enable customer-managed encryption keys, extend log retention, and turn on monitoring by default. The commercial profile keeps encryption optional and disables alarms unless explicitly enabled.

## Capabilities

| Capability | Description |
|------------|-------------|
| `etl:glue-job` | Exposes the job ARN, execution role ARN, security configuration, and monitoring flag for binders. |

## Construct Handles

| Handle | Description |
|--------|-------------|
| `main`, `glueJob` | The underlying `AWS::Glue::Job` L1 construct. |
| `executionRole` | Created Glue execution role (when the manifest does not supply `roleArn`). |
| `kmsKey` | Customer-managed key created for encryption (FedRAMP defaults). |
| `securityConfiguration` | Generated Glue security configuration. |
| `logGroup:<id>` | Log groups created from `logging.groups` (e.g. `logGroup:security`). |
| `alarm:jobFailure` / `alarm:jobDuration` | CloudWatch alarms when monitoring is enabled. |

## Compliance Notes

- **Commercial**: No KMS key or alarms unless requested; single security log group retained for 90 days.
- **FedRAMP Moderate**: Customer-managed KMS key, compliance log group retained for 1 year, alarms enabled.
- **FedRAMP High**: Adds 10-year audit log group, enables auto-scaling and enhanced worker defaults, alarms mandatory.

## Testing

```bash
# Config builder baseline
corepack pnpm exec jest --runTestsByPath packages/components/glue-job/tests/glue-job.builder.test.ts

# Component synthesis
corepack pnpm exec jest --runTestsByPath packages/components/glue-job/tests/glue-job.component.synthesis.test.ts
```
