/**
 * Elastic Beanstalk Binder Strategy
 * Handles application deployment platform bindings for AWS Elastic Beanstalk
 */

import { IBinderStrategy } from '../binder-strategy';
import { BindingContext } from '../../binding-context';
import { ComponentBinding } from '../../component-binding';
// Compliance framework branching removed; use binding.options/config instead

export class ElasticBeanstalkBinderStrategy implements IBinderStrategy {
  readonly supportedCapabilities = ['elasticbeanstalk:application', 'elasticbeanstalk:environment', 'elasticbeanstalk:version'];

  async bind(
    sourceComponent: any,
    targetComponent: any,
    binding: ComponentBinding,
    context: BindingContext
  ): Promise<void> {
    const { capability, access } = binding;

    switch (capability) {
      case 'elasticbeanstalk:application':
        await this.bindToApplication(sourceComponent, targetComponent, binding, context);
        break;
      case 'elasticbeanstalk:environment':
        await this.bindToEnvironment(sourceComponent, targetComponent, binding, context);
        break;
      case 'elasticbeanstalk:version':
        await this.bindToVersion(sourceComponent, targetComponent, binding, context);
        break;
      default:
        throw new Error(`Unsupported Elastic Beanstalk capability: ${capability}`);
    }
  }

  private async bindToApplication(
    sourceComponent: any,
    targetComponent: any,
    binding: ComponentBinding,
    context: BindingContext
  ): Promise<void> {
    const { access } = binding;

    // Grant application access permissions
    if (access.includes('read')) {
      sourceComponent.addToRolePolicy({
        Effect: 'Allow',
        Action: [
          'elasticbeanstalk:DescribeApplications',
          'elasticbeanstalk:DescribeApplicationVersions',
          'elasticbeanstalk:ListApplications'
        ],
        Resource: targetComponent.applicationArn
      });
    }

    if (access.includes('write')) {
      sourceComponent.addToRolePolicy({
        Effect: 'Allow',
        Action: [
          'elasticbeanstalk:CreateApplication',
          'elasticbeanstalk:UpdateApplication',
          'elasticbeanstalk:DeleteApplication',
          'elasticbeanstalk:CreateApplicationVersion',
          'elasticbeanstalk:DeleteApplicationVersion'
        ],
        Resource: targetComponent.applicationArn
      });
    }

    // Grant S3 access for application versions
    if (targetComponent.versionBucket) {
      sourceComponent.addToRolePolicy({
        Effect: 'Allow',
        Action: [
          's3:GetObject',
          's3:PutObject',
          's3:DeleteObject'
        ],
        Resource: `${targetComponent.versionBucket}/*`
      });
    }

    // Inject application environment variables
    sourceComponent.addEnvironment('EB_APPLICATION_NAME', targetComponent.applicationName);
    sourceComponent.addEnvironment('EB_APPLICATION_ARN', targetComponent.applicationArn);
    sourceComponent.addEnvironment('EB_APPLICATION_DESCRIPTION', targetComponent.description);

    // Configure application metadata
    if (targetComponent.versionLabels) {
      sourceComponent.addEnvironment('EB_VERSION_LABELS', targetComponent.versionLabels.join(','));
    }
  }

