/**
 * EventBridge Binder Strategy (Unified)
 * Handles event-driven architecture bindings for Amazon EventBridge with mandatory compliance enforcement
 */

import { UnifiedBinderStrategyBase } from '../../../contracts/unified-binder-strategy-base.js';
import type { BindingContext, EnhancedBindingResult, CompatibilityEntry } from '../../../contracts/platform-binding-trigger-spec.js';
import type { IamPolicy } from '../../../contracts/bindings.js';
import { PolicyStatement, Effect } from 'aws-cdk-lib/aws-iam';

export class EventBridgeBinderStrategy extends UnifiedBinderStrategyBase {
  readonly supportedCapabilities = ['eventbridge:event-bus', 'eventbridge:rule', 'eventbridge:connection'];

  getStrategyName(): string {
    return 'EventBridge Binder Strategy';
  }

  canHandle(sourceType: string, targetCapability: string): boolean {
    return this.supportedCapabilities.includes(targetCapability);
  }

  getCompatibilityMatrix(): CompatibilityEntry[] {
    return [
      {
        sourceType: '*',
        targetType: 'eventbridge:event-bus',
        capability: 'eventbridge:event-bus',
        supportedAccess: ['read', 'write', 'readwrite'],
        description: 'Bind to EventBridge event bus for publishing and consuming events',
        examples: ['lambda-api -> eventbridge:event-bus (write)', 'ecs-task -> eventbridge:event-bus (read)']
      },
      {
        sourceType: '*',
        targetType: 'eventbridge:rule',
        capability: 'eventbridge:rule',
        supportedAccess: ['read', 'write', 'readwrite'],
        description: 'Bind to EventBridge rule for event routing and filtering',
        examples: ['lambda-api -> eventbridge:rule (readwrite)']
      },
      {
        sourceType: '*',
        targetType: 'eventbridge:connection',
        capability: 'eventbridge:connection',
        supportedAccess: ['read', 'write', 'readwrite'],
        description: 'Bind to EventBridge connection for API destination integrations',
        examples: ['lambda-api -> eventbridge:connection (read)']
      }
    ];
  }

  protected async doBind(context: BindingContext): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    const { source, target, directive } = context;
    const { capability } = directive;

    // Validate inputs
    if (!target) {
      throw new Error('Target component is required for EventBridge binding');
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
      throw new Error(`Invalid access types for EventBridge binding: ${invalidAccess.join(', ')}. Valid types: ${validAccessTypes.join(', ')}`);
    }
    if (access.length === 0) {
      throw new Error('Access cannot be empty for EventBridge binding');
    }

    // Get target capability data
    const targetCapabilities = target.getCapabilities();
    const targetCapabilityData = targetCapabilities[capability];
    if (!targetCapabilityData) {
      throw new Error(`Target component does not provide capability '${capability}'`);
    }

