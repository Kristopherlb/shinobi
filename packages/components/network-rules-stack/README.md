# Network Rules Stack Component

Applies cross-stack security group rules from SSM Parameter Store to target security groups. This component enables independent service deployment by allowing Service A to add rules to Service B's security group without requiring Service B to be redeployed.

## Overview

The Network Rules Stack component reads cross-stack security group rule specifications from AWS Systems Manager (SSM) Parameter Store at deployment time and applies them to target security groups. It handles:

- **Pagination**: Automatically handles SSM `getParametersByPath` pagination (10 results per call)
- **Error Handling**: Skips invalid rule specifications with warnings, continues with valid rules
- **Deduplication**: Prevents duplicate rules (same peer, port, protocol, type)
- **Rule Lifecycle**: Automatically removes rules when SSM parameters are deleted
- **Description Enrichment**: Adds `(from service-x)` suffix to rule descriptions for debugging

## Architecture

The component uses a Lambda-backed Custom Resource pattern to query SSM at deployment time (since CDK synthesis is static):

1. **SSM Query Lambda**: Queries SSM Parameter Store with pagination support
2. **Rule Application Lambda**: Parses rule specifications and applies them via EC2 API
3. **Custom Resources**: Trigger Lambda functions at deployment time

## Usage

### Basic Usage

```yaml
# service.yml
service: platform-network-rules
components:
  - name: cross-stack-rules
    type: network-rules-stack
    config:
      description: "Cross-stack security group rules from all services"
```

### With Custom Path and Tags

```yaml
# service.yml
service: platform-network-rules
components:
  - name: cross-stack-rules
    type: network-rules-stack
    config:
      description: "Cross-stack security group rules from all services"
      ssmPathPrefix: "/shinobi/network-rules"
      tags:
        Team: "Platform Engineering"
        CostCenter: "Infrastructure"
        Purpose: "Cross-stack networking"
```

### Full Shared Platform Service Example

```yaml
# platform-infrastructure/service.yml
service: platform-infrastructure
owner: Platform Engineering
complianceFramework: fedramp-moderate
environment: production
region: us-east-1

components:
  - name: network-rules-stack
    type: network-rules-stack
    config:
      description: "Centralized cross-stack security group rules management"
      tags:
        Team: "Platform Engineering"
        CostCenter: "Infrastructure"
        ManagedBy: "shinobi"
        Purpose: "cross-stack-security-group-rules"
```

Deploy with: `shinobi up`

## Configuration

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `ssmPathPrefix` | string | `/shinobi/network-rules` | SSM Parameter Store path prefix for network rules |
| `description` | string | `"Cross-stack security group rules from all services"` | Component description |
| `tags` | object | `{}` | Additional tags for cost allocation, ownership, etc. |

## How It Works

1. **Rule Storage**: When Service A binds to Service B, `SecurityGroupRulePostProcessor` stores rule specifications in SSM Parameter Store at `/shinobi/network-rules/{service}/{bindingId}`

2. **Rule Application**: The Network Rules Stack component:
   - Queries SSM Parameter Store (with pagination)
   - Parses rule specifications (skips invalid with warnings)
   - Groups rules by target security group
   - Deduplicates rules
   - Applies rules via EC2 API

3. **Rule Removal**: When a binding is removed:
   - `CrossStackRuleManager.markRuleForDeletion()` deletes the SSM parameter
   - Next deployment of Network Rules Stack component omits the deleted parameter
   - Rules are automatically removed (no longer applied)

## Rule Specification Format

Rules are stored in SSM Parameter Store as JSON with the following format:

```json
{
  "ruleId": "unique-rule-id",
  "targetSecurityGroupId": "sg-1234567890abcdef0",
  "rule": {
    "type": "ingress",
    "peer": {
      "kind": "sg",
      "id": "sg-0987654321fedcba0"
    },
    "port": {
      "protocol": "tcp",
      "from": 443,
      "to": 443
    },
    "description": "Allow HTTPS from service A"
  },
  "sourceComponent": "service-a-api",
  "targetComponent": "service-b-api",
  "bindingId": "binding-123",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "vpcId": "vpc-12345678"
}
```

## Error Handling

- **Invalid JSON**: Skipped with warning, logged to CloudWatch
- **Missing Required Fields**: Skipped with warning
- **Duplicate Rules**: First occurrence kept, subsequent duplicates ignored
- **EC2 API Errors**: Non-duplicate errors cause Custom Resource failure

## Limitations

- **Delayed Rule Revocation**: Rules remain active until the Network Rules Stack component is redeployed after SSM parameter deletion
- **No Immediate Updates**: Rules are applied/removed on component deployment, not in real-time
- **EC2 API Limits**: Subject to EC2 API rate limits when applying many rules

## Dependencies

- `@shinobi/core` - BaseComponent, ComponentContext, CrossStackRuleManager
- `aws-cdk-lib` - CDK constructs, AwsCustomResource, Lambda

## Related Components

- **Security Group Import**: Import existing security groups from SSM
- **Security Group Binder**: Bind components to security groups

## See Also

- [SG-003: Cross-Stack Security Group Dependencies](../docs/tickets/security-groups/SG-003-cross-stack-security-group-dependencies.md)
- [SG-006: Binding Result Post-Processor](../docs/tickets/security-groups/SG-006-binding-result-post-processor.md)

