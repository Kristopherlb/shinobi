# Changelog

All notable changes to the EventBridge Rule Pattern component will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Comprehensive audit documentation
- JSON Schema for configuration validation
- Package metadata with semantic versioning
- Changelog for version tracking

### Changed
- Enforced mandatory monitoring, CloudWatch logging, and DLQ usage across all frameworks
- Introduced compliance-aware defaults for log retention (365/1095/2555 days) and removal policies
- Added automatic KMS key provisioning for FedRAMP deployments and updated capability outputs with encryption metadata
- Refactored package to ESM output with `src/` layout, NodeNext-compatible exports, and direct JSON schema publishing
- Delivered baseline observability assets (dashboard, runbooks, SLO) and updated documentation to reflect non-optional telemetry

## [1.0.0] - 2025-10-10

### Added
- Initial implementation of EventBridge pattern-based rule component
- Support for event pattern matching with configurable rules
- Dead letter queue (DLQ) for failed event deliveries
  - Configurable retention period (1-14 days)
  - Configurable max retry attempts (0-185)
- CloudWatch Logs integration for event logging
  - Framework-based retention (30/90/365 days)
  - Configurable log group names
  - Removal policy configuration
- Comprehensive CloudWatch monitoring and alarming
  - Failed invocations alarm
  - Total invocations alarm
  - Matched events alarm
  - DLQ message backlog alarm
- Multi-framework compliance support
  - Commercial: Minimal defaults, opt-in monitoring
  - FedRAMP Moderate: Enhanced monitoring, 90-day retention
  - FedRAMP High: Maximum observability, 365-day retention
- Configuration precedence chain (5-layer config system)
- Structured logging with correlation IDs
- Comprehensive resource tagging
- Input transformation support (constant, path, transformer)
- Custom event bus support (same-account and cross-account)

### Features
- Automatic framework-based configuration
- No hardcoded environment-specific logic
- Zero cross-component dependencies
- Full BaseComponent integration
- Type-safe configuration with Zod validation
- Comprehensive test coverage (unit + synthesis)

### Security
- Secure defaults for all configurations
- No public access resources
- Encrypted storage for DLQ and logs (AWS-managed keys)
- IAM least privilege via platform binders
- Audit logging for FedRAMP compliance

### Performance
- Optimized CloudWatch metric queries
- Configurable alarm thresholds and periods
- Efficient DLQ processing

### Documentation
- Comprehensive README with examples
- Configuration reference documentation
- Backstage catalog integration
- Testing guide

## [0.1.0] - 2025-09-15 (Pre-release)

### Added
- Initial alpha implementation
- Basic event pattern matching
- Minimal monitoring support

---

## Version History

- **1.0.0** (2025-10-10): Production-ready release with full feature set
- **0.1.0** (2025-09-15): Initial alpha release

## Upgrade Guides

### Upgrading to 1.0.0 from 0.1.0

#### Breaking Changes
- Configuration schema has been formalized
- Monitoring configuration structure has changed
- DLQ configuration now nested under `deadLetterQueue` key

#### Migration Steps
1. Update manifest to use new configuration schema
2. Review and update monitoring configuration if customized
3. Test in development environment before production deployment
4. Update any custom bindings to use new capability data structure

## Future Roadmap

### 1.1.0 (Planned)
- Customer-managed KMS key (CMK) support for FedRAMP High
- Enhanced trace context propagation
- Custom CloudWatch metrics
- Dashboard templates

### 1.2.0 (Planned)
- Rule target binder strategies
- Cross-region event bus support enhancements
- Advanced input transformation helpers

### 2.0.0 (Future)
- Breaking changes TBD based on platform evolution
- Enhanced capability system integration
- Advanced observability features

## Support

For issues, questions, or contributions, please refer to:
- GitHub Issues: https://github.com/project42/shinobi/issues
- Platform Documentation: https://docs.shinobi.dev
- Contributing Guide: [CONTRIBUTING.md](../../../CONTRIBUTING.md)

## License

MIT License - See [LICENSE](../../../LICENSE) for details.
