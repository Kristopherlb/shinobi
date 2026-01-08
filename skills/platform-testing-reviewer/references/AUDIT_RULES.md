# Platform Testing Audit Rules

This document lists the audit rules from `.cursor/audit/platform-testing.yaml` that enforce the Platform Testing Standard.

## Metadata Rules (PTS-101 to PTS-105)

### PTS-101: Each test file has adjacent metadata sidecar
- **Severity**: Error
- **Requirement**: Every test file must have a sidecar with same basename and `.meta.json`, `.meta.yaml`, or `.meta.yml` suffix
- **Message**: "Every test must have adjacent metadata: *.meta.(json|yaml|yml)."

### PTS-102: Metadata has required fields
- **Severity**: Error
- **Requirement**: Metadata must include all required fields:
  - `id` (TP-<service>-<feature>-NNN format)
  - `level` (unit|integration|e2e)
  - `capability`
  - `oracle` (exact|snapshot|property|contract|metamorphic|trace)
  - `invariants` (array)
  - `fixtures` (array)
  - `inputs` (object)
  - `risks` (array)
  - `dependencies` (array)
  - `evidence` (array)
  - `compliance_refs` (array)
  - `ai_generated` (boolean)
  - `human_reviewed_by` (string)

### PTS-103: AI-authored tests require human reviewer
- **Severity**: Error
- **Requirement**: If `ai_generated=true`, `human_reviewed_by` must be non-empty
- **Message**: "ai_generated=true requires non-empty human_reviewed_by."

### PTS-104: Snapshot oracle requires mask_rules
- **Severity**: Error
- **Requirement**: If `oracle="snapshot"`, must declare `mask_rules` array
- **Message**: "Snapshot tests MUST declare mask_rules (see §13)."

### PTS-105: ID format TP-<service>-<feature>-NNN
- **Severity**: Error
- **Requirement**: ID must follow TP-<service>-<feature>-NNN with zero-padded NNN
- **Message**: "IDs must follow TP-<service>-<feature>-NNN with zero-padded NNN."

## Naming Rules (PTS-201 to PTS-202)

### PTS-201: Test titles follow Feature__Condition__ExpectedOutcome
- **Severity**: Warn
- **Requirement**: Test titles should follow naming convention
- **Message**: "Name tests as Feature__Condition__ExpectedOutcome (heuristic)."

### PTS-202: Test filenames follow Feature__Condition__ExpectedOutcome
- **Severity**: Warn
- **Requirement**: Filenames should follow naming convention
- **Message**: "Prefer filenames shaped like Feature__Condition__ExpectedOutcome.* (heuristic)."

## Determinism Rules (PTS-301 to PTS-305)

### PTS-301: Deterministic clock used (JS/TS)
- **Severity**: Warn
- **Requirement**: Use `jest.useFakeTimers()`, `vi.useFakeTimers()`, `sinon.useFakeTimers()`, or `MockDate.set()`
- **Message**: "Freeze/inject the clock for deterministic tests."

### PTS-302: Deterministic clock used (Python)
- **Severity**: Warn
- **Requirement**: Use `freezegun.freeze_time()`, `@freeze_time()`, or `time_machine.travel()`
- **Message**: "Use freezegun/time_machine (or equivalent) to freeze time."

### PTS-303: RNG seeding present (JS/TS)
- **Severity**: Warn
- **Requirement**: Seed RNG using `seedrandom()`, `fc.configure()`, or `Math.random = ...`
- **Message**: "Seed RNG for reproducibility; print seed on failure."

### PTS-304: RNG seeding present (Python)
- **Severity**: Warn
- **Requirement**: Seed RNG using `random.seed()`, `np.random.seed()`, or Hypothesis settings
- **Message**: "Seed RNG (random/numpy) or configure Hypothesis."

### PTS-305: Network access disallowed unless explicitly allowed
- **Severity**: Warn
- **Requirement**: No live network in tests unless fixture opts-in (`net:allow` or `live_integration`)
- **Message**: "No live network in tests unless fixture opts-in (net:allow/live_integration)."

## Oracle Rules (PTS-401 to PTS-402)

### PTS-401: Do not mix primary oracles in a single file
- **Severity**: Warn
- **Requirement**: Keep one primary oracle per test case
- **Message**: "Keep one primary oracle per test case; mixing in same file is a smell."

### PTS-402: Snapshot tests should use stable serializers/masks
- **Severity**: Warn
- **Requirement**: Apply masks/sanitizers before snapshotting
- **Message**: "Apply masks/sanitizers before snapshotting (or via custom serializer)."

## Assertion Rules (PTS-501 to PTS-502)

### PTS-501: Prefer contract assertions (avoid internals/private)
- **Severity**: Warn
- **Requirement**: Avoid asserting private/internal fields
- **Message**: "Avoid asserting private/internal fields; stick to public contract."

### PTS-502: Failure messages should be actionable
- **Severity**: Warn
- **Requirement**: Prefer specific equality/schema assertions over truthy/falsy
- **Message**: "Prefer specific equality/schema assertions over truthy/falsy."

## Negative Testing Rules (PTS-601)

### PTS-601: Negative/adversarial cases present
- **Severity**: Warn
- **Requirement**: Include invalid/adversarial inputs and fault cases
- **Message**: "Include invalid/adversarial inputs and fault cases."

## Coverage Rules (PTS-701 to PTS-702)

### PTS-701: Coverage summary present (CI artifact)
- **Severity**: Warn
- **Requirement**: Publish coverage artifacts to CI (target ~80% branch/condition)
- **Message**: "Publish coverage artifacts to CI. Target ~80% branch/condition per §10."

### PTS-702: Mutation report present (optional)
- **Severity**: Info
- **Requirement**: Mutation testing report detected (recommended, no numeric gate)
- **Message**: "Mutation testing report detected. (Recommended; no numeric gate.)"

## Conformance/Evidence Rules (PTS-801 to PTS-803)

### PTS-801: Conformance references included when relevant
- **Severity**: Warn
- **Requirement**: Link relevant conformance packs in `compliance_refs` when tests validate them
- **Message**: "Link relevant conformance packs in compliance_refs when tests validate them."

### PTS-802: Evidence URIs present for integration/E2E
- **Severity**: Warn
- **Requirement**: Integration/E2E should attach at least one evidence URI (logs, junit, artifacts)
- **Message**: "Integration/E2E should attach at least one evidence URI (logs, junit, artifacts)."

### PTS-803: Snapshot changes require intentional regeneration
- **Severity**: Info
- **Requirement**: Snapshot changes should include rationale in commit/PR
- **Message**: "Snapshots changed in this PR. Ensure rationale is included in the commit/PR per §13."

## Audit Rule Mappings

- **Metadata**: PTS-101, PTS-102, PTS-103, PTS-104, PTS-105
- **Naming**: PTS-201, PTS-202
- **Determinism**: PTS-301, PTS-302, PTS-303, PTS-304, PTS-305
- **Oracles**: PTS-401, PTS-402
- **Assertions**: PTS-501, PTS-502
- **Negatives**: PTS-601
- **Coverage**: PTS-701, PTS-702
- **Conformance/Evidence**: PTS-801, PTS-802, PTS-803


