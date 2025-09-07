# Lambda API Component

Enterprise-grade AWS Lambda function optimized for API workloads with API Gateway integration, comprehensive monitoring, and advanced security features.

## Overview

This component provides a fully managed Lambda function designed for API endpoints with:

- **API-Optimized Runtime**: Configured for low latency and high throughput API responses
- **Auto-Scaling**: Automatic scaling based on request volume and concurrency limits
- **Security Integration**: VPC networking, IAM roles, and secrets management
- **Compliance Hardening**: Three-tier compliance support (Commercial/FedRAMP Moderate/FedRAMP High)
- **Comprehensive Observability**: X-Ray tracing, structured logging, and performance metrics

## Capabilities

- **compute:lambda-api**: Provides serverless API compute for HTTP request processing

## Configuration

```yaml
components:
  - name: user-api
    type: lambda-api
    config:
      functionName: UserManagementAPI
      description: REST API for user management operations
      
      code:
        handler: src/api.handler
        runtime: nodejs18.x
        zipFile: ./dist/api.zip
        # Alternative: S3 source
        # s3Bucket: company-lambda-code
        # s3Key: user-api/v1.2.3.zip
      
      environment:
        variables:
          NODE_ENV: production
          LOG_LEVEL: info
          DATABASE_URL: ${user-database.connectionString}
          API_VERSION: v1
      
      memorySize: 512
      timeout: 30
      
      reservedConcurrency: 100
      provisionedConcurrency: 10
      
      vpcConfig:
        vpcId: vpc-12345678
        subnetIds:
          - subnet-12345678
          - subnet-87654321
        securityGroupIds:
          - sg-lambda-api
      
      deadLetterQueue:
        targetArn: arn:aws:sqs:us-east-1:123456789012:api-dlq
      
      layers:
        - arn:aws:lambda:us-east-1:123456789012:layer:SharedUtilities:1
        - arn:aws:lambda:us-east-1:123456789012:layer:Observability:2
      
      eventSourceMapping:
        - eventSourceArn: arn:aws:sqs:us-east-1:123456789012:api-requests
          batchSize: 10
          maximumBatchingWindowInSeconds: 5
      
      apiGatewayIntegration:
        enabled: true
        corsEnabled: true
        allowOrigins:
          - https://app.company.com
        throttling:
          rateLimit: 1000
          burstLimit: 2000
      
      tags:
        api-type: rest
        service-tier: production
        monitoring-required: "true"
```

## Binding Examples

### API Gateway Integration

```yaml
components:
  - name: api-gateway
    type: api-gateway-v2
    config:
      apiName: UserManagementAPI
      routes:
        - routeKey: "GET /users"
          integration:
            type: AWS_PROXY
            lambdaFunctionArn: ${user-api.functionArn}
    binds:
      - to: user-api
        capability: compute:lambda-api
        access: invoke
```

### Database Connection

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
- Basic monitoring and error tracking
- Standard timeout and memory limits
- Cost-optimized configurations

### FedRAMP Moderate
- Enhanced monitoring with X-Ray tracing enabled
- VPC deployment with private subnets
- Comprehensive CloudWatch logging
- Reserved concurrency limits for predictable performance
- 1-year log retention

### FedRAMP High
- Mandatory VPC deployment with strict network isolation
- Enhanced security monitoring and alerting
- Provisioned concurrency for guaranteed availability
- Advanced threat detection integration
- 10-year audit log retention
- Enhanced encryption and key management

## Advanced Configuration

### Multi-Environment Deployment

```yaml
# Production configuration
config:
  environment:
    variables:
      NODE_ENV: production
      LOG_LEVEL: warn
      DATABASE_POOL_SIZE: "10"
  memorySize: 1024
  timeout: 30
  reservedConcurrency: 500

# Development configuration
# config:
#   environment:
#     variables:
#       NODE_ENV: development
#       LOG_LEVEL: debug
#   memorySize: 256
#   timeout: 60
```

### Advanced VPC Configuration

```yaml
config:
  vpcConfig:
    vpcId: vpc-12345678
    subnetIds:
      - subnet-private-1a
      - subnet-private-1b
    securityGroupIds:
      - sg-lambda-outbound
      - sg-database-access
    ipv6AllowedForDualStack: false
```

### Custom Runtime and Layers

```yaml
config:
  code:
    handler: bootstrap
    runtime: provided.al2
    zipFile: ./dist/custom-runtime.zip
  layers:
    - arn:aws:lambda:us-east-1:123456789012:layer:CustomRuntime:1
    - arn:aws:lambda:us-east-1:123456789012:layer:ObservabilityTools:3
    - arn:aws:lambda:us-east-1:123456789012:layer:SecurityScanner:1
```

## Monitoring and Observability

The component automatically configures:

- **CloudWatch Metrics**: Invocations, duration, errors, throttles, concurrent executions
- **CloudWatch Logs**: Function logs with structured logging format
- **AWS X-Ray**: Distributed tracing for API request flows
- **CloudWatch Alarms**: Error rates, duration thresholds, and throttling alerts
- **Custom Metrics**: Business-specific API metrics and KPIs

### Monitoring Levels

- **Basic**: Standard Lambda metrics and error monitoring
- **Enhanced**: X-Ray tracing + detailed performance metrics
- **Comprehensive**: Enhanced + business metrics + security monitoring

## Security Features

### Network Security
- VPC integration with private subnet deployment
- Security group-based access control
- NAT Gateway for outbound internet access
- VPC endpoints for AWS service access

