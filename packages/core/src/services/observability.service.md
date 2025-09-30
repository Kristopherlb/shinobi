# ObservabilityService

Enterprise-grade OpenTelemetry observability service that automatically configures comprehensive observability for all platform components according to the Platform OpenTelemetry Observability Standard v1.0.

## Overview

The `ObservabilityService` is a **Platform Service** that implements both the Service Injector Pattern and the Platform OpenTelemetry Observability Standard v1.0. It ensures every service is observable by default with no action required from developers.

### Key Features

- **OpenTelemetry Instrumentation**: Automatic OTel configuration for traces, metrics, and logs
- **Compliance-Aware Configuration**: Different endpoints, sampling rates, and retention per framework
- **CloudWatch Alarms**: Operational monitoring with compliance-appropriate thresholds  
- **Zero Developer Overhead**: Complete instrumentation applied automatically
- **Environment Variable Injection**: OTel configuration injected into all compute resources
- **Layer Management**: Automatic OTel layer injection for Lambda functions
- **Production-Ready**: Comprehensive error handling and structured logging

### Standards Compliance

✅ **Platform OpenTelemetry Observability Standard v1.0**
- Section 3.1: Central OTel Collector Configuration
- Section 3.2: Component-Level Automatic Instrumentation  
- Section 5.1: Lambda Function Requirements
- Section 5.2: RDS Database Requirements
- Section 5.4: EC2 Instance Requirements
- Section 6: Compliance Framework Integration
- Section 8: Security & Compliance Considerations

✅ **Platform Service Injector Standard v1.0**  
- IPlatformService interface implementation
- Single responsibility principle
- Centralized cross-cutting logic

## Supported Component Types

| Component Type | OpenTelemetry Instrumentation | CloudWatch Alarms | Compliance Features |
|---|---|---|---|
| `lambda-api` | ✅ OTel Layer, Env Vars, X-Ray | ErrorRate, Duration, Throttles | FedRAMP: 100% trace sampling |
| `lambda-worker` | ✅ OTel Layer, Env Vars, X-Ray | ErrorRate, Duration, DeadLetterQueue | FedRAMP: Enhanced DLQ monitoring |
| `ec2-instance` | ✅ OTel Collector Agent | StatusCheckFailed, SystemMetrics | FedRAMP: STIG compliance metrics |
| `rds-postgres` | ✅ Performance Insights, Log Export | CPUUtilization, ConnectionCount | FedRAMP: 7-year log retention |
| `sqs-queue` | ✅ Message Trace Propagation | QueueDepth, MessageAge | FedRAMP: Enhanced queue monitoring |
| `vpc` | N/A (Network layer) | NAT Gateway ErrorPortAllocation | FedRAMP High: Packet drop alarms |
| `application-load-balancer` | Planned | UnHealthyHostCount, ResponseTime | FedRAMP: Enhanced availability |
| `auto-scaling-group` | Planned | GroupCapacity, InstanceHealth | All frameworks: Auto-scaling metrics |
| `cloudfront-distribution` | Planned | OriginLatency, ErrorRate | All frameworks: CDN performance |
| `s3-bucket` | Planned | Access patterns, Request metrics | FedRAMP: Enhanced access monitoring |

## Architecture

### Service Application Flow

```mermaid
graph TD
    A[Component Synthesized] --> B[ObservabilityService.apply()]
    B --> C{Component Type Supported?}
    C -->|No| D[Skip Gracefully]  
    C -->|Yes| E[Build OTel Configuration]
    E --> F[Apply OpenTelemetry Instrumentation]
    F --> G[Inject Environment Variables]
    G --> H[Configure Lambda Layers]
    H --> I[Create CloudWatch Alarms]
    I --> J[Register Constructs]
    J --> K[Log Success with Metrics]
```

### OpenTelemetry Configuration

The service automatically configures OpenTelemetry with compliance-aware settings:

