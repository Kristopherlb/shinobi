# @cdk-lib/observability-service

Centralized observability service for CDK-Lib platform components. Provides OpenTelemetry instrumentation and CloudWatch alarms across all component types following the Platform Configuration Standard.

## Features

- **Centralized Configuration**: All observability settings sourced from segregated `/config/{framework}.yml` files
- **Multi-Framework Support**: Commercial, FedRAMP Moderate, and FedRAMP High compliance frameworks
- **Handler Pattern**: Delegates component-specific logic to specialized handlers
- **OpenTelemetry Integration**: Automatic instrumentation with configurable sampling and export settings
- **CloudWatch Alarms**: Framework-appropriate monitoring thresholds and alerting
- **Template Substitution**: Dynamic environment variable generation with placeholders

## Installation

```bash
npm install @cdk-lib/observability-service
```

## Usage

```typescript
import { ObservabilityService } from '@cdk-lib/observability-service';
import { PlatformServiceContext } from '@cdk-lib/platform-contracts';

const context: PlatformServiceContext = {
  serviceName: 'my-service',
  environment: 'production',
  complianceFramework: 'commercial',
  region: 'us-east-1',
  logger: myLogger,
  serviceRegistry: myRegistry
};

const observabilityService = new ObservabilityService(context);

// Apply observability to any component
observabilityService.apply(myComponent);
```

## Configuration

The service automatically loads configuration from platform YAML files:

- `config/commercial.yml` - Commercial framework defaults
- `config/fedramp-moderate.yml` - FedRAMP Moderate compliance settings  
- `config/fedramp-high.yml` - FedRAMP High compliance settings

### Configuration Structure

```yaml
defaults:
  observability:
    traceSamplingRate: 0.1
    metricsInterval: 300
    logsRetentionDays: 365
    alarmThresholds:
      ec2:
        cpuUtilization: 85
        statusCheckFailed: 1
        networkIn: 100000000
      # ... other component thresholds
    otelEnvironmentTemplate:
      OTEL_EXPORTER_OTLP_ENDPOINT: 'https://otel-collector.{{ region }}.platform.local:4317'
      # ... other OTel environment variables
    ec2OtelUserDataTemplate: |
      #!/bin/bash
      # EC2 OpenTelemetry installation script
      # ... script content with template placeholders
```

## Supported Components

- **EC2 Instances**: CPU, status checks, network monitoring
- **Lambda Functions**: Error rates, duration, throttles
- **VPC**: NAT Gateway monitoring
- **Application Load Balancers**: Response time, HTTP errors, unhealthy targets
- **RDS Databases**: CPU, connections, storage space
- **SQS Queues**: Message age, queue depth, dead letter messages
- **ECS Services**: CPU/memory utilization, task counts

## API Reference

### ObservabilityService

Main service class that orchestrates observability across components.

#### Constructor

```typescript
constructor(context: PlatformServiceContext, taggingService?: ITaggingService)
```

#### Methods

- `apply(component: BaseComponent): void` - Apply observability to a component
- `getObservabilityConfig(): ObservabilityConfig` - Get current configuration
- `buildOTelEnvironmentVariables(componentName: string): Record<string, string>` - Build OTel env vars

## Compliance Frameworks

### Commercial
- 10% trace sampling
- 5-minute metric intervals
- 1-year log retention
- Standard alarm thresholds

### FedRAMP Moderate
- 25% trace sampling
- 1-minute metric intervals
- 3-year log retention
- Enhanced monitoring thresholds

### FedRAMP High
- 100% trace sampling
- 30-second metric intervals
- 7-year log retention
- Comprehensive monitoring with strict thresholds

## Testing

```bash
npm test
npm run test:coverage
```

## License

MIT
