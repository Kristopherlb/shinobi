# API Gateway REST Component - Advanced Configuration Examples

## Overview
This document provides comprehensive examples of advanced configurations for the API Gateway REST component, covering security, performance, monitoring, and compliance scenarios.

## Table of Contents
1. [Security-First Configuration](#security-first-configuration)
2. [High-Performance Configuration](#high-performance-configuration)
3. [FedRAMP High Compliance](#fedramp-high-compliance)
4. [Multi-Environment Setup](#multi-environment-setup)
5. [Advanced Monitoring](#advanced-monitoring)
6. [Custom Domain & SSL](#custom-domain--ssl)
7. [API Versioning Strategy](#api-versioning-strategy)
8. [Microservices Integration](#microservices-integration)

## Security-First Configuration

### Enterprise Security with WAF and Resource Policies

```yaml
apiName: "secure-enterprise-api"
description: "Enterprise API with comprehensive security controls"
disableExecuteApiEndpoint: true  # Required for FedRAMP

# WAF Integration
waf:
  webAclArn: "arn:aws:wafv2:us-west-2:123456789012:regional/webacl/enterprise-webacl/abc123"

# Resource Policy for Access Control
resourcePolicy:
  allowFromVpcs:
    - "vpc-12345678"  # Corporate VPC
    - "vpc-87654321"  # Partner VPC
  allowFromIpRanges:
    - "203.0.113.0/24"  # Corporate office
    - "198.51.100.0/24" # Partner office
  denyFromIpRanges:
    - "192.0.2.0/24"    # Blocked IP range
  allowFromAwsAccounts:
    - "123456789012"    # Trusted AWS account
  allowFromRegions:
    - "us-west-2"       # Only US West 2
    - "us-east-1"       # Only US East 1
  denyFromRegions:
    - "ap-southeast-1"  # Block Asia Pacific

# Request Validation
requestValidation:
  validateRequestBody: true
  validateRequestParameters: true
  validateHeaders: true
  requiredHeaders:
    - "Authorization"
    - "Content-Type"
    - "X-Request-ID"
  bodySchema:
    type: "object"
    required: ["userId", "action"]
    properties:
      userId:
        type: "string"
        pattern: "^[a-zA-Z0-9-]+$"
      action:
        type: "string"
        enum: ["create", "read", "update", "delete"]

# CORS with Security Restrictions
cors:
  allowOrigins:
    - "https://app.company.com"
    - "https://admin.company.com"
  allowMethods:
    - "GET"
    - "POST"
    - "PUT"
    - "DELETE"
  allowHeaders:
    - "Content-Type"
    - "Authorization"
    - "X-Request-ID"
  allowCredentials: true
  maxAge: 3600

# Authentication with Cognito
authentication:
  cognito:
    userPoolArn: "arn:aws:cognito-idp:us-west-2:123456789012:userpool/us-west-2_abc123DEF"
    scopes:
      - "api.read"
      - "api.write"
      - "api.admin"

# Advanced Throttling
advancedThrottling:
  perMethodThrottling: true
  burstLimit: 10000
  rateLimit: 2000
  quotaLimit: 1000000
  quotaPeriod: "DAY"
  customThrottlingRules:
    - path: "/admin"
      method: "GET"
      burstLimit: 100
      rateLimit: 10
    - path: "/admin"
      method: "POST"
      burstLimit: 50
      rateLimit: 5
    - path: "/public"
      method: "GET"
      burstLimit: 5000
      rateLimit: 1000

# Comprehensive Logging
logging:
  accessLoggingEnabled: true
  retentionInDays: 2555  # 7 years for compliance
  executionLoggingLevel: "INFO"
  dataTraceEnabled: false  # Required for FedRAMP
  metricsEnabled: true

# Enhanced Monitoring
monitoring:
  detailedMetrics: true
  tracingEnabled: true
  thresholds:
    errorRate4xxPercent: 2
    errorRate5xxPercent: 0.5
    highLatencyMs: 1000
    lowThroughput: 500
  customMetrics:
    - name: "SecurityViolations"
      namespace: "MyApp/Security"
      statistic: "Sum"
      period: 300
      unit: "Count"
    - name: "AuthenticationFailures"
      namespace: "MyApp/Security"
      statistic: "Sum"
      period: 300
      unit: "Count"
  businessMetrics:
    transactionVolume: true
    userActivity: true
    featureUsage: true
    performanceMetrics: true

# Compliance Tags
tags:
  data-classification: "confidential"
  compliance-framework: "fedramp-high"
  owner: "security-team"
  cost-center: "security-ops"
```

## High-Performance Configuration

### Optimized for High Throughput and Low Latency

```yaml
apiName: "high-performance-api"
description: "High-performance API optimized for speed and throughput"

# Performance-Optimized CORS
cors:
  allowOrigins:
    - "https://app.example.com"
  allowMethods:
    - "GET"
    - "POST"
    - "PUT"
    - "DELETE"
    - "OPTIONS"
  allowHeaders:
    - "Content-Type"
    - "Authorization"
    - "X-Request-ID"
  allowCredentials: false  # Better performance
  maxAge: 86400  # 24 hours

# Optimized Throttling
throttling:
  burstLimit: 20000
  rateLimit: 5000

advancedThrottling:
  perMethodThrottling: true
  burstLimit: 50000
  rateLimit: 10000
  quotaLimit: 10000000
  quotaPeriod: "DAY"
  customThrottlingRules:
    - path: "/cache"
      method: "GET"
      burstLimit: 100000
      rateLimit: 20000
    - path: "/search"
      method: "GET"
      burstLimit: 50000
      rateLimit: 10000
    - path: "/upload"
      method: "POST"
      burstLimit: 1000
      rateLimit: 100

# Performance Monitoring
monitoring:
  detailedMetrics: true
  tracingEnabled: true
  thresholds:
    errorRate4xxPercent: 3
    errorRate5xxPercent: 0.5
    highLatencyMs: 500  # Stricter latency requirements
    lowThroughput: 1000
  customMetrics:
    - name: "CacheHitRatio"
      namespace: "MyApp/Performance"
      statistic: "Average"
      period: 60
      unit: "Percent"
    - name: "ResponseTime"
      namespace: "MyApp/Performance"
      statistic: "Average"
      period: 60
      unit: "Milliseconds"
    - name: "Throughput"
      namespace: "MyApp/Performance"
      statistic: "Sum"
      period: 60
      unit: "Count"
  businessMetrics:
    transactionVolume: true
    performanceMetrics: true

# Optimized Logging
logging:
  accessLoggingEnabled: true
  retentionInDays: 30  # Shorter retention for performance
  executionLoggingLevel: "ERROR"  # Only log errors
  dataTraceEnabled: false
  metricsEnabled: true

# Performance Tags
tags:
  performance-tier: "high"
  optimization-level: "maximum"
  cost-center: "performance-ops"
```

## FedRAMP High Compliance

### Complete FedRAMP High Compliance Configuration

```yaml
apiName: "fedramp-high-api"
description: "FedRAMP High compliant API Gateway REST API"
disableExecuteApiEndpoint: true  # Required for FedRAMP

# FedRAMP Security Configuration
waf:
  webAclArn: "arn:aws:wafv2:us-gov-east-1:123456789012:regional/webacl/fedramp-webacl/abc123"

resourcePolicy:
  allowFromVpcs:
    - "vpc-fedramp-12345"
  allowFromAwsAccounts:
    - "123456789012"  # FedRAMP authorized account
  allowFromRegions:
    - "us-gov-east-1"  # GovCloud regions only
    - "us-gov-west-1"
  denyFromRegions:
    - "us-east-1"      # Block commercial regions
    - "us-west-2"
    - "eu-west-1"

# Strict Request Validation
requestValidation:
  validateRequestBody: true
  validateRequestParameters: true
  validateHeaders: true
  requiredHeaders:
    - "Authorization"
    - "Content-Type"
    - "X-Request-ID"
    - "X-Security-Token"
  bodySchema:
    type: "object"
    required: ["userId", "action", "timestamp"]
    properties:
      userId:
        type: "string"
        pattern: "^[a-zA-Z0-9-]+$"
      action:
        type: "string"
        enum: ["create", "read", "update", "delete"]
      timestamp:
        type: "string"
        format: "date-time"

# FedRAMP CORS (Restrictive)
cors:
  allowOrigins:
    - "https://fedramp-app.gov"
  allowMethods:
    - "GET"
    - "POST"
  allowHeaders:
    - "Content-Type"
    - "Authorization"
  allowCredentials: false  # Security best practice
  maxAge: 1800  # 30 minutes

# FedRAMP Authentication
authentication:
  cognito:
    userPoolArn: "arn:aws:cognito-idp:us-gov-east-1:123456789012:userpool/us-gov-east-1_abc123DEF"
    scopes:
      - "fedramp.read"
      - "fedramp.write"

# FedRAMP Throttling (Conservative)
throttling:
  burstLimit: 1000
  rateLimit: 100

advancedThrottling:
  perMethodThrottling: true
  burstLimit: 2000
  rateLimit: 200
  quotaLimit: 100000
  quotaPeriod: "DAY"
  customThrottlingRules:
    - path: "/sensitive"
      method: "GET"
      burstLimit: 50
      rateLimit: 5
    - path: "/sensitive"
      method: "POST"
      burstLimit: 25
      rateLimit: 2

# FedRAMP Logging (Comprehensive)
logging:
  accessLoggingEnabled: true
  retentionInDays: 2555  # 7 years required
  executionLoggingLevel: "INFO"
  dataTraceEnabled: false  # Required for FedRAMP
  metricsEnabled: true

# FedRAMP Monitoring
monitoring:
  detailedMetrics: true
  tracingEnabled: true
  thresholds:
    errorRate4xxPercent: 1  # Stricter thresholds
    errorRate5xxPercent: 0.1
    highLatencyMs: 2000
    lowThroughput: 50
  customMetrics:
    - name: "SecurityEvents"
      namespace: "FedRAMP/Security"
      statistic: "Sum"
      period: 300
      unit: "Count"
    - name: "ComplianceViolations"
      namespace: "FedRAMP/Compliance"
      statistic: "Sum"
      period: 300
      unit: "Count"
  businessMetrics:
    transactionVolume: true
    userActivity: true
    featureUsage: true
    performanceMetrics: true

# FedRAMP Tags
tags:
  data-classification: "confidential"
  compliance-framework: "fedramp-high"
  fedramp-control: "AC-3,AC-4,AC-6,AC-7"
  owner: "fedramp-team"
  cost-center: "compliance-ops"
  audit-level: "high"
```

## Multi-Environment Setup

### Environment-Specific Configurations

#### Development Environment
```yaml
# dev-environment.yml
apiName: "api-dev"
description: "Development API Gateway REST API"
deploymentStage: "dev"

# Relaxed security for development
cors:
  allowOrigins:
    - "http://localhost:3000"
    - "https://dev-app.example.com"
  allowMethods:
    - "GET"
    - "POST"
    - "PUT"
    - "DELETE"
    - "OPTIONS"
  allowHeaders:
    - "*"
  allowCredentials: true

# Development throttling
throttling:
  burstLimit: 1000
  rateLimit: 100

# Development logging
logging:
  accessLoggingEnabled: true
  retentionInDays: 7
  executionLoggingLevel: "INFO"
  dataTraceEnabled: true  # Allow for debugging

# Development monitoring
monitoring:
  detailedMetrics: true
  tracingEnabled: true
  thresholds:
    errorRate4xxPercent: 10
    errorRate5xxPercent: 5
    highLatencyMs: 5000
    lowThroughput: 10

tags:
  environment: "development"
  data-classification: "internal"
  cost-center: "dev-ops"
```

#### Staging Environment
```yaml
# staging-environment.yml
apiName: "api-staging"
description: "Staging API Gateway REST API"
deploymentStage: "staging"

# Staging security
cors:
  allowOrigins:
    - "https://staging-app.example.com"
  allowMethods:
    - "GET"
    - "POST"
    - "PUT"
    - "DELETE"
  allowHeaders:
    - "Content-Type"
    - "Authorization"
  allowCredentials: true

# Staging throttling
throttling:
  burstLimit: 5000
  rateLimit: 500

# Staging logging
logging:
  accessLoggingEnabled: true
  retentionInDays: 30
  executionLoggingLevel: "INFO"
  dataTraceEnabled: false

# Staging monitoring
monitoring:
  detailedMetrics: true
  tracingEnabled: true
  thresholds:
    errorRate4xxPercent: 5
    errorRate5xxPercent: 1
    highLatencyMs: 3000
    lowThroughput: 100

tags:
  environment: "staging"
  data-classification: "internal"
  cost-center: "staging-ops"
```

#### Production Environment
```yaml
# production-environment.yml
apiName: "api-prod"
description: "Production API Gateway REST API"
deploymentStage: "prod"
disableExecuteApiEndpoint: true

# Production security
waf:
  webAclArn: "arn:aws:wafv2:us-west-2:123456789012:regional/webacl/prod-webacl/abc123"

resourcePolicy:
  allowFromVpcs:
    - "vpc-prod-12345"
  allowFromIpRanges:
    - "203.0.113.0/24"

cors:
  allowOrigins:
    - "https://app.example.com"
  allowMethods:
    - "GET"
    - "POST"
    - "PUT"
    - "DELETE"
  allowHeaders:
    - "Content-Type"
    - "Authorization"
  allowCredentials: false

# Production throttling
throttling:
  burstLimit: 10000
  rateLimit: 1000

# Production logging
logging:
  accessLoggingEnabled: true
  retentionInDays: 90
  executionLoggingLevel: "ERROR"
  dataTraceEnabled: false
  metricsEnabled: true

# Production monitoring
monitoring:
  detailedMetrics: true
  tracingEnabled: true
  thresholds:
    errorRate4xxPercent: 3
    errorRate5xxPercent: 0.5
    highLatencyMs: 2000
    lowThroughput: 500

tags:
  environment: "production"
  data-classification: "confidential"
  cost-center: "prod-ops"
```

## Advanced Monitoring

### Comprehensive Observability Configuration

```yaml
apiName: "observable-api"
description: "API with comprehensive observability"

# Advanced Monitoring Configuration
monitoring:
  detailedMetrics: true
  tracingEnabled: true
  
  # Custom Metrics
  customMetrics:
    - name: "BusinessTransactions"
      namespace: "MyApp/Business"
      statistic: "Sum"
      period: 300
      unit: "Count"
      dimensions:
        environment: "production"
        service: "api-gateway"
    
    - name: "UserSessions"
      namespace: "MyApp/Users"
      statistic: "Average"
      period: 300
      unit: "Count"
      dimensions:
        userType: "premium"
    
    - name: "FeatureUsage"
      namespace: "MyApp/Features"
      statistic: "Sum"
      period: 300
      unit: "Count"
      dimensions:
        feature: "search"
    
    - name: "PerformanceScore"
      namespace: "MyApp/Performance"
      statistic: "Average"
      period: 60
      unit: "None"
      dimensions:
        endpoint: "/users"
  
  # Business Metrics
  businessMetrics:
    transactionVolume: true
    userActivity: true
    featureUsage: true
    performanceMetrics: true
  
  # Alert Thresholds
  thresholds:
    errorRate4xxPercent: 5
    errorRate5xxPercent: 1
    highLatencyMs: 2000
    lowThroughput: 100

# Enhanced Logging
logging:
  accessLoggingEnabled: true
  retentionInDays: 90
  executionLoggingLevel: "INFO"
  dataTraceEnabled: false
  metricsEnabled: true

# Custom Tags for Monitoring
tags:
  monitoring-level: "comprehensive"
  observability-tier: "premium"
  cost-center: "observability-ops"
```

## Custom Domain & SSL

### Custom Domain with SSL Certificate

```yaml
apiName: "custom-domain-api"
description: "API with custom domain and SSL"

# Custom Domain Configuration
domain:
  domainName: "api.example.com"
  certificateArn: "arn:aws:acm:us-west-2:123456789012:certificate/12345678-1234-1234-1234-123456789012"
  basePath: "v1"

# CORS for Custom Domain
cors:
  allowOrigins:
    - "https://app.example.com"
    - "https://admin.example.com"
  allowMethods:
    - "GET"
    - "POST"
    - "PUT"
    - "DELETE"
  allowHeaders:
    - "Content-Type"
    - "Authorization"
    - "X-Request-ID"
  allowCredentials: true
  maxAge: 3600

# Performance Optimized
throttling:
  burstLimit: 10000
  rateLimit: 2000

# Monitoring for Custom Domain
monitoring:
  detailedMetrics: true
  tracingEnabled: true
  thresholds:
    errorRate4xxPercent: 3
    errorRate5xxPercent: 0.5
    highLatencyMs: 1500
    lowThroughput: 500

tags:
  domain: "api.example.com"
  ssl-enabled: "true"
  cost-center: "domain-ops"
```

## API Versioning Strategy

### Multi-Version API Configuration

```yaml
# v1-api.yml
apiName: "api-v1"
description: "API Gateway REST API v1"
deploymentStage: "v1"

# Version-specific CORS
cors:
  allowOrigins:
    - "https://app-v1.example.com"
  allowMethods:
    - "GET"
    - "POST"
    - "PUT"
    - "DELETE"
  allowHeaders:
    - "Content-Type"
    - "Authorization"
    - "X-API-Version"
  allowCredentials: true
  maxAge: 3600

# Version-specific throttling
throttling:
  burstLimit: 5000
  rateLimit: 1000

# Version monitoring
monitoring:
  detailedMetrics: true
  tracingEnabled: true
  customMetrics:
    - name: "V1Requests"
      namespace: "MyApp/API/v1"
      statistic: "Sum"
      period: 300
      unit: "Count"
  thresholds:
    errorRate4xxPercent: 5
    errorRate5xxPercent: 1
    highLatencyMs: 2000
    lowThroughput: 100

tags:
  api-version: "v1"
  status: "active"
  cost-center: "api-ops"
```

```yaml
# v2-api.yml
apiName: "api-v2"
description: "API Gateway REST API v2"
deploymentStage: "v2"

# Enhanced CORS for v2
cors:
  allowOrigins:
    - "https://app-v2.example.com"
    - "https://app.example.com"
  allowMethods:
    - "GET"
    - "POST"
    - "PUT"
    - "DELETE"
    - "PATCH"
  allowHeaders:
    - "Content-Type"
    - "Authorization"
    - "X-API-Version"
    - "X-Request-ID"
  allowCredentials: true
  maxAge: 7200

# Enhanced throttling for v2
throttling:
  burstLimit: 10000
  rateLimit: 2000

# Enhanced monitoring for v2
monitoring:
  detailedMetrics: true
  tracingEnabled: true
  customMetrics:
    - name: "V2Requests"
      namespace: "MyApp/API/v2"
      statistic: "Sum"
      period: 300
      unit: "Count"
    - name: "V2Performance"
      namespace: "MyApp/API/v2"
      statistic: "Average"
      period: 60
      unit: "Milliseconds"
  thresholds:
    errorRate4xxPercent: 3
    errorRate5xxPercent: 0.5
    highLatencyMs: 1500
    lowThroughput: 200

tags:
  api-version: "v2"
  status: "active"
  cost-center: "api-ops"
```

## Microservices Integration

### API Gateway for Microservices Architecture

```yaml
apiName: "microservices-gateway"
description: "API Gateway for microservices architecture"

# Microservices CORS
cors:
  allowOrigins:
    - "https://frontend.example.com"
    - "https://admin.example.com"
    - "https://mobile.example.com"
  allowMethods:
    - "GET"
    - "POST"
    - "PUT"
    - "DELETE"
    - "PATCH"
  allowHeaders:
    - "Content-Type"
    - "Authorization"
    - "X-Service-Name"
    - "X-Request-ID"
    - "X-User-ID"
  allowCredentials: true
  maxAge: 3600

# Microservices Authentication
authentication:
  cognito:
    userPoolArn: "arn:aws:cognito-idp:us-west-2:123456789012:userpool/us-west-2_abc123DEF"
    scopes:
      - "microservices.read"
      - "microservices.write"
      - "microservices.admin"

# Microservices Throttling
throttling:
  burstLimit: 20000
  rateLimit: 5000

advancedThrottling:
  perMethodThrottling: true
  burstLimit: 50000
  rateLimit: 10000
  quotaLimit: 10000000
  quotaPeriod: "DAY"
  customThrottlingRules:
    - path: "/users"
      method: "GET"
      burstLimit: 10000
      rateLimit: 2000
    - path: "/orders"
      method: "POST"
      burstLimit: 5000
      rateLimit: 1000
    - path: "/payments"
      method: "POST"
      burstLimit: 2000
      rateLimit: 500
    - path: "/inventory"
      method: "GET"
      burstLimit: 15000
      rateLimit: 3000

# Microservices Monitoring
monitoring:
  detailedMetrics: true
  tracingEnabled: true
  customMetrics:
    - name: "UserServiceRequests"
      namespace: "Microservices/Users"
      statistic: "Sum"
      period: 300
      unit: "Count"
    - name: "OrderServiceRequests"
      namespace: "Microservices/Orders"
      statistic: "Sum"
      period: 300
      unit: "Count"
    - name: "PaymentServiceRequests"
      namespace: "Microservices/Payments"
      statistic: "Sum"
      period: 300
      unit: "Count"
    - name: "InventoryServiceRequests"
      namespace: "Microservices/Inventory"
      statistic: "Sum"
      period: 300
      unit: "Count"
  businessMetrics:
    transactionVolume: true
    userActivity: true
    featureUsage: true
    performanceMetrics: true
  thresholds:
    errorRate4xxPercent: 3
    errorRate5xxPercent: 0.5
    highLatencyMs: 2000
    lowThroughput: 1000

# Microservices Logging
logging:
  accessLoggingEnabled: true
  retentionInDays: 90
  executionLoggingLevel: "INFO"
  dataTraceEnabled: false
  metricsEnabled: true

# Microservices Tags
tags:
  architecture: "microservices"
  gateway-type: "api-gateway"
  cost-center: "microservices-ops"
  team: "platform-engineering"
```

## References

- [Component Configuration Schema](./Config.schema.json)
- [Troubleshooting Runbook](./troubleshooting-runbook.md)
- [Performance Tuning Guide](./performance-tuning-guide.md)
- [Platform Standards](../docs/platform-standards/)
- [AWS API Gateway Documentation](https://docs.aws.amazon.com/apigateway/)
