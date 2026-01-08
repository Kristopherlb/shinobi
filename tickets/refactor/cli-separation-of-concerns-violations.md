# CLI Separation of Concerns Violations

## Overview

The `up-command.ts` file contains several pieces of logic that violate platform standards and separation of concerns. These should be moved to appropriate services/utilities.

## Violations Identified

### 1. ApiGateway Account Removal Logic (Lines 170-280) ⚠️ **CRITICAL VIOLATION**

**Current Location:** `apps/svc/src/cli/up-command.ts` (110 lines)

**What It Does:**
- Makes AWS API calls (`APIGatewayClient`, `GetAccountCommand`)
- Reads and parses CloudFormation templates
- Modifies CloudFormation templates (removes resources)
- Reads and parses CDK manifest.json
- Modifies manifest.json (removes metadata)
- Resolves resource dependencies (`DependsOn` arrays)

**Why It Violates Standards:**
- **Infrastructure logic in CLI command** - Commands should orchestrate, not implement infrastructure logic
- **AWS API calls in CLI** - Should be in a service layer
- **Template manipulation** - Should be in a template processing service
- **Manifest manipulation** - Should be in a CDK assembly service
- **Singleton resource handling** - Should be a reusable service for other singleton resources

**Should Be Moved To:**
- **Option 1:** `packages/core/src/platform/services/template-post-processor/` - New service for post-synthesis template modifications
- **Option 2:** `packages/core/src/platform/services/singleton-resource-handler/` - Service for handling singleton AWS resources (ApiGateway Account, S3 Bucket Notification Config, etc.)
- **Option 3:** `apps/svc/src/cli/utils/template-post-processor.ts` - CLI utility (less ideal, but better than inline)

**Recommended:** Option 2 - Create a `SingletonResourceHandlerService` that can handle multiple singleton resources (ApiGateway Account, S3 Bucket Notification Config, etc.)

**Interface:**
```typescript
interface SingletonResourceHandlerService {
  /**
   * Post-process synthesized CloudFormation template to handle singleton resources
   * @param assemblyDir - CDK assembly directory
   * @param stackId - Stack artifact ID
   * @param region - AWS region
   * @returns Modified template path and manifest path (if modified)
   */
  postProcessTemplate(
    assemblyDir: string,
    stackId: string,
    region: string
  ): Promise<{ templateModified: boolean; manifestModified: boolean }>;
}
```

**Implementation:**
- Check for singleton resources (ApiGateway Account, etc.)
- Query AWS to see if they exist
- Remove from template if they exist
- Clean up dependencies
- Update manifest.json

---

### 2. Manifest Path Resolution Logic (Lines 80-118) ⚠️ **MODERATE VIOLATION**

**Current Location:** `apps/svc/src/cli/up-command.ts` (38 lines)

**What It Does:**
- Detects if path is a file (.yml/.yaml) or directory
- Resolves paths relative to workspace root
- Multiple fallback strategies (workspace root → cwd → absolute)
- File existence checks

**Why It Violates Standards:**
- **Complex path resolution logic in command** - Should be in FileDiscovery utility
- **Multiple fallback strategies** - Should be encapsulated in a utility
- **File system operations** - Should be in FileDiscovery or a path utility

**Should Be Moved To:**
- **Option 1:** `packages/core/src/platform/utils/file-discovery.ts` - Enhance `FileDiscovery.findManifest()` to handle file paths
- **Option 2:** `apps/svc/src/cli/utils/manifest-resolver.ts` - New utility for manifest path resolution

**Recommended:** Option 1 - Enhance `FileDiscovery.findManifest()` to accept both file paths and directory paths

**Current FileDiscovery API:**
```typescript
findManifest(directory: string): Promise<string | null>
```

**Enhanced API:**
```typescript
findManifest(path: string): Promise<string | null>
// - If path ends with .yml/.yaml, treat as file path
// - Otherwise, treat as directory and search for service.yml
// - Resolve relative to workspace root
// - Fallback to cwd, then absolute
```

---

### 3. saveSynthOutput Feature (Lines 282-307) ⚠️ **MINOR VIOLATION**

**Current Location:** `apps/svc/src/cli/up-command.ts` (25 lines)

**What It Does:**
- Recursively copies entire directory structure
- Creates destination directories
- File system operations

**Why It Violates Standards:**
- **File system operations in command** - Should be in a utility
- **Recursive copy logic** - Should be reusable

**Should Be Moved To:**
- **Option 1:** `apps/svc/src/cli/utils/file-utils.ts` - New utility for file operations
- **Option 2:** `packages/core/src/platform/utils/file-utils.ts` - Core utility (if used elsewhere)

**Recommended:** Option 1 - Create `apps/svc/src/cli/utils/file-utils.ts` with `copyDirectory()` function

**Interface:**
```typescript
export async function copyDirectory(src: string, dest: string): Promise<void>
```

---

### 4. Error Handling with Stack Traces (Lines 356-368) ✅ **ACCEPTABLE**

**Current Location:** `apps/svc/src/cli/up-command.ts` (12 lines)

**What It Does:**
- Formats error messages with stack traces
- Error type checking

**Why It's Acceptable:**
- **Command-level error formatting** - Appropriate for CLI commands
- **User-facing error messages** - CLI commands should format errors for users
- **Minimal logic** - Simple error formatting is acceptable in commands

**Status:** ✅ **KEEP** - This is appropriate for CLI commands

---

## Summary

| Violation | Lines | Severity | Should Move To |
|-----------|-------|----------|----------------|
| ApiGateway Account Removal | 110 | ⚠️ **CRITICAL** | `SingletonResourceHandlerService` |
| Manifest Path Resolution | 38 | ⚠️ **MODERATE** | `FileDiscovery.findManifest()` enhancement |
| saveSynthOutput | 25 | ⚠️ **MINOR** | `file-utils.ts` utility |
| Error Handling | 12 | ✅ **ACCEPTABLE** | Keep in command |

**Total Lines to Refactor:** ~173 lines (out of 431 total)

## Refactoring Priority

1. **HIGH:** ApiGateway Account Removal (critical infrastructure logic)
2. **MEDIUM:** Manifest Path Resolution (improves reusability)
3. **LOW:** saveSynthOutput (minor utility extraction)

## Implementation Plan

### Phase 1: SingletonResourceHandlerService

1. Create `packages/core/src/platform/services/singleton-resource-handler/`
2. Implement `SingletonResourceHandlerService` interface
3. Move ApiGateway Account logic to service
4. Inject service into `UpCommand` via dependencies
5. Update `CompositionRoot` to create service

### Phase 2: FileDiscovery Enhancement

1. Enhance `FileDiscovery.findManifest()` to handle file paths
2. Move manifest path resolution logic from `UpCommand`
3. Update `UpCommand` to use enhanced `FileDiscovery`

### Phase 3: File Utilities

1. Create `apps/svc/src/cli/utils/file-utils.ts`
2. Move `copyDirectory()` function
3. Update `UpCommand` to use utility

## Benefits

- **Separation of Concerns:** Infrastructure logic separated from CLI orchestration
- **Reusability:** Singleton resource handler can be used by other commands/components
- **Testability:** Services can be unit tested independently
- **Maintainability:** Logic is in appropriate layers
- **Standards Compliance:** Follows platform architecture patterns

