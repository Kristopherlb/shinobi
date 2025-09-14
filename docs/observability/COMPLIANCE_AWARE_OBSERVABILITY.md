# Compliance-Aware Observability & Logging

This document describes the Shinobi platform's compliance-aware observability system that automatically configures telemetry, logging, and monitoring based on compliance frameworks (Commercial, FedRAMP Moderate, FedRAMP High).

## Overview

The observability system provides:

- **Automatic Instrumentation**: ADOT layers for Lambda, sidecar collectors for containers, agents for VMs
- **Compliance-Tier Configuration**: Different settings for Commercial, FedRAMP Moderate, and FedRAMP High
- **AWS X-Ray Integration**: Tracing with compliance-specific sampling rates
- **CloudWatch Logs**: Structured JSON logging with tier-appropriate retention
- **FedRAMP Security**: FIPS-compliant endpoints, STIG hardening, enhanced audit logging

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Observability System                        │
├─────────────────────────────────────────────────────────────────┤
│  Compliance Framework Detection                                │
│  ├─ Commercial: Standard monitoring                            │
│  ├─ FedRAMP Moderate: Enhanced logging & audit                 │
│  └─ FedRAMP High: FIPS compliance & STIG hardening             │
├─────────────────────────────────────────────────────────────────┤
│  Component Type Detection                                      │
│  ├─ Lambda → ADOT Layer + Environment Variables               │
│  ├─ Container → Sidecar Collectors + Volume Mounts           │
│  ├─ VM → Agent Installation + Systemd Services               │
│  ├─ API Gateway → X-Ray + CloudWatch Integration             │
│  └─ Database → Enhanced Monitoring + Performance Insights    │
├─────────────────────────────────────────────────────────────────┤
│  Binder Strategy Integration                                   │
│  └─ Automatic observability binding during component synthesis │
└─────────────────────────────────────────────────────────────────┘
```

## Compliance Tiers

### Commercial Tier

**Configuration:**
- Tracing: 10% sampling, 5-minute max duration
- Logging: 30-day retention, JSON format
- Metrics: 60-second collection interval
- Security: Standard encryption, no FIPS requirement

**Components:**
- Lambda: ADOT layer with standard configuration
- Container: OpenTelemetry Collector sidecar
- VM: CloudWatch Agent + OpenTelemetry Collector
- API: X-Ray tracing enabled
- Database: Standard monitoring

### FedRAMP Moderate Tier

**Configuration:**
- Tracing: 20% sampling, 10-minute max duration
- Logging: 90-day retention, enhanced audit logging
- Metrics: 30-second collection interval
- Security: Enhanced logging, audit trails

**Components:**
- Lambda: ADOT layer with enhanced configuration
- Container: OpenTelemetry Collector + X-Ray daemon sidecar
- VM: CloudWatch Agent + OpenTelemetry Collector + X-Ray daemon
- API: X-Ray tracing with enhanced sampling
- Database: Performance Insights + Enhanced Monitoring

### FedRAMP High Tier

**Configuration:**
- Tracing: 50% sampling, 15-minute max duration
- Logging: 7-year retention (2555 days), comprehensive audit
- Metrics: 15-second collection interval
- Security: FIPS-140-2 compliance, STIG hardening

**Components:**
- Lambda: FIPS-compliant ADOT layer (when available)
- Container: FIPS-compliant collectors + X-Ray daemon
- VM: FIPS-compliant agents + STIG-hardened configurations
- API: X-Ray tracing with maximum sampling
- Database: Full audit logging + Performance Insights

## Component Instrumentation

### Lambda Functions

**ADOT Layer Integration:**
```typescript
// Automatic layer attachment based on compliance tier
const adotLayerArn = ObservabilityConfigFactory.getAdotLayerArn(region, tier);
lambdaFunction.addLayers(adotLayerArn);
```

**Environment Variables:**
```bash
OTEL_SERVICE_NAME=user-service
OTEL_SERVICE_VERSION=1.0.0
OTEL_TRACES_EXPORTER=otlp
OTEL_METRICS_EXPORTER=otlp
OTEL_LOGS_EXPORTER=otlp
AWS_XRAY_TRACING_NAME=user-service
AWS_XRAY_DAEMON_ADDRESS=169.254.79.2:2000
LOG_LEVEL=INFO
COMPLIANCE_FRAMEWORK=commercial
```

**IAM Policies:**
- CloudWatch Logs: CreateLogGroup, CreateLogStream, PutLogEvents
- X-Ray: PutTraceSegments, PutTelemetryRecords
- CloudWatch Metrics: PutMetricData

### Container Services (ECS/Fargate)

**Sidecar Configuration:**
```yaml
# OpenTelemetry Collector Sidecar
sidecars:
  - name: otel-collector
    image: otel/opentelemetry-collector-contrib:0.88.0
    ports:
      - containerPort: 4317
        protocol: TCP
      - containerPort: 4318
        protocol: TCP
    env:
      - name: OTEL_CONFIG
        value: /etc/otel-collector/config.yaml
      - name: AWS_REGION
        value: us-east-1
    volumeMounts:
      - name: otel-config
        mountPath: /etc/otel-collector
