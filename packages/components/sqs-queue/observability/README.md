# SQS Queue Component - OpenTelemetry Observability Setup

This document describes OpenTelemetry (OTel) observability configuration for SQS queue consumers and producers, following the Platform Observability Standard (OTel v1.0).

## Overview

The SQS Queue component provides observability through:
- **OpenTelemetry Instrumentation**: OTel SDK for message processing traces
- **ADOT Integration**: AWS Distro for OpenTelemetry for Lambda/ECS consumers
- **Trace Correlation**: Distributed tracing across message producers and consumers
- **Metrics Export**: OTel metrics for queue operations
- **Log Correlation**: Structured logs with trace_id/span_id correlation

## OpenTelemetry Configuration

### Required Environment Variables

All SQS message consumers (Lambda, ECS, EC2) must configure the following OTel environment variables:

```bash
# Core OTel Configuration
OTEL_SERVICE_NAME=my-service-sqs-consumer
OTEL_SERVICE_VERSION=1.0.0
OTEL_EXPORTER_OTLP_ENDPOINT=http://adot-collector:4317
OTEL_EXPORTER_OTLP_PROTOCOL=grpc

# Resource Attributes (no PII/secrets)
OTEL_RESOURCE_ATTRIBUTES=service.name=my-service-sqs-consumer,service.version=1.0.0,service.namespace=production,deployment.environment=prod,aws.region=us-east-1,component.type=sqs-consumer

# Propagators (required for trace correlation)
OTEL_PROPAGATORS=tracecontext,baggage

# Sampling (head sampling - tail sampling in collector)
OTEL_TRACES_SAMPLER=parentbased_traceidratio
OTEL_TRACES_SAMPLER_ARG=0.1

# HTTP Semantic Conventions (during migration)
OTEL_SEMCONV_STABILITY_OPT_IN=http/dup
```

### Lambda Consumer Configuration

For Lambda functions consuming SQS messages, use ADOT Lambda layer:

```typescript
// In Lambda component configuration
{
  observability: {
    otelEnabled: true,
    otelLayerArn: "arn:aws:lambda:us-east-1:901920570463:layer:aws-otel-nodejs-amd64-ver-1-32-0:1",
    otelResourceAttributes: {
      "component.type": "sqs-consumer",
      "messaging.system": "sqs",
      "messaging.destination": "my-queue"
    }
  }
}
```

**Lambda-Specific Environment Variables:**
```bash
# ADOT Lambda wrapper (auto-instrumentation)
AWS_LAMBDA_EXEC_WRAPPER=/opt/otel-handler

# OTel configuration
OTEL_EXPORTER_OTLP_ENDPOINT=http://adot-collector:4317
OTEL_TRACES_EXPORTER=otlp
OTEL_METRICS_EXPORTER=otlp
OTEL_LOGS_EXPORTER=otlp
```

### ECS Consumer Configuration

For ECS tasks consuming SQS messages, use ADOT sidecar:

```typescript
// In ECS component configuration
{
  observability: {
    tracing: {
      adotSidecar: true,
      collectorEndpoint: "http://adot-collector:4317"
    },
    otelResourceAttributes: {
      "component.type": "sqs-consumer",
      "messaging.system": "sqs",
      "messaging.destination": "my-queue"
    }
  }
}
```

**ECS Task Definition Environment Variables:**
```bash
OTEL_SERVICE_NAME=my-service-sqs-consumer
OTEL_EXPORTER_OTLP_ENDPOINT=http://adot-collector:4317
OTEL_EXPORTER_OTLP_PROTOCOL=grpc
OTEL_PROPAGATORS=tracecontext,baggage
OTEL_TRACES_SAMPLER=parentbased_traceidratio
OTEL_TRACES_SAMPLER_ARG=0.1
```

### EC2 Consumer Configuration

For EC2 instances consuming SQS messages, configure OTel in user data:

```bash
# Configure OpenTelemetry observability
export OTEL_SERVICE_NAME=my-service-sqs-consumer
export OTEL_SERVICE_VERSION=1.0.0
export OTEL_EXPORTER_OTLP_ENDPOINT=https://otel-collector.production.us-east-1.platform.local:4317
export OTEL_EXPORTER_OTLP_PROTOCOL=grpc
export OTEL_RESOURCE_ATTRIBUTES="service.name=my-service-sqs-consumer,service.version=1.0.0,deployment.environment=production,aws.region=us-east-1,component.type=sqs-consumer"
export OTEL_PROPAGATORS=tracecontext,baggage
export OTEL_TRACES_SAMPLER=parentbased_traceidratio
export OTEL_TRACES_SAMPLER_ARG=0.1
```

## Trace Correlation for SQS Messages

### Message Producer (Sending to Queue)

When sending messages to SQS, inject trace context into message attributes:

