# Platform Testing Standard - Full Reference

This document contains the complete Platform Testing Standard (PTS-1.0) from `docs/platform-standards/platform-testing-standard.md`. Load this file when you need detailed specifications for test patterns.

## Quick Reference

The Platform Testing Standard defines **REQUIRED** patterns for all tests in the codebase. All tests must follow these patterns.

## Core Definitions

- **Unit Test**: Verifies a single unit's behavior in isolation (no real network/FS/clock unless faked)
- **Integration Test**: Verifies cooperation across real boundaries we control (CLI, validators, serializers, schema loaders)
- **End-to-End (E2E) Test**: Verifies externally observable capabilities from entry point to outcome
- **Oracle**: Source of truth for pass/fail
- **Fixture**: Stable setup/teardown for determinism
- **Invariant**: Property that must always hold
- **Contract**: Externally visible behavior (inputs, outputs, side effects, errors)

## Principles of Good Tests

1. One behavior per test; one primary oracle
2. Deterministic: frozen clock, seeded RNG, controlled I/O
3. Assert contracts, not internals
4. Minimal fixtures; explicit setup/teardown
5. Failures are actionable and reproducible

## Oracles

1. **Exact Output** - Deterministic value/structure comparison
2. **Snapshot (Golden)** - Serialized artifact vs committed baseline; requires masks for volatility
3. **Property-Based** - Invariants over generated inputs; shrink failing cases
4. **Contract/Schema** - Validate against schema/protocol (JSON Schema/OpenAPI)
5. **Metamorphic** - Relationships between inputs/outputs (parse⟷serialize stability)
6. **Behavioral Trace** - Observable side effects occurred without coupling to call graphs

**Rule**: Do not combine multiple primary oracles in a single test.

## Determinism Requirements

- **Clock**: Inject or freeze; no system clock reliance
- **Randomness**: Seed globally; print seed on failure
- **I/O**: Use fakes/in-memory or hermetic sandboxes; no network unless required
- **Concurrency**: Bound threads; assert ordering only when part of contract
- **Environment**: Restore env vars, feature flags, globals after each test
- **Cleanup**: No cross-test leakage; tear down temporary dirs/sockets/ports

## Test Metadata (Required)

Every test must include machine- and human-readable metadata adjacent to the test (JSON or YAML). All fields are required; arrays may be empty but must be present.

```json
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
```

**ID Format**: TP-<service>-<feature>-<NNN> where <NNN> is zero-padded 3 digits (e.g., 001).

**Conditional**: If `ai_generated=true`, `human_reviewed_by` must be a non-empty string.

## Naming Convention

**Format**: `Feature__Condition__ExpectedOutcome`

**Example**: `BindQueue__MissingPermission__FailsWithActionableError`

## Snapshot Masking Rule

Required masks for volatile fields:
- timestamp
- uuid
- id
- hash
- generated names/arns when non-deterministic

Declare masks in metadata (`inputs.notes` or dedicated `mask_rules` list in fixtures).

Regenerate snapshots only with an intentional contract change; include rationale in commit message.

## Test Doubles Policy

- Prefer fakes (working substitutes) over mocks when behavior matters
- Stubs/spies allowed for simple return/observation
- Mocks only for external boundaries we don't own or cannot make deterministic
- **Rule**: Do not mock code you own unless unavoidable

## Input Design & Negative Testing

- Equivalence classes and boundary values (min/max/empty/null/zero/oversized)
- Adversarial/malformed inputs (invalid enums, schema violations)
- Faults: timeouts, partial failures, retries; verify idempotency
- Security-focused negatives (IaC/CDK): public resources, weak encryption, over-broad IAM, missing audit/logging

## Coverage & Depth

- Target ~80% branch/condition where meaningful
- Prioritize behavioral/contract coverage over raw lines
- Mutation testing recommended (no minimum mandated)

## AI-Authored Tests Policy

- AI-authored tests must fully comply with this standard
- `ai_generated=true` and `human_reviewed_by` are mandatory
- AI must not invent conformance rules; link via `compliance_refs`
- AI should self-validate against review checklist before submitting

## Review Checklist

- Name follows `Feature__Condition__Outcome`
- One behavior, one primary oracle
- Deterministic: clock/RNG/I/O controlled; cleanup verified
- Inputs cover nominal + boundary + invalid/adversarial
- Assertions target contracts; failure messages actionable
- Metadata present and complete (incl. compliance_refs when applicable)
- If `ai_generated=true`, verified human reviewer present

## Reference Files

For the complete specification, see `docs/platform-standards/platform-testing-standard.md` in the codebase.

