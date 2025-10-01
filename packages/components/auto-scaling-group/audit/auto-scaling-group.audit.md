# Auto Scaling Group Component Audit (BUG-2025-01-08-001)

This audit maps directly to the eleven prompts in `/audit.md` and incorporates platform standards from `docs/platform-standards` plus the awslabs MCP contract (`docs/api/mcp-openapi.yaml`). Each section captures strengths, gaps, and remediation notes specific to `packages/components/auto-scaling-group`.

## Prompt 01 — Schema Validation Audit
- **Strengths**
  - `Config.schema.json` now exists with a draft-07 header and `additionalProperties: false` guards (`packages/components/auto-scaling-group/Config.schema.json:1-18`).
  - The builder consumes the JSON schema via `schemaJson` ensuring validation happens before merges (`packages/components/auto-scaling-group/src/auto-scaling-group.builder.ts:1-135`).
- **Gaps**
  - `definitions.alarmConfig` defaults `threshold` to 80 for all alarms, but the builder expects the in-service alarm threshold to default to the minimum capacity (`packages/components/auto-scaling-group/src/auto-scaling-group.builder.ts:177-185`). The schema should supply capability-specific defaults to prevent validation/drift errors.
  - `terminationPolicies` allows arbitrary strings; the builder’s type restricts to a finite set (`packages/components/auto-scaling-group/src/auto-scaling-group.builder.ts:5-10`). Add an `enum` to prevent invalid manifests slipping through MCP validation.
  - README references `monitoring.detailedMetrics`, which is absent from the schema and builder (`packages/components/auto-scaling-group/README.md:25-36`). Documentation and schema must align per the Configuration Standard sanity requirements (`docs/platform-standards/platform-configuration-standard.md:20-40`).
- **Actions**
  - Extend the schema with per-alarm overrides and enumerations, update docs, and add a JSON-schema regression test (ajv) to catch future drift.

## Prompt 02 — Tagging Standard Audit
- **Strengths**
  - Every synthesized construct calls `applyStandardTags` (`packages/components/auto-scaling-group/src/auto-scaling-group.component.ts:115-183,253-255,371-395`), honoring propagation guidance in the Tagging Standard (`docs/platform-standards/platform-tagging-standard.md:19-74`).
  - Component-level tags merge in `this.config.tags` so service-defined metadata survives (`packages/components/auto-scaling-group/src/auto-scaling-group.component.ts:252-256`).
- **Gaps**
  - Custom tag keys such as `Name` and `STIGCompliant` are not kebab-case (`packages/components/auto-scaling-group/src/auto-scaling-group.component.ts:254,207`), violating mandatory formatting (`docs/platform-standards/platform-tagging-standard.md:21-24`).
  - No explicit validation that the mandatory platform keys (`service-name`, `component-type`, etc.) are present when merging overrides.
- **Actions**
  - Replace ad-hoc tags with kebab-case equivalents (e.g., `resource-name`) and add a unit test verifying standard keys remain after `config.tags` merges.

## Prompt 03 — Logging Standard Audit
- **Strengths**
  - Component logging uses `logComponentEvent`/`logError` from `BaseComponent` (`packages/components/auto-scaling-group/src/auto-scaling-group.component.ts:44-82`), keeping output structured per the logging mandate (`docs/platform-standards/platform-logging-standard.md:20-27`).
  - No raw `console.log` usage in component or tests.
- **Gaps**
  - IAM role policy grants broad CloudWatch Logs permissions whenever `attachLogDeliveryPolicy` toggles on (`packages/components/auto-scaling-group/src/auto-scaling-group.component.ts:132-137`). The Logging Standard expects retention and classification controls, but neither retention nor data-classification tags are enforced when enabling log delivery.
  - No automated test to ensure logs include trace IDs once the resolver injects tracing context.
- **Actions**
  - Extend policy attachment to provision log groups with retention + classification tags and add a regression test that `monitoring.enabled=false` still emits structured synth logs.

## Prompt 04 — Observability Standard Audit
- **Strengths**
  - Two CloudWatch alarms are built-in (`packages/components/auto-scaling-group/src/auto-scaling-group.component.ts:340-371`) and documented in `observability/alarms-config.json`.
  - User data can install SSM and CloudWatch agents (`packages/components/auto-scaling-group/src/auto-scaling-group.component.ts:216-239`), aligning partially with the EC2 guidance in the Observability Standard (`docs/platform-standards/platform-observability-standard.md:63-66`).
