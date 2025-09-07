Platform Testing Standard

Version: 1.0
Status: Draft
Last Updated: 2025-09-07


---

0. Document Control

Document ID: PTS-1.0

Owner: Platform Engineering

Revision History:

1.0 (2025-09-07): Initial publication with strengthened definitions, naming, snapshot masking, expanded E2E/Integration guidance, metadata schema, and AI-authored test policy.




---

1. Overview & Purpose

This document defines the official Testing Standard for all services and components deployed through the platform. It provides definitions, patterns, and rules for authoring tests that are consistent, deterministic, and auditable.
It does not restate conformance packs (e.g., Tagging, Logging, OTel, IAM). Tests must reference those standards where applicable.


---

2. Scope

In scope: definitions, principles, oracles, fixtures, assertions, metadata, naming, snapshot masking, and governance rules for AI-/human-authored tests.
Out of scope: conformance pack contents, CI/CD configuration, tool/vendor specifics (kept in supporting implementation guides).


---

3. Core Definitions

Unit Test: Verifies a single unit’s behavior in isolation (no real network/FS/clock unless faked).

Integration Test: Verifies cooperation across real boundaries that we control (e.g., CLI, validators, serializers, schema loaders, resolver/binder pipelines). Prefer real wiring within the process; still deterministic (clock/RNG/I/O faked or contained).

End-to-End (E2E) Test: Verifies externally observable capabilities from entry point to outcome. Use only when the contract spans multiple deploy-time steps or needs live integration; otherwise prefer integration.

Oracle: Source of truth for pass/fail (§5).

Fixture: Stable setup/teardown for determinism.

Invariant: Property that must always hold.

Contract: Externally visible behavior (inputs, outputs, side effects, errors).

Test Double: Dummy, stub, spy, mock, fake.



---

4. Principles of Good Tests

One behavior per test; one primary oracle.

Deterministic: frozen clock, seeded RNG, controlled I/O.

Assert contracts, not internals.

Minimal fixtures; explicit setup/teardown.

Failures are actionable and reproducible (show expected vs actual, seed/clock/inputs).



---

5. Oracles

1. Exact Output — deterministic value/structure comparison.


2. Snapshot (Golden) — serialized artifact vs committed baseline; requires masks for volatility (§13).


3. Property-Based — invariants over generated inputs; shrink failing cases.


4. Contract/Schema — validate against schema/protocol (e.g., JSON Schema/OpenAPI).


5. Metamorphic — relationships between inputs/outputs (e.g., parse⟷serialize stability).


6. Behavioral Trace — observable side effects occurred (events, permissions, files) without coupling to call graphs.
Rule: Do not combine multiple primary oracles in a single test.




---

6. Fixtures, Isolation & Determinism

Clock: inject or freeze; no system clock reliance.

Randomness: seed globally; print seed on failure.

I/O: use fakes/in-memory or hermetic sandboxes; no network unless required by contract.

Concurrency: bound threads; assert ordering only when part of the contract.

Environment: restore env vars, feature flags, globals after each test.

Cleanup: no cross-test leakage; tear down temporary dirs/sockets/ports.



---

7. Test Doubles Policy

Prefer fakes (working substitutes) over mocks when behavior matters.

Stubs/spies allowed for simple return/observation.

Mocks only for external boundaries we don’t own or cannot make deterministic.

Rule: Do not mock code you own unless unavoidable.



---

8. Input Design & Negative Testing

Equivalence classes and boundary values (min/max/empty/null/zero/oversized).

Adversarial/malformed inputs (invalid enums, schema violations).

Faults: timeouts, partial failures, retries; verify idempotency and bounded retries.

Security-focused negatives (IaC/CDK): public resources without justification, weak encryption params, over-broad IAM actions, missing audit/logging flags.



---

9. Assertions & Failures

One primary assertion; supporting invariants OK.

Failure messages must include: expected, actual, and reproduction data (seed, clock, masked diffs if snapshot).

Avoid asserting internal method counts/private fields unless they are part of the public contract.



---

10. Coverage & Depth

Target ~80% branch/condition where meaningful; prioritize behavioral/contract coverage over raw lines.

Mutation testing (where available) recommended to assess assertion strength (no minimum mandated).



---

11. Test Metadata (Required)

Every test must include machine- and human-readable metadata adjacent to the test (JSON or YAML). All fields below are required; arrays may be empty ([]) but must be present.

{
  "id": "TP-<service>-<feature>-<NNN>",
  "level": "unit|integration|e2e",
  "capability": "<short behavior description>",
  "oracle": "exact|snapshot|property|contract|metamorphic|trace",
  "invariants": [],
  "fixtures": [],
  "inputs": { "shape": "<domain summary>", "notes": "" },
  "risks": [],
  "dependencies": [],
  "evidence": [],
  "compliance_refs": [],
  "ai_generated": false,
  "human_reviewed_by": ""
}