  private async bindToEnvironment(
    sourceComponent: any,
    targetComponent: any,
    binding: ComponentBinding,
    context: BindingContext
  ): Promise<void> {
    const { access } = binding;

    // Grant environment access permissions
    if (access.includes('read')) {
      sourceComponent.addToRolePolicy({
        Effect: 'Allow',
        Action: [
          'elasticbeanstalk:DescribeEnvironments',
          'elasticbeanstalk:DescribeEnvironmentHealth',
          'elasticbeanstalk:DescribeEnvironmentResources',
          'elasticbeanstalk:DescribeConfigurationSettings',
          'elasticbeanstalk:DescribeConfigurationOptions'
        ],
        Resource: targetComponent.environmentArn
      });
    }

    if (access.includes('write')) {
      sourceComponent.addToRolePolicy({
        Effect: 'Allow',
        Action: [
          'elasticbeanstalk:CreateEnvironment',
          'elasticbeanstalk:UpdateEnvironment',
          'elasticbeanstalk:TerminateEnvironment',
          'elasticbeanstalk:RebuildEnvironment',
          'elasticbeanstalk:RestartAppServer'
        ],
        Resource: targetComponent.environmentArn
      });
    }

    // Grant CloudWatch Logs access
    if (targetComponent.logGroups) {
      sourceComponent.addToRolePolicy({
        Effect: 'Allow',
        Action: [
          'logs:DescribeLogGroups',
          'logs:DescribeLogStreams',
          'logs:GetLogEvents'
        ],
        Resource: targetComponent.logGroups.map((lg: string) =>
          `arn:aws:logs:${context.region}:${context.accountId}:log-group:${lg}:*`
        )
      });
    }

    // Inject environment environment variables
    sourceComponent.addEnvironment('EB_ENVIRONMENT_NAME', targetComponent.environmentName);
    sourceComponent.addEnvironment('EB_ENVIRONMENT_ARN', targetComponent.environmentArn);
    sourceComponent.addEnvironment('EB_ENVIRONMENT_ID', targetComponent.environmentId);
    sourceComponent.addEnvironment('EB_ENVIRONMENT_URL', targetComponent.endpointUrl);
    sourceComponent.addEnvironment('EB_ENVIRONMENT_STATUS', targetComponent.status);
    sourceComponent.addEnvironment('EB_ENVIRONMENT_HEALTH', targetComponent.health);

    // Configure platform and solution stack
    sourceComponent.addEnvironment('EB_PLATFORM_VERSION', targetComponent.platformVersion);
    sourceComponent.addEnvironment('EB_SOLUTION_STACK_NAME', targetComponent.solutionStackName);

    // Configure tier information
    sourceComponent.addEnvironment('EB_TIER_NAME', targetComponent.tier?.name);
    sourceComponent.addEnvironment('EB_TIER_TYPE', targetComponent.tier?.type);
    sourceComponent.addEnvironment('EB_TIER_VERSION', targetComponent.tier?.version);

    // Configure secure networking when requested via options/config
    if (binding.options?.requireSecureNetworking === true) {
      await this.configureSecureEnvironment(sourceComponent, targetComponent, binding, context);
    }
  }

  private async bindToVersion(
    sourceComponent: any,
    targetComponent: any,
    binding: ComponentBinding,
    context: BindingContext
  ): Promise<void> {
    const { access } = binding;

    // Grant version access permissions
    if (access.includes('read')) {
      sourceComponent.addToRolePolicy({
        Effect: 'Allow',
        Action: [
          'elasticbeanstalk:DescribeApplicationVersions',
          'elasticbeanstalk:ListAvailableSolutionStacks'
        ],
        Resource: targetComponent.applicationArn
      });
    }

    if (access.includes('write')) {
      sourceComponent.addToRolePolicy({
        Effect: 'Allow',
        Action: [
          'elasticbeanstalk:CreateApplicationVersion',
          'elasticbeanstalk:DeleteApplicationVersion',
          'elasticbeanstalk:UpdateApplicationVersion'
        ],
        Resource: targetComponent.applicationArn
      });
    }

    // Grant S3 access for version source bundle
    if (targetComponent.sourceBundle) {
      sourceComponent.addToRolePolicy({
        Effect: 'Allow',
        Action: [
          's3:GetObject',
          's3:PutObject'
        ],
        Resource: targetComponent.sourceBundle.s3Bucket + '/*'
      });
    }

    // Inject version environment variables
    sourceComponent.addEnvironment('EB_VERSION_LABEL', targetComponent.versionLabel);
    sourceComponent.addEnvironment('EB_VERSION_ARN', targetComponent.versionArn);
    sourceComponent.addEnvironment('EB_VERSION_DESCRIPTION', targetComponent.description);

    // Configure source bundle information
    if (targetComponent.sourceBundle) {
      sourceComponent.addEnvironment('EB_SOURCE_BUNDLE_S3_BUCKET', targetComponent.sourceBundle.s3Bucket);
      sourceComponent.addEnvironment('EB_SOURCE_BUNDLE_S3_KEY', targetComponent.sourceBundle.s3Key);
    }

    // Configure build configuration
    if (targetComponent.buildConfiguration) {
      sourceComponent.addEnvironment('EB_BUILD_CONFIG_ARTIFACT_NAME', targetComponent.buildConfiguration.artifactName);
      sourceComponent.addEnvironment('EB_BUILD_CONFIG_CODE_BUILD_SERVICE_ROLE', targetComponent.buildConfiguration.codeBuildServiceRole);
    }
  }

