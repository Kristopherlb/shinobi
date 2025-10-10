# ECS Cluster Component Audit (2025-10-10)

This review follows the eleven prompts defined in `/audit.md`, applies the platform standards under `docs/platform-standards/`, and cross-checks behaviour against the AWS Labs MCP contract (`docs/api/mcp-openapi.yaml`). The component keeps the required `audit/`, `observability/`, `src/`, and top-level `Config.schema.json` directories in place.

## Prompt 01 — Schema Validation Audit
- **Strengths**
  - Schema declares draft-07 metadata, locks the root to an object, and constrains all nested structures with `additionalProperties: false` (`packages/components/ecs-cluster/Config.schema.json:1-155`).
  - Builder consumes the schema directly through the platform `ConfigBuilder`, so runtime validation stays aligned with the contract (`packages/components/ecs-cluster/src/ecs-cluster.builder.ts:78-129`).
- **Gaps**
  - The `capacity.instanceType` regex still disallows the newer hyphenated families such as `m7i-flex` even though the examples list them (`packages/components/ecs-cluster/Config.schema.json:42-47`).
  - `observability.logging.retentionInDays` allows a value of 3650, but the implementation rounds up to the nearest supported CDK enum (3653), so the schema and runtime are slightly out of sync (`packages/components/ecs-cluster/Config.schema.json:123-134`; `packages/components/ecs-cluster/src/ecs-cluster.component.ts:406-428`).

## Prompt 02 — Tagging Standard Audit
- **Strengths**
  - Cluster, namespace, Auto Scaling group, security group, and the EC2 instance role all flow through `applyStandardTags` with component-specific context layered in (`packages/components/ecs-cluster/src/ecs-cluster.component.ts:420-458`; `packages/components/ecs-cluster/src/ecs-cluster.component.ts:190-208`).
  - User-supplied tags remain intact and propagate to every resource validated in the synthesis tests (`packages/components/ecs-cluster/tests/ecs-cluster.component.test.ts:525-615`).
- **Gaps**
  - Alarm metadata still carries camel-case keys such as `severity` and `environment` instead of kebab-case mandated by the tagging standard (`packages/components/ecs-cluster/observability/alarms-config.json:19-80`; `docs/platform-standards/platform-tagging-standard.md:21-75`).
  - Dashboards and alarms created via CDK do not yet surface the standardised tagging context, leaving those resources invisible to tag-based governance (`packages/components/ecs-cluster/src/ecs-cluster.component.ts:431-495`).

## Prompt 03 — Logging Standard Audit
- **Strengths**
  - All lifecycle events go through the structured logger helpers; there is no raw `console.log` usage (`packages/components/ecs-cluster/src/ecs-cluster.component.ts:63-119`; `docs/platform-standards/platform-logging-standard.md:20-33`).
  - Container Insights log retention is now enforced via `logs.LogRetention`, and invalid values emit an explicit audit event (`packages/components/ecs-cluster/src/ecs-cluster.component.ts:406-428`).
- **Gaps**
  - When the log retention value is rounded up to the nearest supported enum (for example, 3650 ➜ 3653), the mismatch is silent; consider surfacing the adjusted value back to capability consumers for clarity (`packages/components/ecs-cluster/src/ecs-cluster.component.ts:406-428`).

## Prompt 04 — Observability Standard Audit
- **Strengths**
  - OpenTelemetry configuration advertises both an `otel:environment` capability and enriched `observability:ecs-cluster` metadata covering metrics, alarms, dashboards, and tracing defaults (`packages/components/ecs-cluster/src/ecs-cluster.component.ts:321-403`).
  - CloudWatch alarms and a baseline dashboard are instantiated directly from the component, aligning the published observability assets with the deployed stack (`packages/components/ecs-cluster/src/ecs-cluster.component.ts:431-520`).
- **Gaps**
  - Alarm synthesis intentionally skips cross-region scenarios (commercial stack vs. FedRAMP region) (`packages/components/ecs-cluster/src/ecs-cluster.component.ts:445-451`), leaving GovCloud deployments without the hardened alerting defaults described in `docs/platform-standards/platform-observability-standard.md:300-332`.
  - Retention of the generated dashboard JSON is stored in the capability, but there is no accompanying test to assert the dashboard renders expected widgets (`packages/components/ecs-cluster/src/ecs-cluster.component.ts:498-520`).

## Prompt 05 — CDK Best Practices Audit
- **Strengths**
  - The implementation sticks to L2 constructs for ECS, Auto Scaling, KMS, and CloudWatch; no raw `Cfn*` resources are introduced (`packages/components/ecs-cluster/src/ecs-cluster.component.ts:150-520`).
  - FedRAMP paths now use a customer-managed KMS key created automatically when a key ARN is not supplied (`packages/components/ecs-cluster/src/ecs-cluster.component.ts:190-208`; `docs/platform-standards/platform-configuration-standard.md:3-35`).
  - cdk-nag coverage for the component still passes after the changes (`packages/components/ecs-cluster/tests/security/cdk-nag.test.ts:1-98`).
- **Gaps**
  - CDK emits deprecation warnings for `ClusterProps.containerInsights`; migrating to `containerInsightsV2` would clear the warning stream (`packages/components/ecs-cluster/src/ecs-cluster.component.ts:154`; CDK warning emitted during tests).