#### Core Configuration
```typescript
// Automatically injected environment variables
OTEL_EXPORTER_OTLP_ENDPOINT=https://otel-collector.{framework}.{region}.platform.local:4317
OTEL_EXPORTER_OTLP_HEADERS=authorization=Bearer {otel-token}
OTEL_SERVICE_NAME={component-name}
OTEL_RESOURCE_ATTRIBUTES=service.name={service},environment={env},compliance.framework={framework}
OTEL_TRACES_SAMPLER=traceidratio
OTEL_TRACES_SAMPLER_ARG={sampling-rate-based-on-compliance}
```

#### Compliance Framework Configuration

| Framework | Collector Endpoint | Trace Sampling | Metrics Interval | Log Retention |
|---|---|---|---|---|
| **Commercial** | `commercial.{region}.platform.local:4317` | 10% | 5 minutes | 1 year |
| **FedRAMP Moderate** | `fedramp-moderate.{region}.platform.local:4317` | 25% | 1 minute | 3 years |
| **FedRAMP High** | `fedramp-high.{region}.platform.local:4317` | 100% | 30 seconds | 7 years |

### Component-Specific Instrumentation

#### Lambda Functions
- **OTel Layer**: Automatically adds runtime-appropriate OTel layer
- **X-Ray Integration**: Enables distributed tracing with X-Ray
- **Environment Variables**: Full OTel configuration injected
- **IAM Permissions**: X-Ray trace permissions automatically added

#### EC2 Instances  
- **OTel Collector Agent**: Installed via user data scripts
- **System Metrics**: CPU, memory, disk, network collection
- **Log Forwarding**: Application logs with trace correlation
- **Configuration Management**: Agent config based on compliance framework

#### RDS Databases
- **Performance Insights**: Query-level visibility enabled
- **Enhanced Monitoring**: System metrics at compliance intervals
- **Log Exports**: PostgreSQL logs to CloudWatch
- **Retention**: Compliance-appropriate data retention

#### SQS Queues
- **Message Attributes**: Automatic trace propagation headers
- **Queue Metrics**: Depth, age, and throughput monitoring
- **Dead Letter Analytics**: DLQ processing and alerting

## Implementation Details

### Core Service Structure

```typescript
export class ObservabilityService implements IPlatformService {
  public readonly name = 'ObservabilityService';
  
  // Applied during Phase 2.5 of synthesis pipeline
  public apply(component: Component): void {
    // Component type detection and routing
  }
  
  // Component-specific monitoring methods
  private applyVpcObservability(component: Component): number
  private applyEc2InstanceObservability(component: Component): number
  private applyLambdaObservability(component: Component): number
  // ... etc
}
```

### VPC Monitoring Example

For VPC components, the service creates:

```typescript
// NAT Gateway Error Port Allocation Alarm
const errorPortAllocationAlarm = new cloudwatch.Alarm(component, 'NatGatewayErrorPortAllocation', {
  alarmName: `${serviceName}-nat-gateway-port-allocation-errors`,
  metric: new cloudwatch.Metric({
    namespace: 'AWS/NATGateway',
    metricName: 'ErrorPortAllocation',
    statistic: 'Sum',
    period: Duration.minutes(5)
  }),
  threshold: 1,
  evaluationPeriods: 2,
  comparisonOperator: ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD
});

// NAT Gateway Packets Drop Count Alarm (FedRAMP High only)
if (complianceFramework === 'fedramp-high') {
  const packetsDropAlarm = new cloudwatch.Alarm(/* ... */);
}
```

## Configuration

### Service Context

The `ObservabilityService` receives a `PlatformServiceContext` with:

```typescript
interface PlatformServiceContext {
  serviceName: string;              // Used in alarm names
  environment: string;              // dev/staging/prod
  complianceFramework: string;      // commercial/fedramp-moderate/fedramp-high  
  region: string;                   // AWS region
  serviceLabels?: Record<string, string>;
  serviceRegistry: PlatformServiceRegistry;
}
```

### Alarm Naming Convention

All alarms follow the pattern:
```
{serviceName}-{componentName}-{alarmType}
```

Examples:
- `my-service-vpc-nat-gateway-port-allocation-errors`
- `my-service-api-lambda-error-rate`
- `my-service-database-cpu-utilization`

