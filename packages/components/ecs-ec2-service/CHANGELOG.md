# Changelog

All notable changes to the ECS EC2 Service component will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed
- Reorganized source files into `src/` directory for better project structure
- Extracted embedded JSON Schema to `Config.schema.json` for external validation
- Updated builder to import schema from external JSON file

### Added
- Comprehensive `Config.schema.json` with detailed property descriptions
- `package.json` with semantic versioning and dependency management
- Security test infrastructure (`tests/security/` directory)
- Observability configuration directory (`observability/`)
- Audit documentation directory (`Audit/`)

## [1.0.0] - 2025-10-10

### Added
- Initial release of ECS EC2 Service component
- Service Connect integration with configurable DNS and namespace
- Autoscaling support with CPU and memory targets
- Placement constraints and strategies for optimal task placement
- CloudWatch alarms for CPU and memory utilization with framework-specific thresholds
- Structured logging with configurable retention (30 days to 10 years)
- OpenTelemetry integration for distributed tracing
- Health check configuration support
- AWS ECS Exec support for debugging (framework-dependent)
- Comprehensive test suite with unit and synthesis tests
- Support for three compliance frameworks (commercial, fedramp-moderate, fedramp-high)

### Security
- Secrets Manager integration for sensitive environment variables
- VPC-scoped security groups with least-privilege ingress rules
- Private subnet deployment with NAT Gateway egress
- IAM roles with service principals
- Configurable log retention for compliance frameworks
- No plaintext secrets in configuration
- Secure defaults with minimal resource allocation

### Compliance
- **Commercial Framework**: 256 CPU, 30-day log retention, 80% CPU threshold, exec disabled
- **FedRAMP Moderate**: 512 CPU, 5-year log retention, 70% CPU threshold, exec enabled
- **FedRAMP High**: 1024+ CPU, 10-year log retention, ≤60% CPU threshold, exec enabled

### Features
- **Service Connect**: Native ECS service mesh integration with automatic DNS discovery
- **Auto Scaling**: Target tracking based on CPU and memory utilization
- **Placement Control**: Constraints and strategies for EC2 instance selection
- **Observability**: CloudWatch Logs, Metrics, Alarms, and OTel integration
- **Configuration**: Layered precedence chain (hardcoded → platform → service → component → policy)
- **Flexibility**: Optional task role ARN, custom log groups, health checks

### Documentation
- Comprehensive README with usage examples
- Component specification in `catalog-info.yaml`
- Inline code documentation
- Test examples for builder and component synthesis

---

## Version History Summary

| Version | Date       | Description                                      |
|---------|------------|--------------------------------------------------|
| 1.0.0   | 2025-10-10 | Initial production-ready release                 |
| 0.1.0   | 2025-09-15 | Internal alpha release (pre-audit)               |

---

## Upgrade Guide

### Upgrading from 0.x to 1.0.0

**Breaking Changes:**
- Source files moved to `src/` directory - update any direct imports
- Schema validation now uses external `Config.schema.json`
- Minimum compliance: monitoring must be enabled for all FedRAMP deployments

**Migration Steps:**
1. Update imports: `from './ecs-ec2-service.component'` → `from './src/ecs-ec2-service.component'`
2. Ensure monitoring is enabled in FedRAMP manifests
3. Review log retention settings (automatic by framework)
4. Test with new schema validation

**New Features:**
- Enhanced schema validation with detailed error messages
- Improved documentation and inline help
- Security test infrastructure
- Observability configuration templates

---

## Maintenance & Support

- **Maintained by:** Shinobi Platform Team
- **Support Channel:** Platform Engineering Slack (#platform-support)
- **Issue Tracker:** GitHub Issues
- **Security Reports:** security@shinobi-platform.com

## License

MIT License - See LICENSE file for details

