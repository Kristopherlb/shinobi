Engineering Specification: Platform Core Foundation (Phase 1)
Objective: To build a robust, high-performance CLI and a declarative manifest validation pipeline that can correctly parse, validate, and hydrate a developer's intent, providing instant, actionable feedback. This phase delivers the foundational developer interaction layer.
1. The CLI Framework (svc command)
This framework is the primary user interface. It must be self-documenting and behave predictably in both local development and CI environments.
FR-CLI-1: Command Structure & Help
The CLI will be invoked as svc.
It will support three initial commands:
svc init: Scaffolds a new service from a template.
svc validate: Parses and validates the service.yml without connecting to AWS. This is a fast, local-only check.
svc plan: Performs a full validation, hydrates the manifest with environment context, and (in this phase) outputs the final, resolved configuration object.
All commands and sub-commands MUST respond to a --help flag with clear documentation of their purpose, arguments, and options.
FR-CLI-2: Configuration Discovery
The CLI will automatically discover the service.yml file by searching from the current working directory upwards to the root of the git repository.
If no file is found, the CLI MUST exit with a non-zero code and a user-friendly error message: Error: No service.yml found in this directory or any parent directories.
An optional --file / -f flag can be used to specify an explicit path to a manifest.
FR-CLI-3: Output & Logging
Local Mode (default): Output will be human-readable, color-coded text sent to stdout for success and stderr for errors.
CI Mode (--ci flag): All log output MUST be structured JSON sent to stdout. This enables easy parsing by automation systems.
Verbosity: A --verbose / -v flag will enable DEBUG level logging, providing detailed insight into the validation pipeline stages.
FR-CLI-4: Error Handling & Exit Codes
The CLI MUST use standard POSIX exit codes:
0: Success.
1: General runtime error (e.g., file not found, network issue).
2: User configuration error (e.g., invalid YAML, schema validation failure).
Error messages for user configuration issues MUST be actionable and, where possible, reference the specific line number in service.yml.
2. The Manifest Loading & Validation Pipeline
This is the core logic that translates the manifest into a validated, environment-aware plan. It is a series of sequential, stateless stages. A failure at any stage halts the process immediately.
Stage 1: Parsing
AC-P1.1: The pipeline MUST ingest the service.yml file. It MUST correctly reject files with invalid YAML syntax, providing a parsing error from the underlying library.
AC-P1.2: The raw parsed object is passed to the next stage.
Stage 2: Schema Validation
AC-P2.1: The pipeline MUST validate the parsed object against a master JSON Schema.
AC-P2.2: This master schema will be dynamically composed from a base.schema.json (defining top-level fields like service, owner, complianceFramework) and the individual Config.schema.json files published by each registered component.
AC-P2.3: A validation failure MUST halt the pipeline and produce an error detailing the path (e.g., components[1].config.visibilityTimeout) and the rule that was violated (e.g., "must be an integer").
Stage 3: Context Hydration
AC-P3.1: The pipeline MUST identify the target environment from a CLI flag (e.g., --env dev) and the complianceFramework from the manifest.
AC-P3.2: It MUST correctly resolve environment-aware values using the specified interpolation syntax (${env:key}, ${envIs:prod}, and per-env maps). The order of precedence for configuration MUST be strictly followed as defined in the contract.
AC-P3.3: The output of this stage is a fully hydrated configuration object where all environment-specific values have been resolved.
Stage 4: Semantic & Reference Validation
AC-P4.1: The pipeline MUST iterate through all binds and ${ref:...} directives.
AC-P4.2: It MUST verify that every to: and ref: target name corresponds to a component name that exists within the manifest. A missing reference MUST halt the pipeline with an error: Error: Reference to non-existent component 'orders-db' in components[2].binds[0].
AC-P4.3: It MUST validate that all governance.cdkNag.suppress blocks contain the required fields (id, justification, owner, expiresOn).
3. The svc init Scaffolding Engine
This feature is critical for the "first 15 minutes" user experience.
AC-SI-1: Interactive Prompting
Running svc init MUST launch an interactive CLI survey that prompts the user for:
Service Name
Owner (e.g., team name)
Compliance Framework (choice: commercial, fedramp-moderate, fedramp-high)
Initial Pattern (choice: empty, lambda-api-with-db, worker-with-queue)
The survey MUST provide sensible defaults.
AC-SI-2: Template Generation
Based on the user's answers, the engine MUST use an internal template engine to generate the initial service files.
Generated Artifacts:
service.yml: Pre-filled with the chosen pattern and user inputs.
.gitignore: A standard Node.js gitignore file.
src/: Directory containing boilerplate handler code relevant to the chosen pattern.
patches.ts: An empty, commented-out stub explaining its purpose and linking to documentation.
Phase 1 Deliverables & Definition of Done
A working svc CLI application published to our internal package manager, implementing the init, validate, and plan commands as specified.
The plan command output is the fully resolved JSON of the manifest. Full CDK synthesis and diffing are deferred to the next phase.
A versioned JSON Schema package (@platform/schemas) is published internally.
Confluence documentation for the service.yml manifest structure and the three initial CLI commands.
Unit and integration test coverage for the CLI framework and each stage of the validation pipeline exceeds 90%.