### Identity and Access Management
- Function execution roles with least-privilege permissions
- Resource-based policies for fine-grained access
- Cross-account invocation controls
- Integration with AWS IAM Identity Center

### Data Protection
- Environment variable encryption with KMS
- Code signing for deployment integrity
- Secrets management integration
- Input validation and sanitization

## Performance Optimization

### Memory and Timeout Tuning

```yaml
# CPU-intensive workloads
config:
  memorySize: 3008  # Maximum memory for maximum CPU
  timeout: 900      # 15 minutes maximum

# I/O-intensive workloads  
config:
  memorySize: 512   # Balanced memory allocation
  timeout: 30       # Quick API responses

# Memory-intensive workloads
config:
  memorySize: 1536  # High memory for data processing
  timeout: 300      # 5 minutes for processing time
```

### Concurrency Management

```yaml
config:
  # Reserved concurrency - guarantees capacity
  reservedConcurrency: 100
  
  # Provisioned concurrency - pre-warmed instances
  provisionedConcurrency: 20
  
  # Dead letter queue for failed invocations
  deadLetterQueue:
    targetArn: arn:aws:sqs:us-east-1:123456789012:api-errors
```

### Cold Start Optimization

```yaml
config:
  # Use provisioned concurrency for predictable latency
  provisionedConcurrency: 50
  
  # Optimize package size with layers
  layers:
    - arn:aws:lambda:us-east-1:123456789012:layer:NodeModules:1
  
  # Keep functions warm with scheduled invocations
  eventSourceMapping:
    - eventSourceArn: arn:aws:events:us-east-1:123456789012:rule/warm-lambda
      batchSize: 1
```

## API Integration Patterns

### REST API with OpenAPI

```javascript
// Example Lambda handler for REST API
export const handler = async (event, context) => {
  const { httpMethod, path, pathParameters, queryStringParameters, body } = event;
  
  try {
    switch (httpMethod) {
      case 'GET':
        if (path === '/users') {
          return await getUsers(queryStringParameters);
        } else if (path === '/users/{id}') {
          return await getUser(pathParameters.id);
        }
        break;
        
      case 'POST':
        if (path === '/users') {
          return await createUser(JSON.parse(body));
        }
        break;
        
      default:
        return {
          statusCode: 405,
          body: JSON.stringify({ error: 'Method not allowed' })
        };
    }
  } catch (error) {
    console.error('API Error:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Internal server error',
        requestId: context.awsRequestId
      })
    };
  }
};
```

### GraphQL API Handler

```javascript
// GraphQL resolver example
import { ApolloServer } from 'apollo-server-lambda';
import { typeDefs, resolvers } from './graphql/schema';

const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: ({ event, context }) => ({
    headers: event.headers,
    functionName: context.functionName,
    event,
    context,
  }),
  introspection: process.env.NODE_ENV === 'development',
  playground: process.env.NODE_ENV === 'development',
});

export const handler = server.createHandler({
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
    credentials: true,
  },
});
```

## Error Handling and Resilience

### Circuit Breaker Pattern

```javascript
class CircuitBreaker {
  constructor(threshold = 5, timeout = 60000) {
    this.threshold = threshold;
    this.timeout = timeout;
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
  }

  async execute(operation) {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  onSuccess() {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }

  onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.failureCount >= this.threshold) {
      this.state = 'OPEN';
    }
  }
}
```

### Retry Logic with Exponential Backoff

```javascript
async function withRetry(operation, maxRetries = 3) {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxRetries) {
        break;
      }
      
      // Exponential backoff
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}
```

## Troubleshooting

### Common Issues

1. **Cold Start Latency**
   - Use provisioned concurrency for consistent performance
   - Optimize package size and initialization code
   - Consider keeping functions warm with scheduled invocations

2. **VPC Connectivity Issues**
   - Ensure NAT Gateway or VPC endpoints for AWS service access
   - Check security group rules for outbound access
   - Verify subnet routing tables

3. **Memory and Timeout Errors**
   - Monitor CloudWatch metrics for actual usage patterns
   - Adjust memory allocation based on CPU requirements
   - Implement proper timeout handling in application code

### Debug Mode

Enable detailed logging and tracing:

```yaml
config:
  environment:
    variables:
      LOG_LEVEL: debug
      AWS_LAMBDA_LOG_LEVEL: DEBUG
  tracingConfig:
    mode: Active
  tags:
    debug: "true"
```

## Examples

See the [`examples/`](../../examples/) directory for complete service templates:

- `examples/rest-api/` - RESTful API with CRUD operations
- `examples/graphql-api/` - GraphQL API implementation
- `examples/microservices/` - Microservices with Lambda APIs

## API Reference

### LambdaApiComponent

Main component class that extends `Component`.

#### Methods

- `synth()`: Creates AWS resources (Lambda Function, IAM Role, CloudWatch Logs)
- `getCapabilities()`: Returns compute:lambda-api capability
- `getType()`: Returns 'lambda-api'

### Configuration Interfaces

- `LambdaApiConfig`: Main configuration interface
- `LAMBDA_API_CONFIG_SCHEMA`: JSON schema for validation

## Development

To contribute to this component:

1. Make changes to the source code
2. Run tests: `npm test`
3. Build: `npm run build`
4. Follow the [Contributing Guide](../../../CONTRIBUTING.md)

## License

MIT License - see LICENSE file for details.