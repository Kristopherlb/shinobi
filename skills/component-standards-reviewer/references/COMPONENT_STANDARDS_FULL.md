# Component Standards Baseline - Full Reference

This document contains the complete Component Standards Baseline from `.cursor/rules/component-standards.mdc`. Load this file when you need detailed specifications for component architecture patterns.

## Quick Reference

The Component Standards Baseline defines **REQUIRED** patterns for all platform components in `packages/components/`. All AI-generated components must follow these patterns.

## 7 Required Platform Standards

1. **[Platform Component API Spec](../../docs/platform-standards/platform-component-api-spec.md)** - Component contract and BaseComponent requirements
2. **[Platform Configuration Standard](../../docs/platform-standards/platform-configuration-standard.md)** - 5-layer precedence chain, no hardcoded values
3. **[Platform Tagging Standard](../../docs/platform-standards/platform-tagging-standard.md)** - Mandatory resource tagging
4. **[Platform Logging Standard](../../docs/platform-standards/platform-logging-standard.md)** - Structured JSON logging
5. **[Platform Observability Standard](../../docs/platform-standards/platform-observability-standard.md)** - OpenTelemetry integration
6. **[Platform Testing Standard](../../docs/platform-standards/platform-testing-standard.md)** - Test requirements and metadata
7. **[Platform Capability Naming Standard](../../docs/platform-standards/platform-capability-naming-standard.md)** - Capability vocabulary

## Critical Rules

**CRITICAL RULE**: Components MUST NEVER check `this.context.complianceFramework` directly in component code. All compliance framework logic belongs exclusively in ConfigBuilder's `getComplianceFrameworkDefaults()` method, which uses risk-based flags (like `highRiskEnvironment`) rather than framework checks. Components consume resolved config values only.

## Structural Patterns

### BaseComponent Inheritance

All components MUST extend `BaseComponent` from `@shinobi/core` and use the exact constructor signature:

```typescript
constructor(
  scope: Construct,
  id: string,
  context: ComponentContext,
  spec: ComponentSpec
) {
  super(scope, id, context, spec);
}
```

### ConfigBuilder Pattern

All components MUST use the ConfigBuilder pattern with a 5-layer precedence chain:

1. User Overrides (from service.yml component config)
2. Environment Defaults (from service.yml environments block)
3. Platform Defaults (from `/config/{framework}.yml`)
4. Compliance Framework Defaults (from `getComplianceFrameworkDefaults()`)
5. Hardcoded Fallbacks (from `getHardcodedFallbacks()`)

**CRITICAL**: Use `highRiskEnvironment` flag for risk-based defaults, NEVER check compliance frameworks directly.

### Creator Pattern

All components MUST have a Creator class implementing `IComponentCreator` for platform discovery.

### Required Methods

All components MUST implement:
- `synth(): void` - Core synthesis method
- `getCapabilities(): ComponentCapabilities` - Returns machine-readable capabilities
- `getType(): string` - Returns component type identifier

## Security & Compliance Guardrails

### Encryption Requirements

All storage resources MUST be encrypted. Use `createKmsKeyIfNeeded()` with config-driven values (not framework checks).

### Structured Logging

All components MUST use structured JSON logging. **Forbidden**: `console.log()`, `console.error()`, `console.warn()`

### OpenTelemetry Observability

All compute components MUST implement OpenTelemetry observability per Platform Observability Standard.

### Mandatory Tagging

All taggable resources MUST use `applyStandardTags()` per Platform Tagging Standard.

## Testing Patterns

### Test Framework

Use **Vitest** for all component tests.

### Required Tests

- CDK-Nag security tests
- Template assertions using `Template.fromStack()`
- Triad matrix tests (commercial, fedramp-moderate, fedramp-high)
- 90% code coverage target

### Test Metadata

All tests MUST include metadata following Platform Testing Standard.

## Anti-Patterns

### Forbidden Patterns

- ❌ Compliance framework checks in component code
- ❌ Hardcoded security-sensitive values
- ❌ Environment-specific conditionals
- ❌ Application-specific logic
- ❌ Component imports
- ❌ Direct component instantiation
- ❌ Network calls or CLI executions in ConfigBuilder
- ❌ Secrets in code or config

## Reference Files

For the complete specification, see `.cursor/rules/component-standards.mdc` in the codebase.

