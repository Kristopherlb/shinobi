# Command Patterns

Common command patterns used in project.json files and how to execute them in different environments.

## Build Commands

### Pattern: Full Path with cwd
```json
{
  "targets": {
    "build": {
      "executor": "nx:run-commands",
      "options": {
        "command": "node_modules/.bin/tsc -b packages/components/sqs-queue/tsconfig.build.json",
        "cwd": "{workspaceRoot}"
      }
    }
  }
}
```

**Sandbox Execution:**
```bash
cd /workspace-root && node_modules/.bin/tsc -b packages/components/sqs-queue/tsconfig.build.json
```

**Normal Execution:**
```bash
pnpm nx build @shinobi/components-sqs-queue --skip-nx-cache
```

## Test Commands

### Pattern: Vitest Executor
```json
{
  "targets": {
    "test": {
      "executor": "@nx/vitest:test",
      "options": {
        "config": "packages/components/vpc/vitest.config.ts"
      }
    }
  }
}
```

**Sandbox Execution:**
```bash
cd /workspace-root && node_modules/.bin/vitest packages/components/vpc/vitest.config.ts
```

**Normal Execution:**
```bash
pnpm nx test @shinobi/components-vpc
```

## Typecheck Commands

### Pattern: TypeScript Check
```json
{
  "targets": {
    "typecheck": {
      "executor": "nx:run-commands",
      "options": {
        "command": "tsc -p packages/components/sqs-queue/tsconfig.json --noEmit",
        "cwd": "{workspaceRoot}"
      }
    }
  }
}
```

**Sandbox Execution:**
```bash
cd /workspace-root && node_modules/.bin/tsc -p packages/components/sqs-queue/tsconfig.json --noEmit
```

**Normal Execution:**
```bash
pnpm nx typecheck @shinobi/components-sqs-queue
```

## Lint Commands

### Pattern: ESLint
```json
{
  "targets": {
    "lint": {
      "executor": "nx:run-commands",
      "options": {
        "command": "eslint . --ext .ts,.tsx",
        "cwd": "{projectRoot}"
      }
    }
  }
}
```

**Sandbox Execution:**
```bash
cd packages/components/sqs-queue && node_modules/.bin/eslint . --ext .ts,.tsx
```

**Normal Execution:**
```bash
pnpm nx lint @shinobi/components-sqs-queue
```

## Template Variable Resolution

- `{workspaceRoot}` → Absolute path to workspace root
- `{projectRoot}` → Absolute path to project directory (e.g., `packages/components/sqs-queue`)

## Executor Types

### nx:run-commands
- Extract `command` and `cwd` from options
- Replace template variables
- Execute in sandbox mode, use nx in normal mode

### @nx/js:tsc
- Built-in TypeScript compiler executor
- In sandbox: Extract and execute manually
- In normal: Use nx executor

### @nx/vitest:test
- Vitest test executor
- In sandbox: Extract config path and run vitest directly
- In normal: Use nx executor

