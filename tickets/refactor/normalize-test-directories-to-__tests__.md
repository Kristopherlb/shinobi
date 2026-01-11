# Normalize Test Directories to `__tests__/`

**Ticket Type:** Refactor  
**Priority:** Medium  
**Status:** Open  
**Created:** 2025-01-15  
**Assignee:** TBD

## Summary

Normalize all test directories from `tests/` to `__tests__/` across the codebase to follow JavaScript/TypeScript conventions and improve consistency. This affects:

- `packages/core/src/services/tests/` → `packages/core/src/services/__tests__/`
- `packages/components/*/tests/` → `packages/components/*/__tests__/`

## Background

The codebase currently has a mixed approach to test directory naming:
- Some areas use `__tests__/` (binders, some core services, CLI)
- Many components use `tests/` (165+ test files found)
- This inconsistency makes it harder to locate tests and violates the principle of least surprise

The `__tests__/` convention is widely recognized in the JavaScript/TypeScript ecosystem (Jest, Vitest default behavior) and aligns with common tooling expectations.

## Scope

### Directories to Rename

1. **Core Services:**
   - `packages/core/src/services/tests/` → `packages/core/src/services/__tests__/`
   - Contains: `schema-validator.test.ts`, `manifest-schema-composer.test.ts`, `test-metadata-validator.ts`, etc.

2. **Component Tests:**
   - All `packages/components/*/tests/` directories → `packages/components/*/__tests__/`
   - Estimated: 50+ component packages with `tests/` directories
   - Includes subdirectories like `tests/security/`, `tests/unit/`

### Files Requiring Updates

1. **TypeScript Configuration Files:**
   - Update `tsconfig.json` files that exclude `tests/**/*` to exclude `__tests__/**/*`
   - Example: `packages/components/ecs-fargate-service/tsconfig.json` (line 17)
   - Search pattern: `"tests/**/*"` → `"__tests__/**/*"`

2. **Vitest Configuration Files:**
   - Verify `vitest.config.ts` files work with `__tests__/` (should already work with glob patterns)
   - Current pattern: `**/*.{test,spec}.{ts,tsx}` (works with any directory)

3. **Project Configuration Files:**
   - Check `project.json` files for test path references
   - Check `package.json` files for test script paths (if any)

4. **Import Statements:**
   - Update any relative imports that reference `../tests/` or `./tests/`
   - Search pattern: `from ['"].*tests/` → `from ['"].*__tests__/`

5. **Documentation:**
   - Update any README files that reference `tests/` directories
   - Update component standards documentation if it mentions test directory structure

## Implementation Plan

### Phase 1: Discovery & Inventory

1. **Generate comprehensive list of directories to rename:**
   ```bash
   find packages/core/src/services packages/components -type d -name "tests" | sort
   ```

2. **Find all references to `tests/` in configuration files:**
   ```bash
   grep -r "tests/" packages --include="*.json" --include="*.ts" --include="*.md" | grep -v node_modules | grep -v dist
   ```

3. **Identify import statements referencing `tests/`:**
   ```bash
   grep -r "from ['\"].*tests/" packages --include="*.ts" | grep -v node_modules | grep -v dist
   ```

### Phase 2: Automated Rename

1. **Rename directories:**
   ```bash
   # For each directory found in Phase 1
   find packages/core/src/services packages/components -type d -name "tests" -exec sh -c 'mv "$1" "$(dirname "$1")/__tests__"' _ {} \;
   ```

   **OR** use a more controlled approach:
   ```bash
   # Core services
   mv packages/core/src/services/tests packages/core/src/services/__tests__
   
   # Components (one at a time for safety)
   for dir in packages/components/*/tests; do
     if [ -d "$dir" ]; then
       mv "$dir" "$(dirname "$dir")/__tests__"
     fi
   done
   ```

### Phase 3: Update Configuration Files

1. **Update tsconfig.json files:**
   ```bash
   find packages -name "tsconfig.json" -exec sed -i '' 's|"tests/\*\*/\*"|"__tests__/**/*"|g' {} \;
   ```

2. **Update tsconfig.spec.json files (if any):**
   ```bash
   find packages -name "tsconfig.spec.json" -exec sed -i '' 's|tests/|__tests__/|g' {} \;
   ```

3. **Verify vitest.config.ts files:**
   - Current glob patterns should already work: `**/*.{test,spec}.{ts,tsx}`
   - No changes needed unless specific paths are hardcoded

### Phase 4: Update Import Statements

1. **Find and update relative imports:**
   ```bash
   # Find imports
   grep -r "from ['\"].*tests/" packages --include="*.ts" | grep -v node_modules | grep -v dist
   
   # Update (manual review recommended)
   find packages -name "*.ts" -exec sed -i '' 's|from ['"'"'"].*tests/|from '"'"'"'"'"'"'__tests__/|g' {} \;
   ```

   **Note:** Manual review recommended for import updates to ensure correctness.

### Phase 5: Update Documentation

1. **Search for documentation references:**
   ```bash
   grep -r "tests/" docs --include="*.md" | grep -v node_modules
   grep -r "tests/" packages --include="*.md" | grep -v node_modules
   ```

2. **Update component standards documentation:**
   - `docs/platform-standards/platform-testing-standard.md` (if it references directory structure)
   - Component README files
   - Any architecture documentation

### Phase 6: Verification

1. **Run tests to ensure nothing broke:**
   ```bash
   pnpm test
   ```

2. **Verify TypeScript compilation:**
   ```bash
   pnpm build
   ```

3. **Check for any remaining references:**
   ```bash
   grep -r "tests/" packages --include="*.ts" --include="*.json" | grep -v node_modules | grep -v dist | grep -v ".test.ts" | grep -v ".spec.ts"
   ```

## Testing Strategy

1. **Before starting:** Create a backup branch
2. **After each phase:** Run tests to catch issues early
3. **Final verification:**
   - All tests pass
   - TypeScript compilation succeeds
   - No broken imports
   - CI/CD pipeline passes

## Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Broken imports | High | Careful review of import statements, run tests after each phase |
| CI/CD failures | Medium | Test locally first, verify in CI before merging |
| Missed references | Low | Comprehensive grep searches, final verification step |
| Git history loss | Low | Git tracks renames, history preserved |

## Acceptance Criteria

- [ ] All `tests/` directories renamed to `__tests__/`
- [ ] All `tsconfig.json` files updated to exclude `__tests__/**/*`
- [ ] All import statements updated (if any)
- [ ] All documentation updated
- [ ] All tests pass (`pnpm test`)
- [ ] TypeScript compilation succeeds (`pnpm build`)
- [ ] No remaining references to `tests/` directory in codebase (excluding test file names)
- [ ] CI/CD pipeline passes

## Related Files

- `packages/core/src/services/tests/` - Core services tests
- `packages/components/*/tests/` - Component tests (50+ packages)
- `packages/components/*/tsconfig.json` - TypeScript configs to update
- `docs/platform-standards/platform-testing-standard.md` - Documentation to update

## Notes

- Vitest already uses glob patterns that work with any directory name
- Git will track renames, preserving history
- Some areas already use `__tests__/` (binders, CLI) - this aligns with those
- Consider adding a lint rule to prevent future `tests/` directories

## Future Enhancements

- Add ESLint rule to enforce `__tests__/` directory naming
- Update component generator to create `__tests__/` by default
- Add pre-commit hook to check for `tests/` directories


