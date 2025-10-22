# Trace Context Propagation with EventBridge Rules

This guide explains how to propagate distributed trace context through EventBridge pattern-based rules to maintain end-to-end observability in event-driven architectures.

## Overview

Distributed tracing allows you to follow a request or transaction as it flows through multiple services. EventBridge rules can act as intermediaries in these flows, and proper trace context propagation ensures you don't lose visibility at EventBridge boundaries.

## Trace Context Standards

### W3C Trace Context

The W3C Trace Context standard defines HTTP headers for trace propagation:
- `traceparent`: Contains trace-id, parent-id, and trace-flags
- `tracestate`: Vendor-specific trace data

### AWS X-Ray

AWS X-Ray uses the `_X_AMZN_TRACE_ID` header format:
```
X-Amzn-Trace-Id: Root=1-5e8c3c7a-1234567890abcdef12345678;Parent=1234567890123456;Sampled=1
```

### OpenTelemetry

OpenTelemetry supports both W3C Trace Context and custom propagators.

## Propagation Patterns

### Pattern 1: Event Detail Injection

**Best for:** Custom events where you control the event structure.

**Implementation:**

1. **Publisher Side (Lambda with X-Ray):**
```typescript
import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';
import * as AWSXRay from 'aws-xray-sdk-core';

const eventbridge = AWSXRay.captureAWSv3Client(new EventBridgeClient({}));

export async function publishOrder(orderId: string, amount: number) {
  // Get current trace context from X-Ray
  const segment = AWSXRay.getSegment();
  const traceHeader = segment?.trace_id;
  
  // Extract trace components
  const match = traceHeader?.match(/Root=(1-[a-f0-9-]+);Parent=([a-f0-9]+);Sampled=([01])/);
  const traceId = match?.[1];
  const parentId = match?.[2];
  const sampled = match?.[3] === '1';
  
  // Publish event with trace context in detail
  await eventbridge.send(new PutEventsCommand({
    Entries: [{
      Source: 'com.myapp.orders',
      DetailType: 'Order Placed',
      Detail: JSON.stringify({
        orderId,
        amount,
        // Include trace context
        _trace: {
          traceId,
          parentId,
          sampled
        }
      }),
      EventBusName: 'default'
    }]
  }));
}
```

2. **EventBridge Rule Configuration:**
```yaml
components:
  - name: order-events
    type: eventbridge-rule-pattern
    config:
      eventPattern:
        source: ['com.myapp.orders']
        detail-type: ['Order Placed']
      # Input transformer passes trace context to targets
      input:
        type: transformer
        transformer:
          inputPathsMap:
            orderId: $.detail.orderId
            amount: $.detail.amount
            traceId: $.detail._trace.traceId
            parentId: $.detail._trace.parentId
            sampled: $.detail._trace.sampled
          inputTemplate: |
            {
              "orderId": "<orderId>",
              "amount": <amount>,
              "_trace": {
                "traceId": "<traceId>",
                "parentId": "<parentId>",
                "sampled": <sampled>
              }
            }
```

3. **Consumer Side (Lambda Target):**
```typescript
import * as AWSXRay from 'aws-xray-sdk-core';
import { Segment } from 'aws-xray-sdk-core';

export async function processOrder(event: any) {
  // Extract trace context from event
  const trace = event._trace;
  
  if (trace?.traceId) {
    // Create X-Ray segment with parent context
    const traceHeader = `Root=${trace.traceId};Parent=${trace.parentId};Sampled=${trace.sampled ? '1' : '0'}`;
    
    // Set as environment variable for automatic X-Ray capture
    process.env._X_AMZN_TRACE_ID = traceHeader;
    
    // Or manually create linked segment
    const segment = new Segment('process-order', traceHeader);
    AWSXRay.setSegment(segment);
  }
  
  // Process order with trace context
  console.log(`Processing order ${event.orderId} with trace ${trace?.traceId}`);
  
  // ... business logic ...
  
  if (segment) {
    segment.close();
  }
}
```

### Pattern 2: EventBridge Message Attributes

**Best for:** Preserving trace context without modifying event detail.

**Note:** EventBridge doesn't support custom message attributes like SQS, but you can use the `detail` field creatively.

**Implementation:**

