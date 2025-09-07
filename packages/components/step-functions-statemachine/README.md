# Step Functions State Machine Component

Enterprise-grade AWS Step Functions State Machine for serverless workflow orchestration with comprehensive compliance and monitoring capabilities.

## Overview

This component provides a fully managed AWS Step Functions State Machine with:

- **Serverless Workflows**: JSON-based state machine definitions for complex business logic
- **Compliance Hardening**: Three-tier compliance support (Commercial/FedRAMP Moderate/FedRAMP High)
- **Comprehensive Logging**: CloudWatch Logs integration with configurable log levels
- **X-Ray Tracing**: Distributed tracing for workflow visualization and debugging
- **Security**: IAM roles, encryption, and least-privilege access patterns

## Capabilities

- **workflow:step-functions**: Provides state machine connectivity for workflow orchestration

## Configuration

```yaml
components:
  - name: order-processing
    type: step-functions-statemachine
    config:
      stateMachineName: OrderProcessingWorkflow
      stateMachineType: STANDARD
      definition:
        definitionString: |
          {
            "Comment": "Order processing workflow",
            "StartAt": "ValidateOrder",
            "States": {
              "ValidateOrder": {
                "Type": "Task",
                "Resource": "arn:aws:lambda:us-east-1:123456789012:function:validate-order",
                "Next": "ProcessPayment"
              },
              "ProcessPayment": {
                "Type": "Task",
                "Resource": "arn:aws:lambda:us-east-1:123456789012:function:process-payment",
                "End": true
              }
            }
          }
      
      loggingConfiguration:
        enabled: true
        level: ALL
        includeExecutionData: true
      
      tracingConfiguration:
        enabled: true
      
      timeout:
        seconds: 3600
      
      tags:
        workflow-type: order-processing
        business-unit: sales
```

## Binding Examples

### Lambda Function to Step Functions

```yaml
components:
  - name: order-api
    type: lambda-api
    config:
      handler: src/handler.main
    binds:
      - to: order-processing
        capability: workflow:step-functions
        access: start-execution
```

This binding allows the Lambda function to:
- Start state machine executions
- Pass input data to workflows
- Monitor execution status

## Compliance Features

### Commercial
- Basic logging and monitoring
- Cost-optimized execution settings
- Standard security configurations

### FedRAMP Moderate
- Comprehensive logging with ALL level
- Enhanced X-Ray tracing enabled
- 1-year log retention
- Execution data logging for audit trails

### FedRAMP High
- Mandatory comprehensive logging
- Strict execution timeouts (30 minutes)
- 10-year log retention
- Enhanced security monitoring
- Detailed audit trails

## Advanced Configuration

### Express State Machine

```yaml
config:
  stateMachineType: EXPRESS
  loggingConfiguration:
    enabled: true
    level: ERROR
```

### Custom IAM Role

```yaml
config:
  roleArn: arn:aws:iam::123456789012:role/CustomStepFunctionsRole
```

### Complex Definition with Substitutions

```yaml
config:
  definition:
    definitionString: |
      {
        "StartAt": "ProcessData",
        "States": {
          "ProcessData": {
            "Type": "Task",
            "Resource": "${LambdaFunctionArn}",
            "End": true
          }
        }
      }
    definitionSubstitutions:
      LambdaFunctionArn: arn:aws:lambda:us-east-1:123456789012:function:data-processor
```

## Monitoring and Observability

The component automatically configures:

- **CloudWatch Metrics**: Execution metrics, success/failure rates
- **CloudWatch Logs**: Configurable logging levels with structured output
- **AWS X-Ray**: Distributed tracing for workflow visualization
- **CloudWatch Alarms**: Execution failure and duration monitoring
- **Audit Logs**: Compliance-specific audit trails

### Monitoring Levels

- **Basic**: Error-level logging only
- **Enhanced**: ALL-level logging with execution data
- **Comprehensive**: Enhanced + X-Ray tracing + security monitoring

## Security Features

### IAM Roles and Policies
- Least-privilege execution roles
- CloudWatch Logs permissions
- X-Ray tracing permissions
- Resource-specific permissions

### Logging and Auditing
- Structured log output
- Execution data capture (configurable)
- Compliance audit trails
- Security event logging

### Timeout Management
- Configurable execution timeouts
- Framework-specific timeout limits
- Failure handling and retry logic

## State Machine Types

### Standard Workflows
- Long-running workflows (up to 1 year)
- At-most-once execution semantics
- Full audit trail and history

### Express Workflows
- High-volume, short-duration workflows
- At-least-once execution semantics
- Lower cost for frequent executions

## Troubleshooting

### Common Issues

1. **Execution Failures**
   - Check CloudWatch Logs for detailed error messages
   - Verify IAM permissions for referenced resources
   - Ensure JSON definition syntax is valid

2. **Timeout Issues**
   - Review execution timeout settings
   - Check individual task timeouts
   - Monitor CloudWatch metrics for duration patterns

3. **Permission Errors**
   - Verify execution role has necessary permissions
   - Check cross-service IAM policies
   - Ensure resource ARNs are correct

### Debug Mode

Enable comprehensive logging for debugging:

```yaml
config:
  loggingConfiguration:
    enabled: true
    level: ALL
    includeExecutionData: true
  tracingConfiguration:
    enabled: true
```

## Examples

See the [`examples/`](../../examples/) directory for complete service templates:

- `examples/order-processing/` - E-commerce order workflow
- `examples/data-pipeline/` - ETL data processing workflow
- `examples/approval-workflow/` - Multi-stage approval process

## API Reference

### StepFunctionsStateMachineComponent

Main component class that extends `Component`.

#### Methods

- `synth()`: Creates AWS resources (State Machine, IAM Role, Log Groups)
- `getCapabilities()`: Returns workflow:step-functions capability
- `getType()`: Returns 'step-functions-statemachine'

### Configuration Interfaces

- `StepFunctionsStateMachineConfig`: Main configuration interface
- `STEP_FUNCTIONS_STATEMACHINE_CONFIG_SCHEMA`: JSON schema for validation

## Development

To contribute to this component:

1. Make changes to the source code
2. Run tests: `npm test`
3. Build: `npm run build`
4. Follow the [Contributing Guide](../../../CONTRIBUTING.md)

## License

MIT License - see LICENSE file for details.