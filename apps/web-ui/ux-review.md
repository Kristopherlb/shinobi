Review of the Shinobi ADP project against the Platform Standards
Introduction

The Shinobi Internal Developer Platform (IDP) is an ambitious effort to provide developers a declarative, component‑based interface for provisioning AWS infrastructure. The project combines a CLI (svc init/validate/plan/up), a library of reusable components, compliance guardrails and an emerging UI layer. To evaluate how well the current implementation aligns with our platform standards and to identify opportunities for improvement, I reviewed the repository (Kristopherlb/shinobi), the published platform standards and the temporary Shinobi UI deployment 
6ce38120-9472-434f-a0af-782f4176f8ae-00-24vm5who6d8pa.worf.replit.dev
. Internal documents such as the Platform CLI Specification, Governance & Contribution Guide, Component API Contract, Configuration Standard, Capability Naming Standard, Observability & Logging Standards and a comprehensive technical review were examined using the GitHub connector.

This report summarizes strengths, gaps and actionable recommendations for aligning Shinobi with the platform’s requirements. It analyses the developer flows from onboarding through operationalization, considers the developer experience, and suggests how an agentic UI (the “Shinobi brain”) can enhance these flows.

1. Overview of the current Shinobi UI

The temporary development UI (the Shinobi ADP Agentic Developer Platform preview) presents a modern dashboard organized into several panels:

Activity timeline (left) – lists recent tasks, status updates and warnings.

Hero section (center) – introduces the platform and provides buttons for a command palette and documentation. Below it, KPI cards show active tasks, system events, AI conversations and critical alerts.

Design system and platform configuration – displays status indicators and shows a sample service.yml manifest configuration with environment defaults and overrides.

Operations and monitoring – includes cards for deployment pipeline, operational monitoring, capabilities catalog and team collaboration. Each card lists tasks or metrics and offers quick links to dig deeper.

AI assistant and generator cards – illustrate the concept of using an AI agent to help build new components and answer questions.

Security & compliance – highlights the platform’s compliance frameworks (commercial, FedRAMP moderate/high) and prompts for evidence export and cdk‑nag suppressions.

Context & citations (right) – shows the current environment, provides quick links to referenced documents and offers actions to export the view or ask the AI assistant.

Although visually appealing, the preview currently functions more as a concept. The command palette, context panel and AI generator hint at the future agentic experience but do not yet provide the end‑to‑end workflows promised in the CLI specifications. Aligning the UI with the platform’s standards will require implementing the full developer journeys described below.

2. Developer flows and alignment with platform standards
2.1 Onboarding & service creation

The Platform CLI Specification defines a compelling “first 15 minutes” experience. Developers run svc init to scaffold a new service. The spec mandates an interactive wizard that prompts for the service name, owner, compliance framework and initial pattern and then generates a service manifest (service.yml), boilerplate code (src/), a standard .gitignore and a patches.ts stub
github.com
. The svc validate command performs fast schema validation, and svc plan resolves environment variables and performs semantic checks
github.com
.

Areas for alignment

Interactive wizard in the UI. The UI should mirror the CLI’s onboarding flow. Instead of a generic “Create new service” card, provide a multi‑step form (service name, owner/team, compliance framework, initial pattern). Use the published manifest JSON Schema to validate inputs client‑side and supply sensible defaults. This reinforces the declarative philosophy and reduces configuration errors.

Contextual help & examples. The CLI spec stresses that all commands must be self‑documenting and respond to --help flags
github.com
. The UI should embed this help: inline descriptions of each field, link to examples, and the ability to preview the generated service.yml before committing it.

Progressive disclosure. Encourage adoption by showing only required fields initially. Advanced options (e.g., overrides, labels) can be collapsed under expandable sections.

Immediate validation & feedback. Use the Platform Tagging, Configuration and Capability Naming standards to highlight missing or malformed fields. For instance, ensure the manifest includes mandatory tags like service-name, component-type and environment
github.com
 and enforce the 5‑layer configuration precedence chain for overrides
github.com
github.com
.

2.2 Manifest editing & validation

