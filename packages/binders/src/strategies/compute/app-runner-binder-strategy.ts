/**
 * App Runner Binder Strategy (Unified)
 * Handles containerized web application bindings for AWS App Runner with mandatory compliance enforcement
 */

import { UnifiedBinderStrategyBase, resolveActions } from '@shinobi/core';
import type { BindingContext, EnhancedBindingResult, CompatibilityEntry } from '@shinobi/core';
import type { IamPolicy } from '@shinobi/core';
import { PolicyStatement, Effect } from 'aws-cdk-lib/aws-iam';

/**
 * App Runner Service capability data structure
 * @property type - Capability type identifier
 * @property serviceArn - App Runner service ARN (required)
 * @property serviceName - App Runner service name (required)
 * @property serviceUrl - App Runner service URL (required)
 * @property serviceId - App Runner service ID (required)
 * @property ecrRepositoryArn - ECR repository ARN for container images (required)
 * @property port - Container port number (optional, defaults to 8080)
 * @property vpcConnectorArn - VPC connector ARN for private networking (optional)
 * @property customDomain - Custom domain name (optional)
 * @property sslCertificateArn - SSL certificate ARN for custom domain (optional)
 * @property autoScalingConfigurationArn - Auto scaling configuration ARN (optional)
 */
interface AppRunnerServiceCapabilityData {
  type: 'apprunner:service';
  serviceArn: string;
  serviceName: string;
  serviceUrl: string;
  serviceId: string;
  ecrRepositoryArn: string;
  port?: number;
  vpcConnectorArn?: string;
  customDomain?: string;
  sslCertificateArn?: string;
  autoScalingConfigurationArn?: string;
}

/**
 * App Runner Connection capability data structure
 * @property type - Capability type identifier
 * @property connectionArn - App Runner connection ARN (required)
 * @property connectionName - Connection name (required)
 * @property provider - Connection provider (e.g., 'GITHUB', 'GITLAB') (required)
 * @property repositoryUrl - Source code repository URL (optional)
 * @property branchName - Git branch name (optional, defaults to 'main')
 */
interface AppRunnerConnectionCapabilityData {
  type: 'apprunner:connection';
  connectionArn: string;
  connectionName: string;
  provider: string;
  repositoryUrl?: string;
  branchName?: string;
}

type AppRunnerCapabilityData =
  | AppRunnerServiceCapabilityData
  | AppRunnerConnectionCapabilityData;

export class AppRunnerBinderStrategy extends UnifiedBinderStrategyBase {
  readonly supportedCapabilities = [
    'apprunner:service',
    'apprunner:connection'
  ];

  getStrategyName(): string {
    return 'App Runner Binder Strategy';
  }

  canHandle(sourceType: string, targetCapability: string): boolean {
    return this.supportedCapabilities.includes(targetCapability);
  }

  getCompatibilityMatrix(): CompatibilityEntry[] {
    return [
      {
        sourceType: '*',
        targetType: 'apprunner-service',
        capability: 'apprunner:service',
        supportedAccess: ['read', 'write', 'readwrite', 'admin'],
        description: 'Bind to App Runner service for containerized web applications',
        examples: ['lambda-api -> apprunner:service (read)', 'ci-cd -> apprunner:service (write)']
      },
      {
        sourceType: '*',
        targetType: 'apprunner-connection',
        capability: 'apprunner:connection',
        supportedAccess: ['read', 'write', 'readwrite'],
        description: 'Bind to App Runner connection for source code repository access',
        examples: ['lambda-api -> apprunner:connection (read)', 'ci-cd -> apprunner:connection (write)']
      }
    ];
  }

  protected async doBind(context: BindingContext): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    const { source, target, directive } = context;
    const { capability } = directive;

    // Validate inputs
    if (!target) {
      throw new Error('Target component is required for App Runner binding');
    }
    if (!capability) {
      throw new Error('Binding capability is required');
    }

    // Normalize access to array (directive.access is a single AccessLevel string)
    const access = directive.access ? [directive.access] : [];

