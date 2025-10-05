# Component Audits (API Gateway HTTP → EC2 Instance)

_Audit date: 2025-10-05. Standards referenced: all platform standards under `docs/platform-standards/` plus the AWS Labs MCP reference guidance exposed by `awslabs.cdk-mcp-server` (notably `static/CDK_GENERAL_GUIDANCE.md` and related assets)._ 

## Component: api-gateway-http

### Prompt 01 — Schema Validation
- `Config.schema.json` declares `$schema`/`$id`, but the root `required` array is empty. Several fields that the builder relies on (for example `customDomain.domainName` when `autoGenerateCertificate` is true) are only enforced in TypeScript/runtime. Align required fields with the schema so the MCP catalog returned by the AWS Labs server can validate manifests pre-flight.

### Prompt 02 — Tagging Standard
- `api-gateway-http.component.ts:82-118` applies `applyStandardTags` to the API, stage, custom domain, and log group. Route53 records (not taggable) are the only constructs left untouched. No gaps found versus the tagging matrix defined in `platform-tagging-standard.md`.

### Prompt 03 — Logging Standard
- Component logging is centralized through `this.getLogger('component.api-gateway-http')`. Access logging streams to a dedicated log group with retention settings (`createAccessLogGroup`). Structured logging compliance is met.

### Prompt 04 — Observability Standard
- `buildTelemetryRequirements` enumerates the CloudWatch metrics/alarms per the observability standard, and the component registers an `observability:api-gateway-http` capability. Ensure downstream consumers actually ingest those capability payloads—the AWS Labs guidance calls out the need to wire alarms into incident routes, which is currently left to the service author.

### Prompt 05 — CDK Best Practices
- Consistent with AWS Labs MCP guidance: uses L2 constructs, enforces TLS 1.2, and integrates WAF. No `cdk-nag` hooks are wired yet; consider adopting the `RulePack` recommendations from `awslabs.cdk_mcp_server.static.CDK_GENERAL_GUIDANCE.md` to close that gap.

### Prompt 06 — Component Versioning & Metadata
- Package version remains `0.0.1` despite a mature implementation and broad feature set. Before publishing through MCP, bump to a stable semver and ensure the CHANGELOG reflects the current behavior.

### Prompt 07 — Configuration Precedence Chain
- Builder extends the shared `ConfigBuilder` with JSON schema import, so Layers 1–4 are honored. Layer 5 (policy overrides) is documented but not yet implemented—note this for services that expect governance exceptions.

### Prompt 08 — Capability Binding & Binder Matrix
- Registers `api:http` and `observability:api-gateway-http`. Confirm the binder matrix lists `api:http` as a target for Lambda authorizers and VPC links; current registry does not yet surface the `observability` capability, so MCP clients cannot auto-connect telemetry routes.

### Prompt 09 — Internal Dependency Graph
- Depends only on `@shinobi/core`, `aws-cdk-lib`, and `constructs`. No component-to-component imports, preserving layering expectations.

### Prompt 10 — MCP Server API Contract Alignment
- `index.ts` exports the component and schema, so the Shinobi MCP server can serve `/platform/components/api-gateway-http/schema`. Ensure the generated schema is what the AWS Labs MCP validator expects (see Prompt 01).

### Prompt 11 — Security & Compliance
- WAF association and resource policy logging are in place, but there is no automated enforcement that API keys or JWT authorizers are present (left to config). Review against FedRAMP guidance to ensure default throttling/log retention meet mandatory floors.

---

## Component: api-gateway-rest

### Prompt 01 — Schema Validation
- Comprehensive schema with nested `required` clauses, but certain dependencies (e.g., method integrations) are validated only in builder logic. Align schema cross-field validation so MCP pre-validation can catch misconfigured integrations.

### Prompt 02 — Tagging Standard
- Uses `applyStandardTags` on the REST API, stage, log group, and API keys (`api-gateway-rest.component.ts:113-286`). Compliant with tagging policy.

### Prompt 03 — Logging Standard
- Access logs configured with JSON format and configurable retention. Component logging flows through the platform logger.

### Prompt 04 — Observability Standard
- Includes CloudWatch metrics/alarms and tracing toggles. The component does not surface an explicit observability capability; consider adding one to keep parity with AWS Labs observability guidance.

### Prompt 05 — CDK Best Practices
- L2 constructs, optional WAF, private endpoint support align with AWS Labs guidance. No `cdk-nag` automation yet.

