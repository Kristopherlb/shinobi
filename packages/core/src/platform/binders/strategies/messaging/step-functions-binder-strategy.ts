/**
 * Step Functions Binder Strategy
 * Handles workflow orchestration bindings for AWS Step Functions
 */

import { IBinderStrategy } from '../binder-strategy';
import { BindingContext } from '../../binding-context';
import { ComponentBinding } from '../../component-binding';
// Compliance framework branching removed; use binding.options/config instead

export class StepFunctionsBinderStrategy implements IBinderStrategy {
  readonly supportedCapabilities = ['states:state-machine', 'states:execution', 'states:activity'];

  async bind(
    sourceComponent: any,
    targetComponent: any,
    binding: ComponentBinding,
    context: BindingContext
  ): Promise<void> {
    const { capability, access } = binding;

    switch (capability) {
      case 'states:state-machine':
        await this.bindToStateMachine(sourceComponent, targetComponent, binding, context);
        break;
      case 'states:execution':
        await this.bindToExecution(sourceComponent, targetComponent, binding, context);
        break;
      case 'states:activity':
        await this.bindToActivity(sourceComponent, targetComponent, binding, context);
        break;
      default:
        throw new Error(`Unsupported Step Functions capability: ${capability}`);
    }
  }

  private async bindToStateMachine(
    sourceComponent: any,
    targetComponent: any,
    binding: ComponentBinding,
    context: BindingContext
  ): Promise<void> {
    const { access } = binding;

    // Grant state machine access permissions
    if (access.includes('read')) {
      sourceComponent.addToRolePolicy({
        Effect: 'Allow',
        Action: [
          'states:DescribeStateMachine',
          'states:ListStateMachines',
          'states:DescribeExecution'
        ],
        Resource: targetComponent.stateMachineArn
      });
    }

    if (access.includes('write')) {
      sourceComponent.addToRolePolicy({
        Effect: 'Allow',
        Action: [
          'states:CreateStateMachine',
          'states:DeleteStateMachine',
          'states:UpdateStateMachine'
        ],
        Resource: targetComponent.stateMachineArn
      });
    }

    if (access.includes('execute')) {
      sourceComponent.addToRolePolicy({
        Effect: 'Allow',
        Action: [
          'states:StartExecution',
          'states:StopExecution'
        ],
        Resource: targetComponent.stateMachineArn
      });
    }

    // Grant permissions for service integrations
    if (targetComponent.roleArn) {
      sourceComponent.addToRolePolicy({
        Effect: 'Allow',
        Action: [
          'iam:PassRole'
        ],
        Resource: targetComponent.roleArn
      });
    }

    // Inject state machine environment variables
    sourceComponent.addEnvironment('STEP_FUNCTIONS_STATE_MACHINE_NAME', targetComponent.stateMachineName);
    sourceComponent.addEnvironment('STEP_FUNCTIONS_STATE_MACHINE_ARN', targetComponent.stateMachineArn);
    sourceComponent.addEnvironment('STEP_FUNCTIONS_STATE_MACHINE_TYPE', targetComponent.type || 'STANDARD');
    sourceComponent.addEnvironment('STEP_FUNCTIONS_STATE_MACHINE_STATUS', targetComponent.status);

    // Configure state machine definition
    if (targetComponent.definition) {
      sourceComponent.addEnvironment('STEP_FUNCTIONS_STATE_MACHINE_DEFINITION', targetComponent.definition);
    }

    // Configure secure access when requested via options/config
    if (binding.options?.requireSecureAccess === true) {
      await this.configureSecureStateMachineAccess(sourceComponent, targetComponent, context);
    }
  }

  private async bindToExecution(
    sourceComponent: any,
    targetComponent: any,
    binding: ComponentBinding,
    context: BindingContext
  ): Promise<void> {
    const { access } = binding;

    // Grant execution access permissions
    if (access.includes('read')) {
      sourceComponent.addToRolePolicy({
        Effect: 'Allow',
        Action: [
          'states:DescribeExecution',
          'states:ListExecutions',
          'states:GetExecutionHistory'
        ],
        Resource: targetComponent.executionArn
      });
    }

    if (access.includes('write')) {
      sourceComponent.addToRolePolicy({
        Effect: 'Allow',
        Action: [
          'states:StartExecution',
          'states:StopExecution',
          'states:TagResource',
          'states:UntagResource'
        ],
        Resource: targetComponent.executionArn
      });
    }

    // Inject execution environment variables
    sourceComponent.addEnvironment('STEP_FUNCTIONS_EXECUTION_NAME', targetComponent.executionName);
    sourceComponent.addEnvironment('STEP_FUNCTIONS_EXECUTION_ARN', targetComponent.executionArn);
    sourceComponent.addEnvironment('STEP_FUNCTIONS_EXECUTION_STATUS', targetComponent.status);
    sourceComponent.addEnvironment('STEP_FUNCTIONS_EXECUTION_STATE_MACHINE_ARN', targetComponent.stateMachineArn);

    // Configure execution input and output
    if (targetComponent.input) {
      sourceComponent.addEnvironment('STEP_FUNCTIONS_EXECUTION_INPUT', targetComponent.input);
    }

    if (targetComponent.output) {
      sourceComponent.addEnvironment('STEP_FUNCTIONS_EXECUTION_OUTPUT', targetComponent.output);
    }

    // Configure execution metadata
    if (targetComponent.startDate) {
      sourceComponent.addEnvironment('STEP_FUNCTIONS_EXECUTION_START_DATE', targetComponent.startDate);
    }

    if (targetComponent.stopDate) {
      sourceComponent.addEnvironment('STEP_FUNCTIONS_EXECUTION_STOP_DATE', targetComponent.stopDate);
    }
  }

