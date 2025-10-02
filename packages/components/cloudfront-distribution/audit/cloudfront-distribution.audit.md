# CloudFront Distribution Component Audit (2025-01-15)

This audit follows the eleven prompts in `/audit.md`, uses the platform standards in `docs/platform-standards`, and cross-checks against the awslabs MCP server contract (`docs/api/mcp-openapi.yaml`). Pre-check: the component package still contains the required `audit/`, `observability/`, and `src/` folders plus a top-level `Config.schema.json`, satisfying the structural expectations from the Component API contract.

## Prompt 01 — Schema Validation Audit
- **Strengths**
  - `Config.schema.json` declares draft-07 metadata and forbids unknown properties (`packages/components/cloudfront-distribution/Config.schema.json:2`, `packages/components/cloudfront-distribution/Config.schema.json:6`).
  - The builder exports a schema constant that mirrors the TypeScript interfaces, keeping code and schema colocated (`packages/components/cloudfront-distribution/src/cloudfront-distribution.builder.ts:135`).
- **Gaps**
  - The builder normalises an `observability` block, but the published JSON schema stops at `tags`, so MCP consumers never see the observability knobs (`packages/components/cloudfront-distribution/src/cloudfront-distribution.builder.ts:271`, `packages/components/cloudfront-distribution/Config.schema.json:268`).
  - Schema defaults for `defaultBehavior.viewerProtocolPolicy`, `logging.enabled`, and `monitoring.enabled` are permissive (`allow-all` / `false`) and diverge from the secure fallbacks + platform defaults that the builder expects, weakening validation for MCP clients (`packages/components/cloudfront-distribution/Config.schema.json:68`, `packages/components/cloudfront-distribution/Config.schema.json:213`, `packages/components/cloudfront-distribution/Config.schema.json:237`).
  - The awslabs MCP contract requires the served schema to be complete (`docs/api/mcp-openapi.yaml:106`), so the missing observability section violates that contract.
- **Actions**
  - Regenerate `Config.schema.json` from the TypeScript schema constant so that observability, dashboard, and tracing settings surface to MCP callers.
  - Align JSON-schema defaults with the hardcoded/platform defaults (redirect-to-https, logging enabled, monitoring enabled) and annotate them per the configuration standard for secure fallbacks (`docs/platform-standards/platform-configuration-standard.md:29`).

## Prompt 02 — Tagging Standard Audit
- **Strengths**
  - The distribution and each CloudWatch alarm invoke `applyStandardTags`, inheriting the platform tag set plus capability-specific metadata (`packages/components/cloudfront-distribution/src/cloudfront-distribution.component.ts:146`, `packages/components/cloudfront-distribution/src/cloudfront-distribution.component.ts:343`, `docs/platform-standards/platform-tagging-standard.md:21`).
- **Gaps**
  - Custom tags supplied via config are never merged; the builder keeps `config.tags`, but the component does not apply them anywhere (`packages/components/cloudfront-distribution/src/cloudfront-distribution.builder.ts:484`, `docs/platform-standards/platform-tagging-standard.md:69`).
  - The X-Ray sampling rule is a taggable CFN resource, yet it is created without the standard tag helper, leaving it non-compliant (`packages/components/cloudfront-distribution/src/cloudfront-distribution.component.ts:433`).
- **Actions**
  - Extend `applyStandardTags` calls to merge `this.config?.tags` for the distribution and alarms, and add tag support for the X-Ray sampling rule so every CFN resource satisfies the tagging mandate.

## Prompt 03 — Logging Standard Audit
- **Strengths**
  - Component lifecycle logging relies on `logComponentEvent`/`logError`, keeping output structured through the platform logger (`packages/components/cloudfront-distribution/src/cloudfront-distribution.component.ts:32`, `docs/platform-standards/platform-logging-standard.md:20`).
  - The codebase contains no raw `console.log` usage in sources or tests, preserving structured logging guarantees.
- **Gaps**
  - `resolveLogBucket` silently disables CloudFront access logging whenever a bucket name is absent, which contradicts the "logging is not optional" stance and the CFR1 rule they later suppress (`packages/components/cloudfront-distribution/src/cloudfront-distribution.component.ts:276`, `docs/platform-standards/platform-logging-standard.md:20`).
  - No retention or classification controls are enforced for the log bucket, so the component cannot prove compliance with mandated retention policies (`docs/platform-standards/platform-logging-standard.md:13`).
- **Actions**
  - Fail fast (or surface a synthesis error) when `logging.enabled` lacks a bucket, and plumb retention/classification controls through config so commercial and FedRAMP environments meet the standard without manual intervention.

## Prompt 04 — Observability Standard Audit
- **Strengths**
  - The builder’s fallbacks declare X-Ray sampling and a CloudWatch dashboard, showing intent to provide telemetry out of the box (`packages/components/cloudfront-distribution/src/cloudfront-distribution.builder.ts:367`).
  - The component wires helper methods for tracing and dashboards behind `configureObservability` (`packages/components/cloudfront-distribution/src/cloudfront-distribution.component.ts:409`).
