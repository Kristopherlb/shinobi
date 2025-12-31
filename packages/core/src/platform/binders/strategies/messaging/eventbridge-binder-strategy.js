/**
 * EventBridge Binder Strategy
 * Handles event-driven architecture bindings for Amazon EventBridge
 */
// Compliance framework branching removed; use binding.options/config instead
export class EventBridgeBinderStrategy {
    supportedCapabilities = ['eventbridge:event-bus', 'eventbridge:rule', 'eventbridge:connection'];
    async bind(sourceComponent, targetComponent, binding, context) {
        const { capability, access } = binding;
        switch (capability) {
            case 'eventbridge:event-bus':
                await this.bindToEventBus(sourceComponent, targetComponent, binding, context);
                break;
            case 'eventbridge:rule':
                await this.bindToRule(sourceComponent, targetComponent, binding, context);
                break;
            case 'eventbridge:connection':
                await this.bindToConnection(sourceComponent, targetComponent, binding, context);
                break;
            default:
                throw new Error(`Unsupported EventBridge capability: ${capability}`);
        }
    }
    async bindToEventBus(sourceComponent, targetComponent, binding, context) {
        const { access } = binding;
        // Grant event bus access permissions
        if (access.includes('read')) {
            sourceComponent.addToRolePolicy({
                Effect: 'Allow',
                Action: [
                    'events:DescribeEventBus',
                    'events:ListEventBuses',
                    'events:ListRules'
                ],
                Resource: targetComponent.eventBusArn
            });
        }
        if (access.includes('write')) {
            sourceComponent.addToRolePolicy({
                Effect: 'Allow',
                Action: [
                    'events:CreateEventBus',
                    'events:DeleteEventBus',
                    'events:PutEvents',
                    'events:PutPermission',
                    'events:RemovePermission'
                ],
                Resource: targetComponent.eventBusArn
            });
        }
        // Inject event bus environment variables
        sourceComponent.addEnvironment('EVENTBRIDGE_EVENT_BUS_NAME', targetComponent.eventBusName);
        sourceComponent.addEnvironment('EVENTBRIDGE_EVENT_BUS_ARN', targetComponent.eventBusArn);
        sourceComponent.addEnvironment('EVENTBRIDGE_EVENT_BUS_POLICY', targetComponent.policy);
        // Configure secure access when requested via options/config
        if (binding.options?.requireSecureAccess === true) {
            await this.configureSecureEventBusAccess(sourceComponent, targetComponent, context);
        }
    }
    async bindToRule(sourceComponent, targetComponent, binding, context) {
        const { access } = binding;
        // Grant rule access permissions
        if (access.includes('read')) {
            sourceComponent.addToRolePolicy({
                Effect: 'Allow',
                Action: [
                    'events:DescribeRule',
                    'events:ListRules',
                    'events:ListTargetsByRule'
                ],
                Resource: targetComponent.ruleArn
            });
        }
        if (access.includes('write')) {
            sourceComponent.addToRolePolicy({
                Effect: 'Allow',
                Action: [
                    'events:PutRule',
                    'events:DeleteRule',
                    'events:PutTargets',
                    'events:RemoveTargets',
                    'events:EnableRule',
                    'events:DisableRule'
                ],
                Resource: targetComponent.ruleArn
            });
        }
        // Grant target invocation permissions
        if (access.includes('invoke')) {
            targetComponent.targets?.forEach((target) => {
                if (target.arn.includes('lambda:')) {
                    sourceComponent.addToRolePolicy({
                        Effect: 'Allow',
                        Action: [
                            'lambda:InvokeFunction'
                        ],
                        Resource: target.arn
                    });
                }
                else if (target.arn.includes('sqs:')) {
                    sourceComponent.addToRolePolicy({
                        Effect: 'Allow',
                        Action: [
                            'sqs:SendMessage'
                        ],
                        Resource: target.arn
                    });
                }
                else if (target.arn.includes('sns:')) {
                    sourceComponent.addToRolePolicy({
                        Effect: 'Allow',
                        Action: [
                            'sns:Publish'
                        ],
                        Resource: target.arn
                    });
                }
            });
        }
        // Inject rule environment variables
        sourceComponent.addEnvironment('EVENTBRIDGE_RULE_NAME', targetComponent.ruleName);
        sourceComponent.addEnvironment('EVENTBRIDGE_RULE_ARN', targetComponent.ruleArn);
        sourceComponent.addEnvironment('EVENTBRIDGE_RULE_STATE', targetComponent.state);
        sourceComponent.addEnvironment('EVENTBRIDGE_RULE_SCHEDULE_EXPRESSION', targetComponent.scheduleExpression);
        // Configure event pattern
        if (targetComponent.eventPattern) {
            sourceComponent.addEnvironment('EVENTBRIDGE_EVENT_PATTERN', JSON.stringify(targetComponent.eventPattern));
        }
        // Configure targets
        if (targetComponent.targets) {
            sourceComponent.addEnvironment('EVENTBRIDGE_TARGETS', JSON.stringify(targetComponent.targets));
        }
    }
    async bindToConnection(sourceComponent, targetComponent, binding, context) {
        const { access } = binding;
        // Grant connection access permissions
        if (access.includes('read')) {
            sourceComponent.addToRolePolicy({
                Effect: 'Allow',
                Action: [
                    'events:DescribeConnection',
                    'events:ListConnections'
                ],
                Resource: targetComponent.connectionArn
            });
        }
        if (access.includes('write')) {
            sourceComponent.addToRolePolicy({
                Effect: 'Allow',
                Action: [
                    'events:CreateConnection',
                    'events:DeleteConnection',
                    'events:UpdateConnection'
                ],
                Resource: targetComponent.connectionArn
            });
        }
        // Grant API destination permissions
        if (targetComponent.apiDestinationArn) {
            sourceComponent.addToRolePolicy({
                Effect: 'Allow',
                Action: [
                    'events:DescribeApiDestination',
                    'events:ListApiDestinations',
                    'events:UpdateApiDestination'
                ],
                Resource: targetComponent.apiDestinationArn
            });
        }
        // Inject connection environment variables
        sourceComponent.addEnvironment('EVENTBRIDGE_CONNECTION_NAME', targetComponent.connectionName);
        sourceComponent.addEnvironment('EVENTBRIDGE_CONNECTION_ARN', targetComponent.connectionArn);
        sourceComponent.addEnvironment('EVENTBRIDGE_CONNECTION_STATE', targetComponent.connectionState);
        sourceComponent.addEnvironment('EVENTBRIDGE_CONNECTION_AUTHORIZATION_TYPE', targetComponent.authorizationType);
        // Configure authorization parameters
        if (targetComponent.authParameters) {
            sourceComponent.addEnvironment('EVENTBRIDGE_AUTH_PARAMETERS', JSON.stringify(targetComponent.authParameters));
        }
        // Configure API destination
        if (targetComponent.apiDestinationArn) {
            sourceComponent.addEnvironment('EVENTBRIDGE_API_DESTINATION_ARN', targetComponent.apiDestinationArn);
        }
    }
    async configureSecureEventBusAccess(sourceComponent, targetComponent, context) {
        // Configure encryption at rest
        if (targetComponent.kmsKeyId) {
            sourceComponent.addEnvironment('EVENTBRIDGE_KMS_KEY_ID', targetComponent.kmsKeyId);
            // Grant KMS permissions
            sourceComponent.addToRolePolicy({
                Effect: 'Allow',
                Action: [
                    'kms:Decrypt',
                    'kms:GenerateDataKey'
                ],
                Resource: targetComponent.kmsKeyId
            });
        }
        // Configure dead letter queue for failed events
        if (targetComponent.deadLetterConfig) {
            sourceComponent.addEnvironment('EVENTBRIDGE_DEAD_LETTER_QUEUE_ARN', targetComponent.deadLetterConfig.arn);
            // Grant SQS permissions for dead letter queue
            sourceComponent.addToRolePolicy({
                Effect: 'Allow',
                Action: [
                    'sqs:SendMessage'
                ],
                Resource: targetComponent.deadLetterConfig.arn
            });
        }
        // Configure retry policy
        if (targetComponent.retryPolicy) {
            sourceComponent.addEnvironment('EVENTBRIDGE_RETRY_POLICY', JSON.stringify(targetComponent.retryPolicy));
        }
        // Configure audit logging for compliance
        sourceComponent.addEnvironment('EVENTBRIDGE_AUDIT_LOGGING_ENABLED', 'true');
        // Grant CloudTrail permissions for audit logging
        sourceComponent.addToRolePolicy({
            Effect: 'Allow',
            Action: [
                'logs:CreateLogGroup',
                'logs:CreateLogStream',
                'logs:PutLogEvents'
            ],
            Resource: `arn:aws:logs:${context.region}:${context.accountId}:log-group:/aws/events/*`
        });
        // Configure VPC endpoints when requested
        if (targetComponent?.enableVpcEndpoint === true) {
            sourceComponent.addEnvironment('EVENTBRIDGE_VPC_ENDPOINT_ENABLED', 'true');
        }
        // Configure event filtering when requested
        if (targetComponent?.enableEventFiltering === true) {
            sourceComponent.addEnvironment('EVENTBRIDGE_EVENT_FILTERING_ENABLED', 'true');
        }
    }
}
//# sourceMappingURL=eventbridge-binder-strategy.js.map