-------
New CLI standard
______

Platform CLI Utilities Standard
Version: 1.0
Status: Published
Last Updated: September 8, 2025

1. Overview & Vision
This document defines the complete specification for the platform's command-line interface (CLI), invoked via the svc command. A world-class CLI is the cornerstone of a world-class developer experience. It must be more than just a deployment tool; it must be a complete, intuitive toolkit for the entire development lifecycle, from local testing to production debugging and architectural analysis.

The vision is to provide a single, consistent, and powerful interface that shortens the feedback loop, provides deep visibility, and automates the tedious tasks developers face every day. This is achieved by providing a suite of well-designed commands and by integrating best-in-class open-source tools for visualization and cost analysis.

2. Guiding Principles & Core Requirements
2.1. Guiding Principles
Single Entry Point: The svc command MUST be the single, unified entry point for all platform interactions.

Declarative & Intent-Based: Commands MUST operate on the developer's declared intent in the service.yml manifest.

Fast Feedback Loop: Local commands (plan --local, test, graph) MUST be optimized for speed, providing near-instantaneous feedback.

Consistency: All commands MUST follow a consistent naming convention and flag structure (e.g., --env for environment selection, --manifest for the manifest file).

Self-Documenting: The CLI MUST provide comprehensive --help text for all commands and sub-commands, powered by the Commander.js library.

2.2. Core CLI Functional Requirements
FR-CLI-1 (Command Structure): The CLI will be invoked as svc and support a documented set of commands and sub-commands. All commands MUST respond to a --help flag.

FR-CLI-2 (Configuration Discovery): The CLI MUST automatically discover the service.yml file by searching upwards from the current directory. An optional --manifest / -m flag MUST be supported to specify an explicit path.

FR-CLI-3 (Output & Logging): The CLI MUST support both human-readable text output (default) and structured JSON output (via a --ci flag). A --verbose / -v flag MUST enable DEBUG level logging.

FR-CLI-4 (Error Handling): The CLI MUST use standard POSIX exit codes (0 for success, non-zero for failures) and provide clear, actionable error messages, referencing line numbers in the manifest where possible.

3. The CLI Command Suite
This section details the full suite of commands available to developers and platform engineers.

3.1. Project Initialization & Validation
svc init
Purpose: Scaffolds a new, compliant service from a pre-defined template, creating the foundational files for a developer to get started in minutes.

Acceptance Criteria:

AC-SI-1 (Interactive Prompting): Running svc init MUST launch an interactive survey that prompts the user for Service Name, Owner, Compliance Framework, and an Initial Pattern (e.g., lambda-api-with-db).

AC-SI-2 (Template Generation): Based on the survey answers, the command MUST generate a complete project structure including a pre-filled service.yml, boilerplate application code in src/, a .gitignore, and a patches.ts stub.

