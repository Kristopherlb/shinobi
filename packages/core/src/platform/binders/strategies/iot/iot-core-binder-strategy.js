/**
 * IoT Core Binder Strategy
 * Handles IoT device management bindings for AWS IoT Core
 */
// Compliance framework branching removed; use binding.options/config instead
export class IoTCoreBinderStrategy {
    supportedCapabilities = ['iot:thing', 'iot:topic', 'iot:rule', 'iot:certificate'];
    async bind(sourceComponent, targetComponent, binding, context) {
        const { capability, access } = binding;
        switch (capability) {
            case 'iot:thing':
                await this.bindToThing(sourceComponent, targetComponent, binding, context);
                break;
            case 'iot:topic':
                await this.bindToTopic(sourceComponent, targetComponent, binding, context);
                break;
            case 'iot:rule':
                await this.bindToRule(sourceComponent, targetComponent, binding, context);
                break;
            case 'iot:certificate':
                await this.bindToCertificate(sourceComponent, targetComponent, binding, context);
                break;
            default:
                throw new Error(`Unsupported IoT Core capability: ${capability}`);
        }
    }
    async bindToThing(sourceComponent, targetComponent, binding, context) {
        const { access } = binding;
        // Grant thing access permissions
        if (access.includes('read')) {
            sourceComponent.addToRolePolicy({
                Effect: 'Allow',
                Action: [
                    'iot:DescribeThing',
                    'iot:ListThings',
                    'iot:DescribeThingGroup',
                    'iot:ListThingGroups'
                ],
                Resource: targetComponent.thingArn
            });
        }
        if (access.includes('write')) {
            sourceComponent.addToRolePolicy({
                Effect: 'Allow',
                Action: [
                    'iot:CreateThing',
                    'iot:DeleteThing',
                    'iot:UpdateThing',
                    'iot:AttachThingPrincipal',
                    'iot:DetachThingPrincipal'
                ],
                Resource: targetComponent.thingArn
            });
        }
        // Grant device shadow permissions
        if (access.includes('shadow')) {
            sourceComponent.addToRolePolicy({
                Effect: 'Allow',
                Action: [
                    'iot:GetThingShadow',
                    'iot:UpdateThingShadow',
                    'iot:DeleteThingShadow'
                ],
                Resource: `arn:aws:iot:${context.region}:${context.accountId}:thing/${targetComponent.thingName}`
            });
        }
        // Inject thing environment variables
        sourceComponent.addEnvironment('IOT_THING_NAME', targetComponent.thingName);
        sourceComponent.addEnvironment('IOT_THING_ARN', targetComponent.thingArn);
        sourceComponent.addEnvironment('IOT_THING_TYPE_NAME', targetComponent.thingTypeName);
        sourceComponent.addEnvironment('IOT_THING_VERSION', targetComponent.version.toString());
        // Configure thing attributes
        if (targetComponent.attributes) {
            Object.entries(targetComponent.attributes).forEach(([key, value]) => {
                sourceComponent.addEnvironment(`IOT_THING_ATTR_${key}`, value);
            });
        }
        // Configure secure access when requested via options/config
        if (binding.options?.requireSecureAccess === true) {
            await this.configureSecureThingAccess(sourceComponent, targetComponent, context);
        }
    }
    async bindToTopic(sourceComponent, targetComponent, binding, context) {
        const { access } = binding;
        // Grant topic access permissions
        if (access.includes('read')) {
            sourceComponent.addToRolePolicy({
                Effect: 'Allow',
                Action: [
                    'iot:DescribeTopic',
                    'iot:ListTopics'
                ],
                Resource: targetComponent.topicArn
            });
        }
        if (access.includes('write')) {
            sourceComponent.addToRolePolicy({
                Effect: 'Allow',
                Action: [
                    'iot:CreateTopic',
                    'iot:DeleteTopic',
                    'iot:UpdateTopic'
                ],
                Resource: targetComponent.topicArn
            });
        }
        // Grant publish/subscribe permissions
        if (access.includes('publish')) {
            sourceComponent.addToRolePolicy({
                Effect: 'Allow',
                Action: [
                    'iot:Publish'
                ],
                Resource: targetComponent.topicArn
            });
        }
        if (access.includes('subscribe')) {
            sourceComponent.addToRolePolicy({
                Effect: 'Allow',
                Action: [
                    'iot:Subscribe',
                    'iot:Receive'
                ],
                Resource: targetComponent.topicArn
            });
        }
        // Inject topic environment variables
        sourceComponent.addEnvironment('IOT_TOPIC_NAME', targetComponent.topicName);
        sourceComponent.addEnvironment('IOT_TOPIC_ARN', targetComponent.topicArn);
        sourceComponent.addEnvironment('IOT_TOPIC_DISPLAY_NAME', targetComponent.displayName);
        // Configure topic metadata
        if (targetComponent.description) {
            sourceComponent.addEnvironment('IOT_TOPIC_DESCRIPTION', targetComponent.description);
        }
    }
    async bindToRule(sourceComponent, targetComponent, binding, context) {
        const { access } = binding;
        // Grant rule access permissions
        if (access.includes('read')) {
            sourceComponent.addToRolePolicy({
                Effect: 'Allow',
                Action: [
                    'iot:GetTopicRule',
                    'iot:ListTopicRules'
                ],
                Resource: targetComponent.ruleArn
            });
        }
        if (access.includes('write')) {
            sourceComponent.addToRolePolicy({
                Effect: 'Allow',
                Action: [
                    'iot:CreateTopicRule',
                    'iot:DeleteTopicRule',
                    'iot:ReplaceTopicRule',
                    'iot:EnableTopicRule',
                    'iot:DisableTopicRule'
                ],
                Resource: targetComponent.ruleArn
            });
        }
        // Grant action permissions
        if (targetComponent.actions) {
            targetComponent.actions.forEach((action) => {
                if (action.s3) {
                    sourceComponent.addToRolePolicy({
                        Effect: 'Allow',
                        Action: [
                            's3:PutObject'
                        ],
                        Resource: action.s3.bucketName
                    });
                }
                else if (action.lambda) {
                    sourceComponent.addToRolePolicy({
                        Effect: 'Allow',
                        Action: [
                            'lambda:InvokeFunction'
                        ],
                        Resource: action.lambda.functionArn
                    });
                }
                else if (action.kinesis) {
                    sourceComponent.addToRolePolicy({
                        Effect: 'Allow',
                        Action: [
                            'kinesis:PutRecord'
                        ],
                        Resource: action.kinesis.streamName
                    });
                }
                else if (action.sns) {
                    sourceComponent.addToRolePolicy({
                        Effect: 'Allow',
                        Action: [
                            'sns:Publish'
                        ],
                        Resource: action.sns.targetArn
                    });
                }
                else if (action.sqs) {
                    sourceComponent.addToRolePolicy({
                        Effect: 'Allow',
                        Action: [
                            'sqs:SendMessage'
                        ],
                        Resource: action.sqs.queueUrl
                    });
                }
            });
        }
        // Inject rule environment variables
        sourceComponent.addEnvironment('IOT_RULE_NAME', targetComponent.ruleName);
        sourceComponent.addEnvironment('IOT_RULE_ARN', targetComponent.ruleArn);
        sourceComponent.addEnvironment('IOT_RULE_STATE', targetComponent.ruleState);
        // Configure rule metadata
        if (targetComponent.sql) {
            sourceComponent.addEnvironment('IOT_RULE_SQL', targetComponent.sql);
        }
        if (targetComponent.description) {
            sourceComponent.addEnvironment('IOT_RULE_DESCRIPTION', targetComponent.description);
        }
        // Configure actions
        if (targetComponent.actions) {
            sourceComponent.addEnvironment('IOT_RULE_ACTIONS', JSON.stringify(targetComponent.actions));
        }
    }
    async bindToCertificate(sourceComponent, targetComponent, binding, context) {
        const { access } = binding;
        // Grant certificate access permissions
        if (access.includes('read')) {
            sourceComponent.addToRolePolicy({
                Effect: 'Allow',
                Action: [
                    'iot:DescribeCertificate',
                    'iot:ListCertificates'
                ],
                Resource: targetComponent.certificateArn
            });
        }
        if (access.includes('write')) {
            sourceComponent.addToRolePolicy({
                Effect: 'Allow',
                Action: [
                    'iot:CreateCertificateFromCsr',
                    'iot:DeleteCertificate',
                    'iot:UpdateCertificate'
                ],
                Resource: targetComponent.certificateArn
            });
        }
        // Grant certificate policy permissions
        if (access.includes('policy')) {
            sourceComponent.addToRolePolicy({
                Effect: 'Allow',
                Action: [
                    'iot:AttachPolicy',
                    'iot:DetachPolicy',
                    'iot:ListAttachedPolicies'
                ],
                Resource: targetComponent.certificateArn
            });
        }
        // Inject certificate environment variables
        sourceComponent.addEnvironment('IOT_CERTIFICATE_ID', targetComponent.certificateId);
        sourceComponent.addEnvironment('IOT_CERTIFICATE_ARN', targetComponent.certificateArn);
        sourceComponent.addEnvironment('IOT_CERTIFICATE_STATUS', targetComponent.status);
        // Configure certificate metadata
        if (targetComponent.creationDate) {
            sourceComponent.addEnvironment('IOT_CERTIFICATE_CREATION_DATE', targetComponent.creationDate);
        }
        if (targetComponent.lastModifiedDate) {
            sourceComponent.addEnvironment('IOT_CERTIFICATE_LAST_MODIFIED', targetComponent.lastModifiedDate);
        }
    }
    async configureSecureThingAccess(sourceComponent, targetComponent, context) {
        // Configure device authentication
        sourceComponent.addEnvironment('IOT_DEVICE_AUTHENTICATION_ENABLED', 'true');
        // Optionally enable mutual TLS when requested
        if (targetComponent?.requireMutualTls === true) {
            sourceComponent.addEnvironment('IOT_MUTUAL_TLS_ENABLED', 'true');
        }
        // Configure device registry
        if (targetComponent.thingTypeName) {
            sourceComponent.addEnvironment('IOT_THING_TYPE_ENABLED', 'true');
        }
        // Configure audit logging
        sourceComponent.addEnvironment('IOT_AUDIT_LOGGING_ENABLED', 'true');
        // Grant CloudWatch Logs permissions
        sourceComponent.addToRolePolicy({
            Effect: 'Allow',
            Action: [
                'logs:CreateLogGroup',
                'logs:CreateLogStream',
                'logs:PutLogEvents'
            ],
            Resource: `arn:aws:logs:${context.region}:${context.accountId}:log-group:/aws/iot/*`
        });
        // Configure device monitoring
        sourceComponent.addEnvironment('IOT_DEVICE_MONITORING_ENABLED', 'true');
        // Grant CloudWatch permissions
        sourceComponent.addToRolePolicy({
            Effect: 'Allow',
            Action: [
                'cloudwatch:PutMetricData',
                'cloudwatch:GetMetricStatistics'
            ],
            Resource: '*'
        });
        // Configure VPC endpoints for private connectivity when requested
        if (targetComponent?.enableVpcEndpoint === true) {
            sourceComponent.addEnvironment('IOT_VPC_ENDPOINT_ENABLED', 'true');
        }
        // Configure device defender for security monitoring
        sourceComponent.addEnvironment('IOT_DEVICE_DEFENDER_ENABLED', 'true');
        // Grant Device Defender permissions
        sourceComponent.addToRolePolicy({
            Effect: 'Allow',
            Action: [
                'iotdevice:GetDeviceMetrics',
                'iotdevice:ListDeviceMetrics'
            ],
            Resource: '*'
        });
    }
}
//# sourceMappingURL=iot-core-binder-strategy.js.map