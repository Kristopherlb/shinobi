# Backstage Portal Component

A production-grade component that provisions a complete Backstage developer portal with integrated database, authentication, and observability capabilities. Zero-config developer portal that just works.

## Overview

The Backstage Portal Component provides a comprehensive developer portal solution built on AWS infrastructure. It includes:

- **Containerized Backstage Frontend & Backend** - ECS Fargate services for scalable deployment
- **PostgreSQL Database** - RDS instance for catalog and user data storage
- **GitHub OAuth Integration** - Secure authentication with GitHub organizations
- **Service Discovery & Catalog Management** - Automatic service discovery and catalog management
- **Comprehensive Observability** - CloudWatch logging, metrics, and alarms
- **Security & Compliance** - Encryption, VPC isolation, and compliance framework support

## Features

### 🚀 **Core Capabilities**
- **Zero-config deployment** - Works out of the box with sensible defaults
- **Multi-environment support** - Dev, staging, and production configurations
- **Compliance framework support** - Commercial, FedRAMP, ISO27001, SOC2
- **Auto-scaling** - ECS Fargate with configurable scaling policies
- **High availability** - Multi-AZ database and load balancer distribution

### 🔧 **Developer Experience**
- **Service catalog** - Automatic discovery and registration of services
- **API documentation** - Self-documenting APIs with OpenAPI integration
- **Plugin ecosystem** - Extensible with Backstage plugins
- **GitOps integration** - Catalog updates via Git commits
- **Local development** - Docker Compose for local development

### 🔒 **Security & Compliance**
- **Encryption at rest and in transit** - KMS encryption for all data
- **VPC isolation** - Private subnets with controlled egress
- **IAM least privilege** - Minimal required permissions
- **Audit logging** - Comprehensive CloudTrail and CloudWatch logs
- **Compliance tagging** - Automatic resource tagging for compliance

### 📊 **Observability**
- **Structured logging** - JSON logs with correlation IDs
- **Custom metrics** - Application and infrastructure metrics
- **Health checks** - Liveness and readiness probes
- **Alarms** - CPU, memory, and error rate monitoring
- **Dashboards** - Pre-built CloudWatch dashboards

## Usage

### Basic Usage

```yaml
# service.yml
apiVersion: v1
kind: Service
metadata:
  name: my-backstage-portal
spec:
  serviceName: my-backstage-portal
  version: "1.0.0"
  environment: dev
  complianceFramework: commercial
  
  components:
    - name: backstage-portal
      type: backstage-portal
      config:
        portal:
          name: "My Company Portal"
          organization: "My Company"
          description: "Internal developer portal"
          baseUrl: "https://backstage.mycompany.com"
        auth:
          provider: github
          github:
            clientId: "${GITHUB_CLIENT_ID}"
            clientSecret: "${GITHUB_CLIENT_SECRET}"
            organization: "mycompany"
        catalog:
          providers:
            - type: github
              id: mycompany
              org: mycompany
              catalogPath: /catalog-info.yaml
```

### Advanced Configuration

```yaml
# service.yml
apiVersion: v1
kind: Service
metadata:
  name: enterprise-backstage-portal
spec:
  serviceName: enterprise-backstage-portal
  version: "1.0.0"
  environment: prod
  complianceFramework: fedramp-moderate
  
  components:
    - name: backstage-portal
      type: backstage-portal
      config:
        portal:
          name: "Enterprise Portal"
          organization: "Enterprise Corp"
          description: "Enterprise developer portal"
          baseUrl: "https://backstage.enterprise.com"
        
        database:
          instanceClass: "db.r5.xlarge"
          allocatedStorage: 500
          maxAllocatedStorage: 2000
          backupRetentionDays: 30
          multiAz: true
          deletionProtection: true
        
        backend:
          desiredCount: 5
          cpu: 2048
          memory: 4096
          healthCheckPath: "/health"
          healthCheckInterval: 15
        
        frontend:
          desiredCount: 3
          cpu: 1024
          memory: 2048
          healthCheckPath: "/"
          healthCheckInterval: 15
        
        observability:
          logRetentionDays: 180
          cpuThreshold: 60
          memoryThreshold: 75
          enableTracing: true
          enableMetrics: true
        
        security:
          enableEncryption: true
          enableVpcFlowLogs: true
          enableWaf: true
        
        auth:
          provider: github
          github:
            clientId: "${GITHUB_CLIENT_ID}"
            clientSecret: "${GITHUB_CLIENT_SECRET}"
            organization: "enterprise"
        
        catalog:
          providers:
            - type: github
              id: enterprise
              org: enterprise
              catalogPath: /catalog-info.yaml
            - type: gitlab
              id: enterprise-gitlab
              org: enterprise
              catalogPath: /catalog-info.yaml
```

## Configuration Reference

### Portal Configuration

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `portal.name` | string | "Shinobi Developer Portal" | Name of the Backstage portal |
| `portal.organization` | string | "Shinobi Platform" | Organization name |
| `portal.description` | string | "Developer portal for Shinobi platform components and services" | Portal description |
| `portal.baseUrl` | string | "https://backstage.shinobi.local" | Base URL for the portal |

### Database Configuration

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `database.instanceClass` | string | "db.t3.micro" | RDS instance class |
| `database.allocatedStorage` | number | 20 | Initial allocated storage in GB |
| `database.maxAllocatedStorage` | number | 100 | Maximum allocated storage in GB |
| `database.backupRetentionDays` | number | 7 | Backup retention period in days |
| `database.multiAz` | boolean | false | Enable Multi-AZ deployment |
| `database.deletionProtection` | boolean | true | Enable deletion protection |

