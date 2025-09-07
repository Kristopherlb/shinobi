# API Gateway Component

Enterprise-grade AWS API Gateway (REST API) for robust API management with comprehensive security, caching, and monitoring capabilities for production workloads.

## Overview

This component provides a fully managed REST API Gateway with:

- **Comprehensive API Management**: REST API with resource-based routing and method configuration
- **Advanced Security**: API keys, usage plans, request validation, and WAF integration
- **Caching & Performance**: Response caching, throttling, and compression
- **Compliance Hardening**: Three-tier compliance support (Commercial/FedRAMP Moderate/FedRAMP High)
- **Monitoring Integration**: CloudWatch logs, metrics, and X-Ray tracing

## Capabilities

- **api:rest**: Provides REST API management for traditional API architectures

## Configuration

```yaml
components:
  - name: main-api
    type: api-gateway
    config:
      restApiName: MainApplicationAPI
      description: Primary REST API for application services
      
      endpointConfiguration:
        types:
          - REGIONAL
        vpcEndpointIds:
          - vpce-12345678
      
      resources:
        - pathPart: users
          methods:
            - httpMethod: GET
              integration:
                type: AWS_PROXY
                uri: arn:aws:lambda:us-east-1:123456789012:function:GetUsers
                integrationHttpMethod: POST
            - httpMethod: POST
              integration:
                type: AWS_PROXY
                uri: arn:aws:lambda:us-east-1:123456789012:function:CreateUser
                integrationHttpMethod: POST
              requestValidation:
                enabled: true
                validateRequestBody: true
                validateRequestParameters: true
        
        - pathPart: orders
          methods:
            - httpMethod: GET
              integration:
                type: HTTP_PROXY
                uri: https://internal-api.company.com/orders
                connectionType: VPC_LINK
                connectionId: nlb-12345678
      
      deployment:
        stageName: prod
        stageDescription: Production API stage
        cacheClusterEnabled: true
        cacheClusterSize: 1.6
        throttling:
          rateLimit: 2000
          burstLimit: 4000
        logging:
          accessLoggingEnabled: true
          executionLoggingLevel: INFO
          dataTraceEnabled: false
        
      usagePlans:
        - usagePlanName: PremiumPlan
          description: Premium tier API access
          throttling:
            rateLimit: 1000
            burstLimit: 2000
          quota:
            limit: 100000
            period: MONTH
          apiStages:
            - apiId: ${main-api.restApiId}
              stage: prod
              throttle:
                "/users/GET":
                  rateLimit: 500
                  burstLimit: 1000
      
      apiKeys:
        - keyName: mobile-app-key
          description: API key for mobile application
          enabled: true
          usagePlanIds:
            - PremiumPlan
      
      requestValidators:
        - validatorName: RequestValidator
          validateRequestBody: true
          validateRequestParameters: true
      
      models:
        - modelName: UserModel
          contentType: application/json
          schema: |
            {
              "$schema": "http://json-schema.org/draft-04/schema#",
              "type": "object",
              "properties": {
                "id": {"type": "string"},
                "name": {"type": "string"},
                "email": {"type": "string", "format": "email"}
              },
              "required": ["name", "email"]
            }
      
      tags:
        api-type: rest
        service-tier: production
        caching-enabled: "true"
```

## Binding Examples

### Lambda Function Integration

```yaml
components:
  - name: user-service
    type: lambda-api
    config:
      handler: src/users.handler
    binds:
      - to: main-api
        capability: api:rest
        access: invoke
        integration:
          resource: /users
          method: GET
```

### VPC Link for Internal Services

```yaml
components:
  - name: internal-nlb
    type: network-load-balancer
    config:
      loadBalancerName: InternalAPI
    binds:
      - to: main-api
        capability: api:rest
        access: vpc-link
```

## Compliance Features

### Commercial
- Basic request/response logging
- Standard throttling and caching
- Cost-optimized settings

### FedRAMP Moderate
- Enhanced request validation and sanitization
- Comprehensive access logging with extended retention
- WAF integration for threat protection
- API key management with rotation
- 1-year audit log retention

### FedRAMP High
- Strict request validation with detailed schema checking
- Comprehensive security logging and monitoring
- Advanced WAF rules and threat detection
- Mandatory API key rotation and strong authentication
- 10-year audit log retention
- Enhanced compliance monitoring

## Advanced Configuration

### Custom Authorizers

```yaml
config:
  authorizers:
    - authorizerName: CustomJWTAuthorizer
      type: TOKEN
      authorizerUri: arn:aws:lambda:us-east-1:123456789012:function:JWTAuthorizer
      authorizerCredentials: arn:aws:iam::123456789012:role/APIGatewayAuthorizerRole
      identitySource: method.request.header.Authorization
      authorizerResultTtlInSeconds: 300
```

### Request/Response Transformations

```yaml
config:
  resources:
    - pathPart: transform
      methods:
        - httpMethod: POST
          integration:
            type: AWS_PROXY
            requestTemplates:
              application/json: |
                {
                  "body": $input.json('$'),
                  "headers": {
                    #foreach($header in $input.params().header.keySet())
                    "$header": "$util.escapeJavaScript($input.params().header.get($header))"
                    #if($foreach.hasNext),#end
                    #end
                  }
                }
            integrationResponses:
              - statusCode: 200
                responseTemplates:
                  application/json: |
                    {
                      "message": "Success",
                      "data": $input.json('$')
                    }
```

### CORS Configuration

```yaml
config:
  corsConfiguration:
    allowOrigins:
      - https://app.company.com
      - https://admin.company.com
    allowMethods:
      - GET
      - POST
      - PUT
      - DELETE
      - OPTIONS
    allowHeaders:
      - Content-Type
      - Authorization
      - X-Requested-With
    maxAge: 86400
    allowCredentials: true
```

