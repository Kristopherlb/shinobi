# MCP Server Component

The Model Context Protocol (MCP) Server is a comprehensive system-level API that provides both descriptive context about the platform's capabilities and generative tooling for extending the platform. It implements the MCP Server Specification v1.0.

## Overview

The MCP Server acts as the definitive, machine-readable API for the entire platform ecosystem with two primary functions:

- **To Describe**: Provides structured, real-time context about platform capabilities, schemas, and deployed services
- **To Generate**: Provides tooling endpoints that generate boilerplate code for extending the platform

## Architecture

- **Service Type**: Containerized REST API service (ECS Fargate)
- **Authentication**: Token-based JWT authentication with scoped permissions
- **Data Sources**: Git repositories, AWS APIs, and template repositories
- **Compliance**: Supports Commercial, FedRAMP Moderate, and FedRAMP High frameworks

## Configuration

```yaml
components:
  - name: mcp-server
    type: mcp-server
    config:
      cpu: 512                    # Task CPU units
      memory: 1024               # Task memory in MB
      taskCount: 2               # Desired task count
      containerPort: 8080        # Container port
      loadBalancer:
        enabled: true            # Enable ALB
        certificateArn: "arn:aws:acm:..."
        domainName: "mcp.example.com"
      authentication:
        jwtSecret: "your-jwt-secret"
        tokenExpiration: "24h"
      dataSources:
        git:
          repositoryUrls:
            - "https://github.com/org/platform-services"
        aws:
          crossAccountRoles:
            - "arn:aws:iam::account:role/MCP-CrossAccount"
          regions: ["us-east-1", "us-west-2"]
```

## API Endpoints

The MCP Server provides four categories of endpoints:

### Platform-Level Endpoints (Developer's Toolbox)

- `GET /platform/components` - Lists all available components
- `GET /platform/components/{type}/schema` - Returns component configuration schema
- `GET /platform/capabilities` - Returns capability naming standard
- `GET /platform/bindings` - Returns binding matrix
- `POST /platform/validate` - Validates service.yml manifests

### Service-Level Endpoints (Running Systems)

- `GET /services` - Lists all managed services
- `GET /services/{name}` - Service consolidated view
- `GET /services/{name}/manifest` - Service manifest
- `GET /services/{name}/status` - Real-time service status
- `GET /services/{name}/logs` - Correlated service logs

### Generative Tooling Endpoints (Scaffolding Engine)

- `POST /platform/generate/component` - Generates complete component boilerplate

### Platform Administration Endpoints (Super Admin Toolkit)

- `GET /admin/health` - Deep health check
- `POST /admin/registry/reload` - Reload component registry
- `GET /admin/audit` - Query audit logs
- `GET /admin/dependencies` - Dependency graph
- `GET /admin/drift` - Configuration drift detection

## Authentication & Authorization

The MCP Server uses JWT-based authentication with the following scopes:

- `read:services` - Read access to platform and service information
- `generate:components` - Access to generative tooling endpoints
- `admin:platform` - Full administrative access

## Usage Examples

### Discovering Available Components

```bash
curl -H "Authorization: Bearer $TOKEN" \
  https://mcp.example.com/api/v1/platform/components
```

### Generating a New Component

```bash
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "componentName": "redis-cache",
    "componentType": "redis-cache",
    "description": "Redis cache component with clustering support",
    "awsService": "elasticache",
    "capabilities": ["cache:redis"],
    "complianceFramework": "commercial"
  }' \
  https://mcp.example.com/api/v1/platform/generate/component
```

### Checking Service Status

```bash
curl -H "Authorization: Bearer $TOKEN" \
  https://mcp.example.com/api/v1/services/user-management/status
```

### Admin Health Check

```bash
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  https://mcp.example.com/api/v1/admin/health
```

## Development

### Running Locally

```bash
# Install dependencies
npm install

# Set environment variables
export JWT_SECRET="your-development-secret"
export NODE_ENV="development"
export PORT="8080"

# Build and start
npm run build
npm start
```

### Docker Deployment

```bash
# Build container
docker build -t mcp-server .

# Run container
docker run -p 8080:8080 \
  -e JWT_SECRET="your-jwt-secret" \
  -e NODE_ENV="production" \
  mcp-server
```

### Testing

```bash
# Run tests
npm test

# Run with coverage
npm run test:coverage
```

## Security Considerations

- Always use strong JWT secrets in production
- Implement proper CORS policies
- Use HTTPS in production environments
- Regularly rotate JWT secrets
- Monitor and audit API access
- Apply principle of least privilege for scopes

## Compliance Features

### FedRAMP High
- Enhanced audit logging with 1-year retention
- Restricted network egress
- Mandatory encryption at rest and in transit
- STIG compliance tags

### FedRAMP Moderate
- Standard audit logging with 90-day retention
- Network isolation requirements
- Encryption best practices

### Commercial
- Basic logging and monitoring
- Cost-optimized configurations
- Standard security practices

## Integration with Platform

The MCP Server integrates with:

- **Component Registry**: Dynamically discovers and loads new components
- **Binding System**: Provides real-time binding compatibility matrix
- **Audit System**: Centralized compliance audit logging
- **Template Repository**: Code generation templates
- **AWS APIs**: Real-time infrastructure status

## Contributing

See the [Contributing Guide](../../../CONTRIBUTING.md) for information on how to contribute to the MCP Server component.

## Monitoring

The MCP Server provides comprehensive monitoring through:

- Health check endpoints for load balancers
- Structured logging with correlation IDs
- CloudWatch metrics integration
- Performance monitoring
- Security audit trails

## Troubleshooting

### Common Issues

1. **Authentication Errors**: Verify JWT secret and token format
2. **Permission Denied**: Check token scopes match endpoint requirements
3. **Service Discovery**: Ensure Git repository access is configured
4. **AWS API Errors**: Verify IAM permissions and cross-account roles

### Debug Mode

Enable debug logging by setting `LOG_LEVEL=DEBUG` environment variable.

## License

MIT License - see LICENSE file for details.