svc validate
Purpose: Performs a fast, local-only validation of the service.yml manifest syntax and schema without needing AWS credentials or network access.

Implementation Detail: This command executes only the "Parsing" and "Schema Validation" stages of the Manifest Validation Pipeline.

3.2. Local Development & Testing
The Goal: Create a fast, high-fidelity inner development loop.

Command

Purpose & How It Works

Example Usage

svc local up

Starts a local, ephemeral cloud environment. As defined in the "Ephemeral Environment Standard," this command reads the localstack-environment component from the manifest, dynamically generates a docker-compose.yml, and starts a LocalStack container with all the required emulated AWS services.

svc local up

svc test

Runs application tests with an auto-configured environment. This command is a smart wrapper around the native test runner (e.g., jest). Before running the tests, it first reads the service.yml and automatically injects all the necessary mock environment variables that the application code would expect.

svc test

3.3. Introspection & Visualization
The Goal: Provide deep, actionable insight into the service's architecture and cost before deployment.

Command

Purpose & How It Works

Example Usage

svc graph

Generates a visual architecture diagram. This command integrates the open-source cdk-dia tool. It first runs a local synthesis (svc plan --local) to generate the cloud assembly. It then runs cdk-dia against this directory to produce a high-quality visual diagram of all components and their relationships.

svc graph --output-file arch.png

svc cost

Provides a pre-deployment cost estimate. This command integrates the open-source infracost tool. It first runs svc plan to generate the final CloudFormation template. It then runs infracost breakdown --path template.json to produce a detailed, itemized cost report.

svc cost --env prod-us-west-2

3.4. Deployment & Operations
svc plan
Purpose: To perform a full validation and synthesis of the service manifest, providing a comprehensive preview of the proposed changes before deployment.

Acceptance Criteria (The Manifest Validation Pipeline):

Stage 1 (Parsing): The pipeline MUST ingest the service.yml file and correctly reject files with invalid YAML syntax.

Stage 2 (Schema Validation): The pipeline MUST validate the parsed object against a master JSON Schema dynamically composed from the base schema and the schemas of all registered components.

Stage 3 (Context Hydration): The pipeline MUST identify the target environment and compliance framework, then correctly resolve all ${env:...} variables according to the established configuration precedence chain.

Stage 4 (Semantic Validation): The pipeline MUST verify that all binds and ${ref:...} directives point to valid components within the manifest.

shinobi diff

Purpose: Provide an environment-aware drift detection workflow by comparing the synthesized CloudFormation template with the active stack in the target AWS account. The command reuses the svc plan synthesis pipeline, fetches the deployed stack template, and emits a structured summary of additions, removals, and property-level modifications. CI pipelines MUST treat a non-zero exit code (3) as "changes detected" so deployments can be gated until the diff is reviewed.

Example usage: shinobi diff --file service.yml --env dev --region us-east-1

shinobi destroy

Purpose: Perform a controlled teardown of the CloudFormation stack that backs a service manifest. The command resolves the stack name the same way as synth/plan, prompts for confirmation (unless --yes is supplied), and waits until CloudFormation reports the deletion has completed. In CI mode the --json flag emits machine-readable status while --yes suppresses the interactive prompt.

Example usage: shinobi destroy --file service.yml --env dev --yes

Command

Purpose & How It Works

Example Usage

svc up

Deploys the service to a specified environment. This command first runs the full svc plan logic internally. In a CI/CD context, it deploys from a pre-planned, versioned artifact to ensure deterministic deployments.

svc up --env dev-us-east-1

svc outputs

Displays the outputs of a deployed service. After a successful svc up, this command queries the deployed CloudFormation stack for its Outputs section and displays them in a clean, human-readable format.

svc outputs --env prod-us-east-1

svc logs

Tails the logs for a specific component. This command uses the service and component name to look up the correct CloudWatch Log Group and provides a real-time, streaming tail of the logs directly in the developer's terminal.

svc logs api --env dev --since 1h

svc exec

Opens a shell session into a running container. A user-friendly wrapper around aws ecs execute-command that automatically looks up the necessary cluster, service, and task IDs.

