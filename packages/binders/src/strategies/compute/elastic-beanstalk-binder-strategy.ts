/**
 * Elastic Beanstalk Binder Strategy (Unified)
 * Handles application deployment platform bindings for AWS Elastic Beanstalk with mandatory compliance enforcement
 */

import { UnifiedBinderStrategyBase, resolveActions } from '@shinobi/core';
import type { BindingContext, EnhancedBindingResult, CompatibilityEntry } from '@shinobi/core';
import type { IamPolicy } from '@shinobi/core';
import { PolicyStatement, Effect } from 'aws-cdk-lib/aws-iam';

/**
 * Elastic Beanstalk Application capability data structure
 * @property type - Capability type identifier
 * @property applicationArn - Application ARN (required)
 * @property applicationName - Application name (required)
 * @property description - Application description (optional)
 * @property versionBucket - S3 bucket for application versions (optional)
 * @property versionLabels - Version labels (optional)
 */
interface ElasticBeanstalkApplicationCapabilityData {
  type: 'elasticbeanstalk:application';
  applicationArn: string;
  applicationName: string;
  description?: string;
  versionBucket?: string;
  versionLabels?: string[];
}

/**
 * Elastic Beanstalk Environment capability data structure
 * @property type - Capability type identifier
 * @property environmentArn - Environment ARN (required)
 * @property environmentName - Environment name (required)
 * @property environmentId - Environment ID (required)
 * @property endpointUrl - Environment endpoint URL (required)
 * @property status - Environment status (required)
 * @property health - Environment health (required)
 * @property platformVersion - Platform version (required)
 * @property solutionStackName - Solution stack name (required)
 * @property tier - Tier information (optional)
 * @property logGroups - CloudWatch Logs log groups (optional)
 * @property vpcId - VPC ID for private environments (optional)
 * @property subnets - Subnet IDs (optional)
 * @property securityGroups - Security group IDs (optional)
 * @property loadBalancerArn - Load balancer ARN (optional)
 * @property loadBalancerType - Load balancer type (optional)
 * @property sslCertificateArn - SSL certificate ARN (optional)
 * @property autoScalingGroups - Auto scaling group names (optional)
 * @property encryptionKeyArn - KMS encryption key ARN (optional)
 * @property healthCheckUrl - Health check URL (optional)
 * @property healthCheckTimeout - Health check timeout (optional)
 */
interface ElasticBeanstalkEnvironmentCapabilityData {
  type: 'elasticbeanstalk:environment';
  environmentArn: string;
  environmentName: string;
  environmentId: string;
  endpointUrl: string;
  status: string;
  health: string;
  platformVersion: string;
  solutionStackName: string;
  tier?: {
    name?: string;
    type?: string;
    version?: string;
  };
  logGroups?: string[];
  vpcId?: string;
  subnets?: string[];
  securityGroups?: string[];
  loadBalancerArn?: string;
  loadBalancerType?: string;
  sslCertificateArn?: string;
  autoScalingGroups?: string[];
  encryptionKeyArn?: string;
  healthCheckUrl?: string;
  healthCheckTimeout?: number;
}

/**
 * Elastic Beanstalk Version capability data structure
 * @property type - Capability type identifier
 * @property applicationArn - Application ARN (required)
 * @property versionLabel - Version label (required)
 * @property versionArn - Version ARN (required)
 * @property description - Version description (optional)
 * @property sourceBundle - Source bundle S3 location (optional)
 * @property buildConfiguration - Build configuration (optional)
 */
interface ElasticBeanstalkVersionCapabilityData {
  type: 'elasticbeanstalk:version';
  applicationArn: string;
  versionLabel: string;
  versionArn: string;
  description?: string;
  sourceBundle?: {
    s3Bucket: string;
    s3Key: string;
  };
  buildConfiguration?: {
    artifactName?: string;
    codeBuildServiceRole?: string;
  };
}

type ElasticBeanstalkCapabilityData =
  | ElasticBeanstalkApplicationCapabilityData
  | ElasticBeanstalkEnvironmentCapabilityData
  | ElasticBeanstalkVersionCapabilityData;

export class ElasticBeanstalkBinderStrategy extends UnifiedBinderStrategyBase {
  readonly supportedCapabilities = [
    'elasticbeanstalk:application',
    'elasticbeanstalk:environment',
    'elasticbeanstalk:version'
  ];

