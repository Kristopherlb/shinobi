# CLI File Path Resolution and --yes Flag Issues

**Status:** 🔴 Open  
**Priority:** P1 - High  
**Component:** `@shinobi/cli`  
**Created:** 2025-01-06  
**Reporter:** User via terminal error

## Summary

Two bugs identified in the `shinobi up` command:
1. **File path resolution fails** when `--file` is provided with a relative path - resolves relative to CLI package directory instead of workspace root
2. **`--yes` flag may not be working** correctly (needs verification)

## Bug 1: File Path Resolution Issue

### Description

When running `shinobi up --file apps/sample-api/service.yml` from the workspace root, the CLI attempts to resolve the path relative to the current working directory (`apps/svc`), resulting in an incorrect path:

**Expected:** `/Users/kristopherbowles/project42/shinobi/apps/sample-api/service.yml`  
**Actual:** `/Users/kristopherbowles/project42/shinobi/apps/svc/apps/sample-api/service.yml`

### Error Message

```
Error: ENOENT: no such file or directory, open '/Users/kristopherbowles/project42/shinobi/apps/svc/apps/sample-api/service.yml'
```

### Root Cause

In `apps/svc/src/cli/up-command.ts:78`, the code uses:

```typescript
const manifestPath = options.file
  ? path.resolve(options.file)
  : await this.dependencies.fileDiscovery.findManifest('.');
```

`path.resolve()` resolves relative to `process.cwd()`, which is `apps/svc` when the command runs via `pnpm shinobi up`. The path should be resolved relative to the workspace root instead.

### Affected Code

- **File:** `apps/svc/src/cli/up-command.ts`
- **Line:** 78
- **Method:** `UpCommand.execute()`

### Proposed Fix

Resolve the file path relative to the workspace root, not the current working directory. Options:

1. **Use workspace root detection** (similar to `synth-command.ts`):
   ```typescript
   import { findRepoRoot } from './utils/repo-root.js';
   
   const manifestPath = options.file
     ? path.resolve(await findRepoRoot(process.cwd()), options.file)
     : await this.dependencies.fileDiscovery.findManifest('.');
   ```

2. **Resolve relative to process.cwd() if absolute, otherwise resolve from workspace root**:
   ```typescript
   const manifestPath = options.file
     ? path.isAbsolute(options.file)
       ? options.file
       : path.resolve(await findRepoRoot(process.cwd()), options.file)
     : await this.dependencies.fileDiscovery.findManifest('.');
   ```

### Related Files

- `apps/svc/src/cli/utils/repo-root.ts` - Contains `findRepoRoot()` utility
- `apps/svc/src/cli/synth-command.ts:85-104` - Example of proper path resolution
- `apps/svc/src/cli/validate-command.ts:57` - Similar pattern that may have same issue
- `apps/svc/src/cli/destroy-command.ts:76` - Similar pattern that may have same issue
- `apps/svc/src/cli/diff-command.ts:112` - Similar pattern that may have same issue

### Verification Steps

1. From workspace root, run: `pnpm shinobi up --file apps/sample-api/service.yml --env dev --yes`
2. Verify the file is found and deployment proceeds
3. Test with absolute path: `pnpm shinobi up --file /absolute/path/to/service.yml --yes`
4. Test with relative path from subdirectory
5. Verify other commands (`validate`, `destroy`, `diff`) if they have similar issues

---

## Bug 2: --yes Flag Not Working

### Description

User reports that `--yes` flag does not work as expected. Needs investigation to determine if:
- Flag is not being parsed correctly by Commander.js
- Flag is being parsed but not passed through correctly
- Flag works but user expectation differs

### Current Implementation

**File:** `apps/svc/src/cli/commands/up.ts:32`
```typescript
.option('--yes', 'Skip interactive confirmation prompt')
```

**File:** `apps/svc/src/cli/up-command.ts:146`
```typescript
if (!options.yes) {
  // Show interactive prompt
}
```

### Comparison with Other Commands

**File:** `apps/svc/src/cli/commands/destroy.ts:32`
```typescript
.option('-y, --yes', 'Skip interactive confirmation prompt')
```

Note: `destroy` command uses both `-y` and `--yes`, while `up` command only uses `--yes`.

### Investigation Needed

1. Verify Commander.js is parsing `--yes` correctly
2. Check if `options.yes` is `true` when flag is provided
3. Verify flag is passed through from `up.ts` to `up-command.ts`
4. Test with both `--yes` and `-y` (if we add short form)
5. Check if there are any Commander.js version-specific issues

### Proposed Fix

1. **Add short form alias** (consistent with `destroy` command):
   ```typescript
   .option('-y, --yes', 'Skip interactive confirmation prompt')
   ```

2. **Add debug logging** to verify flag parsing:
   ```typescript
   // In up-command.ts execute() method
   logger.debug(`--yes flag value: ${options.yes}`);
   ```

3. **Ensure boolean parsing** - Commander.js should handle this automatically, but verify

### Verification Steps

1. Run: `pnpm shinobi up --file apps/sample-api/service.yml --env dev --yes`
2. Verify no interactive prompt appears
3. Run without `--yes`: `pnpm shinobi up --file apps/sample-api/service.yml --env dev`
4. Verify interactive prompt appears
5. Test with `-y` if we add short form alias

---

## Impact

- **Severity:** High - Blocks deployments when using `--file` with relative paths
- **User Impact:** Users cannot deploy services using relative manifest paths from workspace root
- **Workaround:** Use absolute paths or `cd` into the directory containing `service.yml`

## Test Cases

### Test Case 1: Relative Path from Workspace Root
```bash
# From workspace root
pnpm shinobi up --file apps/sample-api/service.yml --env dev --yes
```
**Expected:** File found, deployment proceeds  
**Actual:** File not found error

### Test Case 2: Absolute Path
```bash
pnpm shinobi up --file /absolute/path/to/service.yml --env dev --yes
```
**Expected:** File found, deployment proceeds  
**Actual:** (Needs testing)

### Test Case 3: --yes Flag
```bash
pnpm shinobi up --file apps/sample-api/service.yml --env dev --yes
```
**Expected:** No interactive prompt  
**Actual:** (Needs verification)

## Related Issues

- May affect other commands: `validate`, `destroy`, `diff`, `synth`
- Similar path resolution patterns exist in multiple command files

## Notes

- User mentioned "that deployed" - suggesting they worked around the issue or it worked in some cases
- Error occurred when running via `pnpm shinobi up` wrapper, which may affect `process.cwd()`
- Consider standardizing path resolution across all CLI commands


