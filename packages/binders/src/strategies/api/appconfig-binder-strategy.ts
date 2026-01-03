/**
 * AppConfigBinderStrategy (Unified)
 * Handles config:appconfig bindings with mandatory compliance enforcement
 * 
 * Supports:
 * - Application, environment, configuration profile management
 * - Deployment strategies (immediate, linear, exponential, canary)
 * - Validators (JSON schema, Lambda-based validation)
 * - Feature flags and runtime configuration
 */

import { UnifiedBinderStrategyBase } from '@shinobi/core';
import type { BindingContext, EnhancedBindingResult, CompatibilityEntry } from '@shinobi/core';
import type { IamPolicy } from '@shinobi/core';
import { PolicyStatement, Effect } from 'aws-cdk-lib/aws-iam';

export class AppConfigBinderStrategy extends UnifiedBinderStrategyBase {
  readonly supportedCapabilities = ['config:appconfig'];

  getStrategyName(): string {
    return 'AppConfigBinderStrategy';
  }

  canHandle(sourceType: string, targetCapability: string): boolean {
    return this.supportedCapabilities.includes(targetCapability);
  }

  getCompatibilityMatrix(): CompatibilityEntry[] {
    return [
      {
        sourceType: '*',
        targetType: '*',
        capability: 'config:appconfig',
        supportedAccess: ['read', 'write'],
        description: 'Bind to AppConfig for feature flags and runtime configuration management',
        examples: ['lambda-api -> config:appconfig (read)', 'lambda-config -> config:appconfig (write)']
      }
    ];
  }

  protected async doBind(context: BindingContext): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    const { source, target, directive } = context;
    const { capability } = directive;

    // Validate inputs
    if (!target) {
      throw new Error('Target component is required for config:appconfig binding');
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

    return await this.bindToAppconfig(context, targetCapabilityData);
  }

  /**
   * Bind to config:appconfig
   * 
   * @param context - Binding context
   * @param targetData - Expected structure:
   *   - applicationId (required): string - AppConfig application ID
   *   - environmentId (optional): string - AppConfig environment ID
   *   - configurationProfileId (optional): string - Configuration profile ID
   *   - deploymentStrategyId (optional): string - Deployment strategy ID
   *   - hostedConfigurationVersion (optional): string - Hosted configuration version number
   *   - extensionIdentifier (optional): string - Extension identifier
   *   - deploymentKey (optional): string - Deployment key for client access
   *   - validatorArn (optional): string - Validator Lambda ARN
   *   - rolloutStrategy (optional): object - Rollout strategy details (type, growthFactor, etc.)
   * @returns Enhanced binding result (without compliance block)
   */
  private async bindToAppconfig(
    context: BindingContext,
    targetData: any
  ): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    const { directive } = context;
    const { access, options } = directive;

    if (!targetData?.applicationId) {
      throw new Error('Target component missing required applicationId property for config:appconfig binding');
    }

    const iamPolicies: IamPolicy[] = [];
    const environmentVariables: Record<string, string> = {
      AWS_APPCONFIG_APPLICATION_ID: targetData.applicationId
    };

    if (targetData.environmentId) {
      environmentVariables.AWS_APPCONFIG_ENVIRONMENT_ID = targetData.environmentId;
    }

    if (targetData.configurationProfileId) {
      environmentVariables.AWS_APPCONFIG_CONFIGURATION_PROFILE_ID = targetData.configurationProfileId;
    }

    if (targetData.deploymentStrategyId) {
      environmentVariables.AWS_APPCONFIG_DEPLOYMENT_STRATEGY_ID = targetData.deploymentStrategyId;
    }

    if (targetData.hostedConfigurationVersion) {
      environmentVariables.AWS_APPCONFIG_HOSTED_CONFIGURATION_VERSION = targetData.hostedConfigurationVersion;
    }

    if (targetData.extensionIdentifier) {
      environmentVariables.AWS_APPCONFIG_EXTENSION_IDENTIFIER = targetData.extensionIdentifier;
    }

    if (targetData.deploymentKey) {
      environmentVariables.AWS_APPCONFIG_DEPLOYMENT_KEY = targetData.deploymentKey;
    }

