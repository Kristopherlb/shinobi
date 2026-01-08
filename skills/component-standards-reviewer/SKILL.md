---
name: component-standards-reviewer
description: Enforces the Component Standards Baseline for all platform components in packages/components/. Use when generating, reviewing, or modifying platform components to ensure compliance with structural patterns, security guardrails, interface standards, and testing requirements. This skill provides guidance on BaseComponent inheritance, ConfigBuilder patterns, compliance framework handling, and platform standards compliance.
compatibility: Requires access to @shinobi/core, platform standards documentation, and component codebase. Designed for use in the Shinobi platform codebase.
metadata:
  author: shinobi-platform
  version: "1.0"
license: Apache-2.0
---

# component-standards-reviewer

<!-- Degrees of Freedom: Medium - Provide structure with some flexibility for agent adaptation -->

## Instructions

1. Analyze the component code to determine which standards apply and what patterns need to be enforced
2. Review the component against the Component Standards Baseline, checking:
   - Structural patterns (BaseComponent inheritance, ConfigBuilder pattern, Creator pattern)
   - Security & compliance guardrails (encryption, tagging, logging, observability)
   - Interface standards (config schemas, naming conventions)
   - Testing patterns (CDK-Nag, template assertions, triad matrix tests)
3. Validate compliance with the 7 required Platform Standards
4. Check for anti-patterns (compliance framework checks in component code, hardcoded values, etc.)
5. Provide specific remediation guidance based on violations found

Adapt these steps as needed for your specific review scenario (generation vs modification vs audit).

### Critical Rules to Enforce

**CRITICAL**: Components MUST NEVER check `this.context.complianceFramework` directly. All compliance logic belongs in ConfigBuilder's `getComplianceFrameworkDefaults()` using risk-based flags like `highRiskEnvironment`.

**Required Compliance Checks**:
1. BaseComponent inheritance - extends `BaseComponent` from `@shinobi/core`
2. ConfigBuilder pattern - implements 5-layer precedence chain
3. No hardcoded security-sensitive values - uses safe defaults
4. Risk-based configuration - uses `highRiskEnvironment` flag, never framework checks
5. Mandatory tagging - uses `applyStandardTags()` on all resources
6. Structured logging - uses platform logger methods, never `console.log`
7. OpenTelemetry observability - implements for compute components
8. Capability registration - registers at least one capability
9. Construct registration - registers important constructs
10. Test coverage - includes CDK-Nag, template assertions, triad tests

## Examples

### Example 1: Reviewing a New Component

**Input**: Component code in `packages/components/my-service/src/my-service.component.ts`

**Process**:
1. Check if component extends `BaseComponent`
2. Verify ConfigBuilder implements 5-layer precedence
3. Check for compliance framework checks in component code (should be none)
4. Verify risk-based configuration uses `highRiskEnvironment` flag
5. Check all resources use `applyStandardTags()`
6. Verify structured logging usage
7. Check capability and construct registration
8. Review test files for compliance

**Output**: Report of compliance status with specific line numbers for violations

### Example 2: Generating a New Component

**Input**: Request to generate a new component

**Process**:
1. Ensure component follows BaseComponent inheritance pattern
2. Create ConfigBuilder with 5-layer precedence chain
3. Use risk-based defaults with `highRiskEnvironment` flag
4. Implement all required methods (`synth()`, `getCapabilities()`, `getType()`)
5. Apply standard tags to all resources
6. Implement structured logging
7. Register capabilities and constructs
8. Create tests with CDK-Nag and template assertions

**Output**: Generated component code following all standards

## Bundled Resources

- **Scripts**: Use `scripts/` for validation scripts and code analysis tools
- **References**: Load `references/` files for detailed standard specifications and examples
- **Assets**: Use `assets/` for template code snippets and checklists

## Edge Cases

- **Legacy Components**: When modifying existing components, prioritize high-risk violations first (compliance framework checks, hardcoded secrets)
- **Complex Components**: For components with many resources, ensure each resource follows tagging, logging, and observability standards
- **Test Generation**: When generating tests, ensure triad matrix tests cover all compliance frameworks (commercial, fedramp-moderate, fedramp-high)

## Additional Resources

- See `references/COMPONENT_STANDARDS_FULL.md` for complete Component Standards Baseline
- See `references/PLATFORM_STANDARDS.md` for links to all 7 required Platform Standards
- See `references/ANTI_PATTERNS.md` for common violations and fixes
- Use `scripts/validate-component.sh` to validate component structure

