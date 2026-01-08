---
name: devops-knowledge-base
description: Provides DevOps knowledge base leveraging AWS Config conformance packs to inform observability settings, operational best practices, resource configurations, and compliance requirements. Use when configuring components, setting up monitoring, or applying AWS best practices.
license: Apache-2.0
compatibility: Requires access to AWS Config conformance packs repository and AWS documentation
metadata:
  author: shinobi-platform
  version: "1.0"
---

# devops-knowledge-base

<!-- Degrees of Freedom: Medium - Provide structure with some flexibility for agent adaptation -->

## Instructions

This skill provides a DevOps knowledge base that leverages AWS Config conformance packs to inform component configuration, observability settings, and operational best practices. Use this skill when:

1. **Configuring Components**: Need AWS best practices for resource configuration
2. **Setting Up Observability**: Need guidance on monitoring, logging, and alerting patterns
3. **Applying Compliance**: Need to align with AWS compliance frameworks (FedRAMP, HIPAA, PCI-DSS, etc.)
4. **Operational Excellence**: Need operational best practices from AWS Well-Architected Framework

### Workflow

1. **Identify Context**: Determine what AWS service or resource you're configuring
2. **Map to Conformance Pack**: Find relevant conformance packs from AWS Labs repository
3. **Extract Best Practices**: Parse conformance pack rules to extract:
   - Resource configuration requirements
   - Observability settings (CloudWatch metrics, alarms, dashboards)
   - Security and compliance requirements
   - Operational best practices
4. **Apply to Component**: Translate conformance pack rules into component configuration recommendations
5. **Validate**: Ensure recommendations align with platform standards and compliance frameworks

### Conformance Pack Categories

AWS Config conformance packs are organized by:

- **Well-Architected Framework Pillars**: Security, Reliability, Performance, Cost Optimization, Operational Excellence
- **Compliance Frameworks**: FedRAMP, HIPAA, PCI-DSS, SOC 2, CIS Benchmarks
- **Service-Specific**: S3, EC2, RDS, Lambda, ECS, etc.
- **Operational Best Practices**: Backup, encryption, logging, monitoring

### Key Resources

- **AWS Labs Repository**: `https://github.com/awslabs/aws-config-rules/tree/master/aws-config-conformance-packs`
- **AWS Documentation**: AWS Config conformance pack templates and documentation
- **Reference Files**: See `references/` directory for parsed conformance pack mappings

### Critical Rules

**REQUIRED**: Always reference the official AWS Config conformance pack templates from AWS Labs repository

**REQUIRED**: Map conformance pack rules to platform component configuration standards

**REQUIRED**: Consider compliance framework context (commercial, fedramp-moderate, fedramp-high) when applying rules

**PROHIBITED**: Don't hardcode conformance pack rules - reference them as external resources

**PROHIBITED**: Don't apply rules that conflict with platform standards - prioritize platform standards

## Examples

### Example 1: Configuring S3 Bucket Observability

**Context**: Configuring an S3 bucket component and need observability best practices

**Process**:
1. Identify relevant conformance pack: "Operational Best Practices for S3"
2. Extract observability rules:
   - CloudWatch metrics: BucketSizeBytes, NumberOfObjects
   - CloudWatch alarms: Unusual API activity, bucket size thresholds
   - CloudTrail logging: Enable object-level logging
3. Map to component configuration:
   - Enable CloudWatch metrics in component config
   - Configure alarms based on conformance pack thresholds
   - Enable CloudTrail integration
4. Validate against platform observability standard

**Output**: Component configuration with observability settings aligned with AWS best practices

### Example 2: Applying FedRAMP Compliance Rules

**Context**: Configuring resources for FedRAMP Moderate compliance

**Process**:
1. Identify FedRAMP conformance pack: "Operational Best Practices for FedRAMP"
2. Extract compliance rules:
   - Encryption requirements (KMS customer-managed keys)
   - Logging requirements (CloudTrail, CloudWatch Logs retention)
   - Access control requirements (IAM policies, resource policies)
