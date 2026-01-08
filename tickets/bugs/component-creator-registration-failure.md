# Component Creator Registration Failure

**Ticket ID:** BUG-COMPONENT-CREATOR-REG-001  
**Priority:** 🔴 **P0 - CRITICAL**  
**Status:** Open  
**Component:** `apps/svc/src/cli/utils/component-loader.ts`  
**Created:** 2026-01-07  
**Last Occurrence:** 2026-01-07 (multiple times same day)  
**Reporter:** System (from deployment failure)  
**Related Issues:** **RECURRING ISSUE** - Has been "fixed" multiple times but keeps resurfacing. Indicates systemic problem requiring architectural solution, not band-aid fixes.

## 🐛 Issue Summary

**RECURRING CRITICAL BUG:** Component creators are not being discovered/registered during service synthesis, causing failures with error: `No creators registered for component type(s): <component-type>`. This affects components that are not built (missing `dist/` directory) or when ts-node loader fails to resolve TypeScript source files correctly.

**⚠️ CRITICAL:** This issue has been "fixed" multiple times but continues to resurface, indicating that previous fixes were band-aids rather than addressing the root cause. This requires a systematic architectural solution, not another quick fix.

### Occurrence History
- **2026-01-07 (Multiple times):** Issue occurred during `sample-api` service synthesis with `iam-role` component
- **Previous occurrences:** Multiple instances where components weren't discovered despite being present
- **Pattern:** Issue manifests when:
  - Components are not built (`dist/` missing)
  - ts-node ESM module resolution fails
  - Component exports don't match discovery logic expectations

## 📋 Error Details

### Error Message
```
Error: No creators registered for component type(s): iam-role
    at synthesizeService (file:///Users/kristopherbowles/project42/shinobi/apps/svc/src/cli/utils/service-synthesizer.ts:58:15)
    at async SynthCommand.execute (file:///Users/kristopherbowles/project42/shinobi/apps/svc/src/cli/synth-command.ts:112:33)
```

### Affected Components
- `iam-role` (confirmed)
- Potentially any component that:
  - Is not built (`dist/index.js` missing)
  - Has TypeScript source files that ts-node cannot resolve
  - Exports creator as named export (not default export)

### Reproduction Steps
1. Create a new component or use an existing component (e.g., `iam-role`)
2. Ensure component is **not built** (no `dist/` directory)
3. Add component to `service.yml` manifest
4. Run `pnpm shinobi synth -f <service.yml>`
5. **Expected:** Synthesis succeeds
6. **Actual:** Error: `No creators registered for component type(s): <component-type>`

### Workaround
Build the component manually:
```bash
pnpm nx build @shinobi/components-<component-name>
```

## 🔍 Root Cause Analysis

### Problem Location
The issue occurs in `apps/svc/src/cli/utils/component-loader.ts`:

1. **Module Loading Logic** (lines 105-111):
   - Tries to load from TypeScript source files first (`src/index.ts`)
   - Falls back to compiled JavaScript (`dist/index.js`)
   - If both fail, component is skipped silently

2. **Creator Discovery Logic** (lines 186-200):
   ```typescript
   const findCreatorExport = (moduleExports: Record<string, any>): PlatformComponentCreator | undefined => {
     for (const exported of Object.values(moduleExports)) {
       if (typeof exported === 'function') {
         try {
           const instance = new exported();
           if (instance && typeof instance.createComponent === 'function' && typeof instance.componentType === 'string') {
             return instance as PlatformComponentCreator;
           }
         } catch {
           continue;
         }
       }
     }
     return undefined;
   };
   ```

### Root Causes

#### 1. **Silent Failure on Module Load**
- When `loadFirstResolvedModule()` fails to load a module, it returns `undefined`
- The code continues to the next component without logging why the load failed
- No error is thrown, so the user doesn't know the component wasn't discovered

