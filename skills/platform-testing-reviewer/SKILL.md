---
name: platform-testing-reviewer
description: Enforces the Platform Testing Standard (PTS-1.0) for all tests in the codebase. Use when writing, reviewing, or modifying tests to ensure compliance with test metadata requirements, naming conventions, determinism rules, oracle usage, and coverage standards. This skill provides guidance on test structure, metadata sidecars, snapshot masking, and AI-authored test policies.
compatibility: Requires access to test files, metadata sidecars, and platform testing standard documentation. Designed for use in the Shinobi platform codebase.
metadata:
  author: shinobi-platform
  version: "1.0"
license: Apache-2.0
---

# platform-testing-reviewer

<!-- Degrees of Freedom: Medium - Provide structure with some flexibility for agent adaptation -->

## Instructions

1. Analyze the test file(s) to determine which Platform Testing Standard rules apply
2. Review tests against PTS-1.0 requirements, checking:
   - Test metadata sidecars (required for all tests)
   - Naming conventions (Feature__Condition__ExpectedOutcome)
   - Determinism (clock/RNG/I/O control)
   - Oracle usage (single primary oracle per test)
   - Assertion patterns (contract-based, not internals)
   - Negative/adversarial test cases
   - Coverage and evidence requirements
3. Validate metadata completeness and format (TP-<service>-<feature>-NNN ID format)
4. Check for AI-authored tests requiring human reviewer
5. Verify snapshot tests include mask_rules
6. Provide specific remediation guidance based on violations found

Adapt these steps as needed for your specific review scenario (unit test vs integration vs E2E).

### Critical Rules to Enforce

**REQUIRED**: Every test file MUST have an adjacent metadata sidecar file (`.meta.json`, `.meta.yaml`, or `.meta.yml`).

**Required Metadata Fields**:
- `id`: TP-<service>-<feature>-NNN format (zero-padded 3 digits)
- `level`: "unit", "integration", or "e2e"
- `capability`: Short behavior description
- `oracle`: "exact", "snapshot", "property", "contract", "metamorphic", or "trace"
- `invariants`: Array of properties that must hold
- `fixtures`: Array of fixture names used
- `inputs`: Object with shape and notes
- `risks`: Array of identified risks
- `dependencies`: Array of dependencies
- `evidence`: Array of evidence URIs (required for integration/E2E)
- `compliance_refs`: Array of compliance standard references
- `ai_generated`: Boolean (if true, requires `human_reviewed_by`)
- `human_reviewed_by`: String (required if `ai_generated=true`)

**Naming Convention**: Tests must follow `Feature__Condition__ExpectedOutcome` format.

**Determinism Requirements**:
- Clock must be frozen/injected (no system clock reliance)
- RNG must be seeded (print seed on failure)
- I/O must be faked or hermetic (no network unless required)
- Environment variables restored after each test

**Oracle Rules**:
- One primary oracle per test (do not mix snapshot + property, etc.)
- Snapshot tests MUST declare `mask_rules` in metadata
- Prefer contract assertions over internals

## Examples

### Example 1: Reviewing a New Test File

**Input**: Test file `packages/components/my-service/tests/my-service.component.test.ts`

**Process**:
1. Check for adjacent metadata sidecar (`my-service.component.test.meta.json`)
2. Verify metadata has all required fields
3. Check test naming follows `Feature__Condition__ExpectedOutcome`
4. Verify determinism (clock/RNG/I/O control)
5. Check oracle usage (single primary oracle)
6. Verify snapshot tests have `mask_rules`
7. Check for negative/adversarial test cases
8. Verify AI-authored tests have `human_reviewed_by`

**Output**: Report of compliance status with specific line numbers for violations

### Example 2: Generating a New Test

**Input**: Request to generate tests for a component

**Process**:
1. Create test file following naming convention
2. Create metadata sidecar with all required fields
3. Set up determinism harness (freeze clock, seed RNG)
4. Choose appropriate oracle (exact, snapshot, contract, etc.)
5. Include negative test cases
6. Add compliance_refs for relevant standards
7. If AI-generated, set `ai_generated=true` and `human_reviewed_by`

**Output**: Generated test file with metadata sidecar following PTS-1.0

## Bundled Resources

- **Scripts**: Use `scripts/` for validation scripts and metadata checkers
- **References**: Load `references/` files for detailed standard specifications, audit rules, and examples
- **Assets**: Use `assets/` for test templates and metadata schemas

## Edge Cases

- **Legacy Tests**: When modifying existing tests without metadata, prioritize adding metadata sidecars first
- **Snapshot Tests**: Always include `mask_rules` for volatile fields (timestamp, uuid, id, hash, ARNs)
- **AI-Generated Tests**: Must have `ai_generated=true` and non-empty `human_reviewed_by` field
- **Integration/E2E Tests**: Must include evidence URIs in metadata
- **Mixed Oracles**: Avoid mixing multiple primary oracles in the same test file

## Checklist of Truth

When reviewing tests, follow this 5-step checklist:

| Step | Check | Outcome |
|------|-------|---------|
| **1. Sidecar** | Is there a `.meta.json`? | **FAIL** if missing |
| **2. Naming** | Does it use `__` separators? | **FAIL** if `test('works')` |
| **3. Oracle** | Is it using a single oracle? | **WARN** if mixing snapshots and assertions |
| **4. Masking** | Are volatile fields masked? | **FAIL** if timestamps appear in snapshots |
| **5. Evidence** | (Integration only) Are URIs present? | **FAIL** if blank |

The `validate-test-metadata.sh` script enforces this checklist automatically.

## Additional Resources

- See `references/PLATFORM_TESTING_STANDARD_FULL.md` for complete Platform Testing Standard
- See `references/AUDIT_RULES.md` for PTS audit rules from platform-testing.yaml
- See `references/METADATA_SCHEMA.md` for JSON Schema of test metadata
- See `references/ORACLE_GUIDE.md` for oracle selection decision guide
- See `references/ORACLE_EXAMPLES.md` for examples of each oracle type
- See `references/MASKING_RULES.md` for snapshot masking requirements
- Use `scripts/validate-test-metadata.sh` to validate metadata sidecars (enforces Checklist of Truth)
- Use `scripts/check-determinism.sh` to verify determinism requirements

