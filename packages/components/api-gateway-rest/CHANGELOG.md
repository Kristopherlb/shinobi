# Changelog

All notable changes to `@platform/components-api-gateway-rest` are documented in this file. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and the project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-10-05
### Added
- Introduced stricter cross-field validation in `Config.schema.json`, catching misconfigured authorizers, custom domains, and integration dependencies at manifest time.
- Published an `observability:api-gateway-rest` capability with OTel wiring so downstream services inherit telemetry defaults automatically.
- Integrated `cdk-nag` with targeted suppressions and automated compliance tests to guard against regressions in AWS Solutions rules.

### Changed
- Updated builder defaults to keep access logging, throttling, and monitoring in sync with the new schema contracts.