After scaffolding, developers iterate on the service.yml. The manifest validation pipeline defined in the CLI spec consists of parsing, schema validation, context hydration and semantic & reference validation
github.com
. The Platform Configuration Standard defines the five configuration layers: hardcoded fallbacks, platform defaults, environment defaults, component overrides and policy overrides
github.com
github.com
. The Platform Component API requires each component to supply a JSON schema and a ConfigBuilder to merge these layers deterministically
github.com
.

Areas for alignment

Inline editor & schema‑aware validation. Add a schema‑aware editor in the UI that highlights validation errors (e.g., missing required fields, wrong types) and offers autocompletion based on the JSON schema. On every save, run the parsing and schema validation stages and display actionable error messages referencing the offending line
github.com
.

Visualization of the precedence chain. Developers often struggle to understand why a value resolves to a specific configuration. Provide a “resolved value” inspector that lists each layer (fallback, platform, environment, overrides, policy) and shows where the final value came from
github.com
github.com
. This demystifies configuration and prevents drift.

Semantic validation & policy packs. Integrate the policy packs described in the review document (e.g., FedRAMP Moderate/High enforcement, semantic rules like Multi‑AZ required) into the validation flow
github.com
. Surface failing policies in the UI with remediation guidance and provide a mechanism to request and track suppressions (owner, justification, expiry)
github.com
.

Capability binding guidance. When defining binds or triggers, the UI should present a list of available components and their capabilities using the Capability Naming Standard (e.g., db:postgres, queue:sqs)
github.com
. Enforce the <category>:<type> naming convention and show the data shape contract for each capability (fields like host, port, secretArn, etc.)
github.com
.

2.3 Local development & testing

The CLI spec offers commands for local development: svc local up starts an emulated environment using LocalStack, svc test runs tests with automatically injected environment variables, svc graph generates architecture diagrams, and svc cost estimates cost
github.com
github.com
.

Areas for alignment

One‑click local stack. Provide a “Start local environment” button that executes svc local up behind the scenes. Display the status of LocalStack services, container logs and the endpoints to test locally. Offer a toggle to seed test data and to run svc test directly from the UI.

Visual graph and cost explorer. Embed the output of svc graph (Mermaid or cdk‑dia diagrams) and svc cost (infracost reports) into the UI. This gives developers immediate architectural insight and cost awareness before deploying to AWS.

Hot reload & debugging. Encourage real‑time feedback by supporting hot‑reloading for Lambda APIs and watchers for container builds. Document how to attach debuggers to LocalStack services.

2.4 Deployment & operations

The deployment flow involves running svc plan to produce a resolved configuration and preview resource changes, then svc up to deploy. The CI/CD pipeline described in the review uses Nx/Turbo to test packages, Changesets to version components, policy pack enforcement, preview environments and evidence export
github.com
.

Areas for alignment

CI/CD integration via Dagger. To deliver deterministic builds and deployments, generate a Dagger pipeline that packages each component, runs svc validate, svc plan and svc up, and publishes artifacts to internal Artifactory. The pipeline should implement the multi‑stage process: validate on PR, plan and attach artifacts to PR, release packages on main, deploy preview environments and handle evidence export to S3
github.com
.

Preview plans and diff viewer. The UI should display the plan output with highlighted diffs: new resources, changes to existing stacks and policy impacts. Provide drill‑downs to see the CloudFormation diff and link to the generated compliance evidence. This helps developers and reviewers make informed decisions.

One‑click deploy with approval gates. Offer a “Promote” button that triggers svc up for a given environment but enforce manual approval for production. Surface compliance status, test results, SBOMs and change logs to approvers.

2.5 Monitoring, observability & runtime support

The platform mandates OpenTelemetry instrumentation and structured JSON logging. The observability standard states that instrumentation is not optional, and the platform handles it centrally; developers only need to use the provided SDK
github.com
. The logging standard requires logs to include fields like timestamp, level, service context, environment, trace and span IDs, message and optional metadata
github.com
. The configuration standard highlights the need for secrets to be stored in AWS Secrets Manager and for configuration to be retrieved via SSM or AppConfig
github.com
.

Areas for alignment

Observability dashboard. Integrate with the platform’s OTel collector and automatically surface traces, metrics and logs per component. Provide pre‑built dashboards showing latency, error rates, cold starts, memory/CPU utilization and the success/failure of binds/triggers. Offer SLO templates for default components
github.com
.