  private async bindToActivity(
    sourceComponent: any,
    targetComponent: any,
    binding: ComponentBinding,
    context: BindingContext
  ): Promise<void> {
    const { access } = binding;

    // Grant activity access permissions
    if (access.includes('read')) {
      sourceComponent.addToRolePolicy({
        Effect: 'Allow',
        Action: [
          'states:DescribeActivity',
          'states:ListActivities'
        ],
        Resource: targetComponent.activityArn
      });
    }

    if (access.includes('write')) {
      sourceComponent.addToRolePolicy({
        Effect: 'Allow',
        Action: [
          'states:CreateActivity',
          'states:DeleteActivity',
          'states:TagResource',
          'states:UntagResource'
        ],
        Resource: targetComponent.activityArn
      });
    }

    // Grant activity task permissions
    if (access.includes('poll')) {
      sourceComponent.addToRolePolicy({
        Effect: 'Allow',
        Action: [
          'states:GetActivityTask'
        ],
        Resource: targetComponent.activityArn
      });
    }

    if (access.includes('send')) {
      sourceComponent.addToRolePolicy({
        Effect: 'Allow',
        Action: [
          'states:SendTaskSuccess',
          'states:SendTaskFailure',
          'states:SendTaskHeartbeat'
        ],
        Resource: targetComponent.activityArn
      });
    }

    // Inject activity environment variables
    sourceComponent.addEnvironment('STEP_FUNCTIONS_ACTIVITY_NAME', targetComponent.activityName);
    sourceComponent.addEnvironment('STEP_FUNCTIONS_ACTIVITY_ARN', targetComponent.activityArn);
    sourceComponent.addEnvironment('STEP_FUNCTIONS_ACTIVITY_CREATION_DATE', targetComponent.creationDate);
  }

  private async configureSecureStateMachineAccess(
    sourceComponent: any,
    targetComponent: any,
    context: BindingContext
  ): Promise<void> {
    // Configure logging
    if (targetComponent.loggingConfiguration) {
      sourceComponent.addEnvironment('STEP_FUNCTIONS_LOGGING_ENABLED', 'true');
      sourceComponent.addEnvironment('STEP_FUNCTIONS_LOG_LEVEL', targetComponent.loggingConfiguration.level);

      if (targetComponent.loggingConfiguration.includeExecutionData) {
        sourceComponent.addEnvironment('STEP_FUNCTIONS_INCLUDE_EXECUTION_DATA', 'true');
      }
    }

    // Grant CloudWatch Logs permissions
    sourceComponent.addToRolePolicy({
      Effect: 'Allow',
      Action: [
        'logs:CreateLogGroup',
        'logs:CreateLogStream',
        'logs:PutLogEvents'
      ],
      Resource: `arn:aws:logs:${context.region}:${context.accountId}:log-group:/aws/stepfunctions/*`
    });

    // Configure tracing for X-Ray
    if (targetComponent.tracingConfiguration?.enabled) {
      sourceComponent.addEnvironment('STEP_FUNCTIONS_XRAY_TRACING_ENABLED', 'true');

      // Grant X-Ray permissions
      sourceComponent.addToRolePolicy({
        Effect: 'Allow',
        Action: [
          'xray:PutTraceSegments',
          'xray:PutTelemetryRecords'
        ],
        Resource: '*'
      });
    }

    // Configure dead letter queue for failed executions
    if (targetComponent.definition?.includes('DeadLetterConfig')) {
      sourceComponent.addEnvironment('STEP_FUNCTIONS_DEAD_LETTER_QUEUE_ENABLED', 'true');

      // Grant SQS permissions for dead letter queue
      sourceComponent.addToRolePolicy({
        Effect: 'Allow',
        Action: [
          'sqs:SendMessage'
        ],
        Resource: targetComponent.deadLetterQueueArn
      });
    }

    // Configure encryption when requested via options/config
    if ((targetComponent as any)?.enableEncryption === true) {
      sourceComponent.addEnvironment('STEP_FUNCTIONS_ENCRYPTION_ENABLED', 'true');
      if (targetComponent.kmsKeyId) {
        sourceComponent.addEnvironment('STEP_FUNCTIONS_KMS_KEY_ID', targetComponent.kmsKeyId);
        sourceComponent.addToRolePolicy({
          Effect: 'Allow',
          Action: ['kms:Decrypt', 'kms:GenerateDataKey'],
          Resource: targetComponent.kmsKeyId
        });
      }
    }

    // Configure audit logging for compliance
    sourceComponent.addEnvironment('STEP_FUNCTIONS_AUDIT_LOGGING_ENABLED', 'true');

    // Grant CloudTrail permissions for audit logging
    sourceComponent.addToRolePolicy({
      Effect: 'Allow',
      Action: [
        'logs:CreateLogGroup',
        'logs:CreateLogStream',
        'logs:PutLogEvents'
      ],
      Resource: `arn:aws:logs:${context.region}:${context.accountId}:log-group:/aws/stepfunctions/*`
    });
  }
}
