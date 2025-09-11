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

## Troubleshooting

### Common Issues

1. **CORS errors** - Ensure `allowOrigins` is properly configured
2. **Authentication failures** - Verify JWT issuer and audience configuration
3. **Integration timeouts** - Check `timeoutInMillis` settings
4. **Custom domain issues** - Verify certificate and DNS configuration
5. **VPC Link failures** - Ensure proper security group and subnet configuration

### Debugging

1. **Enable access logging** to see request details
2. **Enable X-Ray tracing** for detailed request flow
3. **Check CloudWatch metrics** for error rates and latency
4. **Review CloudWatch alarms** for threshold breaches
5. **Use patches.ts** to access and modify constructs if needed

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