```

**X-Ray Daemon (FedRAMP):**
```yaml
# X-Ray Daemon Sidecar for FedRAMP environments
sidecars:
  - name: xray-daemon
    image: amazon/aws-xray-daemon:latest
    ports:
      - containerPort: 2000
        protocol: UDP
      - containerPort: 2000
        protocol: TCP
    env:
      - name: AWS_REGION
        value: us-east-1
      - name: AWS_XRAY_DAEMON_ADDRESS
        value: 0.0.0.0:2000
```

### Virtual Machines (EC2)

**Agent Installation Scripts:**

**CloudWatch Agent:**
```bash
#!/bin/bash
# Install CloudWatch Agent
wget https://s3.amazonaws.com/amazoncloudwatch-agent/amazon_linux/amd64/latest/amazon-cloudwatch-agent.rpm
sudo rpm -U ./amazon-cloudwatch-agent.rpm

# Configure and start service
sudo cp /tmp/amazon-cloudwatch-agent.json /opt/aws/amazon-cloudwatch-agent/etc/
sudo systemctl start amazon-cloudwatch-agent
sudo systemctl enable amazon-cloudwatch-agent
```

**OpenTelemetry Collector:**
```bash
#!/bin/bash
# Install OpenTelemetry Collector
wget https://github.com/open-telemetry/opentelemetry-collector-contrib/releases/download/v0.88.0/otelcol-contrib_0.88.0_linux_amd64.deb
sudo dpkg -i otelcol-contrib_0.88.0_linux_amd64.deb

# Configure and start service
sudo cp /tmp/otel-collector-config.yaml /etc/otelcol-contrib/config.yaml
sudo systemctl start otel-collector
sudo systemctl enable otel-collector
```

**Systemd Services:**
```ini
# /etc/systemd/system/otel-collector.service
[Unit]
Description=OpenTelemetry Collector
After=network.target

[Service]
Type=simple
User=otel
Group=otel
ExecStart=/usr/local/bin/otelcol-contrib --config=/etc/otelcol-contrib/config.yaml
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

## Integration with Binder Strategy System

The observability system integrates seamlessly with the existing binder strategy system:

```typescript
// Automatic observability binding during component synthesis
const registry = new EnhancedBinderRegistry(logger);
const observabilityStrategy = new ObservabilityBinderStrategy('fedramp-moderate');

// Components automatically get observability instrumentation
const bindingResult = await registry.bind({
  source: lambdaComponent,
  target: lambdaComponent,
  directive: { capability: 'db:postgres', access: 'read' },
  environment: 'prod',
  complianceFramework: 'fedramp-moderate'
});
```

## Configuration Examples

### Commercial Environment
```yaml
observability:
  framework: commercial
  tracing:
    enabled: true
    samplingRate: 0.1
    maxDuration: 300
  logging:
    enabled: true
    retentionDays: 30
    auditLogging: false
  metrics:
    enabled: true
    collectionInterval: 60
  security:
    fipsCompliant: false
    stigHardened: false
```

### FedRAMP Moderate Environment
```yaml
observability:
  framework: fedramp-moderate
  tracing:
    enabled: true
    samplingRate: 0.2
    maxDuration: 600
  logging:
    enabled: true
    retentionDays: 90
    auditLogging: true
    performanceLogging: true
  metrics:
    enabled: true
    collectionInterval: 30
  security:
    fipsCompliant: false
    stigHardened: false
    auditTrail: true
```

### FedRAMP High Environment
```yaml
observability:
  framework: fedramp-high
  tracing:
    enabled: true
    samplingRate: 0.5
    maxDuration: 900
  logging:
    enabled: true
    retentionDays: 2555  # 7 years
    auditLogging: true
    performanceLogging: true
  metrics:
    enabled: true
    collectionInterval: 15
  security:
    fipsCompliant: true
    stigHardened: true
    auditTrail: true
    accessLogging: true
```