3. Map to component ConfigBuilder:
   - Set `highRiskEnvironment: true` flag
   - Configure encryption defaults
   - Configure logging retention (1095 days for FedRAMP Moderate)
4. Validate against platform compliance standards

**Output**: Component configuration aligned with FedRAMP Moderate requirements

### Example 3: ECS Service Operational Best Practices

**Context**: Configuring ECS Fargate service with operational excellence

**Process**:
1. Identify conformance pack: "Operational Best Practices for ECS"
2. Extract operational rules:
   - Service auto-scaling configuration
   - Health check settings
   - Task definition resource limits
   - CloudWatch Container Insights
3. Map to component configuration:
   - Configure auto-scaling based on conformance pack recommendations
   - Set health check intervals and thresholds
   - Configure Container Insights for observability
4. Validate against platform component standards

**Output**: ECS service configuration with operational best practices applied

## Conformance Pack Mapping

### Service-to-Pack Mapping

| AWS Service | Conformance Pack | Key Rules |
|-------------|------------------|-----------|
| S3 | Operational Best Practices for S3 | Encryption, versioning, logging, access control |
| EC2 | Operational Best Practices for EC2 | IMDSv2, security groups, VPC configuration |
| RDS | Operational Best Practices for RDS | Encryption, backups, multi-AZ, parameter groups |
| Lambda | Operational Best Practices for Lambda | VPC configuration, dead letter queues, tracing |
| ECS | Operational Best Practices for ECS | Task definitions, service configuration, logging |
| CloudWatch | Operational Best Practices for CloudWatch | Log retention, metric filters, alarms |

### Compliance Framework Mapping

| Framework | Conformance Pack | Key Requirements |
|-----------|------------------|-----------------|
| FedRAMP Moderate | Operational Best Practices for FedRAMP | Encryption, logging, access control, audit trails |
| FedRAMP High | Operational Best Practices for FedRAMP High | Enhanced encryption, extended logging, stricter access control |
| HIPAA | Operational Best Practices for HIPAA | PHI protection, encryption, audit logging |
| PCI-DSS | Operational Best Practices for PCI-DSS | Cardholder data protection, encryption, access control |

## Integration with Platform Standards

This skill integrates with:

- **Platform Observability Standard**: Maps conformance pack observability rules to OTel configuration
- **Platform Logging Standard**: Maps conformance pack logging requirements to structured logging
- **Platform Configuration Standard**: Maps conformance pack rules to ConfigBuilder defaults
- **Component Standards**: Ensures conformance pack recommendations align with component architecture

## Knowledge Index (Grep-Based Search)

To quickly find relevant information without reading entire files, use these grep commands:

### Service-Specific Searches
- **S3**: `grep -i "s3\|bucket" references/OBSERVABILITY_RULES.md references/CONFORMANCE_PACK_MAPPING.md`
- **EC2**: `grep -i "ec2\|instance" references/OBSERVABILITY_RULES.md references/OPERATIONAL_BEST_PRACTICES.md`
- **ECS**: `grep -i "ecs\|fargate\|container" references/OBSERVABILITY_RULES.md references/OPERATIONAL_BEST_PRACTICES.md`
- **Lambda**: `grep -i "lambda\|function" references/OBSERVABILITY_RULES.md references/OPERATIONAL_BEST_PRACTICES.md`
- **RDS**: `grep -i "rds\|database" references/OBSERVABILITY_RULES.md references/OPERATIONAL_BEST_PRACTICES.md`
- **VPC**: `grep -i "vpc\|network\|security.group" references/OPERATIONAL_BEST_PRACTICES.md references/COMPLIANCE_RULES.md`

### Compliance Framework Searches
- **FedRAMP**: `grep -i "fedramp" references/COMPLIANCE_RULES.md references/CONFORMANCE_PACK_MAPPING.md`
- **HIPAA**: `grep -i "hipaa" references/COMPLIANCE_RULES.md`
- **PCI-DSS**: `grep -i "pci" references/COMPLIANCE_RULES.md`