## Usage

### Automatic Application

The service is automatically applied to all components when enabled:

```typescript
// In service.yml or configuration
{
  "service": "my-service",
  "complianceFramework": "fedramp-moderate", 
  "components": [
    {
      "name": "vpc",
      "type": "vpc",
      "config": { /* VPC config */ }
    }
    // NAT Gateway monitoring automatically applied
  ]
}
```

### Service Configuration

Enable/disable via `PlatformServiceRegistry`:

```typescript
const serviceRegistry = {
  observability: { 
    enabled: true,
    config: {
      // Optional: Custom alarm thresholds
      customThresholds: {
        'lambda-api': { errorRate: 0.01 },
        'rds-postgres': { cpuUtilization: 70 }
      }
    }
  }
};
```

## Extending the Service

### Adding Support for New Component Types

1. **Add Component Type Check**:
```typescript
const supportedTypes = [
  // ... existing types
  'your-new-component-type'
];
```

2. **Add Case to Switch Statement**:
```typescript
switch (componentType) {
  // ... existing cases
  case 'your-new-component-type':
    alarmsCreated = this.applyYourComponentObservability(component);
    break;
}
```

3. **Implement Component-Specific Logic**:
```typescript
private applyYourComponentObservability(component: Component): number {
  const yourResource = component.getConstruct('main');
  if (!yourResource) {
    console.warn('YourComponent has no main construct registered');
    return 0;
  }

  let alarmCount = 0;

  // Create component-specific alarms
  const yourAlarm = new cloudwatch.Alarm(component, 'YourComponentAlarm', {
    alarmName: `${this.context.serviceName}-${component.node.id}-your-metric`,
    metric: new cloudwatch.Metric({
      namespace: 'AWS/YourService',
      metricName: 'YourMetric',
      dimensionsMap: {
        YourResourceId: yourResource.resourceId
      }
    }),
    threshold: this.getThresholdForCompliance('your-metric'),
    evaluationPeriods: 2
  });
  alarmCount++;

  return alarmCount;
}
```

### Adding Compliance-Specific Monitoring

```typescript
private getThresholdForCompliance(metricType: string): number {
  const framework = this.context.complianceFramework;
  
  switch (framework) {
    case 'fedramp-high':
      return this.getFedrampHighThreshold(metricType);
    case 'fedramp-moderate':  
      return this.getFedrampModerateThreshold(metricType);
    default:
      return this.getCommercialThreshold(metricType);
  }
}
```

## Monitoring the Service Itself

### Service Metrics

The `ObservabilityService` logs structured metrics:

- **Execution Time**: Time to apply monitoring to each component
- **Alarms Created**: Count of alarms created per component type
- **Skip Count**: Components that don't require monitoring
- **Error Rate**: Failed applications (should be near zero)

### Service Health Indicators

Monitor these indicators for service health:

```typescript
// Example log output
{
  "service": "ObservabilityService",
  "componentType": "vpc", 
  "componentName": "my-vpc",
  "alarmsCreated": 2,
  "executionTimeMs": 45,
  "status": "success"
}
```

## Best Practices

### For Service Users
- **Trust the Automation**: Don't create duplicate CloudWatch alarms in components
- **Use Compliance Frameworks**: Leverage automatic threshold adjustment
- **Register Constructs Properly**: Ensure components register constructs with expected handles

### For Service Developers
- **Handle Missing Constructs**: Always check if required constructs exist
- **Graceful Degradation**: Skip unsupported types without failing
- **Idempotent Operations**: Service should be safe to run multiple times
- **Performance Awareness**: Keep alarm creation fast and efficient

### Alarm Naming
- Include service name for cost attribution
- Include component name for resource identification  
- Use descriptive alarm types
- Follow consistent naming patterns

## Testing

### Unit Testing

