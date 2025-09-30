# SSM Parameter Component

Configuration-driven wrapper around AWS Systems Manager Parameter Store. The component no longer inspects `context.complianceFramework`; all behaviour (parameter type, tier, encryption, tagging) is dictated by the manifest merged with `/config/<framework>.yml` defaults.

## Highlights

- **ConfigBuilder integration** – shared precedence engine (fallback → platform defaults → environment → manifest → policy overrides).
- **Explicit parameter kinds** – create plain strings, string lists, or secure strings using `kind` plus `value`/`values`.
- **Encryption controls** – toggle customer-managed keys (existing ARN or auto-provisioned) and rotation through the `encryption.customerManagedKey` block.
- **Tier & data type** – choose between `standard`/`advanced` and set `text` or `aws:ec2:image` data types.
- **Tagging & capabilities** – standard platform tagging plus `configuration:parameter` capability describing the created parameter.

## Example Manifest

```yaml
components:
  - name: checkout-db-password
    type: ssm-parameter
    config:
      name: /checkout/prod/db/password
      kind: secureString
      value: '{{ env:CHECKOUT_DB_PASSWORD }}'
      tier: advanced
      encryption:
        customerManagedKey:
          enabled: true
          rotationEnabled: true
      tags:
        environment: production
        team: platform
```

## Configuration Reference

| Field | Type | Default | Notes |
|-------|------|---------|-------|
| `name` | string | `/<service>/<component>` | SSM parameter name (path or simple). |
| `description` | string | – | Optional description. |
| `kind` | `string \| stringList \| secureString` | `string` | Determines construct and encryption behaviour. |
| `value` | string | `''` | Value for `string`/`secureString`. Can be used (comma-separated) to seed `stringList`. |
| `values` | string[] | `[]` | Preferred source for `stringList` values. |
| `allowedPattern` | string | – | Regular expression enforced by Parameter Store. |
| `tier` | `standard \| advanced` | `standard` (`advanced` auto-selected for `secureString`) | Maps to `ssm.ParameterTier`. |
| `dataType` | `text \| aws:ec2:image` | `text` | Only honoured for string/secureString. |
| `encryption.customerManagedKey.enabled` | boolean | `false` | When `true` a key is created unless `kmsKeyArn` supplied. |
| `encryption.customerManagedKey.kmsKeyArn` | string | – | Use an existing CMK instead of creating one. |
| `encryption.customerManagedKey.rotationEnabled` | boolean | `false` | Applies when the component creates the key. |
| `encryption.customerManagedKey.allowSsmService` | boolean | `true` | Adds resource policy for SSM service access when creating the key. |
| `tags` | object | `{}` | Additional resource tags merged with platform defaults. |

## Capabilities

- `configuration:parameter` – exposes the parameter ARN, name, kind, tier, and customer-managed key information for binders.

## Construct Handles

- `main`, `parameter`, `kmsKey` (when created).

## Testing

```bash
corepack pnpm exec jest --runTestsByPath \
  packages/components/ssm-parameter/tests/ssm-parameter.builder.test.ts \
  packages/components/ssm-parameter/tests/ssm-parameter.component.synthesis.test.ts
```

The builder suite validates precedence/normalisation, while the synthesis suite asserts the generated CloudFormation resources.
