/**
 * Certificate Binder Strategy (Unified)
 * Handles ACM certificate bindings for AWS Certificate Manager with mandatory compliance enforcement
 */

import { UnifiedBinderStrategyBase, resolveActions } from '@shinobi/core';
import type { BindingContext, EnhancedBindingResult, CompatibilityEntry } from '@shinobi/core';
import type { IamPolicy } from '@shinobi/core';
import { PolicyStatement, Effect } from 'aws-cdk-lib/aws-iam';

export class CertificateBinderStrategy extends UnifiedBinderStrategyBase {
  readonly supportedCapabilities = ['certificate:acm', 'certificate:validation', 'certificate:monitoring'];

  getStrategyName(): string {
    return 'Certificate Binder Strategy';
  }

  canHandle(sourceType: string, targetCapability: string): boolean {
    return this.supportedCapabilities.includes(targetCapability);
  }

  getCompatibilityMatrix(): CompatibilityEntry[] {
    return [
      {
        sourceType: '*',
        targetType: 'certificate:acm',
        capability: 'certificate:acm',
        supportedAccess: ['read', 'write'],
        description: 'Bind to ACM certificate for SSL/TLS termination',
        examples: ['api-gateway -> certificate:acm (read)', 'alb -> certificate:acm (read)']
      },
      {
        sourceType: '*',
        targetType: 'certificate:validation',
        capability: 'certificate:validation',
        supportedAccess: ['read'],
        description: 'Bind to certificate validation process',
        examples: ['lambda -> certificate:validation (read)']
      },
      {
        sourceType: '*',
        targetType: 'certificate:monitoring',
        capability: 'certificate:monitoring',
        supportedAccess: ['read'],
        description: 'Bind to certificate monitoring and expiration tracking',
        examples: ['lambda -> certificate:monitoring (read)']
      }
    ];
  }

  protected async doBind(context: BindingContext): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    const { source, target, directive } = context;
    const { capability } = directive;

    // Validate inputs
    if (!target) {
      throw new Error('Target component is required for certificate binding');
    }
    if (!capability) {
      throw new Error('Binding capability is required');
    }

    // Get target capability data
    const targetCapabilities = target.getCapabilities();
    const targetCapabilityData = targetCapabilities[capability];
    if (!targetCapabilityData) {
      throw new Error(`Target component does not provide capability '${capability}'`);
    }

    // Normalize access to array (directive.access is a single AccessLevel string)
    const access = directive.access ? [directive.access] : [];

    // Validate access patterns
    const validAccessTypes = ['read', 'write', 'validate', 'monitor', 'use'];
    const invalidAccess = access.filter(a => !validAccessTypes.includes(a));
    if (invalidAccess.length > 0) {
      throw new Error(`Invalid access types for certificate binding: ${invalidAccess.join(', ')}. Valid types: ${validAccessTypes.join(', ')}`);
    }

