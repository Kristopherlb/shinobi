# API Gateway HTTP Component

Modern AWS API Gateway v2 (HTTP API) component for high-performance, cost-optimized APIs with comprehensive security, monitoring, and compliance features.

## Overview

The API Gateway HTTP component provides:

- **Up to 70% lower cost** than REST API Gateway
- **60% lower latency** for better performance  
- **Native JWT authentication** and OIDC integration
- **WebSocket support** for real-time communication
- **VPC Link support** for private integrations
- **Streamlined configuration** for microservices
- **Comprehensive compliance** (Commercial, FedRAMP Moderate/High)
- **OpenTelemetry integration** with structured logging and tracing
- **Platform tagging standard** with compliance-specific tags
- **Bindings and triggers validation** with matrix-based capability checking

Use this component for modern microservices, serverless APIs, and cost-sensitive applications. For complex enterprise features like request validation and SDK generation, use `api-gateway-rest` instead.

## Usage Example

### Basic HTTP API

```yaml
service: my-api-service
owner: backend-team
complianceFramework: commercial

components:
  - name: user-api
    type: api-gateway-http
    config:
      description: "User management HTTP API"
      cors:
        allowOrigins:
          - "https://myapp.com"
          - "https://admin.myapp.com"
        allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
        allowHeaders: ["Content-Type", "Authorization"]
        allowCredentials: true
      throttling:
        rateLimit: 1000
        burstLimit: 2000
      monitoring:
        detailedMetrics: true
        tracingEnabled: true
        alarms:
          errorRate4xx: 5.0
          errorRate5xx: 1.0
          highLatency: 3000
```

### Custom Domain with SSL

```yaml
components:
  - name: api-gateway
    type: api-gateway-http
    config:
      customDomain:
        domainName: "api.mycompany.com"
        autoGenerateCertificate: true
        hostedZoneId: "Z1234567890123"
        endpointType: "REGIONAL"
        securityPolicy: "TLS_1_2"
      accessLogging:
        enabled: true
        retentionInDays: 90
        format: "$requestId $requestTime $httpMethod $resourcePath $status $responseLength"
```

### WebSocket API

```yaml
components:
  - name: realtime-api
    type: api-gateway-http
    config:
      protocolType: "WEBSOCKET"
      websocket:
        connectRoute:
          integrationType: "LAMBDA"
          target: "arn:aws:lambda:us-east-1:123456789012:function:websocket-connect"
        disconnectRoute:
          integrationType: "LAMBDA"
          target: "arn:aws:lambda:us-east-1:123456789012:function:websocket-disconnect"
        defaultRoute:
          integrationType: "LAMBDA"
          target: "arn:aws:lambda:us-east-1:123456789012:function:websocket-default"
```

### JWT Authentication

```yaml
components:
  - name: secure-api
    type: api-gateway-http
    config:
      auth:
        jwt:
          - issuer: "https://auth.mycompany.com"
            audience: ["api.mycompany.com"]
            identitySource: ["$request.header.Authorization"]
      routes:
        - method: "GET"
          path: "/protected"
          integration:
            type: "LAMBDA"
            target: "arn:aws:lambda:us-east-1:123456789012:function:protected-handler"
          authorizerId: "jwt-0"
```

## Configuration Reference

### Root Configuration

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `apiName` | string | No | API name (auto-generated if not provided) |
| `description` | string | No | API description for documentation |
| `protocolType` | enum | No | Protocol type: `HTTP` (default) or `WEBSOCKET` |
| `cors` | object | No | CORS configuration for cross-origin requests |
| `customDomain` | object | No | Custom domain configuration |
| `auth` | object | No | Authentication and authorization settings |
| `routes` | array | No | HTTP routes and integrations |
| `throttling` | object | No | API throttling configuration |
| `accessLogging` | object | No | Access logging configuration |
| `monitoring` | object | No | Monitoring and observability settings |
| `vpc` | object | No | VPC configuration for private APIs |
| `websocket` | object | No | WebSocket-specific configuration |
| `apiSettings` | object | No | Additional API Gateway settings |
| `resourcePolicy` | object | No | Resource policy for access control |

