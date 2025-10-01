/**
 * App Runner Binder Strategy
 * Handles containerized web application bindings for AWS App Runner
 */

import { IBinderStrategy } from '../binder-strategy.js';
import { BindingContext } from '../../binding-context.js';
import { ComponentBinding } from '../../component-binding.js';

export class AppRunnerBinderStrategy implements IBinderStrategy {
  readonly supportedCapabilities = ['apprunner:service', 'apprunner:connection'];

  async bind(
    sourceComponent: any,
    targetComponent: any,
    binding: ComponentBinding,
    context: BindingContext
  ): Promise<void> {
    const { capability, access } = binding;

    switch (capability) {
      case 'apprunner:service':
        await this.bindToService(sourceComponent, targetComponent, binding, context);
        break;
      case 'apprunner:connection':
        await this.bindToConnection(sourceComponent, targetComponent, binding, context);
        break;
      default:
        throw new Error(`Unsupported App Runner capability: ${capability}`);
    }
  }

  private async bindToService(
    sourceComponent: any,
    targetComponent: any,
    binding: ComponentBinding,
    context: BindingContext
  ): Promise<void> {
    const { access } = binding;

    // Grant App Runner service access permissions
    if (access.includes('read')) {
      sourceComponent.addToRolePolicy({
        Effect: 'Allow',
        Action: [
          'apprunner:DescribeService',
          'apprunner:ListServices',
          'apprunner:DescribeOperation',
          'apprunner:ListOperations'
        ],
        Resource: targetComponent.serviceArn
      });
    }

    if (access.includes('write')) {
      sourceComponent.addToRolePolicy({
        Effect: 'Allow',
        Action: [
          'apprunner:CreateService',
          'apprunner:UpdateService',
          'apprunner:DeleteService',
          'apprunner:StartDeployment',
          'apprunner:PauseService',
          'apprunner:ResumeService'
        ],
        Resource: targetComponent.serviceArn
      });
    }

    // Grant ECR access for container images
    sourceComponent.addToRolePolicy({
      Effect: 'Allow',
      Action: [
        'ecr:GetAuthorizationToken',
        'ecr:BatchCheckLayerAvailability',
        'ecr:GetDownloadUrlForLayer',
        'ecr:BatchGetImage'
      ],
      Resource: targetComponent.ecrRepositoryArn
    });

    // Inject service environment variables
    sourceComponent.addEnvironment('APP_RUNNER_SERVICE_NAME', targetComponent.serviceName);
    sourceComponent.addEnvironment('APP_RUNNER_SERVICE_ARN', targetComponent.serviceArn);
    sourceComponent.addEnvironment('APP_RUNNER_SERVICE_URL', targetComponent.serviceUrl);
    sourceComponent.addEnvironment('APP_RUNNER_SERVICE_ID', targetComponent.serviceId);

    // Configure container environment
    sourceComponent.addEnvironment('PORT', targetComponent.port?.toString() || '8080');
    sourceComponent.addEnvironment('AWS_REGION', context.region);

    // Configure secure networking if requested by manifest/config
    if (binding.options?.requireSecureNetworking === true) {
      await this.configureSecureNetworking(sourceComponent, targetComponent, context);
    }
  }

  private async bindToConnection(
    sourceComponent: any,
    targetComponent: any,
    binding: ComponentBinding,
    context: BindingContext
  ): Promise<void> {
    const { access } = binding;

    // Grant connection access permissions
    if (access.includes('read')) {
      sourceComponent.addToRolePolicy({
        Effect: 'Allow',
        Action: [
          'apprunner:DescribeConnection',
          'apprunner:ListConnections'
        ],
        Resource: targetComponent.connectionArn
      });
    }

    if (access.includes('write')) {
      sourceComponent.addToRolePolicy({
        Effect: 'Allow',
        Action: [
          'apprunner:CreateConnection',
          'apprunner:UpdateConnection',
          'apprunner:DeleteConnection'
        ],
        Resource: targetComponent.connectionArn
      });
    }

    // Grant GitHub/GitLab access for source code repositories
    if (targetComponent.provider === 'GITHUB') {
      sourceComponent.addToRolePolicy({
        Effect: 'Allow',
        Action: [
          'apprunner:DescribeConnection',
          'apprunner:ListConnections'
        ],
        Resource: targetComponent.connectionArn
      });
    }

    // Inject connection environment variables
    sourceComponent.addEnvironment('APP_RUNNER_CONNECTION_NAME', targetComponent.connectionName);
    sourceComponent.addEnvironment('APP_RUNNER_CONNECTION_ARN', targetComponent.connectionArn);
    sourceComponent.addEnvironment('APP_RUNNER_PROVIDER', targetComponent.provider);

    // Configure source repository access
    if (targetComponent.repositoryUrl) {
      sourceComponent.addEnvironment('REPOSITORY_URL', targetComponent.repositoryUrl);
      sourceComponent.addEnvironment('BRANCH_NAME', targetComponent.branchName || 'main');
    }
  }

  private async configureSecureNetworking(
    sourceComponent: any,
    targetComponent: any,
    context: BindingContext
  ): Promise<void> {
    // Configure VPC connector for private networking in FedRAMP environments
    if (targetComponent.vpcConnectorArn) {
      sourceComponent.addEnvironment('VPC_CONNECTOR_ARN', targetComponent.vpcConnectorArn);

      // Grant VPC connector permissions
      sourceComponent.addToRolePolicy({
        Effect: 'Allow',
        Action: [
          'apprunner:DescribeVpcConnector',
          'apprunner:ListVpcConnectors'
        ],
        Resource: targetComponent.vpcConnectorArn
      });
    }

    // Configure custom domain with SSL certificate if requested
    if (targetComponent.customDomain) {
      sourceComponent.addEnvironment('CUSTOM_DOMAIN', targetComponent.customDomain);
      sourceComponent.addEnvironment('SSL_CERTIFICATE_ARN', targetComponent.sslCertificateArn);

      // Grant certificate manager permissions
      sourceComponent.addToRolePolicy({
        Effect: 'Allow',
        Action: [
          'acm:DescribeCertificate',
          'acm:ListCertificates'
        ],
        Resource: targetComponent.sslCertificateArn
      });
    }

    // Configure auto scaling with compliance-aware limits
    if (targetComponent.autoScalingConfigurationArn) {
      sourceComponent.addEnvironment('AUTO_SCALING_CONFIG_ARN', targetComponent.autoScalingConfigurationArn);

      // Grant auto scaling permissions
      sourceComponent.addToRolePolicy({
        Effect: 'Allow',
        Action: [
          'apprunner:DescribeAutoScalingConfiguration',
          'apprunner:ListAutoScalingConfigurations'
        ],
        Resource: targetComponent.autoScalingConfigurationArn
      });
    }
  }
}