### Prompt 06 — Component Versioning & Metadata
- Version `0.0.x` (check package.json) despite multiple features. Update versioning and CHANGELOG for MCP catalog accuracy.

### Prompt 07 — Configuration Precedence Chain
- Builder imports the shared `Config.schema.json` and delegates to `ConfigBuilder`; YAML framework defaults are respected. Policy override layer remains unimplemented.

### Prompt 08 — Capability Binding & Binder Matrix
- Registers REST API capability (check `registerCapabilities`). Confirm binder matrix supports `api:rest` (or equivalent) so clients can bind authorizers/integrations automatically.

### Prompt 09 — Internal Dependency Graph
- Depends only on core/platform libraries. No cycles detected.

### Prompt 10 — MCP Contract
- Schema and exports are in place. Ensure component metadata in MCP catalog includes descriptions for tooling (currently minimal).

### Prompt 11 — Security & Compliance
- Supports resource policies, WAF, API keys. Default CORS is open unless configured; enforce safer defaults for new services.

---

## Component: application-load-balancer

### Prompt 01 — Schema Validation
- Schema exists but root `required` array is empty. Required relationships (listeners vs. target groups) enforced at runtime only.

### Prompt 02 — Tagging Standard
- `applyStandardTags` applied to ALB, listeners, target groups. Access log bucket tagging left to bucket component—document this dependency.

### Prompt 03 — Logging Standard
- Structured component logging via `getLogger`. ALB access logs rely on external S3 bucket configuration—call this out for compliance tracking.

### Prompt 04 — Observability Standard
- Creates CloudWatch alarms for 5xx/latency when enabled. No explicit OTel capability; monitoring depends on log analytics downstream.

### Prompt 05 — CDK Best Practices
- Uses `ApplicationLoadBalancer` L2, security groups, and listener rules, matching AWS Labs best-practice doc. Add cdk-nag integration per AWS guidance.

### Prompt 06 — Component Versioning & Metadata
- Version still `0.0.x`; ensure release process increments when new listeners/features are added.

### Prompt 07 — Configuration Precedence Chain
- Builder extends ConfigBuilder with JSON schema; optional policy override layer still TODO.

### Prompt 08 — Capability Binding & Binder Matrix
- Registers load balancer endpoint/capability. Confirm binder matrix maps `network:alb` (or equivalent) to consumers like ECS.

### Prompt 09 — Internal Dependency Graph
- No cross-component imports. Depends on `@shinobi/core` and CDK libraries only.

### Prompt 10 — MCP Contract
- Schema exported; ensure capability metadata enumerates listener ARNs so MCP clients can bind target groups correctly.

### Prompt 11 — Security & Compliance
- Supports HTTPS listeners, security groups. Default security group rules allow 0.0.0.0/0 for HTTP unless overridden—flag for FedRAMP high environments.

---

## Component: auto-scaling-group

### Prompt 01 — Schema Validation
- Config schema enumerates defaults but lacks required relationships (e.g., when using mixed instances). Root `required` list is sparse.

### Prompt 02 — Tagging Standard
- Applies standard tags to ASG, launch template, security group. KMS key tagging handled when encryption enabled.

### Prompt 03 — Logging Standard
- Structured logging present. CloudWatch agent/user data installation mirrors Observability standard.

### Prompt 04 — Observability Standard
- Integrates detailed monitoring and registers relevant alarms when compliance demands. Consider exposing an explicit observability capability similar to EC2 component.

### Prompt 05 — CDK Best Practices
- Launch template hardening (IMDSv2, SSM agent) aligns with AWS Labs guidance. Document cdk-nag status.

### Prompt 06 — Component Versioning & Metadata
- Version still `0.0.x`; confirm semver increments with each feature (Nitro Enclaves, FedRAMP controls, etc.).

### Prompt 07 — Configuration Precedence Chain
- Builder uses ConfigBuilder with custom compliance overrides (similar to EC2). Ensure tests cover environment overrides (currently limited).

### Prompt 08 — Capability Binding & Binder Matrix
- Capability registration should expose autoscaling group identifiers for binders (e.g., to attach target groups). Verify binder matrix coverage.

### Prompt 09 — Internal Dependency Graph
- No forbidden dependencies observed.

### Prompt 10 — MCP Contract
- Exported through `index.ts`. Schema gaps noted above may surface as MCP validation misses.

### Prompt 11 — Security & Compliance
- FedRAMP paths enable encryption, IMDSv2, agents. Commercial defaults still allow public subnets; highlight for secure-by-default policy.

