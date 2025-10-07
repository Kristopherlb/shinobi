# Changelog

All notable changes to `@platform/components-container-application` are captured here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and the package adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2025-10-05
### Added
- Delivered an `observability:container-application` capability and documented OTEL environment wiring for downstream consumers.
- Introduced AwsSolutions (`cdk-nag`) suppressions and regression coverage so synthesis stays compliant with platform guardrails.

### Changed
- Migrated Jest configuration to the shared SWC preset and introduced an ESM-compatible setup file to unblock package tests.
- Tightened schema and builder defaults to keep container insights, scaling, and logging aligned with platform guidance.
