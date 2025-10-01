/**
 * Amplify Binder Strategy
 * Handles mobile/web development platform bindings for Amazon Amplify
 */

import { IBinderStrategy } from '../binder-strategy.js';
import { BindingContext } from '../../binding-context.js';
import { ComponentBinding } from '../../component-binding.js';
// Compliance framework branching removed; use binding.options/config instead

export class AmplifyBinderStrategy implements IBinderStrategy {
  readonly supportedCapabilities = ['amplify:app', 'amplify:branch', 'amplify:domain'];

  async bind(
    sourceComponent: any,
    targetComponent: any,
    binding: ComponentBinding,
    context: BindingContext
  ): Promise<void> {
    const { capability, access } = binding;

    switch (capability) {
      case 'amplify:app':
        await this.bindToApp(sourceComponent, targetComponent, binding, context);
        break;
      case 'amplify:branch':
        await this.bindToBranch(sourceComponent, targetComponent, binding, context);
        break;
      case 'amplify:domain':
        await this.bindToDomain(sourceComponent, targetComponent, binding, context);
        break;
      default:
        throw new Error(`Unsupported Amplify capability: ${capability}`);
    }
  }

  private async bindToApp(
    sourceComponent: any,
    targetComponent: any,
    binding: ComponentBinding,
    context: BindingContext
  ): Promise<void> {
    const { access } = binding;

    // Grant app access permissions
    if (access.includes('read')) {
      sourceComponent.addToRolePolicy({
        Effect: 'Allow',
        Action: [
          'amplify:GetApp',
          'amplify:ListApps',
          'amplify:ListBranches',
          'amplify:GetBranch'
        ],
        Resource: targetComponent.appArn
      });
    }

    if (access.includes('write')) {
      sourceComponent.addToRolePolicy({
        Effect: 'Allow',
        Action: [
          'amplify:CreateApp',
          'amplify:DeleteApp',
          'amplify:UpdateApp'
        ],
        Resource: targetComponent.appArn
      });
    }

    // Grant deployment permissions
    if (access.includes('deploy')) {
      sourceComponent.addToRolePolicy({
        Effect: 'Allow',
        Action: [
          'amplify:StartDeployment',
          'amplify:StopDeployment',
          'amplify:GetJob'
        ],
        Resource: targetComponent.appArn
      });
    }

    // Grant S3 access for build artifacts
    if (targetComponent.defaultDomain) {
      sourceComponent.addToRolePolicy({
        Effect: 'Allow',
        Action: [
          's3:GetObject',
          's3:PutObject',
          's3:DeleteObject'
        ],
        Resource: [
          `arn:aws:s3:::${targetComponent.defaultDomain}/*`,
          `arn:aws:s3:::amplify-${targetComponent.appId}-*/*`
        ]
      });
    }

    // Inject app environment variables
    sourceComponent.addEnvironment('AMPLIFY_APP_ID', targetComponent.appId);
    sourceComponent.addEnvironment('AMPLIFY_APP_ARN', targetComponent.appArn);
    sourceComponent.addEnvironment('AMPLIFY_APP_NAME', targetComponent.name);
    sourceComponent.addEnvironment('AMPLIFY_APP_DEFAULT_DOMAIN', targetComponent.defaultDomain);
    sourceComponent.addEnvironment('AMPLIFY_APP_REPOSITORY', targetComponent.repository);
    sourceComponent.addEnvironment('AMPLIFY_APP_PLATFORM', targetComponent.platform);

    // Configure build settings
    if (targetComponent.buildSpec) {
      sourceComponent.addEnvironment('AMPLIFY_BUILD_SPEC', targetComponent.buildSpec);
    }

    // Configure secure access when requested via options/config
    if (binding.options?.requireSecureAccess === true) {
      await this.configureSecureAppAccess(sourceComponent, targetComponent, context);
    }
  }

  private async bindToBranch(
    sourceComponent: any,
    targetComponent: any,
    binding: ComponentBinding,
    context: BindingContext
  ): Promise<void> {
    const { access } = binding;

    // Grant branch access permissions
    if (access.includes('read')) {
      sourceComponent.addToRolePolicy({
        Effect: 'Allow',
        Action: [
          'amplify:GetBranch',
          'amplify:ListBranches',
          'amplify:GetJob'
        ],
        Resource: targetComponent.branchArn
      });
    }

    if (access.includes('write')) {
      sourceComponent.addToRolePolicy({
        Effect: 'Allow',
        Action: [
          'amplify:CreateBranch',
          'amplify:DeleteBranch',
          'amplify:UpdateBranch'
        ],
        Resource: targetComponent.branchArn
      });
    }

    // Grant deployment permissions
    if (access.includes('deploy')) {
      sourceComponent.addToRolePolicy({
        Effect: 'Allow',
        Action: [
          'amplify:StartDeployment',
          'amplify:StopDeployment',
          'amplify:GetJob'
        ],
        Resource: targetComponent.branchArn
      });
    }

    // Inject branch environment variables
    sourceComponent.addEnvironment('AMPLIFY_BRANCH_NAME', targetComponent.branchName);
    sourceComponent.addEnvironment('AMPLIFY_BRANCH_ARN', targetComponent.branchArn);
    sourceComponent.addEnvironment('AMPLIFY_BRANCH_STAGE', targetComponent.stage);
    sourceComponent.addEnvironment('AMPLIFY_BRANCH_DESCRIPTION', targetComponent.description);
    sourceComponent.addEnvironment('AMPLIFY_BRANCH_DISPLAY_NAME', targetComponent.displayName);

    // Configure branch URL
    if (targetComponent.branchUrl) {
      sourceComponent.addEnvironment('AMPLIFY_BRANCH_URL', targetComponent.branchUrl);
    }

    // Configure environment variables for the branch
    if (targetComponent.environmentVariables) {
      Object.entries(targetComponent.environmentVariables).forEach(([key, value]) => {
        sourceComponent.addEnvironment(`AMPLIFY_BRANCH_ENV_${key}`, value as string);
      });
    }

    // Configure auto-build settings
    if (targetComponent.enableAutoBuild !== undefined) {
      sourceComponent.addEnvironment('AMPLIFY_AUTO_BUILD_ENABLED', targetComponent.enableAutoBuild.toString());
    }

    // Configure pull request preview
    if (targetComponent.enablePullRequestPreview !== undefined) {
      sourceComponent.addEnvironment('AMPLIFY_PULL_REQUEST_PREVIEW_ENABLED', targetComponent.enablePullRequestPreview.toString());
    }
  }