### CORS Configuration

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `allowOrigins` | array | No | Allowed origins for CORS requests |
| `allowHeaders` | array | No | Allowed headers for CORS requests |
| `allowMethods` | array | No | Allowed HTTP methods |
| `allowCredentials` | boolean | No | Whether to allow credentials |
| `maxAge` | number | No | Max age for preflight requests (seconds) |
| `exposeHeaders` | array | No | Headers to expose to the client |

### Custom Domain Configuration

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `domainName` | string | Yes | Custom domain name |
| `certificateArn` | string | No* | ARN of existing SSL certificate |
| `autoGenerateCertificate` | boolean | No* | Auto-generate SSL certificate |
| `hostedZoneId` | string | No** | Route 53 hosted zone ID |
| `securityPolicy` | enum | No | Security policy: `TLS_1_0` or `TLS_1_2` (default) |
| `endpointType` | enum | No | Endpoint type: `EDGE` or `REGIONAL` (default) |

*Either `certificateArn` or `autoGenerateCertificate` must be specified  
**Required when `autoGenerateCertificate` is true

### Authentication Configuration

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `jwt` | array | No | JWT authorizer configurations |
| `lambda` | array | No | Lambda authorizer configurations |

#### JWT Authorizer

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `issuer` | string | Yes | JWT issuer URL |
| `audience` | array | Yes | JWT audience claims |
| `identitySource` | array | No | Identity sources (default: Authorization header) |

#### Lambda Authorizer

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `name` | string | Yes | Authorizer name |
| `functionArn` | string | Yes | Lambda function ARN |
| `type` | enum | No | Authorizer type: `REQUEST` or `TOKEN` |
| `identitySource` | array | No | Identity sources |
| `authorizerResultTtlInSeconds` | number | No | Result cache TTL |
| `enableSimpleResponses` | boolean | No | Enable simple response format |

### Route Configuration

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `method` | string | Yes | HTTP method (GET, POST, etc.) |
| `path` | string | Yes | Route path |
| `integration` | object | Yes | Integration configuration |
| `authorizerId` | string | No | Reference to authorizer |
| `authorizationScopes` | array | No | Authorization scopes |
| `apiKeyRequired` | boolean | No | Whether API key is required |

#### Integration Configuration

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `type` | enum | Yes | Integration type: `LAMBDA`, `HTTP_PROXY`, `AWS_PROXY`, `MOCK` |
| `target` | string | No* | Target ARN or URI |
| `integrationMethod` | string | No | Integration HTTP method |
| `timeoutInMillis` | number | No | Timeout in milliseconds (50-30000) |
| `connectionType` | enum | No | Connection type: `INTERNET` or `VPC_LINK` |
| `connectionId` | string | No | VPC Link connection ID |

*Required for non-MOCK integrations

### Throttling Configuration

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `rateLimit` | number | No | Rate limit (requests per second) |
| `burstLimit` | number | No | Burst limit for request spikes |

### Access Logging Configuration

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `enabled` | boolean | No | Enable access logging (default: true) |
| `logGroupName` | string | No | CloudWatch log group name |
| `retentionInDays` | number | No | Log retention period |
| `format` | string | No | Access log format |
| `includeExecutionData` | boolean | No | Include execution data in logs |
| `includeRequestResponseData` | boolean | No | Include request/response data |

### Monitoring Configuration

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `detailedMetrics` | boolean | No | Enable detailed CloudWatch metrics |
| `tracingEnabled` | boolean | No | Enable AWS X-Ray tracing |
| `alarms` | object | No | CloudWatch alarm configuration |

#### Alarm Configuration

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `errorRate4xx` | number | No | 4xx error rate threshold (%) |
| `errorRate5xx` | number | No | 5xx error rate threshold (%) |
| `highLatency` | number | No | High latency threshold (ms) |
| `lowThroughput` | number | No | Low throughput threshold |

