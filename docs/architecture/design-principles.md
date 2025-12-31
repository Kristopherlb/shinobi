# Design Principles

**Version**: 1.0  
**Status**: Published  
**Last Updated**: 2025-01-27  
**Owner**: Platform Engineering

## Overview

This document codifies the seven core architectural principles that guide the design and implementation of the Shinobi platform. These principles ensure the codebase remains clean, testable, maintainable, and scalable.

These principles were established through iterative refactoring and represent a high bar for quality. All code in the platform should adhere to these principles.

## The Seven Principles

### Principle 1: Strict Dependency Injection (DI)

**Rule**: Classes must receive all external dependencies (modules, clients, configurations) through their constructor. There must be zero DI "fallbacks" (e.g., `this.fs = dependencies.fs || require('fs')`). A class must be explicit and demanding about its dependencies.

**Rationale**: This ensures classes are fully decoupled from their concrete dependencies, making them easy to test in isolation with mocks. It makes the system's dependency graph transparent and predictable.

**Anti-Pattern**:
```typescript
class FileReader {
  private fs = require('fs'); // ❌ Hidden dependency
  readFile(path: string) {
    return this.fs.readFileSync(path);
  }
}
```

**Correct Pattern**:
```typescript
class FileReader {
  constructor(private fs: typeof import('fs')) {} // ✅ Explicit dependency
  readFile(path: string) {
    return this.fs.readFileSync(path);
  }
}
```

---

### Principle 2: The Composition Root

**Rule**: There must be a single, top-level "Composition Root" (typically the main application entry point, like `bin/cli.js` or `composition-root.ts`). This is the only place in the application where concrete dependencies are instantiated and "composed" together.

**Rationale**: This centralizes the "messy" work of object creation. All other parts of the application receive their dependencies fully formed, adhering to the Inversion of Control principle.

**Implementation**: The Composition Root is responsible for:
- Instantiating all concrete classes
- Wiring dependencies together
- Creating the dependency graph
- Passing fully-formed dependencies to commands and services

**Example**:
```typescript
// composition-root.ts - The single Composition Root
export class CompositionRoot {
  createDependencies(): ApplicationDependencies {
    const logger = new Logger();
    const fileDiscovery = new FileDiscovery();
    const schemaManager = new SchemaManager();
    // ... wire everything together
    return { logger, fileDiscovery, schemaManager, ... };
  }
}
```

**Reference**: See `apps/svc/src/cli/composition-root.ts` for the platform's Composition Root implementation.

---

### Principle 3: Decouple from the Runtime Environment

**Rule**: Core business logic classes must be completely decoupled from the runtime environment. They must not contain any calls to `process.exit`, `console.log` for data output, or other process-level side effects.

**Rationale**: This makes the logic portable, reusable, and testable. The logic can be run and validated without crashing the test runner or requiring spies on global objects.

**Implementation**: Methods that orchestrate a command should return a standardized result object (e.g., `{ success, exitCode, data, error }`). The Composition Root is then responsible for interpreting this object to perform the final side effects.

**Anti-Pattern**:
```typescript
class ValidateCommand {
  async execute() {
    if (error) {
      console.error('Validation failed');
      process.exit(1); // ❌ Runtime coupling
    }
  }
}
```

**Correct Pattern**:
```typescript
class ValidateCommand {
  async execute(): Promise<CommandResult> {
    if (error) {
      return { success: false, exitCode: 1, error: 'Validation failed' }; // ✅ Returns result
    }
    return { success: true, exitCode: 0, data: result };
  }
}

// Composition Root handles side effects
const result = await command.execute();
if (!result.success) {
  process.exit(result.exitCode); // ✅ Side effect at composition root
}
```

---

### Principle 4: Single Responsibility Principle (SRP) / No "God Classes"

**Rule**: Every class and module must have one, and only one, reason to change.

**Rationale**: Small, focused classes are easier to understand, test, and maintain.

**Implementation**: Identify and break down "God Classes" that have multiple, unrelated responsibilities. Logic should be separated into distinct roles (e.g., a Command class for orchestration, a Service or Utility for a specific task like parsing or analysis).

**Anti-Pattern**:
```typescript
class ValidationService {
  parseManifest() { /* ... */ }
  validateSchema() { /* ... */ }
  hydrateContext() { /* ... */ }
  validateReferences() { /* ... */ }
  // ❌ Too many responsibilities
}
```

**Correct Pattern**:
```typescript
class ManifestParser {
  parse() { /* ... */ } // ✅ Single responsibility: parsing
}

class SchemaValidator {
  validate() { /* ... */ } // ✅ Single responsibility: schema validation
}

class ContextHydrator {
  hydrate() { /* ... */ } // ✅ Single responsibility: context hydration
}

class ReferenceValidator {
  validate() { /* ... */ } // ✅ Single responsibility: reference validation
}

class ValidationOrchestrator {
  // ✅ Orchestrates the focused services
  constructor(
    private parser: ManifestParser,
    private schemaValidator: SchemaValidator,
    private contextHydrator: ContextHydrator,
    private referenceValidator: ReferenceValidator
  ) {}
}
```

**Reference**: See `packages/core/src/services/` for examples of focused, single-responsibility services.

---

### Principle 5: No Global State (Eliminate Singletons)

**Rule**: The application must not rely on mutable, shared global state. Modules that export a pre-made instance (`module.exports = new MyClass()`) are an anti-pattern.

