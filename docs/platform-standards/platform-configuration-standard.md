Platform Configuration Standard
Version: 1.0
Status: Published
Last Updated: September 7, 2025

1. Overview & Vision
This document defines the specification for the platform's configuration management system. A robust, predictable, and flexible configuration model is the foundation of any successful Internal Developer Platform (IDP). It must balance the enterprise's need for centralized governance and security with the developer's need for autonomy and agility.

The vision of this standard is to provide a layered, deterministic configuration system that is both powerful for experts and maintainable by developers who are not Infrastructure-as-Code specialists. By establishing a clear and predictable Configuration Precedence Chain, we ensure that deployments are repeatable, auditable, and that the final state of any resource is the result of a deliberate and transparent merge of platform-wide standards, compliance rules, and application-specific settings. This aligns with the principles of deterministic, static configuration management discussed in "The CDK Book" [cite: 101-102, 106-107].

1.1. Non-Goals
To provide clarity on the scope of this standard, the following are explicitly considered non-goals:

Application Runtime Logic: This standard does not govern the application code that runs within the provisioned infrastructure (e.g., the logic inside a Lambda function). It only governs the configuration of the infrastructure itself and the runtime environment variables provided to it.

Infrastructure State Management: This standard does not manage the state of deployed resources. The platform is stateless and relies on AWS CloudFormation as the authoritative backend for state management.

Dynamic Runtime Lookups: The primary deployment workflow is deterministic. This standard does not support dynamic lookups to external services during the core svc plan or svc up synthesis process.

2. Guiding Principles
Declarative: All configuration MUST be defined declaratively in version-controlled YAML or JSON files. There is no imperative or runtime configuration logic.

Layered & Predictable: The final configuration for any component MUST be the result of a predictable merge of multiple layers, with more specific layers always overriding more general ones.

Segregated & Secure: Configuration data MUST be segregated by compliance framework. The platform MUST NOT load or access FedRAMP configuration when synthesizing a commercial service, and vice-versa.

Deterministic: The platform MUST produce the exact same synthesized output for the same set of configuration inputs and code version. There are no live API lookups during the primary synthesis process.

3. The Configuration Precedence Chain
The final configuration for any component is assembled by the component's ConfigBuilder. The builder merges the following five layers in a strict order of precedence, from lowest (most general) to highest (most specific).

3.1. Security-Sensitive Configuration Requirements
The following types of configuration values MUST NOT be hardcoded in Layer 1 (Hardcoded Fallbacks) and MUST be configured through Layers 2-5:

**Prohibited Hardcoded Values:**
- **CORS Origins**: `allowOrigins` must never contain `['*']` or specific domains - these vary by environment
- **External Access Patterns**: Database connection strings, API endpoints, external service URLs
- **Network Access Rules**: Security group rules, CIDR blocks, port ranges that vary by environment
- **Authentication/Authorization**: OAuth scopes, JWT audiences, API keys, role mappings  
- **Environment-Specific Domains**: DNS names, certificate ARNs, load balancer endpoints
- **Resource Limits**: Production vs development instance sizes, storage capacities, connection pools
- **Compliance-Sensitive Settings**: Encryption policies, audit logging levels, retention periods

**Required Security-Safe Hardcoded Fallbacks:**
- **CORS Origins**: Empty array `[]` (forces explicit configuration)
- **CORS Methods**: Minimal safe methods only (`['GET', 'POST', 'OPTIONS']`)
- **CORS Headers**: Minimal safe headers only (`['Content-Type', 'Authorization']`)
- **CORS Credentials**: Always `false` (never allow credentials by default)
- **Instance Sizes**: Smallest available size (e.g., `db.t3.micro`, `t3.nano`)
- **Network Access**: Most restrictive settings (no public access, minimal ports)
- **Throttling**: Conservative limits (low burst/rate limits)

**Rationale**: Security-sensitive values that vary by deployment context create security vulnerabilities when hardcoded. Empty/minimal defaults force explicit configuration while maintaining safety.

Layer 1: Hardcoded Fallbacks (Lowest Priority)
Priority: 5

Source of Truth: The getPlatformDefaults() method within a component's concrete ConfigBuilder class (e.g., RdsPostgresConfigBuilder).

Purpose & Scope: To provide a safe, "works-out-of-the-box" default for every single property, ensuring that a component can always be synthesized even with a minimal configuration. This is the ultimate fallback and is managed by the Platform Engineering team.

**CRITICAL SECURITY REQUIREMENT**: Hardcoded fallbacks MUST NOT contain security-sensitive values that vary by environment or deployment context. See Section 3.1 for prohibited hardcoded values.

Example: The RdsPostgresConfigBuilder might default instanceClass to db.t3.micro.