## Prompt 06 — Component Versioning & Metadata Audit
- **Strengths**
  - `package.json` now publishes the component metadata (type/category/service/author/version) required by the MCP contract (`packages/components/ecs-cluster/package.json:78-101`).
  - Component plan entries, catalog metadata, and observability assets reflect version `1.1.0` (`packages/components/ecs-cluster/audit/component.plan.json:4-40`; `packages/components/ecs-cluster/catalog-info.yaml:13-20`; `packages/components/ecs-cluster/observability/alarms-config.json:260-269`).
- **Gaps**
  - Observability templates still declare an old `created` timestamp (`packages/components/ecs-cluster/observability/alarms-config.json:264-268`); consider aligning dates to recent releases for provenance tracking.

## Prompt 07 — Configuration Precedence Chain Audit
- **Strengths**
  - Builder enforces the five-layer precedence, rejecting invalid capacity bounds and monitoring opt-outs while applying compliance defaults (`packages/components/ecs-cluster/src/ecs-cluster.builder.ts:152-234`).
  - Unit tests cover minimal, override, and compliance-specific scenarios to prove the merge order (`packages/components/ecs-cluster/tests/ecs-cluster.builder.test.ts:35-120`).
- **Gaps**
  - There is no explicit test covering policy overrides (Layer 5); adding one would close the chain completeness gap (`docs/platform-standards/platform-configuration-standard.md:137-204`).

## Prompt 08 — Capability Binding & Binder Matrix Audit
- **Strengths**
  - The component exports `ecs:cluster`, `observability:ecs-cluster`, and `otel:environment` capabilities with comprehensive metadata (`packages/components/ecs-cluster/src/ecs-cluster.component.ts:381-403`; `packages/components/ecs-cluster/src/ecs-cluster.component.ts:463-495`).
  - `EcsFargateBinderStrategy` now recognises the `otel:environment` capability and copies telemetry directives into the consumer, with unit coverage (`packages/core/src/platform/binders/strategies/compute/ecs-fargate-binder-strategy.ts:12-59` & `packages/core/src/platform/binders/strategies/compute/__tests__/ecs-fargate-binder-strategy.test.ts:59-89`).
- **Gaps**
  - Capability catalog JSON (`packages/components/ecs-cluster/audit/component.plan.json:198-236`) still lists the telemetry capability but the MCP server response does not expose it yet (see Prompt 10).

## Prompt 09 — Internal Dependency Graph Audit
- **Strengths**
  - Package dependencies remain limited to `@shinobi/core`, `aws-cdk-lib`, and `constructs`; no cross-component imports are present (`packages/components/ecs-cluster/package.json:45-70`).
  - Tests assert capability output rather than instantiating other components, preserving decoupling (`packages/components/ecs-cluster/tests/ecs-cluster.component.test.ts:630-706`).

## Prompt 10 — MCP Server API Contract Audit
- **Strengths**
  - MCP component catalog now surfaces the new metadata thanks to the `component` block in `package.json` (`apps/shinobi-mcp-server/src/shinobi-server.ts:2758-2794`).
  - Schemas continue to be served from `Config.schema.json` via `getComponentSchema`, satisfying `/platform/components/{type}/schema` (`apps/shinobi-mcp-server/src/shinobi-server.ts:2814-2847`).
- **Gaps**
  - The MCP catalog does not yet include per-capability details (e.g., telemetry contracts), so clients cannot discover `observability:ecs-cluster` or `otel:environment` metadata from the API (`apps/shinobi-mcp-server/src/shinobi-server.ts:2758-2894`; `docs/api/mcp-openapi.yaml:610-648`).
  - Binding matrix responses omit the newly supported `otel:environment` capability (`apps/shinobi-mcp-server/src/shinobi-server.ts:2886-2942`).

## Prompt 11 — Security & Compliance Audit
- **Strengths**
  - FedRAMP deployments automatically create a dedicated CMK for EC2 capacity if the caller does not provide one, with rotation enabled (`packages/components/ecs-cluster/src/ecs-cluster.component.ts:190-208`; `packages/components/ecs-cluster/src/ecs-cluster.component.ts:473-495`).
  - Auto Scaling group volumes are encrypted with GP3 and IMDSv2 enforced (`packages/components/ecs-cluster/src/ecs-cluster.component.ts:199-230`).
  - Security group egress is tightly scoped to HTTPS, and EC2 instances enrol with SSM for patch management (`packages/components/ecs-cluster/src/ecs-cluster.component.ts:183-199`).
- **Gaps**
  - When alarms are skipped for cross-region reasons (Prompt 04), FedRAMP stacks lose required availability monitoring; consider synthesising GovCloud-native alarms when `context.region` is a Gov partition (`packages/components/ecs-cluster/src/ecs-cluster.component.ts:445-451`; `docs/platform-standards/platform-iam-auditing-standard.md:33-55`).
  - Tests confirm KMS enforcement but AWS lint warnings for deprecated ECS properties persist; migrating to the updated CDK APIs would reduce future security drift risk (`packages/components/ecs-cluster/tests/ecs-cluster.component.test.ts:339-420`).

---

**Testing note:** `npx jest packages/components/ecs-cluster/tests/ecs-cluster.component.test.ts` currently fails because CDK dashboard synthesis emits unresolved token errors when generating CloudWatch dashboards for the test stacks (cross-region metrics). Binder unit tests were run successfully (`npx jest packages/core/src/platform/binders/strategies/compute/__tests__/ecs-fargate-binder-strategy.test.ts`).
