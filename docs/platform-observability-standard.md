# Platform OpenTelemetry Observability Standard

**Version:** 1.0  
**Status:** Published  
**Last Updated:** September 7, 2025

## 1. Overview & Purpose

This document defines the official standard for observability for all services provisioned by the platform. To ensure consistent, end-to-end visibility across our entire software ecosystem, all compute components MUST be instrumented to emit telemetry data (traces, metrics, and logs) conforming to the OpenTelemetry (OTel) standard.

The purpose of this standard is to:

- **Ensure every service is observable by default**, with no action required from the developer.
- **Standardize the format and destination** of telemetry data across all applications.
- **Provide a foundation for advanced observability**, AIOps, and automated incident response.
- **Satisfy the stringent audit and monitoring requirements** of compliance frameworks like FedRAMP.

## 2. Guiding Principles

### **Observability is Not Optional**
Instrumentation is a non-negotiable, built-in feature of the platform's core compute components. It cannot be disabled.

### **Centralized Configuration**
The destination for all telemetry data (the OTel Collector endpoint) is managed centrally by the platform, not by individual services.

### **Seamless Developer Experience**
The platform is responsible for the "how" of instrumentation (installing agents, configuring endpoints). The application developer's only responsibility is to use an OTel-compliant SDK within their application code to generate telemetry.

## 3. Architectural Implementation

The platform implements this standard through a combination of centralized configuration and automated, component-level instrumentation.

### 3.1. Central OTel Collector Endpoint Configuration

The endpoint for the OTel Collector is a foundational piece of each environment's configuration.

**Environment Variables (Set by Platform):**
```bash
OTEL_EXPORTER_OTLP_ENDPOINT=https://otel-collector.{environment}.{region}.platform.local:4317
OTEL_EXPORTER_OTLP_HEADERS="authorization=Bearer ${OTEL_AUTH_TOKEN}"
OTEL_SERVICE_NAME=${SERVICE_NAME}
OTEL_SERVICE_VERSION=${SERVICE_VERSION}
OTEL_RESOURCE_ATTRIBUTES="environment=${ENVIRONMENT},region=${REGION},compliance.framework=${COMPLIANCE_FRAMEWORK}"
```

**Per-Environment Endpoints:**
- **Commercial:** `https://otel-collector.commercial.us-west-2.platform.local:4317`
- **FedRAMP Moderate:** `https://otel-collector.fedramp-moderate.us-gov-west-1.platform.local:4317`
- **FedRAMP High:** `https://otel-collector.fedramp-high.us-gov-east-1.platform.local:4317`

### 3.2. Component-Level Automatic Instrumentation

Each platform component automatically configures OpenTelemetry instrumentation based on the compute type:

#### **Lambda Functions**
- **Runtime Layer:** Automatic OTel layer injection based on runtime
- **Environment Variables:** Pre-configured OTEL_* variables
- **Traces:** HTTP requests, database calls, external API calls
- **Metrics:** Invocation count, duration, memory usage, cold starts
- **Logs:** Structured JSON logs with trace correlation

#### **EC2 Instances & Auto Scaling Groups**
- **Agent Installation:** OTel Collector agent via user data scripts
- **System Metrics:** CPU, memory, disk, network utilization
- **Application Traces:** HTTP server instrumentation
- **Infrastructure Logs:** System logs, application logs, security logs

#### **RDS Databases**
- **Performance Insights:** Automatic query performance tracking
- **CloudWatch Integration:** Database metrics export to OTel format
- **Slow Query Logs:** Structured slow query telemetry
- **Connection Metrics:** Pool size, active connections, wait times

#### **SQS Queues**
- **Message Tracing:** Automatic trace propagation through queue messages
- **Queue Metrics:** Message count, age, visibility timeout violations
- **Dead Letter Analytics:** DLQ message analysis and alerting

## 4. Telemetry Data Specifications

### 4.1. Traces

**Mandatory Trace Attributes:**
```json
{
  "service.name": "user-service",
  "service.version": "1.2.3",
  "deployment.environment": "production",
  "cloud.provider": "aws",
  "cloud.region": "us-west-2",
  "compliance.framework": "fedramp-moderate"
}
```

**Component-Specific Span Names:**
- **Lambda:** `aws.lambda.invoke`, `http.handler.{method}`, `db.query.{table}`
- **RDS:** `db.connection.acquire`, `db.query.execute`, `db.transaction.commit`
- **SQS:** `aws.sqs.send`, `aws.sqs.receive`, `aws.sqs.delete`
- **API Gateway:** `http.request`, `auth.validate`, `rate.limit.check`

### 4.2. Metrics

