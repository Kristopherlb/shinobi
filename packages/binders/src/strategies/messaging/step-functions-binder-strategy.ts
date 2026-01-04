/**
 * Step Functions Binder Strategy (Unified)
 * Handles workflow orchestration bindings for AWS Step Functions with mandatory compliance enforcement
 */

import { UnifiedBinderStrategyBase, resolveActions } from '@shinobi/core';
import type { BindingContext, EnhancedBindingResult, CompatibilityEntry } from '@shinobi/core';
import type { IamPolicy } from '@shinobi/core';
import { PolicyStatement, Effect } from 'aws-cdk-lib/aws-iam';

export class StepFunctionsBinderStrategy extends UnifiedBinderStrategyBase {
  readonly supportedCapabilities = ['states:state-machine', 'states:execution', 'states:activity'];

  getStrategyName(): string {
    return 'Step Functions Binder Strategy';
  }

  canHandle(sourceType: string, targetCapability: string): boolean {
    return this.supportedCapabilities.includes(targetCapability);
  }

  getCompatibilityMatrix(): CompatibilityEntry[] {
    return [
      {
        sourceType: '*',
        targetType: 'states:state-machine',
        capability: 'states:state-machine',
        supportedAccess: ['read', 'write', 'readwrite'],
        description: 'Bind to Step Functions state machine for workflow orchestration',
        examples: ['lambda-api -> states:state-machine (read)', 'lambda-api -> states:state-machine (write)']
      },
      {
        sourceType: '*',
        targetType: 'states:execution',
        capability: 'states:execution',
        supportedAccess: ['read', 'write', 'readwrite'],
        description: 'Bind to Step Functions execution for monitoring and controlling workflow runs',
        examples: ['lambda-api -> states:execution (read)']
      },
      {
        sourceType: '*',
        targetType: 'states:activity',
        capability: 'states:activity',
        supportedAccess: ['read', 'write', 'readwrite'],
        description: 'Bind to Step Functions activity for task processing',
        examples: ['lambda-api -> states:activity (readwrite)']
      }
    ];
  }

  protected async doBind(context: BindingContext): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    const { source, target, directive } = context;
    const { capability } = directive;

    // Validate inputs
    if (!target) {
      throw new Error('Target component is required for Step Functions binding');
    }
    if (!capability) {
      throw new Error('Binding capability is required');
    }

    // Normalize access to array (directive.access is a single AccessLevel string)
    const access = directive.access ? [directive.access] : [];

    // Validate access patterns
    const validAccessTypes = ['read', 'write', 'readwrite'];
    const invalidAccess = access.filter(a => !validAccessTypes.includes(a));
    if (invalidAccess.length > 0) {
      throw new Error(`Invalid access types for Step Functions binding: ${invalidAccess.join(', ')}. Valid types: ${validAccessTypes.join(', ')}`);
    }
    if (access.length === 0) {
      throw new Error('Access cannot be empty for Step Functions binding');
    }

    // Get target capability data
    const targetCapabilities = target.getCapabilities();
    const targetCapabilityData = targetCapabilities[capability];
    if (!targetCapabilityData) {
      throw new Error(`Target component does not provide capability '${capability}'`);
    }

