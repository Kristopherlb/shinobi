# Network Rules Stack Component - Usage Examples

This directory contains example service manifests demonstrating how to use the Network Rules Stack component.

## Examples

### Basic Usage

See [basic-usage.yml](./basic-usage.yml) for a minimal configuration example.

### Custom SSM Path

See [custom-ssm-path.yml](./custom-ssm-path.yml) for an example with a custom SSM Parameter Store path prefix.

### Full Platform Service

See [platform-service.yml](./platform-service.yml) for a complete platform infrastructure service example with tags and compliance framework.

## How It Works

1. **Rule Storage**: When services bind to each other, rule specifications are stored in SSM Parameter Store
2. **Rule Application**: This component queries SSM and applies rules to target security groups
3. **Rule Removal**: When bindings are removed, SSM parameters are deleted and rules are removed on next deployment

## Configuration Reference

For complete schema documentation, see [Config.schema.json](../Config.schema.json).

## Related Documentation

- [Component README](../README.md)
- [Platform Component API Spec](../../../docs/platform-standards/platform-component-api-spec.md)


