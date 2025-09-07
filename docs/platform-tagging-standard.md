# Platform Tagging Standard

**Version:** 1.0  
**Status:** Published  
**Last Updated:** September 6, 2025

## 1. Overview & Purpose

This document defines the official tagging standard for all AWS resources provisioned by the platform. A consistent tagging strategy is critical for effective governance, cost management, security auditing, and automation.

The purpose of this standard is to:

- Ensure all resources are automatically and correctly attributed to a service, owner, and environment.
- Provide a standardized vocabulary for classifying resources by their function, data sensitivity, and compliance scope.
- Enable automated policy enforcement and reporting based on resource tags.

Adherence to this standard is **mandatory**. The platform will enforce this standard programmatically through a combination of automated tag application and policy-as-code validation.

## 2. Guiding Principles

- **Case Sensitivity:** All tag keys and values are case-sensitive. Tag keys MUST use kebab-case (e.g., `service-name`), and values should be consistent.
- **Tag Propagation:** All taggable resources created by a component MUST inherit the full set of standard tags.
- **Source of Truth:** The primary source for tag values is the service's `service.yml` manifest and the platform's environment configuration.
- **Immutability:** Once applied, platform-managed tags should not be manually modified. Any changes must be made in the source manifest and deployed through the platform.

## 3. Mandatory Tags

The following tags are required and will be automatically applied by the platform's ResolverEngine to every taggable resource created. The values are derived from the service manifest and the deployment context.

### Core Service Tags

| Tag Key | Description | Source | Example Value |
|---------|-------------|--------|---------------|
| `service-name` | The name of the service this resource belongs to | `service.yml` manifest | `user-api`, `payment-processor` |
| `service-version` | The version of the service deployment | `service.yml` manifest | `1.2.3`, `v2.0.0-rc1` |
| `component-name` | The name of the specific component within the service | Component specification | `database`, `api-gateway`, `worker-queue` |
| `component-type` | The type of component from the platform registry | Component class | `rds-postgres`, `lambda-api`, `sqs-queue` |

### Environment & Deployment Tags

| Tag Key | Description | Source | Example Value |
|---------|-------------|--------|---------------|
| `environment` | The target environment for this deployment | Deployment context | `production`, `staging`, `development` |
| `region` | The AWS region where the resource is deployed | Deployment context | `us-east-1`, `eu-west-1` |
| `deployed-by` | The platform component that deployed this resource | Platform context | `platform-v1.2.0` |
| `deployment-id` | Unique identifier for this deployment session | Platform context | `deploy-20250906-143022` |

### Governance & Compliance Tags

| Tag Key | Description | Source | Example Value |
|---------|-------------|--------|---------------|
| `compliance-framework` | The compliance framework applied to this resource | Service context | `commercial`, `fedramp-moderate`, `fedramp-high` |
| `data-classification` | The sensitivity level of data processed by this resource | Service specification | `public`, `internal`, `confidential`, `restricted` |
| `backup-required` | Whether this resource requires automated backups | Component configuration | `true`, `false` |
| `monitoring-level` | The level of monitoring applied to this resource | Compliance framework | `basic`, `enhanced`, `comprehensive` |

### Cost Management Tags

| Tag Key | Description | Source | Example Value |
|---------|-------------|--------|---------------|
| `cost-center` | The business unit or team responsible for costs | Service manifest | `engineering`, `product`, `operations` |
| `billing-project` | The project code for billing allocation | Service manifest | `proj-2025-q3`, `innovation-lab` |
| `resource-owner` | The team or individual responsible for this resource | Service manifest | `backend-team`, `data-engineering` |

## 4. Implementation Requirements

### 4.1 Component-Level Implementation

All platform components MUST implement the tagging standard through the following mechanisms:

1. **Base Component Integration:** Extend the base `Component` class tagging utilities
2. **Automatic Tag Application:** Apply all mandatory tags during the `synth()` phase
3. **Tag Inheritance:** Ensure all child resources inherit parent resource tags
4. **Validation:** Validate tag completeness before resource creation

### 4.2 Code Implementation Pattern

```typescript
// In component synth() method
protected applyStandardTags(resource: ITaggable): void {
  const standardTags = this.buildStandardTags();
  
  Object.entries(standardTags).forEach(([key, value]) => {
    cdk.Tags.of(resource).add(key, value);
  });
}

private buildStandardTags(): Record<string, string> {
  return {
    // Core Service Tags
    'service-name': this.context.serviceName,
    'service-version': this.context.serviceVersion,
    'component-name': this.spec.name,
    'component-type': this.getType(),
    
    // Environment & Deployment Tags
    'environment': this.context.environment,
    'region': this.context.region,
    'deployed-by': `platform-${this.context.platformVersion}`,
    'deployment-id': this.context.deploymentId,
    
    // Governance & Compliance Tags
    'compliance-framework': this.context.complianceFramework,
    'data-classification': this.spec.dataClassification || 'internal',
    'backup-required': this.shouldEnableBackups().toString(),
    'monitoring-level': this.getMonitoringLevel(),
    
    // Cost Management Tags
    'cost-center': this.context.costCenter,
    'billing-project': this.context.billingProject,
    'resource-owner': this.context.resourceOwner
  };
}
```

### 4.3 Validation Rules

- All mandatory tags MUST be present on every taggable resource
- Tag values MUST NOT be empty or undefined
- Tag values MUST NOT exceed AWS limits (255 characters for keys, 256 for values)
- Components MUST validate tags before synthesis completion

## 5. Optional Tags

Components MAY add additional tags specific to their functionality, but these MUST:

- Use kebab-case naming convention
- Not conflict with mandatory tag keys
- Be documented in the component's schema
- Be consistent across all instances of the component type

## 6. Enforcement & Monitoring

The platform enforces this standard through:

1. **Compile-time validation** during component synthesis
2. **Runtime validation** through AWS Config rules
3. **Continuous monitoring** via automated compliance checks
4. **Reporting dashboards** for tag compliance metrics

## 7. Migration & Adoption

For existing resources not compliant with this standard:

1. New deployments MUST immediately adopt the full standard
2. Existing resources SHOULD be migrated during next maintenance window
3. Critical production resources MAY be migrated during planned downtime
4. Legacy resources MUST be documented with migration timeline

## 8. Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | September 6, 2025 | Initial standard publication |

---

**Document Owner:** Platform Engineering Team  
**Review Cycle:** Quarterly  
**Next Review:** December 6, 2025