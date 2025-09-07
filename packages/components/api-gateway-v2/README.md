# API Gateway v2 Component

Enterprise-grade AWS API Gateway v2 (HTTP API) for modern REST APIs with enhanced performance, lower cost, and comprehensive security features.

## Overview

This component provides a fully managed API Gateway v2 HTTP API with:

- **High Performance**: Optimized for modern applications with lower latency
- **Cost Effective**: Up to 70% cost reduction compared to REST APIs
- **Advanced Features**: Built-in CORS, JWT authorization, and custom domains
- **Compliance Hardening**: Three-tier compliance support (Commercial/FedRAMP Moderate/FedRAMP High)
- **Comprehensive Security**: Throttling, access logging, and security headers

## Capabilities

- **api:http-v2**: Provides HTTP API connectivity for modern web applications

## Configuration

```yaml
components:
  - name: user-api
    type: api-gateway-v2
    config:
      apiName: UserManagementAPI
      description: User management and authentication API
      protocolType: HTTP
      
      cors:
        allowCredentials: false
        allowHeaders:
          - Content-Type
          - Authorization
          - X-Requested-With
        allowMethods:
          - GET
          - POST
          - PUT
          - DELETE
          - OPTIONS
        allowOrigins:
          - https://app.example.com
          - https://admin.example.com
        maxAge: 86400
      
      domainName:
        domainName: api.example.com
        certificateArn: arn:aws:acm:us-east-1:123456789012:certificate/12345678-1234-1234-1234-123456789012
        hostedZoneId: Z1D633PJN98FT9
        basePath: v1
      
      routes:
        - routeKey: "GET /users"
          integration:
            type: AWS_PROXY
            lambdaFunctionArn: arn:aws:lambda:us-east-1:123456789012:function:get-users
          authorization:
            authorizationType: JWT
            jwtConfiguration:
              issuer: https://auth.example.com
              audience: 
                - api.example.com
        
        - routeKey: "POST /users"
          integration:
            type: AWS_PROXY
            lambdaFunctionArn: arn:aws:lambda:us-east-1:123456789012:function:create-user
          authorization:
            authorizationType: AWS_IAM
      
      throttling:
        rateLimit: 1000
        burstLimit: 2000
      
      accessLogging:
        enabled: true
        format: |
          {
            "requestId": "$context.requestId",
            "ip": "$context.identity.sourceIp",
            "requestTime": "$context.requestTime",
            "httpMethod": "$context.httpMethod",
            "routeKey": "$context.routeKey",
            "status": "$context.status",
            "protocol": "$context.protocol",
            "responseLength": "$context.responseLength"
          }
      
      defaultStage:
        stageName: prod
        autoDeploy: true
        throttling:
          rateLimit: 500
          burstLimit: 1000
      
      tags:
        api-type: user-management
        team: backend
```

## Binding Examples

### Lambda Function to API Gateway

```yaml
components:
  - name: auth-service
    type: lambda-api
    config:
      handler: src/auth.handler
    binds:
      - to: user-api
        capability: api:http-v2
        access: invoke
```

This binding allows:
- Lambda function integration with API routes
- Automatic permissions for API Gateway to invoke Lambda
- Request/response transformation

### Database to API Gateway

```yaml
components:
  - name: user-database
    type: rds-postgres
    config:
      instanceClass: db.t3.micro
    binds:
      - from: user-api
        capability: database:postgres
        access: read-write
```

## Compliance Features

### Commercial
- Basic throttling and monitoring
- Standard CORS configuration
- Cost-optimized settings

### FedRAMP Moderate
- Enhanced throttling (500 RPS limit)
- Restricted CORS (HTTPS origins only)
- Comprehensive access logging
- Mandatory JWT or IAM authorization

### FedRAMP High
- Strict throttling (100 RPS limit)
- No CORS by default (security-first)
- Comprehensive audit logging
- Enhanced security headers
- Detailed request/response logging

## Advanced Configuration

### JWT Authorization

```yaml
config:
  routes:
    - routeKey: "GET /protected"
      authorization:
        authorizationType: JWT
        jwtConfiguration:
          issuer: https://cognito-idp.us-east-1.amazonaws.com/us-east-1_AbCdEfGhI
          audience:
            - client-id-1
            - client-id-2
          claims:
            - email
            - sub
```

### VPC Integration

```yaml
config:
  routes:
    - routeKey: "GET /internal"
      integration:
        type: HTTP_PROXY
        uri: http://internal-service.local:8080/api
        connectionType: VPC_LINK
        vpcLinkId: vpcl-12345678
```

