# Changelog

All notable changes to `@platform/dynamodb-table` are tracked here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and the package adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.1] - 2025-10-05
### Added
- Added an AwsSolutions (`cdk-nag`) regression test to ensure DynamoDB table synthesis remains compliant and suppressions stay justified.

### Changed
- Declared an explicit dependency on `cdk-nag` so compliance tests run within the package.
