# Changelog

All notable changes to the IAM Policy component will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-10-24

### Added
- Initial release of IAM Policy component
- Support for both managed and inline IAM policies
- Policy templates: read-only, lambda-execution, ecs-task, s3-access, rds-access, dynamodb-access, custom
- Full ConfigBuilder pattern with 5-layer precedence chain
- Compliance controls: deny insecure transport, MFA enforcement
- CloudWatch monitoring and usage alarms
- Structured logging (usage, compliance, audit)
- Standard tagging support (managed policies only)
- Policy attachment to groups, roles, and users (managed policies only)
- Component API Contract v1.0 compliance

### Fixed
- Constructor signature now matches BaseComponent: (scope, id, context, spec)
- Register both 'main' and 'policy' construct handles
- Consistent capability key: 'iam:policy'
- Proper ARN handling for managed vs inline policies
- Fixed log retention enum mapping
- Removed tags from inline policies (AWS limitation)
- Removed wildcard policy templates (power-user, admin) for least privilege compliance
- Scoped deny-insecure-transport to transport-relevant services
- Fixed MFA enforcement using Bool not BoolIfExists
- Added validation for policyDocument XOR policyTemplate
- Added validation that inline policies cannot have attachments

### Security
- All policy templates now follow least privilege principles
- No wildcard actions or resources except where AWS requires it
- MFA enforcement properly blocks non-MFA access
- Insecure transport denial scoped to specific services