    // Route to appropriate binding method
    switch (capability) {
      case 'states:state-machine':
        return await this.bindToStateMachine(context, targetCapabilityData, access);
      case 'states:execution':
        return await this.bindToExecution(context, targetCapabilityData, access);
      case 'states:activity':
        return await this.bindToActivity(context, targetCapabilityData, access);
      default:
        throw new Error(`Unsupported Step Functions capability: ${capability}. Supported capabilities: ${this.supportedCapabilities.join(', ')}`);
    }
  }

  /**
   * Bind to Step Functions state machine
   * 
   * @param context - Binding context
   * @param targetData - Expected structure:
   *   - stateMachineArn (required): string - ARN of the state machine
   *   - stateMachineName (required): string - Name of the state machine
   *   - type?: string - State machine type (e.g., 'STANDARD', 'EXPRESS')
   *   - status?: string - State machine status
   *   - definition?: string - State machine definition (ASL JSON)
   *   - roleArn?: string - IAM role ARN for the state machine
   *   - loggingConfiguration?: { level?: string, includeExecutionData?: boolean } - Logging configuration (when requireSecureAccess is true)
   *   - tracingConfiguration?: { enabled?: boolean } - X-Ray tracing configuration (when requireSecureAccess is true)
   *   - kmsKeyId?: string - KMS key ID for encryption (when requireSecureAccess is true)
   *   - deadLetterQueueArn?: string - Dead letter queue ARN (when requireSecureAccess is true)
   * @param access - Array of access levels (read, write, readwrite)
   */
  private async bindToStateMachine(
    context: BindingContext,
    targetData: any,
    access: string[]
  ): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    // Validate required target properties
    if (!targetData?.stateMachineArn) {
      throw new Error('Target component missing required stateMachineArn property for Step Functions state machine binding');
    }
    if (!targetData?.stateMachineName) {
      throw new Error('Target component missing required stateMachineName property for Step Functions state machine binding');
    }

    const environmentVariables: Record<string, string> = {};
    const iamPolicies: IamPolicy[] = [];

    // Determine primary access level for action mapping
    const primaryAccess = access.includes('readwrite') ? 'readwrite' : access.includes('write') ? 'write' : 'read';

    // Resolve actions (granular override or coarse access)
    let resolvedActions = resolveActions(
      context.directive,
      context,
      (acc) => this.getStateMachineActionsForAccess(acc, targetData.type),
      'states'
    );

    // Grant state machine access permissions
    if (resolvedActions.length > 0) {
      const statement = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: resolvedActions,
        resources: [targetData.stateMachineArn]
      });
      iamPolicies.push({
        statement,
        description: `Step Functions state machine ${primaryAccess} access permissions`,
        complianceRequirement: 'Least privilege IAM access'
      });
    }

    // Grant IAM PassRole permission for state machine role if specified
    if (targetData.roleArn) {
      const statement = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['iam:PassRole'],
        resources: [targetData.roleArn]
      });
      iamPolicies.push({
        statement,
        description: 'IAM PassRole permission for Step Functions state machine role',
        complianceRequirement: 'Least privilege IAM access'
      });
    }

    // Set state machine environment variables
    environmentVariables['STEP_FUNCTIONS_STATE_MACHINE_NAME'] = targetData.stateMachineName;
    environmentVariables['STEP_FUNCTIONS_STATE_MACHINE_ARN'] = targetData.stateMachineArn;
    if (targetData.type) {
      environmentVariables['STEP_FUNCTIONS_STATE_MACHINE_TYPE'] = targetData.type;
    } else {
      environmentVariables['STEP_FUNCTIONS_STATE_MACHINE_TYPE'] = 'STANDARD';
    }
    if (targetData.status) {
      environmentVariables['STEP_FUNCTIONS_STATE_MACHINE_STATUS'] = targetData.status;
    }
    if (targetData.definition) {
      environmentVariables['STEP_FUNCTIONS_STATE_MACHINE_DEFINITION'] = targetData.definition;
    }

    // Configure secure access when requested via options/config
    if (context.directive.options?.requireSecureAccess === true) {
      const secureConfig = await this.buildSecureStateMachineAccessConfig(context, targetData);
      Object.assign(environmentVariables, secureConfig.environmentVariables);
      iamPolicies.push(...secureConfig.iamPolicies);
    }

    return {
      environmentVariables,
      iamPolicies,
      securityGroupRules: []
    };
  }

  /**
   * Bind to Step Functions execution
   * 
   * @param context - Binding context
   * @param targetData - Expected structure:
   *   - executionArn (required): string - ARN of the execution
   *   - executionName?: string - Name of the execution
   *   - status?: string - Execution status (e.g., 'RUNNING', 'SUCCEEDED', 'FAILED')
   *   - stateMachineArn?: string - ARN of the state machine that executed
   *   - input?: string - Execution input JSON
   *   - output?: string - Execution output JSON
   *   - startDate?: string - Execution start date
   *   - stopDate?: string - Execution stop date
   * @param access - Array of access levels (read, write, readwrite)
   */
  private async bindToExecution(
    context: BindingContext,
    targetData: any,
    access: string[]
  ): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    // Validate required target properties
    if (!targetData?.executionArn) {
      throw new Error('Target component missing required executionArn property for Step Functions execution binding');
    }

    const environmentVariables: Record<string, string> = {};
    const iamPolicies: IamPolicy[] = [];

    // Determine primary access level for action mapping
    const primaryAccess = access.includes('readwrite') ? 'readwrite' : access.includes('write') ? 'write' : 'read';

    // Resolve actions (granular override or coarse access)
    const resolvedActions = resolveActions(
      context.directive,
      context,
      (acc) => this.getExecutionActionsForAccess(acc),
      'states'
    );

    // Grant execution access permissions
    if (resolvedActions.length > 0) {
      const statement = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: resolvedActions,
        resources: [targetData.executionArn]
      });
      iamPolicies.push({
        statement,
        description: `Step Functions execution ${primaryAccess} access permissions`,
        complianceRequirement: 'Least privilege IAM access'
      });
    }

    // Set execution environment variables
    if (targetData.executionName) {
      environmentVariables['STEP_FUNCTIONS_EXECUTION_NAME'] = targetData.executionName;
    }
    environmentVariables['STEP_FUNCTIONS_EXECUTION_ARN'] = targetData.executionArn;
    if (targetData.status) {
      environmentVariables['STEP_FUNCTIONS_EXECUTION_STATUS'] = targetData.status;
    }
    if (targetData.stateMachineArn) {
      environmentVariables['STEP_FUNCTIONS_EXECUTION_STATE_MACHINE_ARN'] = targetData.stateMachineArn;
    }
    if (targetData.input) {
      environmentVariables['STEP_FUNCTIONS_EXECUTION_INPUT'] = targetData.input;
    }
    if (targetData.output) {
      environmentVariables['STEP_FUNCTIONS_EXECUTION_OUTPUT'] = targetData.output;
    }
    if (targetData.startDate) {
      environmentVariables['STEP_FUNCTIONS_EXECUTION_START_DATE'] = targetData.startDate;
    }
    if (targetData.stopDate) {
      environmentVariables['STEP_FUNCTIONS_EXECUTION_STOP_DATE'] = targetData.stopDate;
    }

    return {
      environmentVariables,
      iamPolicies,
      securityGroupRules: []
    };
  }

  /**
   * Bind to Step Functions activity
   * 
   * @param context - Binding context
   * @param targetData - Expected structure:
   *   - activityArn (required): string - ARN of the activity
   *   - activityName?: string - Name of the activity
   *   - creationDate?: string - Activity creation date
   *   - taskToken?: string - Task token for callback pattern (retrieved from GetActivityTask, used with SendTaskSuccess/SendTaskFailure/SendTaskHeartbeat)
   * @param access - Array of access levels (read, write, readwrite)
   */
  private async bindToActivity(
    context: BindingContext,
    targetData: any,
    access: string[]
  ): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    // Validate required target properties
    if (!targetData?.activityArn) {
      throw new Error('Target component missing required activityArn property for Step Functions activity binding');
    }

    const environmentVariables: Record<string, string> = {};
    const iamPolicies: IamPolicy[] = [];

    // Determine primary access level for action mapping
    const primaryAccess = access.includes('readwrite') ? 'readwrite' : access.includes('write') ? 'write' : 'read';

    // Resolve actions (granular override or coarse access)
    const resolvedActions = resolveActions(
      context.directive,
      context,
      (acc) => this.getActivityActionsForAccess(acc),
      'states'
    );

    // Grant activity access permissions
    if (resolvedActions.length > 0) {
      const statement = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: resolvedActions,
        resources: [targetData.activityArn]
      });
      iamPolicies.push({
        statement,
        description: `Step Functions activity ${primaryAccess} access permissions`,
        complianceRequirement: 'Least privilege IAM access'
      });
    }

    // Grant activity task permissions (poll and send)
    if (context.directive.options?.activityTaskAccess === true || access.includes('readwrite')) {
      const pollStatement = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['states:GetActivityTask'],
        resources: [targetData.activityArn]
      });
      iamPolicies.push({
        statement: pollStatement,
        description: 'Step Functions activity task poll permissions',
        complianceRequirement: 'Least privilege IAM access'
      });

      const sendStatement = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          'states:SendTaskSuccess',
          'states:SendTaskFailure',
          'states:SendTaskHeartbeat'
        ],
        resources: [targetData.activityArn]
      });
      iamPolicies.push({
        statement: sendStatement,
        description: 'Step Functions activity task send permissions',
        complianceRequirement: 'Least privilege IAM access'
      });
    }

    // Set activity environment variables
    if (targetData.activityName) {
      environmentVariables['STEP_FUNCTIONS_ACTIVITY_NAME'] = targetData.activityName;
    }
    environmentVariables['STEP_FUNCTIONS_ACTIVITY_ARN'] = targetData.activityArn;
    if (targetData.creationDate) {
      environmentVariables['STEP_FUNCTIONS_ACTIVITY_CREATION_DATE'] = targetData.creationDate;
    }
    // Task token for callback pattern (used with SendTaskSuccess/SendTaskFailure/SendTaskHeartbeat)
    if (targetData.taskToken) {
      environmentVariables['STEP_FUNCTIONS_TASK_TOKEN'] = targetData.taskToken;
    }

    return {
      environmentVariables,
      iamPolicies,
      securityGroupRules: []
    };
  }

  /**
   * Build secure access configuration for Step Functions state machine
   * 
   * @param context - Binding context
   * @param targetData - Expected structure:
   *   - stateMachineArn: string - ARN of the state machine
   *   - loggingConfiguration?: { level?: string, includeExecutionData?: boolean } - Logging configuration
   *   - tracingConfiguration?: { enabled?: boolean } - X-Ray tracing configuration
   *   - kmsKeyId?: string - KMS key ID for encryption
   *   - deadLetterQueueArn?: string - Dead letter queue ARN
   * @returns Secure access configuration with environment variables and IAM policies
   */
  private async buildSecureStateMachineAccessConfig(
    context: BindingContext,
    targetData: any
  ): Promise<{ environmentVariables: Record<string, string>; iamPolicies: IamPolicy[] }> {
    const environmentVariables: Record<string, string> = {};
    const iamPolicies: IamPolicy[] = [];
    const region = (context.target.context as any)?.region || process.env.AWS_REGION || 'us-east-1';
    const accountId = (context.target.context as any)?.accountId || '*';

    // Configure logging
    if (targetData.loggingConfiguration) {
      environmentVariables['STEP_FUNCTIONS_LOGGING_ENABLED'] = 'true';
      if (targetData.loggingConfiguration.level) {
        environmentVariables['STEP_FUNCTIONS_LOG_LEVEL'] = targetData.loggingConfiguration.level;
      }
      if (targetData.loggingConfiguration.includeExecutionData) {
        environmentVariables['STEP_FUNCTIONS_INCLUDE_EXECUTION_DATA'] = 'true';
      }

      // Grant CloudWatch Logs permissions
      const logsStatement = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          'logs:CreateLogGroup',
          'logs:CreateLogStream',
          'logs:PutLogEvents'
        ],
        resources: [`arn:aws:logs:${region}:${accountId}:log-group:/aws/stepfunctions/*`]
      });
      iamPolicies.push({
        statement: logsStatement,
        description: 'CloudWatch Logs permissions for Step Functions logging',
        complianceRequirement: 'Observability and compliance'
      });
    }

    // Configure tracing for X-Ray
    if (targetData.tracingConfiguration?.enabled) {
      environmentVariables['STEP_FUNCTIONS_XRAY_TRACING_ENABLED'] = 'true';

      // Grant X-Ray permissions
      const xrayStatement = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          'xray:PutTraceSegments',
          'xray:PutTelemetryRecords'
        ],
        resources: ['*']
      });
      iamPolicies.push({
        statement: xrayStatement,
        description: 'X-Ray permissions for Step Functions tracing',
        complianceRequirement: 'Observability and distributed tracing'
      });
    }

    // Configure dead letter queue for failed executions
    if (targetData.deadLetterQueueArn) {
      environmentVariables['STEP_FUNCTIONS_DEAD_LETTER_QUEUE_ENABLED'] = 'true';

      // Grant SQS permissions for dead letter queue
      const sqsStatement = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['sqs:SendMessage'],
        resources: [targetData.deadLetterQueueArn]
      });
      iamPolicies.push({
        statement: sqsStatement,
        description: 'SQS permissions for Step Functions dead letter queue',
        complianceRequirement: 'Resilience and error handling'
      });
    }

    // Configure encryption when requested
    if (targetData.kmsKeyId) {
      environmentVariables['STEP_FUNCTIONS_ENCRYPTION_ENABLED'] = 'true';
      environmentVariables['STEP_FUNCTIONS_KMS_KEY_ID'] = targetData.kmsKeyId;

      const kmsStatement = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['kms:Decrypt', 'kms:GenerateDataKey'],
        resources: [targetData.kmsKeyId]
      });
      iamPolicies.push({
        statement: kmsStatement,
        description: 'KMS permissions for Step Functions encryption',
        complianceRequirement: 'Encryption at rest'
      });
    }

    // Configure audit logging for compliance
    // Note: Audit logging uses CloudWatch Logs, and permissions are already granted
    // above when loggingConfiguration is present. No additional permissions needed.
    environmentVariables['STEP_FUNCTIONS_AUDIT_LOGGING_ENABLED'] = 'true';

    return { environmentVariables, iamPolicies };
  }

  /**
   * Get Step Functions state machine actions based on access level
   * Used by resolveActions to compute base actions from coarse access level
   * 
   * @param access - Access level (read, write, readwrite)
   * @param stateMachineType - State machine type (STANDARD, EXPRESS)
   * @returns Array of IAM action strings
   */
  private getStateMachineActionsForAccess(access: string, stateMachineType?: string): string[] {
    const actions: string[] = [];
    
    if (access === 'read' || access === 'readwrite') {
      actions.push(
        'states:DescribeStateMachine',
        'states:ListStateMachines',
        'states:DescribeExecution'
      );
    }

    if (access === 'write' || access === 'readwrite') {
      actions.push(
        'states:CreateStateMachine',
        'states:DeleteStateMachine',
        'states:UpdateStateMachine',
        'states:StartExecution',
        'states:StopExecution'
      );
      
      // Add synchronous execution support for Express workflows
      if (stateMachineType === 'EXPRESS') {
        actions.push('states:StartSyncExecution');
      }
    }

    return actions;
  }

  /**
   * Get Step Functions execution actions based on access level
   * Used by resolveActions to compute base actions from coarse access level
   * 
   * @param access - Access level (read, write, readwrite)
   * @returns Array of IAM action strings
   */
  private getExecutionActionsForAccess(access: string): string[] {
    const actions: string[] = [];
    
    if (access === 'read' || access === 'readwrite') {
      actions.push(
        'states:DescribeExecution',
        'states:ListExecutions',
        'states:GetExecutionHistory'
      );
    }

    if (access === 'write' || access === 'readwrite') {
      actions.push(
        'states:StartExecution',
        'states:StopExecution',
        'states:TagResource',
        'states:UntagResource'
      );
    }

    return actions;
  }

  /**
   * Get Step Functions activity actions based on access level
   * Used by resolveActions to compute base actions from coarse access level
   * 
   * @param access - Access level (read, write, readwrite)
   * @returns Array of IAM action strings
   */
  private getActivityActionsForAccess(access: string): string[] {
    const actions: string[] = [];
    
    if (access === 'read' || access === 'readwrite') {
      actions.push(
        'states:DescribeActivity',
        'states:ListActivities'
      );
    }

    if (access === 'write' || access === 'readwrite') {
      actions.push(
        'states:CreateActivity',
        'states:DeleteActivity',
        'states:TagResource',
        'states:UntagResource'
      );
    }

    return actions;
  }
}