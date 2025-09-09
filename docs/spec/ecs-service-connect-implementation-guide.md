# ECS Service Connect Components

Enterprise-grade microservices platform components implementing the Platform ECS Service Connect Standard v1.0. Provides unified service discovery and networking for containerized applications running on either AWS Fargate or EC2.

## Overview

The ECS Service Connect component suite enables declarative microservice architectures with automatic service discovery, security group management, and compute-agnostic communication. Whether you're running serverless containers on Fargate or traditional containers on EC2, the developer experience is identical.

### Key Features

- **Declarative Service Discovery**: Simple service.yml configuration for complex networking
- **Compute Agnostic**: Identical experience for Fargate and EC2 workloads
- **Secure by Default**: Automatic security group rules following least privilege
- **Abstracted Complexity**: No need to manage Cloud Map, DNS, or security groups manually
- **Compliance Aware**: Automatic configuration for Commercial/FedRAMP Moderate/FedRAMP High
- **Production Ready**: Complete ConfigBuilder pattern, schemas, and error handling

### Standards Compliance

✅ **Platform ECS Service Connect Standard v1.0**
- Section 3.1: ecs-cluster foundational component
- Section 3.2: ecs-fargate-service and ecs-ec2-service components  
- Section 3.3: ComputeToServiceConnectBinder binding strategy
- Section 4: Complete end-to-end developer experience

✅ **Platform Service Injector Standard v1.0**  
- ConfigBuilder pattern implementation
- Platform service integration
- Centralized cross-cutting concerns

## Component Architecture

### Foundation: ecs-cluster

The `ecs-cluster` component creates the logical boundary and shared resources for microservices:

- **ECS Cluster**: Container orchestration platform
- **Service Connect Namespace**: AWS Cloud Map namespace for service discovery
- **Optional EC2 Capacity**: Auto Scaling Group for EC2-based workloads
- **Capability**: Provides `ecs:cluster` for service components to bind to

### Services: ecs-fargate-service & ecs-ec2-service

Two specialized service components with nearly identical developer experiences:

| Component | Compute | Key Config Properties |
|---|---|---|
| `ecs-fargate-service` | Serverless | `cluster`, `image`, `cpu`, `memory`, `port`, `serviceConnect` |
| `ecs-ec2-service` | EC2 Instances | `cluster`, `image`, `taskCpu`, `taskMemory`, `port`, `serviceConnect` |

Both components:
- Register with Service Connect for automatic discovery
- Create security groups with least privilege access
- Support auto scaling, health checks, and compliance hardening
- Provide `service:connect` capability for other components to bind to

### Binding: ComputeToServiceConnectBinder

Universal binding strategy that connects any compute component to Service Connect services:
- **Strategy Key**: `*:service:connect` (handles any source type)
- **Automatic Security**: Creates precise security group rules
- **Service Discovery**: Injects environment variables for discovery
- **Compute Agnostic**: Works with Lambda, EC2, ECS services

## Usage Examples

### Example A: Fargate-Based Microservices

```yaml
# service.yml
service: payments-app
owner: payments-team
complianceFramework: commercial

components:
  # Foundational ECS cluster with Service Connect
  - name: app-cluster
    type: ecs-cluster
    config:
      serviceConnect: 
        namespace: "internal"
      # No 'capacity' block = Fargate-only cluster

  # Payment processing service (server)
  - name: payments-api
    type: ecs-fargate-service
    config:
      cluster: app-cluster
      image: 
        repository: "payments-api"
        tag: "v1.2.0"
      cpu: 512
      memory: 1024
      port: 8080
      serviceConnect:
        portMappingName: "api"
      environment:
        NODE_ENV: "production"
        LOG_LEVEL: "info"

  # Frontend application (client)
  - name: payments-ui
    type: ecs-fargate-service
    config:
      cluster: app-cluster
      image:
        repository: "payments-ui"
        tag: "v2.1.0"
      cpu: 256
      memory: 512
      port: 3000
      serviceConnect:
        portMappingName: "web"
    binds:
      - to: payments-api
        capability: service:connect
        access: write
```

**Result**: 
- `payments-ui` can call `payments-api` via `http://payments-api.internal:8080`
- Automatic security group rules allow communication
- Service discovery environment variables injected automatically

### Example B: EC2-Based Microservices

