# Network Rules Stack Observability

This directory contains observability configuration and monitoring artifacts for the Network Rules Stack component.

## Overview

The Network Rules Stack component provides built-in observability through:
- CloudWatch Logs for Lambda function execution
- CloudWatch Metrics for SSM query and rule application operations
- Structured logging for component lifecycle events
- Error tracking and alerting

## Monitoring Features

### CloudWatch Logs

Both Lambda functions (SSM Query and Rule Application) write structured logs to CloudWatch:

- **SSM Query Lambda**: `/aws/lambda/{stack-name}-QueryNetworkRulesLambda-{id}`
  - Logs SSM query operations, pagination, and parameter retrieval
  - Includes error handling and retry information

- **Rule Application Lambda**: `/aws/lambda/{stack-name}-ApplyNetworkRulesLambda-{id}`
  - Logs rule parsing, validation, and EC2 API operations
  - Includes deduplication logic and error details

### CloudWatch Metrics

The component automatically emits metrics for:

| Metric | Namespace | Description |
|--------|-----------|-------------|
| `Invocations` | `AWS/Lambda` | Number of Lambda invocations |
| `Errors` | `AWS/Lambda` | Number of Lambda errors |
| `Duration` | `AWS/Lambda` | Lambda execution duration |
| `Throttles` | `AWS/Lambda` | Number of throttled invocations |

### Custom Metrics

The component logs structured events that can be parsed for custom metrics:

- `synthesis_start` - Component synthesis started
- `synthesis_complete` - Component synthesis completed
- `rule_application_setup` - Rule application Lambda created
- `ssm_query_complete` - SSM query completed with parameter count

## Alarms

### Recommended Alarms

Create CloudWatch alarms for:

1. **Lambda Errors**
   - Metric: `Errors`
   - Threshold: > 0
   - Action: SNS notification to on-call team

2. **Lambda Duration**
   - Metric: `Duration`
   - Threshold: > 300 seconds (5 minutes)
   - Action: Warning notification

3. **SSM Query Failures**
   - Metric: Custom metric from logs
   - Threshold: > 5 failures in 5 minutes
   - Action: Alert to platform team

4. **Rule Application Failures**
   - Metric: Custom metric from logs
   - Threshold: > 10 failures in 5 minutes
   - Action: Critical alert

## Dashboard Components

Recommended CloudWatch Dashboard widgets:

1. **Lambda Function Health**
   - Invocations (count)
   - Errors (count)
   - Duration (p50, p95, p99)
   - Throttles (count)

2. **SSM Operations**
   - Parameters queried (count)
   - Query duration (average)
   - Query errors (count)

3. **Rule Application**
   - Rules applied (count)
   - Invalid parameters (count)
   - Application duration (average)

## Compliance

- **Commercial Baseline**: ✅ Full observability with CloudWatch Logs and Metrics
- **FedRAMP Moderate**: ✅ Enhanced monitoring with log retention and encryption
- **FedRAMP High**: ✅ Comprehensive audit trail with extended retention

## Troubleshooting

### Common Issues

1. **SSM Query Timeout**
   - Check SSM parameter count (pagination may be slow)
   - Verify IAM permissions for SSM access
   - Review Lambda timeout settings (default: 60 seconds)

2. **Rule Application Failures**
   - Check EC2 API permissions
   - Verify security group IDs are valid
   - Review rule specification format

3. **Duplicate Rule Errors**
   - Expected behavior - component deduplicates automatically
   - Check CloudWatch logs for deduplication details

## Last Updated

Generated: 2025-01-22
Component Version: 1.0.0