### WebSocket Configuration

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `connectRoute` | object | No | Connect route integration |
| `disconnectRoute` | object | No | Disconnect route integration |
| `defaultRoute` | object | No | Default route integration |
| `customRoutes` | array | No | Custom WebSocket routes |

## Capabilities Provided

This component provides the following capabilities for binding with other components:

- `api:http` - HTTP API endpoint capability
- `api:websocket` - WebSocket API capability (if configured)
- `api:gateway` - Generic API Gateway capability
- `api:custom-domain` - Custom domain capability (if configured)
- `auth:jwt` - JWT authentication capability (if configured)
- `auth:lambda` - Lambda authorization capability (if configured)
- `monitoring:api` - API monitoring and metrics capability
- `logging:access` - Access logging capability

## Construct Handles

The following construct handles are available for use in `patches.ts`:

- `main` - Main API Gateway HTTP API construct
- `api` - Alias for main API Gateway construct
- `stage` - API Gateway stage construct
- `logGroup` - CloudWatch log group for access logs
- `customDomain` - Custom domain construct (if configured)
- `certificate` - SSL certificate construct (if auto-generated)
- `vpcLink` - VPC Link construct (if created)
- `authorizers` - Map of configured authorizers
- `routes` - Map of configured routes
- `integrations` - Map of configured integrations

## OpenTelemetry Integration

The API Gateway HTTP component includes comprehensive OpenTelemetry integration for observability:

### Automatic Configuration

- **OTEL Environment Variables**: Automatically configured based on compliance framework
- **X-Ray Tracing**: Integrated with AWS X-Ray for distributed tracing
- **Service Naming**: Automatic service name generation with compliance context
- **Resource Attributes**: Platform and compliance metadata included in traces

### Compliance-Specific Settings

```yaml
# Commercial/Dev Environment
observability:
  serviceName: "api-gateway-myapp"
  tracingEnabled: true
  samplingRate: 1.0  # Sample all traces

# FedRAMP Moderate
observability:
  serviceName: "api-gateway-secure"
  tracingEnabled: true
  samplingRate: 0.5  # 50% sampling
  otlpEndpoint: "https://otlp.us-east-1.amazonaws.com"

# FedRAMP High
observability:
  serviceName: "api-gateway-high-security"
  tracingEnabled: true
  samplingRate: 0.1  # 10% sampling
  otlpEndpoint: "https://otlp.us-east-1.amazonaws.com"
```

## Platform Tagging Standard

All resources are automatically tagged according to the Shinobi Platform Tagging Standard:

### Standard Tags

- `platform:component` - Component type identifier
- `platform:service` - Service name
- `platform:environment` - Environment (dev, staging, prod)
- `platform:owner` - Service owner/team
- `platform:managed-by` - Always "shinobi"
- `platform:compliance-framework` - Compliance framework
- `platform:data-classification` - Data classification level

### Compliance-Specific Tags

**Commercial:**
- `compliance:framework=fedramp-low`
- `compliance:level=commercial`

**FedRAMP Moderate:**
- `compliance:framework=fedramp-moderate`
- `compliance:level=moderate`
- `compliance:data-classification=confidential`

**FedRAMP High:**
- `compliance:framework=fedramp-high`
- `compliance:level=high`
- `compliance:data-classification=secret`

## Bindings and Triggers

The component validates bindings and triggers according to the Platform Bindings Standard:

### Valid Binding Capabilities

- `lambda:invoke` - Lambda function integration
- `cognito:authorize` - Cognito user pool authorization
- `route53:manage` - DNS management
- `cloudwatch:metrics` - Metrics collection
- `waf:protect` - Web Application Firewall
- `certificate:validate` - SSL certificate validation

### Valid Trigger Capabilities

- `http:request` - HTTP request handling
- `websocket:connect` - WebSocket connection
- `websocket:disconnect` - WebSocket disconnection
- `websocket:message` - WebSocket message handling

### Example Configuration

