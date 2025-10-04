# DynamoDB Table Component Audit Report

**Component:** `packages/components/dynamodb-table`  
**Audit Date:** 2025-01-04  
**Auditor:** Codex (GPT-5)  
**Source Standards:** `docs/platform-standards/*` (logging, tagging, observability, configuration, capability naming, IAM auditing) and AWSlabs knowledge base (`platform-kb/observability/recipes/dynamodb.yaml`).

## Executive Summary

The DynamoDB table component now complies with Tagging, Logging, Observability, CDK, and Security standards by default. The construct configures Contributor Insights through supported APIs, emits per-index capability metadata, provisions an AWS Backup plan when backups are enabled, and publishes real catalog/schema/pattern data through the MCP server. Remaining work is mostly documentation and finishing the configuration precedence stack.

### Highest Priority Follow‑ups
1. **Configuration precedence:** Implement Layers 3 (environment) and 5 (policy) in the shared `ConfigBuilder` and add regression tests to prove override order.  
2. **Audit artefacts:** Populate the new `audit/` and `tests/policies/` scaffolding with real OPA rules/tests so compliance automation can execute.  
3. **MCP depth:** `diff_graphs` and other advanced MCP tools are still placeholders; extend them once graph requirements solidify.

---

| Prompt | Status |
| --- | --- |
| 01 – Schema Validation | ⚠️ Partial |
| 02 – Tagging Standard | ✅ Pass |
| 03 – Logging Standard | ✅ Pass |
| 04 – Observability Standard | ✅ Pass |
| 05 – CDK Best Practices | ✅ Pass |
| 06 – Versioning & Metadata | ⚠️ Partial |
| 07 – Configuration Precedence | ⚠️ Partial |
| 08 – Capability Binding & Binder Matrix | ✅ Pass |
| 09 – Internal Dependency Graph | ✅ Pass |
| 10 – MCP Server API Contract | ⚠️ Partial |
| 11 – Security & Compliance | ✅ Pass |

---

## PROMPT 01 — Schema Validation Audit (⚠️ Partial)
- `Config.schema.json` remains authoritative and is imported by the builder (`packages/components/dynamodb-table/src/dynamodb-table.builder.ts:182-215`).
- Hardcoded fallbacks now match the schema; stray properties like `retentionHours` have been removed (`dynamodb-table.builder.ts:188-210`).
- ⚠️ Several nested objects (auto-scaling, alarm tags) still lack descriptions required by the schema style guide.

**Action:** add descriptions for nested properties and introduce AJV validation in builder tests.

## PROMPT 02 — Tagging Standard Audit (✅ Pass)
- Standard tags are applied to every construct (table, KMS key, alarms) via `applyStandardTags` (`packages/components/dynamodb-table/src/dynamodb-table.component.ts:140-188`, `:302-343`).
- Tagging service ensures mandatory keys (`packages/core/src/platform/services/tagging-service/tagging.service.ts:73-165`).

No further action required.

## PROMPT 03 — Logging Standard Audit (✅ Pass)
- Component logging is handled through the platform logger (`getLogger()`), ensuring structured context and correlation IDs (`packages/components/dynamodb-table/src/dynamodb-table.component.ts:21-94`).
- Errors and lifecycle events are captured with `logComponentEvent`.

## PROMPT 04 — Observability Standard Audit (✅ Pass)
- `configureObservability` is invoked for the table and the resulting OTel attributes are exposed via the capability payload (`packages/components/dynamodb-table/src/dynamodb-table.component.ts:240-259`).
- A CloudWatch dashboard is created with widgets matching the observability recipe (capacity, throttles, errors, item count) (`dynamodb-table.component.ts:289-315`).
- Contributor Insights uses the supported CDK flag (`dynamodb-table.component.ts:140-149`).

## PROMPT 05 — CDK Best Practices Audit (✅ Pass)
- Table and GSI auto-scaling use the correct scalable dimensions (`packages/components/dynamodb-table/src/dynamodb-table.component.ts:198-260`).
- `contributorInsightsEnabled` replaces the invalid `props.contributeInsights` usage (`dynamodb-table.component.ts:140-149`).
- Synthesis tests assert both the scalable target and capability payload (`packages/components/dynamodb-table/tests/dynamodb-table.component.synthesis.test.ts:98-132`).

## PROMPT 06 — Versioning & Metadata Audit (⚠️ Partial)
- `package.json`, `CHANGELOG.md`, and `catalog-info.yaml` remain current.
- Audit scaffolding (`packages/components/dynamodb-table/audit/` and `tests/policies/`) exists but contains placeholders only.

**Action:** author real audit controls/tests to complete the metadata story.

## PROMPT 07 — Configuration Precedence Chain Audit (⚠️ Partial)
- Platform defaults now enable PITR/backup for all frameworks (`config/commercial.yml`, `config/fedramp-*.yml`).
- ⚠️ Environment and policy layers are still TODOs in `ConfigBuilder` (`packages/core/src/platform/contracts/config-builder.ts:66-118`).

**Action:** implement Layers 3 & 5 and cover them with precedence tests.

## PROMPT 08 — Capability Binding & Binder Matrix Audit (✅ Pass)
- Capabilities now include per-index and stream descriptors alongside table metadata (`packages/components/dynamodb-table/src/dynamodb-table.component.ts:118-189`, `:330-414`).
- DynamoDB binder strategy resolves array-based index payloads and honours `binding.options.indexName` (`packages/core/src/platform/binders/strategies/database/dynamodb-binder-strategy.ts:150-217`).
- Synthesis tests validate the capability shapes (`packages/components/dynamodb-table/tests/dynamodb-table.component.synthesis.test.ts:108-132`).

## PROMPT 09 — Internal Dependency Graph Audit (✅ Pass)
- Runtime dependencies remain limited to platform contracts/core and AWS CDK libraries; no cross-component coupling introduced.

## PROMPT 10 — MCP Server API Contract Audit (⚠️ Partial)
- `get_component_catalog`, `get_component_schema`, `get_component_patterns`, `expand_pattern`, and `plan_graph` now return structured JSON (`apps/shinobi-mcp-server/src/shinobi-server.ts:2690-2839`).
- ⚠️ `diff_graphs` and other advanced tools remain placeholders.

**Action:** continue replacing stubs as additional MCP features are prioritised.

## PROMPT 11 — Security & Compliance Audit (✅ Pass)
- PITR and backup retention are enabled across all frameworks (`config/commercial.yml:1189-1216`, `config/fedramp-*.yml`).
- When `backup.enabled` is true, an AWS Backup plan and selection are synthesized (`packages/components/dynamodb-table/src/dynamodb-table.component.ts:318-362`).
- Capability metadata surfaces the backup posture for downstream automation (`dynamodb-table.component.ts:240-259`).

---

### Structural Checklist
- `src/`, `observability/`, `audit/`, `tests/`, and `Config.schema.json` are in place; audit folders need substantive content.
- MCP server now exposes catalog, schema, pattern, and graph information derived from repository artefacts.
