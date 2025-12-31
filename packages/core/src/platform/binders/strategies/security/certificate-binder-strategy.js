/**
 * Certificate Binder Strategy
 * Handles ACM certificate bindings for AWS Certificate Manager
 */
export class CertificateBinderStrategy {
    supportedCapabilities = ['certificate:acm', 'certificate:validation', 'certificate:monitoring'];
    async bind(sourceComponent, targetComponent, binding, context) {
        // Validate inputs
        if (!targetComponent) {
            throw new Error('Target component is required for certificate binding');
        }
        if (!binding?.capability) {
            throw new Error('Binding capability is required');
        }
        if (!binding?.access || !Array.isArray(binding.access)) {
            throw new Error('Binding access array is required');
        }
        if (!context?.region || !context?.accountId) {
            throw new Error('Missing required context properties for ARN construction: region, accountId');
        }
        // Validate access patterns
        const validAccessTypes = ['read', 'write', 'validate', 'monitor', 'use'];
        const invalidAccess = binding.access.filter(a => !validAccessTypes.includes(a));
        if (invalidAccess.length > 0) {
            throw new Error(`Invalid access types for certificate binding: ${invalidAccess.join(', ')}. Valid types: ${validAccessTypes.join(', ')}`);
        }
        if (binding.access.length === 0) {
            throw new Error('Access array cannot be empty for certificate binding');
        }
        const { capability, access } = binding;
        switch (capability) {
            case 'certificate:acm':
                await this.bindToCertificate(sourceComponent, targetComponent, binding, context);
                break;
            case 'certificate:validation':
                await this.bindToValidation(sourceComponent, targetComponent, binding, context);
                break;
            case 'certificate:monitoring':
                await this.bindToMonitoring(sourceComponent, targetComponent, binding, context);
                break;
            default:
                throw new Error(`Unsupported certificate capability: ${capability}`);
        }
    }
    async bindToCertificate(sourceComponent, targetComponent, binding, context) {
        const { access } = binding;
        // Extract certificate information from target component
        const certificateArn = targetComponent.certificateArn;
        const domainName = targetComponent.domainName;
        const validationMethod = targetComponent.validationMethod;
        const keyAlgorithm = targetComponent.keyAlgorithm;
        if (!certificateArn) {
            throw new Error('Target component must provide certificateArn for certificate binding');
        }
        // Grant certificate access permissions
        if (access.includes('read')) {
            sourceComponent.addToRolePolicy({
                Effect: 'Allow',
                Action: [
                    'acm:DescribeCertificate',
                    'acm:ListCertificates',
                    'acm:GetCertificate'
                ],
                Resource: certificateArn
            });
        }
        if (access.includes('use')) {
            sourceComponent.addToRolePolicy({
                Effect: 'Allow',
                Action: [
                    'acm:DescribeCertificate',
                    'acm:ListCertificates'
                ],
                Resource: certificateArn
            });
        }
        if (access.includes('write')) {
            sourceComponent.addToRolePolicy({
                Effect: 'Allow',
                Action: [
                    'acm:DeleteCertificate',
                    'acm:UpdateCertificateOptions',
                    'acm:RenewCertificate'
                ],
                Resource: certificateArn
            });
        }
        // Inject certificate environment variables
        sourceComponent.addEnvironment('CERTIFICATE_ARN', certificateArn);
        sourceComponent.addEnvironment('CERTIFICATE_DOMAIN', domainName);
        sourceComponent.addEnvironment('CERTIFICATE_VALIDATION_METHOD', validationMethod);
        sourceComponent.addEnvironment('CERTIFICATE_KEY_ALGORITHM', keyAlgorithm);
        // Add certificate metadata to component
        sourceComponent.certificateArn = certificateArn;
        sourceComponent.certificateDomain = domainName;
        sourceComponent.certificateValidationMethod = validationMethod;
        sourceComponent.certificateKeyAlgorithm = keyAlgorithm;
        // Configure secure certificate usage
        await this.configureSecureCertificateUsage(sourceComponent, targetComponent, context);
    }
    async bindToValidation(sourceComponent, targetComponent, binding, context) {
        const { access } = binding;
        // Extract validation information
        const certificateArn = targetComponent.certificateArn;
        const validationMethod = targetComponent.validationMethod;
        if (!certificateArn) {
            throw new Error('Target component must provide certificateArn for validation binding');
        }
        // Grant validation permissions
        if (access.includes('validate')) {
            sourceComponent.addToRolePolicy({
                Effect: 'Allow',
                Action: [
                    'acm:DescribeCertificate',
                    'acm:ListCertificates'
                ],
                Resource: certificateArn
            });
            // Add DNS validation permissions if using DNS validation
            if (validationMethod === 'DNS') {
                sourceComponent.addToRolePolicy({
                    Effect: 'Allow',
                    Action: [
                        'route53:GetChange',
                        'route53:ChangeResourceRecordSets',
                        'route53:ListResourceRecordSets'
                    ],
                    Resource: `arn:aws:route53:::hostedzone/*`
                });
            }
        }
        // Inject validation environment variables
        sourceComponent.addEnvironment('CERTIFICATE_VALIDATION_METHOD', validationMethod);
        sourceComponent.addEnvironment('CERTIFICATE_ARN', certificateArn);
        // Configure validation-specific settings
        await this.configureValidationSettings(sourceComponent, targetComponent, context);
    }
    async bindToMonitoring(sourceComponent, targetComponent, binding, context) {
        const { access } = binding;
        // Extract monitoring information
        const certificateArn = targetComponent.certificateArn;
        const domainName = targetComponent.domainName;
        if (!certificateArn) {
            throw new Error('Target component must provide certificateArn for monitoring binding');
        }
        // Grant monitoring permissions
        if (access.includes('monitor')) {
            sourceComponent.addToRolePolicy({
                Effect: 'Allow',
                Action: [
                    'acm:DescribeCertificate',
                    'acm:ListCertificates',
                    'cloudwatch:GetMetricStatistics',
                    'cloudwatch:ListMetrics',
                    'cloudwatch:GetMetricData'
                ],
                Resource: certificateArn
            });
            // Grant CloudWatch alarm permissions
            sourceComponent.addToRolePolicy({
                Effect: 'Allow',
                Action: [
                    'cloudwatch:DescribeAlarms',
                    'cloudwatch:GetMetricStatistics',
                    'cloudwatch:ListMetrics'
                ],
                Resource: `arn:aws:cloudwatch:${context.region}:${context.accountId}:alarm:*`
            });
        }
        // Inject monitoring environment variables
        sourceComponent.addEnvironment('CERTIFICATE_ARN', certificateArn);
        sourceComponent.addEnvironment('CERTIFICATE_DOMAIN', domainName);
        // Configure monitoring-specific settings
        await this.configureMonitoringSettings(sourceComponent, targetComponent, context);
    }
    async configureSecureCertificateUsage(sourceComponent, targetComponent, context) {
        // Add certificate transparency logging configuration
        sourceComponent.addEnvironment('CERTIFICATE_TRANSPARENCY_ENABLED', 'true');
        // Add certificate validation requirements
        sourceComponent.addEnvironment('CERTIFICATE_VALIDATION_REQUIRED', 'true');
        // Configure certificate usage restrictions based on compliance framework
        if (context.complianceFramework === 'fedramp-high') {
            sourceComponent.addEnvironment('CERTIFICATE_STRICT_VALIDATION', 'true');
            sourceComponent.addEnvironment('CERTIFICATE_MONITORING_ENABLED', 'true');
        }
    }
    async configureValidationSettings(sourceComponent, targetComponent, context) {
        // Add validation timeout settings
        sourceComponent.addEnvironment('CERTIFICATE_VALIDATION_TIMEOUT', '300');
        // Add validation retry settings
        sourceComponent.addEnvironment('CERTIFICATE_VALIDATION_RETRIES', '3');
        // Configure validation based on compliance framework
        if (context.complianceFramework === 'fedramp-moderate' || context.complianceFramework === 'fedramp-high') {
            sourceComponent.addEnvironment('CERTIFICATE_STRICT_VALIDATION', 'true');
        }
    }
    async configureMonitoringSettings(sourceComponent, targetComponent, context) {
        // Add monitoring configuration
        sourceComponent.addEnvironment('CERTIFICATE_MONITORING_ENABLED', 'true');
        // Add monitoring thresholds
        sourceComponent.addEnvironment('CERTIFICATE_EXPIRATION_THRESHOLD_DAYS', '30');
        sourceComponent.addEnvironment('CERTIFICATE_STATUS_CHECK_INTERVAL', '3600');
        // Configure monitoring based on compliance framework
        if (context.complianceFramework === 'fedramp-moderate' || context.complianceFramework === 'fedramp-high') {
            sourceComponent.addEnvironment('CERTIFICATE_ENHANCED_MONITORING', 'true');
            sourceComponent.addEnvironment('CERTIFICATE_AUDIT_LOGGING', 'true');
        }
    }
}
//# sourceMappingURL=certificate-binder-strategy.js.map