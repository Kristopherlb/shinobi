# CloudFront Distribution Component

Configuration-driven CloudFront distribution that honours the platform precedence chain via `CloudFrontDistributionComponentConfigBuilder`. All compliance-specific defaults live in `/config/<framework>.yml`; the component simply consumes the resolved configuration and materialises the CDN infrastructure.

## Features

- Origin-agnostic (S3, ALB, custom HTTP) with optional custom headers and origin paths.
- Cache behaviours (default + additional) defined declaratively, including protocol policy, methods, cache/origin request policy IDs.
- Logging, geo restriction, price class, WAF and domain configuration sourced from manifest/config.
- Observability surface (4xx, 5xx, origin latency alarms) expressed via config with per-framework defaults.
- Capability payload advertises the `hardeningProfile` to downstream binders.

## Usage

```yaml
components:
  - name: static-cdn
    type: cloudfront-distribution
    config:
      comment: "Public frontend CDN"
      origin:
        type: s3
        s3BucketName: my-frontend-bucket
        originPath: /prod
      defaultBehavior:
        viewerProtocolPolicy: redirect-to-https
        allowedMethods: [GET, HEAD]
        cachedMethods: [GET, HEAD, OPTIONS]
        cachePolicyId: 658327ea-f89d-4fab-a63d-7e88639e58f6 # CacheOptimized
      logging:
        enabled: true
        bucket: platform-cloudfront-logs
        prefix: my-service/
      monitoring:
        enabled: true
        alarms:
          error4xx:
            enabled: true
            threshold: 10
          error5xx:
            enabled: true
            threshold: 2
```

Unspecified settings inherit the platform defaults for the active compliance framework (see `/config/<framework>.yml`).

## Key Configuration Sections

| Path | Description |
|------|-------------|
| `origin` | Required origin definition (`type`, with supporting properties for S3/ALB/custom HTTP). |
| `defaultBehavior` | Viewer protocol policy, allowed/cached methods, optional cache/origin request policies, compression flag. |
| `additionalBehaviors[]` | Additional path patterns that reuse the resolved origin with per-behaviour overrides. |
| `geoRestriction` | `none`, `whitelist`, or `blacklist` plus country list. |
| `priceClass` | `PriceClass_100`, `PriceClass_200`, or `PriceClass_All`. |
| `domain` | Optional ACM certificate ARN and custom domain names. |
| `logging` | Enablement, destination bucket/prefix, cookie inclusion. Logging is disabled automatically if a bucket is not provided. |
| `monitoring` | Global toggle and alarm thresholds for 4xx, 5xx, and origin latency (threshold expressed in milliseconds). |
| `webAclId` | Attach an existing AWS WAF ACL. |
| `hardeningProfile` | Abstract posture flag surfaced via capabilities (defaults to `baseline`; FedRAMP defaults set this to `hardened`/`stig`). |

## Capability

`cdn:cloudfront`

```json
{
  "type": "cdn:cloudfront",
  "distributionId": "ABC123",
  "distributionDomainName": "d123.cloudfront.net",
  "domainNames": ["app.example.com"],
  "originType": "s3",
  "priceClass": "PriceClass_200",
  "hardeningProfile": "hardened"
}
```

## Testing

```bash
corepack pnpm exec jest --runTestsByPath \
  packages/components/cloudfront-distribution/tests/cloudfront-distribution.builder.test.ts \
  packages/components/cloudfront-distribution/tests/cloudfront-distribution.component.synthesis.test.ts
```

Ensure relevant platform defaults are present in `/config/<framework>.yml` when adding new configuration knobs.