---

## Component: certificate-manager

### Prompt 01 — Schema Validation
- Schema enforces required fields (e.g., `domainName`) and supports multiple validation strategies. Looks MCP-ready.

### Prompt 02 — Tagging Standard
- Certificates (and log groups created for transparency logging) receive standard tags where CDK exposes tagging interfaces.

### Prompt 03 — Logging Standard
- Component logging uses `getLogger`; transparency logs directed to CloudWatch groups with retention.

### Prompt 04 — Observability Standard
- Alarms/logging for certificate expiration configured; meets observability expectations.

### Prompt 05 — CDK Best Practices
- Uses L2 constructs (`DnsValidatedCertificate`), honors AWS Labs security guidance. No automated nagging yet.

### Prompt 06 — Component Versioning & Metadata
- Verify version increments after adding FedRAMP support (current semver indicates early stage).

### Prompt 07 — Configuration Precedence Chain
- Builder extends ConfigBuilder and respects compliance defaults (transparency logging on for FedRAMP). Policy overrides pending.

### Prompt 08 — Capability Binding & Binder Matrix
- Registers certificate capability (ARN, hosted zone). Ensure binder matrix supports `tls:certificate` for ALB/CloudFront consumers.

### Prompt 09 — Internal Dependency Graph
- Clean dependency boundaries.

### Prompt 10 — MCP Contract
- Schema/exports available. Add capability metadata to MCP server catalog if missing.

### Prompt 11 — Security & Compliance
- Transparency logging, AWS-managed DDoS settings documented. Confirm FedRAMP high automation adds CMK-based logging where required.

---

## Component: cloudfront-distribution

### Prompt 01 — Schema Validation
- Schema enumerates many options but leaves several conditional requirements to runtime (e.g., origins vs. behaviors). Extend schema for stronger MCP validation.

### Prompt 02 — Tagging Standard
- Applies platform tags to distributions, buckets, and log groups where applicable.

### Prompt 03 — Logging Standard
- Access logging options exist but rely on external bucket. Component logging uses structured logger.

### Prompt 04 — Observability Standard
- Supports CloudWatch/Real-time metrics toggles. No explicit OTel capability yet.

### Prompt 05 — CDK Best Practices
- Implements security headers, WAF association per AWS Labs guidance. Ensure default TLS minimums match FedRAMP expectations.

### Prompt 06 — Component Versioning & Metadata
- Version still pre-1.0; align with release cadence.

### Prompt 07 — Configuration Precedence Chain
- Builder uses ConfigBuilder; check tests to ensure environment overrides honored.

### Prompt 08 — Capability Binding & Binder Matrix
- Registers distribution capability with domain/ARN. Ensure binder matrix allows consumers (S3, ALB origins) to connect automatically.

### Prompt 09 — Internal Dependency Graph
- No cross-component imports.

### Prompt 10 — MCP Contract
- Schema exposed; consider publishing additional metadata (security headers) for MCP clients.

### Prompt 11 — Security & Compliance
- Supports origin shielding, managed policies. Default logging disabled unless configured—call out for compliance.

---

## Component: cognito-user-pool

### Prompt 01 — Schema Validation
- Extensive schema with nested requirements, though some cross-field constraints (e.g., user migration Lambda requirements) are enforced in code only.

### Prompt 02 — Tagging Standard
- Applies standard tags to user pool and domain resources.

### Prompt 03 — Logging Standard
- Uses platform logger; CloudWatch log groups configured where triggers are provisioned.

### Prompt 04 — Observability Standard
- Emits alarms/metrics for sign-in failures and syncs with observability configuration, but lacks explicit OTel capability export.

### Prompt 05 — CDK Best Practices
- Follows AWS Labs guidance: MFA, password policies, advanced security. Evaluate adding cdk-nag as recommended.

### Prompt 06 — Component Versioning & Metadata
- Version still `0.0.x`. Update semver to reflect maturity.

### Prompt 07 — Configuration Precedence Chain
- Builder extends ConfigBuilder, but verify tests cover environment overrides (some scenarios missing).

### Prompt 08 — Capability Binding & Binder Matrix
- Registers authentication capability. Ensure binder matrix references `auth:cognito` for API Gateway/OIDC consumers.

### Prompt 09 — Internal Dependency Graph
- No cross-component dependencies.

### Prompt 10 — MCP Contract
- Schema exported through index; confirm Shinobi MCP server advertises triggers/callbacks so agents can wire them.