```typescript
// Publisher wraps payload with metadata
await eventbridge.send(new PutEventsCommand({
  Entries: [{
    Source: 'com.myapp.orders',
    DetailType: 'Order Placed',
    Detail: JSON.stringify({
      metadata: {
        traceId: segment.trace_id,
        spanId: segment.id,
        timestamp: new Date().toISOString()
      },
      payload: {
        orderId: '12345',
        amount: 100.00
      }
    })
  }]
}));

// Rule configuration extracts both metadata and payload
input:
  type: transformer
  transformer:
    inputPathsMap:
      traceId: $.detail.metadata.traceId
      spanId: $.detail.metadata.spanId
      payload: $.detail.payload
    inputTemplate: |
      {
        "trace": {
          "traceId": "<traceId>",
          "spanId": "<spanId>"
        },
        "data": <payload>
      }
```

### Pattern 3: OpenTelemetry Integration

**Best for:** Standardized tracing across heterogeneous services.

**Implementation:**

1. **Publisher with OpenTelemetry:**
```typescript
import { trace, context, propagation } from '@opentelemetry/api';
import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';

const tracer = trace.getTracer('order-service');

export async function publishOrder(orderId: string, amount: number) {
  const span = tracer.startSpan('publish-order-event');
  
  try {
    const eventbridge = new EventBridgeClient({});
    
    // Get trace context
    const spanContext = span.spanContext();
    
    // Publish with OTel trace context
    await eventbridge.send(new PutEventsCommand({
      Entries: [{
        Source: 'com.myapp.orders',
        DetailType: 'Order Placed',
        Detail: JSON.stringify({
          orderId,
          amount,
          _otel: {
            traceId: spanContext.traceId,
            spanId: spanContext.spanId,
            traceFlags: spanContext.traceFlags,
            traceState: spanContext.traceState?.serialize()
          }
        })
      }]
    }));
    
    span.setStatus({ code: 1 }); // OK
  } catch (error) {
    span.recordException(error);
    span.setStatus({ code: 2 }); // ERROR
    throw error;
  } finally {
    span.end();
  }
}
```

2. **Consumer with OpenTelemetry:**
```typescript
import { trace, context as otelContext, SpanKind } from '@opentelemetry/api';

export async function processOrder(event: any) {
  const tracer = trace.getTracer('processor-service');
  
  // Extract parent trace context
  const parentContext = event._otel;
  
  // Create span with remote parent
  const span = tracer.startSpan('process-order', {
    kind: SpanKind.CONSUMER,
    attributes: {
      'messaging.system': 'eventbridge',
      'messaging.source': event.source,
      'order.id': event.orderId
    },
    links: parentContext ? [{
      context: {
        traceId: parentContext.traceId,
        spanId: parentContext.spanId,
        traceFlags: parentContext.traceFlags
      }
    }] : []
  });
  
  try {
    // Process within trace context
    await otelContext.with(trace.setSpan(otelContext.active(), span), async () => {
      // ... business logic ...
      console.log(`Processing order ${event.orderId}`);
    });
    
    span.setStatus({ code: 1 }); // OK
  } catch (error) {
    span.recordException(error);
    span.setStatus({ code: 2 }); // ERROR
    throw error;
  } finally {
    span.end();
  }
}
```

## Best Practices

### 1. Use Consistent Trace ID Format

Choose one format and stick with it across all services:
- W3C Trace Context (recommended for interoperability)
- AWS X-Ray format (recommended for AWS-only)
- OpenTelemetry (recommended for multi-cloud)

### 2. Include Minimal Context

Only include essential trace information in events:
- ✅ Trace ID
- ✅ Span/Parent ID
- ✅ Sampling decision
- ❌ Full trace spans (too large)
- ❌ Sensitive data

### 3. Handle Missing Context Gracefully

Always handle cases where trace context is missing:
```typescript
function extractTraceContext(event: any) {
  const trace = event._trace || event._otel;
  
  if (!trace?.traceId) {
    // Start new trace if no parent context
    console.warn('No parent trace context, starting new trace');
    return null;
  }
  
  return {
    traceId: trace.traceId,
    parentId: trace.spanId || trace.parentId,
    sampled: trace.sampled !== false
  };
}
```

### 4. Preserve Context Through Chains

When chaining events, each service should:
1. Extract parent trace context
2. Create child span
3. Pass updated context to next event