## Monitoring and Observability

The component automatically configures:

- **CloudWatch Metrics**: Request count, latency, errors, cache hits/misses
- **CloudWatch Logs**: Access logs and execution logs with detailed request/response data
- **AWS X-Ray**: Distributed tracing for API request flows
- **CloudWatch Alarms**: Error rates, latency thresholds, and throttling alerts
- **Custom Dashboards**: API performance and usage analytics

### Monitoring Levels

- **Basic**: Standard API metrics and basic error tracking
- **Enhanced**: Detailed execution logs + performance metrics + cache analytics
- **Comprehensive**: Enhanced + X-Ray tracing + business metrics + security monitoring

## Security Features

### Authentication and Authorization
- API key management with usage plans
- Custom authorizers (Lambda, Cognito)
- IAM authentication and authorization
- Resource-based policies

### Request Security
- Request validation with JSON schemas
- Input sanitization and filtering
- Rate limiting and throttling
- WAF integration for threat protection

### Data Protection
- HTTPS enforcement
- Response data encryption
- Request/response logging controls
- Sensitive data masking

## Performance Optimization

### Caching Strategy

```yaml
config:
  deployment:
    cacheClusterEnabled: true
    cacheClusterSize: 6.1  # Larger cache for high traffic
    caching:
      cacheTtlInSeconds: 300
      cacheKeyParameters:
        - method.request.querystring.userId
        - method.request.header.Accept
      cachingEnabled: true
      cacheEncrypted: true
```

### Throttling Configuration

```yaml
config:
  deployment:
    throttling:
      rateLimit: 5000
      burstLimit: 10000
    
  # Method-specific throttling
  methodThrottling:
    "/users/GET":
      rateLimit: 1000
      burstLimit: 2000
    "/orders/POST":
      rateLimit: 500
      burstLimit: 1000
```

### Compression and Optimization

```yaml
config:
  deployment:
    contentHandling: CONVERT_TO_BINARY
    binaryMediaTypes:
      - "image/*"
      - "application/octet-stream"
```

## Usage Plans and API Keys

### Tiered Access Plans

```yaml
config:
  usagePlans:
    - usagePlanName: BasicPlan
      throttling:
        rateLimit: 100
        burstLimit: 200
      quota:
        limit: 10000
        period: MONTH
    
    - usagePlanName: PremiumPlan
      throttling:
        rateLimit: 1000
        burstLimit: 2000
      quota:
        limit: 100000
        period: MONTH
    
    - usagePlanName: EnterprisePlan
      throttling:
        rateLimit: 5000
        burstLimit: 10000
      # No quota limit for enterprise
```

### API Key Management

```yaml
config:
  apiKeys:
    - keyName: mobile-app-v1
      description: Mobile app API key
      enabled: true
      value: custom-key-value-123
      usagePlanIds: [BasicPlan]
    
    - keyName: partner-integration
      description: Partner system integration
      enabled: true
      usagePlanIds: [PremiumPlan]
```

## Integration Patterns

### Lambda Proxy Integration

```javascript
// Lambda function for API Gateway proxy integration
exports.handler = async (event) => {
    const { httpMethod, path, pathParameters, queryStringParameters, body, headers } = event;
    
    try {
        let response;
        
        switch (httpMethod) {
            case 'GET':
                response = await handleGet(pathParameters, queryStringParameters);
                break;
            case 'POST':
                response = await handlePost(JSON.parse(body));
                break;
            default:
                return {
                    statusCode: 405,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    body: JSON.stringify({ error: 'Method not allowed' })
                };
        }
        
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify(response)
        };
        
    } catch (error) {
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({ 
                error: 'Internal server error',
                requestId: event.requestContext.requestId
            })
        };
    }
};
```

## Troubleshooting

### Common Issues

1. **CORS Errors**
   - Verify CORS configuration includes all required origins and methods
   - Check that OPTIONS method is configured for preflight requests
   - Ensure response headers include proper CORS headers

2. **Authorization Failures**
   - Verify API key configuration and usage plan association
   - Check custom authorizer Lambda function permissions
   - Review IAM policies for API access

3. **Integration Timeouts**
   - Check backend service response times
   - Review integration timeout settings (max 29 seconds)
   - Monitor CloudWatch metrics for timeout patterns

### Debug Mode

Enable detailed logging for troubleshooting:

```yaml
config:
  deployment:
    logging:
      accessLoggingEnabled: true
      executionLoggingLevel: INFO
      dataTraceEnabled: true
      metricsEnabled: true
```

## Examples

See the [`examples/`](../../examples/) directory for complete service templates:

- `examples/rest-api-gateway/` - Complete REST API with multiple resources
- `examples/api-with-auth/` - API with custom authorization
- `examples/microservices-api/` - API Gateway for microservices

## API Reference

### ApiGatewayComponent

Main component class that extends `Component`.

#### Methods

- `synth()`: Creates AWS resources (REST API, Resources, Methods, Deployment)
- `getCapabilities()`: Returns api:rest capability
- `getType()`: Returns 'api-gateway'

### Configuration Interfaces

- `ApiGatewayConfig`: Main configuration interface
- `API_GATEWAY_CONFIG_SCHEMA`: JSON schema for validation

## Development

To contribute to this component:

1. Make changes to the source code
2. Run tests: `npm test`
3. Build: `npm run build`
4. Follow the [Contributing Guide](../../../CONTRIBUTING.md)

## License

MIT License - see LICENSE file for details.