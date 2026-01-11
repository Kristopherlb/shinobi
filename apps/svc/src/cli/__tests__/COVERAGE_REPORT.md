# CLI Test Coverage Report

**Report Date:** 2025-01-15  
**Test Framework:** Vitest  
**Coverage Provider:** v8  
**Coverage Report Location:** `apps/svc/coverage/`

---

## Executive Summary

**Overall Coverage:** 71.53% statements, 59.15% branches, 79.72% functions, 73.2% lines

### Coverage by Directory

| Directory | Statements | Branches | Functions | Lines |
|-----------|------------|----------|-----------|-------|
| **cli/** | 70.15% (355/506) | 59.28% (249/420) | 79.66% (47/59) | 71.71% (355/495) |
| **cli/utils/** | 76.15% (115/151) | 58.58% (58/99) | 80% (12/15) | 78.23% (115/147) |

---

## File-by-File Coverage Analysis

### Command Files (High Priority)

| File | Statements | Branches | Functions | Lines | Status |
|------|------------|----------|-----------|-------|--------|
| `destroy-command.ts` | 77.63% (59/76) | 61.64% (45/73) | **100%** (8/8) ✅ | 78.66% (59/75) | ⚠️ Medium |
| `diff-command.ts` | **49.26%** (67/136) ❌ | **45.16%** (42/93) ❌ | **41.17%** (7/17) ❌ | **51.14%** (67/131) ❌ | ❌ **LOW** |
| `execution-context-manager.ts` | **91.22%** (52/57) ✅ | 68.62% (35/51) | **100%** (9/9) ✅ | **92.85%** (52/56) ✅ | ✅ **HIGH** |
| `synth-command.ts` | 63.73% (58/91) | 68.85% (42/61) | 77.77% (7/9) | 65.16% (58/89) | ⚠️ Medium |
| `up-command.ts` | 75.28% (67/89) | **53.01%** (44/83) ⚠️ | **100%** (9/9) ✅ | 76.13% (67/88) | ⚠️ Medium |
| `validate-command.ts` | **91.22%** (52/57) ✅ | 69.49% (41/59) | **100%** (7/7) ✅ | **92.85%** (52/56) ✅ | ✅ **HIGH** |
| `plan-command.ts` | ❓ Not in report | ❓ | ❓ | ❓ | ⚠️ **MISSING** |
| `catalog.ts` | ❓ Not in report | ❓ | ❓ | ❓ | ⚠️ **MISSING** |

### Utility Files

| File | Statements | Branches | Functions | Lines | Status |
|------|------------|----------|-----------|-------|--------|
| `utils/repo-root.ts` | **100%** (47/47) ✅ | **100%** (16/16) ✅ | **100%** (5/5) ✅ | **100%** (47/47) ✅ | ✅ **PERFECT** |
| `utils/template-diff.ts` | **100%** (104/104) ✅ | **100%** (30/30) ✅ | **100%** (10/10) ✅ | **100%** (104/104) ✅ | ✅ **PERFECT** |
| `utils/component-catalog.ts` | ❓ Not in report | ❓ | ❓ | ❓ | ⚠️ **MISSING** |
| `utils/component-loader.ts` | ❓ Not in report | ❓ | ❓ | ❓ | ⚠️ **MISSING** |
| `utils/file-discovery.ts` | ❓ Not in report | ❓ | ❓ | ❓ | ⚠️ **MISSING** |
| `utils/file-utils.ts` | ❓ Not in report | ❓ | ❓ | ❓ | ⚠️ **MISSING** |
| `utils/service-synthesizer.ts` | ❓ Not in report | ❓ | ❓ | ❓ | ⚠️ **MISSING** |

### Core Files

| File | Statements | Branches | Functions | Lines | Status |
|------|------------|----------|-----------|-------|--------|
| `console-logger.ts` | ❓ Not in report | ❓ | ❓ | ❓ | ⚠️ **MISSING** |
| `composition-root.ts` | ❓ Not in report | ❓ | ❓ | ❓ | ⚠️ **MISSING** |
| `cli.ts` | ❓ Not in report | ❓ | ❓ | ❓ | ⚠️ **MISSING** |
| `index.ts` | ❓ Not in report | ❓ | ❓ | ❓ | ⚠️ **MISSING** |

---

## Coverage Gaps Analysis

### Critical Gaps (Must Fix)

1. **`diff-command.ts`** - **49.26% statements, 45.16% branches, 41.17% functions**
   - **Priority:** P0 (Critical)
   - **Issue:** Lowest coverage in the codebase
   - **Missing Coverage:**
     - Error handling paths
     - Edge cases for template comparison
     - CloudFormation API error scenarios
   - **Recommendation:** Add tests for error paths, edge cases, and failure scenarios

2. **`synth-command.ts`** - 63.73% statements, 65.16% lines
   - **Priority:** P1 (High)
   - **Missing Coverage:**
     - Error handling for synthesis failures
     - Edge cases in manifest path resolution
     - Account ID validation edge cases
   - **Recommendation:** Add tests for error paths and edge cases

3. **`up-command.ts`** - 75.28% statements, 53.01% branches
   - **Priority:** P1 (High)
   - **Missing Coverage:**
     - Branch coverage is low (53.01%)
     - Error handling paths
     - Deployment failure scenarios
   - **Recommendation:** Add tests for conditional branches and error paths

### Missing Files (Not in Coverage Report)

The following files are **not included** in the coverage report, indicating they may not be tested:

1. **`plan-command.ts`** - ⚠️ **MISSING**
   - **Priority:** P0 (Critical)
   - **Issue:** Core command not covered
   - **Recommendation:** Add comprehensive tests

2. **`catalog.ts`** - ⚠️ **MISSING**
   - **Priority:** P1 (High)
   - **Issue:** Catalog command not covered
   - **Recommendation:** Add tests (note: `catalog.test.ts` exists but may not be executing)

3. **`console-logger.ts`** - ⚠️ **MISSING**
   - **Priority:** P0 (Critical)
   - **Issue:** Core logger not covered (despite `console-logger.test.ts` existing)
   - **Recommendation:** Verify test execution and coverage collection

4. **`composition-root.ts`** - ⚠️ **MISSING**
   - **Priority:** P0 (Critical)
   - **Issue:** Core DI pattern not covered (despite `composition-root.test.ts` existing)
   - **Recommendation:** Verify test execution and coverage collection

5. **Utility Files:**
   - `utils/component-catalog.ts` - ⚠️ **MISSING**
   - `utils/component-loader.ts` - ⚠️ **MISSING**
   - `utils/file-discovery.ts` - ⚠️ **MISSING**
   - `utils/file-utils.ts` - ⚠️ **MISSING**
   - `utils/service-synthesizer.ts` - ⚠️ **MISSING**

6. **Entry Points:**
   - `cli.ts` - ⚠️ **MISSING**
   - `index.ts` - ⚠️ **MISSING**

---

## Coverage Quality Metrics

### Strengths ✅

1. **Perfect Coverage:**
   - `utils/repo-root.ts` - 100% across all metrics
   - `utils/template-diff.ts` - 100% across all metrics

2. **High Coverage:**
   - `execution-context-manager.ts` - 91.22% statements, 92.85% lines, 100% functions
   - `validate-command.ts` - 91.22% statements, 92.85% lines, 100% functions

3. **Function Coverage:**
   - Many files achieve 100% function coverage (destroy, execution-context-manager, up, validate)

### Weaknesses ❌

1. **Low Branch Coverage:**
   - Overall: 59.15% (below 80% target)
   - `diff-command.ts`: 45.16% (critical)
   - `up-command.ts`: 53.01% (needs improvement)

2. **Missing Files:**
   - Several core files not appearing in coverage report
   - May indicate test execution issues or coverage collection problems

3. **Statement Coverage:**
   - Overall: 71.53% (below 90% target)
   - `diff-command.ts`: 49.26% (critical)

---

## Recommendations

### Immediate Actions (P0)

1. **Fix `diff-command.ts` coverage** - Add tests for:
   - Error handling paths
   - CloudFormation API failures
   - Template comparison edge cases
   - Missing stack scenarios

2. **Investigate missing files** - Verify why these files don't appear in coverage:
   - `plan-command.ts` (tests exist but not covered)
   - `catalog.ts` (tests exist but not covered)
   - `console-logger.ts` (tests exist but not covered)
   - `composition-root.ts` (tests exist but not covered)

3. **Verify coverage collection** - Check `vitest.config.ts` coverage settings:
   - Ensure all CLI files are included
   - Verify coverage provider is working correctly
   - Check if files are being excluded incorrectly

### High Priority (P1)

4. **Improve branch coverage** - Target: 80%+
   - Add tests for conditional branches in `up-command.ts`
   - Add tests for error paths in `synth-command.ts`
   - Add tests for edge cases in `destroy-command.ts`

5. **Add missing utility tests:**
   - `utils/component-catalog.ts`
   - `utils/component-loader.ts`
   - `utils/file-discovery.ts`
   - `utils/file-utils.ts`
   - `utils/service-synthesizer.ts`

### Medium Priority (P2)

6. **Improve overall coverage** - Target: 90% statements, 80% branches
   - Focus on error handling paths
   - Add edge case tests
   - Add negative test cases

7. **Add integration tests** - For:
   - End-to-end command execution
   - Real file system operations
   - Error recovery scenarios

---

## Coverage Targets

| Metric | Current | Target | Gap |
|--------|---------|--------|-----|
| **Statements** | 71.53% | 90% | -18.47% |
| **Branches** | 59.15% | 80% | -20.85% |
| **Functions** | 79.72% | 90% | -10.28% |
| **Lines** | 73.2% | 90% | -16.8% |

---

## Test Execution Summary

**Total Test Files:** 12  
**Total Test Cases:** ~91  
**Test Framework:** Vitest  
**Coverage Provider:** v8  
**Coverage Report Format:** HTML, JSON, LCOV

### Test Files Coverage

All test files are compliant with Platform Testing Standard (PTS-1.0):
- ✅ All 12 test files have metadata sidecars
- ✅ All tests follow `Feature__Condition__ExpectedOutcome` naming convention
- ✅ All tests use single oracle (exact assertions)
- ✅ All tests documented with proper metadata

---

## Next Steps

1. **Run coverage analysis** to identify specific uncovered lines:
   ```bash
   pnpm nx test @shinobi/cli --coverage
   open apps/svc/coverage/lcov-report/index.html
   ```

2. **Investigate missing files** - Check why core files don't appear in coverage report

3. **Add missing tests** - Focus on `diff-command.ts` and other low-coverage files

4. **Improve branch coverage** - Add tests for conditional logic and error paths

5. **Set up coverage thresholds** - Add to `vitest.config.ts`:
   ```typescript
   coverage: {
     thresholds: {
       statements: 90,
       branches: 80,
       functions: 90,
       lines: 90
     }
   }
   ```

---

*This report was generated from Vitest coverage data collected on 2025-01-15.*

