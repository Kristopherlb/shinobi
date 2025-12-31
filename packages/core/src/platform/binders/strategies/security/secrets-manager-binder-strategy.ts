/**
 * Secrets Manager Binder Strategy (Unified)
 * Handles secrets management bindings for AWS Secrets Manager with mandatory compliance enforcement
 */

import { UnifiedBinderStrategyBase } from '../../../contracts/unified-binder-strategy-base.js';
import type { BindingContext, EnhancedBindingResult, CompatibilityEntry } from '../../../contracts/platform-binding-trigger-spec.js';
import type { IamPolicy } from '../../../contracts/bindings.js';
import { PolicyStatement, Effect } from 'aws-cdk-lib/aws-iam';

export class SecretsManagerBinderStrategy extends UnifiedBinderStrategyBase {
  readonly supportedCapabilities = ['secretsmanager:secret', 'secretsmanager:rotation'];

  getStrategyName(): string {
    return 'Secrets Manager Binder Strategy';
  }

  canHandle(sourceType: string, targetCapability: string): boolean {
    return this.supportedCapabilities.includes(targetCapability);
  }

  getCompatibilityMatrix(): CompatibilityEntry[] {
    return [
      {
        sourceType: '*',
        targetType: 'secretsmanager:secret',
        capability: 'secretsmanager:secret',
        supportedAccess: ['read', 'write', 'admin'],
        description: 'Bind to Secrets Manager secret for secure credential storage and retrieval',
        examples: ['lambda-api -> secretsmanager:secret (read)']
      },
      {
        sourceType: '*',
        targetType: 'secretsmanager:rotation',
        capability: 'secretsmanager:rotation',
        supportedAccess: ['read', 'write'],
        description: 'Bind to Secrets Manager rotation configuration for automatic secret rotation',
        examples: ['lambda-rotation -> secretsmanager:rotation (write)']
      }
    ];
  }

  protected async doBind(context: BindingContext): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    const { source, target, directive } = context;
    const { capability } = directive;

    // Validate inputs
    if (!target) {
      throw new Error('Target component is required for Secrets Manager binding');
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

    // Route to appropriate binding method
    switch (capability) {
      case 'secretsmanager:secret':
        return await this.bindToSecret(context, targetCapabilityData, directive.access || []);
      case 'secretsmanager:rotation':
        return await this.bindToRotation(context, targetCapabilityData, directive.access || []);
      default:
        throw new Error(`Unsupported Secrets Manager capability: ${capability}. Supported capabilities: ${this.supportedCapabilities.join(', ')}`);
    }
  }

  private async bindToSecret(
    context: BindingContext,
    targetData: any,
    access: string[]
  ): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    if (!targetData?.secretArn) {
      throw new Error('Target component missing required secretArn property for Secrets Manager secret binding');
    }

    const environmentVariables: Record<string, string> = {};
    const iamPolicies: IamPolicy[] = [];

