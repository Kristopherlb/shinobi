# Shinobi — Technical Architecture & Software Design Review

**Repository:** `Kristopherlb/shinobi` (branch: `main`) • **Date:** 2025‑09‑14 • **Reviewer:** Shinobi (Principal Engineer & Head of DevEx)

---

## 1) Executive Summary

This project is a promising Internal Developer Platform (IDP) that wraps AWS CDK with a declarative **service manifest** and a curated **component library**, then layers on **compliance guardrails** and **policy‑as‑code**. The README outlines a developer‑first CLI (`svc init|validate|plan`), a library of “components” (e.g., `lambda-api`, `rds-postgres`, `s3-bucket`), **bindings** that auto‑generate least‑privilege IAM, and explicit support for **commercial / FedRAMP** posture—exactly the ingredients that move teams from DIY IaC to paved‑road delivery. ([GitHub][1])

At the same time, to become enterprise‑grade, the platform should:

* tighten **type safety & validation** for the manifest,
* formalize a **package‑per‑component** architecture with strict boundaries,
* standardize **compliance evidence** (OSCAL) and **policy exceptions** workflow,
* industrialize **build/release** in a monorepo (pnpm + Nx/Turbo + Changesets), and
* make **Backstage/MCP** first‑class—so the experience isn’t just a CLI, but a discoverable, explainable, and auditable portal workflow.

What follows is an end‑to‑end, ticket‑ready plan that keeps the current direction but hardens it.

---

## 2) What’s here (quick scan)

From the repository root we can see: `packages/`, `src/`, `examples/`, `tests/`, `docs/`, `.github/`, plus top‑level assets like `service.yml`, `service-*.yml`, `docker-compose.localstack.yml`, `mcp-config.json`, `setup-shinobi-mcp.sh`, `jest.config.js`, `tsconfig*.json`, and `acceptance_criteria.md`. This implies a Node/TypeScript toolchain, LocalStack support, an MCP integration, sample manifests, and an early test suite. The README also documents the CLI entry points and example manifest structure with **components, binds, environments, and governance suppressions**. ([GitHub][1])

> **Assessment:** solid early scaffolding and a strong developer narrative. Now push it toward stable APIs, typed contracts, and repeatable release engineering.

---

## 3) Baseline Architecture (inferred)

**Domain model (current direction):**

* **Service manifest** (`service.yml`): declares **service**, **environments**, **components**, **binds**, **governance**.
* **Component types**: `lambda-api`, `rds-postgres`, `s3-bucket`, etc. synthesized to CDK stacks.
* **Bindings**: declare connectivity & capabilities (e.g., `db:postgres`, `bucket:s3`) to generate IAM + configuration injection.
* **Governance**: `cdk-nag` suppressions with owner/justification/expiry for exceptions. ([GitHub][1])

**Core runtime flow (targetable):**
Manifest → **Schema validation** → **Context hydration** (env/defaults/secrets) → **Semantic validation** (security/compliance) → **Planner** (diffs, drift detection) → **Synthesis** (CDK apps/stacks per env) → **Evidence export** (findings, OSCAL) → **Deployment** via CI/CD.

---

## 4) Strengths

* **Right abstraction level.** Developers think in **components & capabilities**, not low‑level CDK. The bind model (capability → IAM) is the right lever. ([GitHub][1])
* **Compliance is explicit.** Commercial/FedRAMP posture is first‑class; governance suppressions include ownership and expiry—great for auditability. ([GitHub][1])
* **Clear developer story.** `svc init|validate|plan` maps to create/verify/preview—intuitive day‑1/2 workflow. ([GitHub][1])
* **Local dev nods.** Presence of LocalStack compose file suggests attention to fast feedback loops. (File present at repo root.) ([GitHub][1])
* **Future‑friendly hooks.** `mcp-config.json` and setup script indicate LLM‑assisted workflows and an MCP server in the wings. (File present at repo root.) ([GitHub][1])

---

## 5) Key Risks & Gaps

1. **Schema & Type Safety**

   * Risk of config drift and undefined behavior without a **single source of truth** (TS types + JSON Schema) & versioned migrations.

2. **Component Boundaries & Reuse**

   * `packages/` exists but the boundaries aren’t clear from the outside. Platform teams need **package‑per‑component** with stable public APIs and internal/private modules.

