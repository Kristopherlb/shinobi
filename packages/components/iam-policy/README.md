# IAM Policy Component

AWS IAM Policy component for granular access control with least privilege security patterns. Supports both managed and inline policies with compliance-aware configuration.

## Features

- ✅ **Policy Types**: Managed and inline IAM policies
- ✅ **Policy Templates**: Pre-defined templates for common use cases
- ✅ **Custom Policies**: Full control with policy documents
- ✅ **Least Privilege**: No wildcard templates, scoped permissions
- ✅ **Compliance Controls**: Deny insecure transport, MFA enforcement
- ✅ **Monitoring**: CloudWatch alarms for policy usage
- ✅ **Logging**: Structured logs for usage, compliance, and audit
- ✅ **Auto-Attachment**: Managed policies auto-attach to groups/roles/users
- ✅ **ConfigBuilder Pattern**: 5-layer precedence chain

## Usage

### Managed Policy with Template

```yaml
components:
  - name: read-only-policy
    type: iam-policy
    config:
      policyType: managed
      description: Read-only access to common AWS services
      policyTemplate:
        type: read-only
        resources:
          - arn:aws:s3:::my-bucket/*
          - arn:aws:dynamodb:*:*:table/my-table
      roles:
        - my-lambda-role
        - my-ecs-task-role
```

### Managed Policy with Custom Document

```yaml
components:
  - name: custom-s3-policy
    type: iam-policy
    config:
      policyType: managed
      description: Custom S3 access policy
      policyDocument:
        Version: "2012-10-17"
        Statement:
          - Sid: AllowS3Read
            Effect: Allow
            Action:
              - s3:GetObject
              - s3:ListBucket
            Resource:
              - arn:aws:s3:::my-bucket
              - arn:aws:s3:::my-bucket/*
      users:
        - service-account
```

### Inline Policy (Manual Attachment)

```yaml
components:
  - name: inline-lambda-policy
    type: iam-policy
    config:
      policyType: inline
      policyTemplate:
        type: lambda-execution
```

**Note**: Inline policies must be manually attached in `patches.ts`:

```typescript
const policy = myService.getComponent('inline-lambda-policy').getConstruct('policy') as iam.Policy;
const role = myService.getComponent('my-lambda-role').getConstruct('role') as iam.Role;
role.attachInlinePolicy(policy);
```

## Policy Templates

### `read-only`
Read-only access to common AWS services (CloudWatch, EC2, S3, IAM describe operations).

### `lambda-execution`
Lambda execution role permissions (CloudWatch Logs write).

### `ecs-task`
ECS task execution permissions (ECR pull, CloudWatch Logs write).

### `s3-access`
S3 bucket operations (GetObject, PutObject, DeleteObject, ListBucket).

### `rds-access`
RDS database access (Describe, connect).

### `dynamodb-access`
DynamoDB table operations (CRUD, Query, Scan, Batch operations).

### `custom`
Empty template - use with `additionalStatements` for fully custom policies.

## Configuration Options

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `policyType` | `'managed' \| 'inline'` | ✅ | Type of policy to create |
| `policyName` | `string` | ❌ | Policy name (auto-generated if not provided) |
| `description` | `string` | ❌ | Policy description |
| `path` | `string` | ❌ | IAM path (managed only, default: `/`) |
| `policyDocument` | `object` | ⚠️ | Raw policy document (XOR with template) |
| `policyTemplate` | `object` | ⚠️ | Policy template spec (XOR with document) |
| `groups` | `string[]` | ❌ | Groups to attach to (managed only) |
| `roles` | `string[]` | ❌ | Roles to attach to (managed only) |
| `users` | `string[]` | ❌ | Users to attach to (managed only) |
| `logging` | `object` | ❌ | CloudWatch Logs configuration |
| `monitoring` | `object` | ❌ | CloudWatch alarms configuration |
| `controls` | `object` | ❌ | Compliance controls |
| `tags` | `object` | ❌ | Resource tags (managed only) |

## Compliance Controls

### Deny Insecure Transport
```yaml
controls:
  denyInsecureTransport: true
```
Denies all transport-relevant service actions (S3, SQS, SNS, etc.) over non-TLS connections.

### Require MFA for Actions
```yaml
controls:
  requireMfaForActions:
    - iam:DeleteUser
    - iam:CreateAccessKey
    - s3:DeleteBucket
```
Requires MFA for specified sensitive actions.

## Monitoring

```yaml
monitoring:
  enabled: true
  usageAlarm:
    enabled: true
    threshold: 1000
    evaluationPeriods: 2
    periodMinutes: 60
```

## Construct Handles

- `main`: Primary policy construct (ManagedPolicy or Policy)
- `policy`: Alias for main
- `usageLogGroup`: Usage log group (if enabled)
- `complianceLogGroup`: Compliance log group (if enabled)
- `auditLogGroup`: Audit log group (if enabled)
- `policyUsageAlarm`: Usage alarm (if enabled)

## Capabilities

- `iam:policy`: IAM policy capability with ARN/ref

## Limitations

- **Inline policies do NOT support**:
  - Resource tags (AWS limitation)
  - Auto-attachment to groups/roles/users
  - Must be manually attached in `patches.ts`
  
- **Tags** only work on managed policies
- **Path** only applies to managed policies

## Compliance

Supports three compliance frameworks:
- **Commercial**: Baseline security
- **FedRAMP Moderate**: Enhanced controls
- **FedRAMP High**: Maximum security with extended log retention

## License

MIT
