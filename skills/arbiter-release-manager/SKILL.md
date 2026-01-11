---
name: arbiter-release-manager
description: Orchestrates release management and deployment validation. Checks if all components passed component-standards-reviewer, validates test metadata via platform-testing-reviewer, generates FedRAMP Evidence Bundles, and updates release documentation. Use when preparing releases, validating PRs for deployment readiness, or generating compliance evidence.
compatibility: Requires access to component codebase, test files, audit results, and release documentation. Designed for use in the Shinobi platform codebase.
metadata:
  author: shinobi-platform
  version: "1.0"
license: Apache-2.0
---

# arbiter-release-manager

<!-- Degrees of Freedom: Medium - Provide structure with some flexibility for agent adaptation -->

## Instructions

The Arbiter skill orchestrates the release process by validating all prerequisites, generating evidence bundles, and updating release documentation. It acts as the "When" skill that determines deployment readiness.

### Release Validation Workflow

1. **Component Standards Validation**
   - Use `component-standards-reviewer` skill to validate all components in the PR/change
   - Check that all components passed structural, security, and compliance checks
   - Verify no critical violations exist (compliance framework checks, hardcoded secrets, etc.)
   - **FAIL** if any component has critical violations

2. **Test Standards Validation**
   - Use `platform-testing-reviewer` skill to validate all test files
   - Check that all tests have metadata sidecars (`.meta.json` files)
   - Verify test naming follows `Feature__Condition__ExpectedOutcome` format
   - Validate determinism, oracle usage, and negative test cases
   - **FAIL** if any test is missing metadata or violates PTS-1.0

3. **Test Execution Validation**
   - Verify all tests pass (unit, integration, E2E)
   - Check test coverage meets platform standards (90% statements, 80% branches)
   - Validate triad matrix tests exist for all compliance frameworks
   - **FAIL** if tests fail or coverage is insufficient

4. **Evidence Bundle Generation**
   - Generate FedRAMP Evidence Bundle with:
     - OSCAL artifacts (component assessments)
     - Test results and coverage reports
     - Log samples and log group configurations
     - Dashboard definitions
     - Tagging compliance reports
   - Include all components in the release
   - **FAIL** if evidence bundle generation fails

5. **Release Documentation Update**
   - Update Confluence release page (if configured)
   - Generate release notes from component changes
   - Document compliance status (commercial, fedramp-moderate, fedramp-high)
   - **WARN** if documentation update fails (non-blocking)

### Critical Rules

**REQUIRED**: All components MUST pass `component-standards-reviewer` validation before release

**REQUIRED**: All tests MUST pass `platform-testing-reviewer` validation (metadata, naming, determinism)

**REQUIRED**: All tests MUST pass execution (no failing tests)

**REQUIRED**: Evidence Bundle MUST be generated for FedRAMP compliance

**PROHIBITED**: Do not release if critical violations exist (compliance framework checks, hardcoded secrets)

**PROHIBITED**: Do not release if tests are missing metadata or violate PTS-1.0

### Integration with Other Skills

**Always use these skills in sequence**:

1. **component-standards-reviewer**: Validate component compliance
   - If violations found, use `devops-knowledge-base` to find AWS-recommended remediation
2. **platform-testing-reviewer**: Validate test compliance
   - Always use `test-driven-development` skill when writing tests
3. **devops-knowledge-base**: Find AWS best practices for remediation
4. **arbiter-release-manager**: Orchestrate release validation (this skill)

## Examples

### Example 1: Validating PR for Release

**Context**: PR with changes to multiple components, need to validate for release

**Process**:
1. **Component Validation**:
   - Run `component-standards-reviewer` on all changed components
   - Check for violations:
     - Component A: ✅ Passed
     - Component B: ⚠️ Warning - missing test metadata
     - Component C: ❌ Failed - compliance framework check in component code
   - **Result**: ❌ FAIL - Component C has critical violation

2. **Remediation**:
   - Use `devops-knowledge-base` to find AWS best practices for Component C
   - Fix Component C violation (remove compliance framework check)
   - Re-run `component-standards-reviewer`

3. **Test Validation**:
   - Run `platform-testing-reviewer` on all test files
   - Check metadata sidecars exist
   - Verify naming conventions
   - **Result**: ✅ Pass - All tests compliant

