# Step Functions State Machine Component

AWS Step Functions State Machine for serverless workflow orchestration with compliance-aware configuration and platform integration.

## Overview

The Step Functions State Machine component provides a production-ready, compliance-aware implementation of AWS Step Functions for orchestrating serverless workflows. It follows the Platform Component API Contract v1.1 and integrates with the platform's configuration, logging, and observability systems.

## Features

- **Compliance-Aware**: Automatically applies FedRAMP Moderate and FedRAMP High security configurations
- **5-Layer Configuration**: Platform, environment, component, and policy-based configuration precedence
- **Structured Logging**: Integrated with the platform's structured logging system
- **Standard Tagging**: Automatic application of service and component tags
- **Flexible Definitions**: Support for both JSON objects and JSON strings for state machine definitions
- **Timeout Management**: Configurable execution timeouts with compliance-aware defaults
- **IAM Integration**: Automatic creation of execution roles with appropriate permissions

## Usage

### Basic Usage

```yaml
# service.yml
components:
  workflow-processor:
    type: step-functions-statemachine
    config:
      definition:
        definition:
          Comment: "Simple workflow processor"
          StartAt: "ProcessData"
          States:
            ProcessData:
              Type: "Pass"
              Result: "Data processed successfully"
              End: true
```

### Advanced Usage

```yaml
# service.yml
components:
  complex-workflow:
    type: step-functions-statemachine
    config:
      stateMachineName: "my-complex-workflow"
      stateMachineType: "EXPRESS"
      definition:
        definitionString: |
          {
            "Comment": "Complex workflow with multiple states",
            "StartAt": "ValidateInput",
            "States": {
              "ValidateInput": {
                "Type": "Task",
                "Resource": "arn:aws:lambda:region:account:function:validate",
                "Next": "ProcessData"
              },
              "ProcessData": {
                "Type": "Task",
                "Resource": "arn:aws:lambda:region:account:function:process",
                "End": true
              }
            }
          }
      timeout:
        seconds: 1800
      tags:
        project: "data-processing"
        team: "analytics"
```

## Configuration Reference

| Property | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `stateMachineName` | string | No | Auto-generated | Name of the state machine |
| `stateMachineType` | string | No | `STANDARD` | Type of state machine (`STANDARD` or `EXPRESS`) |
| `definition` | object | Yes | - | State machine definition configuration |
| `definition.definition` | object | No | - | State machine definition as JSON object |
| `definition.definitionString` | string | No | - | State machine definition as JSON string |
| `definition.definitionSubstitutions` | object | No | `{}` | Variable substitutions for definition |
| `roleArn` | string | No | Auto-created | IAM role ARN for state machine execution |
| `loggingConfiguration` | object | No | Framework-dependent | CloudWatch logging configuration |
| `loggingConfiguration.enabled` | boolean | No | `false` (commercial) / `true` (FedRAMP) | Enable CloudWatch logging |
| `loggingConfiguration.level` | string | No | `ERROR` (commercial) / `ALL` (FedRAMP) | Log level (`ALL`, `ERROR`, `FATAL`, `OFF`) |
| `loggingConfiguration.includeExecutionData` | boolean | No | `false` (commercial) / `true` (FedRAMP) | Include execution data in logs |
| `tracingConfiguration` | object | No | Framework-dependent | X-Ray tracing configuration |
| `tracingConfiguration.enabled` | boolean | No | `false` (commercial) / `true` (FedRAMP) | Enable X-Ray tracing |
| `timeout` | object | No | - | Execution timeout configuration |
| `timeout.seconds` | number | No | `3600` (commercial) / `1800` (FedRAMP High) | Timeout in seconds (1-31536000) |
| `tags` | object | No | `{}` | Additional resource tags |

## Compliance Frameworks

### Commercial
- Basic logging disabled by default
- X-Ray tracing disabled by default
- 1-hour execution timeout
- Minimal security configuration

### FedRAMP Moderate
- Comprehensive logging enabled (`ALL` level)
- Execution data included in logs
- X-Ray tracing enabled
- Enhanced security tags
- 1-hour execution timeout