    // Validate access patterns
    const validAccessTypes = ['read', 'write', 'readwrite', 'admin'];
    const invalidAccess = access.filter(a => !validAccessTypes.includes(a));
    if (invalidAccess.length > 0) {
      throw new Error(`Invalid access types for App Runner binding: ${invalidAccess.join(', ')}. Valid types: ${validAccessTypes.join(', ')}`);
    }
    if (access.length === 0) {
      throw new Error('Access cannot be empty for App Runner binding');
    }

    // Get target capability data
    const targetCapabilities = target.getCapabilities();
    const targetCapabilityData = targetCapabilities[capability];
    if (!targetCapabilityData) {
      throw new Error(`Target component does not provide capability '${capability}'`);
    }

    // Route to appropriate binding method based on capability
    if (capability === 'apprunner:service') {
      return await this.bindToService(context, targetCapabilityData, access);
    } else if (capability === 'apprunner:connection') {
      return await this.bindToConnection(context, targetCapabilityData, access);
    } else {
      throw new Error(`Unsupported App Runner capability: ${capability}`);
    }
  }

  /**
   * Bind to App Runner service
   * 
   * @param context - Binding context
   * @param targetData - Expected structure (AppRunnerServiceCapabilityData):
   *   - type: 'apprunner:service'
   *   - serviceArn (required): App Runner service ARN
   *   - serviceName (required): App Runner service name
   *   - serviceUrl (required): App Runner service URL
   *   - serviceId (required): App Runner service ID
   *   - ecrRepositoryArn (required): ECR repository ARN
   *   - port (optional): Container port number (defaults to 8080)
   *   - vpcConnectorArn (optional): VPC connector ARN for private networking
   *   - customDomain (optional): Custom domain name
   *   - sslCertificateArn (optional): SSL certificate ARN
   *   - autoScalingConfigurationArn (optional): Auto scaling configuration ARN
   * @param access - Array of access levels (read, write, readwrite, admin)
   * @returns Enhanced binding result without compliance block
   */
  private async bindToService(
    context: BindingContext,
    targetData: unknown,
    access: string[]
  ): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    if (!this.isAppRunnerServiceCapabilityData(targetData)) {
      throw new Error('Invalid App Runner service capability data structure. Expected serviceArn, serviceName, serviceUrl, serviceId, and ecrRepositoryArn.');
    }

    const iamPolicies: IamPolicy[] = [];
    const environmentVariables: Record<string, string> = {};

    // Determine primary access level for action mapping
    const primaryAccess = access.includes('admin') ? 'admin' : access.includes('readwrite') ? 'readwrite' : access.includes('write') ? 'write' : 'read';

    // Resolve actions (granular override or coarse access)
    const resolvedActions = resolveActions(
      context.directive,
      context,
      (acc) => this.getAppRunnerServiceActionsForAccess(acc),
      'apprunner'
    );

    // Create IAM policies based on access level
    if (resolvedActions.length > 0) {
      iamPolicies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: resolvedActions,
          resources: [targetData.serviceArn]
        }),
        description: `App Runner service ${primaryAccess} access`,
        complianceRequirement: `App Runner service ${primaryAccess} access policy`
      });
    }

    // Grant ECR access for container images (required for all service bindings)
    iamPolicies.push({
      statement: new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          'ecr:GetAuthorizationToken',
          'ecr:BatchCheckLayerAvailability',
          'ecr:GetDownloadUrlForLayer',
          'ecr:BatchGetImage'
        ],
        resources: [targetData.ecrRepositoryArn]
      }),
      description: 'ECR access permissions for container images',
      complianceRequirement: 'Container image access for App Runner service'
    });

    // Get region from target component context
    const region = (context.target.context as any)?.region || process.env.AWS_REGION || 'us-east-1';

    // Set service environment variables
    environmentVariables['APP_RUNNER_SERVICE_NAME'] = targetData.serviceName;
    environmentVariables['APP_RUNNER_SERVICE_ARN'] = targetData.serviceArn;
    environmentVariables['APP_RUNNER_SERVICE_URL'] = targetData.serviceUrl;
    environmentVariables['APP_RUNNER_SERVICE_ID'] = targetData.serviceId;
    environmentVariables['AWS_REGION'] = region;

    // Configure container environment with default port
    environmentVariables['PORT'] = (targetData.port ?? 8080).toString();

    // Configure secure networking if requested via options
    if (context.directive.options?.requireSecureNetworking === true) {
      await this.configureSecureNetworking(context, targetData, environmentVariables, iamPolicies);
    }

    return {
      iamPolicies,
      environmentVariables,
      securityGroupRules: [] // Network binding handled separately
    };
  }

  /**
   * Bind to App Runner connection
   * 
   * @param context - Binding context
   * @param targetData - Expected structure (AppRunnerConnectionCapabilityData):
   *   - type: 'apprunner:connection'
   *   - connectionArn (required): App Runner connection ARN
   *   - connectionName (required): Connection name
   *   - provider (required): Connection provider (e.g., 'GITHUB', 'GITLAB')
   *   - repositoryUrl (optional): Source code repository URL
   *   - branchName (optional): Git branch name (defaults to 'main')
   * @param access - Array of access levels (read, write, readwrite)
   * @returns Enhanced binding result without compliance block
   */
  private async bindToConnection(
    context: BindingContext,
    targetData: unknown,
    access: string[]
  ): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    if (!this.isAppRunnerConnectionCapabilityData(targetData)) {
      throw new Error('Invalid App Runner connection capability data structure. Expected connectionArn, connectionName, and provider.');
    }

    const iamPolicies: IamPolicy[] = [];
    const environmentVariables: Record<string, string> = {};

    // Determine primary access level for action mapping
    const primaryAccess = access.includes('readwrite') ? 'readwrite' : access.includes('write') ? 'write' : 'read';

    // Resolve actions (granular override or coarse access)
    const resolvedActions = resolveActions(
      context.directive,
      context,
      (acc) => this.getAppRunnerConnectionActionsForAccess(acc),
      'apprunner'
    );

    // Create IAM policies based on access level
    if (resolvedActions.length > 0) {
      iamPolicies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: resolvedActions,
          resources: [targetData.connectionArn]
        }),
        description: `App Runner connection ${primaryAccess} access`,
        complianceRequirement: `App Runner connection ${primaryAccess} access policy`
      });
    }

    // Set connection environment variables
    environmentVariables['APP_RUNNER_CONNECTION_NAME'] = targetData.connectionName;
    environmentVariables['APP_RUNNER_CONNECTION_ARN'] = targetData.connectionArn;
    environmentVariables['APP_RUNNER_PROVIDER'] = targetData.provider;

    // Configure source repository access
    if (targetData.repositoryUrl) {
      environmentVariables['REPOSITORY_URL'] = targetData.repositoryUrl;
      environmentVariables['BRANCH_NAME'] = targetData.branchName ?? 'main';
    }

    return {
      iamPolicies,
      environmentVariables,
      securityGroupRules: [] // Network binding handled separately
    };
  }

  /**
   * Configure secure networking features
   * Applies additional security configurations when requireSecureNetworking is enabled
   */
  private async configureSecureNetworking(
    context: BindingContext,
    targetData: AppRunnerServiceCapabilityData,
    environmentVariables: Record<string, string>,
    iamPolicies: IamPolicy[]
  ): Promise<void> {
    // Configure VPC connector for private networking
    if (targetData.vpcConnectorArn) {
      environmentVariables['VPC_CONNECTOR_ARN'] = targetData.vpcConnectorArn;

      // Grant VPC connector permissions
      iamPolicies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
            'apprunner:DescribeVpcConnector',
            'apprunner:ListVpcConnectors'
          ],
          resources: [targetData.vpcConnectorArn]
        }),
        description: 'VPC connector access permissions for private networking',
        complianceRequirement: 'Secure networking configuration'
      });
    }

    // Configure custom domain with SSL certificate
    if (targetData.customDomain) {
      environmentVariables['CUSTOM_DOMAIN'] = targetData.customDomain;

      if (targetData.sslCertificateArn) {
        environmentVariables['SSL_CERTIFICATE_ARN'] = targetData.sslCertificateArn;

        // Grant certificate manager permissions
        iamPolicies.push({
          statement: new PolicyStatement({
            effect: Effect.ALLOW,
            actions: [
              'acm:DescribeCertificate',
              'acm:ListCertificates'
            ],
            resources: [targetData.sslCertificateArn]
          }),
          description: 'ACM certificate access permissions for custom domain',
          complianceRequirement: 'SSL/TLS certificate management'
        });
      }
    }

    // Configure auto scaling
    if (targetData.autoScalingConfigurationArn) {
      environmentVariables['AUTO_SCALING_CONFIG_ARN'] = targetData.autoScalingConfigurationArn;

      // Grant auto scaling permissions
      iamPolicies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
            'apprunner:DescribeAutoScalingConfiguration',
            'apprunner:ListAutoScalingConfigurations'
          ],
          resources: [targetData.autoScalingConfigurationArn]
        }),
        description: 'Auto scaling configuration access permissions',
        complianceRequirement: 'Auto scaling configuration management'
      });
    }
  }

  /**
   * Get App Runner service IAM actions for access level
   */
  private getAppRunnerServiceActionsForAccess(access: string): string[] {
    switch (access) {
      case 'read':
        return [
          'apprunner:DescribeService',
          'apprunner:ListServices',
          'apprunner:DescribeOperation',
          'apprunner:ListOperations'
        ];
      case 'write':
      case 'readwrite':
        return [
          'apprunner:DescribeService',
          'apprunner:ListServices',
          'apprunner:DescribeOperation',
          'apprunner:ListOperations',
          'apprunner:CreateService',
          'apprunner:UpdateService',
          'apprunner:DeleteService',
          'apprunner:StartDeployment',
          'apprunner:PauseService',
          'apprunner:ResumeService'
        ];
      case 'admin':
        // Admin access includes high-privilege actions (tagging, resource management)
        // Consider requiring explicit opt-in via directive.options.allowAdminOperations for production use
        return [
          'apprunner:DescribeService',
          'apprunner:ListServices',
          'apprunner:DescribeOperation',
          'apprunner:ListOperations',
          'apprunner:CreateService',
          'apprunner:UpdateService',
          'apprunner:DeleteService',
          'apprunner:StartDeployment',
          'apprunner:PauseService',
          'apprunner:ResumeService',
          'apprunner:TagResource',
          'apprunner:UntagResource'
        ];
      default:
        return [];
    }
  }

  /**
   * Get App Runner connection IAM actions for access level
   */
  private getAppRunnerConnectionActionsForAccess(access: string): string[] {
    switch (access) {
      case 'read':
        return [
          'apprunner:DescribeConnection',
          'apprunner:ListConnections'
        ];
      case 'write':
      case 'readwrite':
        return [
          'apprunner:DescribeConnection',
          'apprunner:ListConnections',
          'apprunner:CreateConnection',
          'apprunner:UpdateConnection',
          'apprunner:DeleteConnection'
        ];
      default:
        return [];
    }
  }

  // Type guards

  private isAppRunnerServiceCapabilityData(data: unknown): data is AppRunnerServiceCapabilityData {
    if (!data || typeof data !== 'object') return false;
    const d = data as Record<string, unknown>;
    return (
      d.type === 'apprunner:service' &&
      typeof d.serviceArn === 'string' &&
      typeof d.serviceName === 'string' &&
      typeof d.serviceUrl === 'string' &&
      typeof d.serviceId === 'string' &&
      typeof d.ecrRepositoryArn === 'string'
    );
  }

  private isAppRunnerConnectionCapabilityData(data: unknown): data is AppRunnerConnectionCapabilityData {
    if (!data || typeof data !== 'object') return false;
    const d = data as Record<string, unknown>;
    return (
      d.type === 'apprunner:connection' &&
      typeof d.connectionArn === 'string' &&
      typeof d.connectionName === 'string' &&
      typeof d.provider === 'string'
    );
  }
}