### Observability Searches
- **Metrics**: `grep -i "metric\|cloudwatch" references/OBSERVABILITY_RULES.md`
- **Alarms**: `grep -i "alarm\|threshold" references/OBSERVABILITY_RULES.md`
- **Logging**: `grep -i "log\|retention\|cloudtrail" references/OBSERVABILITY_RULES.md references/COMPLIANCE_RULES.md`
- **Tracing**: `grep -i "trace\|x-ray" references/OBSERVABILITY_RULES.md`

### Operational Searches
- **Backup**: `grep -i "backup\|snapshot\|recovery" references/OPERATIONAL_BEST_PRACTICES.md references/COMPLIANCE_RULES.md`
- **Encryption**: `grep -i "encrypt\|kms\|key" references/COMPLIANCE_RULES.md references/OPERATIONAL_BEST_PRACTICES.md`
- **Scaling**: `grep -i "scale\|autoscaling\|capacity" references/OPERATIONAL_BEST_PRACTICES.md`

### Quick Reference Map
| Topic | File | Grep Command |
|-------|------|--------------|
| S3 Observability | OBSERVABILITY_RULES.md | `grep "S3\|Bucket" references/OBSERVABILITY_RULES.md` |
| FedRAMP Encryption | COMPLIANCE_RULES.md | `grep "FedRAMP.*encrypt" references/COMPLIANCE_RULES.md` |
| ECS Best Practices | OPERATIONAL_BEST_PRACTICES.md | `grep "ECS\|Container" references/OPERATIONAL_BEST_PRACTICES.md` |
| Service Mapping | CONFORMANCE_PACK_MAPPING.md | `grep "S3\|EC2\|ECS" references/CONFORMANCE_PACK_MAPPING.md` |

## Bundled Resources

- **Scripts**: `scripts/fetch-conformance-packs.sh` - Fetches latest conformance packs from AWS Labs
- **References**: 
  - `references/CONFORMANCE_PACK_MAPPING.md` - Service-to-pack mapping
  - `references/OBSERVABILITY_RULES.md` - Observability rules extracted from packs
  - `references/COMPLIANCE_RULES.md` - Compliance framework rules
  - `references/OPERATIONAL_BEST_PRACTICES.md` - Operational excellence patterns
- **Assets**: Conformance pack templates and parsed rule definitions

## Edge Cases

- **Missing Conformance Pack**: If no specific pack exists, use general Well-Architected Framework packs
- **Conflicting Rules**: Platform standards take precedence over conformance pack rules
- **Version Mismatch**: Always reference latest conformance pack versions from AWS Labs
- **Custom Rules**: Platform-specific rules may override or extend conformance pack rules

## Checklist

When applying conformance pack rules:

| Step | Check | Outcome |
|------|-------|---------|
| **1. Identify Service** | What AWS service is being configured? | Map to conformance pack |
| **2. Find Pack** | Does relevant conformance pack exist? | **FAIL** if not found, use general pack |
| **3. Extract Rules** | Can rules be extracted from pack? | **FAIL** if pack is invalid |
| **4. Map to Config** | Can rules be mapped to component config? | **WARN** if mapping unclear |
| **5. Validate Standards** | Do rules align with platform standards? | **FAIL** if conflicts exist |
| **6. Apply** | Are rules applied correctly? | **FAIL** if configuration invalid |

## Additional Resources

- See `references/CONFORMANCE_PACK_MAPPING.md` for complete service-to-pack mapping
- See `references/OBSERVABILITY_RULES.md` for observability best practices
- See `references/COMPLIANCE_RULES.md` for compliance framework requirements
- See `scripts/fetch-conformance-packs.sh` for fetching latest packs
- AWS Config Documentation: https://docs.aws.amazon.com/config/latest/developerguide/conformance-packs.html
- AWS Labs Repository: https://github.com/awslabs/aws-config-rules/tree/master/aws-config-conformance-packs