### FedRAMP High
- Maximum security logging enabled
- Full execution data logging
- Mandatory X-Ray tracing
- Shortened execution timeout (30 minutes)
- Enhanced security and audit tags

## Capabilities Provided

The component provides the following capabilities for binding with other components:

- **`workflow:step-functions`**: Provides state machine ARN and name for workflow orchestration

### Capability Data Structure

```typescript
{
  stateMachineArn: string;    // ARN of the created state machine
  stateMachineName: string;   // Name of the state machine
}
```

## Construct Handles

The following construct handles are available for advanced customization via `patches.ts`:

- **`main`**: The primary StateMachine construct
- **`stateMachine`**: Alias for the main StateMachine construct

## Examples

### Simple Data Processing Workflow

```yaml
components:
  data-processor:
    type: step-functions-statemachine
    config:
      definition:
        definition:
          Comment: "Process incoming data"
          StartAt: "ValidateData"
          States:
            ValidateData:
              Type: "Choice"
              Choices:
                - Variable: "$.dataType"
                  StringEquals: "json"
                  Next: "ProcessJSON"
                - Variable: "$.dataType"
                  StringEquals: "xml"
                  Next: "ProcessXML"
              Default: "ProcessDefault"
            ProcessJSON:
              Type: "Pass"
              Result: "JSON processed"
              End: true
            ProcessXML:
              Type: "Pass"
              Result: "XML processed"
              End: true
            ProcessDefault:
              Type: "Pass"
              Result: "Default processing"
              End: true
```

### Express Workflow for High-Throughput Processing

```yaml
components:
  high-throughput-processor:
    type: step-functions-statemachine
    config:
      stateMachineType: "EXPRESS"
      timeout:
        seconds: 300  # 5 minutes for fast processing
      definition:
        definitionString: |
          {
            "Comment": "High-throughput data processing",
            "StartAt": "ProcessBatch",
            "States": {
              "ProcessBatch": {
                "Type": "Parallel",
                "Branches": [
                  {
                    "StartAt": "ProcessChunk1",
                    "States": {
                      "ProcessChunk1": {
                        "Type": "Pass",
                        "Result": "Chunk 1 processed",
                        "End": true
                      }
                    }
                  },
                  {
                    "StartAt": "ProcessChunk2", 
                    "States": {
                      "ProcessChunk2": {
                        "Type": "Pass",
                        "Result": "Chunk 2 processed",
                        "End": true
                      }
                    }
                  }
                ],
                "End": true
              }
            }
          }
```

## Architecture

The Step Functions State Machine component follows the Platform Component API Contract v1.1:

1. **Configuration Building**: Uses `StepFunctionsStateMachineConfigBuilder` with 5-layer precedence
2. **Resource Creation**: Creates AWS Step Functions State Machine with optional IAM role
3. **Standard Tagging**: Applies service, component, and compliance tags automatically
4. **Construct Registration**: Registers constructs for advanced customization
5. **Capability Registration**: Provides workflow capabilities for component binding
6. **Structured Logging**: Integrates with platform logging system for operational visibility

## Security Considerations

- IAM execution roles are created with minimal required permissions
- FedRAMP configurations enable comprehensive logging and tracing
- Execution timeouts prevent runaway workflows
- State machine definitions should be validated before deployment
- Sensitive data in state machine definitions should use parameter substitution

## Monitoring and Observability

The component automatically integrates with the platform's observability stack:

- **Structured Logging**: All component lifecycle events are logged
- **CloudWatch Integration**: Optional CloudWatch logging for state machine executions
- **X-Ray Tracing**: Optional distributed tracing for workflow analysis
- **Standard Tags**: Enables consistent resource organization and cost allocation

## Troubleshooting

### Common Issues

1. **Definition Validation Errors**: Ensure your state machine definition is valid JSON
2. **Permission Errors**: Verify the execution role has necessary permissions for your workflow
3. **Timeout Issues**: Adjust the timeout configuration based on your workflow complexity
4. **Logging Issues**: Check CloudWatch log groups for execution details when logging is enabled

### Debug Mode

Enable debug logging by setting the component's log level to debug in your service configuration.