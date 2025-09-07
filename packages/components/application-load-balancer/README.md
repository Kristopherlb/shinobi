# Application Load Balancer Component

Enterprise-grade AWS Application Load Balancer (ALB) for distributing HTTP/HTTPS traffic with advanced routing, SSL termination, and comprehensive monitoring capabilities.

## Overview

This component provides a fully managed Application Load Balancer with:

- **Layer 7 Load Balancing**: HTTP/HTTPS traffic distribution with content-based routing
- **SSL/TLS Termination**: Certificate management with AWS Certificate Manager integration
- **Advanced Routing**: Path-based and host-based routing with weighted targets
- **Compliance Hardening**: Three-tier compliance support (Commercial/FedRAMP Moderate/FedRAMP High)
- **Security Integration**: WAF, security groups, and access logging

## Capabilities

- **network:alb**: Provides load balancing and traffic distribution for web applications

## Configuration

```yaml
components:
  - name: web-load-balancer
    type: application-load-balancer
    config:
      loadBalancerName: WebApplicationALB
      scheme: internet-facing
      
      subnets:
        - subnet-12345678
        - subnet-87654321
        - subnet-13579024
      
      securityGroups:
        - sg-alb-web
        - sg-alb-monitoring
      
      listeners:
        - port: 80
          protocol: HTTP
          defaultActions:
            - type: redirect
              redirectConfig:
                protocol: HTTPS
                port: 443
                statusCode: HTTP_301
        
        - port: 443
          protocol: HTTPS
          certificateArn: arn:aws:acm:us-east-1:123456789012:certificate/12345678-1234-1234-1234-123456789012
          sslPolicy: ELBSecurityPolicy-TLS-1-2-2017-01
          defaultActions:
            - type: forward
              targetGroupArn: ${web-target-group.targetGroupArn}
      
      targetGroups:
        - name: web-servers
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
            matcher:
              httpCode: 200
          targets:
            - id: 10.0.1.100
              port: 8080
            - id: 10.0.2.100
              port: 8080
        
        - name: api-servers
          port: 3000
          protocol: HTTP
          targetType: instance
          healthCheck:
            enabled: true
            path: /api/health
            intervalSeconds: 15
            timeoutSeconds: 10
      
      rules:
        - listenerPort: 443
          priority: 100
          conditions:
            - field: path-pattern
              values: ["/api/*"]
          actions:
            - type: forward
              targetGroupArn: ${api-target-group.targetGroupArn}
        
        - listenerPort: 443
          priority: 200
          conditions:
            - field: host-header
              values: ["admin.company.com"]
          actions:
            - type: forward
              targetGroupArn: ${admin-target-group.targetGroupArn}
      
      accessLogging:
        enabled: true
        bucket: company-alb-access-logs
        prefix: web-alb
      
      tags:
        load-balancer-type: application
        environment: production
        ssl-enabled: "true"
```

## Binding Examples

### ECS Service Integration

```yaml
components:
  - name: web-service
    type: ecs-fargate-service
    config:
      serviceName: WebApplication
      loadBalancers:
        - targetGroupArn: ${web-load-balancer.targetGroups.web-servers}
          containerName: web-app
          containerPort: 8080
    binds:
      - to: web-load-balancer
        capability: network:alb
        access: target-group
```

### Auto Scaling Group Integration

```yaml
components:
  - name: web-asg
    type: auto-scaling-group
    config:
      targetGroupArns:
        - ${web-load-balancer.targetGroups.web-servers}
    binds:
      - to: web-load-balancer
        capability: network:alb
        access: target-group
```

## Compliance Features

### Commercial
- Basic access logging
- Standard SSL/TLS configuration
- Cost-optimized settings

### FedRAMP Moderate
- Enhanced access logging with extended retention
- Strict SSL/TLS policies (TLS 1.2 minimum)
- WAF integration for threat protection
- Comprehensive security monitoring
- 1-year access log retention

### FedRAMP High
- Comprehensive access logging with detailed request tracking
- Strict SSL/TLS policies (TLS 1.2+ with specific cipher suites)
- Advanced WAF rules and threat detection
- Enhanced security monitoring and alerting
- 10-year access log retention
- Mandatory encryption in transit

