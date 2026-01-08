# CLI Refactoring Summary - Separation of Concerns

## Current State Analysis

**File:** `apps/svc/src/cli/up-command.ts`  
**Total Lines:** 431  
**Violations:** ~173 lines (40% of file)

## Violations Identified

### 1. ⚠️ **CRITICAL:** ApiGateway Account Removal Logic (Lines 170-280)

**110 lines** of infrastructure logic that violates separation of concerns:

- **AWS API calls** - `APIGatewayClient`, `GetAccountCommand`
- **Template manipulation** - Reading, parsing, modifying CloudFormation templates
- **Manifest manipulation** - Reading, parsing, modifying CDK manifest.json
- **Resource dependency resolution** - Removing `DependsOn` references

**Violates:**
- Platform Component Standards: "No application-specific logic in components"
- SOLID Principles: Single Responsibility Principle
- Architecture: Infrastructure logic should be in services, not commands

**Should Move To:**
```
packages/core/src/platform/services/singleton-resource-handler/
├── singleton-resource-handler.service.ts
├── api-gateway-account-handler.ts
└── index.ts
```

**New Service Interface:**
```typescript
export interface SingletonResourceHandlerService {
  /**
   * Post-process synthesized CloudFormation template to handle singleton resources
   */
  postProcessTemplate(
    assemblyDir: string,
    stackId: string,
    region: string
  ): Promise<{ templateModified: boolean; manifestModified: boolean }>;
}
```

---

### 2. ⚠️ **MODERATE:** Manifest Path Resolution (Lines 80-118)

**38 lines** of path resolution logic:

- File vs directory detection
- Multiple fallback strategies (workspace root → cwd → absolute)
- File existence checks

**Violates:**
- Single Responsibility: Path resolution should be in FileDiscovery
- Reusability: Logic duplicated across commands

**Should Enhance:**
```
packages/core/src/services/file-discovery.ts
```

**Enhanced API:**
```typescript
async findManifest(path: string): Promise<string | null> {
  // If path ends with .yml/.yaml, treat as file path
  // - Resolve relative to workspace root
  // - Fallback to cwd, then absolute
  // Otherwise, treat as directory and search for service.yml
}
```

---

### 3. ⚠️ **MINOR:** saveSynthOutput Feature (Lines 282-307)

**25 lines** of file system operations:

- Recursive directory copying
- Directory creation

**Violates:**
- Single Responsibility: File operations should be in utilities

**Should Move To:**
```
apps/svc/src/cli/utils/file-utils.ts
```

**New Utility:**
```typescript
export async function copyDirectory(src: string, dest: string): Promise<void>
```

---

### 4. ✅ **ACCEPTABLE:** Error Handling (Lines 356-368)

**12 lines** of error formatting:

- Error message formatting with stack traces
- User-facing error messages

**Status:** ✅ **KEEP** - Appropriate for CLI commands

---

## Refactoring Plan

### Phase 1: SingletonResourceHandlerService (HIGH PRIORITY)

**Steps:**
1. Create `packages/core/src/platform/services/singleton-resource-handler/`
2. Implement `SingletonResourceHandlerService` interface
3. Create `ApiGatewayAccountHandler` class
4. Move ApiGateway Account logic from `UpCommand`
5. Inject service into `UpCommand` via dependencies
6. Update `CompositionRoot` to create service
7. Add unit tests

**Estimated Effort:** 4-6 hours

**Benefits:**
- Reusable for other singleton resources (S3 Bucket Notification Config, etc.)
- Testable independently
- Follows platform architecture patterns

---

### Phase 2: FileDiscovery Enhancement (MEDIUM PRIORITY)

**Steps:**
1. Enhance `FileDiscovery.findManifest()` to handle file paths
2. Add workspace root resolution logic
3. Add fallback strategies
4. Move manifest path resolution logic from `UpCommand`
5. Update `UpCommand` to use enhanced `FileDiscovery`
6. Update tests

**Estimated Effort:** 2-3 hours

**Benefits:**
- Reusable across all commands
- Consistent path resolution
- Single source of truth

---

### Phase 3: File Utilities (LOW PRIORITY)

**Steps:**
1. Create `apps/svc/src/cli/utils/file-utils.ts`
2. Move `copyDirectory()` function
3. Update `UpCommand` to use utility
4. Add tests

**Estimated Effort:** 1 hour

**Benefits:**
- Reusable file operations
- Cleaner command code

---

## Impact Assessment

### Before Refactoring
- **UpCommand:** 431 lines (40% violations)
- **Testability:** Low (infrastructure logic mixed with orchestration)
- **Reusability:** Low (logic embedded in command)
- **Maintainability:** Medium (violations make changes risky)

### After Refactoring
- **UpCommand:** ~258 lines (40% reduction)
- **Testability:** High (services can be tested independently)
- **Reusability:** High (services reusable across commands/components)
- **Maintainability:** High (clear separation of concerns)

---

## Standards Compliance

### Platform Component Standards
- ✅ **No application-specific logic** - Infrastructure logic moved to services
- ✅ **Single Responsibility** - Commands orchestrate, services implement
- ✅ **Dependency Injection** - Services injected via constructor

### SOLID Principles
- ✅ **Single Responsibility** - Each class has one reason to change
- ✅ **Open/Closed** - Services can be extended without modifying commands
- ✅ **Dependency Inversion** - Commands depend on abstractions (services)

### Architecture Patterns
- ✅ **Service Layer** - Infrastructure logic in services
- ✅ **Utility Layer** - File operations in utilities
- ✅ **Command Layer** - Orchestration only

---

## Next Steps

1. **Create tickets** for each refactoring phase
2. **Prioritize** based on impact and effort
3. **Implement** Phase 1 (SingletonResourceHandlerService) first
4. **Test** thoroughly before moving to Phase 2
5. **Document** service interfaces and usage

---

## References

- Platform Component Standards: `docs/platform-standards/platform-component-api-spec.md`
- Design Principles: `docs/architecture/design-principles.md`
- Current Violations: `tickets/refactor/cli-separation-of-concerns-violations.md`

