The Configuration Precedence Chain
When you run svc plan --env dev-us-east-2, the platform assembles the final configuration for each component by merging these layers in order. Each layer overrides the one before it.
Layer 1: Platform Defaults (The Universal Baseline)
Where it lives: Hardcoded within each component's Config Builder (e.g., in the getPlatformDefaults() method of RdsConfigBuilder).
Purpose: To provide a sane, "works-out-of-the-box" default for every property. This is the lowest priority and the ultimate fallback.
Example: The RdsConfigBuilder might default instanceClass to db.t3.micro for all environments.
Layer 2: Compliance Framework Defaults (The Guardrails)
Where it lives: Also within the Component Config Builder (in the getComplianceFrameworkDefaults() method).
Purpose: To enforce compliance-specific configurations. If the manifest specifies complianceFramework: fedramp-moderate, these values will override the universal platform defaults.
Example: The RdsConfigBuilder for fedramp-moderate overrides instanceClass to db.r5.medium.
Layer 3: Global Environment Configuration (The Static Infrastructure Map)
Where it lives: The version-controlled environments.json file at the root of the platform repository.
Purpose: This file answers the "lookup target account" part of your question. It contains the static, foundational details of a deployable environment, such as the account ID, region, vpcId, and default KMS key ARN. The PlatformContext is hydrated from this file.
Example:
// environments.json
"dev-us-east-2": {
  "account": "111122223333",
  "region": "us-east-2",
  "vpcId": "vpc-12345abcde"
}


Layer 4: Service-Level Environment Configuration (The Developer's Control)
Where it lives: The environments block at the top of the developer's service.yml manifest.
Purpose: This is the primary place where developers define how their service should behave differently across environments. This is where you would set different instance sizes, scaling rules, or feature flags. [cite_start]This aligns with the principles of static configuration management discussed in The CDK Book.
Example (service.yml):
# service.yml
environments:
  dev-us-east-2:
    defaults:
      instanceSize: db.t4g.small
      scalingMax: 2
  prod-us-east-1:
    defaults:
      instanceSize: db.r5.large
      scalingMax: 10

components:
  - name: my-database
    type: rds-postgres
    overrides:
      instance:
        class: ${env:instanceSize} # Interpolates the value from above


Layer 5: Per-Component Overrides (The Fine-Tuning)
Where it lives: The overrides block directly on a component definition in service.yml.
Purpose: To provide a final, specific override for a single component that deviates from the shared environment defaults. This is the highest priority.
Example: Even though the prod environment defaults to r5.large, this specific database needs more power.
# service.yml
components:
  - name: my-special-database
    type: rds-postgres
    overrides:
      instance:
        class: db.r5.xlarge # This value wins


Handling Shared Resources
Your question about a "shared resource dependency in QA" is handled declaratively using the binds directive with a selector. The developer doesn't need to know the specific name or ARN of the shared database.
How it works:
# In a QA service's service.yml
components:
  - name: my-worker
    type: lambda-worker
    binds:
      - select: # Instead of binding by name...
          type: rds-postgres
          withLabels: { shared: "true", env: "qa" } # ...we select the shared DB for QA
        capability: db:postgres
        access: read


The Resolver Engine is responsible for finding the single component in the QA environment that has been deployed with those specific labels and establishing the connection.