### Custom Authorizers

```yaml
config:
  authorizers:
    - name: custom-auth
      type: REQUEST
      lambdaFunctionArn: arn:aws:lambda:us-east-1:123456789012:function:custom-authorizer
      identitySource:
        - $request.header.Authorization
      resultTtlInSeconds: 300
```

## Monitoring and Observability

The component automatically configures:

- **CloudWatch Metrics**: Request count, latency, error rates
- **Access Logs**: Configurable structured logging
- **CloudWatch Alarms**: Error rate and latency monitoring
- **X-Ray Tracing**: Request tracing (compliance frameworks)
- **Custom Metrics**: Application-specific API metrics

### Monitoring Levels

- **Basic**: Standard metrics and error monitoring
- **Enhanced**: Access logging + performance metrics
- **Comprehensive**: Enhanced + X-Ray tracing + security monitoring

## Security Features

### Authentication and Authorization
- JWT token validation
- AWS IAM authorization
- Custom authorizers
- API key management

### Network Security
- CORS policy enforcement
- Rate limiting and throttling
- IP allowlist/blocklist
- VPC integration support

### Data Protection
- Request/response validation
- Input sanitization
- TLS encryption in transit
- Audit logging for compliance

## Route Configuration

### HTTP Proxy Integration

```yaml
routes:
  - routeKey: "GET /external"
    integration:
      type: HTTP_PROXY
      uri: https://api.external-service.com/v1/data
      httpMethod: GET
      connectionType: INTERNET
```

### AWS Service Integration

```yaml
routes:
  - routeKey: "PUT /queue"
    integration:
      type: AWS_PROXY
      uri: arn:aws:apigateway:us-east-1:sqs:path/123456789012/MyQueue
      httpMethod: POST
```

### Mock Integration

```yaml
routes:
  - routeKey: "GET /health"
    integration:
      type: MOCK
    responses:
      200:
        body: '{"status": "healthy"}'
        headers:
          Content-Type: "application/json"
```

## Custom Domain Setup

### DNS Configuration

```yaml
config:
  domainName:
    domainName: api.example.com
    certificateArn: arn:aws:acm:us-east-1:123456789012:certificate/cert-id
    hostedZoneId: Z1D633PJN98FT9
    basePath: v1  # API accessible at api.example.com/v1
```

### Multi-Domain Support

```yaml
config:
  domainName:
    domainName: api.example.com
    alternativeDomainNames:
      - api-v1.example.com
      - legacy-api.example.com
```

## Troubleshooting

### Common Issues

1. **CORS Errors**
   - Verify allowOrigins includes requesting domain
   - Check allowMethods includes request method
   - Ensure preflight OPTIONS requests are handled

2. **Authorization Failures**
   - Validate JWT issuer and audience configuration
   - Check IAM role permissions for AWS_IAM auth
   - Verify custom authorizer Lambda function

3. **Integration Timeouts**
   - Check backend service response times
   - Review VPC Link configuration for VPC integrations
   - Monitor CloudWatch logs for detailed error messages

### Debug Mode

Enable detailed logging for debugging:

```yaml
config:
  accessLogging:
    enabled: true
    format: |
      {
        "requestId": "$context.requestId",
        "error": "$context.error.message",
        "integrationError": "$context.integration.error",
        "responseLatency": "$context.responseLatency",
        "integrationLatency": "$context.integrationLatency"
      }
```

## Examples

See the [`examples/`](../../examples/) directory for complete service templates:

- `examples/rest-api/` - RESTful API with CRUD operations
- `examples/microservices-gateway/` - API Gateway for microservices
- `examples/serverless-auth/` - JWT-based authentication API

## API Reference

### ApiGatewayV2Component

Main component class that extends `Component`.

#### Methods

- `synth()`: Creates AWS resources (HTTP API, Routes, Stage, Domain)
- `getCapabilities()`: Returns api:http-v2 capability
- `getType()`: Returns 'api-gateway-v2'

### Configuration Interfaces

- `ApiGatewayV2Config`: Main configuration interface
- `API_GATEWAY_V2_CONFIG_SCHEMA`: JSON schema for validation

## Development

To contribute to this component:

1. Make changes to the source code
2. Run tests: `npm test`
3. Build: `npm run build`
4. Follow the [Contributing Guide](../../../CONTRIBUTING.md)

## License

MIT License - see LICENSE file for details.