    // Grant secret access permissions
    if (access.includes('read')) {
      const statement = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          'secretsmanager:GetSecretValue',
          'secretsmanager:DescribeSecret'
        ],
        resources: [targetData.secretArn]
      });
      iamPolicies.push({
        statement,
        description: 'Secrets Manager secret read access permissions',
        complianceRequirement: 'Secrets access with least privilege'
      });
    }

    if (access.includes('write')) {
      const statement = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          'secretsmanager:CreateSecret',
          'secretsmanager:UpdateSecret',
          'secretsmanager:DeleteSecret',
          'secretsmanager:PutSecretValue'
        ],
        resources: [targetData.secretArn]
      });
      iamPolicies.push({
        statement,
        description: 'Secrets Manager secret write access permissions',
        complianceRequirement: 'Secrets management with least privilege'
      });
    }

    // Grant additional permissions for secret management
    if (access.includes('admin')) {
      const statement = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          'secretsmanager:RestoreSecret',
          'secretsmanager:TagResource',
          'secretsmanager:UntagResource',
          'secretsmanager:GetResourcePolicy',
          'secretsmanager:PutResourcePolicy',
          'secretsmanager:DeleteResourcePolicy'
        ],
        resources: [targetData.secretArn]
      });
      iamPolicies.push({
        statement,
        description: 'Secrets Manager secret administration permissions',
        complianceRequirement: 'Least privilege IAM access'
      });
    }

    // Set secret environment variables
    environmentVariables['SECRETS_MANAGER_SECRET_ARN'] = targetData.secretArn;
    if (targetData.name) {
      environmentVariables['SECRETS_MANAGER_SECRET_NAME'] = targetData.name;
    }
    if (targetData.description) {
      environmentVariables['SECRETS_MANAGER_SECRET_DESCRIPTION'] = targetData.description;
    }

    // Configure secret metadata
    if (targetData.versionId) {
      environmentVariables['SECRETS_MANAGER_VERSION_ID'] = targetData.versionId;
    }

    if (targetData.versionStages && Array.isArray(targetData.versionStages)) {
      environmentVariables['SECRETS_MANAGER_VERSION_STAGES'] = targetData.versionStages.join(',');
    }

    // Configure secure access when requested via options/config
    if (context.directive.options?.requireSecureAccess === true) {
      const secureConfig = await this.buildSecureSecretAccessConfig(context, targetData);
      Object.assign(environmentVariables, secureConfig.environmentVariables);
      iamPolicies.push(...secureConfig.iamPolicies);
    }

    return {
      environmentVariables,
      iamPolicies,
      securityGroupRules: []
    };
  }

  private async bindToRotation(
    context: BindingContext,
    targetData: any,
    access: string[]
  ): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    if (!targetData?.secretArn) {
      throw new Error('Target component missing required secretArn property for Secrets Manager rotation binding');
    }

    const environmentVariables: Record<string, string> = {};
    const iamPolicies: IamPolicy[] = [];

    // Grant rotation access permissions
    if (access.includes('read')) {
      const statement = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          'secretsmanager:DescribeSecret',
          'secretsmanager:GetSecretValue'
        ],
        resources: [targetData.secretArn]
      });
      iamPolicies.push({
        statement,
        description: 'Secrets Manager rotation read access permissions',
        complianceRequirement: 'Secret rotation monitoring'
      });
    }

    if (access.includes('write')) {
      const statement = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          'secretsmanager:RotateSecret',
          'secretsmanager:UpdateSecret',
          'secretsmanager:PutSecretValue'
        ],
        resources: [targetData.secretArn]
      });
      iamPolicies.push({
        statement,
        description: 'Secrets Manager rotation write access permissions',
        complianceRequirement: 'Automatic secret rotation'
      });
    }

    // Grant Lambda permissions for rotation function
    if (targetData.rotationLambdaArn) {
      const statement = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['lambda:InvokeFunction'],
        resources: [targetData.rotationLambdaArn]
      });
      iamPolicies.push({
        statement,
        description: 'Lambda invocation permissions for secret rotation',
        complianceRequirement: 'Secret rotation automation'
      });
    }

    // Configure rotation rules
    if (targetData.rotationRules) {
      const rules = targetData.rotationRules;
      environmentVariables['SECRETS_MANAGER_ROTATION_ENABLED'] = 'true';
      if (rules.automaticallyAfterDays) {
        environmentVariables['SECRETS_MANAGER_ROTATION_DAYS'] = String(rules.automaticallyAfterDays);
      }
      if (rules.duration) {
        environmentVariables['SECRETS_MANAGER_ROTATION_DURATION'] = rules.duration;
      }
    }

    // Set rotation environment variables
    if (targetData.rotationLambdaArn) {
      environmentVariables['SECRETS_MANAGER_ROTATION_LAMBDA_ARN'] = targetData.rotationLambdaArn;
    }
    if (targetData.rotationSchedule) {
      environmentVariables['SECRETS_MANAGER_ROTATION_SCHEDULE'] = targetData.rotationSchedule;
    }

    return {
      environmentVariables,
      iamPolicies,
      securityGroupRules: []
    };
  }

  private async buildSecureSecretAccessConfig(
    context: BindingContext,
    targetData: any
  ): Promise<{ environmentVariables: Record<string, string>; iamPolicies: IamPolicy[] }> {
    const environmentVariables: Record<string, string> = {};
    const iamPolicies: IamPolicy[] = [];

    // Configure KMS encryption
    if (targetData.kmsKeyId) {
      environmentVariables['SECRETS_MANAGER_KMS_KEY_ID'] = targetData.kmsKeyId;

      // Grant KMS permissions for secret decryption
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
        description: 'KMS permissions for Secrets Manager encryption',
        complianceRequirement: 'Encryption at rest'
      });
    }

    // Configure resource-based policy for access control
    if (targetData.resourcePolicy) {
      environmentVariables['SECRETS_MANAGER_RESOURCE_POLICY'] = JSON.stringify(targetData.resourcePolicy);
    }

    // Configure automatic rotation when explicitly required
    if (targetData.autoRotationDays) {
      environmentVariables['SECRETS_MANAGER_AUTO_ROTATION_REQUIRED'] = 'true';
      environmentVariables['SECRETS_MANAGER_ROTATION_INTERVAL_DAYS'] = String(targetData.autoRotationDays);
    }

    // Configure audit logging
    environmentVariables['SECRETS_MANAGER_AUDIT_LOGGING_ENABLED'] = 'true';

    // Grant CloudTrail permissions for audit logging
    const region = context.environment || 'us-east-1';
    const logsStatement = new PolicyStatement({
      effect: Effect.ALLOW,
      actions: [
        'logs:CreateLogGroup',
        'logs:CreateLogStream',
        'logs:PutLogEvents'
      ],
      resources: [`arn:aws:logs:${region}:*:log-group:/aws/secretsmanager/*`]
    });
    iamPolicies.push({
      statement: logsStatement,
      description: 'CloudTrail permissions for Secrets Manager audit logging',
      complianceRequirement: 'Audit logging and compliance'
    });

    return { environmentVariables, iamPolicies };
  }
}