```yaml
# service.yml  
service: inventory-app
owner: inventory-team
complianceFramework: fedramp-moderate

components:
  # ECS cluster with managed EC2 capacity
  - name: app-cluster
    type: ecs-cluster
    config:
      serviceConnect:
        namespace: "inventory.internal"
      capacity: # Adding capacity block provisions EC2 instances
        instanceType: "m5.large"
        minSize: 2
        maxSize: 8
        enableMonitoring: true

  # Inventory service running on EC2
  - name: inventory-service
    type: ecs-ec2-service  # EC2-based service
    config:
      cluster: app-cluster
      image:
        repository: "inventory-service"
        tag: "latest"
      taskCpu: 1024  # CPU units (1 vCPU = 1024)
      taskMemory: 2048  # Memory in MiB
      port: 8080
      serviceConnect:
        portMappingName: "inventory-api"
      desiredCount: 2
      autoScaling:
        minCapacity: 2
        maxCapacity: 6
        targetCpuUtilization: 60
      healthCheck:
        command: ["CMD-SHELL", "curl -f http://localhost:8080/health || exit 1"]
        interval: 20

  # Order service that depends on inventory
  - name: order-service
    type: ecs-ec2-service
    config:
      cluster: app-cluster
      image:
        repository: "order-service"
      taskCpu: 512
      taskMemory: 1024
      port: 8081
      serviceConnect:
        portMappingName: "order-api"
    binds:
      - to: inventory-service
        capability: service:connect
        access: read
```

**Result**:
- Both services run on shared EC2 instances in the cluster
- `order-service` discovers `inventory-service` via Service Connect
- Auto scaling based on CPU/memory utilization
- FedRAMP Moderate compliance settings applied automatically

### Example C: Hybrid Architecture (Lambda + ECS)

```yaml
# service.yml
service: ecommerce-platform
owner: platform-team
complianceFramework: commercial

components:
  # ECS cluster for core services
  - name: core-cluster
    type: ecs-cluster
    config:
      serviceConnect:
        namespace: "core.internal"

  # Product catalog service on Fargate
  - name: catalog-service
    type: ecs-fargate-service
    config:
      cluster: core-cluster
      image:
        repository: "product-catalog"
      cpu: 1024
      memory: 2048
      port: 8080
      serviceConnect:
        portMappingName: "catalog"

  # Lambda API that calls catalog service
  - name: api-gateway
    type: lambda-api
    config:
      handler: "src/api.handler"
      runtime: "nodejs18.x"
    binds:
      - to: catalog-service
        capability: service:connect
        access: read
```

**Result**:
- Lambda function automatically configured to call ECS service
- Environment variables: `CATALOG_SERVICE_SERVICE_ENDPOINT=http://catalog-service.core.internal:8080`
- Security group rules allow Lambda to ECS communication
- No VPC or DNS management required

## Configuration Reference

### ecs-cluster Configuration

```yaml
type: ecs-cluster
config:
  # Required: Service Connect namespace
  serviceConnect:
    namespace: string  # e.g., "internal", "my-app.internal"
    
  # Optional: EC2 capacity (omit for Fargate-only)
  capacity:
    instanceType: string      # e.g., "m5.large"
    minSize: number          # Minimum instances
    maxSize: number          # Maximum instances
    desiredSize?: number     # Optional, defaults to minSize
    keyName?: string         # SSH key pair
    enableMonitoring?: boolean  # CloudWatch detailed monitoring
    
  # Optional: Container Insights (defaults to true)
  containerInsights?: boolean
  
  # Optional: Custom cluster name
  clusterName?: string
  
  # Optional: Additional tags
  tags?: 
    key: value
```

### ecs-fargate-service Configuration

```yaml
type: ecs-fargate-service  
config:
  # Required: Basic configuration
  cluster: string           # ECS cluster component name
  image:
    repository: string      # Container image
    tag?: string           # Defaults to "latest"
  cpu: number              # 256, 512, 1024, 2048, 4096, 8192, 16384
  memory: number           # Must be compatible with CPU
  port: number             # Container port
  serviceConnect:
    portMappingName: string  # Service discovery name
    
  # Optional: Runtime configuration
  environment?: 
    KEY: value             # Environment variables
  secrets?:
    KEY: secretArn         # AWS Secrets Manager ARNs
  taskRoleArn?: string     # Custom IAM role
  desiredCount?: number    # Task count (default: 1)
  
  # Optional: Health checking
  healthCheck?:
    command: [string]      # Health check command
    interval?: number      # Seconds (default: 30)
    timeout?: number       # Seconds (default: 5)
    retries?: number       # Count (default: 3)
    
  # Optional: Auto scaling
  autoScaling?:
    minCapacity: number
    maxCapacity: number
    targetCpuUtilization?: number     # Percent (default: 70)
    targetMemoryUtilization?: number # Percent (default: 80)
    
  # Optional: Additional tags
  tags?:
    key: value
```