4. **Test Execution**:
   - Run all tests: `pnpm nx run-many -t test --all`
   - Check coverage: `pnpm nx run-many -t coverage --all`
   - **Result**: ✅ Pass - All tests pass, coverage meets standards

5. **Evidence Generation**:
   - Generate evidence bundle: `./scripts/generate-evidence.sh`
   - Include OSCAL artifacts, test results, logs, dashboards
   - **Result**: ✅ Pass - Evidence bundle generated

6. **Release Approval**:
   - All validations passed
   - Evidence bundle complete
   - **Result**: ✅ APPROVED FOR RELEASE

### Example 2: Generating FedRAMP Evidence Bundle

**Context**: Need to generate evidence bundle for FedRAMP High compliance audit

**Process**:
1. **Collect Evidence**:
   - Component assessments (OSCAL format)
   - Test results and coverage reports
   - Log samples and configurations
   - Dashboard definitions
   - Tagging compliance reports

2. **Generate Bundle**:
   - Run evidence generation script for each component
   - Aggregate into single evidence bundle
   - Include compliance framework metadata (fedramp-high)

3. **Validate Bundle**:
   - Check all required artifacts present
   - Verify OSCAL format compliance
   - Validate test results are current

4. **Output**:
   - Evidence bundle in `evidence-bundles/fedramp-high-YYYY-MM-DD/`
   - Ready for auditor review

### Example 3: Release Documentation Update

**Context**: Release approved, need to update Confluence release page

**Process**:
1. **Extract Release Information**:
   - Component changes from git history
   - Test results and coverage
   - Compliance status (commercial, fedramp-moderate, fedramp-high)

2. **Generate Release Notes**:
   - Component updates
   - New features
   - Bug fixes
   - Compliance updates

3. **Update Documentation**:
   - Confluence release page (if configured)
   - Release notes markdown file
   - Compliance status dashboard

## Release Checklist

When orchestrating a release, follow this checklist:

| Step | Check | Skill Used | Outcome |
|------|-------|------------|---------|
| **1. Components** | All components pass standards? | `component-standards-reviewer` | **FAIL** if violations |
| **2. Tests** | All tests have metadata? | `platform-testing-reviewer` | **FAIL** if missing |
| **3. Test Execution** | All tests pass? | Test execution | **FAIL** if failures |
| **4. Coverage** | Coverage meets standards? | Coverage reports | **FAIL** if < 90% |
| **5. Evidence** | Evidence bundle generated? | Evidence scripts | **FAIL** if missing |
| **6. Documentation** | Release docs updated? | Documentation scripts | **WARN** if fails |

## Evidence Bundle Structure

```
evidence-bundles/
└── {compliance-framework}-{date}/
    ├── index.md                    # Markdown index
    ├── oscal/
    │   └── component-assessment.json
    ├── tests/
    │   ├── coverage-report.json
    │   └── test-results.json
    ├── logs/
    │   └── log-samples.json
    ├── dashboards/
    │   └── dashboard-definitions.json
    └── tags/
        └── tagging-compliance.json
```

## Bundled Resources

- **Scripts**: 
  - `scripts/validate-release.sh` - Validates all release prerequisites
  - `scripts/generate-evidence-bundle.sh` - Generates FedRAMP evidence bundle
  - `scripts/update-release-docs.sh` - Updates release documentation
- **References**: 
  - `references/RELEASE_CHECKLIST.md` - Detailed release checklist
  - `references/EVIDENCE_BUNDLE_SPEC.md` - Evidence bundle specification
- **Assets**: Evidence bundle templates and OSCAL schemas

## Edge Cases

- **Partial Releases**: If only some components are ready, generate partial evidence bundle
- **Hotfixes**: Expedited release process for critical fixes (may skip some validations)
- **Rollback**: If release fails, generate rollback evidence bundle
- **Compliance Mismatch**: If components target different compliance frameworks, generate separate bundles

## Additional Resources

- See `references/RELEASE_CHECKLIST.md` for detailed release checklist
- See `references/EVIDENCE_BUNDLE_SPEC.md` for evidence bundle specification
- Use `scripts/validate-release.sh` to validate all release prerequisites
- Use `scripts/generate-evidence-bundle.sh` to generate evidence bundles
- Always use `component-standards-reviewer` and `platform-testing-reviewer` skills for validation

