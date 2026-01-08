---
name: build-executor
description: Executes build, test, typecheck, and lint commands for components and packages. Automatically detects sandbox environment and uses appropriate execution strategy (direct commands in sandbox, nx commands in normal environments). Ensures consistent execution regardless of environment constraints.
compatibility: Works in both Cursor agent sandbox and normal development environments. Requires access to project.json files and node_modules/.bin executables.
metadata:
  author: shinobi-platform
  version: "1.0"
license: Apache-2.0
---

# build-executor

<!-- Degrees of Freedom: High - Provides flexible execution strategy with environment detection -->

## Instructions

### Environment Detection

1. **Sandbox Detection**: Check if running in sandbox by attempting to execute `nx show projects` with a short timeout
   - If `nx` commands hang/fail → Use direct command execution
   - If `nx` works → Use `nx` commands for consistency

2. **Execution Strategy Selection**:
   - **Sandbox Mode**: Use direct executables (`node_modules/.bin/tsc`, `node_modules/.bin/vitest`, etc.)
   - **Normal Mode**: Use `nx` commands (`pnpm nx build`, `pnpm nx test`, etc.)

### Build Operations

**For Components:**
- Read `packages/components/<name>/project.json` to find build target
- Extract command from `targets.build.options.command`
- Execute with appropriate `cwd` (from `targets.build.options.cwd` or default to workspace root)
- Use direct `tsc` if in sandbox, `nx build` if in normal environment

**For Packages:**
- Check if package has `project.json` or uses `@nx/js:tsc` executor
- Use appropriate executor based on package type

### Test Operations

**For Components:**
- Use `@nx/vitest:test` executor if available
- Fall back to direct `vitest` execution in sandbox
- Ensure test config path is correct

### Typecheck Operations

- Extract typecheck command from `project.json`
- Execute with correct working directory
- Use direct `tsc` in sandbox, `nx typecheck` in normal environment

### Lint Operations

- Extract lint command from `project.json`
- Execute with project root as `cwd` for lint commands

## Execution Patterns

### Pattern 1: Build Single Component (Sandbox)

```bash
# Read project.json to get build command
COMMAND="node_modules/.bin/tsc -b packages/components/sqs-queue/tsconfig.build.json"
CWD="/Users/.../shinobi"  # workspace root
cd "$CWD" && $COMMAND
```

### Pattern 2: Build Single Component (Normal)

```bash
pnpm nx build @shinobi/components-sqs-queue --skip-nx-cache
```

### Pattern 3: Build All Components (Sandbox)

```bash
# Iterate through all component project.json files
for COMPONENT in packages/components/*/project.json; do
  # Extract build command and execute
done
```

### Pattern 4: Build All Components (Normal)

```bash
pnpm nx run-many -t build --all
```

## Critical Rules

**REQUIRED**: Always check `project.json` for target configuration before executing

**REQUIRED**: Respect `cwd` configuration from `targets.*.options.cwd`

**REQUIRED**: Use workspace root-relative paths for full paths

**PROHIBITED**: Never assume `cwd` - always read from configuration or default to workspace root

**PROHIBITED**: Don't use `pnpm exec` in sandbox - use direct `node_modules/.bin/*` paths

## Examples

### Example 1: Building a Component

**Input**: "Build @shinobi/components-sqs-queue"

**Process**:
1. Detect environment (sandbox or normal)
2. Read `packages/components/sqs-queue/project.json`
3. Extract build target: `targets.build.options.command` and `targets.build.options.cwd`
4. Execute:
   - **Sandbox**: `cd <workspace-root> && node_modules/.bin/tsc -b packages/components/sqs-queue/tsconfig.build.json`
   - **Normal**: `pnpm nx build @shinobi/components-sqs-queue --skip-nx-cache`

**Output**: Build artifacts in `dist/packages/components/sqs-queue`

### Example 2: Running Tests

**Input**: "Test @shinobi/components-vpc"

**Process**:
1. Detect environment
2. Read `packages/components/vpc/project.json`
3. Check test executor (likely `@nx/vitest:test`)
4. Execute:
   - **Sandbox**: `cd <workspace-root> && node_modules/.bin/vitest packages/components/vpc/vitest.config.ts`
   - **Normal**: `pnpm nx test @shinobi/components-vpc`

**Output**: Test results and coverage

### Example 3: Typechecking Multiple Components

**Input**: "Typecheck all components"

**Process**:
1. Find all component `project.json` files
2. For each component, extract typecheck command
3. Execute in parallel or sequentially based on environment

**Output**: Type errors or success for each component

## Environment Detection Logic

```typescript
async function detectEnvironment(): Promise<'sandbox' | 'normal'> {
  // Try to run nx with short timeout
  try {
    const result = await execWithTimeout('pnpm nx --version', 2000);
    return 'normal';
  } catch (timeout) {
    // nx hangs or fails - we're in sandbox
    return 'sandbox';
  }
}
```

## Command Extraction

```typescript
interface ProjectTarget {
  executor: string;
  options: {
    command?: string;
    cwd?: string;
    config?: string;
  };
}

function extractBuildCommand(projectJson: any): { command: string; cwd: string } {
  const build = projectJson.targets?.build;
  if (!build) throw new Error('No build target found');
  
  const command = build.options.command || '';
  const cwd = build.options.cwd || '{workspaceRoot}';
  
  // Replace template variables
  const resolvedCwd = cwd.replace('{workspaceRoot}', process.cwd());
  
  return { command, cwd: resolvedCwd };
}
```

## Bundled Resources

- **Scripts**: Build/test execution helpers and environment detection
- **References**: Command patterns, project.json schemas, nx executor documentation

## Edge Cases

- **Missing project.json**: Skip component or use package.json scripts as fallback
- **Custom executors**: Delegate to nx in normal mode, extract command in sandbox mode
- **Project references**: Ensure dependent projects are built first
- **Cache invalidation**: Use `--skip-nx-cache` in normal mode for clean builds
- **Partial builds**: Only build changed components when possible

## Checklist

When executing builds/tests:

| Step | Check | Outcome |
|------|-------|---------|
| **1. Environment** | Can `nx` execute? | Use appropriate strategy |
| **2. Config** | Does `project.json` exist? | **FAIL** if missing |
| **3. Target** | Does target exist? | **FAIL** if missing |
| **4. Command** | Is command extractable? | **FAIL** if not |
| **5. CWD** | Is working directory set? | **WARN** if not, default to workspace root |
| **6. Execute** | Did command succeed? | **FAIL** if errors |

## Additional Resources

- See `references/COMMAND_PATTERNS.md` for common command patterns
- See `references/PROJECT_JSON_SCHEMA.md` for project.json structure
- See `scripts/detect-environment.sh` for environment detection
- See `scripts/build-component.sh` for component build script