3. **Governance at Scale**

   * Suppression hygiene needs automation: TTL enforcement, approvals, and **evidence** that controls exist & are effective (OSCAL catalogs/profiles + SSP/POA\&M exports).

4. **Security Model Formalization**

   * Bind → IAM generation is excellent, but you’ll want **capability contracts** (what actions, what resource patterns), **policy diff** tests, and cloud‑level guardrails.

5. **Release Engineering**

   * Without a rigorous monorepo toolchain (pnpm + Nx/Turbo + Changesets + provenance/SBOM), internal consumers will get **breaky** upgrades.

6. **Backstage Integration**

   * The portal file suggests intent, but making the **Scaffolder & Scorecards** first‑class is critical to adoption.

---

## 6) Target Architecture (logical)

```
                         ┌─────────────────────────────────────────────────┐
 Devs / Backstage        │  Backstage Plugins (Scaffolder, TechDocs, QH)   │
  ────────────────>      │  - Create from service.yml template             │
                         │  - Run Validate/Plan via Actions                │
                         │  - Compliance scorecards + evidence links       │
                         └──────────────────────────────┬──────────────────┘
                                                        │
                                             (MCP / CLI / API)
                                                        │
           ┌────────────────────────────────────────────┴────────────────────────────────────┐
           │                                 Shinobi Core                                     │
           │  Manifest Schema (Zod/JSON-Schema)  |  Context Hydration  |  Semantic Policies   │
           │  Component Registry (package-per-component)               |  Planner (diff/drift)│
           │  Bind→IAM Engine (capability contracts)                   |  Evidence/OSCAL     │
           └──────────────┬──────────────────────────────┬──────────────────────────┬─────────┘
                          │                              │                          │
                     CDK Synth                       Compliance (cdk-nag/OPA)   Observability
                          │                              │                          │
                   AWS Accounts/Orgs               Evidence Store (S3/Glue)     OTel + Logs
```

---

## 7) Detailed Design Feedback & Concrete Actions

### 7.1 Manifest & Validation

**Issues:** Potential ambiguity across `environments`, `overrides`, and `binds`; limited guarantees of compatibility between component versions and manifest fields.

**Actions (tickets):**

* **Define canonical JSON Schema** for `service.yml` (generate from TS types; ship with the CLI for IDE validation).
* **Introduce semantic validators** (e.g., “FedRAMP High ⇒ Multi‑AZ true, encryption KMS CMK, backup ≥ 35 days”) tied to compliance profiles. (README already hints at these rules. ([GitHub][1]))
* **Version the schema** (`manifestVersion`) and provide a **migration tool** (`svc migrate`) with codemods & release notes.
* Add **field‑level deprecation tags** and a **deprecation linter** (fail CI on deprecated fields w/o suppression).
* **Context hydrators**: env vars, secrets, feature flags (OpenFeature), and org defaults—deterministic order (document a **configuration precedence chain**).

### 7.2 Component Model (package‑per‑component)

**Issues:** Components need stable APIs, isolated tests, and independent publishing.

**Actions:**

* Restructure `packages/`:

  * `packages/components/lambda-api`
  * `packages/components/rds-postgres`
  * `packages/components/s3-bucket`
  * `packages/core` (manifest parser, planner, bind→IAM engine)
  * `packages/cli` (`svc`)
* Each component publishes **typed inputs** (`zod` schemas), **defaults**, **graph dependencies**, **IAM capability contracts**, and **CDK assembly**.
* Add **consumer contract tests** (snapshot `aws-cdk-lib/assertions` of synthesized templates) and **policy diff tests** per bind.

### 7.3 Bindings & Capability Contracts

**Issues:** Without contracts, IAM generation can become permissive or inconsistent.

**Actions:**

* Define a **capability catalog** (e.g., `db:postgres`, `queue:sqs`, `bucket:s3`, `secret:read`) with:

  * allowed IAM actions/resource patterns,
  * required connection metadata (host/port/secret refs),
  * runtime env injection rules.
* Ship **reference policies** and verify diffs in CI (no wildcard creep).
* Enforce **cross‑account binding rules** and **principle of least privilege** gates (fail on over‑broad).

### 7.4 Compliance & Evidence (Commercial/FedRAMP)

**Issues:** Rules documented in README need machine‑readable enforcement and exportable evidence. ([GitHub][1])

