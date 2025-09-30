# WAF Web ACL Component

AWS WAFv2 Web Application Firewall packaged for the platform. The component is fully configuration-driven: every rule group, custom statement, logging destination, and alarm threshold flows from the manifest layered over `/config/<framework>.yml`. No runtime decisions are made from the compliance framework inside the component code.

## Highlights

- **ConfigBuilder integration** – shared 5-layer precedence engine (fallback → platform defaults → environment → manifest → policy overrides).
- **Managed & custom rules** – define AWS managed rule groups and bespoke rate/geo/IP rules with per-rule visibility settings.
- **Structured logging** – CloudWatch log group auto-created when destination type is `cloudwatch`; supports alternate destinations via ARN with optional redaction.
- **Observability** – CloudWatch alarms for blocked/allowed request volumes, configurable statistics and tags, and capability metadata for downstream binding.
- **Removal policy & tagging** – driven from configuration and applied consistently to all constructs.

## Example Manifest

```yaml
components:
  - name: storefront-waf
    type: waf-web-acl
    config:
      scope: REGIONAL
      defaultAction: block
      managedRuleGroups:
        - name: AWSManagedRulesCommonRuleSet
          vendorName: AWS
          priority: 1
        - name: AWSManagedRulesKnownBadInputsRuleSet
          vendorName: AWS
          priority: 2
      customRules:
        - name: rate-limit-login
          priority: 10
          action: block
          statement:
            type: rate-based
            limit: 2000
      logging:
        destinationType: cloudwatch
        retentionDays: 2555
      monitoring:
        alarms:
          blockedRequests:
            enabled: true
            threshold: 200
            tags:
              severity: high
```

## Configuration Surface

| Section | Description |
|---------|-------------|
| `scope` | `REGIONAL` (ALB/API Gateway) or `CLOUDFRONT`. |
| `defaultAction` | `allow` or `block` for requests that do not match any rule. |
| `managedRuleGroups[]` | AWS managed rule groups with priority, override action, excluded rules, and optional visibility overrides. |
| `customRules[]` | Custom rule definitions supporting `rate-based`, `geo-match`, and `ip-set` statements. |
| `logging` | Enable/disable logging, choose destination type, optional destination ARN/log group name, retention days, redacted fields. |
| `monitoring` | Toggle metrics/alarms; configure blocked and allowed request alarms (thresholds, evaluation periods, comparison operator, statistic, tags). |
| `removalPolicy` | `retain` or `destroy` applied to the Web ACL and associated log group. |
| `tags` | Additional key/value pairs applied to every construct created by the component. |

The complete JSON schema is available in `packages/components/waf-web-acl/waf-web-acl.builder.ts` and is exported as `WAF_WEB_ACL_CONFIG_SCHEMA`.

## Capabilities

- `security:waf-web-acl` – exposes ARN, ID, scope, and default action.
- `waf:web-acl` – detailed metadata for binders (rule counts, names).
- `monitoring:waf-web-acl` – namespace, WebACL name, and logging destination.
- `protection:web-application` – high-level protection capability for consumers.

## Testing

```bash
corepack pnpm exec jest --runTestsByPath \
  packages/components/waf-web-acl/tests/waf-web-acl.builder.test.ts \
  packages/components/waf-web-acl/tests/waf-web-acl.component.synthesis.test.ts
```

Both suites adhere to the platform testing standard with deterministic fixtures and assertions on the synthesised CloudFormation template.