### Prompt 11 — Security & Compliance
- Provides FedRAMP defaults for password policy, advanced threat detection. Ensure logging/retention meets high baseline (CloudTrail data events for pools still manual).

---

## Component: container-application

### Prompt 01 — Schema Validation
- Schema enforces key service requirements (name, port, desiredCount). Good fit for MCP validation.

### Prompt 02 — Tagging Standard
- Tags ECS service, task definitions, ALB attachments via `applyStandardTags`.

### Prompt 03 — Logging Standard
- Uses structured logger; container logging configuration pushes to CloudWatch with retention controls.

### Prompt 04 — Observability Standard
- Integrates ADOT sidecar/telemetry options in config. Expose capability so binder matrix can connect to observability tooling automatically.

### Prompt 05 — CDK Best Practices
- Aligns with AWS Labs guidance (security groups, capacity providers). Nag integration pending.

### Prompt 06 — Component Versioning & Metadata
- Confirm semver increments when new deployment strategies (blue/green) added.

### Prompt 07 — Configuration Precedence Chain
- Builder uses ConfigBuilder; tests show layering across compliance frameworks.

### Prompt 08 — Capability Binding & Binder Matrix
- Registers service/endpoint capabilities; ensure binder matrix links to ALB/Service Discovery consumers.

### Prompt 09 — Internal Dependency Graph
- Clean dependency boundaries.

### Prompt 10 — MCP Contract
- Schema exported; ensure MCP metadata lists supported deployment patterns for AI assistants.

### Prompt 11 — Security & Compliance
- Enforces private subnets, minimum CPU/memory, IAM roles with scoped permissions. Confirm secrets injection flows honor least privilege.

---

## Component: dagger-engine-pool

### Prompt 01 — Schema Validation
- Schema requires `capacity`/`fipsMode` but still leaves some conditional fields (KMS vs. IAM) unchecked. Enhance before public MCP exposure.

### Prompt 02 — Tagging Standard
- Applies tags to pools, subnets, security groups.

### Prompt 03 — Logging Standard
- Logging via platform logger; engine telemetry largely external—document requirement for downstream logging per AWS Labs security guidance.

### Prompt 04 — Observability Standard
- Limited native observability; alarms/metrics minimal. Plan to align with AWS Labs recommendations for compute pools.

### Prompt 05 — CDK Best Practices
- Uses managed node groups with encryption. Ensure cdk-nag coverage.

### Prompt 06 — Component Versioning & Metadata
- Verify version increments; current release still `0.0.x`.

### Prompt 07 — Configuration Precedence Chain
- Builder extends ConfigBuilder with compliance-specific defaults (FIPS). Policy override support not yet implemented.

### Prompt 08 — Capability Binding & Binder Matrix
- Registers capability for CI pool access. Binder matrix entries need to ensure workflows can bind securely.

### Prompt 09 — Internal Dependency Graph
- Depends only on core/CDK modules.

### Prompt 10 — MCP Contract
- Schema exported. Provide richer capability data (endpoint URLs, credentials path) for MCP clients.

### Prompt 11 — Security & Compliance
- Enforces FIPS toggles, CMK usage, VPC isolation. Confirm logging/monitoring meets FedRAMP where required.

---

## Component: deployment-bundle-pipeline

### Prompt 01 — Schema Validation
- **Issue:** No `Config.schema.json` present. MCP validation cannot run for this component; create a schema consistent with other components and AWS Labs MCP expectations.

### Prompt 02 — Tagging Standard
- Reviews of pipeline/CDK stacks show `applyStandardTags` usage where resources are taggable (CodePipeline/CodeBuild). Confirm artifacts (S3 buckets) also receive tags.

### Prompt 03 — Logging Standard
- Uses platform logger for lifecycle events. CodeBuild/CodePipeline logs inherit AWS defaults; ensure retention documented.

### Prompt 04 — Observability Standard
- Observability folder present, but pipeline does not emit capabilities for tracing/metrics. Align with AWS Labs guidance for CI telemetry.

### Prompt 05 — CDK Best Practices
- Uses L2 constructs. Without cdk-nag, FedRAMP coverage depends on manual review—flag for follow-up per AWS Labs documentation.

### Prompt 06 — Component Versioning & Metadata
- Version recorded in `package.json`; ensure changes (new stages, gating) bump semver and update README.

### Prompt 07 — Configuration Precedence Chain
- Builder logic located under `src`; confirm it extends ConfigBuilder (if not, migrate to share layering).

