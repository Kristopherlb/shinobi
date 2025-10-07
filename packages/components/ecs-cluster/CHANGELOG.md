# Changelog

All notable changes to the ECS Cluster component are documented in this file following [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2025-10-07

### Added
- JSON schema export (`Config.schema.json`) integrated with the config builder and component creator for MCP compatibility.
- Observability capability emission that surfaces OTEL environment variables and container insights details to downstream binders.
- Negative builder tests covering missing service connect namespace and invalid capacity bounds.
- AwsSolutions (`cdk-nag`) regression coverage to guard against security drift.

### Changed
- Component now requires a VPC to be provided through `context.vpc`, avoiding default lookups and aligning with networking governance.
- Tag propagation extended to the Service Connect namespace and any EC2 capacity resources, ensuring compliance with the tagging standard.
- Package metadata modernised (workspace dependencies, exports, scripts) and version bumped to `1.1.0`.

### Fixed
- Corrected module exports (typo in `index.ts`) so the component can be imported by registries without patching.
- Builder validation now enforces capacity bounds and ensures desired counts remain within range.

