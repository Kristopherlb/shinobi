# Changelog - efs-filesystem

All notable changes to the EFS Filesystem component will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-10-10

### Added
- Initial production release
- Amazon EFS filesystem with encryption at rest (AWS-managed or CMK)
- Encryption in transit (TLS) for FedRAMP compliance
- VPC mount targets with configurable subnets
- Security group management with least-privilege ingress rules
- KMS customer-managed key support with automatic rotation
- Lifecycle policies for cost optimization (IA transition)
- Automatic backups via AWS Backup integration
- CloudWatch Logs for access and audit events
- CloudWatch alarms for storage, connections, and burst credits
- Framework-aware configuration defaults (commercial, fedramp-moderate, fedramp-high)
- Comprehensive JSON Schema for manifest validation
- Example manifests for common use cases

### Security
- **CRITICAL FIX:** Removed 0.0.0.0/0 default security group ingress rule
- Added validation to reject internet-wide CIDR blocks
- Encryption at rest enabled by default
- Encryption in transit enabled for FedRAMP
- Customer-managed CMK with rotation for FedRAMP
- KMS encryption for log groups (FedRAMP)
- Least-privilege security group ingress (no defaults)
- File system policy support for IAM-based access control

### Compliance
- FedRAMP Moderate support with TLS, logging, and monitoring
- FedRAMP High support with 7-year log retention
- Automatic backups for production and FedRAMP
- Monitoring enabled by default for production/FedRAMP
- Framework-aware log retention (90 days → 1095 days → 2555 days)
- Mandatory tagging per platform standards

### Documentation
- Comprehensive README with usage examples
- Complete audit reports
- API schema documentation
- Security best practices guide

## [0.1.0] - Pre-release (DEPRECATED - SECURITY VULNERABILITY)

**⚠️ WARNING:** This version contains a critical security vulnerability (0.0.0.0/0 default ingress).  
**DO NOT USE.** Upgrade to 1.0.0 immediately.

### Security Vulnerabilities (FIXED in 1.0.0)
- ❌❌❌ Default security group ingress allowed 0.0.0.0/0 (internet-wide NFS access)
- ❌ No encryption in transit by default
- ❌ No framework-aware security defaults
- ❌ Monitoring and backups disabled by default

---

## Version History Summary

| Version | Date | Status | Key Changes |
|---------|------|--------|-------------|
| 1.0.0 | 2025-10-10 | Stable | Security fixes, FedRAMP compliance, framework-aware defaults |
| 0.1.0 | Pre-release | **DEPRECATED** | **CRITICAL SECURITY VULNERABILITY** |

---

**Maintained by:** Shinobi Platform Engineering  
**Last Updated:** October 10, 2025  
**Security Advisory:** Versions prior to 1.0.0 have critical vulnerabilities - do not use

