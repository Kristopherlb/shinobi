# Changelog

All notable changes to the SQS Queue component will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.0.1] - 2025-01-08

### Added
- Initial release of SQS Queue component
- Support for SQS queue creation with configurable properties
- Dead letter queue (DLQ) support with configurable max receive count
- KMS encryption support with customer-managed keys
- CloudWatch alarms for queue depth, message age, and in-flight messages
- Detailed CloudWatch metrics support
- Component lifecycle logging
- Capability registration for `messaging:sqs` and `messaging:sqs:dlq`
- Platform configuration precedence chain support
- Risk-based configuration via `highRiskEnvironment` flag
- Comprehensive tagging on all resources

### Security
- Encryption support with KMS (AWS-managed or customer-managed)
- Automatic KMS key rotation support for high-risk environments
- IAM policies with least-privilege for KMS access
- Secure defaults (encryption disabled by default, enabled via config)

### Compliance
- Support for Commercial, FedRAMP Moderate, and FedRAMP High frameworks
- Risk-based configuration (not framework-dependent)
- Platform config file support for framework-specific defaults

### Documentation
- Component README with usage examples
- Observability documentation with metrics and alarms
- Comprehensive audit documentation
- JSON schema for configuration validation

### Testing
- Component synthesis tests
- ConfigBuilder tests with precedence chain validation
- Creator validation tests
- CDK Nag security tests (enabled)

## [Unreleased]

### Planned
- Configurable alarm thresholds via component schema
- Automatic DLQ alarms
- SLO configuration and error budget tracking
- Dashboard generation from KB recipes
- Enhanced monitoring configuration options


