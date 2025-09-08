Comprehensive Test Plan: Abstract ConfigBuilder
Purpose: This document provides the complete set of unit and integration test cases required to validate the functionality, correctness, and resilience of the abstract ConfigBuilder class. The ConfigBuilder is the core engine for the platform's 5-layer configuration precedence chain, and its reliability is paramount.

Test Setup & Mocks
Mock Component: A MockComponentConfigBuilder will be created that extends the abstract ConfigBuilder. Its only job is to provide a simple set of hardcoded fallbacks for testing purposes.

Mock Filesystem: A mock filesystem will be used to create virtual /config/{framework}.yml files, allowing us to test the file loading and parsing logic without actual file I/O.

Mock Context & Spec: The tests will use mock ComponentContext and ComponentSpec objects that can be manipulated to simulate different environments, compliance frameworks, and user overrides.

Test Suites & Cases
1. Layer 1: Hardcoded Fallbacks
Focus: Validate that the lowest-priority defaults are applied correctly when no other configuration is present.

Test Case ID

Test Case Description

Test Type

TC-CB-L1-01

Given no other configuration layers are present, when buildSync() is called, then the final configuration MUST exactly match the object returned by the concrete builder's getHardcodedFallbacks() method.

Unit

2. Layer 2: Segregated Platform Configuration
Focus: Validate the dynamic loading, parsing, and merging of the correct, framework-specific platform configuration file.

Test Case ID

Test Case Description

Test Type

TC-CB-L2-01

Given the context's complianceFramework is commercial, when buildSync() is called, then the builder MUST load and parse /config/commercial.yml.

Unit

TC-CB-L2-02

Given the context's complianceFramework is fedramp-high, when buildSync() is called, then the builder MUST load and parse /config/fedramp-high.yml.

Unit

TC-CB-L2-03

Given a value is defined in both Layer 1 (hardcoded) and Layer 2 (platform config), when buildSync() is called, then the final configuration MUST contain the value from the platform config file (Layer 2).

Unit

TC-CB-L2-04

Given a platform config file exists but is missing a defaults.<component-type> section for the current component, when buildSync() is called, then the builder MUST throw a clear, user-friendly error.

Unit

TC-CB-L2-05

Given an unknown complianceFramework is provided in the context, when buildSync() is called, then the builder MUST throw a clear error listing the supported frameworks.

Unit

TC-CB-L2-06

Given a platform config file contains invalid YAML syntax, when buildSync() is called, then the builder MUST throw a clear YAML parsing error.

Unit

3. Layer 3: Service-Level Environment Configuration
Focus: Validate the merging of service-level environment defaults from the service.yml manifest. (Note: These tests will drive the implementation of the // TODO in the _getEnvironmentConfiguration method).

Test Case ID

Test Case Description

Test Type

TC-CB-L3-01

Given a spec contains an environments block with a default for the current environment, when buildSync() is called, then the value from the environments block (Layer 3) MUST override any value from the platform config (Layer 2).

Unit

TC-CB-L3-02

Given a spec uses ${env:myKey} interpolation, when buildSync() is called, then the builder MUST correctly substitute the value from the environments.<current-env>.defaults.myKey path.

Unit

TC-CB-L3-03

Given a spec uses ${env:myKey} interpolation but the key does not exist in the environment defaults, when buildSync() is called, then the builder MUST leave the ${env:myKey} string intact without throwing an error (to allow for deferred resolution).

Unit

4. Layer 4: Component-Level Overrides
Focus: Validate the merging of component-specific config from the service.yml manifest.

Test Case ID

Test Case Description

Test Type

TC-CB-L4-01

Given a spec contains a config block, when buildSync() is called, then any value in the config block (Layer 4) MUST override values from all lower-priority layers (Layers 1, 2, and 3).

Unit

TC-CB-L4-02

(Deep Merge) Given a spec.config block only overrides a single nested property (e.g., storage.rootVolumeSize), when buildSync() is called, then the final configuration MUST contain the overridden value for rootVolumeSize while preserving all other sibling properties (e.g., storage.rootVolumeType) from lower-priority layers.

Unit

5. Layer 5: Governance Policy Overrides
Focus: Validate the conditional application of the governance "escape hatch". (Note: These tests will drive the implementation of the // TODO in the _getPolicyOverrides method).

Test Case ID

Test Case Description

Test Type

TC-CB-L5-01

(Non-Prod) Given the context's environment is dev and the spec contains a policy.overrides block, when buildSync() is called, then the values from the policy override MUST be applied, winning over all other layers.

Unit

TC-CB-L5-02

(Prod) Given the context's environment is prod and the spec contains the same policy.overrides block, when buildSync() is called, then the builder MUST ignore the policy override, and the final configuration MUST NOT contain the values from that block.

Unit

TC-CB-L5-03

(Prod with Error) (Optional) An alternative implementation for TC-CB-L5-02 where the builder MUST throw a PolicyViolationError when a policy override is attempted in a prod environment.

Unit

6. Integration & End-to-End Tests
Focus: Validate the complete, end-to-end configuration resolution for a real component.

Test Case ID

Test Case Description

Test Type

TC-CB-IT-01

(Full Precedence Chain) Create a complete test case for a real component (e.g., Ec2InstanceConfigBuilder) where a value (e.g., instanceType) is defined in all five layers. Run buildSync() and verify that the final value is the one from the highest-priority layer that defined it.

Integration

TC-CB-IT-02

(Real Component Synthesis) Run the svc plan command against a manifest that uses all five configuration layers. Verify that the final synthesized CloudFormation template snapshot reflects the correctly resolved and merged values for the resources.

Integration