## Advanced Configuration

### Multi-Domain SSL Configuration

```yaml
config:
  listeners:
    - port: 443
      protocol: HTTPS
      certificateArn: arn:aws:acm:us-east-1:123456789012:certificate/primary-cert
      additionalCertificateArns:
        - arn:aws:acm:us-east-1:123456789012:certificate/secondary-cert
        - arn:aws:acm:us-east-1:123456789012:certificate/wildcard-cert
      sslPolicy: ELBSecurityPolicy-TLS-1-2-Ext-2018-06
```

### Advanced Routing Rules

```yaml
config:
  rules:
    # API versioning
    - listenerPort: 443
      priority: 50
      conditions:
        - field: path-pattern
          values: ["/api/v1/*"]
        - field: http-header
          httpHeaderName: Accept
          values: ["application/json"]
      actions:
        - type: forward
          forwardConfig:
            targetGroups:
              - targetGroupArn: ${api-v1-targets.arn}
                weight: 80
              - targetGroupArn: ${api-v1-canary.arn}
                weight: 20
    
    # Geographic routing
    - listenerPort: 443
      priority: 75
      conditions:
        - field: source-ip
          values: ["203.0.113.0/24", "198.51.100.0/24"]
      actions:
        - type: forward
          targetGroupArn: ${premium-targets.arn}
    
    # Maintenance mode
    - listenerPort: 443
      priority: 10
      conditions:
        - field: query-string
          values: ["maintenance=true"]
      actions:
        - type: fixed-response
          fixedResponseConfig:
            statusCode: 503
            contentType: text/html
            messageBody: |
              <html><body><h1>Maintenance Mode</h1><p>Service temporarily unavailable</p></body></html>
```

### Sticky Sessions Configuration

```yaml
config:
  targetGroups:
    - name: stateful-app
      stickiness:
        enabled: true
        type: lb_cookie
        durationSeconds: 86400
      attributes:
        stickiness.enabled: true
        stickiness.type: lb_cookie
        stickiness.lb_cookie.duration_seconds: 86400
```

## Monitoring and Observability

The component automatically configures:

- **CloudWatch Metrics**: Request count, latency, error rates, target health
- **Access Logs**: Detailed request/response logging to S3
- **CloudWatch Alarms**: Target health, response time, and error rate monitoring
- **Target Group Health**: Continuous health checking and reporting
- **Custom Metrics**: Application-specific performance indicators

### Monitoring Levels

- **Basic**: Standard ALB metrics and basic health checking
- **Enhanced**: Detailed access logs + advanced metrics + target group analytics
- **Comprehensive**: Enhanced + security monitoring + performance optimization + compliance reporting

## Security Features

### SSL/TLS Configuration
- Modern TLS policies with cipher suite control
- Certificate management with ACM integration
- Perfect Forward Secrecy support
- HSTS header configuration

### Network Security
- Security group integration for traffic control
- VPC endpoint support for private access
- Source IP filtering and geographic restrictions
- Integration with AWS WAF for application-layer protection

### Access Control
- Resource-based policies for cross-account access
- Integration with AWS IAM for administrative access
- Request/response header manipulation
- Request body inspection and filtering

## Health Check Configuration

### Advanced Health Checks

```yaml
config:
  targetGroups:
    - name: web-app
      healthCheck:
        enabled: true
        path: /health/detailed
        protocol: HTTP
        port: traffic-port
        intervalSeconds: 15
        timeoutSeconds: 5
        healthyThresholdCount: 2
        unhealthyThresholdCount: 3
        matcher:
          httpCode: "200,204"
        
        # Advanced health check attributes
        attributes:
          deregistration_delay.timeout_seconds: 60
          slow_start.duration_seconds: 120
          load_balancing.algorithm.type: least_outstanding_requests
```

### Custom Health Check Endpoints