## Validation and Compliance

### Configuration Validation
```typescript
// Validate observability configuration against compliance requirements
const violations = ObservabilityBinderStrategy.validateObservabilityConfig(config);

violations.forEach(violation => {
  console.log(`${violation.rule}: ${violation.description}`);
  console.log(`Remediation: ${violation.remediation}`);
});
```

### Common Validation Rules

**FedRAMP High Requirements:**
- FIPS-140-2 compliance required
- STIG hardening required
- 7-year log retention required
- Enhanced audit logging required

**FedRAMP Moderate Requirements:**
- Audit logging required
- 90-day log retention recommended
- Enhanced monitoring enabled

**General Requirements:**
- Encryption at rest required
- Encryption in transit required
- CloudWatch logging enabled

## Best Practices

### 1. Compliance-First Configuration
Always configure observability based on the highest compliance requirement in your environment.

### 2. Gradual Rollout
Start with Commercial tier and gradually move to FedRAMP tiers as needed.

### 3. Monitoring and Alerting
Set up CloudWatch alarms for:
- Failed log deliveries
- X-Ray trace errors
- Agent health checks
- Compliance violations

### 4. Cost Optimization
- Use appropriate sampling rates for your compliance tier
- Set log retention periods based on requirements
- Monitor CloudWatch costs regularly

### 5. Security Considerations
- Use VPC endpoints for FedRAMP environments
- Implement least-privilege IAM policies
- Encrypt all observability data
- Regular security audits

## Troubleshooting

### Common Issues

**Lambda ADOT Layer Not Found:**
```bash
# Check if ADOT layer is available in your region
aws lambda list-layers --region us-east-1 --query 'Layers[?contains(LayerName, `aws-otel-nodejs`)]'
```

**Container Sidecar Not Starting:**
```bash
# Check sidecar logs
kubectl logs deployment/user-service -c otel-collector
```

**VM Agent Installation Failing:**
```bash
# Check agent installation logs
sudo journalctl -u amazon-cloudwatch-agent -f
sudo journalctl -u otel-collector -f
```

**X-Ray Tracing Not Working:**
```bash
# Verify X-Ray daemon is running
sudo systemctl status xray
# Check X-Ray console for traces
```

### Debug Mode
Enable debug logging by setting environment variables:
```bash
export OTEL_LOG_LEVEL=debug
export AWS_XRAY_DEBUG_MODE=true
export CW_LOGS_DEBUG=true
```

## Migration Guide

### From Manual Configuration
1. Remove manual observability configuration
2. Update component definitions to use compliance framework
3. Run observability binding during synthesis
4. Validate configuration and test

### Between Compliance Tiers
1. Update compliance framework setting
2. Re-synthesize components
3. Verify new configuration
4. Update monitoring and alerting

## API Reference

### ObservabilityConfigFactory
```typescript
// Create configuration for compliance framework
const config = ObservabilityConfigFactory.createConfig('fedramp-moderate');

// Get ADOT layer ARN for region and tier
const layerArn = ObservabilityConfigFactory.getAdotLayerArn('us-east-1', 'fedramp-high');

// Check compliance requirements
const isFipsRequired = ObservabilityConfigFactory.isFipsRequired('fedramp-high');
const isStigRequired = ObservabilityConfigFactory.isStigRequired('fedramp-high');
```

### BaseComponentObservability
```typescript
// Configure observability for component
const observability = new BaseComponentObservability('fedramp-moderate');
const result = await observability.configureObservability({
  componentName: 'user-service',
  componentType: 'lambda-api',
  environment: 'prod',
  region: 'us-east-1',
  complianceFramework: 'fedramp-moderate',
  construct: lambdaConstruct
});
```

### ObservabilityBinderStrategy
```typescript
// Validate configuration
const violations = ObservabilityBinderStrategy.validateObservabilityConfig(config);

// Get recommendations
const recommendations = ObservabilityBinderStrategy.getObservabilityRecommendations(config);

// Check if observability is required
const isRequired = ObservabilityBinderStrategy.isObservabilityRequired('lambda-api');
```

## Examples

See `src/platform/contracts/observability/observability-example.ts` for comprehensive examples showing:
- Commercial environment setup
- FedRAMP Moderate configuration
- FedRAMP High security requirements
- Cross-component observability
- Integration with binder strategy system