### ecs-ec2-service Configuration

```yaml
type: ecs-ec2-service
config:
  # Required: Basic configuration  
  cluster: string           # ECS cluster component name
  image:
    repository: string      # Container image
    tag?: string           # Defaults to "latest"
  taskCpu: number          # CPU units (1024 = 1 vCPU)
  taskMemory: number       # Memory in MiB
  port: number             # Container port
  serviceConnect:
    portMappingName: string  # Service discovery name
    
  # Optional: Runtime configuration
  environment?: 
    KEY: value             # Environment variables
  secrets?:
    KEY: secretArn         # AWS Secrets Manager ARNs
  taskRoleArn?: string     # Custom IAM role
  desiredCount?: number    # Task count (default: 1)
  
  # Optional: EC2-specific placement
  placementConstraints?:
    - type: string         # "memberOf" | "distinctInstance"
      expression?: string  # Required for memberOf
  placementStrategies?:
    - type: string         # "random" | "spread" | "binpack"  
      field?: string       # Field to apply strategy to
      
  # Optional: Health checking
  healthCheck?:
    command: [string]      # Health check command
    interval?: number      # Seconds (default: 30)
    timeout?: number       # Seconds (default: 5)
    retries?: number       # Count (default: 3)
    
  # Optional: Auto scaling
  autoScaling?:
    minCapacity: number
    maxCapacity: number
    targetCpuUtilization?: number     # Percent (default: 70)
    targetMemoryUtilization?: number # Percent (default: 80)
    
  # Optional: Additional tags
  tags?:
    key: value
```

## Service Discovery

### Automatic Environment Variables

When a component binds to a Service Connect service, these environment variables are automatically injected:

```bash
# Primary service discovery variables
{SERVICE_NAME}_SERVICE_ENDPOINT=http://service-name.namespace:port
{SERVICE_NAME}_SERVICE_HOST=service-name.namespace
{SERVICE_NAME}_SERVICE_PORT=port

# DNS-based discovery
{SERVICE_NAME}_DNS_NAME=service-name.namespace

# Legacy compatibility
{SERVICE_NAME}_URL=http://service-name.namespace:port
{SERVICE_NAME}_HOST=service-name
{SERVICE_NAME}_PORT=port

# Service Connect metadata
SERVICE_CONNECT_ENABLED=true
SERVICE_DISCOVERY_NAMESPACE=namespace
```

### Service Endpoints

Services are discoverable via multiple endpoint formats:

1. **Service Connect Endpoint**: `http://service-name.internal:port` (recommended)
2. **DNS Name**: `service-name.namespace` (for custom protocols)  
3. **Environment Variable**: `${SERVICE_NAME_SERVICE_ENDPOINT}` (dynamic)

## Compliance Framework Integration

The components automatically adjust behavior based on compliance framework:

### Commercial (Default)
- **Cost Optimized**: Smaller instance types, limited auto scaling
- **Basic Monitoring**: Standard health checks and logging
- **Flexible Placement**: Cost-optimized task placement strategies

### FedRAMP Moderate
- **Enhanced Security**: Stricter security group rules
- **Improved Monitoring**: More frequent health checks, longer log retention
- **High Availability**: Multi-AZ deployment preferences

### FedRAMP High  
- **Maximum Security**: Comprehensive audit logging, encryption
- **High Availability**: Always ≥2 instances, cross-AZ spreading
- **Strict Monitoring**: Frequent health checks, 7-year log retention
- **Enhanced Placement**: Spread across instances and availability zones

## Troubleshooting

### Common Issues

1. **Service Discovery Fails**
   - **Check**: Ensure both services are in the same Service Connect namespace
   - **Check**: Verify security group rules allow traffic on the correct port
   - **Fix**: Use environment variables instead of hardcoded endpoints

