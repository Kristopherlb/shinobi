/**
 * Amplify Binder Strategy (Unified)
 * Handles mobile/web development platform bindings for Amazon Amplify with mandatory compliance enforcement
 */

import { UnifiedBinderStrategyBase, resolveActions } from '@shinobi/core';
import type { BindingContext, EnhancedBindingResult, CompatibilityEntry, AccessLevel } from '@shinobi/core';
import type { IamPolicy } from '@shinobi/core';
import { PolicyStatement, Effect } from 'aws-cdk-lib/aws-iam';

export class AmplifyBinderStrategy extends UnifiedBinderStrategyBase {
  readonly supportedCapabilities = [
    'amplify:app',
    'amplify:branch',
    'amplify:domain',
    'amplify:backend-environment',
    'amplify:backend-auth',
    'amplify:backend-api',
    'amplify:backend-storage'
  ];

  getStrategyName(): string {
    return 'Amplify Binder Strategy';
  }

  canHandle(sourceType: string, targetCapability: string): boolean {
    return this.supportedCapabilities.includes(targetCapability);
  }

  getCompatibilityMatrix(): CompatibilityEntry[] {
    return [
      {
        sourceType: '*',
        targetType: 'amplify:app',
        capability: 'amplify:app',
        supportedAccess: ['read', 'write', 'readwrite', 'deploy'] as AccessLevel[],
        description: 'Bind to Amplify app for web/mobile application hosting',
        examples: ['lambda-api -> amplify:app (read)', 'ci-cd -> amplify:app (deploy)']
      },
      {
        sourceType: '*',
        targetType: 'amplify:branch',
        capability: 'amplify:branch',
        supportedAccess: ['read', 'write', 'readwrite', 'deploy'] as AccessLevel[],
        description: 'Bind to Amplify branch for environment-specific deployments',
        examples: ['lambda-api -> amplify:branch (read)', 'ci-cd -> amplify:branch (deploy)']
      },
      {
        sourceType: '*',
        targetType: 'amplify:domain',
        capability: 'amplify:domain',
        supportedAccess: ['read', 'write', 'readwrite'],
        description: 'Bind to Amplify domain for custom domain configuration with subdomain mapping',
        examples: ['lambda-api -> amplify:domain (read)', 'ci-cd -> amplify:domain (write)']
      },
      {
        sourceType: '*',
        targetType: 'amplify:backend-environment',
        capability: 'amplify:backend-environment',
        supportedAccess: ['read', 'write', 'readwrite'],
        description: 'Bind to Amplify backend environment for full-stack application resources',
        examples: ['lambda-api -> amplify:backend-environment (read)', 'ci-cd -> amplify:backend-environment (write)']
      },
      {
        sourceType: '*',
        targetType: 'amplify:backend-auth',
        capability: 'amplify:backend-auth',
        supportedAccess: ['read', 'write', 'readwrite'],
        description: 'Bind to Amplify backend Auth (Cognito) for authentication services',
        examples: ['lambda-api -> amplify:backend-auth (read)', 'ci-cd -> amplify:backend-auth (write)']
      },
      {
        sourceType: '*',
        targetType: 'amplify:backend-api',
        capability: 'amplify:backend-api',
        supportedAccess: ['read', 'write', 'readwrite'],
        description: 'Bind to Amplify backend API (AppSync) for GraphQL/REST API services',
        examples: ['lambda-api -> amplify:backend-api (read)', 'ci-cd -> amplify:backend-api (write)']
      },
      {
        sourceType: '*',
        targetType: 'amplify:backend-storage',
        capability: 'amplify:backend-storage',
        supportedAccess: ['read', 'write', 'readwrite'],
        description: 'Bind to Amplify backend Storage (S3/DynamoDB) for data storage services',
        examples: ['lambda-api -> amplify:backend-storage (read)', 'ci-cd -> amplify:backend-storage (write)']
      }
    ];
  }

  protected async doBind(context: BindingContext): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    const { source, target, directive } = context;
    const { capability } = directive;

    // Validate inputs
    if (!target) {
      throw new Error('Target component is required for Amplify binding');
    }
    if (!capability) {
      throw new Error('Binding capability is required');
    }

    // Normalize access to array (directive.access is a single AccessLevel string)
    const access = directive.access ? [directive.access] : [];

    // Validate access patterns
    const validAccessTypes = ['read', 'write', 'readwrite', 'deploy'];
    const invalidAccess = access.filter(a => !validAccessTypes.includes(a));
    if (invalidAccess.length > 0) {
      throw new Error(`Invalid access types for Amplify binding: ${invalidAccess.join(', ')}. Valid types: ${validAccessTypes.join(', ')}`);
    }
    if (access.length === 0) {
      throw new Error('Access cannot be empty for Amplify binding');
    }

    // Get target capability data
    const targetCapabilities = target.getCapabilities();
    const targetCapabilityData = targetCapabilities[capability];
    if (!targetCapabilityData) {
      throw new Error(`Target component does not provide capability '${capability}'`);
    }