Structured log viewer. Create a log explorer that filters logs by service, component, severity and trace ID. Use the JSON schema from the logging standard to parse and display fields, correlation IDs and link logs to traces
github.com
.

Health alerts & incident response. Display alerts derived from CloudWatch alarms (e.g., high error rates, CPU/memory issues) and integrate with incident management tools. Surface cdk‑nag findings and compliance violations as alerts.

2.6 Secrets & configuration management

The platform distinguishes infrastructure configuration (in the manifest) from application configuration/secrets, which should live in SSM Parameter Store, AWS AppConfig or Secrets Manager
github.com
. The developer workflow for secrets involves provisioning the secret container through the manifest, then populating values via the CLI or pipeline
github.com
.

Areas for alignment

Secrets lifecycle UI. Provide a panel showing all secrets declared in the manifest, their ARNs, current environment values (masked) and guidance for populating them. Offer one‑click retrieval or rotation via the CLI for dev environments, and instruct CI/CD pipelines on how to inject secrets for higher environments.

Configuration store selection. When binding to configuration components (ssm-parameter or app-config-profile), offer a comparison of Parameter Store vs. AppConfig and recommend the appropriate choice based on the feature (dynamic flags vs. static configuration)
github.com
.

2.7 Component development & repository structure

The Governance & Contribution Guide emphasizes that components are contracts: they must encapsulate a single AWS resource, expose a versioned schema and outputs, embed platform standards (tags, logging, security) and avoid application‑specific logic
github.com
. The Component API Contract details the IComponent interface, BaseComponent helpers and the AI agent instructions for scaffolding new components, including code structure, config builder, creator and test files
github.com
github.com
. The review document calls for a package‑per‑component architecture using pnpm workspaces, Nx/Turborepo and Changesets, with ≥90% test coverage
github.com
github.com
.

Areas for alignment

Enforce package‑per‑component structure. Restructure the repository so each component (e.g., lambda-api, rds-postgres) lives in its own package under packages/components/ with its own package.json, schema, builder, tests and README. A packages/core package should house the manifest parser, planner and binder engine, and packages/cli should hold the CLI logic
github.com
.

Generation via agentic UI. The UI’s “component generator” should implement the AI agent instructions: prompt the developer for the target AWS service (e.g., ElastiCache Redis), generate the full directory structure (component class, builder, creator, tests), implement the synth() method using the BaseComponent helpers and register capabilities via _registerCapability()
github.com
. It should also generate a detailed README, JSON schema and tests (≥90% coverage)
github.com
. This ensures new components automatically comply with tagging, logging and configuration standards.

Release discipline. Integrate pnpm workspaces and Nx/Turbo to manage multiple packages and run affected tests. Use Changesets to version packages, generate changelogs and create PRs for releases. Ensure build artifacts are published to an internal Artifactory (npm registry) and container registry.

Governance & code review. Use the contribution guidelines to enforce DOs (encapsulate one resource, expose a clear schema, embed standard tags, write comprehensive tests) and avoid DO NOTs (application‑specific logic, environment‑specific logic, pass‑through properties)
github.com
. The UI should surface a checklist when a developer generates or modifies a component, ensuring they adhere to these rules.

3. How the agentic Shinobi brain can enhance developer experience

The vision of an agentic UI is to provide an intelligent, conversational layer on top of the platform. To realize this vision, the UI should harness the underlying standards and workflows to offer proactive assistance:

Context‑aware command palette – Recognize the developer’s current context (e.g., editing a manifest, investigating a deployment) and propose relevant actions: “Would you like to run svc validate?” or “Generate a plan for dev-us-east-1?” It should support natural language queries like “Add a new S3 bucket component” and convert them into structured changes.

Inline explanations – Use svc explain (planned in the roadmap) to convert sections of the manifest into plain‑English descriptions. When a developer hovers over a binding or capability, the agent should explain what it does, the IAM policies it generates and any compliance implications
github.com
.

Smart generation & refactoring – The agent can scaffold new components using the AI agent instructions and recommend improvements to existing components (e.g., “Consider moving this override to environment defaults” or “This IAM policy is overly permissive – here’s a safer configuration”).

