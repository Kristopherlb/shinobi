# Static Website Component

Static website hosting with S3 and CloudFront CDN for global performance with compliance-aware configuration.

## Overview

The Static Website component provides a complete solution for hosting static websites on AWS using S3 for storage and CloudFront for global content delivery. It automatically configures security, logging, and compliance features based on your chosen compliance framework.

## Usage Example

```yaml
# service.yml
components:
  - name: marketing-website
    type: static-website
    config:
      websiteName: my-marketing-site
      domain:
        domainName: example.com
        alternativeDomainNames:
          - www.example.com
        certificateArn: arn:aws:acm:us-east-1:123456789012:certificate/12345678-1234-1234-1234-123456789012
        hostedZoneId: Z1D633PJN98FT9
      bucket:
        indexDocument: index.html
        errorDocument: 404.html
      distribution:
        enabled: true
        enableLogging: true
        logFilePrefix: cloudfront-logs/
      deployment:
        enabled: true
        sourcePath: ./dist
        retainOnDelete: false
      security:
        blockPublicAccess: true
        encryption: true
        enforceHTTPS: true
      tags:
        project: marketing
        team: frontend
```

## Configuration Reference

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `websiteName` | string | `{serviceName}-{componentName}` | Name of the website (used for resource naming) |
| `domain` | object | - | Domain configuration |
| `domain.domainName` | string | - | Primary domain name for the website |
| `domain.alternativeDomainNames` | string[] | `[]` | Alternative domain names |
| `domain.certificateArn` | string | - | ACM certificate ARN for SSL/TLS |
| `domain.hostedZoneId` | string | - | Route53 hosted zone ID |
| `bucket` | object | - | S3 bucket configuration |
| `bucket.indexDocument` | string | `index.html` | Index document for website |
| `bucket.errorDocument` | string | `error.html` | Error document for website |
| `bucket.versioning` | boolean | `false` | Enable S3 versioning |
| `bucket.accessLogging` | boolean | `false` | Enable S3 access logging |
| `distribution` | object | - | CloudFront distribution configuration |
| `distribution.enabled` | boolean | `true` | Enable CloudFront distribution |
| `distribution.enableLogging` | boolean | `false` | Enable CloudFront access logging |
| `distribution.logFilePrefix` | string | `cloudfront/` | CloudFront log file prefix |
| `deployment` | object | - | Deployment configuration |
| `deployment.sourcePath` | string | - | Source path for website files |
| `deployment.enabled` | boolean | `false` | Enable automatic deployment |
| `deployment.retainOnDelete` | boolean | `false` | Retain deployment on stack deletion |
| `security` | object | - | Security configuration |
| `security.blockPublicAccess` | boolean | `true` | Block S3 public access (uses CloudFront only) |
| `security.encryption` | boolean | `true` | Enable S3 encryption |
| `security.enforceHTTPS` | boolean | `true` | Enforce HTTPS connections |
| `tags` | object | `{}` | Additional resource tags |

## Compliance Framework Behavior

### Commercial
- Basic security configuration
- Optional versioning and logging
- 90-day log retention

### FedRAMP Moderate
- **Required**: S3 versioning enabled
- **Required**: S3 access logging enabled
- **Required**: CloudFront logging enabled
- 365-day log retention
- Enhanced security headers

### FedRAMP High
- **Required**: S3 versioning enabled
- **Required**: S3 access logging enabled
- **Required**: CloudFront logging enabled
- 3650-day (10 year) log retention
- Resource retention policy set to RETAIN
- Strictest security configuration

## Provided Capabilities

This component provides the following capabilities for binding with other components:

- `hosting:static` - Static website hosting capability
- `web:static` - Web hosting capability

### Capability Data Structure

```typescript
{
  bucketName: string;           // S3 bucket name
  websiteUrl: string;           // S3 website URL
  distributionDomainName?: string; // CloudFront domain name
  distributionId?: string;      // CloudFront distribution ID
}
```

## Construct Handles

The following construct handles are available for use in `patches.ts`:

- `main` - The primary S3 bucket construct
- `bucket` - The S3 bucket construct (same as main)
- `distribution` - The CloudFront distribution construct (if enabled)
- `deployment` - The S3 bucket deployment construct (if enabled)

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Route53 DNS   │───▶│   CloudFront     │───▶│   S3 Bucket     │
│   (Optional)    │    │   Distribution   │    │   (Website)     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                              │                        │
                              ▼                        ▼
                       ┌──────────────┐         ┌─────────────┐
                       │ CloudFront   │         │ S3 Access   │
                       │ Log Bucket   │         │ Log Bucket  │
                       │ (Optional)   │         │ (Optional)  │
                       └──────────────┘         └─────────────┘
```

## Security Features

- **Origin Access Identity (OAI)**: Restricts S3 access to CloudFront only
- **Public Access Block**: Prevents accidental public S3 access
- **HTTPS Enforcement**: Redirects HTTP traffic to HTTPS
- **Encryption**: Server-side encryption for S3 objects
- **Access Logging**: Comprehensive logging for compliance and monitoring

## Examples

### Basic Static Website
```yaml
components:
  - name: simple-site
    type: static-website
    config:
      websiteName: my-simple-site
```

### Production Website with Custom Domain
```yaml
components:
  - name: production-site
    type: static-website
    config:
      websiteName: production-website
      domain:
        domainName: mycompany.com
        certificateArn: arn:aws:acm:us-east-1:123456789012:certificate/example
      deployment:
        enabled: true
        sourcePath: ./build
```

### FedRAMP Compliant Website
```yaml
# Automatically configured when complianceFramework is set to fedramp-moderate or fedramp-high
components:
  - name: compliant-site
    type: static-website
    config:
      websiteName: compliant-website
      domain:
        domainName: secure.example.gov
        certificateArn: arn:aws:acm:us-east-1:123456789012:certificate/example
```