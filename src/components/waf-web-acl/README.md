# WAF Web ACL Component

AWS WAF Web Application Firewall with comprehensive security rules and compliance hardening. Provides protection against common web exploits, OWASP Top 10 vulnerabilities, and compliance-specific threats.

## Overview

The WAF Web ACL component provides:

- **Production-ready** web application firewall functionality
- **Comprehensive compliance** (Commercial, FedRAMP Moderate/High)
- **Integrated monitoring** and observability with CloudWatch alarms
- **Security-first** configuration with AWS Managed Rule Groups
- **Platform integration** with other components through capabilities

### Category: security

### AWS Service: WAFV2

This component manages AWS WAF v2 Web ACLs and provides a simplified, secure interface for protecting web applications from common attacks and compliance threats.

## Usage Example

### Basic Configuration

```yaml
service: my-service
owner: platform-team
complianceFramework: commercial

components:
  - name: my-web-firewall
    type: waf-web-acl
    config:
      description: "Production WAF for web application"
      scope: REGIONAL
      defaultAction: allow
      monitoring:
        enabled: true
        detailedMetrics: true
```

### Advanced Configuration

```yaml
components:
  - name: advanced-waf
    type: waf-web-acl
    config:
      description: "Advanced WAF with custom rules and comprehensive logging"
      scope: REGIONAL
      defaultAction: allow
      managedRuleGroups:
        - name: AWSManagedRulesCommonRuleSet
          vendorName: AWS
          priority: 1
          overrideAction: none
        - name: AWSManagedRulesSQLiRuleSet
          vendorName: AWS
          priority: 2
          overrideAction: none
        - name: AWSManagedRulesAmazonIpReputationList
          vendorName: AWS
          priority: 3
          overrideAction: count
      customRules:
        - name: GeoBlockRule
          priority: 100
          action: block
          statement:
            type: geo-match
            countries: ["CN", "RU", "KP"]
        - name: RateLimitRule
          priority: 200
          action: count
          statement:
            type: rate-based
            rateLimit: 2000
      logging:
        enabled: true
        logDestinationType: cloudwatch
        redactedFields:
          - type: header
            name: authorization
          - type: query-string
      monitoring:
        enabled: true
        detailedMetrics: true
        alarms:
          blockedRequestsThreshold: 1000
          allowedRequestsThreshold: 50000
          sampledRequestsEnabled: true
      tags:
        project: "security"
        criticality: "high"
```

### CloudFront Configuration

```yaml
components:
  - name: cloudfront-waf
    type: waf-web-acl
    config:
      description: "WAF for CloudFront distribution"
      scope: CLOUDFRONT
      defaultAction: allow
      managedRuleGroups:
        - name: AWSManagedRulesCommonRuleSet
          vendorName: AWS
          priority: 1
        - name: AWSManagedRulesAmazonIpReputationList
          vendorName: AWS
          priority: 2
```

## Configuration Reference

### Root Configuration

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `name` | string | No | Web ACL name (auto-generated if not provided) |
| `description` | string | No | Web ACL description |
| `scope` | string | No | WAF scope: `REGIONAL` or `CLOUDFRONT` (default: `REGIONAL`) |
| `defaultAction` | string | No | Default action: `allow` or `block` (default: `allow`) |
| `managedRuleGroups` | array | No | AWS Managed Rule Groups to include |
| `customRules` | array | No | Custom WAF rules |
| `logging` | object | No | WAF logging configuration |
| `monitoring` | object | No | Monitoring and observability configuration |
| `tags` | object | No | Additional resource tags |

### Managed Rule Groups Configuration

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `name` | string | Yes | AWS Managed Rule Group name |
| `vendorName` | string | Yes | Vendor name (usually "AWS") |
| `priority` | number | Yes | Rule priority (must be unique) |
| `overrideAction` | string | No | Override action: `none` or `count` (default: `none`) |
| `excludedRules` | array | No | Rule names to exclude from the group |

### Custom Rules Configuration

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `name` | string | Yes | Custom rule name |
| `priority` | number | Yes | Rule priority (must be unique) |
| `action` | string | Yes | Rule action: `allow`, `block`, or `count` |
| `statement` | object | Yes | Rule statement configuration |

### Logging Configuration

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `enabled` | boolean | No | Enable WAF logging (default: `true`) |
| `logDestinationType` | string | No | Log destination: `cloudwatch`, `s3`, or `kinesis-firehose` (default: `cloudwatch`) |
| `destinationArn` | string | No | Custom log destination ARN |
| `redactedFields` | array | No | Fields to redact from logs |

### Monitoring Configuration

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `enabled` | boolean | No | Enable monitoring (default: `true`) |
| `detailedMetrics` | boolean | No | Enable detailed CloudWatch metrics |
| `alarms` | object | No | CloudWatch alarm configuration |

### Alarm Configuration

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `blockedRequestsThreshold` | number | No | Blocked requests alarm threshold (default: `1000`) |
| `allowedRequestsThreshold` | number | No | Allowed requests alarm threshold (default: `10000`) |
| `sampledRequestsEnabled` | boolean | No | Enable sampled requests (default: `true`) |

## Capabilities Provided

This component provides the following capabilities for binding with other components:

