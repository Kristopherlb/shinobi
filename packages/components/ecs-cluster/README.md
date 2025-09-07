# ECS Cluster Component

Enterprise-grade Amazon Elastic Container Service (ECS) cluster for container orchestration with auto-scaling, security hardening, and comprehensive monitoring capabilities.

## Overview

This component provides a fully managed ECS cluster with:

- **Container Orchestration**: Advanced task scheduling and service management
- **Auto-Scaling**: Capacity providers for both Fargate and EC2 launch types
- **Security Integration**: Task roles, execution roles, and network isolation
- **Compliance Hardening**: Three-tier compliance support (Commercial/FedRAMP Moderate/FedRAMP High)
- **Comprehensive Monitoring**: Container Insights and performance optimization

## Capabilities

- **compute:ecs-cluster**: Provides container orchestration for microservices and applications

## Configuration

```yaml
components:
  - name: app-cluster
    type: ecs-cluster
    config:
      clusterName: ApplicationCluster
      
      capacityProviders:
        - name: FARGATE
          defaultCapacityProviderStrategy:
            - capacityProvider: FARGATE
              weight: 1
              base: 0
        
        - name: FARGATE_SPOT
          defaultCapacityProviderStrategy:
            - capacityProvider: FARGATE_SPOT
              weight: 4
              base: 0
      
      containerInsights:
        enabled: true
        performanceInsightsEnabled: true
      
      executeCommandConfiguration:
        enabled: true
        kmsKeyId: arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012
        logConfiguration:
          cloudWatchLogGroup: /aws/ecs/execute-command
          cloudWatchEncryptionEnabled: true
          s3BucketName: company-ecs-exec-logs
          s3EncryptionEnabled: true
          s3KeyPrefix: execute-command/
      
      autoScalingGroup:
        enabled: true
        minCapacity: 2
        maxCapacity: 10
        desiredCapacity: 4
        instanceType: m5.large
        
        keyPair: my-key-pair
        userData: |
          #!/bin/bash
          echo ECS_CLUSTER=${clusterName} >> /etc/ecs/ecs.config
          echo ECS_ENABLE_CONTAINER_METADATA=true >> /etc/ecs/ecs.config
          echo ECS_ENABLE_TASK_IAM_ROLE=true >> /etc/ecs/ecs.config
          
          # Install CloudWatch agent
          yum install -y amazon-cloudwatch-agent
          
          # Configure Systems Manager agent
          yum install -y amazon-ssm-agent
          systemctl enable amazon-ssm-agent
          systemctl start amazon-ssm-agent
      
      vpc:
        vpcId: vpc-12345678
        subnetIds:
          - subnet-12345678
          - subnet-87654321
          - subnet-13579024
        securityGroupIds:
          - sg-ecs-cluster
      
      tags:
        cluster-type: application
        environment: production
        auto-scaling: enabled
```

## Binding Examples

### ECS Service to Cluster

```yaml
components:
  - name: web-service
    type: ecs-fargate-service
    config:
      serviceName: WebApplication
      taskDefinition:
        containerDefinitions:
          - name: web-app
            image: nginx:latest
            portMappings:
              - containerPort: 80
    binds:
      - to: app-cluster
        capability: compute:ecs-cluster
        access: run-tasks
```

### Application Load Balancer Integration

```yaml
components:
  - name: app-alb
    type: application-load-balancer
    config:
      loadBalancerName: AppLoadBalancer
    binds:
      - from: web-service
        capability: compute:ecs-cluster
        access: target-group
```

## Compliance Features

### Commercial
- Basic container insights
- Standard security configurations
- Cost-optimized Fargate Spot usage

### FedRAMP Moderate
- Enhanced container insights with performance monitoring
- Execute command enabled with encryption
- Comprehensive audit logging
- EC2 instances with enhanced monitoring
- 1-year audit log retention

### FedRAMP High
- Mandatory container insights with advanced monitoring
- Strict execute command controls with KMS encryption
- Enhanced security configurations
- High-performance instance types (m5.large+)
- 10-year audit log retention
- Advanced threat detection integration

## Advanced Configuration

### Mixed Capacity Provider Strategy

```yaml
config:
  capacityProviders:
    - name: FARGATE
      defaultCapacityProviderStrategy:
        - capacityProvider: FARGATE
          weight: 2
          base: 2  # Always have 2 Fargate tasks
    
    - name: FARGATE_SPOT
      defaultCapacityProviderStrategy:
        - capacityProvider: FARGATE_SPOT
          weight: 4
          base: 0  # Use Spot for additional capacity
    
    - name: EC2
      autoScalingGroupProvider:
        autoScalingGroupArn: arn:aws:autoscaling:us-east-1:123456789012:autoScalingGroup:uuid:autoScalingGroupName/my-asg
        managedScaling:
          status: ENABLED
          targetCapacity: 80
          minimumScalingStepSize: 1
          maximumScalingStepSize: 10
```

### Custom Launch Template for EC2

```yaml
config:
  autoScalingGroup:
    launchTemplate:
      imageId: ami-12345678  # ECS-optimized AMI
      instanceType: c5.large
      keyName: my-keypair
      securityGroups:
        - sg-ecs-instances
      userData: |
        #!/bin/bash
        echo ECS_CLUSTER=${clusterName} >> /etc/ecs/ecs.config
        echo ECS_ENABLE_CONTAINER_METADATA=true >> /etc/ecs/ecs.config
        echo ECS_ENABLE_SPOT_INSTANCE_DRAINING=true >> /etc/ecs/ecs.config
        
        # Install additional monitoring tools
        yum update -y
        yum install -y docker htop iotop
        
        # Configure Docker daemon
        echo '{"log-driver":"awslogs","log-opts":{"awslogs-region":"us-east-1","awslogs-group":"/aws/ecs/containerinsights/${clusterName}/performance"}}' > /etc/docker/daemon.json
        systemctl restart docker
```