    // Route to appropriate binding method
    switch (capability) {
      case 'eventbridge:event-bus':
        return await this.bindToEventBus(context, targetCapabilityData, access);
      case 'eventbridge:rule':
        return await this.bindToRule(context, targetCapabilityData, access);
      case 'eventbridge:connection':
        return await this.bindToConnection(context, targetCapabilityData, access);
      default:
        throw new Error(`Unsupported EventBridge capability: ${capability}. Supported capabilities: ${this.supportedCapabilities.join(', ')}`);
    }
  }

  /**
   * Bind to EventBridge event bus
   * 
   * @param context - Binding context
   * @param targetData - Expected structure:
   *   - eventBusArn (required): string - ARN of the event bus
   *   - eventBusName (required): string - Name of the event bus
   *   - policy?: string - Event bus policy JSON
   *   - kmsKeyId?: string - KMS key ID for encryption (when requireSecureAccess is true)
   *   - deadLetterConfig?: { arn: string } - Dead letter queue configuration (when requireSecureAccess is true)
   *   - retryPolicy?: object - Retry policy configuration (when requireSecureAccess is true)
   *   - enableVpcEndpoint?: boolean - Enable VPC endpoint (when requireSecureAccess is true)
   *   - enableEventFiltering?: boolean - Enable event filtering (when requireSecureAccess is true)
   * @param access - Array of access levels (read, write, readwrite)
   */
  private async bindToEventBus(
    context: BindingContext,
    targetData: any,
    access: string[]
  ): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    // Validate required target properties
    if (!targetData?.eventBusArn) {
      throw new Error('Target component missing required eventBusArn property for EventBridge event bus binding');
    }
    if (!targetData?.eventBusName) {
      throw new Error('Target component missing required eventBusName property for EventBridge event bus binding');
    }

    const environmentVariables: Record<string, string> = {};
    const iamPolicies: IamPolicy[] = [];

    // Grant event bus access permissions
    if (access.includes('read') || access.includes('readwrite')) {
      const statement = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          'events:DescribeEventBus',
          'events:ListEventBuses',
          'events:ListRules'
        ],
        resources: [targetData.eventBusArn]
      });
      iamPolicies.push({
        statement,
        description: 'EventBridge event bus read access permissions',
        complianceRequirement: 'Least privilege IAM access'
      });
    }

    if (access.includes('write') || access.includes('readwrite')) {
      const statement = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          'events:CreateEventBus',
          'events:DeleteEventBus',
          'events:PutEvents',
          'events:PutPermission',
          'events:RemovePermission'
        ],
        resources: [targetData.eventBusArn]
      });
      iamPolicies.push({
        statement,
        description: 'EventBridge event bus write access permissions',
        complianceRequirement: 'Least privilege IAM access'
      });
    }

    // Set event bus environment variables
    environmentVariables['EVENTBRIDGE_EVENT_BUS_NAME'] = targetData.eventBusName;
    environmentVariables['EVENTBRIDGE_EVENT_BUS_ARN'] = targetData.eventBusArn;
    if (targetData.policy) {
      environmentVariables['EVENTBRIDGE_EVENT_BUS_POLICY'] = targetData.policy;
    }

    // Configure secure access when requested via options/config
    if (context.directive.options?.requireSecureAccess === true) {
      const secureConfig = await this.buildSecureEventBusAccessConfig(context, targetData);
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
   * Bind to EventBridge rule
   * 
   * @param context - Binding context
   * @param targetData - Expected structure:
   *   - ruleName (required): string - Name of the rule
   *   - ruleArn (required): string - ARN of the rule
   *   - state?: string - Rule state (e.g., 'ENABLED', 'DISABLED')
   *   - scheduleExpression?: string - Schedule expression for scheduled rules
   *   - eventPattern?: object - Event pattern JSON for event-based rules
   *   - targets?: Array<{ arn: string, id?: string }> - Rule targets
   * @param access - Array of access levels (read, write, readwrite)
   */
  private async bindToRule(
    context: BindingContext,
    targetData: any,
    access: string[]
  ): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    // Validate required target properties
    if (!targetData?.ruleName) {
      throw new Error('Target component missing required ruleName property for EventBridge rule binding');
    }
    if (!targetData?.ruleArn) {
      throw new Error('Target component missing required ruleArn property for EventBridge rule binding');
    }

    const environmentVariables: Record<string, string> = {};
    const iamPolicies: IamPolicy[] = [];

    // Grant rule access permissions
    if (access.includes('read') || access.includes('readwrite')) {
      const statement = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          'events:DescribeRule',
          'events:ListRules',
          'events:ListTargetsByRule'
        ],
        resources: [targetData.ruleArn]
      });
      iamPolicies.push({
        statement,
        description: 'EventBridge rule read access permissions',
        complianceRequirement: 'Least privilege IAM access'
      });
    }

    if (access.includes('write') || access.includes('readwrite')) {
      const statement = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          'events:PutRule',
          'events:DeleteRule',
          'events:PutTargets',
          'events:RemoveTargets',
          'events:EnableRule',
          'events:DisableRule'
        ],
        resources: [targetData.ruleArn]
      });
      iamPolicies.push({
        statement,
        description: 'EventBridge rule write access permissions',
        complianceRequirement: 'Least privilege IAM access'
      });
    }

    // Grant target invocation permissions when targets are specified
    if (targetData.targets && Array.isArray(targetData.targets)) {
      for (const target of targetData.targets) {
        if (target.arn) {
          if (target.arn.includes('lambda:')) {
            const statement = new PolicyStatement({
              effect: Effect.ALLOW,
              actions: ['lambda:InvokeFunction'],
              resources: [target.arn]
            });
            iamPolicies.push({
              statement,
              description: 'EventBridge rule Lambda target invocation permissions',
              complianceRequirement: 'Least privilege IAM access'
            });
          } else if (target.arn.includes('sqs:')) {
            const statement = new PolicyStatement({
              effect: Effect.ALLOW,
              actions: ['sqs:SendMessage'],
              resources: [target.arn]
            });
            iamPolicies.push({
              statement,
              description: 'EventBridge rule SQS target permissions',
              complianceRequirement: 'Least privilege IAM access'
            });
          } else if (target.arn.includes('sns:')) {
            const statement = new PolicyStatement({
              effect: Effect.ALLOW,
              actions: ['sns:Publish'],
              resources: [target.arn]
            });
            iamPolicies.push({
              statement,
              description: 'EventBridge rule SNS target permissions',
              complianceRequirement: 'Least privilege IAM access'
            });
          }
        }
      }
    }

    // Set rule environment variables
    environmentVariables['EVENTBRIDGE_RULE_NAME'] = targetData.ruleName;
    environmentVariables['EVENTBRIDGE_RULE_ARN'] = targetData.ruleArn;
    if (targetData.state) {
      environmentVariables['EVENTBRIDGE_RULE_STATE'] = targetData.state;
    }
    if (targetData.scheduleExpression) {
      environmentVariables['EVENTBRIDGE_RULE_SCHEDULE_EXPRESSION'] = targetData.scheduleExpression;
    }
    if (targetData.eventPattern) {
      environmentVariables['EVENTBRIDGE_EVENT_PATTERN'] = JSON.stringify(targetData.eventPattern);
    }
    if (targetData.targets && Array.isArray(targetData.targets)) {
      environmentVariables['EVENTBRIDGE_TARGETS'] = JSON.stringify(targetData.targets);
    }

    return {
      environmentVariables,
      iamPolicies,
      securityGroupRules: []
    };
  }

  /**
   * Bind to EventBridge connection
   * 
   * @param context - Binding context
   * @param targetData - Expected structure:
   *   - connectionName (required): string - Name of the connection
   *   - connectionArn (required): string - ARN of the connection
   *   - connectionState?: string - Connection state (e.g., 'CREATING', 'AUTHORIZED', 'DEAUTHORIZED')
   *   - authorizationType?: string - Authorization type (e.g., 'API_KEY', 'BASIC', 'OAUTH_CLIENT_CREDENTIALS')
   *   - authParameters?: object - Authorization parameters
   *   - apiDestinationArn?: string - API destination ARN
   *   - apiDestination?: { name?: string, endpoint?: string, httpMethod?: string, invocationRateLimitPerSecond?: number } - API destination details
   * @param access - Array of access levels (read, write, readwrite)
   */
  private async bindToConnection(
    context: BindingContext,
    targetData: any,
    access: string[]
  ): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    // Validate required target properties
    if (!targetData?.connectionName) {
      throw new Error('Target component missing required connectionName property for EventBridge connection binding');
    }
    if (!targetData?.connectionArn) {
      throw new Error('Target component missing required connectionArn property for EventBridge connection binding');
    }

    const environmentVariables: Record<string, string> = {};
    const iamPolicies: IamPolicy[] = [];

    // Grant connection access permissions
    if (access.includes('read') || access.includes('readwrite')) {
      const statement = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          'events:DescribeConnection',
          'events:ListConnections'
        ],
        resources: [targetData.connectionArn]
      });
      iamPolicies.push({
        statement,
        description: 'EventBridge connection read access permissions',
        complianceRequirement: 'Least privilege IAM access'
      });
    }

    if (access.includes('write') || access.includes('readwrite')) {
      const statement = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          'events:CreateConnection',
          'events:DeleteConnection',
          'events:UpdateConnection'
        ],
        resources: [targetData.connectionArn]
      });
      iamPolicies.push({
        statement,
        description: 'EventBridge connection write access permissions',
        complianceRequirement: 'Least privilege IAM access'
      });
    }

    // Grant API destination permissions if specified
    if (targetData.apiDestinationArn) {
      const statement = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          'events:DescribeApiDestination',
          'events:ListApiDestinations',
          'events:UpdateApiDestination'
        ],
        resources: [targetData.apiDestinationArn]
      });
      iamPolicies.push({
        statement,
        description: 'EventBridge API destination permissions',
        complianceRequirement: 'Least privilege IAM access'
      });
    }

    // Set connection environment variables
    environmentVariables['EVENTBRIDGE_CONNECTION_NAME'] = targetData.connectionName;
    environmentVariables['EVENTBRIDGE_CONNECTION_ARN'] = targetData.connectionArn;
    if (targetData.connectionState) {
      environmentVariables['EVENTBRIDGE_CONNECTION_STATE'] = targetData.connectionState;
    }
    if (targetData.authorizationType) {
      environmentVariables['EVENTBRIDGE_CONNECTION_AUTHORIZATION_TYPE'] = targetData.authorizationType;
    }
    if (targetData.authParameters) {
      environmentVariables['EVENTBRIDGE_AUTH_PARAMETERS'] = JSON.stringify(targetData.authParameters);
    }
    if (targetData.apiDestinationArn) {
      environmentVariables['EVENTBRIDGE_API_DESTINATION_ARN'] = targetData.apiDestinationArn;
    }
    // Add API destination details if provided
    if (targetData.apiDestination) {
      if (targetData.apiDestination.name) {
        environmentVariables['EVENTBRIDGE_API_DESTINATION_NAME'] = targetData.apiDestination.name;
      }
      if (targetData.apiDestination.endpoint) {
        environmentVariables['EVENTBRIDGE_API_DESTINATION_ENDPOINT'] = targetData.apiDestination.endpoint;
      }
      if (targetData.apiDestination.httpMethod) {
        environmentVariables['EVENTBRIDGE_API_DESTINATION_HTTP_METHOD'] = targetData.apiDestination.httpMethod;
      }
      if (targetData.apiDestination.invocationRateLimitPerSecond) {
        environmentVariables['EVENTBRIDGE_API_DESTINATION_RATE_LIMIT'] = targetData.apiDestination.invocationRateLimitPerSecond.toString();
      }
    }

    return {
      environmentVariables,
      iamPolicies,
      securityGroupRules: []
    };
  }

  /**
   * Build secure access configuration for EventBridge event bus
   * 
   * @param context - Binding context
   * @param targetData - Expected structure:
   *   - eventBusArn: string - ARN of the event bus
   *   - kmsKeyId?: string - KMS key ID for encryption
   *   - deadLetterConfig?: { arn: string } - Dead letter queue configuration
   *   - retryPolicy?: object - Retry policy configuration
   *   - enableVpcEndpoint?: boolean - Enable VPC endpoint
   *   - enableEventFiltering?: boolean - Enable event filtering
   * @returns Secure access configuration with environment variables and IAM policies
   */
  private async buildSecureEventBusAccessConfig(
    context: BindingContext,
    targetData: any
  ): Promise<{ environmentVariables: Record<string, string>; iamPolicies: IamPolicy[] }> {
    const environmentVariables: Record<string, string> = {};
    const iamPolicies: IamPolicy[] = [];
    const region = (context.target.context as any)?.region || process.env.AWS_REGION || 'us-east-1';
    const accountId = (context.target.context as any)?.accountId || '*';

    // Configure encryption at rest
    if (targetData.kmsKeyId) {
      environmentVariables['EVENTBRIDGE_KMS_KEY_ID'] = targetData.kmsKeyId;

      // Grant KMS permissions
      const kmsStatement = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          'kms:Decrypt',
          'kms:GenerateDataKey'
        ],
        resources: [targetData.kmsKeyId]
      });
      iamPolicies.push({
        statement: kmsStatement,
        description: 'KMS permissions for EventBridge encryption',
        complianceRequirement: 'Encryption at rest'
      });
    }

    // Configure dead letter queue for failed events
    if (targetData.deadLetterConfig?.arn) {
      const dlqArn = targetData.deadLetterConfig.arn;
      environmentVariables['EVENTBRIDGE_DEAD_LETTER_QUEUE_ARN'] = dlqArn;

      // Grant SQS permissions for dead letter queue (if target is SQS)
      if (dlqArn.includes(':sqs:') || dlqArn.startsWith('arn:aws:sqs:')) {
        const sqsStatement = new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
            'sqs:SendMessage',
            'sqs:GetQueueAttributes'
          ],
          resources: [dlqArn]
        });
        iamPolicies.push({
          statement: sqsStatement,
          description: 'SQS permissions for EventBridge dead letter queue',
          complianceRequirement: 'Resilience and error handling'
        });
      }
    }

    // Configure retry policy
    if (targetData.retryPolicy) {
      environmentVariables['EVENTBRIDGE_RETRY_POLICY'] = JSON.stringify(targetData.retryPolicy);
    }

    // Configure audit logging for compliance
    environmentVariables['EVENTBRIDGE_AUDIT_LOGGING_ENABLED'] = 'true';

    // Grant CloudWatch Logs permissions for audit logging
    const logsStatement = new PolicyStatement({
      effect: Effect.ALLOW,
      actions: [
        'logs:CreateLogGroup',
        'logs:CreateLogStream',
        'logs:PutLogEvents'
      ],
      resources: [`arn:aws:logs:${region}:${accountId}:log-group:/aws/events/*`]
    });
    iamPolicies.push({
      statement: logsStatement,
      description: 'CloudWatch Logs permissions for EventBridge audit logging',
      complianceRequirement: 'Audit logging and compliance'
    });

    // Configure VPC endpoints when requested
    if (targetData.enableVpcEndpoint === true) {
      environmentVariables['EVENTBRIDGE_VPC_ENDPOINT_ENABLED'] = 'true';
    }

    // Configure event filtering when requested
    if (targetData.enableEventFiltering === true) {
      environmentVariables['EVENTBRIDGE_EVENT_FILTERING_ENABLED'] = 'true';
    }

    return { environmentVariables, iamPolicies };
  }
}