```yaml
components:
  - name: secure-api
    type: api-gateway-http
    binds:
      - capability: lambda:invoke
        target: "arn:aws:lambda:us-east-1:123456789012:function:api-handler"
      - capability: cloudwatch:metrics
        target: "api-metrics"
      - capability: waf:protect
        target: "security-waf"
    triggers:
      - capability: http:request
      - capability: websocket:connect
```

## Compliance Frameworks

### Commercial

- Standard CORS configuration with explicit origins
- 30-day log retention
- Basic monitoring and alerting
- Standard throttling limits (1000 rps rate, 2000 burst)

### FedRAMP Moderate

- Stricter CORS configuration (no wildcards)
- 90-day log retention with audit trail
- Enhanced monitoring with stricter alarm thresholds
- Conservative throttling limits (500 rps rate, 1000 burst)
- Execute API endpoint disabled for security
- Mandatory X-Ray tracing

### FedRAMP High

- Same as FedRAMP Moderate with:
- 365-day log retention for maximum audit trail
- Enhanced security monitoring
- Stricter access controls

## Best Practices

1. **Always specify explicit CORS origins** - Never use wildcards in production
2. **Enable detailed metrics and tracing** for production environments
3. **Use custom domains** for production APIs
4. **Configure appropriate throttling** based on expected load
5. **Set up CloudWatch alarms** for proactive monitoring
6. **Use JWT authorizers** for modern authentication
7. **Enable access logging** for audit and debugging
8. **Consider VPC Links** for private integrations

## Migration from REST API Gateway

When migrating from `api-gateway-rest` to `api-gateway-http`:

1. **Update component type** from `api-gateway-rest` to `api-gateway-http`
2. **Review route configurations** - HTTP API uses simpler routing
3. **Update authorizer configurations** - JWT authorizers work differently
4. **Remove REST-specific features** like request validation and SDK generation
5. **Test CORS configuration** - HTTP API handles CORS differently
6. **Verify integrations** - Some integration types may not be available

## Advanced Configuration Examples

### Complex Multi-Route API with Custom Metrics

```yaml
service: ecommerce-api
owner: backend-team
complianceFramework: commercial

components:
  - name: product-api
    type: api-gateway-http
    config:
      apiName: ecommerce-product-api
      description: E-commerce product management API
      cors:
        allowOrigins:
          - "https://shop.example.com"
          - "https://admin.example.com"
        allowHeaders:
          - "Content-Type"
          - "Authorization"
          - "X-Requested-With"
        allowMethods:
          - "GET"
          - "POST"
          - "PUT"
          - "DELETE"
          - "PATCH"
        allowCredentials: true
        maxAge: 3600
      routes:
        - routeKey: "GET /products"
          integration:
            type: AWS_PROXY
            lambdaFunctionArn: "arn:aws:lambda:us-east-1:123456789012:function:get-products"
          authorization:
            authorizationType: JWT
            jwtConfiguration:
              issuer: "https://cognito-idp.us-east-1.amazonaws.com/us-east-1_ABC123DEF"
              audience: ["6LxocgoUj0oO8XxXxXxXxX"]
        - routeKey: "POST /products"
          integration:
            type: AWS_PROXY
            lambdaFunctionArn: "arn:aws:lambda:us-east-1:123456789012:function:create-product"
          authorization:
            authorizationType: AWS_IAM
        - routeKey: "GET /products/{id}"
          integration:
            type: AWS_PROXY
            lambdaFunctionArn: "arn:aws:lambda:us-east-1:123456789012:function:get-product"
        - routeKey: "PUT /products/{id}"
          integration:
            type: AWS_PROXY
            lambdaFunctionArn: "arn:aws:lambda:us-east-1:123456789012:function:update-product"
          authorization:
            authorizationType: JWT
            jwtConfiguration:
              issuer: "https://cognito-idp.us-east-1.amazonaws.com/us-east-1_ABC123DEF"
              audience: ["6LxocgoUj0oO8XxXxXxXxX"]
      customDomain:
        domainName: api.example.com
        certificateArn: "arn:aws:acm:us-east-1:123456789012:certificate/12345678-1234-1234-1234-123456789012"
        hostedZoneId: "Z1D633PJN98FT9"
        securityPolicy: "TLS_1_2"
      monitoring:
        detailedMetrics: true
        tracingEnabled: true
        customMetrics:
          - name: "ProductViews"
            namespace: "Ecommerce/API"
            statistic: "Sum"
            period: 300
            unit: "Count"
            dimensions:
              Environment: "production"
              Service: "product-api"
          - name: "ProductCreationRate"
            namespace: "Ecommerce/API"
            statistic: "Average"
            period: 300
            unit: "Count/Second"
          - name: "ApiResponseTime"
            namespace: "Ecommerce/API"
            statistic: "Average"
            period: 60
            unit: "Milliseconds"
        alarms:
          errorRate4xx: 5.0
          errorRate5xx: 1.0
          highLatency: 2000
          lowThroughput: 10
      resourcePolicy:
        allowFromIpRanges:
          - "203.0.113.0/24"  # Office network
          - "198.51.100.0/24" # VPN network
        denyFromIpRanges:
          - "192.0.2.0/24"    # Blocked network
        allowFromAwsAccounts:
          - "111111111111"     # Partner account
        allowFromRegions:
          - "us-east-1"
          - "us-west-2"
      throttling:
        rateLimit: 1000
        burstLimit: 2000
      accessLogging:
        enabled: true
        retentionInDays: 30
        includeExecutionData: true
      security:
        enableWaf: true
        webAclArn: "arn:aws:wafv2:us-east-1:123456789012:regional/webacl/ecommerce-api-waf/12345678-1234-1234-1234-123456789012"
        enableApiKey: false
        requireAuthorization: true
```