    // Route to appropriate binding method
    switch (capability) {
      case 'certificate:acm':
        return await this.bindToCertificate(context, targetCapabilityData, access);
      case 'certificate:validation':
        return await this.bindToValidation(context, targetCapabilityData, access);
      case 'certificate:monitoring':
        return await this.bindToMonitoring(context, targetCapabilityData, access);
      default:
        throw new Error(`Unsupported certificate capability: ${capability}. Supported capabilities: ${this.supportedCapabilities.join(', ')}`);
    }
  }

  /**
   * Bind to ACM certificate
   * 
   * @param context - Binding context
   * @param targetData - Expected structure:
   *   - certificateArn (required): string - ARN of the certificate (e.g., 'arn:aws:acm:region:account:certificate/id')
   *   - domainName?: string - Domain name for the certificate (e.g., 'example.com')
   *   - validationMethod?: string - Validation method ('DNS' or 'EMAIL')
   *   - keyAlgorithm?: string - Key algorithm used (e.g., 'RSA_2048', 'EC_prime256v1')
   * @param access - Array of access levels:
   *   - 'read': Read certificate metadata and details
   *   - 'write': Update, renew, or delete certificate
   *   - 'use': Use certificate for SSL/TLS termination (ALB, API Gateway, CloudFront) - same permissions as 'read'
   */
  private async bindToCertificate(
    context: BindingContext,
    targetData: any,
    access: string[]
  ): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    if (!targetData?.certificateArn) {
      throw new Error('Target component must provide certificateArn for certificate binding');
    }

    const environmentVariables: Record<string, string> = {};
    const iamPolicies: IamPolicy[] = [];

    // Handle granular actions override or use multi-statement approach
    if (context.directive.actions) {
      // For certificate binder, access is an array, so we need to get the first one or use a default
      const accessLevel = Array.isArray(access) ? access[0] : access;
      const resolvedActions = resolveActions(
        context.directive,
        context,
        (acc: string) => this.getCertificateActionsForAccess(acc),
        'acm'
      );

      const statement = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: resolvedActions,
        resources: [targetData.certificateArn]
      });
      iamPolicies.push({
        statement,
        description: 'ACM certificate access permissions (granular actions)',
        complianceRequirement: 'Encryption in transit'
      });
    } else {
      // Coarse access levels: use multi-statement approach (backward compatible)
      // Grant certificate access permissions
      if (access.includes('read') || access.includes('use')) {
        const statement = new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
            'acm:DescribeCertificate',
            'acm:ListCertificates',
            'acm:GetCertificate'
          ],
          resources: [targetData.certificateArn]
        });
        iamPolicies.push({
          statement,
          description: 'ACM certificate read/use access permissions',
          complianceRequirement: 'Encryption in transit'
        });
      }

      if (access.includes('write')) {
        const statement = new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
            'acm:DeleteCertificate',
            'acm:UpdateCertificateOptions',
            'acm:RenewCertificate'
          ],
          resources: [targetData.certificateArn]
        });
        iamPolicies.push({
          statement,
          description: 'ACM certificate write access permissions',
          complianceRequirement: 'Least privilege IAM access'
        });
      }
    }

    // Set certificate environment variables
    environmentVariables['CERTIFICATE_ARN'] = targetData.certificateArn;
    if (targetData.domainName) {
      environmentVariables['CERTIFICATE_DOMAIN'] = targetData.domainName;
    }
    if (targetData.validationMethod) {
      environmentVariables['CERTIFICATE_VALIDATION_METHOD'] = targetData.validationMethod;
    }
    if (targetData.keyAlgorithm) {
      environmentVariables['CERTIFICATE_KEY_ALGORITHM'] = targetData.keyAlgorithm;
    }

    // Configure secure certificate usage (compliance-driven via options/config, no framework branching)
    const secureConfig = await this.buildSecureCertificateConfig(context, targetData);
    Object.assign(environmentVariables, secureConfig.environmentVariables);
    iamPolicies.push(...secureConfig.iamPolicies);

    return {
      environmentVariables,
      iamPolicies,
      securityGroupRules: []
    };
  }

  /**
   * Bind to certificate validation
   * 
   * @param context - Binding context
   * @param targetData - Expected structure:
   *   - certificateArn (required): string - ARN of the certificate
   *   - validationMethod?: string - Validation method ('DNS' or 'EMAIL'). If 'DNS', Route53 permissions will be granted.
   * @param access - Array of access levels (validate)
   */
  private async bindToValidation(
    context: BindingContext,
    targetData: any,
    access: string[]
  ): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    if (!targetData?.certificateArn) {
      throw new Error('Target component must provide certificateArn for validation binding');
    }

    const environmentVariables: Record<string, string> = {};
    const iamPolicies: IamPolicy[] = [];

    // Grant validation permissions (read maps to validate for validation capability)
    if (access.includes('validate') || access.includes('read')) {
      const statement = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          'acm:DescribeCertificate',
          'acm:ListCertificates'
        ],
        resources: [targetData.certificateArn]
      });
      iamPolicies.push({
        statement,
        description: 'ACM certificate validation permissions',
        complianceRequirement: 'Certificate validation and compliance'
      });

      // Add DNS validation permissions if using DNS validation
      if (targetData.validationMethod === 'DNS') {
        const dnsStatement = new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
            'route53:GetChange',
            'route53:ChangeResourceRecordSets',
            'route53:ListResourceRecordSets'
          ],
          resources: ['arn:aws:route53:::hostedzone/*']
        });
        iamPolicies.push({
          statement: dnsStatement,
          description: 'Route53 permissions for DNS certificate validation',
          complianceRequirement: 'Certificate validation automation'
        });
      }
    }

    // Set validation environment variables
    if (targetData.validationMethod) {
      environmentVariables['CERTIFICATE_VALIDATION_METHOD'] = targetData.validationMethod;
    }
    environmentVariables['CERTIFICATE_ARN'] = targetData.certificateArn;

    // Configure validation-specific settings (compliance-driven via options/config)
    const validationConfig = await this.buildValidationConfig(context, targetData);
    Object.assign(environmentVariables, validationConfig.environmentVariables);

    return {
      environmentVariables,
      iamPolicies,
      securityGroupRules: []
    };
  }

  /**
   * Bind to certificate monitoring
   * 
   * @param context - Binding context
   * @param targetData - Expected structure:
   *   - certificateArn (required): string - ARN of the certificate
   *   - domainName?: string - Domain name for the certificate
   * @param access - Array of access levels (monitor) - Grants CloudWatch and EventBridge permissions for expiration tracking and alerts
   */
  private async bindToMonitoring(
    context: BindingContext,
    targetData: any,
    access: string[]
  ): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    if (!targetData?.certificateArn) {
      throw new Error('Target component must provide certificateArn for monitoring binding');
    }

    const environmentVariables: Record<string, string> = {};
    const iamPolicies: IamPolicy[] = [];

    // Grant monitoring permissions (read maps to monitor for monitoring capability)
    if (access.includes('monitor') || access.includes('read')) {
      const statement = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          'acm:DescribeCertificate',
          'acm:ListCertificates',
          'cloudwatch:GetMetricStatistics',
          'cloudwatch:ListMetrics',
          'cloudwatch:GetMetricData'
        ],
        resources: [targetData.certificateArn]
      });
      iamPolicies.push({
        statement,
        description: 'ACM certificate monitoring permissions',
        complianceRequirement: 'Certificate expiration monitoring'
      });

      // Grant CloudWatch alarm permissions
      const region = context.environment || 'us-east-1';
      const alarmStatement = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          'cloudwatch:DescribeAlarms',
          'cloudwatch:GetMetricStatistics',
          'cloudwatch:ListMetrics'
        ],
        resources: [`arn:aws:cloudwatch:${region}:*:alarm:*`]
      });
      iamPolicies.push({
        statement: alarmStatement,
        description: 'CloudWatch alarm permissions for certificate monitoring',
        complianceRequirement: 'Certificate monitoring and alerting'
      });

      // Grant CloudWatch Events permissions for proactive expiration alerts
      const eventsStatement = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          'events:PutRule',
          'events:PutTargets',
          'events:DescribeRule'
        ],
        resources: [`arn:aws:events:${region}:*:rule/certificate-expiration-*`]
      });
      iamPolicies.push({
        statement: eventsStatement,
        description: 'EventBridge permissions for certificate expiration alerts and proactive renewal',
        complianceRequirement: 'Certificate expiration monitoring and automation'
      });
    }

    // Set monitoring environment variables
    environmentVariables['CERTIFICATE_ARN'] = targetData.certificateArn;
    if (targetData.domainName) {
      environmentVariables['CERTIFICATE_DOMAIN'] = targetData.domainName;
    }

    // Configure monitoring-specific settings (compliance-driven via options/config)
    const monitoringConfig = await this.buildMonitoringConfig(context, targetData);
    Object.assign(environmentVariables, monitoringConfig.environmentVariables);

    return {
      environmentVariables,
      iamPolicies,
      securityGroupRules: []
    };
  }

  /**
   * Build secure certificate configuration
   * Compliance-driven via options/config - no framework branching
   * 
   * @param context - Binding context
   * @param targetData - Certificate data
   * @returns Secure configuration with environment variables and IAM policies
   */
  private async buildSecureCertificateConfig(
    context: BindingContext,
    targetData: any
  ): Promise<{ environmentVariables: Record<string, string>; iamPolicies: IamPolicy[] }> {
    const environmentVariables: Record<string, string> = {};
    const iamPolicies: IamPolicy[] = [];

    // Certificate transparency logging (enabled by default for security)
    environmentVariables['CERTIFICATE_TRANSPARENCY_ENABLED'] = 'true';

    // Certificate validation requirements (enabled by default)
    environmentVariables['CERTIFICATE_VALIDATION_REQUIRED'] = 'true';

    // Configure strict validation and monitoring when requested via options
    if (context.directive.options?.strictValidation === true) {
      environmentVariables['CERTIFICATE_STRICT_VALIDATION'] = 'true';
    }

    if (context.directive.options?.enableMonitoring === true) {
      environmentVariables['CERTIFICATE_MONITORING_ENABLED'] = 'true';
    }

    return { environmentVariables, iamPolicies };
  }

  /**
   * Build validation configuration
   * Compliance-driven via options/config - no framework branching
   * 
   * @param context - Binding context
   * @param targetData - Certificate data
   * @returns Validation configuration with environment variables
   */
  private async buildValidationConfig(
    context: BindingContext,
    targetData: any
  ): Promise<{ environmentVariables: Record<string, string> }> {
    const environmentVariables: Record<string, string> = {};

    // Validation timeout settings (configurable via options)
    const timeout = context.directive.options?.validationTimeout || 300;
    environmentVariables['CERTIFICATE_VALIDATION_TIMEOUT'] = String(timeout);

    // Validation retry settings (configurable via options)
    const retries = context.directive.options?.validationRetries || 3;
    environmentVariables['CERTIFICATE_VALIDATION_RETRIES'] = String(retries);

    // Strict validation when requested via options
    if (context.directive.options?.strictValidation === true) {
      environmentVariables['CERTIFICATE_STRICT_VALIDATION'] = 'true';
    }

    return { environmentVariables };
  }

  /**
   * Build monitoring configuration
   * Compliance-driven via options/config - no framework branching
   * 
   * @param context - Binding context
   * @param targetData - Certificate data
   * @returns Monitoring configuration with environment variables
   */
  private async buildMonitoringConfig(
    context: BindingContext,
    targetData: any
  ): Promise<{ environmentVariables: Record<string, string> }> {
    const environmentVariables: Record<string, string> = {};

    // Monitoring enabled by default
    environmentVariables['CERTIFICATE_MONITORING_ENABLED'] = 'true';

    // Expiration threshold (configurable via options, default 30 days)
    const thresholdDays = context.directive.options?.expirationThresholdDays || 30;
    environmentVariables['CERTIFICATE_EXPIRATION_THRESHOLD_DAYS'] = String(thresholdDays);

    // Status check interval (configurable via options, default 1 hour)
    const checkInterval = context.directive.options?.statusCheckInterval || 3600;
    environmentVariables['CERTIFICATE_STATUS_CHECK_INTERVAL'] = String(checkInterval);

    // Enhanced monitoring and audit logging when requested via options
    if (context.directive.options?.enhancedMonitoring === true) {
      environmentVariables['CERTIFICATE_ENHANCED_MONITORING'] = 'true';
    }

    if (context.directive.options?.auditLogging === true) {
      environmentVariables['CERTIFICATE_AUDIT_LOGGING'] = 'true';
    }

    return { environmentVariables };
  }

  /**
   * Get ACM certificate actions based on access level
   * Used by resolveActions to compute base actions from coarse access level
   */
  private getCertificateActionsForAccess(access: string): string[] {
    switch (access) {
      case 'read':
      case 'use':
        return [
          'acm:DescribeCertificate',
          'acm:ListCertificates',
          'acm:GetCertificate'
        ];
      case 'write':
        return [
          'acm:DeleteCertificate',
          'acm:UpdateCertificateOptions',
          'acm:RenewCertificate'
        ];
      case 'readwrite':
        return [
          'acm:DescribeCertificate',
          'acm:ListCertificates',
          'acm:GetCertificate',
          'acm:DeleteCertificate',
          'acm:UpdateCertificateOptions',
          'acm:RenewCertificate'
        ];
      default:
        throw new Error(`Unsupported ACM certificate access level: ${access}`);
    }
  }
}