# Static Website Component

Enterprise-grade static website hosting with S3 and CloudFront CDN, featuring global performance optimization and comprehensive security controls.

## Overview

This component provides a fully managed static website hosting solution with:

- **Global CDN**: CloudFront distribution for worldwide content delivery
- **Custom Domains**: SSL/TLS certificates and DNS integration
- **Security Headers**: Configurable security policies and HTTPS enforcement
- **Compliance Hardening**: Three-tier compliance support (Commercial/FedRAMP Moderate/FedRAMP High)
- **Cost Optimization**: Intelligent caching and price class selection

## Capabilities

- **website:static**: Provides static website hosting for frontend applications

## Configuration

```yaml
components:
  - name: company-website
    type: static-website
    config:
      websiteName: company-marketing-site
      
      domain:
        domainName: www.example.com
        alternativeDomainNames:
          - example.com
        certificateArn: arn:aws:acm:us-east-1:123456789012:certificate/12345678-1234-1234-1234-123456789012
        hostedZoneId: Z1D633PJN98FT9
      
      bucket:
        indexDocument: index.html
        errorDocument: error.html
        versioning: true
        accessLogging: true
      
      distribution:
        enabled: true
        priceClass: PriceClass_100
        enableLogging: true
        logFilePrefix: cloudfront/
        defaultBehavior:
          viewerProtocolPolicy: REDIRECT_TO_HTTPS
          allowedMethods: 
            - GET
            - HEAD
            - OPTIONS
      
      deployment:
        enabled: true
        sourcePath: ./dist
        retainOnDelete: false
      
      security:
        enforceHTTPS: true
        securityHeaders:
          Strict-Transport-Security: "max-age=31536000; includeSubDomains"
          X-Content-Type-Options: "nosniff"
          X-Frame-Options: "SAMEORIGIN"
      
      tags:
        website-type: marketing
        team: frontend
```

## Binding Examples

### API Gateway to Static Website

```yaml
components:
  - name: api-backend
    type: api-gateway-v2
    config:
      cors:
        allowOrigins:
          - https://www.example.com
          - https://example.com
    binds:
      - to: company-website
        capability: website:static
        access: origin
```

This configuration allows the API to serve the static website with proper CORS settings.

## Compliance Features

### Commercial
- Basic S3 hosting with CloudFront
- Standard security configurations
- Cost-optimized settings

### FedRAMP Moderate
- Mandatory HTTPS enforcement
- Enhanced security headers
- Comprehensive access logging
- S3 versioning enabled
- 1-year log retention

### FedRAMP High
- Strict security policies (no CORS by default)
- Enhanced security headers with preload
- Global CDN presence (PriceClass_All)
- Comprehensive audit logging
- 10-year log retention
- CSP and Permissions-Policy headers

## Advanced Configuration

### Custom Security Headers

```yaml
config:
  security:
    securityHeaders:
      Content-Security-Policy: "default-src 'self'; script-src 'self' 'unsafe-inline'"
      Permissions-Policy: "geolocation=(), microphone=(), camera=()"
      Referrer-Policy: "strict-origin-when-cross-origin"
```

### Multiple CloudFront Behaviors

```yaml
config:
  distribution:
    additionalBehaviors:
      - pathPattern: "/api/*"
        origin: api-origin
        cachePolicyId: "4135ea2d-6df8-44a3-9df3-4b5a84be39ad"  # CachingDisabled
```

### Custom Error Pages

```yaml
config:
  distribution:
    errorResponses:
      - httpStatus: 404
        responseHttpStatus: 404
        responsePagePath: "/404.html"
      - httpStatus: 403
        responseHttpStatus: 403
        responsePagePath: "/403.html"
```

## Monitoring and Observability

The component automatically configures:

- **CloudWatch Metrics**: CloudFront and S3 metrics
- **Access Logs**: S3 and CloudFront access logging
- **CloudWatch Alarms**: Error rate and performance monitoring
- **Security Logs**: Compliance-specific security monitoring
- **Cost Monitoring**: Usage and data transfer tracking

### Monitoring Levels

- **Basic**: Standard metrics and error monitoring
- **Enhanced**: Access logging + performance metrics
- **Comprehensive**: Enhanced + security monitoring + audit trails

## Security Features

### HTTPS and TLS
- Automatic HTTPS enforcement
- TLS 1.2+ minimum requirements
- ACM certificate integration
- HSTS headers for security

### Access Control
- S3 bucket public access blocking
- CloudFront Origin Access Identity
- Configurable security headers
- IP-based access restrictions (optional)

### Content Security
- File type validation
- Malware scanning integration
- Content integrity checks
- Automated security updates

## Deployment Options

### Automated Deployment

```yaml
config:
  deployment:
    enabled: true
    sourcePath: ./build
    excludePatterns:
      - "*.map"
      - "test/*"
    invalidationPaths:
      - "/*"
```

### Manual Deployment

For manual deployments, the component creates S3 buckets that can be updated independently:

```bash
aws s3 sync ./dist s3://company-marketing-site --delete
aws cloudfront create-invalidation --distribution-id E123456789 --paths "/*"
```

## Custom Domain Configuration

### DNS Configuration

The component automatically creates Route53 records when `hostedZoneId` is provided:

```yaml
config:
  domain:
    domainName: www.example.com
    hostedZoneId: Z1D633PJN98FT9  # Automatic A record creation
```

### Certificate Management

For automatic certificate creation and validation:

```yaml
config:
  domain:
    domainName: www.example.com
    certificateValidation: DNS  # Requires hosted zone access
```

## Troubleshooting

### Common Issues

1. **SSL Certificate Errors**
   - Verify certificate ARN is valid and in us-east-1
   - Check domain validation status
   - Ensure certificate covers all domain names

2. **CloudFront Distribution Issues**
   - Check origin configuration and S3 bucket policies
   - Verify security groups allow CloudFront access
   - Monitor invalidation status for cache updates

3. **DNS Resolution Problems**
   - Verify Route53 hosted zone configuration
   - Check A record creation and propagation
   - Ensure domain registrar points to correct nameservers

### Debug Mode

Enable detailed logging for debugging:

```yaml
config:
  distribution:
    enableLogging: true
    logBucket: debug-logs-bucket
    logFilePrefix: debug/
```

## Examples

See the [`examples/`](../../examples/) directory for complete service templates:

- `examples/spa-website/` - Single-page application hosting
- `examples/marketing-site/` - Corporate marketing website
- `examples/documentation/` - Static documentation site

## API Reference

### StaticWebsiteComponent

Main component class that extends `Component`.

#### Methods

- `synth()`: Creates AWS resources (S3 Bucket, CloudFront Distribution, Route53 Records)
- `getCapabilities()`: Returns website:static capability
- `getType()`: Returns 'static-website'

### Configuration Interfaces

- `StaticWebsiteConfig`: Main configuration interface
- `STATIC_WEBSITE_CONFIG_SCHEMA`: JSON schema for validation

## Development

To contribute to this component:

1. Make changes to the source code
2. Run tests: `npm test`
3. Build: `npm run build`
4. Follow the [Contributing Guide](../../../CONTRIBUTING.md)

## License

MIT License - see LICENSE file for details.