Layer 2: Segregated Platform Configuration
Priority: 4

Source of Truth: A set of version-controlled YAML files in the platform's core repository: /config/{framework}.yml (e.g., commercial.yml, fedramp-moderate.yml, fedramp-high.yml).

Purpose & Scope: To define the platform-wide, centrally-managed defaults for each compliance framework. This is the primary mechanism for enforcing governance and best practices. It is managed by the DevOps/Platform team. The ConfigBuilder dynamically loads the single, correct file based on the complianceFramework specified in the service.yml.

Example (/config/fedramp-moderate.yml):

defaults:
  rds:
    instanceClass: "db.r5.large"

Layer 3: Service-Level Environment Configuration
Priority: 3

Source of Truth: The environments block at the top of a developer's service.yml manifest. This block can also use a $ref to import definitions from a shared file.

Purpose & Scope: The primary place for developers to define how their specific service should behave differently across environments (e.g., dev vs. prod). This is where they set different instance sizes, scaling rules, or feature flags.

Example (service.yml):

environments:
  qa-us-west-2:
    defaults:
      dbInstanceClass: "db.r5.xlarge"
  prod-us-west-2:
    defaults:
      dbInstanceClass: "db.r5.2xlarge"

Layer 4: Component-Level Overrides
Priority: 2

Source of Truth: The overrides block directly on a component's definition within the service.yml manifest.

Purpose & Scope: To provide a specific, fine-grained override for a single component instance that needs to deviate from the shared service or platform defaults. This is a common and encouraged practice for tuning.

Example (service.yml):

components:
  - name: reporting-replica-db
    type: rds-postgres
    overrides:
      instance:
        class: "db.r5.4xlarge"

Layer 5: Governance Policy Overrides (Highest Priority)
Priority: 1

Source of Truth: The policy.overrides block directly on a component's definition within the service.yml manifest.

Purpose & Scope: To provide a sanctioned, auditable "escape hatch" for a developer to request an exception to a strict compliance control for a non-production environment. The ConfigBuilder is responsible for deciding whether to honor this request.

Example (service.yml):

components:
  - name: temp-data-bucket
    type: s3-bucket
    policy:
      overrides:
        compliance:
          storageEncrypted: false # Requesting an exception
      justification: "This bucket is for temporary, non-sensitive test data in dev. JIRA: TKT-123"

4. Interpolation & Referencing
The platform supports two forms of variable substitution to link configuration values.

env Interpolation: The ${env:key} syntax is used to reference a value from the service-level environments block (Layer 3).

ref Interpolation: The ${ref:componentName.capabilityKey.attribute} syntax is used for read-only references to the outputs of other components within the same manifest. This does not create a security binding.

5. Putting It All Together: A Comprehensive Example
The following example demonstrates how the layers work together to determine the final instanceClass for a database.

/config/fedramp-moderate.yml (Layer 2)

defaults:
  rds:
    instanceClass: "db.r5.large" # FedRAMP baseline

service.yml (Layers 3 & 4)

service: shipping-api
owner: team-logistics
complianceFramework: fedramp-moderate

environments:
  qa-us-west-2:
    defaults:
      dbInstanceClass: "db.r5.xlarge" # QA needs more power than the baseline
  prod-us-west-2:
    defaults:
      dbInstanceClass: "db.r5.2xlarge" # Prod needs the most power

components:
  - name: primary-db
    type: rds-postgres
    overrides:
      instance:
        class: ${env:dbInstanceClass} # Uses the value from the environments block

  - name: reporting-replica-db
    type: rds-postgres
    overrides:
      instance:
        class: "db.r5.4xlarge" # Specific override for this component

Resolution Outcome
For primary-db in qa-us-west-2:

The base value is set to db.r5.large (from Layer 2).

The overrides block points to ${env:dbInstanceClass}. The engine looks this up in the environments.qa-us-west-2.defaults block and finds the value db.r5.xlarge (Layer 3).

Because Layer 3 has a higher priority than Layer 2, the final instance class is db.r5.xlarge.

For primary-db in prod-us-west-2:

The base value is db.r5.large (Layer 2).

The ${env:dbInstanceClass} variable resolves to db.r5.2xlarge from the prod-us-west-2 environment block (Layer 3).

The final instance class is db.r5.2xlarge.

For reporting-replica-db in prod-us-west-2:

The base value is db.r5.large (Layer 2).

The environments.prod-us-west-2.defaults block sets the value to db.r5.2xlarge (Layer 3).

However, the component has a direct overrides block setting the class to db.r5.4xlarge (Layer 4).

Because Layer 4 has a higher priority in this case, the final instance class is db.r5.4xlarge.

