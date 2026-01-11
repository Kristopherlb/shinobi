# Log Retrieval Patterns

## CloudWatch Logs Retrieval

### Basic Log Retrieval Script

```bash
#!/bin/bash
# scripts/get-logs.sh

SERVICE_NAME="${1:-api-s3-service}"
COMPONENT_NAME="${2:-file-storage-api}"
LOG_GROUP="/aws/lambda/${SERVICE_NAME}-${COMPONENT_NAME}"
START_TIME="${3:-$(date -u -d '1 hour ago' +%s)000}"
END_TIME="${4:-$(date -u +%s)000}"

aws logs filter-log-events \
  --log-group-name "$LOG_GROUP" \
  --start-time "$START_TIME" \
  --end-time "$END_TIME" \
  --output json | jq '.events[] | .message' | jq -r
```

### Structured Log Query Patterns

#### Error Logs

```bash
aws logs filter-log-events \
  --log-group-name "/aws/lambda/my-function" \
  --filter-pattern "{ $.level = \"ERROR\" }" \
  --start-time $(date -u -d '1 hour ago' +%s)000
```

#### Trace Correlation

```bash
aws logs filter-log-events \
  --log-group-name "/aws/lambda/my-function" \
  --filter-pattern "{ $.trace.traceId = \"*\" }" \
  --start-time $(date -u -d '1 hour ago' +%s)000
```

#### Component-Specific Logs

```bash
aws logs filter-log-events \
  --log-group-name "/aws/lambda/my-function" \
  --filter-pattern "{ $.context.component = \"lambda-api\" }" \
  --start-time $(date -u -d '1 hour ago' +%s)000
```

### CloudWatch Logs Insights Queries

#### Error Rate Over Time

```sql
fields @timestamp, @message, level
| filter level = "ERROR"
| stats count() by bin(5m)
```

#### Trace Duration Analysis

```sql
fields @timestamp, trace.traceId, trace.duration
| filter trace.duration > 1000
| sort trace.duration desc
| limit 100
```

#### Component Lifecycle Events

```sql
fields @timestamp, @message, context.action
| filter context.action = "component_lifecycle"
| stats count() by context.action
```

### Log Export for Compliance

```bash
#!/bin/bash
# scripts/export-logs.sh

SERVICE_NAME="${1}"
COMPONENT_NAME="${2}"
LOG_GROUP="/aws/lambda/${SERVICE_NAME}-${COMPONENT_NAME}"
EXPORT_DESTINATION="s3://compliance-logs/${SERVICE_NAME}/${COMPONENT_NAME}/"

aws logs create-export-task \
  --log-group-name "$LOG_GROUP" \
  --from $(date -u -d '24 hours ago' +%s)000 \
  --to $(date -u +%s)000 \
  --destination "$EXPORT_DESTINATION" \
  --destination-prefix "$(date +%Y/%m/%d)"
```

### Multi-Component Log Aggregation

```bash
#!/bin/bash
# scripts/get-all-logs.sh

SERVICE_NAME="${1}"
COMPONENTS=("file-storage-api" "queue-processor" "file-bucket")

for COMPONENT in "${COMPONENTS[@]}"; do
  echo "=== Logs for ${COMPONENT} ==="
  ./scripts/get-logs.sh "$SERVICE_NAME" "$COMPONENT"
  echo ""
done
```

### Log Correlation Utilities

```typescript
// scripts/log-correlation.ts
import { CloudWatchLogsClient, FilterLogEventsCommand } from '@aws-sdk/client-cloudwatch-logs';

export async function getLogsByTraceId(
  logGroupName: string,
  traceId: string,
  startTime: number,
  endTime: number
): Promise<any[]> {
  const client = new CloudWatchLogsClient({ region: 'us-west-2' });
  
  const command = new FilterLogEventsCommand({
    logGroupName,
    filterPattern: `{ $.trace.traceId = "${traceId}" }`,
    startTime,
    endTime
  });
  
  const response = await client.send(command);
  return response.events || [];
}
```

## Log Retrieval Script Generation

When generating an application, create:

1. **Basic Log Retrieval Script** (`scripts/get-logs.sh`):
   - Retrieves logs for a specific component
   - Supports time range filtering
   - Outputs structured JSON

2. **Log Query Script** (`scripts/query-logs.sh`):
   - Uses CloudWatch Logs Insights
   - Pre-defined queries for common patterns
   - Error analysis, trace correlation, performance analysis

3. **Log Export Script** (`scripts/export-logs.sh`):
   - Exports logs to S3 for compliance
   - Supports retention policies
   - Generates compliance reports

4. **Log Correlation Utility** (`scripts/log-correlation.ts`):
   - TypeScript utility for trace correlation
   - Multi-component log aggregation
   - Performance analysis

## Log Group Naming Conventions

Platform components follow standard log group naming:

- **Lambda Functions**: `/aws/lambda/{service-name}-{component-name}`
- **ECS Services**: `/aws/ecs/{service-name}-{component-name}`
- **API Gateway**: `/aws/apigateway/{service-name}-{component-name}`
- **Custom Logs**: `/aws/{service-name}/{component-name}`

## Structured Log Schema

All logs follow the Platform Logging Standard:

```json
{
  "timestamp": "2025-01-15T10:30:00Z",
  "level": "INFO|ERROR|WARN|DEBUG",
  "message": "Human-readable message",
  "service": {
    "name": "api-s3-service",
    "version": "1.0.0",
    "instance": "us-west-2"
  },
  "environment": {
    "name": "dev",
    "region": "us-west-2",
    "compliance": "commercial"
  },
  "trace": {
    "traceId": "abc123...",
    "spanId": "def456...",
    "sampled": true
  },
  "context": {
    "action": "component_lifecycle|resource_creation|...",
    "resource": "lambda-function",
    "component": "lambda-api"
  },
  "security": {
    "classification": "internal",
    "piiPresent": false,
    "auditRequired": false
  }
}
```