**Standardized Metric Names:**
```yaml
# Application Performance
- application.request.duration_seconds
- application.request.count_total
- application.error.count_total
- application.dependency.response_time_seconds

# Infrastructure Health
- system.cpu.utilization_percent
- system.memory.utilization_percent
- system.disk.io.operations_per_second
- system.network.bytes_total

# Business Logic
- business.transaction.count_total
- business.user.session.duration_seconds
- business.feature.usage.count_total
```

**Compliance-Required Metrics:**
- **FedRAMP Moderate:** Security events, access patterns, data processing volumes
- **FedRAMP High:** STIG compliance checks, audit trail completeness, encryption status

### 4.3. Logs

**Structured Log Format:**
```json
{
  "timestamp": "2025-09-07T10:30:00.000Z",
  "level": "INFO",
  "message": "User authentication successful",
  "traceId": "abc123def456",
  "spanId": "789ghi012jkl",
  "service": {
    "name": "auth-service",
    "version": "2.1.0"
  },
  "environment": "production",
  "compliance": {
    "framework": "fedramp-high",
    "classification": "cui",
    "retention_years": 7
  },
  "context": {
    "userId": "user_12345",
    "sessionId": "session_67890",
    "requestId": "req_abcdef"
  }
}
```

## 5. Implementation Requirements by Component

### 5.1. LambdaApiComponent Requirements

**Automatic Instrumentation:**
- OTel Lambda layer injection for Node.js, Python, Java runtimes
- Environment variables for collector endpoint and service identification
- X-Ray tracing integration for distributed trace collection
- CloudWatch Logs structured JSON format with trace correlation

**Code Pattern:**
```typescript
// Platform automatically configures these environment variables:
// OTEL_EXPORTER_OTLP_ENDPOINT
// OTEL_SERVICE_NAME
// OTEL_RESOURCE_ATTRIBUTES
// _X_AMZN_TRACE_ID (for X-Ray integration)

this.lambdaFunction.addEnvironment('OTEL_INSTRUMENTATION_AWS_LAMBDA_ENABLED', 'true');
this.lambdaFunction.addEnvironment('OTEL_PROPAGATORS', 'tracecontext,baggage,xray');
this.lambdaFunction.addEnvironment('OTEL_INSTRUMENTATION_AWS_LAMBDA_FLUSH_TIMEOUT', '30000');
```

### 5.2. RdsPostgresComponent Requirements

**Database Observability:**
- Performance Insights enabled for query-level visibility
- Enhanced monitoring for system metrics collection
- PostgreSQL log collection with slow query analysis
- Connection pool metrics and deadlock detection

**Implementation:**
```typescript
// Enable Performance Insights
performanceInsightsEnabled: true,
performanceInsightsRetentionPeriod: this.getPerformanceInsightsRetentionDays(),

// Configure enhanced monitoring
monitoringInterval: 60, // seconds
enablePerformanceInsights: true,
cloudwatchLogsExports: ['postgresql']
```

### 5.3. SqsQueueComponent Requirements

**Queue Telemetry:**
- Message tracing with automatic trace propagation
- Queue depth and processing time metrics
- Dead letter queue analytics and alerting
- Consumer lag and throughput monitoring

**Message Attributes:**
```typescript
// Automatic trace propagation headers
messageAttributes: {
  'traceparent': { DataType: 'String', StringValue: traceParent },
  'tracestate': { DataType: 'String', StringValue: traceState },
  'otel.service.name': { DataType: 'String', StringValue: serviceName }
}
```

### 5.4. Ec2InstanceComponent & AutoScalingGroupComponent Requirements

**Infrastructure Monitoring:**
- OTel Collector agent installation via user data
- System metrics collection (CPU, memory, disk, network)
- Application log forwarding with trace correlation
- Security event monitoring and compliance reporting

**Agent Configuration:**
```yaml
# /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json
{
  "agent": {
    "metrics_collection_interval": 60
  },
  "metrics": {
    "namespace": "Platform/Infrastructure",
    "metrics_collected": {
      "cpu": { "measurement": ["cpu_usage_idle", "cpu_usage_iowait"] },
      "disk": { "measurement": ["used_percent"], "resources": ["*"] },
      "mem": { "measurement": ["mem_used_percent"] }
    }
  }
}
```

## 6. Compliance Framework Integration

### 6.1. Commercial Cloud
- **Retention:** 30 days for traces, 90 days for metrics, 1 year for logs
- **Sampling:** 10% trace sampling for cost optimization
- **Endpoints:** Public OTel collector endpoints with standard TLS

### 6.2. FedRAMP Moderate
- **Retention:** 90 days for traces, 1 year for metrics, 3 years for logs
- **Sampling:** 25% trace sampling for enhanced monitoring
- **Encryption:** All telemetry data encrypted in transit and at rest
- **Access Controls:** RBAC with multi-factor authentication required