**Actions:**

* Implement **policy packs** per framework (Commercial, FedRAMP Moderate, FedRAMP High):

  * codify as code (TypeScript rules + OPA/Rego optional),
  * run in `svc validate` and again in CI post‑synth.
* **Evidence pipeline:** After `plan`/`deploy`, export control checks & artifacts (KMS config, backup windows, logging) to **OSCAL** JSON, attach links to resources (S3 evidence bucket), and surface in Backstage scorecards.
* **Governance suppressions workflow:** TTL auto‑expiry, approvals (Security/Compliance), JIT waivers in PR, provenance on who/why/when.

### 7.5 Observability & Runtime Standards

**Actions:**

* Standardize **OpenTelemetry** instrumentation for all runtime components (Lambda/API Gateway/Dynamo/RDS clients). Emit OTLP to a collector; give developers auto‑wired tracing via component defaults.
* Enforce **structured logging** (JSON) with correlation IDs (trace/span, request IDs).
* Provide **SLO templates** (latency/error/availability) and **golden dashboards** generated per service.

### 7.6 Security Posture

**Actions:**

* Secrets: default to **AWS Secrets Manager** with rotation; never let raw secrets into the manifest.
* **Boundary policies** & **service control policies (SCPs)** at the org level to block foot‑guns (public S3, wildcard KMS).
* **Image & package provenance** (Sigstore), **SBOM** on releases, **Dependabot** + **npm audit** gating.
* **Cedar/OPA** optional policy evaluation for runtime auth where applicable.

### 7.7 Developer Experience (CLI, MCP, Backstage)

**Actions:**

* CLI UX:

  * `svc init` interactive wizard uses your component registry and policy packs to propose safe defaults.
  * `svc explain` (new): converts a manifest into **plain‑English why/how**—ideal for onboarding and audit reviews.
  * `svc graph`: renders component & binding graph (Mermaid), with policy and cost annotations.
* **MCP server**: surface read‑only “tools” (list components, lint manifest, propose suppressions with justifications). Bind to `mcp-config.json` and ensure idempotent, rate‑limited operations.
* **Backstage**:

  * Scaffolder template backed by `service.yml` JSON Schema for field validation.
  * **Scorecards**: compliance %, SLO health, change lead time, failing policies; link to evidence artifacts.
  * **TechDocs**: auto‑generate docs from the manifest + `svc explain`.

---

## 8) Monorepo, Build & Release

**Current signals:** `tsconfig*.json`, `jest.config.js`, `package-lock.json`. Node/TS repo with tests; no visible monorepo engine in the UI snapshot. ([GitHub][1])

**Actions:**

* Switch to **pnpm** workspaces (fast, disk‑efficient) and adopt **Nx** or **Turborepo** (both are fine; Nx shines with TS project graph and generators).
* Add **Changesets** for versioning; publish tags per component package.
* CI matrix:

  1. **Verify**: Typecheck, unit tests, eslint, prettier.
  2. **Platform tests**: manifest fixture tests (schema & semantic), synth snapshots, policy diff tests.
  3. **E2E** (optional): LocalStack plan/synth with curated examples.
  4. **Release**: Changesets versioning + provenance + SBOM + GitHub Releases.
* Cache CDK context; avoid flakiness by pinning CDK libs and running `cdk synth` in hermetic containers.

---

## 9) CI/CD Reference Pipeline (GitHub Actions)

**PR:**

* `svc validate --json` on changed manifests; post annotations.
* Run **policy packs**; fail on violations without approved suppression.
* `svc plan --env dev` produce an artifact (HTML/JSON) attached to PR.

**Main branch:**

* Build & test all affected packages (Nx/Turbo).
* Publish packages via Changesets.
* **Preview deploys** to a shared sandbox account with **auto‑teardown**.
* Evidence export → OSCAL JSON → upload to S3 bucket; link in PR check.

**Prod promotion:**

* Manual approval step with evidence & diff summary; immutable artifact promotion; record provenance.

---

## 10) Testing Strategy

* **Unit tests**: manifest parser, validators, capability contracts.
* **Snapshot tests**: CDK synth output via `aws-cdk-lib/assertions`.
* **Policy diff tests**: for each bind, assert IAM changes are intentional.
* **Golden examples**: `examples/*` built in CI; each example has expected plan & compliance results.
* **Fuzzing** (light): randomize non‑critical fields to ensure robust parsing.