#### 2. **ts-node Resolution Issues**
- ts-node may fail to resolve TypeScript modules correctly in some cases
- ESM module resolution with ts-node can be fragile
- No fallback or retry mechanism when ts-node fails

#### 3. **Named Export Discovery**
- Components export creators as **named exports**: `export { IamRoleComponentCreator }`
- `findCreatorExport()` iterates through `Object.values(moduleExports)` looking for functions
- If the module isn't loaded correctly, `moduleExports` may be empty or malformed
- No validation that the expected export name exists

#### 4. **No Build-Time Validation**
- Components can be added to manifests without being built
- No pre-flight check that components are buildable/discoverable
- No warning when components are missing from the registry

### Code Flow
```
loadComponentCreators()
  → For each component directory:
    → Try to load from src/index.ts (ts-node)
    → If fails, try dist/index.js
    → If both fail, skip silently (❌ PROBLEM)
    → findCreatorExport(moduleExports)
      → If moduleExports is undefined/empty, returns undefined
      → Component not registered
  → synthesizeService() checks registry
    → Throws error if component type not found
```

## 💡 Proposed Solutions

### Solution 1: Enhanced Error Logging (Quick Fix)
**Priority:** High  
**Effort:** Low

Add detailed logging when module loading fails:

```typescript
if (!moduleExports) {
  const triedPaths = [...sourceCandidates, ...distCandidates];
  const error = new Error(
    `Failed to load component creator for ${packageName}. ` +
    `Tried paths: ${triedPaths.join(', ')}. ` +
    `Component may need to be built: pnpm nx build ${packageName}`
  );
  if (options?.logger) {
    options.logger.error(error.message);
  } else {
    console.error(error.message);
  }
  // Still skip, but user knows why
  continue;
}
```

### Solution 2: Auto-Build Fallback (Medium Fix)
**Priority:** High  
**Effort:** Medium

Automatically build components when source files exist but dist is missing:

```typescript
if (!moduleExports && fs.existsSync(srcIndex)) {
  // Component has source but no dist - try building
  if (options?.autoBuild !== false) {
    try {
      await buildComponent(packageDir, rootDirCache);
      // Retry loading from dist
      moduleExports = await loadFirstResolvedModule(distCandidates, options?.logger);
    } catch (buildError) {
      logger.warn(`Failed to auto-build ${packageName}: ${buildError.message}`);
    }
  }
}
```

### Solution 3: Explicit Export Name Matching (Robust Fix)
**Priority:** Medium  
**Effort:** Medium

Instead of iterating through all exports, explicitly look for known creator export names:

```typescript
const findCreatorExport = (moduleExports: Record<string, any>, componentType: string): PlatformComponentCreator | undefined => {
  // Try common creator export names
  const creatorNames = [
    `${toPascalCase(componentType)}ComponentCreator`,
    `${toPascalCase(componentType)}Creator`,
    'Creator',
    'ComponentCreator'
  ];
  
  for (const name of creatorNames) {
    const exported = moduleExports[name];
    if (typeof exported === 'function') {
      try {
        const instance = new exported();
        if (instance && typeof instance.createComponent === 'function' && typeof instance.componentType === 'string') {
          return instance as PlatformComponentCreator;
        }
      } catch {
        continue;
      }
    }
  }
  
  // Fallback to current behavior
  return findCreatorExportLegacy(moduleExports);
};
```

### Solution 4: Pre-Flight Validation (Prevention)
**Priority:** Medium  
**Effort:** High

Add a validation step before synthesis that checks all components are discoverable:

```typescript
// In validate-command.ts or synth-command.ts
const validateComponentsDiscoverable = async (manifest: SimpleManifest): Promise<void> => {
  const creators = await loadComponentCreators({ includeNonProduction: true });
  const missing: string[] = [];
  
  for (const component of manifest.components) {
    if (!creators.has(component.type)) {
      missing.push(component.type);
    }
  }
  
  if (missing.length > 0) {
    throw new Error(
      `Components not discoverable: ${missing.join(', ')}. ` +
      `Ensure components are built: pnpm nx build @shinobi/components-<name>`
    );
  }
};
```

