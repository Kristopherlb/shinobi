# Scripts Directory Analysis

This document describes each script and whether it should be converted to a skill.

## Current Scripts

### 1. `capture-baseline.sh`
**Purpose**: Captures a comprehensive baseline snapshot of the workspace state
- Build/test/typecheck results
- Dependency graphs
- Package metadata
- Project structure
- Environment information (git, node, pnpm, nx versions)

**Current Usage**: Manual execution to create regression testing baselines

**Should be a Skill?**: ✅ **YES** - `baseline-regression-detector`
- **Reason**: Regression detection is a reusable pattern that agents should understand
- **Skill Benefits**: 
  - Agents can guide baseline capture at appropriate times
  - Can trigger baseline capture after major changes
  - Understands when baselines are needed for comparison
- **Keep as Script?**: Yes, keep executable script for direct use, but skill provides guidance

### 2. `compare-to-baseline.sh`
**Purpose**: Compares current workspace state against a captured baseline
- Detects regressions (increased failures)
- Detects improvements (decreased failures)
- Generates comparison reports
- Exits with appropriate codes for CI/CD

**Current Usage**: Manual execution or CI/CD integration for regression detection

**Should be a Skill?**: ✅ **YES** - Part of `baseline-regression-detector`
- **Reason**: Regression detection workflow needs both capture and comparison
- **Skill Benefits**:
  - Agents can suggest baseline comparisons
  - Can analyze regression reports
  - Understands regression patterns and impacts
- **Keep as Script?**: Yes, keep executable script for CI/CD, skill provides intelligence

### 3. `check-deps.mjs`
**Purpose**: Pre-flight check for required system dependencies
- Checks ripgrep (`rg`)
- Checks Node.js (`node`)
- Checks pnpm package manager
- Provides clear error messages if missing

**Current Usage**: Pre-requisite check before running platform audits

**Should be a Skill?**: ❌ **NO** - Keep as utility script
- **Reason**: Simple dependency check doesn't need AI guidance
- **Keep as Script**: ✅ Yes - Fast, deterministic, direct execution
- **Note**: Could be referenced by skills that need dependency validation

### 4. `fix-nx-run-commands-cwd.mjs`
**Purpose**: Automated fix for nx:run-commands targets
- Adds missing `cwd` configuration
- Replaces `pnpm exec tsc` with `node_modules/.bin/tsc`
- Fixes all component project.json files

**Current Usage**: One-time fix (already executed) but could be used for validation

**Should be a Skill?**: ⚠️ **MAYBE** - `build-config-validator`
- **Reason**: Validation mode could check if build configs are correct
- **Skill Benefits**:
  - Can validate build configurations
  - Can detect and suggest fixes for build issues
  - Understands build configuration patterns
- **Keep as Script?**: Yes, keep for batch fixing, skill for validation/guidance
- **Enhancement**: Add `--validate` mode that checks without modifying

## Recommendations

### Create New Skill: `baseline-regression-detector`

**Skill Purpose**: Guides baseline capture and regression detection workflows

**Key Capabilities**:
1. **Baseline Capture Guidance**
   - When to capture baselines (after major refactors, before large changes)
   - What to include in baselines
   - How to name and organize baselines

2. **Regression Detection**
   - Comparing current state vs baseline
   - Identifying regressions and improvements
   - Analyzing regression patterns
   - Suggesting remediation strategies

3. **Integration Patterns**
   - CI/CD integration guidance
   - Pre-commit baseline checks
   - Post-merge regression monitoring

**Scripts to Reference**:
- `scripts/capture-baseline.sh` - For actual baseline capture
- `scripts/compare-to-baseline.sh` - For regression detection

**Example Usage**:
```
Agent: "After refactoring component X, should we capture a baseline?"
Skill: [Guides baseline capture, runs capture-baseline.sh, explains results]

Agent: "Are there any regressions since the last baseline?"
Skill: [Runs compare-to-baseline.sh, analyzes results, highlights regressions]
```

### Enhance `fix-nx-run-commands-cwd.mjs`

**Add Validation Mode**:
```bash
# Current: Fix mode (modifies files)
node scripts/fix-nx-run-commands-cwd.mjs

# Proposed: Validate mode (checks without modifying)
node scripts/fix-nx-run-commands-cwd.mjs --validate
```

**Potential Skill**: `build-config-validator`
- Validates build configurations follow best practices
- Checks for missing `cwd`, incorrect paths, etc.
- Suggests fixes without modifying files (in advisory mode)

### Keep as Scripts (No Skill Needed)

1. **`check-deps.mjs`** - Simple utility, no AI guidance needed
2. **Direct execution scripts** - Keep executable for CI/CD and manual use

## Summary

| Script | Purpose | Skill? | Recommendation |
|--------|---------|--------|----------------|
| `capture-baseline.sh` | Baseline snapshot | ✅ Yes | Create `baseline-regression-detector` skill |
| `compare-to-baseline.sh` | Regression detection | ✅ Yes | Part of `baseline-regression-detector` |
| `check-deps.mjs` | Dependency check | ❌ No | Keep as utility script |
| `fix-nx-run-commands-cwd.mjs` | Build config fix | ⚠️ Maybe | Add validation mode, consider `build-config-validator` skill |

## Next Steps

1. Create `skills/baseline-regression-detector/` skill
2. Add `--validate` mode to `fix-nx-run-commands-cwd.mjs`
3. Document script purposes and usage patterns
4. Keep scripts as executable tools while skills provide guidance

