# API Gateway REST Component - Troubleshooting Runbook

## Overview
This runbook provides step-by-step troubleshooting procedures for the API Gateway REST component, covering common issues, monitoring, and resolution strategies.

## Table of Contents
1. [Common Issues](#common-issues)
2. [Monitoring & Diagnostics](#monitoring--diagnostics)
3. [Performance Optimization](#performance-optimization)
4. [Security Issues](#security-issues)
5. [Compliance & Audit](#compliance--audit)
6. [Emergency Procedures](#emergency-procedures)

## Common Issues

### 1. High Error Rates (4XX/5XX)

**Symptoms:**
- CloudWatch alarms triggering for error rates
- Users reporting API failures
- High 4XX/5XX error percentages

**Diagnostic Steps:**
1. Check CloudWatch metrics for error rate trends
2. Review API Gateway logs for specific error patterns
3. Examine X-Ray traces for request flow issues
4. Verify authentication and authorization configuration

**Resolution:**
```bash
# Check error rates
aws cloudwatch get-metric-statistics \
  --namespace AWS/ApiGateway \
  --metric-name 4XXError \
  --dimensions Name=ApiName,Value=your-api-name \
  --start-time 2024-01-01T00:00:00Z \
  --end-time 2024-01-01T23:59:59Z \
  --period 300 \
  --statistics Sum

# Review recent errors
aws logs filter-log-events \
  --log-group-name /aws/apigateway/your-api-name \
  --start-time $(date -d '1 hour ago' +%s)000 \
  --filter-pattern "ERROR"
```

**Prevention:**
- Implement proper request validation
- Set up comprehensive monitoring
- Use circuit breakers for downstream services
- Regular load testing

### 2. High Latency Issues

**Symptoms:**
- P95/P99 latency alarms triggering
- Slow API response times
- User complaints about performance

**Diagnostic Steps:**
1. Analyze X-Ray traces for bottlenecks
2. Check integration latency metrics
3. Review cache hit ratios
4. Examine database connection pools

**Resolution:**
```bash
# Check latency metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/ApiGateway \
  --metric-name Latency \
  --dimensions Name=ApiName,Value=your-api-name \
  --start-time 2024-01-01T00:00:00Z \
  --end-time 2024-01-01T23:59:59Z \
  --period 300 \
  --statistics Average,Maximum

# Analyze X-Ray traces
aws xray get-trace-summaries \
  --time-range-type TimeRangeByStartTime \
  --start-time 2024-01-01T00:00:00Z \
  --end-time 2024-01-01T23:59:59Z
```

**Prevention:**
- Enable API Gateway caching
- Optimize Lambda function performance
- Use connection pooling
- Implement proper timeout configurations

### 3. Authentication Failures

**Symptoms:**
- 401 Unauthorized errors
- Cognito integration issues
- API key validation failures

**Diagnostic Steps:**
1. Check Cognito User Pool configuration
2. Verify API key usage plan settings
3. Review IAM policies and roles
4. Test authentication flows

**Resolution:**
```bash
# Check Cognito User Pool
aws cognito-idp describe-user-pool \
  --user-pool-id us-west-2_abc123DEF

# Verify API key status
aws apigateway get-api-key \
  --api-key your-api-key-id \
  --include-value

# Test authentication
curl -H "Authorization: Bearer $TOKEN" \
  https://your-api-id.execute-api.us-west-2.amazonaws.com/prod/endpoint
```

**Prevention:**
- Regular security audits
- Proper token validation
- Secure credential management
- Multi-factor authentication

## Monitoring & Diagnostics

### Key Metrics to Monitor

1. **Error Rates**
   - 4XX Error Rate (target: <5%)
   - 5XX Error Rate (target: <1%)
   - Integration Error Rate

2. **Performance Metrics**
   - P95 Latency (target: <2000ms)
   - P99 Latency (target: <5000ms)
   - Integration Latency

3. **Traffic Metrics**
   - Request Count
   - Data Transfer
   - Cache Hit Ratio

### CloudWatch Dashboards

Access the component's dashboard:
- **Business Metrics**: Transaction volume, user activity
- **Technical Metrics**: Error rates, latency, throughput
- **Security Metrics**: Authentication failures, WAF blocks

### Alerting Rules

1. **Critical Alerts** (Immediate Response)
   - 5XX Error Rate > 1%
   - P99 Latency > 5000ms
   - API Gateway down

2. **Warning Alerts** (Within 15 minutes)
   - 4XX Error Rate > 5%
   - P95 Latency > 2000ms
   - Low throughput

3. **Info Alerts** (Within 1 hour)
   - Cache hit ratio < 80%
   - High request volume
   - Performance degradation

## Performance Optimization

### Caching Strategy

1. **API Gateway Caching**
   ```yaml
   caching:
     enabled: true
     ttl: 300  # 5 minutes
     dataEncrypted: true
     requireAuthorizationCacheKey: true
   ```

2. **Response Caching**
   - Set appropriate Cache-Control headers
   - Use ETags for conditional requests
   - Implement cache invalidation strategies

### Throttling Configuration

1. **Global Throttling**
   ```yaml
   throttling:
     burstLimit: 5000
     rateLimit: 1000
   ```

2. **Per-Method Throttling**
   ```yaml
   advancedThrottling:
     perMethodThrottling: true
     customThrottlingRules:
       - path: "/users"
         method: "GET"
         burstLimit: 1000
         rateLimit: 100
   ```

### Integration Optimization

1. **Lambda Functions**
   - Optimize cold start times
   - Use provisioned concurrency for critical functions
   - Implement proper error handling

2. **Database Connections**
   - Use connection pooling
   - Implement read replicas
   - Optimize query performance

## Security Issues

### WAF Integration

1. **Web Application Firewall**
   ```yaml
   waf:
     webAclArn: "arn:aws:wafv2:us-west-2:123456789012:regional/webacl/your-webacl/abc123"
   ```

2. **Common WAF Rules**
   - SQL injection protection
   - XSS prevention
   - Rate limiting
   - Geographic restrictions

### Resource Policies

1. **IP-based Access Control**
   ```yaml
   resourcePolicy:
     allowFromIpRanges:
       - "203.0.113.0/24"
     denyFromIpRanges:
       - "198.51.100.0/24"
   ```

2. **VPC-based Access**
   ```yaml
   resourcePolicy:
     allowFromVpcs:
       - "vpc-12345678"
   ```

### Request Validation

1. **Body Validation**
   ```yaml
   requestValidation:
     validateRequestBody: true
     bodySchema:
       type: "object"
       required: ["userId", "email"]
       properties:
         userId:
           type: "string"
         email:
           type: "email"
   ```

2. **Header Validation**
   ```yaml
   requestValidation:
     validateHeaders: true
     requiredHeaders:
       - "Authorization"
       - "Content-Type"
   ```

## Compliance & Audit

### FedRAMP Compliance

1. **Required Controls**
   - Encryption in transit and at rest
   - Access logging enabled
   - Audit trail maintenance
   - Data classification tagging

2. **Audit Checklist**
   - [ ] All resources properly tagged
   - [ ] Logging retention configured
   - [ ] Encryption enabled
   - [ ] Access controls in place
   - [ ] Monitoring configured

### Logging Requirements

1. **Access Logs**
   ```yaml
   logging:
     accessLoggingEnabled: true
     retentionInDays: 2555  # 7 years for FedRAMP High
   ```

2. **Execution Logs**
   ```yaml
   logging:
     executionLoggingLevel: "INFO"
     dataTraceEnabled: false  # Required for FedRAMP
   ```

## Emergency Procedures

### API Gateway Down

1. **Immediate Actions**
   - Check AWS Service Health Dashboard
   - Verify regional availability
   - Check for recent deployments
   - Review CloudWatch alarms

2. **Recovery Steps**
   - Rollback to last known good deployment
   - Check IAM permissions
   - Verify resource limits
   - Contact AWS Support if needed

### High Error Rate

1. **Immediate Actions**
   - Check downstream service health
   - Review recent configuration changes
   - Analyze error patterns
   - Implement circuit breakers

2. **Recovery Steps**
   - Scale up resources if needed
   - Disable problematic features
   - Implement rate limiting
   - Notify stakeholders

### Security Incident

1. **Immediate Actions**
   - Isolate affected resources
   - Review access logs
   - Check for unauthorized access
   - Notify security team

2. **Recovery Steps**
   - Revoke compromised credentials
   - Update security policies
   - Conduct security audit
   - Implement additional monitoring

## Contact Information

- **Platform Team**: platform@company.com
- **Security Team**: security@company.com
- **On-Call Engineer**: +1-555-0123
- **AWS Support**: Enterprise Support Case

## References

- [AWS API Gateway Documentation](https://docs.aws.amazon.com/apigateway/)
- [Platform Standards](../docs/platform-standards/)
- [Component Configuration Schema](./Config.schema.json)
- [Observability Dashboard](./observability/otel-dashboard-template.json)
