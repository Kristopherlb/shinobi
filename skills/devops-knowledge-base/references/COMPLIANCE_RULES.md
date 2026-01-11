# Compliance Rules from AWS Config Conformance Packs

This document extracts compliance-specific rules from AWS Config conformance packs to inform component configuration for different compliance frameworks.

## FedRAMP Compliance Rules

### FedRAMP Low

- **Encryption**: AWS-managed encryption keys acceptable
- **Logging**: 90 days retention
- **Access Control**: IAM policies, resource policies
- **Audit Trails**: CloudTrail enabled

### FedRAMP Moderate

- **Encryption**: Customer-managed KMS keys required
- **Key Rotation**: Enable automatic key rotation
- **Logging**: 1095 days (3 years) retention
- **Access Control**: Least privilege IAM policies, MFA required
- **Audit Trails**: CloudTrail with data events, log file validation
- **Backup**: Automated backups with retention policies
- **Network**: VPC with security groups, no public access by default

### FedRAMP High

- **Encryption**: Customer-managed KMS keys with enhanced security
- **Key Rotation**: Mandatory automatic rotation
- **Logging**: 2555 days (7 years) retention
- **Access Control**: Stricter IAM policies, mandatory MFA, session management
- **Audit Trails**: Enhanced CloudTrail with all data events, immutable logs
- **Backup**: Multi-region backups, extended retention
- **Network**: Enhanced VPC security, network segmentation, egress controls

## HIPAA Compliance Rules

- **PHI Protection**: Encrypt all PHI at rest and in transit
- **Access Controls**: Role-based access control, audit logging
- **Backup**: Automated backups with encryption
- **Logging**: 6 years retention for audit logs
- **Breach Notification**: Monitoring and alerting for unauthorized access

## PCI-DSS Compliance Rules

- **Cardholder Data Protection**: Encrypt cardholder data
- **Access Control**: Restrict access to cardholder data
- **Network Segmentation**: Isolate cardholder data environment
- **Monitoring**: Monitor access to cardholder data
- **Logging**: 1 year minimum retention for audit logs

## SOC 2 Compliance Rules

- **Security Controls**: Encryption, access control, monitoring
- **Availability**: High availability, backup and recovery
- **Processing Integrity**: Data validation, error handling
- **Confidentiality**: Data encryption, access controls
- **Privacy**: Data classification, retention policies

## CIS Benchmarks

- **Security Hardening**: Follow CIS benchmark configurations
- **Configuration Baselines**: Apply CIS-recommended settings
- **Monitoring**: Enable security monitoring and alerting
- **Access Control**: Implement least privilege access

## Component Configuration Mapping

### Encryption Requirements

```typescript
// FedRAMP Moderate/High
{
  encryption: {
    enabled: true,
    useCustomerManagedKey: true, // Required for FedRAMP Moderate+
    enableKeyRotation: true, // Required for FedRAMP High
    algorithm: 'AES-256' // Default
  }
}
```

### Logging Requirements

```typescript
// Log retention by framework
{
  logging: {
    retentionDays: {
      'commercial': 30,
      'fedramp-low': 90,
      'fedramp-moderate': 1095, // 3 years
      'fedramp-high': 2555, // 7 years
      'hipaa': 2190, // 6 years
      'pci-dss': 365 // 1 year minimum
    }
  }
}
```

### Access Control Requirements

```typescript
// IAM policy requirements
{
  accessControl: {
    leastPrivilege: true, // Required for all frameworks
    mfaRequired: true, // Required for FedRAMP Moderate+
    sessionManagement: true, // Required for FedRAMP High
    auditLogging: true // Required for all frameworks
  }
}
```

### Backup Requirements

```typescript
// Backup configuration
{
  backup: {
    enabled: true,
    retentionDays: {
      'commercial': 30,
      'fedramp-moderate': 90,
      'fedramp-high': 365
    },
    multiRegion: true, // Required for FedRAMP High
    encryption: true // Required for all frameworks
  }
}
```

## Integration with Platform Standards

These compliance rules should be integrated with:

- **Platform Configuration Standard**: ConfigBuilder defaults based on compliance framework
- **Platform Tagging Standard**: Compliance framework tags
- **Platform Logging Standard**: Log retention based on compliance framework
- **Component Standards**: Component-specific compliance configuration

## References

- FedRAMP: https://www.fedramp.gov/
- HIPAA: https://www.hhs.gov/hipaa/index.html
- PCI-DSS: https://www.pcisecuritystandards.org/
- SOC 2: https://www.aicpa.org/interestareas/frc/assuranceadvisoryservices/aicpasoc2report.html
- CIS Benchmarks: https://www.cisecurity.org/cis-benchmarks/