    if (targetData.validatorArn) {
      environmentVariables.AWS_APPCONFIG_VALIDATOR_ARN = targetData.validatorArn;
    }

    if (targetData.rolloutStrategy) {
      environmentVariables.AWS_APPCONFIG_ROLLOUT_STRATEGY = JSON.stringify(targetData.rolloutStrategy);
    }

    // IAM policies for AppConfig operations
    if (access === 'read' || access === 'write') {
      iamPolicies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
            'appconfig:GetApplication',
            'appconfig:GetConfiguration',
            'appconfig:GetConfigurationProfile',
            'appconfig:GetDeployment',
            'appconfig:GetDeploymentStrategy',
            'appconfig:GetEnvironment',
            'appconfig:ListApplications',
            'appconfig:ListConfigurationProfiles',
            'appconfig:ListDeployments',
            'appconfig:ListEnvironments',
            'appconfig:ListDeploymentStrategies',
            'appconfig:ValidateConfiguration'
          ],
          resources: [
            `arn:aws:appconfig:*:*:application/${targetData.applicationId}`,
            `arn:aws:appconfig:*:*:application/${targetData.applicationId}/*`
          ]
        }),
        description: 'AppConfig read access',
        complianceRequirement: 'Least privilege IAM access for AppConfig read operations'
      });
    }

    if (access === 'write') {
      iamPolicies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
            'appconfig:CreateApplication',
            'appconfig:UpdateApplication',
            'appconfig:DeleteApplication',
            'appconfig:CreateConfigurationProfile',
            'appconfig:UpdateConfigurationProfile',
            'appconfig:DeleteConfigurationProfile',
            'appconfig:CreateDeploymentStrategy',
            'appconfig:UpdateDeploymentStrategy',
            'appconfig:DeleteDeploymentStrategy',
            'appconfig:CreateEnvironment',
            'appconfig:UpdateEnvironment',
            'appconfig:DeleteEnvironment',
            'appconfig:StartDeployment',
            'appconfig:StopDeployment'
          ],
          resources: [
            `arn:aws:appconfig:*:*:application/${targetData.applicationId}`,
            `arn:aws:appconfig:*:*:application/${targetData.applicationId}/*`
          ]
        }),
        description: 'AppConfig write access',
        complianceRequirement: 'Least privilege IAM access for AppConfig write operations'
      });
    }

    // Secure hooks support
    if (options?.requireSecureAccess) {
      // CloudWatch integration for monitoring
      iamPolicies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
            'cloudwatch:PutMetricData',
            'cloudwatch:GetMetricStatistics',
            'cloudwatch:ListMetrics'
          ],
          resources: ['*']
        }),
        description: 'AppConfig CloudWatch monitoring access',
        complianceRequirement: 'Least privilege IAM access for CloudWatch monitoring integration'
      });

      // KMS encryption for configuration data
      if (targetData.kmsKeyId) {
        iamPolicies.push({
          statement: new PolicyStatement({
            effect: Effect.ALLOW,
            actions: [
              'kms:Decrypt',
              'kms:DescribeKey',
              'kms:Encrypt',
              'kms:GenerateDataKey'
            ],
            resources: [targetData.kmsKeyId]
          }),
          description: 'AppConfig KMS encryption access',
          complianceRequirement: 'Least privilege IAM access for KMS encryption'
        });
      }

      // Validator Lambda integration
      if (targetData.validatorArn || targetData.validatorLambdaArn) {
        const validatorArn = targetData.validatorArn || targetData.validatorLambdaArn;
        iamPolicies.push({
          statement: new PolicyStatement({
            effect: Effect.ALLOW,
            actions: ['lambda:InvokeFunction'],
            resources: [validatorArn]
          }),
          description: 'AppConfig validator Lambda access',
          complianceRequirement: 'Least privilege IAM access for Lambda validator integration'
        });
      }

      environmentVariables.AWS_APPCONFIG_SECURE_ACCESS_ENABLED = 'true';
    }

    return {
      iamPolicies,
      environmentVariables,
      securityGroupRules: []
    };
  }
}