```javascript
// Express.js health check endpoint example
app.get('/health/detailed', (req, res) => {
    const healthCheck = {
        timestamp: new Date().toISOString(),
        status: 'healthy',
        version: process.env.APP_VERSION,
        checks: {}
    };
    
    // Database connectivity check
    try {
        // Check database connection
        healthCheck.checks.database = 'healthy';
    } catch (error) {
        healthCheck.checks.database = 'unhealthy';
        healthCheck.status = 'unhealthy';
    }
    
    // External service check
    try {
        // Check external dependencies
        healthCheck.checks.external_api = 'healthy';
    } catch (error) {
        healthCheck.checks.external_api = 'unhealthy';
        healthCheck.status = 'degraded';
    }
    
    const statusCode = healthCheck.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(healthCheck);
});
```

## Load Balancing Algorithms

### Algorithm Configuration

```yaml
config:
  targetGroups:
    - name: round-robin-targets
      attributes:
        load_balancing.algorithm.type: round_robin
    
    - name: least-connections-targets
      attributes:
        load_balancing.algorithm.type: least_outstanding_requests
        
    - name: weighted-targets
      # Use weighted routing rules instead of target group algorithms
      # for more advanced traffic distribution
```

### Blue-Green Deployments

```yaml
config:
  rules:
    - listenerPort: 443
      priority: 100
      conditions:
        - field: http-header
          httpHeaderName: X-Deployment-Group
          values: ["blue"]
      actions:
        - type: forward
          targetGroupArn: ${blue-deployment.arn}
    
    - listenerPort: 443
      priority: 200
      conditions:
        - field: http-header
          httpHeaderName: X-Deployment-Group
          values: ["green"]
      actions:
        - type: forward
          targetGroupArn: ${green-deployment.arn}
```

## Performance Optimization

### Connection Draining

```yaml
config:
  targetGroups:
    - name: optimized-targets
      attributes:
        deregistration_delay.timeout_seconds: 30
        slow_start.duration_seconds: 60
        load_balancing.algorithm.type: least_outstanding_requests
        target_group_health.dns_failover.minimum_healthy_targets.count: 1
```

### HTTP/2 Support

```yaml
config:
  attributes:
    routing.http2.enabled: true
    access_logs.s3.enabled: true
    idle_timeout.timeout_seconds: 60
    routing.http.drop_invalid_header_fields.enabled: true
```

## Troubleshooting

### Common Issues

1. **Target Health Check Failures**
   - Verify target group health check path is accessible
   - Check security groups allow health check traffic
   - Review health check timeout and interval settings

2. **SSL/TLS Certificate Issues**
   - Ensure certificate covers all domains in use
   - Verify certificate is in the same region as ALB
   - Check certificate validation status in ACM

3. **Routing Rule Conflicts**
   - Review rule priorities (lower numbers have higher priority)
   - Check for overlapping conditions
   - Verify default action configuration

### Debug Mode

Enable detailed logging and monitoring:

```yaml
config:
  accessLogging:
    enabled: true
    bucket: debug-alb-logs
    prefix: detailed-logs
  
  attributes:
    access_logs.s3.enabled: true
    routing.http.xff_client_port.enabled: true
    routing.http.preserve_host_header.enabled: true
  
  tags:
    debug: "true"
    detailed-monitoring: "enabled"
```

## Examples

See the [`examples/`](../../examples/) directory for complete service templates:

- `examples/web-application-alb/` - Web application with ALB
- `examples/microservices-routing/` - Microservices with advanced routing
- `examples/blue-green-deployment/` - Blue-green deployment setup

## API Reference

### ApplicationLoadBalancerComponent

Main component class that extends `Component`.

#### Methods

- `synth()`: Creates AWS resources (ALB, Target Groups, Listeners, Rules)
- `getCapabilities()`: Returns network:alb capability
- `getType()`: Returns 'application-load-balancer'

### Configuration Interfaces

- `ApplicationLoadBalancerConfig`: Main configuration interface
- `APPLICATION_LOAD_BALANCER_CONFIG_SCHEMA`: JSON schema for validation

## Development

To contribute to this component:

1. Make changes to the source code
2. Run tests: `npm test`
3. Build: `npm run build`
4. Follow the [Contributing Guide](../../../CONTRIBUTING.md)

## License

MIT License - see LICENSE file for details.