Proactive compliance & cost insights – Monitor the manifest and plan outputs to detect potential compliance violations (e.g., missing encryption, public S3 bucket) and cost anomalies. Suggest remediation steps or alternative architectures.

Integration with Backstage/MCP – The UI should not exist in isolation. Surface information via Backstage plugins (scaffolder, scorecards, tech docs) and let the agent operate across MCP to list components, lint manifests and propose suppressions
github.com
.

4. Summary of key alignment actions
Area	Key standard/guideline	Observed gap	Suggested improvement
Onboarding	CLI spec requires interactive svc init wizard and clear help messages
github.com
github.com
  UI currently has a generic “launch command palette” without a guided onboarding flow	Implement a multi‑step form mirroring svc init; validate inputs with JSON Schema; provide contextual help and default patterns.
Manifest validation	Manifest pipeline stages and configuration precedence chain
github.com
github.com
  UI lacks a manifest editor; no visibility into resolved values or validation errors	Add a schema‑aware editor with inline errors; show resolved configuration with layer origins; enforce capability naming and mandatory tags.
Policy enforcement	Policy packs & compliance frameworks with suppressions workflow
github.com
  No UI support for policy packs, suppressions or evidence export	Integrate policy pack checks into validation; display failing controls; provide a suppression request workflow with owner/justification/expiry; surface OSCAL evidence and cdk‑nag suppressions.
Local development	svc local up, svc graph, svc cost, svc test support fast feedback
github.com
github.com
  The UI hints at local dev but doesn’t execute commands	Provide one‑click local environment startup with status; embed graph diagrams and cost reports; integrate test execution.
Deployment & CI/CD	Pipeline should validate manifests, enforce policy packs, publish packages and deploy preview environments
github.com
  UI does not show plan diffs or handle deployments	Generate Dagger pipelines that run svc validate/plan/up; display plan diffs and compliance status; enable one‑click deployments with approval gates.
Observability & logging	OTel instrumentation mandatory; logs must be structured JSON
github.com
github.com
  UI lacks log viewer and trace/metric dashboards	Integrate with OTel collector; provide dashboards for latency, errors and cost; include structured log explorer with correlation IDs.
Secrets & configuration	Secrets must be managed via Secrets Manager; config via SSM/AppConfig; 5‑layer precedence
github.com
github.com
  UI doesn’t surface secrets or config layers	Add secrets management panel; guide developers on populating values; enforce proper store selection and layering.
Component development	Components are contracts; one resource per package; package‑per‑component; tests & docs
github.com
github.com
  Repo still monolithic; UI shows concept of agent generator but not full scaffolding	Restructure repo into packages; update UI generator to create full component packages (class, builder, creator, tests, README) following AI agent instructions; enforce 90% test coverage and compliance.
Capability naming	Capability keys must use <category>:<type> format and expose defined data shapes
github.com
github.com
  UI doesn’t enforce capability naming or show data shape contracts	When binding components, show capability catalog and enforce naming; display data shapes to help developers choose correct env var mappings.
Conclusion

Shinobi has laid a strong foundation for a modern Internal Developer Platform. The CLI specification articulates a coherent developer story, and the repository already contains early examples and standards. However, to realize the vision of a paved road that developers willingly adopt, the platform must align fully with the published standards and formalize the end‑to‑end user flows. This requires:

Rigorous implementation of the standards – tagging, logging, observability, configuration precedence, capability naming and governance must be embedded in every component and surfaced to developers.

Structured repository & release engineering – adopt pnpm workspaces, Nx/Turbo, package‑per‑component and Changesets to ensure stability and versioning.

Agentic, schema‑aware UI – provide a guided wizard for service creation, a manifest editor with validation and visualized configuration, integrated local development tools, plan diff viewers, compliance enforcement and secrets management.

Proactive assistance – leverage the agentic Shinobi brain to generate components, explain manifests, suggest improvements, detect anomalies and integrate with Backstage and MCP for discoverability and audits.

By implementing these improvements and leveraging the rich platform documentation, Shinobi can deliver an enterprise‑grade IDP that marries developer ergonomics with governance, security and operational excellence