### Solution 5: Component Registry Manifest (Long-term)
**Priority:** Low  
**Effort:** High

Create a build-time manifest that lists all available components and their creators:

```json
// packages/components/.component-registry.json (generated at build time)
{
  "components": {
    "iam-role": {
      "creatorPath": "./iam-role/dist/index.js",
      "creatorExport": "IamRoleComponentCreator",
      "built": true
    }
  }
}
```

## 🧪 Testing Strategy

### Unit Tests
1. Test `findCreatorExport()` with:
   - Named exports
   - Default exports
   - Missing exports
   - Malformed module exports

2. Test `loadComponentCreators()` with:
   - Built components (dist exists)
   - Unbuilt components (only src exists)
   - Missing components
   - Components with invalid exports

### Integration Tests
1. Test synthesis with:
   - All components built
   - Some components unbuilt
   - Components with ts-node resolution issues

### Manual Testing
1. Create a new component
2. Add to manifest without building
3. Run synth - should fail with helpful error
4. Build component
5. Run synth - should succeed

## 📝 Implementation Notes

### Files to Modify
- `apps/svc/src/cli/utils/component-loader.ts`
  - Enhance error logging
  - Add auto-build fallback
  - Improve creator discovery logic

- `apps/svc/src/cli/synth-command.ts`
  - Add pre-flight component validation

- `apps/svc/src/cli/validate-command.ts`
  - Add component discoverability check

### Breaking Changes
None - all changes are additive/improvements

### Backward Compatibility
All solutions maintain backward compatibility with existing components

## 🔗 Related Issues

- **Previous "fixes" that didn't address root cause** - This is a recurring issue that keeps getting "fixed" but never actually resolved
- **Component build process inconsistencies** - No clear contract for when components must be built vs. can use source files
- **ts-node ESM module resolution issues** - Fragile module resolution that fails silently
- **Lack of architectural solution** - Previous fixes were band-aids; need systematic redesign

## ⚠️ Why Previous Fixes Failed

This issue keeps resurfacing because:

1. **Symptom-focused fixes:** Previous fixes addressed symptoms (missing dist files, ts-node errors) rather than the root cause (fragile discovery mechanism)

2. **No validation layer:** No pre-flight checks ensure components are discoverable before synthesis starts

3. **Silent failures:** Module loading failures are swallowed, making debugging impossible

4. **Inconsistent behavior:** Sometimes works (when components are built), sometimes doesn't (when using ts-node), creating unpredictable developer experience

5. **No architectural contract:** No clear specification for how component discovery should work, leading to ad-hoc fixes

**This ticket requires an architectural solution, not another quick fix.**

## 📚 References

- Component Creator Pattern: `docs/platform-standards/platform-component-api-spec.md`
- Component Loader: `apps/svc/src/cli/utils/component-loader.ts:45-217`
- Service Synthesizer: `apps/svc/src/cli/utils/service-synthesizer.ts:100-122`

## ✅ Acceptance Criteria

- [ ] Components that are not built fail with a clear, actionable error message
- [ ] Option to auto-build components when source exists but dist is missing
- [ ] Enhanced logging shows which paths were tried when module loading fails
- [ ] Pre-flight validation catches missing components before synthesis starts
- [ ] Unit tests cover all failure scenarios
- [ ] Integration tests verify end-to-end behavior
- [ ] Documentation updated with troubleshooting guide

## 🎯 Priority Justification

**P0 - CRITICAL** because:
1. Blocks all deployments when components aren't built
2. Silent failures make debugging difficult
3. Recurring issue indicates systemic problem
4. Poor developer experience (mysterious failures)
5. No clear error messages guide users to solution