6. Technical Implementation in the ConfigBuilder
The abstract ConfigBuilder class is the engine that enforces this precedence chain. The buildSync() method, which is called by every component during the synth phase, orchestrates the entire process.

buildSync() Workflow
Load Platform Config: The builder first identifies the complianceFramework from the ComponentContext and loads the corresponding segregated configuration file (e.g., /config/fedramp-moderate.yml). This becomes the base for Layer 2.

Assemble Layers: The builder gathers all five configuration layers into an ordered list.

Deep Merge: It performs a deep merge of the layers in reverse priority order (from Layer 1 to Layer 5). The deep merge ensures that nested objects are merged correctly, and a value in a higher-priority layer will always overwrite a value from a lower-priority layer.

Interpolate Variables: The builder then makes a pass over the merged configuration to resolve all ${env:...} variables.

Validate Schema: Finally, the fully resolved configuration object is validated against the component's specific JSON Schema to ensure its correctness and type safety before being returned.

7. Configuration Lifecycle Management
Proper management of the various configuration sources is critical for the platform's stability and security.

For Platform Engineers
Segregated Config Files (/config/*.yml): These files are considered core platform code. Any changes MUST be made via a pull request and go through a formal code review process. They are the primary tool for the platform team to roll out new best practices or update default configurations (e.g., changing the default instance type to a newer generation).

Component ConfigBuilder Fallbacks: The hardcoded fallbacks (Layer 1) should be reviewed periodically but should only be changed when there is a major version update to a component, as they represent the component's most fundamental baseline.

Security: No secrets or sensitive data of any kind are ever permitted in any configuration file. All secrets must be managed by a secrets management component and accessed via the binds directive.

For Application Developers
service.yml as the Source of Truth: The service.yml file is the complete, authoritative declaration of a service's infrastructure.

Use the Right Layer: Developers should be guided to use the appropriate configuration layer for their needs:

Use the environments block for settings that are shared across multiple components within a service but differ by environment (e.g., a global logLevel).

Use the overrides block for tuning a specific component instance (e.g., increasing the memory for a single, high-traffic Lambda function).

Use the policy.overrides block only as a last resort to request a documented, auditable exception to a compliance rule in a non-production environment. It is not for general configuration.

8. Application Configuration & Secrets Management
This section defines the standards for managing configuration and secrets that are consumed by the application runtime, as distinct from the infrastructure configuration defined above.

8.1. Application Configuration
Best Practice: Application configuration (e.g., feature flags, tuning parameters, service endpoints) should be managed in AWS Systems Manager (SSM) Parameter Store or AWS AppConfig. This decouples the application's configuration from its infrastructure, allowing for dynamic updates without requiring a full redeployment. This is a key best practice for modern cloud applications [cite: 115-117].

Platform Implementation: The platform provides dedicated components for managing these resources:

ssm-parameter: For managing individual, static configuration values.

app-config-profile: For managing more complex, dynamic configuration sets, often used for feature flags.

Consumption Pattern: A compute component (e.g., lambda-api) consumes these values via the binds directive. The corresponding binder grants the necessary IAM permissions (ssm:GetParameter, appconfig:GetLatestConfiguration) and injects the parameter name or AppConfig profile ARN as an environment variable. The application code then uses the AWS SDK to fetch the configuration value at runtime.

8.1.1. Choosing the Right Configuration Store: SSM Parameter Store vs. AWS AppConfig
While both services can store configuration data, they are designed for different use cases. Choosing the correct tool is essential for building a robust and maintainable application.

Feature

SSM Parameter Store

AWS AppConfig

Best For

Simple, static key-value data. (e.g., third-party API endpoints, tuning numbers, ARNs of shared resources).

Complex configuration sets and dynamic feature flags. (e.g., a JSON document containing multiple flags, logging levels, and algorithm settings).

Validation

Basic (String, StringList, SecureString).

Rich JSON Schema validation. AppConfig can validate new configuration against a schema before deployment, preventing invalid configurations from reaching production.

Deployment

Changes are immediate. A PutParameter call instantly updates the value for all consumers.

Safe, validated deployments. AppConfig supports deployment strategies (Canary, Linear) that gradually roll out a configuration change while monitoring for alarms, with an automatic rollback capability.

Platform Recommendation

Use ssm-parameter for simple, non-critical configuration that changes infrequently.

Use app-config-profile for all feature flags and any operational configuration that requires safe, controlled rollouts and validation.

Example: ssm-parameter for a Static Value

components:
  - name: external-service-endpoint
    type: ssm-parameter
    config:
      # Parameter name is scoped to the service and environment
      name: "/${env:serviceName}/${env:environment}/endpoints/billing-service"
      value: "[https://billing.prod.api.example.com](https://billing.prod.api.example.com)"
      
  - name: api
    type: lambda-api
    binds:
      - to: external-service-endpoint
        capability: config:ssm-parameter
        access: read
        env:
          endpointParamName: BILLING_ENDPOINT_PARAM_NAME

Example: app-config-profile for Feature Flags

components:
  - name: my-feature-flags
    type: app-config-profile
    config:
      name: "CheckoutFeatureFlags"
      schema: # Inline JSON schema for validation
        type: object
        properties:
          enableNewPaymentFlow:
            type: boolean
          
  - name: api
    type: lambda-api
    binds:
      - to: my-feature-flags
        capability: config:app-config-profile
        access: read

8.2. Secrets Management
Best Practice: Secrets (e.g., API keys, database passwords, tokens) MUST NEVER be stored in version control. They must be managed in AWS Secrets Manager. The platform's role is to provision the secret container and provide a secure workflow for developers to manage the value.

Platform Implementation: The platform provides the secrets-manager-secret component.

Consumption Pattern: The consumption pattern is identical to application configuration. A compute component binds to the secret, and the binder grants IAM permission (secretsmanager:GetSecretValue) and injects the secret's ARN as an environment variable.

8.3. The Developer Self-Service Workflow for Secrets
This workflow provides a secure, auditable, and developer-friendly process for managing secret values.

Provisioning (Platform):

A developer adds a secrets-manager-secret component to their service.yml manifest.

Upon the first svc up, the platform provisions a new, empty secret in AWS Secrets Manager.

Population (dev Environment):

The developer retrieves the ARN of the newly created secret from the outputs.json artifact or the CLI output.

The developer uses the AWS CLI or Console to manually populate the secret's value in their personal dev environment. This allows for rapid local development and testing.

Population (qa, prod Environments):

For higher environments, secret values MUST be managed by a secure, automated process.

The service's CI/CD pipeline will include a dedicated, privileged stage that runs before the svc up deployment.

This stage retrieves the required secret value from a central, audited enterprise vault (e.g., HashiCorp Vault, or a dedicated Secrets Manager instance in a secure account).

It then uses the AWS CLI (aws secretsmanager put-secret-value) to populate or update the application's secret in the target environment.

Example Manifest:

components:
  - name: stripe-api-key
    type: secrets-manager-secret
    config:
      description: "The API key for the Stripe payment processing service."
      
  - name: payment-processor
    type: lambda-worker
    binds:
      - to: stripe-api-key
        capability: config:secret
        access: read
        env:
          stripeSecretArn: STRIPE_API_KEY_SECRET_ARN

## 9. Configuration Security Enforcement

### 9.1. Automated Validation
The platform MUST implement automated validation during the component synthesis phase to enforce Section 3.1 requirements:

**Pre-Synthesis Validation:**
- Scan all `getHardcodedFallbacks()` implementations for prohibited security-sensitive values
- Validate that CORS `allowOrigins` in hardcoded fallbacks is empty array `[]`
- Check that no hardcoded domain names, IP addresses, or external URLs exist in fallbacks
- Ensure compliance-sensitive settings are not hardcoded

**Synthesis-Time Validation:**
- Verify final merged configuration contains explicitly configured values for security-sensitive settings
- Validate CORS origins are environment-appropriate (no `['*']` in production unless explicitly justified)
- Confirm compliance framework requirements are met

**Validation Failure Actions:**
- **ERROR**: Halt synthesis if prohibited hardcoded values are detected
- **WARNING**: Alert if potentially unsafe configuration patterns are found
- **AUDIT**: Log all configuration sources and final merged values for compliance

### 9.2. Code Review Requirements
All changes to `ConfigBuilder` implementations MUST be reviewed by the Platform Engineering team to ensure compliance with Section 3.1.

**Review Checklist:**
- [ ] No security-sensitive values hardcoded in `getHardcodedFallbacks()`
- [ ] CORS configuration follows security-safe patterns
- [ ] Resource limits use conservative fallbacks
- [ ] Network access defaults to most restrictive settings
- [ ] All environment-varying values configured through Layers 2-5

### 9.3. Migration Strategy
Existing components with non-compliant hardcoded values MUST be updated:

**Immediate (Breaking):** Components with `allowOrigins: ['*']` hardcoded
**Priority 1 (Security Risk):** Components with hardcoded external domains or credentials  
**Priority 2 (Best Practice):** Components with hardcoded resource limits or compliance settings

**Migration Process:**
1. Identify non-compliant hardcoded values
2. Move values to appropriate platform configuration files (`/config/*.yml`)
3. Update hardcoded fallbacks to security-safe defaults
4. Test across all compliance frameworks
5. Deploy with configuration validation enabled