- **Gaps**
  - `normaliseConfig` drops the `observability` branch entirely, so the component never executes the tracing or dashboard code path even when defaults request it (`packages/components/cloudfront-distribution/src/cloudfront-distribution.builder.ts:404`, `docs/platform-standards/platform-observability-standard.md:20`).
  - The JSON schema omits observability fields, preventing MCP/UI clients from toggling telemetry as required by the standard (`packages/components/cloudfront-distribution/Config.schema.json:268`).
  - The `observability/` folder is empty, so there is no documented alarm/dashboard catalogue for operators.
- **Actions**
  - Include the observability subtree in `normaliseConfig`, export it via JSON schema, and seed the `observability/` directory with the dashboard/alarm artefacts promised by the standard.

## Prompt 05 — CDK Best Practices Audit
- **Strengths**
  - The component stays on L2 constructs (`cloudfront.Distribution`, `cloudwatch.Alarm`) and centralises nag suppressions (`packages/components/cloudfront-distribution/src/cloudfront-distribution.component.ts:123`, `packages/components/cloudfront-distribution/src/cloudfront-distribution.component.ts:510`).
- **Gaps**
  - `registerConstruct` stores the handle under `distribution` instead of the mandated `main`, breaking the contract in the component API spec (`packages/components/cloudfront-distribution/src/cloudfront-distribution.component.ts:51`, `docs/platform-standards/platform-component-api-spec.md:86`).
  - `src/index.ts` re-exports a non-existent `CloudFrontDistributionComponentComponent`, so consumers importing from the package fail at compile time (`packages/components/cloudfront-distribution/src/index.ts:7`).
  - The creator uses the same erroneous symbol and omits the required identifier argument when instantiating the component, so synthesis would crash even if the export were fixed (`packages/components/cloudfront-distribution/src/cloudfront-distribution.creator.ts:14`, `packages/components/cloudfront-distribution/src/cloudfront-distribution.creator.ts:75`).
  - Nag suppressions waive CFR1 (logging) and CFR2 (WAF) without referencing platform controls or compensating mechanisms, leaving high-severity rules permanently silenced (`packages/components/cloudfront-distribution/src/cloudfront-distribution.component.ts:516`, `docs/platform-standards/platform-logging-standard.md:20`).
- **Actions**
  - Register the distribution under the `main` handle, correct the exported symbol/signature, and revisit nag suppressions with references to actual compensating controls (or implement the controls inline).

## Prompt 06 — Component Versioning & Metadata Audit
- **Strengths**
  - `package.json` declares a semantic version, maturity, stability, and capability metadata, satisfying registry requirements (`packages/components/cloudfront-distribution/package.json:3`).
  - Backstage `catalog-info.yaml` advertises MCP metadata and supported compliance frameworks (`packages/components/cloudfront-distribution/catalog-info.yaml:15`).
- **Gaps**
  - README and metadata call the capability `cdn:cloudfront`, but the implementation exposes `cloudfront:distribution`, creating drift across documentation, package metadata, and runtime outputs (`packages/components/cloudfront-distribution/README.md:43`, `packages/components/cloudfront-distribution/package.json:55`, `packages/components/cloudfront-distribution/src/cloudfront-distribution.component.ts:393`).
  - `getProvidedCapabilities` in the creator returns `networking:cloudfront-distribution`, introducing a third, conflicting identifier in the published catalogue (`packages/components/cloudfront-distribution/src/cloudfront-distribution.creator.ts:117`).
- **Actions**
  - Pick the authoritative capability key, update README/package/catalog metadata to match, and bump the component version with a changeset to document the contract fix.

## Prompt 07 — Configuration Precedence Chain Audit
- **Strengths**
  - The builder extends the shared `ConfigBuilder`, so platform defaults in `config/<framework>.yml` flow through the five-layer precedence engine (`packages/components/cloudfront-distribution/src/cloudfront-distribution.builder.ts:307`, `docs/platform-standards/platform-configuration-standard.md:29`, `config/commercial.yml:1100`).
  - Unit tests cover commercial fallbacks, FedRAMP High overrides, and manifest precedence, demonstrating parts of the chain (`packages/components/cloudfront-distribution/tests/cloudfront-distribution.builder.test.ts:28`).
- **Gaps**
  - Dropping the `observability` branch in `normaliseConfig` means precedence never applies to telemetry, so platform-level observability policies cannot override manifests (`packages/components/cloudfront-distribution/src/cloudfront-distribution.builder.ts:404`).
  - There is no test coverage for the FedRAMP Moderate profile or for policy/environment layers, despite the contract requiring framework-specific assertions (`packages/components/cloudfront-distribution/tests/cloudfront-distribution.builder.test.ts:40`, `docs/platform-standards/platform-component-api-spec.md:101`).
- **Actions**
  - Preserve the observability tree during normalisation and add regression tests for FedRAMP Moderate plus (future) policy/environment layers to keep alignment with the configuration standard.