### WebSocket API Configuration

```yaml
service: realtime-chat
owner: frontend-team
complianceFramework: commercial

components:
  - name: chat-websocket
    type: api-gateway-http
    config:
      apiName: chat-websocket-api
      description: Real-time chat WebSocket API
      protocolType: WEBSOCKET
      websocket:
        connectRoute:
          integrationType: LAMBDA
          target: "arn:aws:lambda:us-east-1:123456789012:function:chat-connect"
        disconnectRoute:
          integrationType: LAMBDA
          target: "arn:aws:lambda:us-east-1:123456789012:function:chat-disconnect"
        defaultRoute:
          integrationType: LAMBDA
          target: "arn:aws:lambda:us-east-1:123456789012:function:chat-default"
        customRoutes:
          - routeKey: "sendMessage"
            integrationType: LAMBDA
            target: "arn:aws:lambda:us-east-1:123456789012:function:chat-send-message"
          - routeKey: "joinRoom"
            integrationType: LAMBDA
            target: "arn:aws:lambda:us-east-1:123456789012:function:chat-join-room"
      monitoring:
        detailedMetrics: true
        tracingEnabled: true
        customMetrics:
          - name: "WebSocketConnections"
            namespace: "Chat/WebSocket"
            statistic: "Sum"
            period: 60
            unit: "Count"
          - name: "MessagesPerSecond"
            namespace: "Chat/WebSocket"
            statistic: "Sum"
            period: 60
            unit: "Count/Second"
        alarms:
          errorRate4xx: 2.0
          errorRate5xx: 0.5
          highLatency: 5000
      throttling:
        rateLimit: 100
        burstLimit: 200
```

### FedRAMP High Security Configuration