  private async bindToDomain(
    sourceComponent: any,
    targetComponent: any,
    binding: ComponentBinding,
    context: BindingContext
  ): Promise<void> {
    const { access } = binding;

    // Grant domain access permissions
    if (access.includes('read')) {
      sourceComponent.addToRolePolicy({
        Effect: 'Allow',
        Action: [
          'amplify:GetDomainAssociation',
          'amplify:ListDomainAssociations'
        ],
        Resource: targetComponent.domainAssociationArn
      });
    }

    if (access.includes('write')) {
      sourceComponent.addToRolePolicy({
        Effect: 'Allow',
        Action: [
          'amplify:CreateDomainAssociation',
          'amplify:DeleteDomainAssociation',
          'amplify:UpdateDomainAssociation'
        ],
        Resource: targetComponent.domainAssociationArn
      });
    }

    // Grant SSL certificate permissions
    if (targetComponent.certificateArn) {
      sourceComponent.addToRolePolicy({
        Effect: 'Allow',
        Action: [
          'acm:DescribeCertificate'
        ],
        Resource: targetComponent.certificateArn
      });
    }

    // Inject domain environment variables
    sourceComponent.addEnvironment('AMPLIFY_DOMAIN_NAME', targetComponent.domainName);
    sourceComponent.addEnvironment('AMPLIFY_DOMAIN_ASSOCIATION_ARN', targetComponent.domainAssociationArn);
    sourceComponent.addEnvironment('AMPLIFY_DOMAIN_STATUS', targetComponent.domainStatus);
    sourceComponent.addEnvironment('AMPLIFY_CERTIFICATE_ARN', targetComponent.certificateArn);

    // Configure subdomains
    if (targetComponent.subDomains) {
      sourceComponent.addEnvironment('AMPLIFY_SUB_DOMAINS', JSON.stringify(targetComponent.subDomains));
    }

    // Configure domain verification
    if (targetComponent.verificationRecord) {
      sourceComponent.addEnvironment('AMPLIFY_DOMAIN_VERIFICATION_RECORD', targetComponent.verificationRecord);
    }
  }

  private async configureSecureAppAccess(
    sourceComponent: any,
    targetComponent: any,
    context: BindingContext
  ): Promise<void> {
    // Configure custom headers for security
    if (targetComponent.customHeaders) {
      sourceComponent.addEnvironment('AMPLIFY_CUSTOM_HEADERS', JSON.stringify(targetComponent.customHeaders));
    }

    // Configure environment variables for security
    sourceComponent.addEnvironment('AMPLIFY_SECURITY_ENABLED', 'true');

    // Configure HTTPS redirect
    sourceComponent.addEnvironment('AMPLIFY_HTTPS_REDIRECT_ENABLED', 'true');

    // Configure access logging
    sourceComponent.addEnvironment('AMPLIFY_ACCESS_LOGGING_ENABLED', 'true');

    // Grant CloudWatch Logs permissions
    sourceComponent.addToRolePolicy({
      Effect: 'Allow',
      Action: [
        'logs:CreateLogGroup',
        'logs:CreateLogStream',
        'logs:PutLogEvents'
      ],
      Resource: `arn:aws:logs:${context.region}:${context.accountId}:log-group:/aws/amplify/*`
    });

    // Configure VPC for private builds when requested
    if ((targetComponent as any)?.enableVpc === true) {
      sourceComponent.addEnvironment('AMPLIFY_VPC_ENABLED', 'true');
      if (targetComponent.vpcConfig) {
        sourceComponent.addEnvironment('AMPLIFY_VPC_CONFIG', JSON.stringify(targetComponent.vpcConfig));
      }
    }

    // Configure WAF for additional security
    if (targetComponent.wafWebAclArn) {
      sourceComponent.addEnvironment('AMPLIFY_WAF_WEB_ACL_ARN', targetComponent.wafWebAclArn);

      // Grant WAF permissions
      sourceComponent.addToRolePolicy({
        Effect: 'Allow',
        Action: [
          'wafv2:GetWebACL'
        ],
        Resource: targetComponent.wafWebAclArn
      });
    }

    // Configure audit logging for compliance
    sourceComponent.addEnvironment('AMPLIFY_AUDIT_LOGGING_ENABLED', 'true');

    // Grant CloudTrail permissions for audit logging
    sourceComponent.addToRolePolicy({
      Effect: 'Allow',
      Action: [
        'logs:CreateLogGroup',
        'logs:CreateLogStream',
        'logs:PutLogEvents'
      ],
      Resource: `arn:aws:logs:${context.region}:${context.accountId}:log-group:/aws/amplify/*`
    });
  }
}