- `security:waf-web-acl` - Main WAF Web ACL capability with ID, ARN, name, and scope
- `monitoring:waf-web-acl` - Monitoring capability with metrics namespace
- `waf:web-acl` - WAF-specific capability with detailed configuration
- `protection:web-application` - Web application protection capability

### Capability Data Structure

```typescript
{
  "security:waf-web-acl": {
    webAclId: string,
    webAclArn: string,
    webAclName: string,
    scope: "REGIONAL" | "CLOUDFRONT"
  },
  "waf:web-acl": {
    id: string,
    arn: string,
    name: string,
    scope: "REGIONAL" | "CLOUDFRONT",
    defaultAction: "allow" | "block"
  }
}
```

## Construct Handles

The following construct handles are available for use in `patches.ts`:

- `main` - Main WAF Web ACL construct
- `webAcl` - WAF Web ACL construct (same as main)
- `logGroup` - CloudWatch Log Group (if CloudWatch logging is enabled)
- `logBucket` - S3 Bucket (if S3 logging is enabled)
- `logDeliveryStream` - Kinesis Firehose Delivery Stream (if Firehose logging is enabled)
- `loggingConfiguration` - WAF Logging Configuration

## Compliance Frameworks

### Commercial

- Standard AWS Managed Rule Groups (Common, Known Bad Inputs)
- Basic monitoring with standard alarm thresholds
- 1-year log retention
- Allow default action for balanced security

### FedRAMP Moderate

- Enhanced AWS Managed Rule Groups (includes SQLi, Linux, Unix rules)
- Mandatory logging enabled
- 3-year log retention
- Block default action for stricter security
- Enhanced monitoring with stricter alarm thresholds

### FedRAMP High

- Comprehensive AWS Managed Rule Groups
- Mandatory logging with 7-year retention
- Block default action with highest security
- Strictest alarm thresholds
- Resource retention policies to prevent accidental deletion

## Common Managed Rule Groups

### Essential Rule Groups (Recommended for all deployments)

- `AWSManagedRulesCommonRuleSet` - OWASP Top 10 protection
- `AWSManagedRulesKnownBadInputsRuleSet` - Known malicious inputs
- `AWSManagedRulesSQLiRuleSet` - SQL injection protection

### Additional Rule Groups (For enhanced security)

- `AWSManagedRulesLinuxRuleSet` - Linux-specific protections
- `AWSManagedRulesUnixRuleSet` - Unix-specific protections
- `AWSManagedRulesAmazonIpReputationList` - IP reputation filtering
- `AWSManagedRulesAnonymousIpList` - Anonymous IP blocking

## Best Practices

1. **Always enable logging** in production environments for security analysis
2. **Use REGIONAL scope** for ALB/API Gateway, **CLOUDFRONT scope** for CloudFront
3. **Configure appropriate alarm thresholds** based on expected traffic patterns
4. **Review compliance requirements** for your specific environment
5. **Test rule configurations** in development before production deployment
6. **Monitor blocked requests** to identify potential false positives
7. **Use count action** initially for new rules to assess impact

## Integration Examples

### With Application Load Balancer

```yaml
components:
  - name: web-firewall
    type: waf-web-acl
    config:
      scope: REGIONAL
      defaultAction: allow
  
  - name: app-load-balancer
    type: application-load-balancer
    config:
      # ALB will automatically use the WAF Web ACL capability
```

### With CloudFront Distribution

```yaml
components:
  - name: cdn-firewall
    type: waf-web-acl
    config:
      scope: CLOUDFRONT
      defaultAction: allow
  
  - name: cdn-distribution
    type: cloudfront-distribution
    config:
      # CloudFront will use the WAF Web ACL capability
```

## Troubleshooting

### Common Issues

1. **Configuration validation errors** - Check rule priorities are unique
2. **Missing capabilities** - Verify component synthesis completed successfully
3. **Logging not working** - Ensure proper IAM permissions for log destinations
4. **High blocked requests** - Review rule configurations for false positives

### Debugging

1. **Enable verbose logging** in the platform CLI
2. **Check CloudWatch metrics** for request patterns
3. **Review WAF sampled requests** in AWS Console
4. **Use patches.ts** for advanced rule customization if needed

## Performance Considerations

1. **Monitor rule evaluation time** through CloudWatch metrics
2. **Optimize rule priorities** - place most specific rules first
3. **Review cost implications** of detailed monitoring and logging
4. **Consider rule group overhead** when adding multiple managed groups

## Security Considerations

1. **Regularly review and update** managed rule groups
2. **Monitor for new AWS managed rules** and security updates
3. **Implement proper log analysis** for security incident response
4. **Use least restrictive rules** initially, then tighten based on analysis
5. **Regularly audit custom rules** for effectiveness and accuracy

## Development

### Running Tests

```bash
# Run all tests for this component
npm test -- --testPathPattern=waf-web-acl

# Run only builder tests
npm test -- --testPathPattern=waf-web-acl.builder

# Run only synthesis tests
npm test -- --testPathPattern=waf-web-acl.component.synthesis
```

### Contributing

When contributing to this component:

1. **Follow the Platform Component API Contract v1.1**
2. **Add tests for new functionality**
3. **Update documentation** for configuration changes
4. **Verify compliance** with all supported frameworks
5. **Test with actual WAF rules** in AWS environment

---

*Component follows Platform Component API Contract v1.1*  
*Supports Commercial, FedRAMP Moderate, and FedRAMP High compliance frameworks*