svc exec worker --env dev

svc down

Tears down a deployed service environment. A safe wrapper around cdk destroy that always prompts for confirmation, especially when targeting a production environment.

svc down --env feature-branch-xyz

3.5. Platform Contribution & Governance
Command

Purpose & How It Works

Example Usage

svc audit

Runs on-demand compliance and best-practice checks. This is the user-facing entry point for our "Aspirational Standards," with subcommands like svc audit iam and svc audit dependencies.

svc audit iam --service my-api

svc generate

Scaffolds new entities. This command has subcommands for platform contributors, such as svc generate component, which provides an interactive survey to generate a complete, best-practice package for a new component.

svc generate component

svc inventory

Analyzes an existing CDK codebase to find reusable patterns. This command uses ts-morph to parse a codebase, count L2 construct usage, and identify common groupings that are strong candidates for new platform components.

svc inventory --directory ../legacy-service

svc migrate

Safely converts a traditional CDK app to a platform manifest. This command synthesizes an existing CDK stack, reverse-engineers it into a service.yml manifest, and creates a logical-id-map.json to ensure a non-destructive migration.

svc migrate --stack MyOldApiStack

3.5. Platform Contribution & Governance
The Goal: Empower platform engineers and developers to safely audit, extend, and manage the platform's ecosystem.

Command

Purpose & How It Works

Example Usage

svc audit

Runs on-demand compliance and best-practice checks. This is the user-facing entry point for our "Aspirational Standards." It has subcommands that developers and security teams can run against a deployed service: <br> - svc audit iam: Runs the automated least-privilege IAM audit. <br> - svc audit dependencies: Runs the dependency analysis for deprecation planning.

svc audit iam --service my-api

svc generate

Scaffolds new entities. This command has subcommands for platform contributors, such as svc generate component, which provides an interactive survey that generates a complete, best-practice package for a new component according to our "Component Scaffolding Standard."

svc generate component

svc inventory

Analyzes an existing CDK codebase to find reusable patterns. This command uses ts-morph to parse a target codebase, count the frequency of L2 construct usage, and identify common groupings that are strong candidates for new, high-value platform components.

svc inventory --directory ../legacy-service

svc migrate

Safely converts a traditional CDK app to a platform manifest. This command synthesizes an existing CDK stack, reverse-engineers its resources into a service.yml manifest, and creates a logical-id-map.json to ensure a non-destructive migration that preserves the state of existing resources.

svc migrate --stack MyOldApiStack

4.0 Platform & Environment Management Utilities
The Goal: Provide safe, auditable, and user-friendly commands for managing the platform's configuration, secrets, and the CLI tool itself.

Command

Purpose & How It Works

Example Usage

svc env

Manages the platform's environment configurations. This command group interacts with the segregated /config/{framework}.yml files. <br> - svc env list: Shows all configured environments. <br> - svc env show: Displays the detailed configuration for a specific environment. <br> - svc env bootstrap: The on-demand tool for SREs to discover and refresh the static infrastructure map (environments.json) by querying live AWS accounts.

svc env show prod-us-west-2

svc secret

Manages the runtime values of secrets. This is a safe wrapper around the aws secretsmanager CLI that is scoped to a specific service. It reads the manifest to find the correct secret ARN. <br> - svc secret set <key> <value>: Sets a secret value. <br> - svc secret get <key>: Retrieves a secret value. <br> - svc secret list: Lists all secrets managed by the service. <br> - svc secret delete <key>: Deletes a secret value.

svc secret set DB_PASSWORD "..." --env dev

svc platform

Provides meta-commands for the CLI tool itself. This group of commands helps users manage their installation of the platform tooling. <br> - svc platform version: Shows the current version of the @platform/core-engine. <br> - svc platform update: Checks for and installs new versions of the core engine and component packages. <br> - svc platform doctor: Runs a series of diagnostic checks to ensure the user's environment is correctly configured (e.g., AWS credentials, Docker, cdk-dia installed).

svc platform update