---

## 11) Backstage & Portal Design

* **Entity model:** `Service` derived from `service.yml`; **System** and **Component** relations built from the component graph.
* **Scaffolder action**: run `svc init` and `svc validate` inside Actions; show inline errors via JSON schema.
* **Scorecards**: composition of policy results (Commercial/FedRAMP), SLOs, deploy frequency, change failure rate.
* **Explorer**: render `svc graph` (Mermaid) + “explain” panels for auditors and new joiners.

A file named `service-backstage-portal.yml` in the repo root hints at this direction—great foundation to build on. ([GitHub][1])

---

## 12) OpenFeature & Config Strategy

* Add **OpenFeature** to expose feature flags in the manifest (per env), hand‑off to a provider (e.g., AWS AppConfig/LaunchDarkly).
* Define **configuration precedence**: org defaults < template defaults < env defaults < manifest overrides < CI‑supplied secrets/flags. Enforce and document.

---

## 13) Local Development

* Leverage the existing `docker-compose.localstack.yml` to create `svc up --local`. Provide **seed scripts**, **test data**, and **local credentials** guidance.
* Provide **hot‑reload Lambda** for `lambda-api` components in local mode, proxy API Gateway → local Lambda runtime.

---

## 14) Documentation & Governance

* **Architecture Decision Records (ADRs)** for: component registry design, policy pack mechanism, manifest schema versioning, bind contracts.
* **Contributor guide**: how to add a new component (checklist for schema, defaults, IAM, tests, docs).
* **Bug taxonomy** (you have `bugs-review.md`): align it with a triage policy and severities.

---

## 15) Adoption Metrics (make success measurable)

* Time‑to‑first‑service (from template to successful `plan`).
* % services passing policy packs with zero suppressions.
* Mean time to remediate security/compliance failures.
* Lead time from PR merge to deploy.
* SLO attainment across default templates.
* Platform NPS (developer surveys) and Backstage usage analytics.

---

## 16) 30/60/90 Roadmap (ticket‑ready)

**Next 30 days**

* [ ] Establish **pnpm** + **Nx/Turbo**; split into `packages/core`, `packages/cli`, `packages/components/*`.
* [ ] Author **JSON Schema** + TS types for `service.yml`; wire into CLI validation.
* [ ] Implement **policy packs** for Commercial & FedRAMP Moderate; fail on violations.
* [ ] Define **capability contracts** for `db:postgres`, `bucket:s3`, `queue:sqs`.
* [ ] Add **snapshot tests** for synth of each example manifest.
* [ ] Backstage Scaffolder v1 using the schema; render `svc plan` artifact in PR.

**Next 60 days**

* [ ] Introduce **Changesets**; publish versioned packages; generate SBOMs.
* [ ] Build **evidence export** (OSCAL JSON) with links to resources; store in S3.
* [ ] Add **governance workflow** (TTL enforcement, approvals) + PR annotations.
* [ ] `svc explain` & `svc graph` commands.
* [ ] OpenTelemetry defaults for `lambda-api` and standard structured logging.

**Next 90 days**

* [ ] FedRAMP High policy pack & **cross‑account org guardrails**.
* [ ] MCP server hardened; Backstage plugin for explain/scorecards.
* [ ] Golden dashboards & SLOs per template; error budget tracking.
* [ ] Scale tests with LocalStack; cost‑aware planning (surface major deltas in plan).

---

## 17) Closing Take

You’re aiming at the right shape of platform: **opinionated, compliant, and comprehensible**. The repository already communicates that story—`svc init|validate|plan`, component types, binds, and governance—now it needs the **systems engineering** that turns a strong idea into a dependable product: typed contracts, release discipline, evidence automation, and a polished portal surface. Keep the developer ergonomics front‑and‑center while making compliance **provable** and deviations **auditable**. If you do that, Shinobi becomes the paved road teams will actually choose to drive. ([GitHub][1])

---

**Notes on evidence used:** this review is based on the repository’s README (commands, component examples, governance) and the visible root file layout (e.g., `service.yml`, LocalStack compose, MCP config, Backstage portal manifest). ([GitHub][1])

[1]: https://github.com/Kristopherlb/shinobi/tree/main "GitHub - Kristopherlb/shinobi"