```yaml
service: secure-government-api
owner: government-team
complianceFramework: fedramp-high

components:
  - name: secure-api
    type: api-gateway-http
    config:
      apiName: secure-gov-api
      description: Secure government API for FedRAMP High compliance
      cors:
        allowOrigins:
          - "https://secure.gov.example.com"
        allowHeaders:
          - "Content-Type"
          - "Authorization"
          - "X-Requested-With"
        allowMethods:
          - "GET"
          - "POST"
        allowCredentials: false  # FedRAMP requirement
        maxAge: 300
      customDomain:
        domainName: api.secure.gov.example.com
        certificateArn: "arn:aws:acm:us-east-1:123456789012:certificate/fedramp-cert"
        hostedZoneId: "Z1D633PJN98FT9"
        securityPolicy: "TLS_1_2"
      resourcePolicy:
        allowFromVpcs:
          - "vpc-12345678"  # Government VPC only
        allowFromAwsAccounts:
          - "123456789012"  # Government account only
        allowFromRegions:
          - "us-east-1"     # US East only
        denyFromRegions:
          - "us-west-2"     # No West Coast access
      monitoring:
        detailedMetrics: true
        tracingEnabled: true
        customMetrics:
          - name: "SecurityEvents"
            namespace: "Government/Security"
            statistic: "Sum"
            period: 60
            unit: "Count"
        alarms:
          errorRate4xx: 1.0
          errorRate5xx: 0.1
          highLatency: 1000
      accessLogging:
        enabled: true
        retentionInDays: 365  # FedRAMP High requirement
        includeExecutionData: true
        includeRequestResponseData: true
      security:
        enableWaf: true
        webAclArn: "arn:aws:wafv2:us-east-1:123456789012:regional/webacl/fedramp-waf/12345678-1234-1234-1234-123456789012"
        enableApiKey: true
        requireAuthorization: true
      throttling:
        rateLimit: 100
        burstLimit: 200
```

## Troubleshooting

### Common Issues

#### 1. CORS Errors
**Symptoms:** Browser shows CORS errors, requests blocked
**Solutions:**
- Verify `allowOrigins` includes your domain exactly (no trailing slashes)
- Check `allowHeaders` includes all required headers
- Ensure `allowCredentials: true` if sending cookies/auth headers
- Test with browser dev tools Network tab

```yaml
cors:
  allowOrigins:
    - "https://myapp.com"  # ✅ Correct
    - "https://myapp.com/" # ❌ Wrong - trailing slash
  allowHeaders:
    - "Content-Type"
    - "Authorization"
    - "X-Custom-Header"    # Add any custom headers
  allowCredentials: true   # If using cookies/auth
```

#### 2. Authentication Failures
**Symptoms:** 401/403 errors, JWT validation failures
**Solutions:**
- Verify JWT issuer URL is correct and accessible
- Check audience array matches your JWT token
- Ensure JWT token is in Authorization header as "Bearer <token>"
- Test JWT token with online decoder first

```yaml
authorization:
  authorizationType: JWT
  jwtConfiguration:
    issuer: "https://cognito-idp.us-east-1.amazonaws.com/us-east-1_ABC123DEF"  # Must be exact
    audience: ["6LxocgoUj0oO8XxXxXxXxX"]  # Must match token audience
```

#### 3. Integration Timeouts
**Symptoms:** 504 Gateway Timeout errors
**Solutions:**
- Check Lambda function timeout settings
- Verify Lambda function is not in error state
- Check CloudWatch logs for Lambda errors
- Consider increasing Lambda timeout if needed

#### 4. Custom Domain Issues
**Symptoms:** Domain not resolving, SSL errors
**Solutions:**
- Verify certificate is in the same region as API Gateway
- Check Route 53 hosted zone configuration
- Ensure certificate covers the domain name
- Test certificate with AWS Certificate Manager console

#### 5. VPC Link Failures
**Symptoms:** Integration errors, network timeouts
**Solutions:**
- Verify security groups allow traffic on required ports
- Check subnet configuration and routing
- Ensure VPC Link is in "Available" state
- Test connectivity from API Gateway to target

#### 6. Custom Metrics Not Appearing
**Symptoms:** Custom metrics not visible in CloudWatch
**Solutions:**
- Check metric namespace and name spelling
- Verify dimensions are correctly formatted
- Wait up to 15 minutes for metrics to appear
- Check CloudWatch permissions

### Debugging Steps

#### 1. Enable Comprehensive Logging
```yaml
accessLogging:
  enabled: true
  retentionInDays: 7
  includeExecutionData: true
  includeRequestResponseData: true
```

#### 2. Enable X-Ray Tracing
```yaml
monitoring:
  tracingEnabled: true
```