    // Route to appropriate binding method
    switch (capability) {
      case 'amplify:app':
        return await this.bindToApp(context, targetCapabilityData, access);
      case 'amplify:branch':
        return await this.bindToBranch(context, targetCapabilityData, access);
      case 'amplify:domain':
        return await this.bindToDomain(context, targetCapabilityData, access);
      case 'amplify:backend-environment':
        return await this.bindToBackendEnvironment(context, targetCapabilityData, access);
      case 'amplify:backend-auth':
        return await this.bindToBackendAuth(context, targetCapabilityData, access);
      case 'amplify:backend-api':
        return await this.bindToBackendApi(context, targetCapabilityData, access);
      case 'amplify:backend-storage':
        return await this.bindToBackendStorage(context, targetCapabilityData, access);
      default:
        throw new Error(`Unsupported Amplify capability: ${capability}. Supported capabilities: ${this.supportedCapabilities.join(', ')}`);
    }
  }

  /**
   * Bind to Amplify app
   * 
   * @param context - Binding context
   * @param targetData - Expected structure:
   *   - appArn (required): string - ARN of the Amplify app
   *   - appId (required): string - ID of the Amplify app
   *   - name (required): string - Name of the app
   *   - defaultDomain?: string - Default domain for the app
   *   - repository?: string - Repository URL
   *   - platform?: string - Platform (e.g., 'WEB', 'WEB_COMPUTE', 'WEB_DYNAMIC')
   *   - buildSpec?: string - Build specification
   *   - customHeaders?: object - Custom headers configuration (when requireSecureAccess is true)
   *   - vpcConfig?: object - VPC configuration (when requireSecureAccess is true)
   *   - wafWebAclArn?: string - WAF Web ACL ARN (when requireSecureAccess is true)
   * @param access - Array of access levels (read, write, readwrite, deploy)
   */
  private async bindToApp(
    context: BindingContext,
    targetData: any,
    access: string[]
  ): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    // Validate required target properties
    if (!targetData?.appArn) {
      throw new Error('Target component missing required appArn property for Amplify app binding');
    }
    if (!targetData?.appId) {
      throw new Error('Target component missing required appId property for Amplify app binding');
    }
    if (!targetData?.name) {
      throw new Error('Target component missing required name property for Amplify app binding');
    }

    const environmentVariables: Record<string, string> = {};
    const iamPolicies: IamPolicy[] = [];
    const region = context.target.context?.region || context.environment || 'us-east-1';
    const accountId = context.target.context?.accountId || '*';

    // Handle granular actions override or use multi-statement approach
    if (context.directive.actions) {
      // Granular actions provided: create single statement with resolved actions
      const resolvedActions = resolveActions(
        context.directive,
        context,
        (acc: string) => this.getAmplifyAppActionsForAccess(acc),
        'amplify'
      );

      const statement = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: resolvedActions,
        resources: [targetData.appArn]
      });
      iamPolicies.push({
        statement,
        description: 'Amplify app access permissions (granular actions)',
        complianceRequirement: 'Least privilege IAM access'
      });
    } else {
      // Coarse access levels: use multi-statement approach (backward compatible)
      // Grant app access permissions
      if (access.includes('read') || access.includes('readwrite')) {
        const statement = new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
            'amplify:GetApp',
            'amplify:ListApps',
            'amplify:ListBranches',
            'amplify:GetBranch'
          ],
          resources: [targetData.appArn]
        });
        iamPolicies.push({
          statement,
          description: 'Amplify app read access permissions',
          complianceRequirement: 'Least privilege IAM access'
        });
      }

      if (access.includes('write') || access.includes('readwrite')) {
        const statement = new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
            'amplify:CreateApp',
            'amplify:DeleteApp',
            'amplify:UpdateApp'
          ],
          resources: [targetData.appArn]
        });
        iamPolicies.push({
          statement,
          description: 'Amplify app write access permissions',
          complianceRequirement: 'Least privilege IAM access'
        });
      }

      // Grant deployment permissions
      if (access.includes('deploy') || access.includes('readwrite')) {
        const statement = new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
            'amplify:StartDeployment',
            'amplify:StopDeployment',
            'amplify:GetJob'
          ],
          resources: [targetData.appArn]
        });
        iamPolicies.push({
          statement,
          description: 'Amplify app deployment permissions',
          complianceRequirement: 'Deployment access'
        });
      }
    }

    // Grant S3 access for build artifacts
    if (targetData.defaultDomain) {
      const s3Statement = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['s3:GetObject', 's3:PutObject', 's3:DeleteObject'],
        resources: [
          `arn:aws:s3:::${targetData.defaultDomain}/*`,
          `arn:aws:s3:::amplify-${targetData.appId}-*/*`
        ]
      });
      iamPolicies.push({
        statement: s3Statement,
        description: 'S3 permissions for Amplify build artifacts',
        complianceRequirement: 'Build artifact storage'
      });
    }

    // Set app environment variables
    environmentVariables['AMPLIFY_APP_ID'] = targetData.appId;
    environmentVariables['AMPLIFY_APP_ARN'] = targetData.appArn;
    environmentVariables['AMPLIFY_APP_NAME'] = targetData.name;
    if (targetData.defaultDomain) {
      environmentVariables['AMPLIFY_APP_DEFAULT_DOMAIN'] = targetData.defaultDomain;
    }
    if (targetData.repository) {
      environmentVariables['AMPLIFY_APP_REPOSITORY'] = targetData.repository;
    }
    if (targetData.platform) {
      environmentVariables['AMPLIFY_APP_PLATFORM'] = targetData.platform;
    }

    // Configure build settings
    if (targetData.buildSpec) {
      environmentVariables['AMPLIFY_BUILD_SPEC'] = targetData.buildSpec;
    }

    // Configure secure access when requested via options/config
    if (context.directive.options?.requireSecureAccess === true) {
      const secureConfig = await this.buildSecureAppAccessConfig(context, targetData);
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
   * Bind to Amplify branch
   * 
   * @param context - Binding context
   * @param targetData - Expected structure:
   *   - branchArn (required): string - ARN of the branch
   *   - branchName (required): string - Name of the branch
   *   - stage?: string - Stage (e.g., 'PRODUCTION', 'BETA', 'DEVELOPMENT', 'EXPERIMENTAL', 'PULL_REQUEST')
   *   - description?: string - Branch description
   *   - displayName?: string - Display name
   *   - branchUrl?: string - Branch URL
   *   - environmentVariables?: object - Environment variables for the branch
   *   - enableAutoBuild?: boolean - Enable auto-build
   *   - enablePullRequestPreview?: boolean - Enable pull request preview
   * @param access - Array of access levels (read, write, readwrite, deploy)
   */
  private async bindToBranch(
    context: BindingContext,
    targetData: any,
    access: string[]
  ): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    // Validate required target properties
    if (!targetData?.branchArn) {
      throw new Error('Target component missing required branchArn property for Amplify branch binding');
    }
    if (!targetData?.branchName) {
      throw new Error('Target component missing required branchName property for Amplify branch binding');
    }

    const environmentVariables: Record<string, string> = {};
    const iamPolicies: IamPolicy[] = [];

    // Handle granular actions override or use multi-statement approach
    if (context.directive.actions) {
      // Granular actions provided: create single statement with resolved actions
      const resolvedActions = resolveActions(
        context.directive,
        context,
        (acc: string) => this.getAmplifyBranchActionsForAccess(acc),
        'amplify'
      );

      const statement = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: resolvedActions,
        resources: [targetData.branchArn]
      });
      iamPolicies.push({
        statement,
        description: 'Amplify branch access permissions (granular actions)',
        complianceRequirement: 'Least privilege IAM access'
      });
    } else {
      // Coarse access levels: use multi-statement approach (backward compatible)
      // Grant branch access permissions
      if (access.includes('read') || access.includes('readwrite')) {
        const statement = new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
            'amplify:GetBranch',
            'amplify:ListBranches',
            'amplify:GetJob'
          ],
          resources: [targetData.branchArn]
        });
        iamPolicies.push({
          statement,
          description: 'Amplify branch read access permissions',
          complianceRequirement: 'Least privilege IAM access'
        });
      }

      if (access.includes('write') || access.includes('readwrite')) {
        const statement = new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
            'amplify:CreateBranch',
            'amplify:DeleteBranch',
            'amplify:UpdateBranch'
          ],
          resources: [targetData.branchArn]
        });
        iamPolicies.push({
          statement,
          description: 'Amplify branch write access permissions',
          complianceRequirement: 'Least privilege IAM access'
        });
      }

      // Grant deployment permissions
      if (access.includes('deploy') || access.includes('readwrite')) {
        const statement = new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
            'amplify:StartDeployment',
            'amplify:StopDeployment',
            'amplify:GetJob'
          ],
          resources: [targetData.branchArn]
        });
        iamPolicies.push({
          statement,
          description: 'Amplify branch deployment permissions',
          complianceRequirement: 'Deployment access'
        });
      }
    }

    // Set branch environment variables
    environmentVariables['AMPLIFY_BRANCH_NAME'] = targetData.branchName;
    environmentVariables['AMPLIFY_BRANCH_ARN'] = targetData.branchArn;
    if (targetData.stage) {
      environmentVariables['AMPLIFY_BRANCH_STAGE'] = targetData.stage;
    }
    if (targetData.description) {
      environmentVariables['AMPLIFY_BRANCH_DESCRIPTION'] = targetData.description;
    }
    if (targetData.displayName) {
      environmentVariables['AMPLIFY_BRANCH_DISPLAY_NAME'] = targetData.displayName;
    }

    // Configure branch URL
    if (targetData.branchUrl) {
      environmentVariables['AMPLIFY_BRANCH_URL'] = targetData.branchUrl;
    }

    // Configure environment variables for the branch
    if (targetData.environmentVariables && typeof targetData.environmentVariables === 'object') {
      Object.entries(targetData.environmentVariables).forEach(([key, value]) => {
        environmentVariables[`AMPLIFY_BRANCH_ENV_${key}`] = String(value);
      });
    }

    // Configure auto-build settings
    if (targetData.enableAutoBuild !== undefined) {
      environmentVariables['AMPLIFY_AUTO_BUILD_ENABLED'] = targetData.enableAutoBuild.toString();
    }

    // Configure pull request preview
    if (targetData.enablePullRequestPreview !== undefined) {
      environmentVariables['AMPLIFY_PULL_REQUEST_PREVIEW_ENABLED'] = targetData.enablePullRequestPreview.toString();
    }

    return {
      environmentVariables,
      iamPolicies,
      securityGroupRules: []
    };
  }

  /**
   * Bind to Amplify domain
   * 
   * @param context - Binding context
   * @param targetData - Expected structure:
   *   - domainAssociationArn (required): string - ARN of the domain association
   *   - domainName (required): string - Domain name
   *   - domainStatus?: string - Status of the domain
   *   - certificateArn?: string - SSL certificate ARN
   *   - subDomains?: Array<{ subDomainSetting?: { prefix?: string, branchName?: string }, verified?: boolean, dnsRecord?: string }> - Subdomain configuration with mapping details
   *   - verificationRecord?: string - Domain verification record
   * @param access - Array of access levels (read, write, readwrite)
   */
  private async bindToDomain(
    context: BindingContext,
    targetData: any,
    access: string[]
  ): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    // Validate required target properties
    if (!targetData?.domainAssociationArn) {
      throw new Error('Target component missing required domainAssociationArn property for Amplify domain binding');
    }
    if (!targetData?.domainName) {
      throw new Error('Target component missing required domainName property for Amplify domain binding');
    }

    const environmentVariables: Record<string, string> = {};
    const iamPolicies: IamPolicy[] = [];

    // Handle granular actions override or use multi-statement approach
    if (context.directive.actions) {
      // Granular actions provided: create single statement with resolved actions
      const resolvedActions = resolveActions(
        context.directive,
        context,
        (acc: string) => this.getAmplifyDomainActionsForAccess(acc),
        'amplify'
      );

      const statement = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: resolvedActions,
        resources: [targetData.domainAssociationArn]
      });
      iamPolicies.push({
        statement,
        description: 'Amplify domain access permissions (granular actions)',
        complianceRequirement: 'Least privilege IAM access'
      });
    } else {
      // Coarse access levels: use multi-statement approach (backward compatible)
      // Grant domain access permissions
      if (access.includes('read') || access.includes('readwrite')) {
        const statement = new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
            'amplify:GetDomainAssociation',
            'amplify:ListDomainAssociations'
          ],
          resources: [targetData.domainAssociationArn]
        });
        iamPolicies.push({
          statement,
          description: 'Amplify domain read access permissions',
          complianceRequirement: 'Least privilege IAM access'
        });
      }

      if (access.includes('write') || access.includes('readwrite')) {
        const statement = new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
            'amplify:CreateDomainAssociation',
            'amplify:DeleteDomainAssociation',
            'amplify:UpdateDomainAssociation'
          ],
          resources: [targetData.domainAssociationArn]
        });
        iamPolicies.push({
          statement,
          description: 'Amplify domain write access permissions',
          complianceRequirement: 'Least privilege IAM access'
        });
      }
    }

    // Grant SSL certificate permissions
    if (targetData.certificateArn) {
      const acmStatement = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['acm:DescribeCertificate'],
        resources: [targetData.certificateArn]
      });
      iamPolicies.push({
        statement: acmStatement,
        description: 'ACM permissions for Amplify domain certificate',
        complianceRequirement: 'Certificate access'
      });
    }

    // Set domain environment variables
    environmentVariables['AMPLIFY_DOMAIN_NAME'] = targetData.domainName;
    environmentVariables['AMPLIFY_DOMAIN_ASSOCIATION_ARN'] = targetData.domainAssociationArn;
    if (targetData.domainStatus) {
      environmentVariables['AMPLIFY_DOMAIN_STATUS'] = targetData.domainStatus;
    }
    if (targetData.certificateArn) {
      environmentVariables['AMPLIFY_CERTIFICATE_ARN'] = targetData.certificateArn;
    }

    // Configure subdomains with detailed mapping
    if (targetData.subDomains && Array.isArray(targetData.subDomains)) {
      environmentVariables['AMPLIFY_SUB_DOMAINS'] = JSON.stringify(targetData.subDomains);
      
      // Extract detailed subdomain mapping information
      const subdomainMappings: Array<{ prefix?: string; branchName?: string; verified?: boolean }> = [];
      for (const subdomain of targetData.subDomains) {
        const mapping: any = {};
        if (subdomain.subDomainSetting?.prefix) {
          mapping.prefix = subdomain.subDomainSetting.prefix;
          environmentVariables[`AMPLIFY_SUBDOMAIN_${subdomain.subDomainSetting.prefix.toUpperCase()}_PREFIX`] = subdomain.subDomainSetting.prefix;
        }
        if (subdomain.subDomainSetting?.branchName) {
          mapping.branchName = subdomain.subDomainSetting.branchName;
          environmentVariables[`AMPLIFY_SUBDOMAIN_${subdomain.subDomainSetting.prefix?.toUpperCase() || 'ROOT'}_BRANCH`] = subdomain.subDomainSetting.branchName;
        }
        if (subdomain.verified !== undefined) {
          mapping.verified = subdomain.verified;
          environmentVariables[`AMPLIFY_SUBDOMAIN_${subdomain.subDomainSetting?.prefix?.toUpperCase() || 'ROOT'}_VERIFIED`] = subdomain.verified.toString();
        }
        if (subdomain.dnsRecord) {
          mapping.dnsRecord = subdomain.dnsRecord;
        }
        subdomainMappings.push(mapping);
      }
      environmentVariables['AMPLIFY_SUBDOMAIN_MAPPINGS'] = JSON.stringify(subdomainMappings);
    }

    // Configure domain verification
    if (targetData.verificationRecord) {
      environmentVariables['AMPLIFY_DOMAIN_VERIFICATION_RECORD'] = targetData.verificationRecord;
    }

    return {
      environmentVariables,
      iamPolicies,
      securityGroupRules: []
    };
  }

  /**
   * Bind to Amplify backend environment
   * 
   * @param context - Binding context
   * @param targetData - Expected structure:
   *   - backendEnvironmentArn (required): string - ARN of the backend environment
   *   - backendEnvironmentName (required): string - Name of the backend environment
   *   - appId?: string - Amplify app ID
   *   - environmentName?: string - Environment name
   *   - deploymentArtifacts?: string - S3 bucket for deployment artifacts
   *   - stackName?: string - CloudFormation stack name
   * @param access - Array of access levels (read, write, readwrite)
   */
  private async bindToBackendEnvironment(
    context: BindingContext,
    targetData: any,
    access: string[]
  ): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    // Validate required target properties
    if (!targetData?.backendEnvironmentArn) {
      throw new Error('Target component missing required backendEnvironmentArn property for Amplify backend environment binding');
    }
    if (!targetData?.backendEnvironmentName) {
      throw new Error('Target component missing required backendEnvironmentName property for Amplify backend environment binding');
    }

    const environmentVariables: Record<string, string> = {};
    const iamPolicies: IamPolicy[] = [];

    // Handle granular actions override or use multi-statement approach
    if (context.directive.actions) {
      // Granular actions provided: create single statement with resolved actions
      const resolvedActions = resolveActions(
        context.directive,
        context,
        (acc: string) => this.getAmplifyBackendEnvironmentActionsForAccess(acc),
        'amplifybackend'
      );

      const statement = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: resolvedActions,
        resources: [targetData.backendEnvironmentArn]
      });
      iamPolicies.push({
        statement,
        description: 'Amplify backend environment access permissions (granular actions)',
        complianceRequirement: 'Least privilege IAM access'
      });
    } else {
      // Coarse access levels: use multi-statement approach (backward compatible)
      // Grant backend environment access permissions
      if (access.includes('read') || access.includes('readwrite')) {
        const statement = new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
            'amplifybackend:GetBackend',
            'amplifybackend:ListBackendJobs'
          ],
          resources: [targetData.backendEnvironmentArn]
        });
        iamPolicies.push({
          statement,
          description: 'Amplify backend environment read access permissions',
          complianceRequirement: 'Least privilege IAM access'
        });
      }

      if (access.includes('write') || access.includes('readwrite')) {
        const statement = new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
            'amplifybackend:CreateBackend',
            'amplifybackend:DeleteBackend',
            'amplifybackend:UpdateBackend',
            'amplifybackend:CloneBackend'
          ],
          resources: [targetData.backendEnvironmentArn]
        });
        iamPolicies.push({
          statement,
          description: 'Amplify backend environment write access permissions',
          complianceRequirement: 'Least privilege IAM access'
        });
      }
    }

    // Set backend environment variables
    environmentVariables['AMPLIFY_BACKEND_ENVIRONMENT_NAME'] = targetData.backendEnvironmentName;
    environmentVariables['AMPLIFY_BACKEND_ENVIRONMENT_ARN'] = targetData.backendEnvironmentArn;
    if (targetData.appId) {
      environmentVariables['AMPLIFY_APP_ID'] = targetData.appId;
    }
    if (targetData.environmentName) {
      environmentVariables['AMPLIFY_ENVIRONMENT_NAME'] = targetData.environmentName;
    }
    if (targetData.deploymentArtifacts) {
      environmentVariables['AMPLIFY_DEPLOYMENT_ARTIFACTS'] = targetData.deploymentArtifacts;
    }
    if (targetData.stackName) {
      environmentVariables['AMPLIFY_STACK_NAME'] = targetData.stackName;
    }

    return {
      environmentVariables,
      iamPolicies,
      securityGroupRules: []
    };
  }

  /**
   * Bind to Amplify backend Auth (Cognito)
   * 
   * @param context - Binding context
   * @param targetData - Expected structure:
   *   - authResourceName (required): string - Name of the auth resource
   *   - userPoolId?: string - Cognito User Pool ID
   *   - userPoolArn?: string - Cognito User Pool ARN
   *   - identityPoolId?: string - Cognito Identity Pool ID
   *   - authConfig?: object - Auth configuration
   * @param access - Array of access levels (read, write, readwrite)
   */
  private async bindToBackendAuth(
    context: BindingContext,
    targetData: any,
    access: string[]
  ): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    // Validate required target properties
    if (!targetData?.authResourceName) {
      throw new Error('Target component missing required authResourceName property for Amplify backend Auth binding');
    }

    const environmentVariables: Record<string, string> = {};
    const iamPolicies: IamPolicy[] = [];

    // Handle granular actions override or use multi-statement approach
    if (context.directive.actions) {
      // Granular actions provided: create single statement with resolved actions
      const resolvedActions = resolveActions(
        context.directive,
        context,
        (acc: string) => this.getAmplifyBackendAuthActionsForAccess(acc),
        'amplifybackend'
      );

      const statement = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: resolvedActions,
        resources: targetData.userPoolArn ? [targetData.userPoolArn] : ['*']
      });
      iamPolicies.push({
        statement,
        description: 'Amplify backend Auth access permissions (granular actions)',
        complianceRequirement: 'Least privilege IAM access'
      });
    } else {
      // Coarse access levels: use multi-statement approach (backward compatible)
      // Grant backend Auth access permissions
      if (access.includes('read') || access.includes('readwrite')) {
        const statement = new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
            'amplifybackend:GetBackendAuth',
            'cognito-idp:DescribeUserPool',
            'cognito-idp:ListUserPools'
          ],
          resources: targetData.userPoolArn ? [targetData.userPoolArn] : ['*']
        });
        iamPolicies.push({
          statement,
          description: 'Amplify backend Auth read access permissions',
          complianceRequirement: 'Least privilege IAM access'
        });
      }

      if (access.includes('write') || access.includes('readwrite')) {
        const statement = new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
            'amplifybackend:UpdateBackendAuth',
            'amplifybackend:CreateBackendAuth',
            'amplifybackend:DeleteBackendAuth'
          ],
          resources: ['*'] // Amplify backend resources don't have ARNs in the same way
        });
        iamPolicies.push({
          statement,
          description: 'Amplify backend Auth write access permissions',
          complianceRequirement: 'Least privilege IAM access'
        });
      }
    }

    // Set backend Auth environment variables
    environmentVariables['AMPLIFY_BACKEND_AUTH_RESOURCE_NAME'] = targetData.authResourceName;
    if (targetData.userPoolId) {
      environmentVariables['AMPLIFY_BACKEND_USER_POOL_ID'] = targetData.userPoolId;
    }
    if (targetData.userPoolArn) {
      environmentVariables['AMPLIFY_BACKEND_USER_POOL_ARN'] = targetData.userPoolArn;
    }
    if (targetData.identityPoolId) {
      environmentVariables['AMPLIFY_BACKEND_IDENTITY_POOL_ID'] = targetData.identityPoolId;
    }
    if (targetData.authConfig) {
      environmentVariables['AMPLIFY_BACKEND_AUTH_CONFIG'] = JSON.stringify(targetData.authConfig);
    }

    return {
      environmentVariables,
      iamPolicies,
      securityGroupRules: []
    };
  }

  /**
   * Bind to Amplify backend API (AppSync)
   * 
   * @param context - Binding context
   * @param targetData - Expected structure:
   *   - apiResourceName (required): string - Name of the API resource
   *   - graphqlApiId?: string - AppSync GraphQL API ID
   *   - graphqlApiArn?: string - AppSync GraphQL API ARN
   *   - apiEndpoint?: string - API endpoint URL
   *   - apiConfig?: object - API configuration
   * @param access - Array of access levels (read, write, readwrite)
   */
  private async bindToBackendApi(
    context: BindingContext,
    targetData: any,
    access: string[]
  ): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    // Validate required target properties
    if (!targetData?.apiResourceName) {
      throw new Error('Target component missing required apiResourceName property for Amplify backend API binding');
    }

    const environmentVariables: Record<string, string> = {};
    const iamPolicies: IamPolicy[] = [];

    // Handle granular actions override or use multi-statement approach
    if (context.directive.actions) {
      // Granular actions provided: create single statement with resolved actions
      const resolvedActions = resolveActions(
        context.directive,
        context,
        (acc: string) => this.getAmplifyBackendApiActionsForAccess(acc),
        'amplifybackend'
      );

      const statement = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: resolvedActions,
        resources: targetData.graphqlApiArn ? [targetData.graphqlApiArn] : ['*']
      });
      iamPolicies.push({
        statement,
        description: 'Amplify backend API access permissions (granular actions)',
        complianceRequirement: 'Least privilege IAM access'
      });
    } else {
      // Coarse access levels: use multi-statement approach (backward compatible)
      // Grant backend API access permissions
      if (access.includes('read') || access.includes('readwrite')) {
        const statement = new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
            'amplifybackend:GetBackendAPI',
            'appsync:GetGraphqlApi',
            'appsync:ListGraphqlApis'
          ],
          resources: targetData.graphqlApiArn ? [targetData.graphqlApiArn] : ['*']
        });
        iamPolicies.push({
          statement,
          description: 'Amplify backend API read access permissions',
          complianceRequirement: 'Least privilege IAM access'
        });
      }

      if (access.includes('write') || access.includes('readwrite')) {
        const statement = new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
            'amplifybackend:UpdateBackendAPI',
            'amplifybackend:CreateBackendAPI',
            'amplifybackend:DeleteBackendAPI'
          ],
          resources: ['*'] // Amplify backend resources don't have ARNs in the same way
        });
        iamPolicies.push({
          statement,
          description: 'Amplify backend API write access permissions',
          complianceRequirement: 'Least privilege IAM access'
        });
      }
    }

    // Set backend API environment variables
    environmentVariables['AMPLIFY_BACKEND_API_RESOURCE_NAME'] = targetData.apiResourceName;
    if (targetData.graphqlApiId) {
      environmentVariables['AMPLIFY_BACKEND_GRAPHQL_API_ID'] = targetData.graphqlApiId;
    }
    if (targetData.graphqlApiArn) {
      environmentVariables['AMPLIFY_BACKEND_GRAPHQL_API_ARN'] = targetData.graphqlApiArn;
    }
    if (targetData.apiEndpoint) {
      environmentVariables['AMPLIFY_BACKEND_API_ENDPOINT'] = targetData.apiEndpoint;
    }
    if (targetData.apiConfig) {
      environmentVariables['AMPLIFY_BACKEND_API_CONFIG'] = JSON.stringify(targetData.apiConfig);
    }

    return {
      environmentVariables,
      iamPolicies,
      securityGroupRules: []
    };
  }

  /**
   * Bind to Amplify backend Storage (S3/DynamoDB)
   * 
   * @param context - Binding context
   * @param targetData - Expected structure:
   *   - storageResourceName (required): string - Name of the storage resource
   *   - bucketName?: string - S3 bucket name
   *   - tableName?: string - DynamoDB table name
   *   - storageType?: string - Storage type ('S3' or 'DynamoDB')
   *   - storageConfig?: object - Storage configuration
   * @param access - Array of access levels (read, write, readwrite)
   */
  private async bindToBackendStorage(
    context: BindingContext,
    targetData: any,
    access: string[]
  ): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    // Validate required target properties
    if (!targetData?.storageResourceName) {
      throw new Error('Target component missing required storageResourceName property for Amplify backend Storage binding');
    }

    const environmentVariables: Record<string, string> = {};
    const iamPolicies: IamPolicy[] = [];
    const region = context.target.context?.region || context.environment || 'us-east-1';
    const accountId = context.target.context?.accountId || '*';

    // Handle granular actions override or use multi-statement approach
    if (context.directive.actions) {
      // Granular actions provided: create single statement with resolved actions
      const resolvedActions = resolveActions(
        context.directive,
        context,
        (acc: string) => this.getAmplifyBackendStorageActionsForAccess(acc),
        'amplifybackend'
      );

      const statement = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: resolvedActions,
        resources: [
          '*', // Amplify backend resources
          ...(targetData.bucketName ? [`arn:aws:s3:::${targetData.bucketName}`, `arn:aws:s3:::${targetData.bucketName}/*`] : []),
          ...(targetData.tableName ? [`arn:aws:dynamodb:${region}:${accountId}:table/${targetData.tableName}`] : [])
        ]
      });
      iamPolicies.push({
        statement,
        description: 'Amplify backend Storage access permissions (granular actions)',
        complianceRequirement: 'Least privilege IAM access'
      });
    } else {
      // Coarse access levels: use multi-statement approach (backward compatible)
      // Grant backend Storage access permissions
      if (access.includes('read') || access.includes('readwrite')) {
        const actions = ['amplifybackend:GetBackendStorage'];
        if (targetData.storageType === 'S3' || targetData.bucketName) {
          actions.push('s3:GetObject', 's3:ListBucket');
        }
        if (targetData.storageType === 'DynamoDB' || targetData.tableName) {
          actions.push('dynamodb:GetItem', 'dynamodb:Query', 'dynamodb:Scan');
        }

        const statement = new PolicyStatement({
          effect: Effect.ALLOW,
          actions,
          resources: [
            '*', // Amplify backend resources
            ...(targetData.bucketName ? [`arn:aws:s3:::${targetData.bucketName}`, `arn:aws:s3:::${targetData.bucketName}/*`] : []),
            ...(targetData.tableName ? [`arn:aws:dynamodb:${region}:${accountId}:table/${targetData.tableName}`] : [])
          ]
        });
        iamPolicies.push({
          statement,
          description: 'Amplify backend Storage read access permissions',
          complianceRequirement: 'Least privilege IAM access'
        });
      }

      if (access.includes('write') || access.includes('readwrite')) {
        const actions = [
          'amplifybackend:UpdateBackendStorage',
          'amplifybackend:CreateBackendStorage',
          'amplifybackend:DeleteBackendStorage'
        ];
        if (targetData.storageType === 'S3' || targetData.bucketName) {
          actions.push('s3:PutObject', 's3:DeleteObject');
        }
        if (targetData.storageType === 'DynamoDB' || targetData.tableName) {
          actions.push('dynamodb:PutItem', 'dynamodb:UpdateItem', 'dynamodb:DeleteItem');
        }

        const statement = new PolicyStatement({
          effect: Effect.ALLOW,
          actions,
          resources: [
            '*', // Amplify backend resources
            ...(targetData.bucketName ? [`arn:aws:s3:::${targetData.bucketName}`, `arn:aws:s3:::${targetData.bucketName}/*`] : []),
            ...(targetData.tableName ? [`arn:aws:dynamodb:${region}:${accountId}:table/${targetData.tableName}`] : [])
          ]
        });
        iamPolicies.push({
          statement,
          description: 'Amplify backend Storage write access permissions',
          complianceRequirement: 'Least privilege IAM access'
        });
      }
    }

    // Set backend Storage environment variables
    environmentVariables['AMPLIFY_BACKEND_STORAGE_RESOURCE_NAME'] = targetData.storageResourceName;
    if (targetData.storageType) {
      environmentVariables['AMPLIFY_BACKEND_STORAGE_TYPE'] = targetData.storageType;
    }
    if (targetData.bucketName) {
      environmentVariables['AMPLIFY_BACKEND_STORAGE_BUCKET_NAME'] = targetData.bucketName;
    }
    if (targetData.tableName) {
      environmentVariables['AMPLIFY_BACKEND_STORAGE_TABLE_NAME'] = targetData.tableName;
    }
    if (targetData.storageConfig) {
      environmentVariables['AMPLIFY_BACKEND_STORAGE_CONFIG'] = JSON.stringify(targetData.storageConfig);
    }

    return {
      environmentVariables,
      iamPolicies,
      securityGroupRules: []
    };
  }

  /**
   * Build secure access configuration for Amplify app
   * 
   * @param context - Binding context
   * @param targetData - Expected structure:
   *   - customHeaders?: object - Custom headers configuration
   *   - vpcConfig?: object - VPC configuration
   *   - wafWebAclArn?: string - WAF Web ACL ARN
   * @returns Secure access configuration with environment variables and IAM policies
   */
  private async buildSecureAppAccessConfig(
    context: BindingContext,
    targetData: any
  ): Promise<{ environmentVariables: Record<string, string>; iamPolicies: IamPolicy[] }> {
    const environmentVariables: Record<string, string> = {};
    const iamPolicies: IamPolicy[] = [];
    const region = context.target.context?.region || context.environment || 'us-east-1';
    const accountId = context.target.context?.accountId || '*';

    // Configure custom headers for security
    if (targetData.customHeaders) {
      environmentVariables['AMPLIFY_CUSTOM_HEADERS'] = JSON.stringify(targetData.customHeaders);
    }

    // Configure environment variables for security
    environmentVariables['AMPLIFY_SECURITY_ENABLED'] = 'true';

    // Configure HTTPS redirect
    environmentVariables['AMPLIFY_HTTPS_REDIRECT_ENABLED'] = 'true';

    // Configure access logging
    environmentVariables['AMPLIFY_ACCESS_LOGGING_ENABLED'] = 'true';

    // Grant CloudWatch Logs permissions
    const logsStatement = new PolicyStatement({
      effect: Effect.ALLOW,
      actions: [
        'logs:CreateLogGroup',
        'logs:CreateLogStream',
        'logs:PutLogEvents'
      ],
      resources: [`arn:aws:logs:${region}:${accountId}:log-group:/aws/amplify/*`]
    });
    iamPolicies.push({
      statement: logsStatement,
      description: 'CloudWatch Logs permissions for Amplify access logging',
      complianceRequirement: 'Observability and compliance'
    });

    // Configure VPC for private builds when requested
    if (targetData.enableVpc === true && targetData.vpcConfig) {
      environmentVariables['AMPLIFY_VPC_ENABLED'] = 'true';
      environmentVariables['AMPLIFY_VPC_CONFIG'] = JSON.stringify(targetData.vpcConfig);
    }

    // Configure WAF for additional security
    if (targetData.wafWebAclArn) {
      environmentVariables['AMPLIFY_WAF_WEB_ACL_ARN'] = targetData.wafWebAclArn;

      // Grant WAF permissions
      const wafStatement = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['wafv2:GetWebACL'],
        resources: [targetData.wafWebAclArn]
      });
      iamPolicies.push({
        statement: wafStatement,
        description: 'WAF permissions for Amplify security',
        complianceRequirement: 'Web application firewall'
      });
    }

    // Configure audit logging for compliance
    environmentVariables['AMPLIFY_AUDIT_LOGGING_ENABLED'] = 'true';

    // Note: CloudWatch Logs permissions are already granted above for access logging
    // Audit logging uses the same CloudWatch Logs infrastructure

    return { environmentVariables, iamPolicies };
  }

  /**
   * Get Amplify app actions based on access level
   * Used by resolveActions to compute base actions from coarse access level
   */
  private getAmplifyAppActionsForAccess(access: string): string[] {
    switch (access) {
      case 'read':
      case 'readwrite':
        return [
          'amplify:GetApp',
          'amplify:ListApps',
          'amplify:ListBranches',
          'amplify:GetBranch'
        ];
      case 'write':
        return [
          'amplify:CreateApp',
          'amplify:DeleteApp',
          'amplify:UpdateApp'
        ];
      case 'deploy':
        return [
          'amplify:StartDeployment',
          'amplify:StopDeployment',
          'amplify:GetJob'
        ];
      default:
        throw new Error(`Unsupported Amplify app access level: ${access}`);
    }
  }

  /**
   * Get Amplify branch actions based on access level
   * Used by resolveActions to compute base actions from coarse access level
   */
  private getAmplifyBranchActionsForAccess(access: string): string[] {
    switch (access) {
      case 'read':
      case 'readwrite':
        return [
          'amplify:GetBranch',
          'amplify:ListBranches',
          'amplify:GetJob'
        ];
      case 'write':
        return [
          'amplify:CreateBranch',
          'amplify:DeleteBranch',
          'amplify:UpdateBranch'
        ];
      case 'deploy':
        return [
          'amplify:StartDeployment',
          'amplify:StopDeployment',
          'amplify:GetJob'
        ];
      default:
        throw new Error(`Unsupported Amplify branch access level: ${access}`);
    }
  }

  /**
   * Get Amplify domain actions based on access level
   * Used by resolveActions to compute base actions from coarse access level
   */
  private getAmplifyDomainActionsForAccess(access: string): string[] {
    switch (access) {
      case 'read':
      case 'readwrite':
        return [
          'amplify:GetDomainAssociation',
          'amplify:ListDomainAssociations'
        ];
      case 'write':
        return [
          'amplify:CreateDomainAssociation',
          'amplify:DeleteDomainAssociation',
          'amplify:UpdateDomainAssociation'
        ];
      default:
        throw new Error(`Unsupported Amplify domain access level: ${access}`);
    }
  }

  /**
   * Get Amplify backend environment actions based on access level
   * Used by resolveActions to compute base actions from coarse access level
   */
  private getAmplifyBackendEnvironmentActionsForAccess(access: string): string[] {
    switch (access) {
      case 'read':
      case 'readwrite':
        return [
          'amplifybackend:GetBackend',
          'amplifybackend:ListBackendJobs'
        ];
      case 'write':
        return [
          'amplifybackend:CreateBackend',
          'amplifybackend:DeleteBackend',
          'amplifybackend:UpdateBackend',
          'amplifybackend:CloneBackend'
        ];
      default:
        throw new Error(`Unsupported Amplify backend environment access level: ${access}`);
    }
  }

  /**
   * Get Amplify backend Auth actions based on access level
   * Used by resolveActions to compute base actions from coarse access level
   */
  private getAmplifyBackendAuthActionsForAccess(access: string): string[] {
    switch (access) {
      case 'read':
      case 'readwrite':
        return [
          'amplifybackend:GetBackendAuth',
          'cognito-idp:DescribeUserPool',
          'cognito-idp:ListUserPools'
        ];
      case 'write':
        return [
          'amplifybackend:UpdateBackendAuth',
          'amplifybackend:CreateBackendAuth',
          'amplifybackend:DeleteBackendAuth'
        ];
      default:
        throw new Error(`Unsupported Amplify backend Auth access level: ${access}`);
    }
  }

  /**
   * Get Amplify backend API actions based on access level
   * Used by resolveActions to compute base actions from coarse access level
   */
  private getAmplifyBackendApiActionsForAccess(access: string): string[] {
    switch (access) {
      case 'read':
      case 'readwrite':
        return [
          'amplifybackend:GetBackendAPI',
          'appsync:GetGraphqlApi',
          'appsync:ListGraphqlApis'
        ];
      case 'write':
        return [
          'amplifybackend:UpdateBackendAPI',
          'amplifybackend:CreateBackendAPI',
          'amplifybackend:DeleteBackendAPI'
        ];
      default:
        throw new Error(`Unsupported Amplify backend API access level: ${access}`);
    }
  }

  /**
   * Get Amplify backend Storage actions based on access level
   * Used by resolveActions to compute base actions from coarse access level
   */
  private getAmplifyBackendStorageActionsForAccess(access: string): string[] {
    switch (access) {
      case 'read':
      case 'readwrite':
        return ['amplifybackend:GetBackendStorage'];
      case 'write':
        return [
          'amplifybackend:UpdateBackendStorage',
          'amplifybackend:CreateBackendStorage',
          'amplifybackend:DeleteBackendStorage'
        ];
      default:
        throw new Error(`Unsupported Amplify backend Storage access level: ${access}`);
    }
  }
}