```typescript
describe('ObservabilityService', () => {
  let service: ObservabilityService;
  let mockVpcComponent: Component;

  beforeEach(() => {
    service = new ObservabilityService(mockContext);
    mockVpcComponent = createMockVpcComponent();
  });

  it('should create NAT Gateway alarms for VPC components', () => {
    service.apply(mockVpcComponent);
    
    // Verify alarms were created
    const template = Template.fromStack(stack);
    template.resourceCountIs('AWS::CloudWatch::Alarm', 2);
    
    template.hasResourceProperties('AWS::CloudWatch::Alarm', {
      AlarmName: Match.stringLikeRegexp('.*nat-gateway-port-allocation-errors')
    });
  });

  it('should adjust thresholds for FedRAMP High compliance', () => {
    const fedrampContext = { ...mockContext, complianceFramework: 'fedramp-high' };
    const fedrampService = new ObservabilityService(fedrampContext);
    
    fedrampService.apply(mockVpcComponent);
    
    // Verify additional alarms for high compliance
    const template = Template.fromStack(stack);
    template.resourceCountIs('AWS::CloudWatch::Alarm', 2); // Includes packets drop alarm
  });
});
```

### Integration Testing

Test within full synthesis pipeline:

```typescript
describe('ObservabilityService Integration', () => {
  it('should apply monitoring during synthesis', async () => {
    const manifest = {
      service: 'test-service',
      complianceFramework: 'fedramp-moderate',
      components: [{
        name: 'test-vpc',
        type: 'vpc'
      }]
    };

    const result = await resolverEngine.synthesize(manifest);
    
    // Verify monitoring was applied
    const template = result.app.synth().getStackByName('test-service-stack').template;
    expect(template.Resources).toHaveProperty('AWS::CloudWatch::Alarm');
  });
});
```

## Troubleshooting

### Common Issues

1. **No Alarms Created**
   - Check component type is in `supportedTypes` array
   - Verify component registered constructs with expected handles
   - Ensure service is enabled in `PlatformServiceRegistry`

2. **Alarms Created with Wrong Names**
   - Check `serviceName` in `PlatformServiceContext`
   - Verify component name (`component.node.id`)

3. **Missing Metrics Data**
   - Verify AWS service is creating the expected metrics
   - Check metric namespace and dimension names
   - Ensure metric period matches your monitoring needs

4. **Threshold Not Appropriate**
   - Review compliance framework setting
   - Check threshold calculation logic
   - Consider custom thresholds in service configuration

### Debug Information

Enable debug logging:

```bash
DEBUG=platform:observability npm run synth
```

This shows:
- Component processing order
- Alarm creation details
- Construct access patterns
- Execution timing

### Performance Monitoring

Monitor service performance:

```typescript
// Typical execution times (per component)
// VPC: 40-60ms (2 alarms)  
// Lambda: 30-50ms (3 alarms)
// RDS: 50-80ms (4 alarms)
```

If execution times exceed these ranges, investigate:
- CDK construct creation overhead
- AWS API calls during synthesis
- Complex threshold calculations

## Examples

### Complete VPC Monitoring

```yaml
# service.yml
service: my-service
complianceFramework: fedramp-high
components:
  - name: vpc
    type: vpc
    config:
      natGateways: 2
      flowLogs:
        enabled: true
```

Automatically creates:
- NAT Gateway Error Port Allocation alarm
- NAT Gateway Packets Drop Count alarm (FedRAMP High)
- Proper alarm naming and thresholds
- Integration with existing VPC constructs

### Custom Lambda Monitoring

```typescript
// The service automatically handles this
{
  "name": "api",
  "type": "lambda-api", 
  "config": {
    "handler": "src/api.handler"
  }
}

// Creates:
// - Error rate alarm (< 1% for commercial, < 0.5% for FedRAMP)
// - Duration alarm (based on timeout configuration)
// - Throttle alarm (immediate alerting)
```

For detailed implementation examples, see the [source code](./observability.service.ts).

## Contributing

When extending the `ObservabilityService`:

1. Follow the existing pattern for component-specific methods
2. Include comprehensive error handling
3. Add unit and integration tests  
4. Update this documentation
5. Consider compliance framework impacts
6. Test with real AWS resources when possible

For questions or support, contact the Platform Team or create an issue in the project repository.