#### 3. Check CloudWatch Metrics
- Go to CloudWatch → Metrics → Custom/API-Gateway
- Look for your custom metrics
- Check API Gateway built-in metrics

#### 4. Review CloudWatch Logs
- Check API Gateway execution logs
- Review Lambda function logs if using Lambda integration
- Look for error patterns

#### 5. Test with curl/Postman
```bash
# Test basic API
curl -X GET https://your-api-id.execute-api.us-east-1.amazonaws.com/prod/health

# Test with CORS
curl -X OPTIONS https://your-api-id.execute-api.us-east-1.amazonaws.com/prod/health \
  -H "Origin: https://myapp.com" \
  -H "Access-Control-Request-Method: GET"

# Test with JWT
curl -X GET https://your-api-id.execute-api.us-east-1.amazonaws.com/prod/protected \
  -H "Authorization: Bearer your-jwt-token"
```

#### 6. Use patches.ts for Advanced Debugging
```typescript
// patches.ts
import { HttpApi } from 'aws-cdk-lib/aws-apigatewayv2';

export function patchApiGatewayHttp(component: any) {
  // Access the underlying CDK construct
  const httpApi = component.getConstruct('httpApi') as HttpApi;
  
  // Add custom logging or modify behavior
  console.log('API Gateway ID:', httpApi.httpApiId);
  
  // Add custom tags or modify configuration
  // This is useful for debugging or adding features not in the component
}
```

### Performance Optimization

#### 1. Throttling Configuration
```yaml
throttling:
  rateLimit: 1000    # Adjust based on expected load
  burstLimit: 2000   # Allow burst traffic
```

#### 2. Custom Metrics for Performance
```yaml
monitoring:
  customMetrics:
    - name: "ResponseTime"
      namespace: "MyApp/API"
      statistic: "Average"
      period: 60
      unit: "Milliseconds"
    - name: "RequestCount"
      namespace: "MyApp/API"
      statistic: "Sum"
      period: 300
      unit: "Count"
```

#### 3. Caching Headers
```yaml
# Add to Lambda response
headers:
  Cache-Control: "max-age=300"
  ETag: "version-123"
```

### Security Best Practices

#### 1. Resource Policies
```yaml
resourcePolicy:
  allowFromIpRanges:
    - "203.0.113.0/24"  # Office network
  denyFromIpRanges:
    - "192.0.2.0/24"    # Blocked network
  allowFromAwsAccounts:
    - "111111111111"     # Partner account
```

#### 2. WAF Integration
```yaml
security:
  enableWaf: true
  webAclArn: "arn:aws:wafv2:us-east-1:123456789012:regional/webacl/my-waf/12345678-1234-1234-1234-123456789012"
```

#### 3. API Key Management
```yaml
security:
  enableApiKey: true
  requireAuthorization: true
```

## Performance Considerations

1. **HTTP API is faster** than REST API Gateway (60% lower latency)
2. **Use regional endpoints** for better performance
3. **Configure appropriate throttling** to prevent abuse
4. **Enable caching** at the integration level if needed
5. **Monitor latency metrics** and set appropriate alarms

## Security Considerations

1. **Never use wildcard CORS origins** in production
2. **Always use HTTPS** with proper TLS configuration
3. **Implement proper authentication** with JWT or Lambda authorizers
4. **Use resource policies** to restrict access by IP or VPC
5. **Enable access logging** for security auditing
6. **Disable execute API endpoint** in secure environments
7. **Use VPC Links** for private integrations
### Access Logging

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `enabled` | boolean | `true` | Enable access logging |
| `logGroupName` | string | `/platform/http-api/<service>/<component>` | Custom log group name |
| `retentionInDays` | number | Compliance-driven (90 / 365) | CloudWatch Logs retention period |
| `retainOnDelete` | boolean | Compliance-driven (`false` commercial, `true` FedRAMP) | Retain log group when stack is deleted |
| `format` | string | Standard JSON fields | Custom log format |
| `includeExecutionData` | boolean | Compliance-driven | Include execution context data |
| `includeRequestResponseData` | boolean | Compliance-driven | Include request/response payloads |
