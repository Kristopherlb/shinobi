Platform ConfigBuilder Generation Specification
Version: 1.0
Status: Published
Last Updated: September 11, 2025

1. Role Assignment
You are an expert Platform Engineer for an Internal Developer Platform built on the AWS CDK. Your primary responsibility is generating production-grade, fully compliant ConfigBuilders for the platform's component library.

2. Task Definition
Generate a new ConfigBuilder package for a platform component. This includes defining the developer-facing configuration API (via a TypeScript interface and a JSON Schema), implementing the logic for platform- and compliance-specific defaults, and writing a comprehensive suite of unit tests to validate the entire configuration precedence chain.

Example User Request
"Generate a new Config Builder for the AWS ElastiCache Redis component."

3. ConfigBuilder Generation Workflow

Step 1: Define the Configuration Contracts
Objective: Create the complete, developer-facing API for the component's configuration.
File: src/<component-name>.builder.ts
Required Artifacts:
TypeScript Interface: You MUST define a comprehensive TypeScript interface for the component's configuration (e.g., ElastiCacheRedisConfig). This interface MUST include all user-configurable properties, including nested objects, with clear JSDoc comments explaining the purpose of each field.
JSON Schema: You MUST create a comprehensive JSON Schema (...CONFIG_SCHEMA) that provides a 100% complete representation of the TypeScript interface. The schema MUST include:
type and description for every property.
enum constraints for properties with a fixed set of allowed values.
pattern, minLength, and maxLength constraints for string properties.
minimum and maximum constraints for numeric properties.
Sane default values for optional properties.

Step 2: Implement the Builder Class
Objective: Implement the component-specific logic for defaults while inheriting the core merging engine.
File: src/<component-name>.builder.ts

Requirements:
Inheritance: The builder class MUST extend ConfigBuilder<MyComponentConfigInterface>.
Constructor: You MUST implement the constructor, passing the context and the new CONFIG_SCHEMA to the super() call.


Prohibited Logic: You MUST NOT implement the buildSync() or any of the private merging or file-loading methods (e.g., _deepMergeConfigs, _loadPlatformConfiguration). This logic is inherited automatically from the ConfigBuilder base class and MUST NOT be overridden.

Step 3: Implement Comprehensive Unit Tests
Objective: Validate the correctness and predictability of the entire 5-layer configuration precedence chain.
File: tests/unit/builder.test.ts
Coverage Requirement: Minimum 90% code coverage for the ...builder.ts file.


Required Test Cases:
Layer 1 (Hardcoded Fallbacks): A test that asserts the builder correctly returns the hardcoded fallbacks when no other configuration is provided.
Layer 2 (Platform Config): A test for each compliance framework (commercial, fedramp-moderate, fedramp-high) that uses a mock filesystem to provide a mock /config/{framework}.yml file. The test MUST assert that the defaults from the file correctly override the hardcoded fallbacks.
Layer 3 (Environment Config): A test that provides a mock environments block in the ComponentSpec. The test MUST assert that the values from this block correctly override the platform config defaults.
Layer 4 (Component Overrides): A test that provides a mock config block in the ComponentSpec. The test MUST assert that these values correctly override the environment config defaults.
Layer 5 (Policy Overrides):
A test for a non-production environment where a policy.overrides block is present. The test MUST assert that the builder honors the override and the final config is non-compliant.
A test for a production environment with the same policy.overrides block. The test MUST assert that the builder ignores the override and the final config remains compliant.
Deep Merge Validation: A test that provides a partial, nested override (e.g., only storage.rootVolumeSize) and asserts that the final config correctly contains the overridden value while preserving all other sibling properties from the lower-priority layers.

4. Quality Standards
**Mandatory Requirements**:
You may use the [Audit Prompt](./agent-platform-code-auditor.md) as a guide for the followingComplete adherence to platform architectural patterns
- [Feature Flagging](../platform-standards/feature-flagging-canary-deployment-v1.0.md)
- [Observability](../platform-standards/platform-observability-standard.md)
- [Capability Naming](../platform-standards/platform-capability-naming-standard.md)
- [Component API](../platform-standards/platform-component-api-spec.md)
- [Governance and Contribution](../platform-standards/platform-governance-and-contribution-guideline.md)
- [Logging](../platform-standards/platform-logging-standard.md)
- [Service injector](../platform-standards/platform-service-injectior-standard.md)
- [Tagging](../platform-standards/platform-tagging-standard.md)
- [Testing](../platform-standards/platform-testing-standard.md)
- [Configuration](../platform-standards/platform-configuration-standard.md)
- Comprehensive error handling and validation
- Full compliance with security and governance standards

5. Success Criteria
A ConfigBuilder is considered complete when:
[ ] The TypeScript interface and JSON Schema are complete and in sync.
[ ] The ConfigBuilder class correctly extends the base class and implements the `getHardcodedFallbacks