- **Gaps**
  - Agent installation is off by default; the Observability Standard requires instrumentation to be non-optional (`docs/platform-standards/platform-observability-standard.md:20-27`). Commercial defaults leave CloudWatch/OTel agents disabled (`packages/components/auto-scaling-group/src/auto-scaling-group.builder.ts:139-148`).
  - No OTEL collector endpoint plumbing or dashboard assets beyond two alarms. `observability/README.md` is a placeholder, but the platform standard expects dashboards and trace wiring for ASGs.
  - Alarms are not published to `observability` documentation automatically and there is no linkage into the planned observability service catalogue (`packages/core/src/services/observability.service.md:46`).
- **Actions**
  - Flip agent defaults on for at least FedRAMP Moderate while documenting opt-out, add OTEL endpoint environment variables to user data, and contribute dashboards to `observability/` per the standard.

## Prompt 05 — CDK Best Practices Audit
- **Strengths**
  - Component sticks to L2 constructs (`aws-autoscaling.AutoScalingGroup`, `ec2.LaunchTemplate`, `iam.Role`) with no `Cfn*` usage, satisfying idiomatic CDK expectations.
  - Update policies use `autoscaling.UpdatePolicy.rollingUpdate`, avoiding bespoke CloudFormation resources (`packages/components/auto-scaling-group/src/auto-scaling-group.component.ts:205-230`).
- **Gaps**
  - Security group ingress is hardcoded to allow HTTPS from the world (`packages/components/auto-scaling-group/src/auto-scaling-group.component.ts:211-214`), conflicting with the Configuration standard’s “no hardcoded network access” rule (`docs/platform-standards/platform-configuration-standard.md:32-52`).
  - `allowAllOutbound` defaults to `true` at both hardcoded and commercial platform layers (`packages/components/auto-scaling-group/src/auto-scaling-group.builder.ts:168-170`, `config/commercial.yml:129-172`), which fails least-privilege expectations.
  - The repo doesn’t run `cdk-nag` for this component; no suppressions or compliance evidence exist.
- **Actions**
  - Parameterize security group rules via config and default to no inbound traffic, introduce `allowedIngress` arrays, wire `cdk-nag` into the test harness, and add compliance suppressions with links to policy waivers when needed.

## Prompt 06 — Component Versioning & Metadata Audit
- **Gaps**
  - There is no `package.json`/`project.json` for this component, so semantic versioning cannot be tracked or surfaced through MCP.
  - Backstage metadata advertises capability `compute:asg` (`packages/components/auto-scaling-group/catalog-info.yaml:27-33`), while the component registers `compute:auto-scaling-group` (see Prompt 08). Version metadata is absent from catalog annotations.
  - README still documents `monitoring.detailedMetrics` and other options that no longer exist (`packages/components/auto-scaling-group/README.md:22-35`).
- **Actions**
  - Create a component-specific `package.json` with SemVer, wire into Nx if desired, update Backstage annotations with version + correct capability keys, and regenerate docs from schema to avoid drift.

## Prompt 07 — Configuration Precedence Chain Audit
- **Strengths**
  - The builder inherits the standardized five-layer merge pipeline (`packages/core/src/platform/contracts/config-builder.ts:29-120`), satisfying the precedence framework in the Configuration Standard (`docs/platform-standards/platform-configuration-standard.md:20-119`).
  - Platform YAML files provide framework-specific defaults (e.g., `config/fedramp-high.yml:168-210`) that the builder ingests via `_loadPlatformConfiguration`.
- **Gaps**
  - Hardcoded fallbacks include security-sensitive defaults like world-open outbound networking (`packages/components/auto-scaling-group/src/auto-scaling-group.builder.ts:137-170`), conflicting with section 3.1’s prohibition on permissive hardcoded values (`docs/platform-standards/platform-configuration-standard.md:32-52`).
  - Environment-level overrides (Layer 3) and policy overrides (Layer 5) are still TODO in the shared builder (`packages/core/src/platform/contracts/config-builder.ts:60-75,101-110`).
  - There is no normalization that flips `installAgents` to true when fedramp configs demand it if a user override removes the section.
- **Actions**
  - Tighten Layer 1 defaults (e.g., default `allowAllOutbound` to false, require explicit ingress arrays) and implement environment/policy loaders so service manifests can override as designed.

## Prompt 08 — Capability Binding & Binder Matrix Audit
- **Strengths**
  - Component registers capabilities for compute and monitoring exports (`packages/components/auto-scaling-group/src/auto-scaling-group.component.ts:74-78`) consistent with the naming pattern `<category>:<type>` described in the capability standard (`docs/platform-standards/platform-capability-naming-standard.md:9-24`).
- **Gaps**
  - Backstage metadata exposes `compute:asg` (`packages/components/auto-scaling-group/catalog-info.yaml:27-33`), creating a mismatch between documentation and runtime capability keys. This can break binder lookups.
  - No binder strategy exists for `compute:auto-scaling-group`; repository search returns no bindings, so downstream components cannot consume the capability.
  - Capability payload lacks documented contract (no schema or OpenAPI fragment), so binder development cannot validate inputs.
