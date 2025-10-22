# Changelog

All notable changes to `@platform/components-api-gateway-http` are documented in this file. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and the project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-10-05
### Added
- Hardened `Config.schema.json` with conditional validation for custom domains, integrations, and WAF configuration to ensure manifests fail-fast during MCP checks.
- Registered an `observability:api-gateway-http` capability with telemetry metadata and updated component logging to stream OpenTelemetry directives downstream.
- Introduced a `cdk-nag` AwsSolutions regression test to keep synth-time compliance signals visible.

### Changed
- Synchronized the builder output with the new schema defaults and tightened access logging retention defaults for compliance.