  getStrategyName(): string {
    return 'Elastic Beanstalk Binder Strategy';
  }

  canHandle(sourceType: string, targetCapability: string): boolean {
    return this.supportedCapabilities.includes(targetCapability);
  }

  getCompatibilityMatrix(): CompatibilityEntry[] {
    return [
      {
        sourceType: '*',
        targetType: 'elasticbeanstalk-application',
        capability: 'elasticbeanstalk:application',
        supportedAccess: ['read', 'write', 'readwrite'],
        description: 'Bind to Elastic Beanstalk application for application management',
        examples: ['lambda-api -> elasticbeanstalk:application (read)', 'ci-cd -> elasticbeanstalk:application (write)']
      },
      {
        sourceType: '*',
        targetType: 'elasticbeanstalk-environment',
        capability: 'elasticbeanstalk:environment',
        supportedAccess: ['read', 'write', 'readwrite'],
        description: 'Bind to Elastic Beanstalk environment for environment management',
        examples: ['lambda-api -> elasticbeanstalk:environment (read)', 'ci-cd -> elasticbeanstalk:environment (write)']
      },
      {
        sourceType: '*',
        targetType: 'elasticbeanstalk-version',
        capability: 'elasticbeanstalk:version',
        supportedAccess: ['read', 'write', 'readwrite'],
        description: 'Bind to Elastic Beanstalk version for version management',
        examples: ['lambda-api -> elasticbeanstalk:version (read)', 'ci-cd -> elasticbeanstalk:version (write)']
      }
    ];
  }

  protected async doBind(context: BindingContext): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    const { source, target, directive } = context;
    const { capability } = directive;

    // Validate inputs
    if (!target) {
      throw new Error('Target component is required for Elastic Beanstalk binding');
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
      throw new Error(`Invalid access types for Elastic Beanstalk binding: ${invalidAccess.join(', ')}. Valid types: ${validAccessTypes.join(', ')}`);
    }
    if (access.length === 0) {
      throw new Error('Access cannot be empty for Elastic Beanstalk binding');
    }

    // Get target capability data
    const targetCapabilities = target.getCapabilities();
    const targetCapabilityData = targetCapabilities[capability];
    if (!targetCapabilityData) {
      throw new Error(`Target component does not provide capability '${capability}'`);
    }

