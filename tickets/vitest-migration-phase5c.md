# Phase 5c: Migrate to Vitest for Native Workspace Resolution

**Ticket ID:** PHASE5C-VITEST-MIGRATION  
**Priority:** Medium  
**Status:** Planned  
**Created:** 2026-01-06  
**Related:** Phase 5 Migration Plan, `docs/testing-workspace-resolution.md`

## 🎯 Objective

Migrate the test infrastructure from Jest to Vitest to enable native workspace package resolution support, removing the need for temporary `moduleNameMapper` workarounds.

## 📋 Background

### Current State
- All workspace packages have proper `package.json` exports with `development` condition (Phase 5a ✅)
- Jest doesn't natively support the `development` condition in exports
- Temporary `moduleNameMapper` workaround exists in `jest.preset.mjs` (clearly marked as temporary)
- Tests work but rely on non-standard resolution mechanism

### Problem
- Jest cannot resolve workspace packages via `package.json` exports
- Requires `moduleNameMapper` workarounds that violate Phase 5 principles
- Tests use different resolution than runtime/build
- Slower test execution compared to Vitest

### Solution
- Migrate to Vitest which natively supports:
  - `workspace:*` protocol
  - `package.json` exports including `development` condition
  - ESM modules
  - Project References
  - Faster test execution

## ✅ Success Criteria

- [ ] All test suites running on Vitest
- [ ] No `moduleNameMapper` entries for workspace packages
- [ ] Tests resolve packages via `package.json` exports (same as runtime)
- [ ] Test execution time improved (target: 20-30% faster)
- [ ] All existing tests pass without modification
- [ ] CI/CD pipeline updated
- [ ] Documentation updated

## 📝 Implementation Plan

### Phase 1: Setup & Configuration (2-3 days)

1. **Install Vitest and Nx Integration**
   ```bash
   pnpm add -D vitest @nx/vite
   ```

2. **Create Vitest Configuration**
   - Create `vitest.config.ts` at root
   - Configure workspace resolution
   - Set up ESM support
   - Configure test environment

3. **Update Nx Project Configurations**
   - Update `project.json` files to use `@nx/vite:test` executor
   - Remove Jest-specific configurations
   - Verify test targets work

### Phase 2: Migration (1-2 weeks)

1. **Migrate Core Package**
   - Update `packages/core` to use Vitest
   - Remove Jest config
   - Verify all tests pass
   - Remove `moduleNameMapper` workaround

2. **Migrate Component Packages**
   - Migrate packages one by one or in batches
   - Update test configurations
   - Remove Jest-specific mocks/setup if needed
   - Verify tests pass

3. **Migrate Application Packages**
   - Update `apps/svc` and other apps
   - Update integration tests
   - Verify end-to-end test flow

### Phase 3: Cleanup & Optimization (2-3 days)

1. **Remove Jest Dependencies**
   - Remove `jest`, `@nx/jest`, `ts-jest` from package.json
   - Remove Jest config files
   - Clean up unused test utilities

2. **Update Documentation**
   - Update `docs/testing-workspace-resolution.md`
   - Remove temporary workaround notes
   - Add Vitest-specific guidance
   - Update README files

3. **Performance Validation**
   - Measure test execution time
   - Compare with previous Jest baseline
   - Document improvements

## 🔧 Technical Details

### Vitest Configuration Example

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';

export default defineConfig({
  plugins: [nxViteTsPaths()],
  test: {
    globals: true,
    environment: 'node',
    include: ['**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
  resolve: {
    // Vitest natively respects package.json exports
    // No moduleNameMapper needed!
  },
});
```

### Key Benefits

1. **Native Workspace Support**
   - Automatically resolves `workspace:*` protocol
   - Respects `package.json` exports including `development` condition
   - No custom resolvers needed

2. **Performance**
   - Faster test execution (typically 20-30% improvement)
   - Better parallelization
   - Faster watch mode

3. **Developer Experience**
   - Better error messages
   - Improved TypeScript support
   - Better IDE integration

4. **Standards Compliance**
   - Aligns with Phase 5 principles
   - Isomorphic test/runtime resolution
   - True package boundaries

## 📚 References

- [Vitest Documentation](https://vitest.dev/)
- [Nx + Vitest Integration](https://nx.dev/nx-api/vite)
- [Phase 5 Migration Plan](./docs/typescript_project_references_migration.md)
- [Testing Workspace Resolution Guide](./docs/testing-workspace-resolution.md)

## 🚧 Risks & Mitigation

### Risk: Test Compatibility Issues
- **Mitigation**: Migrate incrementally, keep Jest as fallback during transition
- **Impact**: Low - Vitest has high Jest compatibility

### Risk: CI/CD Pipeline Changes
- **Mitigation**: Update CI configs in parallel, test thoroughly
- **Impact**: Medium - Requires coordination

### Risk: Team Learning Curve
- **Mitigation**: Vitest API is very similar to Jest, minimal learning needed
- **Impact**: Low - Most developers already familiar with similar tools

## 📊 Metrics

### Before (Jest)
- Average test suite execution: ~2-3 minutes (full suite)
- Workspace resolution: Via `moduleNameMapper` workaround
- ESM support: Partial (requires configuration)

### After (Vitest) - Target
- Average test suite execution: ~1.5-2 minutes (full suite) - 20-30% faster
- Workspace resolution: Native via `package.json` exports
- ESM support: Full native support

## 🔗 Related Tickets

- Phase 5a: Add `exports` to all workspace packages ✅ (Complete)
- Phase 5b: Remove `moduleNameMapper` entries (Blocked by this ticket)

## 📝 Notes

- This migration is the final step in Phase 5 testing infrastructure modernization
- The temporary `moduleNameMapper` workaround in `jest.preset.mjs` will be removed upon completion
- All packages already have proper `exports` fields, so migration should be straightforward
- Consider doing a proof-of-concept with one package first to validate approach

---

**Next Steps:**
1. Review and approve this ticket
2. Create proof-of-concept branch
3. Migrate `packages/core` as pilot
4. Plan full migration timeline