2. **CPU/Memory Errors (Fargate)**
   - **Problem**: Invalid CPU/Memory combinations for Fargate
   - **Fix**: Use valid combinations: 256 vCPU with 512/1024/2048 MB memory, etc.

3. **Task Placement Issues (EC2)**
   - **Problem**: Tasks not distributing properly across instances
   - **Fix**: Adjust placement strategies and constraints in configuration

4. **Health Check Failures**
   - **Check**: Verify health check command is correct for your application
   - **Check**: Ensure container is listening on the specified port
   - **Fix**: Adjust timeout and retry values based on application startup time

### Debug Commands

```bash
# Check ECS service status
aws ecs describe-services --cluster cluster-name --services service-name

# Check Service Connect configuration
aws ecs describe-services --cluster cluster-name --services service-name --include serviceConnectConfiguration

# Check task health
aws ecs describe-tasks --cluster cluster-name --tasks task-arn

# Check security group rules
aws ec2 describe-security-groups --group-ids sg-xxxxxx

# Test service connectivity from within VPC
curl http://service-name.internal:8080/health
```

### Monitoring and Observability

The components automatically integrate with the Platform Observability Service:

- **CloudWatch Logs**: Container logs with compliance-appropriate retention
- **CloudWatch Metrics**: Task CPU/memory utilization, service health
- **CloudWatch Alarms**: Auto scaling triggers, health check failures
- **OpenTelemetry**: Automatic trace and metrics collection (when enabled)

## Migration Guide

### From ELB-based Services

```yaml
# Before: Manual ELB + Target Groups
- name: old-service
  type: lambda-api
  config:
    handler: app.handler
  binds:
    - to: database
      capability: db:postgres

# After: Service Connect
- name: new-service  
  type: ecs-fargate-service
  config:
    cluster: app-cluster
    image:
      repository: old-lambda-app
    serviceConnect:
      portMappingName: api
```

### From EC2-based Services

```yaml
# Before: Manual EC2 instances
- name: old-app
  type: ec2-instance
  config:
    instanceType: m5.large

# After: ECS Service Connect
- name: new-app
  type: ecs-ec2-service  
  config:
    cluster: app-cluster
    image:
      repository: containerized-app
    taskCpu: 1024
    taskMemory: 2048
    serviceConnect:
      portMappingName: app
```

## Best Practices

### Service Design
1. **Single Responsibility**: One service per component, one port per service
2. **Stateless**: Design services to be horizontally scalable
3. **Health Endpoints**: Always implement `/health` endpoints for proper monitoring
4. **Graceful Shutdown**: Handle SIGTERM for zero-downtime deployments

### Configuration
1. **Resource Sizing**: Start small and scale up based on actual usage
2. **Health Checks**: Set realistic timeouts based on application startup time
3. **Auto Scaling**: Use conservative thresholds to avoid thrashing
4. **Placement**: Use spread strategies for availability, binpack for cost optimization

### Security
1. **Least Privilege**: Only bind services that need to communicate
2. **Environment Variables**: Use AWS Secrets Manager for sensitive data
3. **Network Isolation**: Use private subnets for all services
4. **Compliance**: Choose appropriate compliance framework for your workload

### Monitoring
1. **Structured Logging**: Use JSON format with correlation IDs
2. **Metrics**: Expose custom metrics via OpenTelemetry
3. **Alerts**: Set up CloudWatch alarms for critical service metrics
4. **Tracing**: Use distributed tracing for request flow visibility

## Examples Repository

Complete example applications demonstrating ECS Service Connect patterns:

- **[Simple Web App](../examples/ecs-simple-web-app/)**: Basic Fargate service with health checks
- **[Microservices Architecture](../examples/ecs-microservices/)**: Multi-service application with EC2 and Fargate
- **[Hybrid Lambda + ECS](../examples/ecs-lambda-hybrid/)**: Lambda functions calling ECS services
- **[Compliance Application](../examples/ecs-fedramp-app/)**: FedRAMP High compliance configuration

## Contributing

When enhancing the ECS Service Connect components:

1. Follow the [Platform Component Development Guide](../CONTRIBUTING.md#component-development)
2. Add comprehensive unit and integration tests
3. Update this documentation with new features
4. Test with all compliance frameworks
5. Verify binding strategy compatibility

For questions or support, contact the Platform Team or create an issue in the project repository.