### 6.3. FedRAMP High
- **Retention:** 1 year for traces, 3 years for metrics, 7 years for logs
- **Sampling:** 100% trace collection for complete audit trail
- **STIG Compliance:** All telemetry collection meets STIG requirements
- **Air-Gapped:** Dedicated OTel infrastructure in government cloud regions

## 7. Implementation Patterns

### 7.1. Base Component Integration

The base `Component` class provides standardized observability utilities:

```typescript
abstract class Component extends Construct {
  
  /**
   * Apply standard OpenTelemetry configuration to any compute resource
   */
  protected configureObservability(resource: IConstruct, options: ObservabilityOptions = {}): void {
    const config = this.buildObservabilityConfig(options);
    this.applyObservabilityConfig(resource, config);
  }

  /**
   * Build observability configuration based on compliance framework
   */
  private buildObservabilityConfig(options: ObservabilityOptions): ObservabilityConfig {
    return {
      collectorEndpoint: this.getCollectorEndpoint(),
      serviceName: options.serviceName || this.spec.name,
      serviceVersion: this.context.serviceVersion,
      environment: this.context.environment,
      region: this.context.region,
      complianceFramework: this.context.complianceFramework,
      tracesSampling: this.getTracesSamplingRate(),
      metricsInterval: this.getMetricsCollectionInterval(),
      logsRetention: this.getLogsRetentionPeriod(),
      ...options
    };
  }
}
```

### 7.2. Environment Variable Injection

All components automatically inject required OTel environment variables:

```typescript
const otelEnvVars = {
  'OTEL_EXPORTER_OTLP_ENDPOINT': this.getCollectorEndpoint(),
  'OTEL_EXPORTER_OTLP_HEADERS': `authorization=Bearer ${this.getOtelAuthToken()}`,
  'OTEL_SERVICE_NAME': this.spec.name,
  'OTEL_SERVICE_VERSION': this.context.serviceVersion,
  'OTEL_RESOURCE_ATTRIBUTES': this.buildResourceAttributes(),
  'OTEL_TRACES_SAMPLER': this.getTracesSampler(),
  'OTEL_METRICS_EXPORTER': 'otlp',
  'OTEL_LOGS_EXPORTER': 'otlp'
};
```

## 8. Security & Compliance Considerations

### 8.1. Data Classification Handling
- **CUI (Controlled Unclassified Information):** Automatic redaction in telemetry data
- **PII Detection:** Pattern-based PII scrubbing in logs and traces
- **Encryption:** All telemetry encrypted with customer-managed KMS keys in FedRAMP

### 8.2. Audit Requirements
- **Immutable Logs:** Write-only log storage with tamper detection
- **Trace Integrity:** Cryptographic signatures on critical trace spans
- **Compliance Reporting:** Automated compliance dashboards and alerting

### 8.3. Access Controls
- **Service Authentication:** Mutual TLS between services and OTel collector
- **Data Access:** Role-based access controls for telemetry data consumption
- **API Security:** Token-based authentication for observability APIs

## 9. Monitoring & Alerting Standards

### 9.1. Critical System Alerts
- **Service Health:** Error rate > 1%, latency p99 > 5 seconds
- **Infrastructure:** CPU > 80%, memory > 85%, disk > 90%
- **Security:** Failed authentication attempts, privilege escalation events
- **Compliance:** Missing audit logs, encryption key rotation failures

### 9.2. Business Logic Alerts
- **Transaction Failures:** Payment processing errors, order failures
- **User Experience:** Slow page loads, feature adoption drops
- **Capacity Planning:** Queue depth warnings, database connection exhaustion

## 10. Implementation Verification

### 10.1. Automatic Compliance Checks
Each component must pass the following observability compliance checks:

1. **Telemetry Emission:** All three signal types (traces, metrics, logs) are being emitted
2. **Endpoint Configuration:** OTel collector endpoint is properly configured
3. **Resource Attributes:** All mandatory resource attributes are present
4. **Retention Compliance:** Data retention matches compliance framework requirements
5. **Sampling Configuration:** Trace sampling rates meet framework requirements

### 10.2. Testing Requirements
- **Synthetic Monitoring:** Automated tests verify end-to-end observability pipeline
- **Chaos Engineering:** Observability system resilience under failure conditions
- **Performance Testing:** Telemetry overhead impact on application performance

---

## Conclusion

The Platform OpenTelemetry Observability Standard ensures that every service deployed on our platform is automatically observable, compliant, and ready for production monitoring. By embedding observability as a core platform capability, we eliminate the operational burden on development teams while maintaining the highest standards of system visibility and compliance.

This standard is **mandatory** for all platform components and **cannot be disabled** - observability is a fundamental platform service, not an optional feature.