### Prompt 08 — Capability Binding & Binder Matrix
- Capability registration limited; define pipeline outputs so MCP agents can discover artifact buckets or deploy roles.

### Prompt 09 — Internal Dependency Graph
- No cross-component imports.

### Prompt 10 — MCP Contract
- Without schema, Shinobi MCP server cannot surface configuration details. Prioritize schema definition and export.

### Prompt 11 — Security & Compliance
- Pipelines enable CMK-encrypted artifact buckets and restricted IAM roles. Ensure cross-account deployments follow AWS security references.

---

## Component: dynamodb-table

### Prompt 01 — Schema Validation
- Schema enumerates table/key requirements with `required` lists. Review conditional checks for streams/global tables to ensure MCP pre-validation catches misconfigurations.

### Prompt 02 — Tagging Standard
- Applies standard tags to tables, autoscaling policies, and alarms.

### Prompt 03 — Logging Standard
- Component logging uses platform logger. DynamoDB streams/CloudTrail logging need to be enabled via config—document baseline expectations.

### Prompt 04 — Observability Standard
- Generates CloudWatch alarms/metrics for throttles, consumed capacity. No explicit observability capability exported yet.

### Prompt 05 — CDK Best Practices
- Enforces SSE, point-in-time recovery, and autoscaling as per AWS Labs guidance. Add cdk-nag to catch regressions.

### Prompt 06 — Component Versioning & Metadata
- Version still early (`0.x`). Confirm release notes and semver updates.

### Prompt 07 — Configuration Precedence Chain
- Builder extends ConfigBuilder; compliance defaults stored in YAML. Policy override support pending.

### Prompt 08 — Capability Binding & Binder Matrix
- Registers table capability (ARN/stream). Ensure binder matrix references `storage:dynamodb` for Lambda/ECS consumers.

### Prompt 09 — Internal Dependency Graph
- Depends on core/CDK only.

### Prompt 10 — MCP Contract
- Schema and capability data should be published via MCP server; verify the Shinobi MCP bridge includes stream settings for agents.

### Prompt 11 — Security & Compliance
- Defaults enable encryption/PITR, but table billing mode defaults to PAY_PER_REQUEST; confirm compliance frameworks demand minimum alarms for throttles (some still optional).

---

## Component: ec2-instance

### Prompt 01 — Schema Validation
- Local `Config.schema.json` predates the builder schema (`EC2_INSTANCE_CONFIG_SCHEMA`) and defines service-level fields (serviceName, environment). Align schema artifacts so MCP clients get accurate validation; ensure root `required` set lists actual config fields.

### Prompt 02 — Tagging Standard
- Component tags instance, security group, IAM role, and optional KMS key (`ec2-instance.component.ts:62-86`). CloudWatch alarms created in `configureObservabilityForInstance` are not tagged—extend tagging there.

### Prompt 03 — Logging Standard
- Uses structured logging (`logComponentEvent`, `logError`). CloudWatch agent user data provisions structured logs but lacks retention configuration.

### Prompt 04 — Observability Standard
- Registers `otel:environment` capability and sets up CPU/status alarms. Ensure OTel variables are injected into user data; currently they are only exposed via capability.

### Prompt 05 — CDK Best Practices
- Launch template hardens IMDSv2, optional Nitro enclaves per AWS Labs guideline. Commercial security group allows SSH from `0.0.0.0/0`; adjust to align with secure-by-default guidance in `CDK_GENERAL_GUIDANCE.md`.

### Prompt 06 — Component Versioning & Metadata
- Version remains `0.0.x` despite numerous features. Bump semver and update changelog before publishing.

### Prompt 07 — Configuration Precedence Chain
- Builder extends ConfigBuilder with compliance overrides. Tests cover FedRAMP defaults but should add environment override cases to prove Layer 3 works.

### Prompt 08 — Capability Binding & Binder Matrix
- Registers `compute:ec2` and `otel:environment` capabilities. Verify binder matrix includes compute target for security group or EBS attachments.

### Prompt 09 — Internal Dependency Graph
- Depends only on core/CDK modules.

### Prompt 10 — MCP Contract
- Schema/export mismatch noted in Prompt 01 may lead to MCP catalog inconsistency. Resolve before broad MCP consumption.

### Prompt 11 — Security & Compliance
- FedRAMP modes enforce encryption and SNS alarms, but commercial defaults allow public SSH and set EBS encryption `false` in hardcoded fallbacks. Update defaults to achieve “secure by default.”

