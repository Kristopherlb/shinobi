# @cdk-lib/observability-handlers

Component-specific observability handlers for CDK-Lib platform. Provides OpenTelemetry instrumentation and CloudWatch alarms for individual component types following the Platform Configuration Standard.

## Features

- **Component-Specific Logic**: Specialized handlers for each AWS service type
- **Config-Driven**: All thresholds and settings sourced from centralized configuration
- **OpenTelemetry Integration**: Automatic instrumentation with component-specific optimizations
- **CloudWatch Alarms**: Framework-appropriate monitoring and alerting
- **Standardized Interface**: Consistent handler pattern across all component types

## Installation

```bash
npm install @cdk-lib/observability-handlers
```

## Usage

```typescript
import { 
  Ec2ObservabilityHandler, 
  LambdaObservabilityHandler,
  ObservabilityConfig 
} from '@cdk-lib/observability-handlers';

const config: ObservabilityConfig = {
  traceSamplingRate: 0.1,
  metricsInterval: 300,
  logsRetentionDays: 365,
  alarmThresholds: {
    ec2: { cpuUtilization: 85, statusCheckFailed: 1, networkIn: 100000000 },
    lambda: { errorRate: 5, duration: 5000, throttles: 10 },
    // ... other thresholds
  },
  otelEnvironmentTemplate: { /* ... */ },
  ec2OtelUserDataTemplate: '#!/bin/bash\n...'
};

const ec2Handler = new Ec2ObservabilityHandler(context, taggingService);
const result = ec2Handler.apply(component, config);
```

## Available Handlers

### EC2 Observability Handler
- **Component Type**: `ec2-instance`
- **Features**: CPU utilization, status checks, network monitoring
- **OTel Integration**: UserData script generation with collector installation

### Lambda Observability Handler  
- **Component Type**: `lambda`
- **Features**: Error rates, duration monitoring, throttles
- **OTel Integration**: Environment variable injection

### VPC Observability Handler
- **Component Type**: `vpc`
- **Features**: NAT Gateway packet drops, port allocation errors
- **OTel Integration**: Network-level monitoring

### Application Load Balancer Handler
- **Component Type**: `application-load-balancer`
- **Features**: Response time, HTTP 5xx errors, unhealthy targets
- **OTel Integration**: Load balancer metrics collection

### RDS Observability Handler
- **Component Type**: `rds-postgres`
- **Features**: CPU utilization, connection counts, storage space
- **OTel Integration**: Performance Insights configuration

### SQS Observability Handler
- **Component Type**: `sqs-queue`
- **Features**: Message age, queue depth, dead letter messages
- **OTel Integration**: Queue-level trace propagation

### ECS Observability Handler
- **Component Type**: `ecs`, `ecs-cluster`, `ecs-fargate-service`, `ecs-ec2-service`
- **Features**: CPU/memory utilization, task counts, service health
- **OTel Integration**: Container-level environment variables

## Handler Interface

All handlers implement the `IObservabilityHandler` interface:

```typescript
interface IObservabilityHandler {
  readonly supportedComponentType: string;
  apply(component: BaseComponent, config: ObservabilityConfig): ObservabilityHandlerResult;
}
```

### Handler Result

```typescript
interface ObservabilityHandlerResult {
  instrumentationApplied: boolean;
  alarmsCreated: number;
  executionTimeMs: number;
}
```

## Configuration

Handlers use the centralized `ObservabilityConfig` which includes:

- **Trace Sampling**: Framework-appropriate sampling rates
- **Metrics Intervals**: Collection frequency settings
- **Log Retention**: Compliance-driven retention periods
- **Alarm Thresholds**: Component-specific monitoring thresholds
- **OTel Templates**: Environment variable and UserData templates

## Handler Registry

Use the provided registry for easy handler lookup:

```typescript
import { OBSERVABILITY_HANDLERS } from '@cdk-lib/observability-handlers';

const HandlerClass = OBSERVABILITY_HANDLERS['ec2-instance'];
const handler = new HandlerClass(context, taggingService);
```

## Compliance Framework Support

Each handler adapts its behavior based on the compliance framework:

- **Commercial**: Standard monitoring with cost optimization
- **FedRAMP Moderate**: Enhanced monitoring with moderate thresholds
- **FedRAMP High**: Comprehensive monitoring with strict thresholds

## Testing

```bash
npm test
npm run test:coverage
```

## License

MIT