**Rationale**: Global state creates hidden dependencies, makes the flow of data hard to trace, and causes tests to interfere with each other, leading to flaky and unreliable test suites.

**Implementation**: Refactor any singleton modules to export the class itself. The single instance should be created once in the Composition Root and then explicitly passed to the components that need it. Data should flow explicitly through parameters and return values.

**Anti-Pattern**:
```typescript
// logger.ts
export default new Logger(); // ❌ Global singleton

// some-service.ts
import logger from './logger';
logger.info('message'); // ❌ Hidden dependency
```

**Correct Pattern**:
```typescript
// logger.ts
export class Logger { /* ... */ } // ✅ Export class

// composition-root.ts
const logger = new Logger(); // ✅ Created once in Composition Root

// some-service.ts
class SomeService {
  constructor(private logger: Logger) {} // ✅ Explicit dependency
  doSomething() {
    this.logger.info('message');
  }
}
```

---

### Principle 6: Separate Data from Logic (Open/Closed Principle)

**Rule**: Configuration data, user-facing strings, regex patterns, and other "magic values" must be externalized from the application logic.

**Rationale**: This allows the application's behavior to be changed and extended by modifying data (e.g., a `.yaml` file) without changing the source code. This makes the application more flexible and reduces the risk of introducing bugs when updating configurations.

**Implementation**: Move hard-coded objects, patterns, and message strings into separate configuration files (`.yaml`, `.json`) or template files. The application code then loads and uses this external data.

**Anti-Pattern**:
```typescript
class ComponentRegistry {
  getComponent(type: string) {
    const components = { // ❌ Hard-coded data
      's3-bucket': S3BucketComponent,
      'rds-postgres': RDSComponent,
    };
    return components[type];
  }
}
```

**Correct Pattern**:
```typescript
// config/components.yaml
components:
  s3-bucket: '@platform/components/s3-bucket'
  rds-postgres: '@platform/components/rds-postgres'

// component-registry.ts
class ComponentRegistry {
  constructor(private config: ComponentConfig) {} // ✅ Data from config
  getComponent(type: string) {
    return this.config.components[type];
  }
}
```

---

### Principle 7: Clear Class/Module Roles

**Rule**: Classes should be clearly identifiable in their role within the architecture.

**Rationale**: Clear roles make the codebase easier to navigate, understand, and maintain. Developers can quickly identify where to add new functionality or make changes.

**Implementation**: Structure the application around clear roles:

- **Commands**: Top-level orchestrators for a user-facing feature. They coordinate services and return standardized results.
- **Services/Managers**: Mid-level components that perform a complex task (e.g., `ValidationOrchestrator`, `ManifestParser`).
- **Stateless Utilities**: Pure logic modules with no dependencies, often implemented as a class with only static methods (e.g., `ConfigUtils`, `PlatformDetector`).
- **Wrappers/Adapters**: Classes whose only job is to provide a clean interface to an external tool or library (e.g., `CDKExecutor`, `FileDiscovery`).

**Example Structure**:
```
apps/svc/src/cli/
├── commands/           # Command factories (Commander.js)
│   ├── plan.ts
│   ├── validate.ts
│   └── synth.ts
├── plan-command.ts     # Command implementation (orchestration)
├── validate-command.ts # Command implementation
├── composition-root.ts # Composition Root (Principle 2)
└── services/           # Services (business logic)
    ├── manifest-parser.ts
    ├── schema-validator.ts
    └── validation-orchestrator.ts
```

**Reference**: See `packages/core/src/services/validation-orchestrator.ts` for an example of a "Service/Manager" role.

---

## Applying These Principles

### Code Review Checklist

When reviewing code, ensure:

- [ ] All dependencies are injected through constructors (Principle 1)
- [ ] No concrete instantiations outside the Composition Root (Principle 2)
- [ ] No `process.exit` or `console.log` in business logic (Principle 3)
- [ ] Each class has a single, clear responsibility (Principle 4)
- [ ] No global state or singletons (Principle 5)
- [ ] Configuration data is externalized (Principle 6)
- [ ] Class roles are clear and consistent (Principle 7)

### Refactoring Guide

When refactoring existing code:

1. **Identify violations**: Look for hidden dependencies, global state, and mixed responsibilities
2. **Extract dependencies**: Move all dependencies to constructor parameters
3. **Split responsibilities**: Break down "God Classes" into focused services
4. **Externalize data**: Move hard-coded values to configuration files
5. **Update Composition Root**: Ensure all concrete instantiations happen there
6. **Add tests**: The refactored code should be significantly easier to test

---

## Benefits

Adhering to these principles provides:

- **Testability**: Dependencies are explicit and mockable
- **Maintainability**: Clear structure and single responsibilities
- **Scalability**: Easy to add new features without breaking existing code
- **Reliability**: No hidden dependencies or global state causing test flakiness
- **Flexibility**: Configuration changes don't require code changes

---

## References

- **Composition Root**: `apps/svc/src/cli/composition-root.ts`
- **Command Pattern**: `apps/svc/src/cli/commands/` and `apps/svc/src/cli/*-command.ts`
- **Service Examples**: `packages/core/src/services/`
- **SOLID Principles**: These principles are based on SOLID design principles
- **Dependency Injection**: Mark Seemann's "Dependency Injection in .NET"

---

## Version History

- **1.0** (2025-01-27): Initial publication, codifying principles from iterative refactoring

