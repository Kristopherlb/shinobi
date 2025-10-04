# Changelog

All notable changes to the DynamoDB Table Component will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-12-19

### Added
- Initial release of DynamoDB Table Component
- Support for both pay-per-request and provisioned billing modes
- Global and local secondary indexes configuration
- Point-in-time recovery support
- DynamoDB Streams integration
- Time-to-live (TTL) configuration
- Encryption support (AWS-managed and customer-managed KMS)
- Auto-scaling configuration for provisioned tables
- CloudWatch monitoring and alarms
- Comprehensive configuration schema validation
- Component API Contract v1.0 compliance
- Structured logging with platform logger
- X-Ray tracing support
- Observability configuration
- Comprehensive test coverage

### Security
- Encryption at rest enabled by default
- Customer-managed KMS key support
- Secure tagging implementation
- Compliance framework support (commercial, FedRAMP moderate/high)

### Documentation
- Complete README with usage examples
- Configuration schema documentation
- API reference documentation
- Observability configuration guide

### Infrastructure
- CDK L2 constructs usage
- Proper resource tagging
- CloudWatch alarms for operational monitoring
- Auto-scaling policies for provisioned tables