```typescript
import { context, propagation, trace } from '@opentelemetry/api';

async function sendMessage(queueUrl: string, messageBody: string) {
  const tracer = trace.getTracer('sqs-producer');
  const span = tracer.startSpan('sqs.send_message');
  
  try {
    // Inject trace context into message attributes
    const carrier: Record<string, string> = {};
    propagation.inject(context.active(), carrier);
    
    const messageAttributes = {
      'traceparent': {
        DataType: 'String',
        StringValue: carrier['traceparent'] || ''
      },
      'tracestate': {
        DataType: 'String',
        StringValue: carrier['tracestate'] || ''
      }
    };
    
    await sqs.sendMessage({
      QueueUrl: queueUrl,
      MessageBody: messageBody,
      MessageAttributes: messageAttributes
    }).promise();
    
    span.setAttributes({
      'messaging.system': 'sqs',
      'messaging.destination': queueUrl,
      'messaging.message_id': 'message-id',
      'messaging.message_payload_size_bytes': messageBody.length
    });
    
    span.setStatus({ code: SpanStatusCode.OK });
  } catch (error) {
    span.setStatus({ 
      code: SpanStatusCode.ERROR,
      message: error.message 
    });
    throw error;
  } finally {
    span.end();
  }
}
```

### Message Consumer (Processing from Queue)

When processing messages from SQS, extract trace context from message attributes:

```typescript
import { context, propagation, trace } from '@opentelemetry/api';

async function processMessage(record: SQSRecord) {
  // Extract trace context from message attributes
  const carrier: Record<string, string> = {};
  if (record.messageAttributes?.traceparent?.stringValue) {
    carrier['traceparent'] = record.messageAttributes.traceparent.stringValue;
  }
  if (record.messageAttributes?.tracestate?.stringValue) {
    carrier['tracestate'] = record.messageAttributes.tracestate.stringValue;
  }
  
  // Create context from extracted trace
  const parentContext = propagation.extract(context.active(), carrier);
  
  const tracer = trace.getTracer('sqs-consumer');
  return context.with(parentContext, async () => {
    const span = tracer.startSpan('sqs.process_message', {
      kind: SpanKind.CONSUMER
    });
    
    try {
      span.setAttributes({
        'messaging.system': 'sqs',
        'messaging.destination': record.eventSourceARN,
        'messaging.message_id': record.messageId,
        'messaging.operation': 'process',
        'messaging.message_payload_size_bytes': record.body.length
      });
      
      // Process message
      await processMessageBody(record.body);
      
      span.setStatus({ code: SpanStatusCode.OK });
    } catch (error) {
      span.setStatus({ 
        code: SpanStatusCode.ERROR,
        message: error.message 
      });
      throw error;
    } finally {
      span.end();
    }
  });
}
```

## Metrics Export

### SQS-Specific Metrics

Export custom metrics for SQS operations:

```typescript
import { metrics } from '@opentelemetry/api';

const meter = metrics.getMeter('sqs-queue', '1.0.0');

// Message processing metrics
const messagesProcessed = meter.createCounter('sqs.messages.processed', {
  description: 'Number of messages processed from SQS queue',
  unit: '1'
});

const messagesFailed = meter.createCounter('sqs.messages.failed', {
  description: 'Number of messages that failed processing',
  unit: '1'
});

const processingDuration = meter.createHistogram('sqs.message.processing.duration', {
  description: 'Duration of message processing',
  unit: 'ms'
});

// Usage in message handler
async function processMessage(record: SQSRecord) {
  const startTime = Date.now();
  
  try {
    await processMessageBody(record.body);
    messagesProcessed.add(1, {
      'queue.name': record.eventSourceARN,
      'status': 'success'
    });
  } catch (error) {
    messagesFailed.add(1, {
      'queue.name': record.eventSourceARN,
      'status': 'error',
      'error.type': error.constructor.name
    });
    throw error;
  } finally {
    const duration = Date.now() - startTime;
    processingDuration.record(duration, {
      'queue.name': record.eventSourceARN
    });
  }
}
```

## Log Correlation

### Structured Logs with Trace Correlation

Include trace_id and span_id in structured logs for correlation:

```typescript
import { context, trace } from '@opentelemetry/api';

function logWithTrace(level: string, message: string, data?: any) {
  const span = trace.getActiveSpan();
  const spanContext = span?.spanContext();
  
  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    logger: 'sqs-consumer',
    trace: {
      trace_id: spanContext?.traceId || '',
      span_id: spanContext?.spanId || '',
      sampled: spanContext?.traceFlags === 1
    },
    context: {
      action: 'message_processing',
      resource: 'sqs-queue',
      component: 'sqs-consumer'
    },
    data
  };
  
  console.log(JSON.stringify(logEntry));
}
```

## Collector Configuration

### OTel Collector Pipeline

The OTel collector must be configured to receive SQS-related telemetry:

```yaml
# otel-collector-config.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  memory_limiter:
    limit_percentage: 75
    check_interval: 1s
  
  batch:
    timeout: 1s
    send_batch_size: 1024
  
  tailsampling:
    policies:
      - name: error-policy
        type: status_code
        status_code:
          status_codes:
            - ERROR
      - name: latency-policy
        type: latency
        latency:
          threshold_ms: 5000
      - name: probabilistic-policy
        type: probabilistic
        probabilistic:
          sampling_percentage: 10

exporters:
  otlphttp/tempo:
    endpoint: https://tempo.production.platform.local:4318
    tls:
      insecure: false
  
  otlphttp/loki:
    endpoint: https://loki.production.platform.local:3100/otlp
    tls:
      insecure: false
  
  prometheusremotewrite:
    endpoint: https://mimir.production.platform.local/api/v1/push
    tls:
      insecure: false

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, batch, tailsampling]
      exporters: [otlphttp/tempo]
    
    metrics:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [prometheusremotewrite]
    
    logs:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [otlphttp/loki]
```

## Security & Transport

### TLS/mTLS Configuration

**REQUIRED**: All OTel endpoints must use TLS:

```yaml
# Collector TLS configuration
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
        tls:
          cert_file: /etc/otel-collector/certs/server.crt
          key_file: /etc/otel-collector/certs/server.key
          client_ca_file: /etc/otel-collector/certs/ca.crt
```

**PROHIBITED**: Never use `insecure: true` in production

### Authentication

Use authenticated transport for OTel endpoints:

```bash
# OTel exporter with authentication
OTEL_EXPORTER_OTLP_HEADERS=authorization=Bearer ${OTEL_AUTH_TOKEN}
```

## Compliance Framework Considerations

### Commercial
- Standard OTel configuration
- 10% sampling rate (parentbased_traceidratio with arg 0.1)
- Standard log retention (30 days)

### FedRAMP Moderate/High
- Enhanced trace sampling for audit trails
- Extended log retention (1095 days) when `highRiskEnvironment: true`
- Comprehensive trace coverage required
- All telemetry must use TLS/mTLS

## AWS Best Practices (from DevOps Knowledge Base)

Based on `Operational-Best-Practices-for-SQS.yaml` conformance pack:

### Required Metrics
- **Message Processing Rate**: Monitor `sqs.messages.processed` counter
- **Message Failure Rate**: Monitor `sqs.messages.failed` counter
- **Processing Duration**: Monitor `sqs.message.processing.duration` histogram
- **Queue Depth**: Use CloudWatch `ApproximateNumberOfMessagesVisible` (correlate with OTel traces)

### Recommended Alarms
- **High Message Failure Rate**: Alert when `sqs.messages.failed` exceeds threshold
- **Slow Processing**: Alert when `sqs.message.processing.duration` P99 exceeds SLA
- **Queue Depth Correlation**: Alert when queue depth increases while processing rate decreases

## Troubleshooting

### Missing Traces

**Symptoms:** No traces appearing in Tempo/Grafana

**Possible Causes:**
- OTel environment variables not set
- Collector endpoint unreachable
- Trace context not propagated in message attributes

**Actions:**
1. Verify OTel environment variables are set: `echo $OTEL_EXPORTER_OTLP_ENDPOINT`
2. Test collector connectivity: `curl http://adot-collector:4317`
3. Check message attributes for trace context
4. Verify OTel SDK is initialized before message processing

### Trace Correlation Broken

**Symptoms:** Producer and consumer traces not linked

**Possible Causes:**
- Trace context not injected into message attributes
- Trace context not extracted from message attributes
- Propagators not configured correctly

**Actions:**
1. Verify `OTEL_PROPAGATORS=tracecontext,baggage` is set
2. Check message attributes include `traceparent` and `tracestate`
3. Ensure trace context extraction happens before span creation

### High Memory Usage in Collector

**Symptoms:** Collector pods/containers using excessive memory

**Possible Causes:**
- Memory limiter not configured
- Batch processor timeout too high
- Too many traces being sampled

**Actions:**
1. Configure `memory_limiter` with appropriate `limit_percentage`
2. Reduce batch timeout or size
3. Adjust tail sampling policies
4. Set `GOMEMLIMIT` environment variable (~80% container memory)

## References

- **Platform Observability Standard**: `docs/platform-standards/platform-observability-standard.md`
- **Platform Observability Audit Rules**: `.cursor/audit/platform-observability.yaml`
- **DevOps Knowledge Base**: `.cursor/skills/devops-knowledge-base/references/OBSERVABILITY_RULES.md`
- **AWS SQS Best Practices**: `.cursor/skills/devops-knowledge-base/references/CONFORMANCE_PACK_MAPPING.md`
- **OpenTelemetry Documentation**: https://opentelemetry.io/docs/
- **ADOT Documentation**: https://aws-otel.github.io/docs/
