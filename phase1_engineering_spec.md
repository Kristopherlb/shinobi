# Engineering Specification: Platform Core Foundation (Phase 1)

**Objective**: To build a robust, high-performance CLI and a declarative manifest validation pipeline that can correctly parse, validate, and hydrate a developer's intent, providing instant, actionable feedback. This phase delivers the foundational developer interaction layer.

## 1. The CLI Framework (svc command)

This framework is the primary user interface. It must be self-documenting and behave predictably in both local development and CI environments.

### FR-CLI-1: Command Structure & Help
- The CLI will be invoked as `svc`.
- It will support three initial commands:
  - `svc init`: Scaffolds a new service from a template.
  - `svc validate`: Parses and validates the service.yml without connecting to AWS. This is a fast, local-only check.
  - `svc plan`: Performs a full validation, hydrates the manifest with environment context, and (in this phase) outputs the final, resolved configuration object.
- All commands and sub-commands MUST respond to a `--help` flag with clear documentation of their purpose, arguments, and options.

### FR-CLI-2: Configuration Discovery
- The CLI will automatically discover the service.yml file by searching from the current working directory upwards to the root of the git repository.
- If no file is found, the CLI MUST exit with a non-zero code and a user-friendly error message: `Error: No service.yml found in this directory or any parent directories.`
- An optional `--file` / `-f` flag can be used to specify an explicit path to a manifest.

### FR-CLI-3: Output & Logging
- **Local Mode (default)**: Output will be human-readable, color-coded text sent to stdout for success and stderr for errors.
- **CI Mode (`--ci` flag)**: All log output MUST be structured JSON sent to stdout. This enables easy parsing by automation systems.
- **Verbosity**: A `--verbose` / `-v` flag will enable DEBUG level logging, providing detailed insight into the validation pipeline stages.

### FR-CLI-4: Error Handling & Exit Codes
- The CLI MUST use standard POSIX exit codes:
  - `0`: Success.
  - `1`: General runtime error (e.g., file not found, network issue).
  - `2`: User configuration error (e.g., invalid YAML, schema validation failure).
- Error messages for user configuration issues MUST be actionable and, where possible, reference the specific line number in service.yml.

## 2. The Manifest Loading & Validation Pipeline

This is the core logic that translates the manifest into a validated, environment-aware plan. It is a series of sequential, stateless stages. A failure at any stage halts the process immediately.

### Stage 1: Parsing
- **AC-P1.1**: The pipeline MUST ingest the service.yml file. It MUST correctly reject files with invalid YAML syntax, providing a parsing error from the underlying library.
- **AC-P1.2**: The raw parsed object is passed to the next stage.

### Stage 2: Schema Validation
- **AC-P2.1**: The pipeline MUST validate the parsed object against a master JSON Schema.
- **AC-P2.2**: This master schema will be dynamically composed from a base.schema.json (defining top-level fields like service, owner, complianceFramework) and the individual Config.schema.json files published by each registered component.
- **AC-P2.3**: A validation failure MUST halt the pipeline and produce an error detailing the path (e.g., `components[1].config.visibilityTimeout`) and the rule that was violated (e.g., "must be an integer").

### Stage 3: Context Hydration
- **AC-P3.1**: The pipeline MUST identify the target environment from a CLI flag (e.g., `--env dev`) and the complianceFramework from the manifest.
- **AC-P3.2**: It MUST correctly resolve environment-aware values using the specified interpolation syntax (`${env:key}`, `${envIs:prod}`, and per-env maps). The order of precedence for configuration MUST be strictly followed as defined in the contract.
- **AC-P3.3**: The output of this stage is a fully hydrated configuration object where all environment-specific values have been resolved.

### Stage 4: Semantic & Reference Validation
- **AC-P4.1**: The pipeline MUST iterate through all binds and `${ref:...}` directives.
- **AC-P4.2**: It MUST verify that every `to:` and `ref:` target name corresponds to a component name that exists within the manifest. A missing reference MUST halt the pipeline with an error: `Error: Reference to non-existent component 'orders-db' in components[2].binds[0].`
- **AC-P4.3**: It MUST validate that all `governance.cdkNag.suppress` blocks contain the required fields (id, justification, owner, expiresOn).

## 3. The svc init Scaffolding Engine

This feature is critical for the "first 15 minutes" user experience.

### AC-SI-1: Interactive Prompting
- Running `svc init` MUST launch an interactive CLI survey that prompts the user for:
  - Service Name
  - Owner (e.g., team name)
  - Compliance Framework (choice: commercial, fedramp-moderate, fedramp-high)
  - Initial Pattern (choice: empty, lambda-api-with-db, worker-with-queue)
- The survey MUST provide sensible defaults.

### AC-SI-2: Template Generation
- Based on the user's answers, the engine MUST use an internal template engine to generate the initial service files.
- **Generated Artifacts**:
  - `service.yml`: Pre-filled with the chosen pattern and user inputs.
  - `.gitignore`: A standard Node.js gitignore file.
  - `src/`: Directory containing boilerplate handler code relevant to the chosen pattern.
  - `patches.ts`: An empty, commented-out stub explaining its purpose and linking to documentation.

## Phase 1 Deliverables & Definition of Done

- A working `svc` CLI application published to our internal package manager, implementing the `init`, `validate`, and `plan` commands as specified.
- The `plan` command output is the fully resolved JSON of the manifest. Full CDK synthesis and diffing are deferred to the next phase.
- A versioned JSON Schema package (`@platform/schemas`) is published internally.
- Confluence documentation for the service.yml manifest structure and the three initial CLI commands.
- Unit and integration test coverage for the CLI framework and each stage of the validation pipeline exceeds 90%.

## Technical Implementation Details

### CLI Architecture
- **Framework**: Built using a modern Node.js CLI framework (e.g., Commander.js or Oclif)
- **Language**: TypeScript for type safety and maintainability
- **Configuration**: Support for both programmatic and CLI-based configuration
- **Distribution**: Published as npm package for internal consumption

### Validation Pipeline Architecture
- **Design Pattern**: Sequential pipeline with fail-fast behavior
- **State Management**: Stateless stages with immutable data passing
- **Error Handling**: Structured error objects with contextual information
- **Performance**: Optimized for sub-second validation on typical manifests

### Schema Management
- **Schema Composition**: Dynamic schema building from base + component schemas
- **Versioning**: Semantic versioning for backward compatibility
- **Validation Library**: JSON Schema Draft-07+ compliant validator
- **Component Integration**: Plugin-based schema loading for extensibility

### Template System
- **Engine**: Mustache or similar logic-less templating
- **Template Storage**: Embedded templates with external override capability
- **Pattern Library**: Extensible pattern definitions for common architectures
- **File Generation**: Safe file system operations with conflict detection

### Testing Strategy
- **Unit Tests**: Individual function and class testing with mocking
- **Integration Tests**: End-to-end CLI command validation
- **Schema Tests**: Comprehensive validation rule testing
- **Template Tests**: Generated artifact validation
- **Performance Tests**: Benchmark validation speed and memory usage

### Quality Gates
- **Code Coverage**: Minimum 90% line and branch coverage
- **Performance**: Validation completes in <500ms for typical manifests
- **Memory Usage**: CLI process uses <50MB for standard operations
- **Error Quality**: All error messages include actionable guidance
- **Documentation**: All public APIs documented with examples