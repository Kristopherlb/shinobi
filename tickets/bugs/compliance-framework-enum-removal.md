# Bug: Remove Compliance Framework Enum Restriction

**Status:** Open  
**Priority:** High  
**Component:** `@shinobi/core` - ComponentContext, Validators  
**Date:** 2025-01-15

## Problem

The platform currently uses an enum for `complianceFramework` in `ComponentContext`, which prevents consumers from adding their own compliance frameworks. This is a design flaw that blocks extensibility.

### Current Behavior

1. `ComponentContext.complianceFramework` is typed as an enum: `'commercial' | 'fedramp-moderate' | 'fedramp-high'`
2. Validators check for specific enum values (e.g., `'hipaa'`, `'sox'`) which fail type checking
3. Consumers cannot add custom compliance frameworks (e.g., `'hipaa'`, `'sox'`, `'pci-dss'`, `'iso27001'`)
4. TypeScript compilation fails when validators reference non-enum values

### Error Examples

```typescript
// Error: Type '"hipaa"' is not comparable to type '"commercial" | "fedramp-moderate" | "fedramp-high"'
if (this.context.complianceFramework === 'hipaa') {
  // ...
}
```

## Root Cause

The compliance framework is incorrectly modeled as an enum instead of a string. This violates the **Open/Closed Principle** - the platform should be open for extension (custom frameworks) but closed for modification.

## Impact

- **High**: Blocks consumer adoption for organizations with custom compliance requirements
- **High**: Forces consumers to modify platform code to add frameworks
- **Medium**: Type errors in validators referencing non-standard frameworks
- **Medium**: Prevents future extensibility

## Solution

### Phase 1: Change Type to String (Breaking Change)

1. **Update `ComponentContext` interface:**
   ```typescript
   // BEFORE
   export interface ComponentContext {
     complianceFramework: 'commercial' | 'fedramp-moderate' | 'fedramp-high';
   }
   
   // AFTER
   export interface ComponentContext {
     complianceFramework: string; // Allow any string value
   }
   ```

2. **Update all type definitions:**
   - `packages/core/src/platform/contracts/bindings.ts`
   - `packages/core/src/platform/contracts/component.ts`
   - All validator implementations

### Phase 2: Update Validators (Non-Breaking)

1. **Remove enum checks in validators:**
   ```typescript
   // BEFORE
   if (this.context.complianceFramework === 'fedramp-high' || 
       this.context.complianceFramework === 'hipaa') {
     // This fails type checking
   }
   
   // AFTER
   if (this.context.complianceFramework === 'fedramp-high' || 
       this.context.complianceFramework === 'hipaa' ||
       this.context.complianceFramework === 'pci-dss') {
     // Works with string type
   }
   ```

2. **Use risk-based flags instead of framework checks:**
   ```typescript
   // RECOMMENDED: Use highRiskEnvironment flag
   const isHighRisk = this.config?.highRiskEnvironment ?? false;
   if (isHighRisk) {
     // Apply enhanced security defaults
   }
   ```

### Phase 3: Update Documentation

1. Document supported frameworks (informational, not restrictive):
   - `commercial` - Standard commercial deployment
   - `fedramp-moderate` - FedRAMP Moderate baseline
   - `fedramp-high` - FedRAMP High baseline
   - Custom frameworks allowed (e.g., `hipaa`, `sox`, `pci-dss`)

2. Add guidance for custom frameworks:
   - How to configure framework-specific defaults
   - How to use `highRiskEnvironment` flag for enhanced security
   - How to extend validators for custom frameworks

## Implementation Plan

### Step 1: Update Core Types
- [ ] Change `ComponentContext.complianceFramework` from enum to `string`
- [ ] Update all usages in `@shinobi/core`
- [ ] Fix type errors in validators

### Step 2: Update All Components
- [ ] Remove enum type checks in component code (already done per component standards)
- [ ] Update validators to use string comparisons
- [ ] Migrate to risk-based configuration flags where possible

### Step 3: Update Tests
- [ ] Update test fixtures to use string values
- [ ] Add tests for custom framework values
- [ ] Verify backward compatibility

### Step 4: Documentation
- [ ] Update Platform Configuration Standard
- [ ] Update component standards documentation
- [ ] Add migration guide for consumers

## Breaking Changes

**YES** - This is a breaking change:
- Type changes from `'commercial' | 'fedramp-moderate' | 'fedramp-high'` to `string`
- Consumers using TypeScript will see type errors if they were relying on enum values
- Runtime behavior unchanged (frameworks were already strings at runtime)

## Migration Path

1. **Immediate**: Consumers can use `as string` type assertion for custom frameworks
2. **Short-term**: Update core types, consumers update TypeScript code
3. **Long-term**: Full migration to risk-based configuration flags

## Acceptance Criteria

- [ ] `ComponentContext.complianceFramework` is typed as `string`
- [ ] All validators accept any string value
- [ ] TypeScript compilation succeeds with custom framework values
- [ ] Existing framework values (`commercial`, `fedramp-moderate`, `fedramp-high`) still work
- [ ] Custom frameworks (e.g., `hipaa`, `sox`) work without type errors
- [ ] Documentation updated with guidance for custom frameworks
- [ ] All tests pass

## Related Issues

- Component Standards: Risk-based configuration (not framework-dependent)
- ConfigBuilder: Use `highRiskEnvironment` flag instead of framework checks
- Validators: Remove enum restrictions, use string comparisons

## References

- Platform Configuration Standard: Risk-based defaults
- Component Standards: No compliance framework checks in component code
- ConfigBuilder Pattern: Use flags like `highRiskEnvironment` instead of framework checks