```typescript
// Service A publishes event with trace
publishEvent({ ...data, _trace: { traceId, spanId: currentSpanId } });

// Service B receives, creates child span, republishes
const childSpan = createChildSpan(event._trace);
publishNextEvent({ ...data, _trace: { traceId, spanId: childSpan.id } });
```

### 5. Use Input Transformers

Always use input transformers to extract and pass trace context:
```yaml
input:
  type: transformer
  transformer:
    inputPathsMap:
      # Extract full event
      event: $
      # Extract trace specifically
      traceId: $.detail._trace.traceId
      spanId: $.detail._trace.spanId
    inputTemplate: |
      {
        "event": <event>,
        "traceContext": {
          "traceId": "<traceId>",
          "spanId": "<spanId>"
        }
      }
```

### 6. Monitor Trace Propagation

Add metrics to track trace propagation success:
```typescript
function logTracePropagation(event: any) {
  const hasTrace = !!event._trace?.traceId;
  
  // Emit custom metric
  console.log(JSON.stringify({
    metric: 'trace_propagation',
    value: hasTrace ? 1 : 0,
    dimensions: {
      service: 'order-processor',
      source: event.source
    }
  }));
  
  return hasTrace;
}
```

## Troubleshooting

### Trace Context Not Propagating

**Symptom:** Child spans don't link to parent trace.

**Causes:**
1. Input transformer not configured
2. Trace context in wrong event field
3. Consumer not extracting context

**Resolution:**
```bash
# Test input transformer
aws events test-event-pattern \
  --event-pattern file://pattern.json \
  --event file://test-event.json

# Check CloudWatch Logs for consumer
aws logs tail /aws/lambda/consumer --follow | grep "trace"

# Verify X-Ray trace
aws xray get-trace-summaries \
  --start-time 2025-10-10T00:00:00Z \
  --end-time 2025-10-10T23:59:59Z
```

### Broken Trace Chains

**Symptom:** Traces show gaps between services.

**Causes:**
1. Service not creating child spans
2. Sampling decision not propagated
3. Different trace ID formats

**Resolution:**
- Ensure all services use same trace format
- Verify sampling is consistent
- Check that each service creates proper child spans

### Performance Impact

**Symptom:** High latency when tracing enabled.

**Causes:**
1. Too many trace attributes
2. Synchronous trace writes
3. High sampling rate

**Resolution:**
```typescript
// Use sampling to reduce overhead
const sampler = new TraceIdRatioBasedSampler(0.1); // 10% sampling

// Write traces asynchronously
const exporter = new BatchSpanProcessor(traceExporter, {
  maxQueueSize: 2048,
  maxExportBatchSize: 512,
  scheduledDelayMillis: 5000
});
```

## Examples

### Complete End-to-End Example

See [examples/trace-propagation/](../examples/trace-propagation/) for a complete working example with:
- Order service (publisher)
- EventBridge rule (intermediary)
- Fulfillment service (consumer)
- Payment service (downstream)
- X-Ray trace visualization

### Integration Tests

Test trace propagation in integration tests:
```typescript
describe('Trace Propagation', () => {
  it('propagates trace context through EventBridge', async () => {
    // Start trace
    const tracer = trace.getTracer('test');
    const span = tracer.startSpan('test-publish');
    const traceId = span.spanContext().traceId;
    
    // Publish event with trace
    await publishEvent({
      orderId: '12345',
      _trace: { traceId, spanId: span.spanContext().spanId }
    });
    
    // Wait for consumer to process
    await wait(1000);
    
    // Verify trace in X-Ray
    const traces = await xray.getTraceSummaries({
      FilterExpression: `trace.id = "${traceId}"`
    });
    
    expect(traces.TraceSummaries).toHaveLength(1);
    expect(traces.TraceSummaries[0].HasError).toBe(false);
    
    span.end();
  });
});
```

## Additional Resources

- [W3C Trace Context Specification](https://www.w3.org/TR/trace-context/)
- [AWS X-Ray Developer Guide](https://docs.aws.amazon.com/xray/latest/devguide/)
- [OpenTelemetry Tracing Documentation](https://opentelemetry.io/docs/concepts/signals/traces/)
- [EventBridge Input Transformation](https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-transform-target-input.html)

---

**Last Updated:** October 10, 2025  
**Component Version:** 1.0.0

