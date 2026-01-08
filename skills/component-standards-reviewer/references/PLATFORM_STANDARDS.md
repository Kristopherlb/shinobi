# Platform Standards Reference

This document lists all Platform Standards that components must comply with.

## 7 Required Platform Standards

### 1. Platform Component API Spec

- **Location**: `docs/platform-standards/platform-component-api-spec.md`
- **Purpose**: Component contract and BaseComponent requirements
- **Key Requirements**:
  - All components extend BaseComponent
  - Implement required abstract methods
  - Follow component lifecycle

### 2. Platform Configuration Standard

- **Location**: `docs/platform-standards/platform-configuration-standard.md`
- **Purpose**: 5-layer precedence chain, no hardcoded values
- **Key Requirements**:
  - ConfigBuilder pattern with 5 layers
  - No hardcoded security-sensitive values
  - Risk-based configuration (not framework checks)
  - Deterministic (no network/CLI calls)

### 3. Platform Tagging Standard

- **Location**: `docs/platform-standards/platform-tagging-standard.md`
- **Purpose**: Mandatory resource tagging
- **Key Requirements**:
  - Use `applyStandardTags()` on all resources
  - Service tags, environment tags, governance tags, cost management tags

### 4. Platform Logging Standard

- **Location**: `docs/platform-standards/platform-logging-standard.md`
- **Purpose**: Structured JSON logging
- **Key Requirements**:
  - Use platform logger methods
  - Structured log schema with trace correlation
  - No `console.log()`
  - Compliance-aware retention

### 5. Platform Observability Standard

- **Location**: `docs/platform-standards/platform-observability-standard.md`
- **Purpose**: OpenTelemetry integration
- **Key Requirements**:
  - ADOT integration for compute components
  - OTel environment variables
  - Custom spans for critical operations
  - Dashboard generation from KB recipes

### 6. Platform Testing Standard

- **Location**: `docs/platform-standards/platform-testing-standard.md`
- **Purpose**: Test requirements and metadata
- **Key Requirements**:
  - Vitest framework
  - CDK-Nag security tests
  - Template assertions
  - Test metadata following standard format
  - 90% code coverage target

### 7. Platform Capability Naming Standard

- **Location**: `docs/platform-standards/platform-capability-naming-standard.md`
- **Purpose**: Capability vocabulary
- **Key Requirements**:
  - Use Standard Capability Vocabulary
  - Register capabilities using standard types
  - Document capability matrix

## Additional Standards (as applicable)

- **Platform IAM Auditing Standard** - IAM policy auditing
- **Feature Flagging & Canary Deployment** - Feature flag integration
- **Platform Service Injector Standard** - Service injection patterns

## AWS Best Practices

Components SHOULD reference AWS Labs MCP server for AWS-specific guidance:
- Use `mcp_aws-knowledge-mcp-server_aws___search_documentation` for AWS service best practices
- Reference AWS Well-Architected Framework principles
- Follow AWS CDK best practices from AWS documentation