    // Route to appropriate binding method based on capability
    if (capability === 'elasticbeanstalk:application') {
      return await this.bindToApplication(context, targetCapabilityData, access);
    } else if (capability === 'elasticbeanstalk:environment') {
      return await this.bindToEnvironment(context, targetCapabilityData, access);
    } else if (capability === 'elasticbeanstalk:version') {
      return await this.bindToVersion(context, targetCapabilityData, access);
    } else {
      throw new Error(`Unsupported Elastic Beanstalk capability: ${capability}`);
    }
  }

  /**
   * Bind to Elastic Beanstalk application
   */
  private async bindToApplication(
    context: BindingContext,
    targetData: unknown,
    access: string[]
  ): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    if (!this.isElasticBeanstalkApplicationCapabilityData(targetData)) {
      throw new Error('Invalid Elastic Beanstalk application capability data structure. Expected applicationArn and applicationName.');
    }

    const iamPolicies: IamPolicy[] = [];
    const environmentVariables: Record<string, string> = {};

    // Determine primary access level
    const primaryAccess = access.includes('readwrite') ? 'readwrite' : access.includes('write') ? 'write' : 'read';

    // Resolve actions (granular override or coarse access)
    const resolvedActions = resolveActions(
      context.directive,
      context,
      (acc) => this.getElasticBeanstalkApplicationActionsForAccess(acc),
      'elasticbeanstalk'
    );

    // Create IAM policies based on access level
    if (resolvedActions.length > 0) {
      iamPolicies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: resolvedActions,
          resources: [targetData.applicationArn]
        }),
        description: `Elastic Beanstalk application ${primaryAccess} access`,
        complianceRequirement: `Elastic Beanstalk application ${primaryAccess} access policy`
      });
    }

    // Grant S3 access for application versions
    if (targetData.versionBucket) {
      iamPolicies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
            's3:GetObject',
            's3:PutObject',
            's3:DeleteObject'
          ],
          resources: [`arn:aws:s3:::${targetData.versionBucket}/*`]
        }),
        description: 'S3 access for application versions',
        complianceRequirement: 'S3 bucket access for Elastic Beanstalk application versions'
      });
    }

    // Set environment variables
    environmentVariables['EB_APPLICATION_NAME'] = targetData.applicationName;
    environmentVariables['EB_APPLICATION_ARN'] = targetData.applicationArn;

    if (targetData.description) {
      environmentVariables['EB_APPLICATION_DESCRIPTION'] = targetData.description;
    }

    // Configure application metadata
    if (targetData.versionLabels && targetData.versionLabels.length > 0) {
      environmentVariables['EB_VERSION_LABELS'] = targetData.versionLabels.join(',');
    }

    return {
      iamPolicies,
      environmentVariables,
      securityGroupRules: []
    };
  }

  /**
   * Bind to Elastic Beanstalk environment
   */
  private async bindToEnvironment(
    context: BindingContext,
    targetData: unknown,
    access: string[]
  ): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    if (!this.isElasticBeanstalkEnvironmentCapabilityData(targetData)) {
      throw new Error('Invalid Elastic Beanstalk environment capability data structure. Expected environmentArn, environmentName, environmentId, endpointUrl, status, health, platformVersion, and solutionStackName.');
    }

    const iamPolicies: IamPolicy[] = [];
    const environmentVariables: Record<string, string> = {};

    // Determine primary access level
    const primaryAccess = access.includes('readwrite') ? 'readwrite' : access.includes('write') ? 'write' : 'read';

    // Resolve actions (granular override or coarse access)
    const resolvedActions = resolveActions(
      context.directive,
      context,
      (acc) => this.getElasticBeanstalkEnvironmentActionsForAccess(acc),
      'elasticbeanstalk'
    );

    // Create IAM policies based on access level
    if (resolvedActions.length > 0) {
      iamPolicies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: resolvedActions,
          resources: [targetData.environmentArn]
        }),
        description: `Elastic Beanstalk environment ${primaryAccess} access`,
        complianceRequirement: `Elastic Beanstalk environment ${primaryAccess} access policy`
      });
    }

    // Grant CloudWatch Logs access
    if (targetData.logGroups && targetData.logGroups.length > 0) {
      const region = (context.target.context as any)?.region || process.env.AWS_REGION || 'us-east-1';
      const accountId = (context.target.context as any)?.accountId || '123456789012';
      
      iamPolicies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
            'logs:DescribeLogGroups',
            'logs:DescribeLogStreams',
            'logs:GetLogEvents'
          ],
          resources: targetData.logGroups.map(lg =>
            `arn:aws:logs:${region}:${accountId}:log-group:${lg}:*`
          )
        }),
        description: 'CloudWatch Logs access for environment logs',
        complianceRequirement: 'Logging and monitoring for Elastic Beanstalk environment'
      });
    }

    // Set environment variables
    environmentVariables['EB_ENVIRONMENT_NAME'] = targetData.environmentName;
    environmentVariables['EB_ENVIRONMENT_ARN'] = targetData.environmentArn;
    environmentVariables['EB_ENVIRONMENT_ID'] = targetData.environmentId;
    environmentVariables['EB_ENVIRONMENT_URL'] = targetData.endpointUrl;
    environmentVariables['EB_ENVIRONMENT_STATUS'] = targetData.status;
    environmentVariables['EB_ENVIRONMENT_HEALTH'] = targetData.health;
    environmentVariables['EB_PLATFORM_VERSION'] = targetData.platformVersion;
    environmentVariables['EB_SOLUTION_STACK_NAME'] = targetData.solutionStackName;

    // Configure tier information
    if (targetData.tier) {
      if (targetData.tier.name) {
        environmentVariables['EB_TIER_NAME'] = targetData.tier.name;
      }
      if (targetData.tier.type) {
        environmentVariables['EB_TIER_TYPE'] = targetData.tier.type;
      }
      if (targetData.tier.version) {
        environmentVariables['EB_TIER_VERSION'] = targetData.tier.version;
      }
    }

    // Configure secure networking if requested via options
    if (context.directive.options?.requireSecureNetworking === true) {
      await this.configureSecureEnvironment(context, targetData, environmentVariables, iamPolicies);
    }

    return {
      iamPolicies,
      environmentVariables,
      securityGroupRules: []
    };
  }

  /**
   * Bind to Elastic Beanstalk version
   */
  private async bindToVersion(
    context: BindingContext,
    targetData: unknown,
    access: string[]
  ): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    if (!this.isElasticBeanstalkVersionCapabilityData(targetData)) {
      throw new Error('Invalid Elastic Beanstalk version capability data structure. Expected applicationArn, versionLabel, and versionArn.');
    }

    const iamPolicies: IamPolicy[] = [];
    const environmentVariables: Record<string, string> = {};

    // Determine primary access level
    const primaryAccess = access.includes('readwrite') ? 'readwrite' : access.includes('write') ? 'write' : 'read';

    // Resolve actions (granular override or coarse access)
    const resolvedActions = resolveActions(
      context.directive,
      context,
      (acc) => this.getElasticBeanstalkVersionActionsForAccess(acc),
      'elasticbeanstalk'
    );

    // Create IAM policies based on access level
    if (resolvedActions.length > 0) {
      iamPolicies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: resolvedActions,
          resources: [targetData.applicationArn]
        }),
        description: `Elastic Beanstalk version ${primaryAccess} access`,
        complianceRequirement: `Elastic Beanstalk version ${primaryAccess} access policy`
      });
    }

    // Grant S3 access for version source bundle
    if (targetData.sourceBundle) {
      iamPolicies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
            's3:GetObject',
            's3:PutObject'
          ],
          resources: [`arn:aws:s3:::${targetData.sourceBundle.s3Bucket}/*`]
        }),
        description: 'S3 access for version source bundle',
        complianceRequirement: 'S3 bucket access for Elastic Beanstalk version source bundle'
      });
    }

    // Set environment variables
    environmentVariables['EB_VERSION_LABEL'] = targetData.versionLabel;
    environmentVariables['EB_VERSION_ARN'] = targetData.versionArn;

    if (targetData.description) {
      environmentVariables['EB_VERSION_DESCRIPTION'] = targetData.description;
    }

    // Configure source bundle information
    if (targetData.sourceBundle) {
      environmentVariables['EB_SOURCE_BUNDLE_S3_BUCKET'] = targetData.sourceBundle.s3Bucket;
      environmentVariables['EB_SOURCE_BUNDLE_S3_KEY'] = targetData.sourceBundle.s3Key;
    }

    // Configure build configuration
    if (targetData.buildConfiguration) {
      if (targetData.buildConfiguration.artifactName) {
        environmentVariables['EB_BUILD_CONFIG_ARTIFACT_NAME'] = targetData.buildConfiguration.artifactName;
      }
      if (targetData.buildConfiguration.codeBuildServiceRole) {
        environmentVariables['EB_BUILD_CONFIG_CODE_BUILD_SERVICE_ROLE'] = targetData.buildConfiguration.codeBuildServiceRole;

        // Grant CodeBuild permissions for build integration
        const region = (context.target.context as any)?.region || process.env.AWS_REGION || 'us-east-1';
        const accountId = (context.target.context as any)?.accountId || '123456789012';
        
        iamPolicies.push({
          statement: new PolicyStatement({
            effect: Effect.ALLOW,
            actions: [
              'codebuild:StartBuild',
              'codebuild:BatchGetBuilds',
              'codebuild:ListBuildsForProject',
              'codebuild:DescribeBuilds'
            ],
            resources: [`arn:aws:codebuild:${region}:${accountId}:project/*`]
          }),
          description: 'CodeBuild permissions for Elastic Beanstalk version builds',
          complianceRequirement: 'CodeBuild integration for application version builds'
        });

        // Grant IAM PassRole for CodeBuild service role
        iamPolicies.push({
          statement: new PolicyStatement({
            effect: Effect.ALLOW,
            actions: ['iam:PassRole'],
            resources: [targetData.buildConfiguration.codeBuildServiceRole]
          }),
          description: 'IAM PassRole permission for CodeBuild service role',
          complianceRequirement: 'IAM role assumption for CodeBuild integration'
        });
      }
    }

    // Configure CodePipeline integration if requested via options
    if (context.directive.options?.enableCodePipeline === true) {
      const region = (context.target.context as any)?.region || process.env.AWS_REGION || 'us-east-1';
      const accountId = (context.target.context as any)?.accountId || '123456789012';
      
      environmentVariables['EB_CODEPIPELINE_ENABLED'] = 'true';

      iamPolicies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
            'codepipeline:GetPipeline',
            'codepipeline:GetPipelineState',
            'codepipeline:GetPipelineExecution',
            'codepipeline:ListPipelineExecutions',
            'codepipeline:StartPipelineExecution',
            'codepipeline:PutJobSuccessResult',
            'codepipeline:PutJobFailureResult'
          ],
          resources: [`arn:aws:codepipeline:${region}:${accountId}:*`]
        }),
        description: 'CodePipeline permissions for Elastic Beanstalk deployments',
        complianceRequirement: 'CodePipeline integration for CI/CD deployments'
      });
    }

    return {
      iamPolicies,
      environmentVariables,
      securityGroupRules: []
    };
  }

  /**
   * Configure secure environment features
   */
  private async configureSecureEnvironment(
    context: BindingContext,
    targetData: ElasticBeanstalkEnvironmentCapabilityData,
    environmentVariables: Record<string, string>,
    iamPolicies: IamPolicy[]
  ): Promise<void> {
    const region = (context.target.context as any)?.region || process.env.AWS_REGION || 'us-east-1';
    const accountId = (context.target.context as any)?.accountId || '123456789012';

    // Configure VPC networking for private environments
    if (targetData.vpcId) {
      environmentVariables['EB_VPC_ID'] = targetData.vpcId;

      if (targetData.subnets && targetData.subnets.length > 0) {
        environmentVariables['EB_SUBNETS'] = targetData.subnets.join(',');
      }

      if (targetData.securityGroups && targetData.securityGroups.length > 0) {
        environmentVariables['EB_SECURITY_GROUPS'] = targetData.securityGroups.join(',');
      }
    }

    // Configure load balancer for secure HTTPS access
    if (targetData.loadBalancerArn) {
      environmentVariables['EB_LOAD_BALANCER_ARN'] = targetData.loadBalancerArn;

      if (targetData.loadBalancerType) {
        environmentVariables['EB_LOAD_BALANCER_TYPE'] = targetData.loadBalancerType;
      }
    }

    // Configure SSL certificate for HTTPS
    if (targetData.sslCertificateArn) {
      environmentVariables['EB_SSL_CERTIFICATE_ARN'] = targetData.sslCertificateArn;

      // Grant certificate manager permissions
      iamPolicies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ['acm:DescribeCertificate'],
          resources: [targetData.sslCertificateArn]
        }),
        description: 'ACM certificate access permissions for HTTPS',
        complianceRequirement: 'SSL/TLS certificate management'
      });
    }

    // Configure auto scaling with compliance-aware limits
    if (targetData.autoScalingGroups && targetData.autoScalingGroups.length > 0) {
      environmentVariables['EB_AUTO_SCALING_GROUPS'] = targetData.autoScalingGroups.join(',');

      // Grant auto scaling permissions
      iamPolicies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
            'autoscaling:DescribeAutoScalingGroups',
            'autoscaling:DescribeScalingActivities'
          ],
          resources: targetData.autoScalingGroups.map(asg =>
            `arn:aws:autoscaling:${region}:${accountId}:autoScalingGroup:*:autoScalingGroupName/${asg}`
          )
        }),
        description: 'Auto scaling configuration access permissions',
        complianceRequirement: 'Auto scaling configuration management'
      });
    }

    // Configure encryption when requested via options
    if (context.directive.options?.enableEncryption === true) {
      environmentVariables['EB_ENCRYPTION_ENABLED'] = 'true';

      if (targetData.encryptionKeyArn) {
        environmentVariables['EB_ENCRYPTION_KEY_ARN'] = targetData.encryptionKeyArn;

        // Grant KMS permissions
        iamPolicies.push({
          statement: new PolicyStatement({
            effect: Effect.ALLOW,
            actions: [
              'kms:Decrypt',
              'kms:GenerateDataKey'
            ],
            resources: [targetData.encryptionKeyArn]
          }),
          description: 'KMS permissions for Elastic Beanstalk encryption',
          complianceRequirement: 'Encryption at rest for sensitive data'
        });
      }
    }

    // Configure monitoring and alerting
    if (targetData.healthCheckUrl) {
      environmentVariables['EB_HEALTH_CHECK_URL'] = targetData.healthCheckUrl;
    }

    if (targetData.healthCheckTimeout !== undefined) {
      environmentVariables['EB_HEALTH_CHECK_TIMEOUT'] = targetData.healthCheckTimeout.toString();
    }
  }

  /**
   * Get Elastic Beanstalk application IAM actions for access level
   */
  private getElasticBeanstalkApplicationActionsForAccess(access: string): string[] {
    switch (access) {
      case 'read':
        return [
          'elasticbeanstalk:DescribeApplications',
          'elasticbeanstalk:DescribeApplicationVersions',
          'elasticbeanstalk:ListApplications'
        ];
      case 'write':
      case 'readwrite':
        return [
          'elasticbeanstalk:DescribeApplications',
          'elasticbeanstalk:DescribeApplicationVersions',
          'elasticbeanstalk:ListApplications',
          'elasticbeanstalk:CreateApplication',
          'elasticbeanstalk:UpdateApplication',
          'elasticbeanstalk:DeleteApplication',
          'elasticbeanstalk:CreateApplicationVersion',
          'elasticbeanstalk:DeleteApplicationVersion'
        ];
      default:
        return [];
    }
  }

  /**
   * Get Elastic Beanstalk environment IAM actions for access level
   */
  private getElasticBeanstalkEnvironmentActionsForAccess(access: string): string[] {
    switch (access) {
      case 'read':
        return [
          'elasticbeanstalk:DescribeEnvironments',
          'elasticbeanstalk:DescribeEnvironmentHealth',
          'elasticbeanstalk:DescribeEnvironmentResources',
          'elasticbeanstalk:DescribeConfigurationSettings',
          'elasticbeanstalk:DescribeConfigurationOptions'
        ];
      case 'write':
      case 'readwrite':
        return [
          'elasticbeanstalk:DescribeEnvironments',
          'elasticbeanstalk:DescribeEnvironmentHealth',
          'elasticbeanstalk:DescribeEnvironmentResources',
          'elasticbeanstalk:DescribeConfigurationSettings',
          'elasticbeanstalk:DescribeConfigurationOptions',
          'elasticbeanstalk:CreateEnvironment',
          'elasticbeanstalk:UpdateEnvironment',
          'elasticbeanstalk:TerminateEnvironment',
          'elasticbeanstalk:RebuildEnvironment',
          'elasticbeanstalk:RestartAppServer'
        ];
      default:
        return [];
    }
  }

  /**
   * Get Elastic Beanstalk version IAM actions for access level
   */
  private getElasticBeanstalkVersionActionsForAccess(access: string): string[] {
    switch (access) {
      case 'read':
        return [
          'elasticbeanstalk:DescribeApplicationVersions',
          'elasticbeanstalk:ListAvailableSolutionStacks'
        ];
      case 'write':
      case 'readwrite':
        return [
          'elasticbeanstalk:DescribeApplicationVersions',
          'elasticbeanstalk:ListAvailableSolutionStacks',
          'elasticbeanstalk:CreateApplicationVersion',
          'elasticbeanstalk:DeleteApplicationVersion',
          'elasticbeanstalk:UpdateApplicationVersion'
        ];
      default:
        return [];
    }
  }

  // Type guards

  private isElasticBeanstalkApplicationCapabilityData(data: unknown): data is ElasticBeanstalkApplicationCapabilityData {
    if (!data || typeof data !== 'object') return false;
    const d = data as Record<string, unknown>;
    return (
      d.type === 'elasticbeanstalk:application' &&
      typeof d.applicationArn === 'string' &&
      typeof d.applicationName === 'string'
    );
  }

  private isElasticBeanstalkEnvironmentCapabilityData(data: unknown): data is ElasticBeanstalkEnvironmentCapabilityData {
    if (!data || typeof data !== 'object') return false;
    const d = data as Record<string, unknown>;
    return (
      d.type === 'elasticbeanstalk:environment' &&
      typeof d.environmentArn === 'string' &&
      typeof d.environmentName === 'string' &&
      typeof d.environmentId === 'string' &&
      typeof d.endpointUrl === 'string' &&
      typeof d.status === 'string' &&
      typeof d.health === 'string' &&
      typeof d.platformVersion === 'string' &&
      typeof d.solutionStackName === 'string'
    );
  }

  private isElasticBeanstalkVersionCapabilityData(data: unknown): data is ElasticBeanstalkVersionCapabilityData {
    if (!data || typeof data !== 'object') return false;
    const d = data as Record<string, unknown>;
    return (
      d.type === 'elasticbeanstalk:version' &&
      typeof d.applicationArn === 'string' &&
      typeof d.versionLabel === 'string' &&
      typeof d.versionArn === 'string'
    );
  }
}