### Backend Service Configuration

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `backend.desiredCount` | number | 2 | Desired number of backend tasks |
| `backend.cpu` | number | 512 | CPU units (256 = 0.25 vCPU) |
| `backend.memory` | number | 1024 | Memory in MiB |
| `backend.healthCheckPath` | string | "/health" | Health check path |
| `backend.healthCheckInterval` | number | 30 | Health check interval in seconds |

### Frontend Service Configuration

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `frontend.desiredCount` | number | 2 | Desired number of frontend tasks |
| `frontend.cpu` | number | 256 | CPU units (256 = 0.25 vCPU) |
| `frontend.memory` | number | 512 | Memory in MiB |
| `frontend.healthCheckPath` | string | "/" | Health check path |
| `frontend.healthCheckInterval` | number | 30 | Health check interval in seconds |

### Observability Configuration

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `observability.logRetentionDays` | number | 30 | CloudWatch log retention in days |
| `observability.cpuThreshold` | number | 80 | CPU utilization alarm threshold percentage |
| `observability.memoryThreshold` | number | 85 | Memory utilization alarm threshold percentage |
| `observability.enableTracing` | boolean | true | Enable X-Ray tracing |
| `observability.enableMetrics` | boolean | true | Enable custom metrics |

### Security Configuration

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `security.enableEncryption` | boolean | true | Enable encryption at rest and in transit |
| `security.enableVpcFlowLogs` | boolean | true | Enable VPC Flow Logs |
| `security.enableWaf` | boolean | false | Enable AWS WAF |

### Authentication Configuration

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `auth.provider` | string | "github" | Authentication provider (github, google, microsoft) |
| `auth.github.clientId` | string | - | GitHub OAuth client ID |
| `auth.github.clientSecret` | string | - | GitHub OAuth client secret |
| `auth.github.organization` | string | "shinobi-platform" | GitHub organization name |

### Catalog Configuration

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `catalog.providers` | array | [] | Catalog providers configuration |
| `catalog.providers[].type` | string | - | Provider type (github, gitlab, bitbucket) |
| `catalog.providers[].id` | string | - | Provider identifier |
| `catalog.providers[].org` | string | - | Organization name |
| `catalog.providers[].catalogPath` | string | - | Path to catalog-info.yaml file |

## Capabilities

This component provides the following capabilities for other components to bind to:

- `portal:url` - The public URL of the Backstage portal
- `ecr:repository` - The ECR repository URI for container images
- `cluster:name` - The ECS cluster name
- `database:endpoint` - The RDS database endpoint
- `database:port` - The RDS database port
- `alb:dns-name` - The Application Load Balancer DNS name
- `alb:zone-id` - The Application Load Balancer hosted zone ID

## Construct Handles

The following construct handles are available for patches and escape hatches:

- `main` - The primary ECS cluster construct
- `ecr` - The ECR repository construct
- `alb` - The Application Load Balancer construct
- `backend` - The Backstage backend ECS service construct
- `frontend` - The Backstage frontend ECS service construct
- `database` - The RDS PostgreSQL database construct

## Compliance Framework Support

The component automatically adjusts its configuration based on the compliance framework:

### Commercial
- Standard security settings
- 30-day log retention
- Basic monitoring thresholds

### FedRAMP Moderate
- Multi-AZ database deployment
- WAF enabled
- 90-day log retention
- Stricter monitoring thresholds

### FedRAMP High
- Multi-AZ database deployment
- WAF enabled
- 180-day log retention
- Very strict monitoring thresholds

### ISO27001
- Multi-AZ database deployment
- WAF enabled
- 120-day log retention
- Strict monitoring thresholds

### SOC2
- Multi-AZ database deployment
- WAF enabled
- 90-day log retention
- Strict monitoring thresholds

## Environment-Specific Defaults

The component provides different defaults based on the environment:

### Development
- Single instance deployment
- Minimal resource allocation
- 7-day log retention
- Relaxed monitoring thresholds

### Staging
- Dual instance deployment
- Moderate resource allocation
- 14-day log retention
- Standard monitoring thresholds

### Production
- Multi-instance deployment
- High resource allocation
- 30-day log retention
- Strict monitoring thresholds

## Dependencies

This component depends on the following AWS services:
- ECS (Elastic Container Service)
- ECR (Elastic Container Registry)
- RDS (Relational Database Service)
- VPC (Virtual Private Cloud)
- ALB (Application Load Balancer)
- CloudWatch (Logs and Metrics)
- Secrets Manager
- KMS (Key Management Service)

## External Dependencies

- GitHub API for OAuth authentication
- Docker Hub for base container images
- GitHub OAuth App for authentication

## Examples

See the `examples/` directory for complete usage examples:
- Basic portal setup
- Enterprise configuration
- Multi-provider catalog
- Custom authentication

## Troubleshooting

### Common Issues

1. **Database connection failures**
   - Check VPC security groups
   - Verify database credentials in Secrets Manager
   - Ensure database is in the same VPC as ECS tasks

2. **Authentication issues**
   - Verify GitHub OAuth app configuration
   - Check client ID and secret in Secrets Manager
   - Ensure organization access is properly configured

3. **Catalog not loading**
   - Verify catalog provider configuration
   - Check GitHub repository access
   - Ensure catalog-info.yaml files are properly formatted

4. **High resource utilization**
   - Adjust CPU and memory allocation
   - Scale up database instance class
   - Review application performance

### Monitoring

The component provides comprehensive monitoring through CloudWatch:
- CPU and memory utilization
- Request count and error rate
- Database connection count
- Health check status

### Logs

All logs are available in CloudWatch Logs:
- `/aws/ecs/{serviceName}/backstage-backend` - Backend application logs
- `/aws/ecs/{serviceName}/backstage-frontend` - Frontend application logs
- `/aws/rds/{serviceName}/backstage-db` - Database logs

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## License

MIT License - see LICENSE file for details.