- **Actions**
  - Align metadata with actual capability keys, document the capability contract (fields exposed by `buildAutoScalingGroupCapability`), and extend the binder matrix to support common targets (e.g., inject ASG metrics into observability stacks).

## Prompt 09 — Internal Dependency Graph Audit
- **Strengths**
  - Component code imports only `@shinobi/core` and AWS libraries; no other components are instantiated directly, preserving modular boundaries (`packages/components/auto-scaling-group/src/auto-scaling-group.component.ts:13-24`).
  - Tests rely on local builders rather than other component packages (`packages/components/auto-scaling-group/tests/auto-scaling-group.builder.test.ts:1-7`).
- **Gaps**
  - Creator originally referenced contracts via relative path; now corrected to `@shinobi/core` but lint/test coverage to prevent regression is absent (`packages/components/auto-scaling-group/src/auto-scaling-group.creator.ts:12-21`).
  - No automated graph verification (e.g., `nx dep-graph`) is run in CI, so accidental cross-component imports would go unnoticed.
- **Actions**
  - Add a dependency rule to Nx (or eslint import plugin) forbidding `packages/components/**` cross-imports and add a CI job that fails on newly introduced cycles.

## Prompt 10 — MCP Contract Alignment Audit
- **Strengths**
  - Index exports expose builder, schema, and creator, making the component technically discoverable by MCP tooling (`packages/components/auto-scaling-group/index.ts:7-18`).
  - The awslabs MCP contract expects `/platform/components/{type}/schema` to serve JSON schemas (`docs/api/mcp-openapi.yaml:88-120`); this component now has a dedicated `Config.schema.json` to publish.
- **Gaps**
  - The MCP server catalog currently uses legacy capability keys and lacks entries for the Auto Scaling Group—no evidence the component appears in `/platform/components` responses (needs verification in `apps/shinobi-mcp-server`).
  - MCP tooling also expects capability/binding listings (`docs/api/mcp-openapi.yaml:88-118`), but there is no endpoint or static asset describing `compute:auto-scaling-group` yet.
  - Component lacks semantic version metadata, so MCP responses cannot satisfy the `PlatformComponent.version` contract.
- **Actions**
  - Register the component in the MCP catalog builder, expose schema via the `/platform/components/{type}/schema` handler, and ensure capability/binding matrices mention the ASG outputs before enabling the endpoint.

## Prompt 11 — Security & Compliance Audit
- **Strengths**
  - FedRAMP defaults enforce encryption, IMDSv2, hardened agents, and restrictive networking (`config/fedramp-high.yml:168-210`). These feed through the builder via platform YAML merges.
  - Conditional KMS provisioning supports customer-managed keys with rotation when requested (`packages/components/auto-scaling-group/src/auto-scaling-group.component.ts:96-120`).
- **Gaps**
  - Commercial defaults leave EBS encryption off and IMDSv2 optional (`packages/components/auto-scaling-group/src/auto-scaling-group.builder.ts:137-160`), conflicting with “secure by default” expectations for all frameworks.
  - Security group ingress allows 0.0.0.0/0 on port 443 without configuration gates (`packages/components/auto-scaling-group/src/auto-scaling-group.component.ts:211-214`). The Configuration Standard forbids such hardcoded access rules (`docs/platform-standards/platform-configuration-standard.md:32-40`).
  - IAM role policies attach broad log permissions whenever log delivery is enabled (no resource scoping) and there is no post-synthesis audit per the IAM Auditing Standard (`docs/platform-standards/platform-iam-auditing-standard.md:1-25`).
- **Actions**
  - Make encryption and IMDSv2 mandatory defaults, parameterize ingress rules, scope log permissions to specific log groups with retention + KMS, and schedule an IAM audit for this component’s managed policies.

## Test Execution Note
- `pnpm test -- --testPathPattern=auto-scaling-group` currently fails before reaching component tests because Nx cannot resolve `@nx/vite` in this workspace. No component-specific assertions executed; remediation requires fixing the global Nx test target resolution.

## Immediate Recommendations Summary
1. Tighten schema and documentation (Prompt 01 & 06): add enums, correct alarm defaults, synchronize README, introduce SemVer metadata.
2. Harden security baselines (Prompt 05, 07, 11): default IMDSv2/encryption to true, remove hard-coded open SG rules, align tagging keys with standards.
3. Close MCP and capability gaps (Prompt 08 & 10): align capability names, document payload contracts, register the component with the MCP catalog/binding endpoints.
