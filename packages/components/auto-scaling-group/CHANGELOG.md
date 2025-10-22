# Changelog

All notable changes to `@platform/auto-scaling-group` are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and we adhere to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.1] - 2025-10-05
### Added
- Introduced an AwsSolutions regression test (`cdk-nag`) to ensure the Auto Scaling Group continues to synthesize without security findings.

### Changed
- Declared an explicit dependency on `cdk-nag` so the runtime suppressions and tests resolve consistently within the package.
