Milestone 1: The Auditable FedRAMP Core Engine. This document provides the precise, testable requirements for a dual-use platform that can deploy both standard commercial and FedRAMP-compliant constructs.
Comprehensive Acceptance Criteria: Milestone 1
1. The Core Engine & CLI
AC-E1: Manifest Schema Validation
Given a service.yml with a missing required field (e.g., complianceFramework)
When the user runs svc plan
Then the command MUST fail with a clear error message identifying the missing field and its location.
AC-E2: Compliance Framework Selection
Given a service.yml with complianceFramework: fedramp-high
When the user runs svc plan
Then the platform's Governance Engine MUST load and apply the FedRAMP-High policy pack during validation.
AC-E3: Plan Output Clarity
Given a valid service.yml
When the user runs svc plan
Then the CLI output MUST clearly state which Compliance Framework is active (e.g., "Active Framework: fedramp-high") in its summary.
2. The Governance Engine & Policy-as-Code (PaC)
AC-G1: Policy Enforcement by Framework
Given the complianceFramework is set to commercial
And a component is defined that does not enable deletion protection
When svc plan is run
Then the plan SHOULD succeed, possibly with a cdk-nag warning.
AC-G2: Strict FedRAMP Policy Enforcement
Given the complianceFramework is set to fedramp-moderate
And a component like an S3 bucket is defined without enabling server access logging
When svc plan is run
Then the command MUST fail with a critical error message citing the specific FedRAMP control that was violated.
AC-G3: Auditable Suppressions
Given a service.yml contains a governance.cdkNag.suppress block for a FedRAMP control
And the justification or expiresOn field is missing
When svc plan is run
Then the command MUST fail with a validation error stating that all fields are required for a suppression.
3. The Hardened Component Library (rds-postgres example)
These criteria demonstrate how a single component definition behaves differently based on the selected framework.
AC-C1: rds-postgres in Commercial Mode
Given the complianceFramework is commercial
And an rds-postgres component is defined with minimal configuration
When svc plan is run
Then the synthesized AWS::RDS::DBInstance resource MUST have StorageEncrypted: true using a default AWS-managed KMS key.
AC-C2: rds-postgres in FedRAMP Moderate Mode
Given the complianceFramework is fedramp-moderate
And an rds-postgres component is defined with minimal configuration
When svc plan is run
Then the synthesized AWS::RDS::DBInstance resource MUST have StorageEncrypted: true and MUST be configured to use a Customer-Managed KMS Key (CMK) created by the platform with automated rotation enabled.
AC-C3: rds-postgres in FedRAMP High Mode
Given the complianceFramework is fedramp-high
And an rds-postgres component is defined
When svc plan is run
Then all requirements from AC-C2 must be met, AND the platform must ensure connections to the database use FIPS 140-2 validated endpoints where applicable, and detailed audit logging is enabled and directed to the central logging account.
AC-C4: Cross-Framework Overrides
Given the complianceFramework is commercial
And an rds-postgres component's overrides explicitly set a configuration required by FedRAMP (e.g., specifying a CMK)
When svc plan is run
Then the override MUST be applied successfully, allowing a commercial workload to opt-in to higher security standards.
4. The Resolver, Binders & Escape Hatch
AC-R1: Compliant Binding
Given the complianceFramework is fedramp-moderate
And a lambda-worker binds to an rds-postgres component
When svc plan is run
Then the generated IAM policy and Security Group rules MUST adhere to the principle of least privilege as defined by the FedRAMP controls for that interaction.
AC-R2: Escape Hatch in Commercial Mode
Given the complianceFramework is commercial
And a patches.ts file is used to modify a resource
When svc up is run in the CI/CD pipeline
Then the deployment should proceed, and the patch report MUST be logged to the audit feed.
AC-R3: Gated Escape Hatch in FedRAMP Mode
Given the complianceFramework is fedramp-high
And a patches.ts file is modified in a pull request
When the change is pushed to the CI/CD pipeline
Then the pipeline MUST halt and require a manual approval from a user in the pre-configured "Compliance Approvers" group before proceeding with the deployment.