### Service Discovery Integration

```yaml
config:
  serviceDiscovery:
    enabled: true
    namespace: company.local
    services:
      - name: web-app
        dnsConfig:
          dnsRecords:
            - type: A
              ttl: 60
          routingPolicy: WEIGHTED
```

## Monitoring and Observability

The component automatically configures:

- **Container Insights**: Cluster, service, and task-level metrics
- **CloudWatch Logs**: Centralized logging with log groups per service
- **AWS X-Ray**: Distributed tracing for containerized applications
- **CloudWatch Alarms**: Resource utilization and health monitoring
- **Custom Metrics**: Application-specific container metrics

### Monitoring Levels

- **Basic**: Cluster-level metrics and basic logging
- **Enhanced**: Container Insights + performance monitoring
- **Comprehensive**: Enhanced + X-Ray tracing + security monitoring

## Security Features

### Task Security
- Task execution roles with least-privilege permissions
- Task roles for application-specific AWS access
- Network isolation with security groups
- Secrets management integration

### Execute Command Security
- KMS encryption for command sessions
- CloudWatch Logs integration for audit trails
- S3 logging for compliance requirements
- IAM-based access controls

### Network Security
- VPC integration with private subnets
- Security group-based micro-segmentation
- Load balancer integration with SSL/TLS termination
- Service mesh integration (AWS App Mesh)

## Performance Optimization

### Capacity Planning

```yaml
config:
  capacityProviders:
    # For predictable workloads
    - name: FARGATE
      weight: 3
      base: 5
    
    # For variable workloads
    - name: FARGATE_SPOT
      weight: 7
      base: 0
```

### Auto Scaling Configuration

```yaml
config:
  autoScalingGroup:
    targetTrackingScalingPolicies:
      - targetValue: 70.0
        scaleOutCooldown: 300
        scaleInCooldown: 300
        predefinedMetricSpecification:
          predefinedMetricType: ASGAverageCPUUtilization
```

### Task Placement Strategies

```yaml
# Service configuration (in bound ECS service)
taskPlacement:
  placementStrategy:
    - type: spread
      field: attribute:ecs.availability-zone
    - type: spread
      field: instanceId
  placementConstraints:
    - type: memberOf
      expression: attribute:ecs.instance-type =~ c5.*
```

## Container Insights and Monitoring

### Performance Monitoring

```yaml
config:
  containerInsights:
    enabled: true
    performanceInsightsEnabled: true
    enhancedMonitoring:
      enabled: true
      collectionInterval: 60
    customMetrics:
      - metricName: TaskCPUReservation
        namespace: AWS/ECS
      - metricName: TaskMemoryReservation
        namespace: AWS/ECS
```

### Log Analytics

```yaml
config:
  logging:
    logDriver: awslogs
    logConfiguration:
      awslogs-group: /aws/ecs/cluster/${clusterName}
      awslogs-region: us-east-1
      awslogs-stream-prefix: ecs
      awslogs-create-group: true
```

## Service Discovery and Networking

### AWS Cloud Map Integration

```yaml
config:
  serviceDiscovery:
    enabled: true
    namespace: production.company.local
    services:
      - name: api-service
        description: Backend API service
        dnsConfig:
          namespaceId: ns-12345678
          dnsRecords:
            - type: A
              ttl: 300
          routingPolicy: MULTIVALUE
        healthCheckConfig:
          type: HTTP
          resourcePath: /health
          failureThreshold: 3
```

### Load Balancer Integration

```yaml
# Target group configuration
targetGroups:
  - name: api-tg
    port: 8080
    protocol: HTTP
    targetType: ip
    healthCheck:
      enabled: true
      path: /health
      intervalSeconds: 30
      timeoutSeconds: 5
      healthyThresholdCount: 2
      unhealthyThresholdCount: 3
```

## Troubleshooting

### Common Issues

1. **Task Placement Failures**
   - Check capacity provider availability and limits
   - Verify subnet capacity and availability zones
   - Review task resource requirements vs. available capacity

2. **Service Discovery Issues**
   - Verify namespace and service configuration
   - Check DNS resolution within VPC
   - Review health check configurations

3. **Execute Command Access Issues**
   - Verify IAM permissions for execute command
   - Check KMS key permissions for encryption
   - Ensure Systems Manager agent is running on instances

### Debug Mode

Enable detailed logging and monitoring:

```yaml
config:
  containerInsights:
    enabled: true
    performanceInsightsEnabled: true
  executeCommandConfiguration:
    enabled: true
    logConfiguration:
      cloudWatchLogGroup: /aws/ecs/debug
  tags:
    debug: "true"
    detailed-monitoring: "enabled"
```

## Examples

See the [`examples/`](../../examples/) directory for complete service templates:

- `examples/microservices-cluster/` - Multi-service microservices architecture
- `examples/batch-processing/` - Batch job processing cluster
- `examples/web-application/` - Full-stack web application deployment

## API Reference

### EcsClusterComponent

Main component class that extends `Component`.

#### Methods

- `synth()`: Creates AWS resources (ECS Cluster, Capacity Providers, Auto Scaling)
- `getCapabilities()`: Returns compute:ecs-cluster capability
- `getType()`: Returns 'ecs-cluster'

### Configuration Interfaces

- `EcsClusterConfig`: Main configuration interface
- `ECS_CLUSTER_CONFIG_SCHEMA`: JSON schema for validation

## Development

To contribute to this component:

1. Make changes to the source code
2. Run tests: `npm test`
3. Build: `npm run build`
4. Follow the [Contributing Guide](../../../CONTRIBUTING.md)

## License

MIT License - see LICENSE file for details.