ID format: TP-<service>-<feature>-<NNN> where <NNN> is zero-padded 3 digits (e.g., 001).
Conditional: If ai_generated=true, human_reviewed_by must be a non-empty string (name or group).


---

12. Naming Convention

Format: Feature__Condition__ExpectedOutcome
Example: BindQueue__MissingPermission__FailsWithActionableError


---

13. Snapshot Masking Rule

Required masks for volatile fields: timestamp, uuid, id, hash, generated names/arns when non-deterministic.

Declare masks in metadata (inputs.notes or dedicated mask list in fixtures).

Regenerate snapshots only with an intentional contract change; include rationale in commit message.



---

14. Linking to Conformance

When a test validates a conformance area (Tagging, OTel, Structured Logging, IAM Auditing, Deprecation, Configuration Precedence, Acceptance Criteria), include a link/reference in compliance_refs. Do not duplicate conformance rules here.


---

15. Review Checklist

Name follows Feature__Condition__Outcome.

One behavior, one primary oracle.

Deterministic: clock/RNG/I/O controlled; cleanup verified.

Inputs cover nominal + boundary + invalid/adversarial.

Assertions target contracts; failure messages actionable.

Metadata present and complete (incl. compliance_refs when applicable).

If ai_generated=true, verified human reviewer present.



---

16. Glossary

Contract: externally observable behavior promise.

Invariant: condition that must always hold.

Oracle: mechanism to decide pass/fail.

Fixture: deterministic setup/teardown state.

Mask: redaction/ignore rules for volatile snapshot fields.



---

17. AI-Authored Tests Policy

AI-authored tests must fully comply with this standard.

ai_generated=true and human_reviewed_by are mandatory for such tests.

AI must not invent conformance rules; all such checks must be linked via compliance_refs.

AI should self-validate against §15 before submitting tests.



---

End of Document


---

Product Enhancements (New Work to Support the Standard)

1. Test Metadata Schema & Validation



Publish a JSON Schema for §11.

Add a lightweight CLI (tests:validate) to scan repo, validate metadata, ensure ID format & conditional fields (human_reviewed_by).


2. Snapshot Masking Utility



Provide a small library to apply default masks (timestamp/uuid/hash/arns) and allow custom field masks; emit diff with masked placeholders.


3. Determinism Harness



Core helpers to freeze clock, seed RNG, sandbox FS/NET per test file; auto-print seed on failure; one-liner setup for Jest/PyTest.


4. Oracle Helpers



Utilities for each oracle:

Exact: stable deep-equal with ordered key comparison.

Snapshot: serializer + mask pipeline.

Contract: JSON-Schema validator with precise error diffs.

Property: thin wrapper for fast-check/Hypothesis with sane generators and shrinking defaults.

Metamorphic: small DSL to express input→output relations.



5. Security-Negative Generators (IaC)



Provide canned negative fixtures: public S3, weak KMS, over-broad IAM, missing logs/trace, invalid schemas—usable across tests to enforce §8.


6. AI Integration Aids



“Few-shot” example gallery of high-quality tests (one per oracle) aligned to this standard.

Prompt snippets the agent can pull for authoring (no runtime dependency on tools).


7. Lint Rules for Authoring



Static checks for:

File/test name pattern (§12).

Single test per behavior (heuristic).

Presence of seeded RNG/clock hooks.

Disallow mixing multiple primary oracles.

Enforce ai_generated/human_reviewed_by logic.



8. Coverage & Mutation Reporting



Minimal config to produce branch coverage and optional mutation score; publish in CI summary with links to failing mutation cases.


9. Compliance Reference Mapper



Tiny helper to add compliance_refs via friendly aliases (e.g., std://tagging, std://otel) resolving to canonical docs/URLs.


10. Test Catalog & Evidence Index



Generate a machine-readable index of all tests + metadata + evidence URIs; feed into dashboards or audits.


11. Pre-Commit & CI Hooks



Pre-commit: run metadata validator & lint rules on changed tests.

CI: block on schema invalid, missing masks for snapshot tests, or missing human_reviewed_by when ai_generated=true.


12. Deterministic Resource Name Helper



Provide a stable naming utility for tests that need synthetic ARNs/IDs to avoid volatile snapshot churn.


13. Template Starters



Repo templates for unit/integration/E2E test files with the metadata header stub and pre-wired determinism harness.


14. Docs & Non-Normative Appendix



Add a small appendix (separate doc) with non-normative examples per oracle, matching this standard but tool-agnostic in tone.