## Prompt 08 — Capability Binding & Binder Matrix Audit
- **Strengths**
  - The component registers a capability payload containing distribution identifiers, origin type, and hardening profile (`packages/components/cloudfront-distribution/src/cloudfront-distribution.component.ts:52`, `packages/components/cloudfront-distribution/src/cloudfront-distribution.component.ts:393`).
- **Gaps**
  - Capability keys differ across the component (`cloudfront:distribution`), creator (`networking:cloudfront-distribution`), package metadata (`cdn:cloudfront`), and README, so binder strategies cannot rely on a stable vocabulary (`packages/components/cloudfront-distribution/src/cloudfront-distribution.creator.ts:117`, `packages/components/cloudfront-distribution/README.md:43`, `docs/platform-standards/platform-capability-naming-standard.md:13`).
  - `getRequiredCapabilities` is left as a TODO, so the binder matrix cannot express dependencies the distribution might need (e.g. WAF, log bucket), limiting automated wiring (`packages/components/cloudfront-distribution/src/cloudfront-distribution.creator.ts:127`).
- **Actions**
  - Standardise on a single capability key that fits the naming standard and update binder metadata, then document and implement required capabilities so the binding subsystem can enforce prerequisites.

## Prompt 09 — Internal Dependency Graph Audit
- **Strengths**
  - Runtime imports are limited to AWS CDK libraries and `@shinobi/core`, so there are no unexpected cross-package dependencies (`packages/components/cloudfront-distribution/src/cloudfront-distribution.component.ts:1`).
- **Gaps**
  - The creator pulls core contracts via a relative path instead of the shared `@platform/contracts` alias, creating a brittle dependency on repository structure (`packages/components/cloudfront-distribution/src/cloudfront-distribution.creator.ts:13`).
  - Because the creator instantiates a non-existent class with the wrong constructor signature, dependency resolution fails before the component can join the graph (`packages/components/cloudfront-distribution/src/cloudfront-distribution.creator.ts:14`, `packages/components/cloudfront-distribution/src/cloudfront-distribution.creator.ts:75`).
  - The broken `index.ts` export prevents other packages from importing the component class, effectively orphaning it in the dependency graph (`packages/components/cloudfront-distribution/src/index.ts:7`).
- **Actions**
  - Switch to the shared contract alias, fix the class symbol/signature, and re-export the real `CloudFrontDistributionComponent` so graph tooling (Nx/project graph) can reason about the dependency edges again.

## Prompt 10 — MCP Server API Contract Audit
- **Strengths**
  - The creator exposes `configSchema` and catalog metadata includes MCP resource URIs, aligning with the server endpoints defined in the awslabs spec (`packages/components/cloudfront-distribution/src/cloudfront-distribution.creator.ts:66`, `packages/components/cloudfront-distribution/catalog-info.yaml:23`, `docs/api/mcp-openapi.yaml:106`).
- **Gaps**
  - Missing observability fields in the served schema leave the MCP `/platform/components/{type}/schema` response incomplete, preventing clients from configuring telemetry features (`packages/components/cloudfront-distribution/Config.schema.json:268`).
  - The factory method cannot instantiate the component (wrong class name/parameters), so the MCP server would throw when trying to realise the component (`packages/components/cloudfront-distribution/src/cloudfront-distribution.creator.ts:75`).
  - Required capability metadata is absent, so the MCP binding matrix lacks the data needed to advertise downstream relationships (`packages/components/cloudfront-distribution/src/cloudfront-distribution.creator.ts:127`).
- **Actions**
  - Repair the creator factory, flesh out required capabilities, and publish the full schema so MCP clients and the capability catalogue stay consistent with the awslabs contract.

## Prompt 11 — Security & Compliance Audit
- **Strengths**
  - Monitoring defaults create 4xx/5xx/origin latency alarms with standardised thresholds, supporting basic operational visibility across frameworks (`packages/components/cloudfront-distribution/src/cloudfront-distribution.component.ts:296`).
  - FedRAMP configurations tighten the protocol policy and logging buckets via platform defaults (`config/fedramp-high.yml:1282`).
- **Gaps**
  - Suppressing CFR1 on the assumption that logging is optional conflicts with the platform’s logging mandate and leaves no control ensuring CloudFront logs exist for audits (`packages/components/cloudfront-distribution/src/cloudfront-distribution.component.ts:516`, `docs/platform-standards/platform-logging-standard.md:20`).
  - When `logging.enabled` is true but no bucket is supplied (the commercial default), synthesis succeeds with logging disabled, creating blind spots for incident response (`packages/components/cloudfront-distribution/src/cloudfront-distribution.component.ts:283`).
  - No automatic WAF attachment or encryption enhancements accompany the nag suppressions for CFR2/CFR4, so FedRAMP workloads rely on manual configuration despite the suppressions claiming optionality (`packages/components/cloudfront-distribution/src/cloudfront-distribution.component.ts:529`).
- **Actions**
  - Enforce logging buckets (with retention) for every framework, revisit WAF/OAC suppressions by providing opt-in defaults, and document the security posture in README/catalog metadata so FedRAMP consumers understand what is enforced by construction.