  private async configureSecureEnvironment(
    sourceComponent: any,
    targetComponent: any,
    binding: ComponentBinding,
    context: BindingContext
  ): Promise<void> {
    // Configure VPC networking for private environments
    if (targetComponent.vpcId) {
      sourceComponent.addEnvironment('EB_VPC_ID', targetComponent.vpcId);

      if (targetComponent.subnets) {
        sourceComponent.addEnvironment('EB_SUBNETS', targetComponent.subnets.join(','));
      }

      if (targetComponent.securityGroups) {
        sourceComponent.addEnvironment('EB_SECURITY_GROUPS', targetComponent.securityGroups.join(','));
      }
    }

    // Configure load balancer for secure HTTPS access
    if (targetComponent.loadBalancerArn) {
      sourceComponent.addEnvironment('EB_LOAD_BALANCER_ARN', targetComponent.loadBalancerArn);
      sourceComponent.addEnvironment('EB_LOAD_BALANCER_TYPE', targetComponent.loadBalancerType);
    }

    // Configure SSL certificate for HTTPS
    if (targetComponent.sslCertificateArn) {
      sourceComponent.addEnvironment('EB_SSL_CERTIFICATE_ARN', targetComponent.sslCertificateArn);

      // Grant certificate manager permissions
      sourceComponent.addToRolePolicy({
        Effect: 'Allow',
        Action: [
          'acm:DescribeCertificate'
        ],
        Resource: targetComponent.sslCertificateArn
      });
    }

    // Configure auto scaling with compliance-aware limits
    if (targetComponent.autoScalingGroups) {
      sourceComponent.addEnvironment('EB_AUTO_SCALING_GROUPS', targetComponent.autoScalingGroups.join(','));

      // Grant auto scaling permissions
      sourceComponent.addToRolePolicy({
        Effect: 'Allow',
        Action: [
          'autoscaling:DescribeAutoScalingGroups',
          'autoscaling:DescribeScalingActivities'
        ],
        Resource: targetComponent.autoScalingGroups.map((asg: string) =>
          `arn:aws:autoscaling:${context.region}:${context.accountId}:autoScalingGroup:*:autoScalingGroupName/${asg}`
        )
      });
    }

    // Configure encryption when requested via options/config
    if ((binding as any)?.options?.enableEncryption === true) {
      sourceComponent.addEnvironment('EB_ENCRYPTION_ENABLED', 'true');

      if (targetComponent.encryptionKeyArn) {
        sourceComponent.addEnvironment('EB_ENCRYPTION_KEY_ARN', targetComponent.encryptionKeyArn);

        // Grant KMS permissions
        sourceComponent.addToRolePolicy({
          Effect: 'Allow',
          Action: [
            'kms:Decrypt',
            'kms:GenerateDataKey'
          ],
          Resource: targetComponent.encryptionKeyArn
        });
      }
    }

    // Configure monitoring and alerting
    if (targetComponent.healthCheckUrl) {
      sourceComponent.addEnvironment('EB_HEALTH_CHECK_URL', targetComponent.healthCheckUrl);
    }

    if (targetComponent.healthCheckTimeout) {
      sourceComponent.addEnvironment('EB_HEALTH_CHECK_TIMEOUT', targetComponent.healthCheckTimeout.toString());
    }
  }
}
