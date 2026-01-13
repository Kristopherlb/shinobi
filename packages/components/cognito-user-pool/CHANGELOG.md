# Changelog

All notable changes to `@platform/components-cognito-user-pool` are documented in this file. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and we adhere to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-10-05
### Added
- Adopted `cdk-nag` with stack-aware suppressions and a dedicated compliance suite to keep AWS Solutions checks green.
- Registered an `observability:cognito-user-pool` capability and ensured telemetry metadata travels through builder and component outputs.
- Extended configuration validation to normalise advanced security defaults and guard against invalid `advancedSecurityMode` inputs.

### Changed
- Updated the KMS/SMS role handling to document suppressions for AWS-managed policies and surfaced suppressions through tests.
- Migrated test harnesses from Jest to Vitest for better ESM support and performance.
