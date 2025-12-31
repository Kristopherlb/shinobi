/**
 * Secrets Manager Binder Strategy
 * Handles secrets management bindings for AWS Secrets Manager
 */
// Compliance framework branching removed; use binding.options/config instead
export class SecretsManagerBinderStrategy {
    supportedCapabilities = ['secretsmanager:secret', 'secretsmanager:rotation'];
    async bind(sourceComponent, targetComponent, binding, context) {
        const { capability, access } = binding;
        switch (capability) {
            case 'secretsmanager:secret':
                await this.bindToSecret(sourceComponent, targetComponent, binding, context);
                break;
            case 'secretsmanager:rotation':
                await this.bindToRotation(sourceComponent, targetComponent, binding, context);
                break;
            default:
                throw new Error(`Unsupported Secrets Manager capability: ${capability}`);
        }
    }
    async bindToSecret(sourceComponent, targetComponent, binding, context) {
        const { access } = binding;
        // Grant secret access permissions
        if (access.includes('read')) {
            sourceComponent.addToRolePolicy({
                Effect: 'Allow',
                Action: [
                    'secretsmanager:GetSecretValue',
                    'secretsmanager:DescribeSecret'
                ],
                Resource: targetComponent.secretArn
            });
        }
        if (access.includes('write')) {
            sourceComponent.addToRolePolicy({
                Effect: 'Allow',
                Action: [
                    'secretsmanager:CreateSecret',
                    'secretsmanager:UpdateSecret',
                    'secretsmanager:DeleteSecret',
                    'secretsmanager:PutSecretValue'
                ],
                Resource: targetComponent.secretArn
            });
        }
        // Grant additional permissions for secret management
        if (access.includes('admin')) {
            sourceComponent.addToRolePolicy({
                Effect: 'Allow',
                Action: [
                    'secretsmanager:RestoreSecret',
                    'secretsmanager:TagResource',
                    'secretsmanager:UntagResource',
                    'secretsmanager:GetResourcePolicy',
                    'secretsmanager:PutResourcePolicy',
                    'secretsmanager:DeleteResourcePolicy'
                ],
                Resource: targetComponent.secretArn
            });
        }
        // Inject secret environment variables
        sourceComponent.addEnvironment('SECRETS_MANAGER_SECRET_ARN', targetComponent.secretArn);
        sourceComponent.addEnvironment('SECRETS_MANAGER_SECRET_NAME', targetComponent.name);
        sourceComponent.addEnvironment('SECRETS_MANAGER_SECRET_DESCRIPTION', targetComponent.description);
        // Configure secret metadata
        if (targetComponent.versionId) {
            sourceComponent.addEnvironment('SECRETS_MANAGER_VERSION_ID', targetComponent.versionId);
        }
        if (targetComponent.versionStages) {
            sourceComponent.addEnvironment('SECRETS_MANAGER_VERSION_STAGES', targetComponent.versionStages.join(','));
        }
        // Configure secure access when requested via options/config
        if (binding.options?.requireSecureAccess === true) {
            await this.configureSecureSecretAccess(sourceComponent, targetComponent, context);
        }
    }
    async bindToRotation(sourceComponent, targetComponent, binding, context) {
        const { access } = binding;
        // Grant rotation access permissions
        if (access.includes('read')) {
            sourceComponent.addToRolePolicy({
                Effect: 'Allow',
                Action: [
                    'secretsmanager:DescribeSecret',
                    'secretsmanager:GetSecretValue'
                ],
                Resource: targetComponent.secretArn
            });
        }
        if (access.includes('write')) {
            sourceComponent.addToRolePolicy({
                Effect: 'Allow',
                Action: [
                    'secretsmanager:RotateSecret',
                    'secretsmanager:UpdateSecret',
                    'secretsmanager:PutSecretValue'
                ],
                Resource: targetComponent.secretArn
            });
        }
        // Grant Lambda permissions for rotation function
        if (targetComponent.rotationLambdaArn) {
            sourceComponent.addToRolePolicy({
                Effect: 'Allow',
                Action: [
                    'lambda:InvokeFunction'
                ],
                Resource: targetComponent.rotationLambdaArn
            });
        }
        // Grant database permissions for rotation
        if (targetComponent.rotationRules) {
            const rules = targetComponent.rotationRules;
            sourceComponent.addEnvironment('SECRETS_MANAGER_ROTATION_ENABLED', 'true');
            sourceComponent.addEnvironment('SECRETS_MANAGER_ROTATION_DAYS', rules.automaticallyAfterDays.toString());
            if (rules.duration) {
                sourceComponent.addEnvironment('SECRETS_MANAGER_ROTATION_DURATION', rules.duration);
            }
        }
        // Inject rotation environment variables
        sourceComponent.addEnvironment('SECRETS_MANAGER_ROTATION_LAMBDA_ARN', targetComponent.rotationLambdaArn);
        sourceComponent.addEnvironment('SECRETS_MANAGER_ROTATION_SCHEDULE', targetComponent.rotationSchedule);
    }
    async configureSecureSecretAccess(sourceComponent, targetComponent, context) {
        // Configure KMS encryption
        if (targetComponent.kmsKeyId) {
            sourceComponent.addEnvironment('SECRETS_MANAGER_KMS_KEY_ID', targetComponent.kmsKeyId);
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
        // Configure resource-based policy for access control
        if (targetComponent.resourcePolicy) {
            sourceComponent.addEnvironment('SECRETS_MANAGER_RESOURCE_POLICY', JSON.stringify(targetComponent.resourcePolicy));
        }
        // Configure automatic rotation when explicitly required
        if (targetComponent?.autoRotationDays) {
            sourceComponent.addEnvironment('SECRETS_MANAGER_AUTO_ROTATION_REQUIRED', 'true');
            sourceComponent.addEnvironment('SECRETS_MANAGER_ROTATION_INTERVAL_DAYS', String(targetComponent.autoRotationDays));
        }
        // Configure audit logging
        sourceComponent.addEnvironment('SECRETS_MANAGER_AUDIT_LOGGING_ENABLED', 'true');
        // Grant CloudTrail permissions for audit logging
        sourceComponent.addToRolePolicy({
            Effect: 'Allow',
            Action: [
                'logs:CreateLogGroup',
                'logs:CreateLogStream',
                'logs:PutLogEvents'
            ],
            Resource: `arn:aws:logs:${context.region}:${context.accountId}:log-group:/aws/secretsmanager/*`
        });
    }
}
//# sourceMappingURL=secrets-manager-binder-strategy.js.map